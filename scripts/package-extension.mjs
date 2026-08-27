#!/usr/bin/env node
/**
 * Build + validate + zip the Chrome Web Store package.
 * The ZIP contains the contents of dist/, with manifest.json at archive root.
 */
import { CHROME_ZIP, DIST, ROOT, createZipFromDirectory, listZipEntries } from './release-lib.mjs';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const target = process.argv[2];
if (target && target !== 'chrome') {
  console.error('Only Chrome packaging is supported for this release. Usage: node scripts/package-extension.mjs');
  process.exit(1);
}

console.log('Building Chrome extension in dist/...');
const npmExecPath = process.env.npm_execpath;
const buildCommand = npmExecPath ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const buildArgs = npmExecPath ? [npmExecPath, 'run', 'build'] : ['run', 'build'];
const build = spawnSync(buildCommand, buildArgs, {
  cwd: ROOT,
  stdio: 'inherit',
});
if (build.error) {
  console.error(`Failed to run npm build: ${build.error.message}`);
}
if (build.status !== 0) process.exit(build.status ?? 1);

console.log('Validating dist/...');
const validate = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-chrome-build.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (validate.status !== 0) process.exit(validate.status ?? 1);

if (existsSync(CHROME_ZIP)) rmSync(CHROME_ZIP);

console.log('Creating memshift-chrome.zip from dist/ contents...');
createZipFromDirectory(DIST, CHROME_ZIP);

if (!existsSync(CHROME_ZIP)) {
  console.error('ZIP was not created');
  process.exit(1);
}

const entries = listZipEntries(CHROME_ZIP);
const manifests = entries.filter((entry) => entry === 'manifest.json' || entry.endsWith('/manifest.json'));
const forbiddenTopLevel = entries.filter((entry) => /^(dist|public|release|chrome|edge|firefox)\//.test(entry));

if (manifests.length !== 1 || manifests[0] !== 'manifest.json') {
  console.error(`ZIP must contain exactly one root manifest.json; found: ${manifests.join(', ') || '(none)'}`);
  process.exit(1);
}

if (forbiddenTopLevel.length > 0) {
  console.error(`ZIP contains forbidden top-level package directories: ${forbiddenTopLevel.join(', ')}`);
  process.exit(1);
}

console.log(`Packaged Chrome Web Store ZIP: ${CHROME_ZIP}`);
