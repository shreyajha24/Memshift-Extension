import { CryptoMeta } from './crypto-types';
import { STORAGE_KEYS } from '../shared/constants';
import { logger } from '../utils/logger';
import { ext, hasExtensionApi } from '../shared/browser-api';

const DEFAULT_ITERATIONS = 100000; // reasonable default; can be tuned
const PBKDF2_HASH = 'SHA-256';
const KEY_ALGO = 'AES-GCM';
const KEY_LENGTH = 256;

class KeyManager {
  private cryptoKey: CryptoKey | null = null;
  private meta: CryptoMeta | null = null;

  public async initializeEncryption(iterations = DEFAULT_ITERATIONS): Promise<CryptoMeta> {
    if (!this._hasSubtle()) throw new Error('Web Crypto not available');
    // generate salt
    const salt = this._randomBytes(16);
    const meta: CryptoMeta = {
      salt: this._toBase64(salt),
      iterations,
      algo: `PBKDF2+${KEY_ALGO}`,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    try {
      if (hasExtensionApi() && ext.storage?.local) {
        await ext.storage.local.set({ [STORAGE_KEYS.CRYPTO_META]: meta });
      }
    } catch (err) {
      logger.warn('Failed to persist crypto meta', err);
    }

    this.meta = meta;
    return meta;
  }

  public async loadMeta(): Promise<CryptoMeta | null> {
    if (!this._hasSubtle()) return null;
    try {
      if (hasExtensionApi() && ext.storage?.local) {
        const res = await ext.storage.local.get(STORAGE_KEYS.CRYPTO_META as string);
        if (res && res[STORAGE_KEYS.CRYPTO_META]) {
          this.meta = res[STORAGE_KEYS.CRYPTO_META] as CryptoMeta;
          return this.meta;
        }
      }
    } catch (err) {
      logger.warn('Failed to load crypto meta', err);
    }
    return null;
  }

  public isUnlocked(): boolean {
    return this.cryptoKey !== null;
  }

  public lock(): void {
    if (this.cryptoKey) {
      // zero out reference
      // There is no direct zeroization in WebCrypto; drop reference so GC can collect
      this.cryptoKey = null;
      logger.info('Encryption key locked');
    }
  }

  public async unlock(passphrase: string): Promise<boolean> {
    if (!this.meta) {
      await this.loadMeta();
      if (!this.meta) {
        throw new Error('Encryption not initialized');
      }
    }

    if (!this._hasSubtle()) throw new Error('Web Crypto not available');

    try {
      const salt = this._fromBase64(this.meta!.salt);
      const keyMaterial = await this._getKeyMaterial(passphrase);
      const derived = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: this.meta!.iterations, hash: PBKDF2_HASH },
        keyMaterial,
        { name: KEY_ALGO, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
      this.cryptoKey = derived;
      logger.info('Encryption key unlocked');
      return true;
    } catch (err) {
      logger.warn('Failed to derive key', err);
      return false;
    }
  }

  public async ensureInitialized(): Promise<CryptoMeta> {
    const existing = await this.loadMeta();
    if (existing) return existing;
    return this.initializeEncryption();
  }

  public getKey(): CryptoKey | null {
    return this.cryptoKey;
  }

  /* Helpers */
  private _hasSubtle(): boolean {
    return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
  }

  private _randomBytes(len: number): Uint8Array {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return arr;
  }

  private _toBase64(buf: Uint8Array): string {
    const binary = Array.from(buf).map((b) => String.fromCharCode(b)).join('');
    return btoa(binary);
  }

  private _fromBase64(s: string): Uint8Array {
    const binary = atob(s);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return arr;
  }

  private async _getKeyMaterial(passphrase: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const data = enc.encode(passphrase);
    return crypto.subtle.importKey('raw', data as unknown as BufferSource, { name: 'PBKDF2' }, false, ['deriveKey']);
  }
}

export const keyManager = new KeyManager();
