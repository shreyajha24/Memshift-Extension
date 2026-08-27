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
});
