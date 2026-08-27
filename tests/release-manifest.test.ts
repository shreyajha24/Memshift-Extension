import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

describe('manifest templates', () => {
  it('public manifest is the canonical Chrome MV3 manifest', () => {
    const pkg = readJson('package.json');
    const publicManifest = readJson(join('public', 'manifest.json'));
    expect(publicManifest.manifest_version).toBe(3);
    expect(publicManifest.permissions).toEqual(['storage']);
    expect(publicManifest.permissions).not.toContain('tabs');
    expect(publicManifest.background).toMatchObject({ service_worker: 'background.js' });
    expect(publicManifest.host_permissions).toEqual(['http://*/*', 'https://*/*']);
    expect(publicManifest.version).toBe(pkg.version);
    expect(publicManifest.browser_specific_settings).toBeUndefined();
  });
});

describe('Chrome packaging scripts', () => {
  it('required Chrome packaging scripts exist', () => {
    for (const file of [
      'scripts/package-extension.mjs',
      'scripts/validate-chrome-build.mjs',
      'scripts/release-lib.mjs',
    ]) {
      expect(existsSync(file)).toBe(true);
    }
    expect(existsSync(join('config', 'manifests', 'edge.json'))).toBe(false);
    expect(existsSync(join('config', 'manifests', 'firefox.json'))).toBe(false);
  });

  it('verifies Chrome ZIP archive has exactly one root manifest and no duplicate manifests', () => {
    const zipPath = 'memshift-chrome.zip';
    if (!existsSync(zipPath)) return;

    const zipBuffer = readFileSync(zipPath);
    // Parse zip central directory entries
    const entries: string[] = [];
    let idx = 0;
    while (idx < zipBuffer.length - 4) {
      if (zipBuffer.readUInt32LE(idx) === 0x02014b50) {
        const fnLen = zipBuffer.readUInt16LE(idx + 28);
        const extraLen = zipBuffer.readUInt16LE(idx + 30);
        const commentLen = zipBuffer.readUInt16LE(idx + 32);
        const filename = zipBuffer.toString('utf8', idx + 46, idx + 46 + fnLen);
        entries.push(filename);
        idx += 46 + fnLen + extraLen + commentLen;
      } else {
        idx++;
      }
    }

    expect(entries.length).toBeGreaterThan(0);
    const manifests = entries.filter((e) => e === 'manifest.json' || e.endsWith('/manifest.json') || e.endsWith('\\manifest.json'));
    expect(manifests).toEqual(['manifest.json']);
    expect(entries).toContain('background.js');
    expect(entries).toContain('content.js');
    expect(entries).toContain('icons/icon-128.png');
    expect(entries.some((e) => e.startsWith('dist/') || e.startsWith('public/') || e.startsWith('release/'))).toBe(false);
    expect(entries.some((e) => e.startsWith('edge/') || e.startsWith('firefox/'))).toBe(false);
    expect(entries.some((e) => e.includes('.env') || e.includes('node_modules'))).toBe(false);
  });
});
