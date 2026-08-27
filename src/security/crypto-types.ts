export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  tag?: string; // base64 if separated (not used for AES-GCM as tag is appended)
  version: number;
}

export interface EncryptedMemoryRecord {
  id: string;
  schemaVersion: number;
  createdAt: string;
  encryptedPayload: EncryptedPayload;
}

export interface CryptoMeta {
  salt: string; // base64
  iterations: number;
  algo: string; // e.g., PBKDF2+AES-GCM
  createdAt: string;
  version: number;
}
