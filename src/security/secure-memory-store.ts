import { EncryptedMemoryRecord, EncryptedPayload } from './crypto-types';
import { keyManager } from './key-manager';
import { encryptObject, decryptObject } from './crypto-service';
import { logger } from '../utils/logger';

const DB_NAME = 'memshift-secure-db';
const DB_VERSION = 1;
const MEM_STORE = 'memories';
const QUEUE_STORE = 'queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEM_STORE)) {
        db.createObjectStore(MEM_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class SecureMemoryStore {
  public static async available(): Promise<boolean> {
    return typeof indexedDB !== 'undefined' && keyManager.isUnlocked();
  }

  public static async saveMemory(id: string, payload: unknown): Promise<void> {
    if (!keyManager.isUnlocked()) throw new Error('Key not unlocked');
    const db = await openDB();
    const encrypted = await encryptObject(payload, id);
    const rec: EncryptedMemoryRecord = {
      id,
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      encryptedPayload: encrypted,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEM_STORE, 'readwrite');
      const store = tx.objectStore(MEM_STORE);
      const req = store.put(rec);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public static async getMemory(id: string): Promise<unknown | null> {
    if (!keyManager.isUnlocked()) throw new Error('Key not unlocked');
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEM_STORE, 'readonly');
      const store = tx.objectStore(MEM_STORE);
      const req = store.get(id);
      req.onsuccess = async () => {
        const rec = req.result as EncryptedMemoryRecord | undefined;
        if (!rec) return resolve(null);
        try {
          const decrypted = await decryptObject(rec.encryptedPayload, id);
          resolve(decrypted);
        } catch (err) {
          reject(err);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  public static async listMemoryIds(): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEM_STORE, 'readonly');
      const store = tx.objectStore(MEM_STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  public static async deleteMemory(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEM_STORE, 'readwrite');
      const store = tx.objectStore(MEM_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Queue helpers store encrypted full captures in queue store
  public static async enqueue(id: string, payload: unknown): Promise<void> {
    if (!keyManager.isUnlocked()) throw new Error('Key not unlocked');
    const db = await openDB();
    const encrypted = await encryptObject(payload, id);
    const rec = { id, encryptedPayload: encrypted, createdAt: new Date().toISOString() } as const;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.put(rec as unknown as Record<string, unknown>);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public static async dequeue(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public static async listQueue(): Promise<{ id: string; payload?: unknown }[]> {
    if (!keyManager.isUnlocked()) throw new Error('Key not unlocked');
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = async () => {
        const res = req.result as unknown[];
        const out: { id: string; payload?: unknown }[] = [];
        for (const r of res) {
            const item = r as unknown;
            if (item && typeof item === 'object' && 'id' in (item as Record<string, unknown>) && 'encryptedPayload' in (item as Record<string, unknown>)) {
              const obj = item as Record<string, unknown>;
              try {
                const payload = await decryptObject(obj.encryptedPayload as EncryptedPayload, String(obj.id));
                out.push({ id: String(obj.id), payload });
              } catch (err) {
                logger.warn('Failed to decrypt queue item', (obj.id as unknown) || 'unknown', err);
                out.push({ id: String(obj.id) });
              }
            }
          }
          resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export default SecureMemoryStore;
