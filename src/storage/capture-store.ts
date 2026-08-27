import { KnowledgeCapture } from '../types/capture';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../shared/constants';
import { CaptureDeduplicator } from '../core/capture/deduplicator';
import { keyManager } from '../security/key-manager';
import SecureMemoryStore from '../security/secure-memory-store';
import { normalizeUrl, extractDomain, generateMemoryId } from '../shared/utils';
import { ext, hasExtensionApi } from '../shared/browser-api';

export interface QueueItem {
  id: string;
  capture: KnowledgeCapture;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
}

export interface RecordVisitResult {
  memory: KnowledgeCapture;
  isNew: boolean;
  visitCount: number;
  saved: boolean;
  duplicate: boolean;
}

class TransactionLock {
  private promise: Promise<unknown> = Promise.resolve();

  public async run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.promise.then(task, task);
    this.promise = next.then(() => {}, () => {});
    return next as Promise<T>;
  }
}

export class CaptureStore {
  private static fallbackLocalCaptures: KnowledgeCapture[] = [];
  private static fallbackQueue: QueueItem[] = [];
  private static lock = new TransactionLock();

  /**
   * Atomically records a page visit: finds existing memory by canonical URL/ID to update it, or creates a new one.
   */
  public static async recordVisit(
    capture: KnowledgeCapture,
    options?: { incrementVisitCount?: boolean }
  ): Promise<RecordVisitResult> {
    return this.lock.run(async () => {
      const list = await this.readRawLocalCaptures();
      const canonicalUrl = normalizeUrl(capture.source.canonicalUrl || capture.source.url);
      const domain = capture.source.domain || capture.metadata.domain || extractDomain(canonicalUrl);

      // Prefer stable ID match, then fall back to normalized canonical URL
      let existingIndex = capture.id ? CaptureDeduplicator.findExistingIndex(capture.id, list) : -1;
      if (existingIndex < 0 && canonicalUrl) {
        existingIndex = CaptureDeduplicator.findExistingIndex(canonicalUrl, list);
      }

      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        const existing = list[existingIndex];
        const oldVisitCount = existing.metadata.visitCount ?? 1;
        const shouldIncrement = options?.incrementVisitCount !== false;
        const newVisitCount = shouldIncrement ? oldVisitCount + 1 : oldVisitCount;
        const firstSeenAt = existing.metadata.firstSeenAt || existing.metadata.capturedAt || now;
        const history = existing.metadata.visitHistory || [firstSeenAt];
        const updatedHistory = shouldIncrement ? [...history, now].slice(-100) : history;

        const mergedKeywords = Array.from(
          new Set([...(existing.intelligence?.matchedKeywords || []), ...(capture.intelligence?.matchedKeywords || [])])
        );
        const mergedTopics = Array.from(
          new Set([...(existing.intelligence?.topicCandidates || []), ...(capture.intelligence?.topicCandidates || [])])
        );
        const mergedSubtopics = Array.from(
          new Set([...(existing.intelligence?.subtopics || []), ...(capture.intelligence?.subtopics || [])])
        );
        const mergedConcepts = Array.from(
          new Set([...(existing.intelligence?.concepts || []), ...(capture.intelligence?.concepts || [])])
        );
        const mergedParentTopics = Array.from(
          new Set([...(existing.intelligence?.parentTopics || []), ...(capture.intelligence?.parentTopics || [])])
        );

        const updated: KnowledgeCapture = {
          ...existing,
          id: existing.id,
          source: {
            ...existing.source,
            ...capture.source,
            canonicalUrl,
            domain: domain || existing.source.domain,
            title: (capture.source.title && capture.source.title !== 'Untitled Document') ? capture.source.title : existing.source.title,
          },
          content: {
            text: capture.content.text || existing.content.text,
            excerpt: capture.content.excerpt || existing.content.excerpt,
            transcript: (capture.content.transcript && capture.content.transcript.length > 0) ? capture.content.transcript : existing.content.transcript,
          },
          metadata: {
            ...existing.metadata,
            ...capture.metadata,
            firstSeenAt,
            lastSeenAt: now,
            visitCount: newVisitCount,
            visitHistory: updatedHistory,
            domain: domain || existing.metadata.domain,
            contentHash: capture.metadata.contentHash || existing.metadata.contentHash,
            description: capture.metadata.description || existing.metadata.description,
          },
          engagement: {
            currentTimestampSeconds: capture.engagement.currentTimestampSeconds ?? existing.engagement.currentTimestampSeconds,
            engagementDurationSeconds: capture.engagement.engagementDurationSeconds ?? existing.engagement.engagementDurationSeconds,
          },
          intelligence: {
            ...existing.intelligence,
            priorityScore: Math.max(existing.intelligence?.priorityScore || 0, capture.intelligence?.priorityScore || 0),
            matchedKeywords: mergedKeywords,
            topicCandidates: mergedTopics,
            subtopics: mergedSubtopics,
            concepts: mergedConcepts.length > 0 ? mergedConcepts : undefined,
            parentTopics: mergedParentTopics.length > 0 ? mergedParentTopics : undefined,
          },
          privacy: {
            transcriptCaptured: existing.privacy.transcriptCaptured || capture.privacy.transcriptCaptured,
            fullTextCaptured: existing.privacy.fullTextCaptured || capture.privacy.fullTextCaptured,
            metadataCaptured: true,
            locallyProcessed: true,
            backendSynced: existing.privacy.backendSynced || capture.privacy.backendSynced,
          },
          captureMethod: capture.captureMethod || existing.captureMethod || 'automatic',
          processingStatus: 'completed',
          syncStatus: existing.syncStatus || capture.syncStatus || 'disabled',
        };

        list[existingIndex] = updated;
        await this.persistLocalCaptures(list);

        return {
          memory: updated,
          isNew: false,
          visitCount: newVisitCount,
          saved: true,
          duplicate: true,
        };
      }

      // Brand new memory
      const stableId = capture.id || generateMemoryId(canonicalUrl);
      const newMemory: KnowledgeCapture = {
        ...capture,
        id: stableId,
        source: {
          ...capture.source,
          canonicalUrl,
          domain,
        },
        metadata: {
          ...capture.metadata,
          capturedAt: capture.metadata.capturedAt || now,
          firstSeenAt: capture.metadata.firstSeenAt || capture.metadata.capturedAt || now,
          lastSeenAt: now,
          visitCount: capture.metadata.visitCount ?? 1,
          visitHistory: capture.metadata.visitHistory || [now],
          domain,
        },
      };

      list.unshift(newMemory);
      await this.persistLocalCaptures(list);

      return {
        memory: newMemory,
        isNew: true,
        visitCount: 1,
        saved: true,
        duplicate: false,
      };
    });
  }

  /**
   * Saves a capture to local history.
   */
  public static async saveLocalCapture(capture: KnowledgeCapture): Promise<void> {
    await this.recordVisit(capture, { incrementVisitCount: false });
  }

  public static async saveIfNew(capture: KnowledgeCapture): Promise<boolean> {
    const res = await this.recordVisit(capture);
    return res.isNew;
  }

  public static async updateLocalCapture(captureId: string, updates: Partial<KnowledgeCapture>): Promise<void> {
    await this.lock.run(async () => {
      const list = await this.readRawLocalCaptures();
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
    });
  }

  public static async deleteLocalCapture(captureId: string): Promise<boolean> {
    return this.lock.run(async () => {
      const list = await this.readRawLocalCaptures();
      const updated = list.filter((capture) => capture.id !== captureId);
      if (updated.length === list.length) return false;
      await this.persistLocalCaptures(updated);
      return true;
    });
  }

  public static async clearLocalCaptures(): Promise<void> {
    await this.lock.run(async () => {
      await this.persistLocalCaptures([]);
    });
  }

  /**
   * Retrieves local captures history.
   */
  public static async getLocalCaptures(): Promise<KnowledgeCapture[]> {
    return this.readRawLocalCaptures();
  }

  private static async readRawLocalCaptures(): Promise<KnowledgeCapture[]> {
    // If unlocked and secure store available, read from IndexedDB
    if (keyManager.isUnlocked() && typeof indexedDB !== 'undefined') {
      try {
        const ids = await SecureMemoryStore.listMemoryIds();
        const out: KnowledgeCapture[] = [];
        for (const id of ids) {
          try {
            const dec = await SecureMemoryStore.getMemory(id);
            if (dec) out.push(dec as KnowledgeCapture);
          } catch (err) {
            logger.warn('Failed to decrypt memory', id, err);
          }
        }
        return out;
      } catch (err) {
        logger.warn('Failed to read from secure store', err);
      }
    }

    if (hasExtensionApi() && ext.storage?.local) {
      try {
        const res = await ext.storage.local.get(STORAGE_KEYS.LOCAL_CAPTURES);
        if (res && Array.isArray(res[STORAGE_KEYS.LOCAL_CAPTURES])) {
          return res[STORAGE_KEYS.LOCAL_CAPTURES];
        }
      } catch (err) {
        logger.warn('Failed to get local captures', err);
      }
    }
    return this.fallbackLocalCaptures;
  }

  private static async persistLocalCaptures(captures: KnowledgeCapture[]): Promise<void> {
    if (keyManager.isUnlocked()) {
      // Persist to secure store one-by-one
      try {
        for (const c of captures) {
          await SecureMemoryStore.saveMemory(c.id, c);
        }
      } catch (err) {
        logger.warn('Failed to persist to secure store', err);
      }
    } else if (hasExtensionApi() && ext.storage?.local) {
      try {
        await ext.storage.local.set({ [STORAGE_KEYS.LOCAL_CAPTURES]: captures });
      } catch (err) {
        logger.warn('Failed to persist local captures', err);
      }
    }
    this.fallbackLocalCaptures = captures;
  }

  /**
   * Enqueues a capture for offline sync retry.
   */
  public static async enqueueForSync(capture: KnowledgeCapture, errorMsg?: string): Promise<void> {
    // If secure store is available and unlocked, store encrypted in queue store
    if (keyManager.isUnlocked() && typeof indexedDB !== 'undefined') {
      try {
        await SecureMemoryStore.enqueue(capture.id, { capture, lastError: errorMsg, createdAt: new Date().toISOString() });
        return;
      } catch (err) {
        logger.warn('Failed to enqueue in secure store', err);
      }
    }

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
    // If secure store unlocked, read from IndexedDB queue
    if (keyManager.isUnlocked() && typeof indexedDB !== 'undefined') {
      try {
        const items = await SecureMemoryStore.listQueue();
        // Map to QueueItem shape where possible
        const out: QueueItem[] = items.map((it) => {
          const payload = it.payload as unknown;
          let captureVal = {} as KnowledgeCapture;
          let createdAt = new Date().toISOString();
          if (payload && typeof payload === 'object') {
            const p = payload as Record<string, unknown>;
            if ('capture' in p && typeof p.capture === 'object') {
              captureVal = p.capture as KnowledgeCapture;
            } else {
              // maybe payload is the capture itself
              captureVal = p as unknown as KnowledgeCapture;
            }
            if ('createdAt' in p && typeof p.createdAt === 'string') createdAt = p.createdAt as string;
          }
          return {
            id: it.id,
            capture: captureVal,
            attempts: 1,
            lastAttemptAt: undefined,
            lastError: undefined,
            createdAt,
          };
        });
        return out;
      } catch (err) {
        logger.warn('Failed to read secure queue', err);
      }
    }

    if (hasExtensionApi() && ext.storage?.local) {
      try {
        const res = await ext.storage.local.get(STORAGE_KEYS.OFFLINE_QUEUE);
        if (res && Array.isArray(res[STORAGE_KEYS.OFFLINE_QUEUE])) {
          return res[STORAGE_KEYS.OFFLINE_QUEUE];
        }
      } catch (err) {
        logger.warn('Failed to get sync queue', err);
      }
    }
    return this.fallbackQueue;
  }

  /**
   * Removes an item from the offline sync queue upon successful backend synchronization.
   */
  public static async dequeueFromSync(captureId: string): Promise<void> {
    if (keyManager.isUnlocked() && typeof indexedDB !== 'undefined') {
      try {
        await SecureMemoryStore.dequeue(captureId);
        return;
      } catch (err) {
        logger.warn('Failed to dequeue from secure store', err);
      }
    }

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
    if (keyManager.isUnlocked() && typeof indexedDB !== 'undefined') {
      try {
        // Persist each queue item to secure queue store
        for (const item of queue) {
          await SecureMemoryStore.enqueue(item.id, item);
        }
        return;
      } catch (err) {
        logger.warn('Failed to persist queue to secure store', err);
      }
    }

    if (hasExtensionApi() && ext.storage?.local) {
      try {
        await ext.storage.local.set({ [STORAGE_KEYS.OFFLINE_QUEUE]: queue });
      } catch (err) {
        logger.warn('Failed to persist sync queue', err);
      }
    }
    this.fallbackQueue = queue;
  }
}
