import { describe, it, expect } from 'vitest';
import { SourceDetector } from '../src/content/source-detector';

describe('SourceDetector', () => {
  it('detects YouTube watch URLs correctly', () => {
    const result = SourceDetector.detect('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.sourceType).toBe('youtube');
    expect(result.platform).toBe('YouTube');
    expect(result.isSpecificExtractorAvailable).toBe(true);
  });

  it('detects YouTube short URLs correctly', () => {
    const result = SourceDetector.detect('https://youtu.be/dQw4w9WgXcQ');
    expect(result.sourceType).toBe('youtube');
    expect(result.platform).toBe('YouTube');
  });

  it('detects YouTube Shorts correctly', () => {
    const result = SourceDetector.detect('https://www.youtube.com/shorts/abc123xyz');
    expect(result.sourceType).toBe('youtube');
    expect(result.platform).toBe('YouTube');
  });

  it('detects GitHub repository URLs', () => {
    const result = SourceDetector.detect('https://github.com/facebook/react');
    expect(result.sourceType).toBe('github');
    expect(result.platform).toBe('GitHub');
  });

  it('detects Documentation websites', () => {
    const res1 = SourceDetector.detect('https://docs.spring.io/spring-boot/docs/current/reference/html/');
    expect(res1.sourceType).toBe('documentation');
    expect(res1.platform).toBe('Docs');

    const res2 = SourceDetector.detect('https://developer.mozilla.org/en-US/docs/Web/API');
    expect(res2.sourceType).toBe('documentation');
    expect(res2.platform).toBe('Docs');
  });

  it('detects Tech blog platforms', () => {
    const resMedium = SourceDetector.detect('https://medium.com/@author/distributed-caching');
    expect(resMedium.sourceType).toBe('article');
    expect(resMedium.platform).toBe('Medium');

    const resDevTo = SourceDetector.detect('https://dev.to/engineer/postgres-indexing-patterns');
    expect(resDevTo.sourceType).toBe('article');
    expect(resDevTo.platform).toBe('Dev.to');
  });

  it('falls back to generic article for regular domains', () => {
    const result = SourceDetector.detect('https://example.com/blog/scaling-architecture');
    expect(result.sourceType).toBe('article');
    expect(result.platform).toBe('Web');
  });
});
