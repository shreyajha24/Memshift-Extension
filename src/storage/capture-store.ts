import { KnowledgeCapture } from '../types/capture';
import { STORAGE_KEYS } from '../shared/constants';
import { CaptureDeduplicator } from '../core/capture/deduplicator';

export interface QueueItem {
  id: string;
  capture: KnowledgeCapture;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
}

export class CaptureStore {
  private static fallbackLocalCaptures: KnowledgeCapture[] = [];
  private static fallbackQueue: QueueItem[] = [];

  /**
   * Saves a capture to local history (limited to latest 50 for quick offline preview/recent items).
   */
  public static async saveLocalCapture(capture: KnowledgeCapture): Promise<void> {
    const list = await this.getLocalCaptures();
    const filtered = list.filter((c) => c.id !== capture.id);
    const updated = [capture, ...filtered].slice(0, 50);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEYS.LOCAL_CAPTURES]: updated });
      } catch (err) {
        console.warn('Failed to persist local captures:', err);
      }
    }
    this.fallbackLocalCaptures = updated;
  }

  public static async saveIfNew(capture: KnowledgeCapture): Promise<boolean> {
    const existingCaptures = await this.getLocalCaptures();
    if (CaptureDeduplicator.isDuplicate(capture, existingCaptures).isDuplicate) {
      return false;
    }

    await this.saveLocalCapture(capture);
    return true;
  }

  public static async updateLocalCapture(captureId: string, updates: Partial<KnowledgeCapture>): Promise<void> {
    const list = await this.getLocalCaptures();
    const updated = list.map((capture) => {
      if (capture.id !== captureId) return capture;
      return {
        ...capture,
        ...updates,
        source: { ...capture.source, ...updates.source },
        content: { ...capture.content, ...updates.content },
        metadata: { ...capture.metadata, ...updates.metadata },
        engagement: { ...capture.engagement, ...updates.engagement },
        intelligence: { ...capture.intelligence, ...updates.intelligence },
        privacy: { ...capture.privacy, ...updates.privacy },
      };
    });

    await this.persistLocalCaptures(updated);
  }

  public static async deleteLocalCapture(captureId: string): Promise<boolean> {
    const list = await this.getLocalCaptures();
    const updated = list.filter((capture) => capture.id !== captureId);
    if (updated.length === list.length) return false;
    await this.persistLocalCaptures(updated);
    return true;
  }

  public static async clearLocalCaptures(): Promise<void> {
    await this.persistLocalCaptures([]);
  }

  /**
   * Retrieves local captures history.
   */
  public static async getLocalCaptures(): Promise<KnowledgeCapture[]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const res = await chrome.storage.local.get(STORAGE_KEYS.LOCAL_CAPTURES);
        if (res && Array.isArray(res[STORAGE_KEYS.LOCAL_CAPTURES])) {
          return res[STORAGE_KEYS.LOCAL_CAPTURES];
        }
      } catch (err) {
        console.warn('Failed to get local captures:', err);
      }
    }
    return this.fallbackLocalCaptures;
  }

  private static async persistLocalCaptures(captures: KnowledgeCapture[]): Promise<void> {
    const bounded = captures.slice(0, 50);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEYS.LOCAL_CAPTURES]: bounded });
      } catch (err) {
        console.warn('Failed to persist local captures:', err);
      }
    }
    this.fallbackLocalCaptures = bounded;
  }

  /**
   * Enqueues a capture for offline sync retry.
   */
  public static async enqueueForSync(capture: KnowledgeCapture, errorMsg?: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const existingIndex = queue.findIndex((item) => item.capture.id === capture.id);

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      queue[existingIndex].attempts += 1;
      queue[existingIndex].lastAttemptAt = now;
      queue[existingIndex].lastError = errorMsg;
    } else {
      queue.push({
        id: capture.id,
        capture,
        attempts: 1,
        lastAttemptAt: now,
        lastError: errorMsg,
        createdAt: now,
      });
    }

    await this.persistQueue(queue);
  }

  /**
   * Retrieves the offline synchronization queue.
   */
  public static async getSyncQueue(): Promise<QueueItem[]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const res = await chrome.storage.local.get(STORAGE_KEYS.OFFLINE_QUEUE);
        if (res && Array.isArray(res[STORAGE_KEYS.OFFLINE_QUEUE])) {
          return res[STORAGE_KEYS.OFFLINE_QUEUE];
        }
      } catch (err) {
        console.warn('Failed to get sync queue:', err);
      }
    }
    return this.fallbackQueue;
  }

  /**
   * Removes an item from the offline sync queue upon successful backend synchronization.
   */
  public static async dequeueFromSync(captureId: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const filtered = queue.filter((item) => item.capture.id !== captureId);
    await this.persistQueue(filtered);
  }

  /**
   * Clears the sync queue.
   */
  public static async clearSyncQueue(): Promise<void> {
    await this.persistQueue([]);
  }

  private static async persistQueue(queue: QueueItem[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEYS.OFFLINE_QUEUE]: queue });
      } catch (err) {
        console.warn('Failed to persist sync queue:', err);
      }
    }
    this.fallbackQueue = queue;
  }
}
