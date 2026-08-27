import { describe, it, expect } from 'vitest';
import { CaptureDeduplicator } from '../src/core/capture/deduplicator';
import { KnowledgeCapture } from '../src/types/capture';

function makeTestCapture(
  id: string,
  url: string,
  sourceType: 'youtube' | 'article',
  timestampSeconds?: number
): KnowledgeCapture {
  return {
    id,
    source: {
      type: sourceType,
      platform: sourceType === 'youtube' ? 'YouTube' : 'Web',
      url,
      canonicalUrl: url,
    },
    content: {},
    metadata: { capturedAt: new Date().toISOString() },
    engagement: { currentTimestampSeconds: timestampSeconds },
    intelligence: { priorityScore: 50, matchedKeywords: [], topicCandidates: [], subtopics: [] },
    privacy: {
      transcriptCaptured: false,
      fullTextCaptured: false,
      metadataCaptured: true,
      locallyProcessed: true,
      backendSynced: true,
    },
  };
}

describe('CaptureDeduplicator', () => {
  it('detects duplicate web articles with identical canonical URL', () => {
    const existing = [makeTestCapture('1', 'https://example.com/article?utm_source=twitter', 'article')];
    const newCap = makeTestCapture('2', 'https://example.com/article?utm_source=facebook', 'article');

    const result = CaptureDeduplicator.isDuplicate(newCap, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateId).toBe('1');
  });

  it('detects duplicate on same YouTube video even when timestamps differ', () => {
    const existing = [makeTestCapture('yt-1', 'https://www.youtube.com/watch?v=123&t=120s', 'youtube', 120)];
    const newCap = makeTestCapture('yt-2', 'https://www.youtube.com/watch?v=123&t=840s', 'youtube', 840);

    const result = CaptureDeduplicator.isDuplicate(newCap, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateId).toBe('yt-1');
  });

  it('distinguishes different YouTube videos', () => {
    const existing = [makeTestCapture('yt-1', 'https://www.youtube.com/watch?v=123', 'youtube')];
    const newCap = makeTestCapture('yt-2', 'https://www.youtube.com/watch?v=456', 'youtube');

    const result = CaptureDeduplicator.isDuplicate(newCap, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('detects duplicate on URL hash and trailing slash variants', () => {
    const existing = [makeTestCapture('web-1', 'https://example.com/page', 'article')];
    const newCap1 = makeTestCapture('web-2', 'https://example.com/page/', 'article');
    const newCap2 = makeTestCapture('web-3', 'https://example.com/page#section2', 'article');

    expect(CaptureDeduplicator.isDuplicate(newCap1, existing).isDuplicate).toBe(true);
    expect(CaptureDeduplicator.isDuplicate(newCap2, existing).isDuplicate).toBe(true);
  });

  it('distinguishes meaningful query parameters', () => {
    const existing = [makeTestCapture('search-1', 'https://example.com/search?q=java', 'article')];
    const newCap = makeTestCapture('search-2', 'https://example.com/search?q=spring', 'article');

    expect(CaptureDeduplicator.isDuplicate(newCap, existing).isDuplicate).toBe(false);
  });
});
