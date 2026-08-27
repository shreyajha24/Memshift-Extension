import { describe, it, expect } from 'vitest';
import { SourceDetector, isSearchEngineUrl, isCapturableContentUrl } from '../src/content/source-detector';

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

  it('detects Reddit and PDF pages without changing the source contract', () => {
    const reddit = SourceDetector.detect('https://www.reddit.com/r/typescript/comments/abc123/example_post/');
    expect(reddit.sourceType).toBe('generic');
    expect(reddit.platform).toBe('Reddit');
    expect(reddit.pageType).toBe('reddit');

    const pdf = SourceDetector.detect('https://example.com/papers/design.pdf');
    expect(pdf.sourceType).toBe('generic');
    expect(pdf.platform).toBe('PDF');
    expect(pdf.pageType).toBe('pdf');
  });

  it('does not classify arbitrary q parameters as search results', () => {
    const article = SourceDetector.detect('https://example.com/article?q=redis');
    expect(article.pageType).toBe('article');

    const search = SourceDetector.detect('https://www.google.com/search?q=redis');
    expect(search.pageType).toBe('search-results');
  });
});

describe('Search Engine Exclusion', () => {
  it.each([
    'https://www.google.com/search?q=what+is+caching',
    'https://google.com/search?q=typescript',
    'https://google.co.in/search?q=react',
    'https://www.bing.com/search?q=nodejs',
    'https://duckduckgo.com/?q=memshift',
    'https://search.yahoo.com/search?p=vitest',
    'https://www.baidu.com/s?wd=vite',
    'https://yandex.com/search/?text=javascript',
    'https://search.brave.com/search?q=security',
    'https://www.ecosia.org/search?q=trees',
    'https://kagi.com/search?q=fast',
    'https://www.startpage.com/sp/search?query=privacy',
    'https://example.com/search?q=query',
    'https://example.com/results?query=test',
  ])('identifies search engine/result URLs and rejects them from capture: %s', (url) => {
    const urlObj = new URL(url);
    expect(isSearchEngineUrl(urlObj)).toBe(true);
    expect(isCapturableContentUrl(url)).toBe(false);
  });

  it.each([
    'https://cloud.google.com/docs/caching',
    'https://developers.google.com/web/fundamentals',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://github.com/facebook/react',
    'https://medium.com/@author/distributed-caching',
    'https://dev.to/engineer/postgres-indexing',
    'https://developer.mozilla.org/en-US/docs/Web/API',
    'https://example.com/blog/scaling-architecture',
    'https://example.com/article?q=redis',
  ])('permits normal websites, articles, docs, and YouTube videos: %s', (url) => {
    const urlObj = new URL(url);
    expect(isSearchEngineUrl(urlObj)).toBe(false);
    expect(isCapturableContentUrl(url)).toBe(true);
  });
});

