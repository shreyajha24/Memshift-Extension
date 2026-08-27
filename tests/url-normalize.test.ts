import { describe, it, expect } from 'vitest';
import { normalizeUrl, generateMemoryId } from '../src/shared/utils';

describe('normalizeUrl', () => {
  it('strips fragment hashes', () => {
    expect(normalizeUrl('https://example.com/page#section2')).toBe('https://example.com/page');
  });

  it('removes trailing slash on non-root paths', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('sorts query parameters deterministically', () => {
    expect(normalizeUrl('https://example.com/search?b=2&a=1')).toBe('https://example.com/search?a=1&b=2');
  });

  it('strips common tracking parameters', () => {
    expect(
      normalizeUrl('https://example.com/article?utm_source=twitter&utm_medium=social&fbclid=abc&id=42')
    ).toBe('https://example.com/article?id=42');
  });

  it('keeps meaningful query parameters', () => {
    expect(normalizeUrl('https://example.com/search?q=java')).toBe('https://example.com/search?q=java');
    expect(normalizeUrl('https://example.com/search?q=spring')).toBe('https://example.com/search?q=spring');
  });

  it('canonicalizes YouTube watch URLs and drops playback timestamps', () => {
    expect(normalizeUrl('https://www.youtube.com/watch?v=abc123&t=120s')).toBe(
      'https://www.youtube.com/watch?v=abc123'
    );
    expect(normalizeUrl('https://youtu.be/abc123?t=840')).toBe('https://www.youtube.com/watch?v=abc123');
    expect(normalizeUrl('https://www.youtube.com/shorts/abc123')).toBe(
      'https://www.youtube.com/watch?v=abc123'
    );
  });

  it('lowercases hostname and collapses duplicate slashes', () => {
    expect(normalizeUrl('https://Example.COM//a//b')).toBe('https://example.com/a/b');
  });

  it('can leave tracking params when stripTracking is false', () => {
    expect(normalizeUrl('https://example.com/page?utm_source=x', false)).toBe(
      'https://example.com/page?utm_source=x'
    );
  });
});

describe('generateMemoryId', () => {
  it('produces a stable deterministic id for the same canonical URL', () => {
    const a = generateMemoryId('https://example.com/article?utm_source=twitter');
    const b = generateMemoryId('https://example.com/article?utm_source=facebook');
    const c = generateMemoryId('https://example.com/article/#section');
    const d = generateMemoryId('https://example.com/article/');

    expect(a).toMatch(/^mem_[0-9a-f]+$/);
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).toBe(d);
  });

  it('produces the same id for YouTube URL variants of the same video', () => {
    const watch = generateMemoryId('https://www.youtube.com/watch?v=xyz789&t=60s');
    const short = generateMemoryId('https://youtu.be/xyz789');
    expect(watch).toBe(short);
  });

  it('produces different ids for different pages', () => {
    expect(generateMemoryId('https://example.com/a')).not.toBe(generateMemoryId('https://example.com/b'));
  });
});
