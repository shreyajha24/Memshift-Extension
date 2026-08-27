import { describe, expect, it } from 'vitest';
import { normalizeContentBlocks } from '../src/content/extraction/content-normalizer';

describe('content normalizer', () => {
  it('removes duplicate blocks and obvious UI noise while preserving structure', () => {
    const normalized = normalizeContentBlocks([
      { text: 'Open menu', kind: 'paragraph' },
      { text: 'Architecture Notes', kind: 'heading' },
      { text: 'Redis is used as a shared cache for request fanout.', kind: 'paragraph' },
      { text: 'Redis is used as a shared cache for request fanout.', kind: 'paragraph' },
      { text: 'Cache invalidation needs explicit ownership boundaries.', kind: 'list' },
    ]);

    expect(normalized).toContain('Architecture Notes');
    expect(normalized).toContain('- Cache invalidation needs explicit ownership boundaries.');
    expect(normalized.match(/Redis is used/g)).toHaveLength(1);
    expect(normalized).not.toContain('Open menu');
  });

  it('preserves meaningful code blocks that do not read like prose', () => {
    const normalized = normalizeContentBlocks([
      {
        text: 'const ttl = 60;\ncache.set(key, value, ttl);',
        kind: 'code',
      },
    ]);

    expect(normalized).toContain('```');
    expect(normalized).toContain('cache.set(key, value, ttl);');
  });
});
