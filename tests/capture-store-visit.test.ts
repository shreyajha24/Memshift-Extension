import { beforeEach, describe, expect, it } from 'vitest';
import { CaptureStore } from '../src/storage/capture-store';
import { NavigationDeduplicator } from '../src/core/capture/navigation-deduplicator';
import { generateMemoryId } from '../src/shared/utils';
import { KnowledgeCapture } from '../src/types/capture';

function makeCapture(url: string, overrides: Partial<KnowledgeCapture> = {}): KnowledgeCapture {
  const canonicalUrl = url;
  return {
    id: generateMemoryId(canonicalUrl),
    source: {
      type: 'article',
      platform: 'Web',
      url,
      canonicalUrl,
      title: 'Test Article',
    },
    content: { text: 'Body text', excerpt: 'Excerpt' },
    metadata: {
      capturedAt: new Date().toISOString(),
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      visitCount: 1,
      visitHistory: [new Date().toISOString()],
    },
    engagement: {},
    intelligence: { priorityScore: 50, matchedKeywords: [], topicCandidates: [], subtopics: [] },
    privacy: {
      transcriptCaptured: false,
      fullTextCaptured: true,
      metadataCaptured: true,
      locallyProcessed: true,
      backendSynced: false,
    },
    ...overrides,
  };
}

describe('CaptureStore.recordVisit', () => {
  beforeEach(async () => {
    await CaptureStore.clearLocalCaptures();
    await CaptureStore.clearSyncQueue();
    NavigationDeduplicator.reset();
  });

  it('creates a new memory with visit metadata on first visit', async () => {
    const result = await CaptureStore.recordVisit(makeCapture('https://example.com/page'));

    expect(result.isNew).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.visitCount).toBe(1);
    expect(result.memory.metadata.visitCount).toBe(1);
    expect(result.memory.metadata.firstSeenAt).toBeDefined();
    expect(result.memory.metadata.lastSeenAt).toBeDefined();
    expect(result.memory.metadata.visitHistory).toHaveLength(1);
    await expect(CaptureStore.getLocalCaptures()).resolves.toHaveLength(1);
  });

  it('upserts revisits instead of appending and increments visitCount', async () => {
    const url = 'https://example.com/article?utm_source=twitter';
    const first = await CaptureStore.recordVisit(makeCapture(url));
    const second = await CaptureStore.recordVisit(
      makeCapture('https://example.com/article?utm_source=facebook#section')
    );

    expect(second.isNew).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.visitCount).toBe(2);
    expect(second.memory.id).toBe(first.memory.id);
    expect(second.memory.metadata.firstSeenAt).toBe(first.memory.metadata.firstSeenAt);
    expect(second.memory.metadata.visitHistory).toHaveLength(2);
    await expect(CaptureStore.getLocalCaptures()).resolves.toHaveLength(1);
  });

  it('treats YouTube timestamp variants as the same memory', async () => {
    const first = await CaptureStore.recordVisit(
      makeCapture('https://www.youtube.com/watch?v=vid123&t=120s', {
        source: {
          type: 'youtube',
          platform: 'YouTube',
          url: 'https://www.youtube.com/watch?v=vid123&t=120s',
          canonicalUrl: 'https://www.youtube.com/watch?v=vid123&t=120s',
          title: 'Video',
        },
        engagement: { currentTimestampSeconds: 120 },
      })
    );
    const second = await CaptureStore.recordVisit(
      makeCapture('https://www.youtube.com/watch?v=vid123&t=840s', {
        source: {
          type: 'youtube',
          platform: 'YouTube',
          url: 'https://www.youtube.com/watch?v=vid123&t=840s',
          canonicalUrl: 'https://www.youtube.com/watch?v=vid123&t=840s',
          title: 'Video',
        },
        engagement: { currentTimestampSeconds: 840 },
      })
    );

    expect(second.duplicate).toBe(true);
    expect(second.memory.id).toBe(first.memory.id);
    expect(second.memory.engagement.currentTimestampSeconds).toBe(840);
    await expect(CaptureStore.getLocalCaptures()).resolves.toHaveLength(1);
  });

  it('serializes concurrent visits so only one record exists', async () => {
    const url = 'https://example.com/race';
    const results = await Promise.all([
      CaptureStore.recordVisit(makeCapture(url)),
      CaptureStore.recordVisit(makeCapture(url)),
      CaptureStore.recordVisit(makeCapture(url)),
    ]);

    const memories = await CaptureStore.getLocalCaptures();
    expect(memories).toHaveLength(1);
    expect(memories[0].metadata.visitCount).toBe(3);
    expect(results.filter((r) => r.isNew)).toHaveLength(1);
    expect(results.filter((r) => r.duplicate)).toHaveLength(2);
  });

  it('skips visitCount increment when incrementVisitCount is false', async () => {
    await CaptureStore.recordVisit(makeCapture('https://example.com/debounce'));
    const second = await CaptureStore.recordVisit(makeCapture('https://example.com/debounce'), {
      incrementVisitCount: false,
    });

    expect(second.duplicate).toBe(true);
    expect(second.visitCount).toBe(1);
    expect(second.memory.metadata.visitHistory).toHaveLength(1);
  });
});

describe('NavigationDeduplicator', () => {
  beforeEach(() => {
    NavigationDeduplicator.reset();
  });

  it('flags rapid duplicate navigation events within the debounce window', () => {
    const url = 'https://example.com/page';
    expect(NavigationDeduplicator.isRapidDuplicateEvent(url, 1000)).toBe(false);
    expect(NavigationDeduplicator.isRapidDuplicateEvent(url, 1500)).toBe(true);
    expect(NavigationDeduplicator.isRapidDuplicateEvent(url, 3000)).toBe(false);
  });

  it('treats URL variants as the same navigation key', () => {
    expect(NavigationDeduplicator.isRapidDuplicateEvent('https://example.com/page/', 1000)).toBe(false);
    expect(NavigationDeduplicator.isRapidDuplicateEvent('https://example.com/page#x', 1100)).toBe(true);
  });
});
