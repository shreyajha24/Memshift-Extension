import { describe, it, expect } from 'vitest';
import { KeywordMatcher } from '../src/core/relevance/keyword-matcher';

describe('KeywordMatcher', () => {
  it('matches exact keywords deterministically in title', () => {
    const keywords = ['Spring Boot', 'Redis', 'PostgreSQL'];
    const title = 'Building High-Performance APIs with Spring Boot and Redis';
    const matches = KeywordMatcher.match(keywords, title, '', '');

    expect(matches.length).toBe(2);
    const matchedNames = matches.map((m) => m.keyword);
    expect(matchedNames).toContain('Spring Boot');
    expect(matchedNames).toContain('Redis');
    expect(matchedNames).not.toContain('PostgreSQL');
  });

  it('matches keywords across excerpt and body text', () => {
    const keywords = ['Architecture', 'Kubernetes', 'OAuth'];
    const excerpt = 'Deep dive into microservice Architecture.';
    const content = 'We configure OAuth authentication and JWT tokens.';

    const matches = KeywordMatcher.match(keywords, '', excerpt, content);
    expect(matches.length).toBe(2);

    const archMatch = matches.find((m) => m.keyword === 'Architecture');
    expect(archMatch?.inExcerpt).toBe(true);

    const oauthMatch = matches.find((m) => m.keyword === 'OAuth');
    expect(oauthMatch?.inContent).toBe(true);
  });

  it('handles empty keyword list gracefully', () => {
    const matches = KeywordMatcher.match([], 'Some Title', 'Some Excerpt', '');
    expect(matches).toEqual([]);
  });
});
