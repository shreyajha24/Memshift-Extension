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

  it('allows different moments on same YouTube video when timestamps differ (> 30s)', () => {
    const existing = [makeTestCapture('yt-1', 'https://www.youtube.com/watch?v=123', 'youtube', 120)];
    const newCap = makeTestCapture('yt-2', 'https://www.youtube.com/watch?v=123', 'youtube', 840);

    const result = CaptureDeduplicator.isDuplicate(newCap, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('flags duplicate on same YouTube video when timestamps are within 30s', () => {
    const existing = [makeTestCapture('yt-1', 'https://www.youtube.com/watch?v=123', 'youtube', 120)];
    const newCap = makeTestCapture('yt-2', 'https://www.youtube.com/watch?v=123', 'youtube', 135);

    const result = CaptureDeduplicator.isDuplicate(newCap, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateId).toBe('yt-1');
  });
});
