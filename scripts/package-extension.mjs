#!/usr/bin/env node
/**
 * Build + validate + zip a store-ready package.
 * Usage: node scripts/package-extension.mjs <chrome|edge|firefox>
 */
import { RELEASE, ROOT, TARGETS, createZipFromDirectory, readPackageJson } from './release-lib.mjs';
import { existsSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const target = process.argv[2] || 'chrome';
if (!TARGETS.includes(target)) {
  console.error(`Usage: node scripts/package-extension.mjs [${TARGETS.join('|')}]`);
  process.exit(1);
}

const pkg = readPackageJson();
const version = pkg.version;
const releaseDir = join(RELEASE, target);
const zipName = `memshift-${target}-v${version}.zip`;
const zipPath = join(RELEASE, zipName);
const rootZipPath = join(ROOT, 'memshift-extension.zip');

console.log(`→ Building ${target}…`);
const build = spawnSync(process.execPath, [join(ROOT, 'scripts', 'build-extension.mjs'), target], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`→ Validating ${target}…`);
const validate = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-release.mjs'), target], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (validate.status !== 0) process.exit(validate.status ?? 1);

if (existsSync(zipPath)) rmSync(zipPath);
if (existsSync(rootZipPath) && target === 'chrome') rmSync(rootZipPath);

console.log(`→ Creating ${zipName}…`);
createZipFromDirectory(releaseDir, zipPath);

if (!existsSync(zipPath)) {
  console.error('ZIP was not created');
  process.exit(1);
}

if (target === 'chrome') {
  copyFileSync(zipPath, rootZipPath);
  console.log(`✓ Created Store ZIP: ${rootZipPath}`);
}

console.log(`✓ Packaged ${zipPath}`);
console.log('  Upload this ZIP via the browser store developer dashboard (manual submission).');

