import { readFileSync, existsSync } from 'fs';
import { describe, it, expect } from 'vitest';

describe('content script build', () => {
  it('dist/content.js exists and contains no top-level import/export', () => {
    const path = 'dist/content.js';
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf8');
    const importRe = /^\s*import\s+/m;
    const exportRe = /^\s*export\s+/m;
    expect(importRe.test(content)).toBe(false);
    expect(exportRe.test(content)).toBe(false);
  });
});
