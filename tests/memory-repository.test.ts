import { beforeEach, describe, expect, it } from 'vitest';
import { CaptureProcessor } from '../src/background/capture-processor';
import { CaptureBuilder, RawExtractedData } from '../src/core/capture/capture-builder';
import { CaptureStore } from '../src/storage/capture-store';
import { MemoryRepository } from '../src/storage/memory-repository';
import { SettingsStore } from '../src/storage/settings-store';
import { KnowledgeCapture } from '../src/types/capture';
import { DEFAULT_SETTINGS } from '../src/types/settings';

const baseDate = new Date('2026-08-26T10:00:00.000Z');

describe('MemoryRepository', () => {
  beforeEach(async () => {
    await SettingsStore.resetSettings();
    await CaptureStore.clearLocalCaptures();
    await CaptureStore.clearSyncQueue();
  });

  it('saves and retrieves a memory by id', async () => {
    const memory = makeMemory('redis', 'Understanding Redis Caching');
    const result = await MemoryRepository.save(memory);

    expect(result.saved).toBe(true);
    expect(result.duplicate).toBe(false);
    await expect(MemoryRepository.getById('redis')).resolves.toMatchObject({ id: 'redis' });
  });

  it('returns recent memories in capture-date order', async () => {
    await MemoryRepository.save(makeMemory('older', 'Older JWT Video', -2));
    await MemoryRepository.save(makeMemory('newer', 'Newer System Design Note', 0));

    const recent = await MemoryRepository.getRecent(2);

    expect(recent.map((memory) => memory.id)).toEqual(['newer', 'older']);
  });

  it('counts stored memories', async () => {
    await MemoryRepository.save(makeMemory('one', 'One'));
    await MemoryRepository.save(makeMemory('two', 'Two'));

    await expect(MemoryRepository.count()).resolves.toBe(2);
  });

  it('does not save duplicate memories and increments visitCount', async () => {
    const first = makeMemory('first', 'Understanding Redis Caching');
    const second = makeMemory('second', 'Understanding Redis Caching');
    second.source.url = first.source.url;
    second.source.canonicalUrl = first.source.canonicalUrl;
    second.metadata.contentHash = first.metadata.contentHash;

    const res1 = await MemoryRepository.save(first);
    expect(res1.saved).toBe(true);
    expect(res1.duplicate).toBe(false);

    const duplicate = await MemoryRepository.save(second);

    expect(duplicate.saved).toBe(true);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.memory.metadata.visitCount).toBe(2);
    await expect(MemoryRepository.count()).resolves.toBe(1);
  });

  it('returns no results for empty search', async () => {
    await MemoryRepository.save(makeMemory('redis', 'Understanding Redis Caching'));

    await expect(MemoryRepository.search('   ')).resolves.toEqual([]);
  });

  it('returns no results when nothing matches', async () => {
    await MemoryRepository.save(makeMemory('redis', 'Understanding Redis Caching'));

    await expect(MemoryRepository.search('kubernetes autoscaling')).resolves.toEqual([]);
  });

  it('ranks title, excerpt, content, topics, subtopics, and priority keywords', async () => {
    await MemoryRepository.save(makeMemory('low', 'Caching Notes', -1, {
      excerpt: 'General notes about cache invalidation.',
      priorityScore: 20,
    }));
    await MemoryRepository.save(makeMemory('high', 'Understanding Redis Caching', 0, {
      text: 'Redis stores frequently accessed data for system design workloads.',
      excerpt: 'Redis stores frequently accessed data.',
      topics: ['Redis', 'Databases'],
      subtopics: ['Caching'],
      matchedKeywords: ['Redis', 'System Design'],
      priorityScore: 92,
    }));

    const results = await MemoryRepository.search({ query: 'redis caching', limit: 10 });

    expect(results[0].memory.id).toBe('high');
    expect(results[0].matchedTerms).toEqual(expect.arrayContaining(['redis', 'caching']));
    expect(results[0].matchedFields).toEqual(expect.arrayContaining(['title', 'topic', 'subtopic', 'priorityKeyword']));
  });

  it('deletes a memory', async () => {
    await MemoryRepository.save(makeMemory('delete-me', 'Delete Me'));

    await expect(MemoryRepository.delete('delete-me')).resolves.toBe(true);
    await expect(MemoryRepository.getById('delete-me')).resolves.toBeUndefined();
  });
});

describe('Capture storage integration', () => {
  beforeEach(async () => {
    await SettingsStore.resetSettings();
    await CaptureStore.clearLocalCaptures();
    await CaptureStore.clearSyncQueue();
  });

  it('does not store a capture when Master Toggle is off', async () => {
    await SettingsStore.updateSettings({ enabled: false });

    const result = await CaptureProcessor.process(makeRawCapture());

    expect(result.saved).toBe(false);
    await expect(MemoryRepository.count()).resolves.toBe(0);
  });

  it('stores a local memory when Master Toggle is on', async () => {
    await SettingsStore.updateSettings({
      enabled: true,
      privacy: { ...DEFAULT_SETTINGS.privacy, backendSyncEnabled: false },
    });

    const result = await CaptureProcessor.process(makeRawCapture());

    expect(result.saved).toBe(true);
    await expect(MemoryRepository.count()).resolves.toBe(1);
  });

  it('marks backend-sync-disabled captures as local only', async () => {
    const memory = CaptureBuilder.build(makeRawCapture(), {
      ...DEFAULT_SETTINGS,
      privacy: { ...DEFAULT_SETTINGS.privacy, backendSyncEnabled: false },
    });

    await MemoryRepository.save(memory);
    const stored = await MemoryRepository.getById(memory.id);

    expect(stored?.syncStatus).toBe('disabled');
    expect(stored?.privacy.backendSynced).toBe(false);
  });
});

function makeMemory(
  id: string,
  title: string,
  dayOffset = 0,
  overrides: {
    text?: string;
    excerpt?: string;
    topics?: string[];
    subtopics?: string[];
    matchedKeywords?: string[];
    priorityScore?: number;
  } = {}
): KnowledgeCapture {
  return {
    id,
    source: {
      type: 'article',
      platform: 'Web',
      url: `https://example.com/${id}`,
      canonicalUrl: `https://example.com/${id}`,
      title,
    },
    content: {
      text: overrides.text || 'Redis caching improves application latency by storing frequently accessed data.',
      excerpt: overrides.excerpt || 'Redis stores frequently accessed data for fast recall.',
    },
    metadata: {
      capturedAt: new Date(baseDate.getTime() + dayOffset * 86_400_000).toISOString(),
      contentHash: id,
    },
    engagement: {},
    intelligence: {
      priorityScore: overrides.priorityScore ?? 60,
      matchedKeywords: overrides.matchedKeywords || ['Redis'],
      topicCandidates: overrides.topics || ['Databases'],
      subtopics: overrides.subtopics || ['Caching'],
    },
    privacy: {
      transcriptCaptured: false,
      fullTextCaptured: true,
      metadataCaptured: true,
      locallyProcessed: true,
      backendSynced: false,
    },
    captureMethod: 'automatic',
    processingStatus: 'completed',
    syncStatus: 'disabled',
  };
}

function makeRawCapture(): RawExtractedData {
  return {
    sourceType: 'article',
    platform: 'Web',
    url: 'https://example.com/redis-caching',
    canonicalUrl: 'https://example.com/redis-caching',
    title: 'Understanding Redis Caching',
    description: 'A practical guide to Redis caching.',
    text: 'Redis stores frequently accessed data for fast application recall and system design scalability.',
    excerpt: 'Redis stores frequently accessed data.',
    contentHash: 'redis-caching-v1',
  };
}
