import { describe, it, expect } from 'vitest';
import { CaptureBuilder, RawExtractedData } from '../src/core/capture/capture-builder';
import { generateMemoryId } from '../src/shared/utils';
import { DEFAULT_SETTINGS } from '../src/types/settings';

describe('CaptureBuilder', () => {
  it('builds a complete KnowledgeCapture object with intelligence and metadata', () => {
    const raw: RawExtractedData = {
      sourceType: 'youtube',
      platform: 'YouTube',
      url: 'https://www.youtube.com/watch?v=abc123xyz&utm_source=twitter',
      canonicalUrl: 'https://www.youtube.com/watch?v=abc123xyz',
      title: 'Spring Boot System Design with Redis',
      channel: 'Architecture Channel',
      currentTimestampSeconds: 763,
      transcript: [{ text: 'We use Redis as an in-memory cache.', start: 760, duration: 10 }],
    };

    const capture = CaptureBuilder.build(raw, DEFAULT_SETTINGS);

    expect(capture.id).toBeDefined();
    expect(capture.source.canonicalUrl).toBe('https://www.youtube.com/watch?v=abc123xyz');
    expect(capture.engagement.currentTimestampSeconds).toBe(763);
    expect(capture.intelligence.priorityScore).toBeGreaterThan(60);
    expect(capture.intelligence.matchedKeywords).toContain('Spring Boot');
    expect(capture.intelligence.matchedKeywords).toContain('Redis');
    expect(capture.intelligence.matchedKeywords).toContain('System Design');
    expect(capture.intelligence.topicCandidates).toContain('Databases');
    expect(capture.privacy.locallyProcessed).toBe(true);
  });

  it('uses a deterministic memory id and initializes visit metadata', () => {
    const raw: RawExtractedData = {
      sourceType: 'article',
      platform: 'Web',
      url: 'https://example.com/guide?utm_source=newsletter#intro',
      canonicalUrl: 'https://example.com/guide?utm_source=newsletter#intro',
      title: 'Guide',
      text: 'Content about Redis caching.',
    };

    const first = CaptureBuilder.build(raw, DEFAULT_SETTINGS);
    const second = CaptureBuilder.build(
      { ...raw, url: 'https://example.com/guide/', canonicalUrl: 'https://example.com/guide/' },
      DEFAULT_SETTINGS
    );

    expect(first.id).toBe(generateMemoryId('https://example.com/guide'));
    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^mem_/);
    expect(first.metadata.visitCount).toBe(1);
    expect(first.metadata.firstSeenAt).toBeDefined();
    expect(first.metadata.lastSeenAt).toBeDefined();
    expect(first.metadata.visitHistory).toEqual([first.metadata.firstSeenAt]);
  });
});
