#!/usr/bin/env node
/**
 * Build, validate, and zip the private beta package.
 * The ZIP contains compiled dist/ contents under a MemShift/ folder.
 */
import { DIST, RELEASE_DIR, ROOT, createZipFromDirectory, listZipEntries, readPackageJson } from './release-lib.mjs';
import { existsSync, readFileSync, rmSync } from 'node:fs';
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

const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
const zipPath = join(RELEASE_DIR, `MemShift-Beta-v${manifest.version}.zip`);
if (existsSync(RELEASE_DIR)) rmSync(RELEASE_DIR, { recursive: true, force: true });

console.log(`Creating ${zipPath} from dist/ contents...`);
createZipFromDirectory(DIST, zipPath, 'MemShift');

if (!existsSync(zipPath)) {
  console.error('ZIP was not created');
  process.exit(1);
}

const entries = listZipEntries(zipPath);
const manifests = entries.filter((entry) => entry === 'manifest.json' || entry.endsWith('/manifest.json'));
const forbiddenEntries = entries.filter((entry) => /(^|\/)(dist|public|release|node_modules|\.git|src|tests)(\/|$)/.test(entry));

if (manifests.length !== 1 || manifests[0] !== 'MemShift/manifest.json') {
  console.error(`ZIP must contain exactly one MemShift/manifest.json; found: ${manifests.join(', ') || '(none)'}`);
  process.exit(1);
}

if (forbiddenEntries.length > 0) {
  console.error(`ZIP contains forbidden package entries: ${forbiddenEntries.join(', ')}`);
  process.exit(1);
}

const packageJson = readPackageJson();
if (manifest.version !== packageJson.version) {
  console.error(`Packaged manifest version ${manifest.version} does not match package.json version ${packageJson.version}`);
  process.exit(1);
}

console.log(`Packaged private beta ZIP: ${zipPath}`);
