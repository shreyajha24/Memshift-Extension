#!/usr/bin/env node
/**
 * Build + validate + zip a store-ready package.
 * Usage: node scripts/package-extension.mjs <chrome|edge|firefox>
 */
import { RELEASE, ROOT, TARGETS, readPackageJson } from './release-lib.mjs';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';

const target = process.argv[2];
if (!target || !TARGETS.includes(target)) {
  console.error(`Usage: node scripts/package-extension.mjs <${TARGETS.join('|')}>`);
  process.exit(1);
}

const pkg = readPackageJson();
const version = pkg.version;
const releaseDir = join(RELEASE, target);
const zipName = `memshift-${target}-v${version}.zip`;
const zipPath = join(RELEASE, zipName);

console.log(`→ Building ${target}…`);
const build = spawnSync('node', [join(ROOT, 'scripts', 'build-extension.mjs'), target], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`→ Validating ${target}…`);
const validate = spawnSync('node', [join(ROOT, 'scripts', 'validate-release.mjs'), target], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
});
if (validate.status !== 0) process.exit(validate.status ?? 1);

if (existsSync(zipPath)) rmSync(zipPath);

console.log(`→ Creating ${zipName}…`);
zipDirectory(releaseDir, zipPath);

if (!existsSync(zipPath)) {
  console.error('ZIP was not created');
  process.exit(1);
}

console.log(`✓ Packaged ${zipPath}`);
console.log('  Upload this ZIP via the browser store developer dashboard (manual submission).');

/**
 * Cross-platform zip of directory contents (not the parent folder name).
 * Uses PowerShell Compress-Archive on Windows and `zip` on Unix.
 */
function zipDirectory(sourceDir, outZip) {
  mkdirSync(dirname(outZip), { recursive: true });

  if (platform() === 'win32') {
    const ps = [
      'Compress-Archive',
      '-Path',
      `"${sourceDir}\\*"`,
      '-DestinationPath',
      `"${outZip}"`,
      '-Force',
    ].join(' ');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], {
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      throw new Error('Compress-Archive failed');
    }
    return;
  }

  const result = spawnSync('zip', ['-r', '-q', outZip, '.'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('zip command failed — install zip or package on Windows');
  }
}
