import { describe, it, expect } from 'vitest';
import { RelevanceScorer } from '../src/core/relevance/scorer';

describe('RelevanceScorer', () => {
  it('calculates higher priority for title matches and engagement', () => {
    const keywords = ['Spring Boot', 'Redis'];
    const title = 'Spring Boot and Redis In-Depth Guide';
    const excerpt = 'Learn caching with Redis';
    const content = 'Redis key value store and Spring Boot container.';

    const result = RelevanceScorer.calculate(keywords, title, excerpt, content, 180);
    expect(result.score).toBeGreaterThan(70);
    expect(result.matchedKeywords).toContain('Spring Boot');
    expect(result.matchedKeywords).toContain('Redis');
  });

  it('clamps scores strictly between 0 and 100', () => {
    const keywords = ['Java', 'Spring', 'Boot', 'API', 'REST', 'Postgres', 'Redis'];
    const title = 'Java Spring Boot API REST Postgres Redis Guide';
    const excerpt = 'Java Spring Boot API REST Postgres Redis Guide';
    const content = 'Java Spring Boot API REST Postgres Redis Guide '.repeat(50);

    const result = RelevanceScorer.calculate(keywords, title, excerpt, content, 600);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('provides baseline score when no keywords are configured', () => {
    const result = RelevanceScorer.calculate([], 'General Page Title', 'Some description', 'Text content');
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(60);
  });
});
