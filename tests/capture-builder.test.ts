import { describe, it, expect } from 'vitest';
import { CaptureBuilder, RawExtractedData } from '../src/core/capture/capture-builder';
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
});
