import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

describe('manifest templates', () => {
  it('chrome and edge manifests are MV3 with storage only (no tabs)', () => {
    for (const target of ['chrome', 'edge']) {
      const manifest = readJson(join('config', 'manifests', `${target}.json`));
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.permissions).toEqual(['storage']);
      expect(manifest.permissions).not.toContain('tabs');
      expect(manifest.background).toMatchObject({ service_worker: 'background.js' });
      expect(manifest.host_permissions).toEqual(['http://*/*', 'https://*/*']);
    }
  });

  it('firefox manifest includes gecko id and does not request tabs', () => {
    const manifest = readJson(join('config', 'manifests', 'firefox.json'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    const gecko = (manifest.browser_specific_settings as { gecko: { id: string } }).gecko;
    expect(gecko.id).toBe('memshift@memshift.app');
  });

  it('public manifest stays aligned with chrome permissions and package version', () => {
    const pkg = readJson('package.json');
    const publicManifest = readJson(join('public', 'manifest.json'));
    expect(publicManifest.manifest_version).toBe(3);
    expect(publicManifest.permissions).toEqual(['storage']);
    expect(publicManifest.version).toBe(pkg.version);
  });
});

describe('release packaging scripts', () => {
  it('required packaging scripts exist', () => {
    for (const file of [
      'scripts/build-extension.mjs',
      'scripts/package-extension.mjs',
      'scripts/validate-release.mjs',
      'scripts/release-lib.mjs',
      'config/manifests/chrome.json',
      'config/manifests/edge.json',
      'config/manifests/firefox.json',
    ]) {
      expect(existsSync(file)).toBe(true);
    }
  });

  it('verifies zip archive has exactly one root manifest and no duplicate manifests', () => {
    const zipPath = join('release', 'memshift-chrome-v1.0.0.zip');
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
    expect(entries.some((e) => e.includes('.env') || e.includes('node_modules'))).toBe(false);
  });
});
