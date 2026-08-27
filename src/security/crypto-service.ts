import { EncryptedPayload } from './crypto-types';
import { keyManager } from './key-manager';
import { logger } from '../utils/logger';

const AES_GCM = 'AES-GCM';
const IV_BYTES = 12; // 96-bit recommended for GCM
const VERSION = 1;

function _toBase64(buf: Uint8Array): string {
  const binary = Array.from(buf).map((b) => String.fromCharCode(b)).join('');
  return btoa(binary);
}

function _fromBase64(s: string): Uint8Array {
  const binary = atob(s);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

export async function encryptObject(obj: unknown, associatedData?: string): Promise<EncryptedPayload> {
  if (!keyManager.isUnlocked()) throw new Error('Encryption key not unlocked');
  const key = keyManager.getKey();
  if (!key) throw new Error('No crypto key available');

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(obj));
  const aad = associatedData ? enc.encode(associatedData) : undefined;

  try {
    const ct = await crypto.subtle.encrypt({ name: AES_GCM, iv: iv as unknown as BufferSource, additionalData: aad as unknown as BufferSource }, key, plaintext as unknown as BufferSource);
    const ctArr = new Uint8Array(ct as ArrayBuffer);
    return {
      ciphertext: _toBase64(ctArr),
      iv: _toBase64(iv),
      version: VERSION,
    };
  } catch (err) {
    logger.error('Encryption failed', err);
    throw err;
  }
}

export async function decryptObject(payload: EncryptedPayload, associatedData?: string): Promise<unknown> {
  if (!keyManager.isUnlocked()) throw new Error('Encryption key not unlocked');
  const key = keyManager.getKey();
  if (!key) throw new Error('No crypto key available');

  const iv = _fromBase64(payload.iv);
  const ct = _fromBase64(payload.ciphertext);
  const aad = associatedData ? new TextEncoder().encode(associatedData) : undefined;

  try {
    const pt = await crypto.subtle.decrypt({ name: AES_GCM, iv: iv as unknown as BufferSource, additionalData: aad as unknown as BufferSource }, key, ct as unknown as BufferSource);
    const dec = new TextDecoder().decode(pt as ArrayBuffer);
    return JSON.parse(dec);
  } catch (err) {
    logger.error('Decryption failed', err);
    throw err;
  }
}
