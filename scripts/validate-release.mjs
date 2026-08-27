#!/usr/bin/env node
/**
 * Validate a release/<target> directory before packaging.
 * Usage: node scripts/validate-release.mjs <chrome|edge|firefox>
 */
import {
  FORBIDDEN_BASENAMES,
  RELEASE,
  SECRET_PATTERNS,
  TARGETS,
  relativePosix,
  walkFiles,
} from './release-lib.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const target = process.argv[2];
if (!target || !TARGETS.includes(target)) {
  console.error(`Usage: node scripts/validate-release.mjs <${TARGETS.join('|')}>`);
  process.exit(1);
}

const dir = join(RELEASE, target);
const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

if (!existsSync(dir)) {
  fail(`Missing release directory: ${dir}`);
  printAndExit();
}

const manifestPath = join(dir, 'manifest.json');
if (!existsSync(manifestPath)) fail('manifest.json missing');

/** @type {any} */
let manifest = null;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (err) {
  fail(`manifest.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  printAndExit();
}

if (manifest.manifest_version !== 3) fail(`manifest_version must be 3 (got ${manifest.manifest_version})`);
if (!manifest.version || typeof manifest.version !== 'string') fail('manifest.version missing');
if (!Array.isArray(manifest.permissions) || !manifest.permissions.includes('storage')) {
  fail('manifest must include storage permission');
}

const disallowedPermissions = ['history', 'bookmarks', 'cookies', 'webNavigation', 'management', 'downloads', 'tabs'];
for (const p of disallowedPermissions) {
  if (manifest.permissions?.includes(p)) {
    fail(`Unnecessary permission requested: ${p}`);
  }
}

const requiredFiles = [
  'background.js',
  'content.js',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

const popup = manifest.action?.default_popup;
if (!popup) fail('action.default_popup missing');
else requiredFiles.push(popup);

const sw =
  manifest.background?.service_worker ||
  (Array.isArray(manifest.background?.scripts) ? manifest.background.scripts[0] : null);
if (!sw) fail('background service worker / scripts missing');

for (const rel of requiredFiles) {
  if (!existsSync(join(dir, rel))) fail(`Required file missing: ${rel}`);
}

// Resolve every path referenced by the manifest
const referenced = new Set();
if (popup) referenced.add(popup);
if (manifest.background?.service_worker) referenced.add(manifest.background.service_worker);
for (const s of manifest.background?.scripts || []) referenced.add(s);
for (const cs of manifest.content_scripts || []) {
  for (const js of cs.js || []) referenced.add(js);
  for (const css of cs.css || []) referenced.add(css);
}
const collectIcons = (icons) => {
  if (!icons) return;
  if (typeof icons === 'string') referenced.add(icons);
  else Object.values(icons).forEach((v) => referenced.add(v));
};
collectIcons(manifest.icons);
collectIcons(manifest.action?.default_icon);

for (const rel of referenced) {
  if (!existsSync(join(dir, rel))) fail(`Manifest path does not resolve: ${rel}`);
}

const files = walkFiles(dir);
for (const file of files) {
  const rel = relativePosix(dir, file);
  const base = basename(file);

  if (FORBIDDEN_BASENAMES.has(base) || base.startsWith('.env')) {
    fail(`Forbidden file packaged: ${rel}`);
  }
  if (rel.includes('node_modules') || rel.includes('.git/') || rel.endsWith('.map')) {
    fail(`Forbidden path packaged: ${rel}`);
  }
  // Block TypeScript sources accidentally copied into release (popup HTML lives under src/popup/)
  if (/\.(ts|tsx|jsx)$/.test(rel) || rel.includes('/tests/') || rel.endsWith('vitest.config.ts')) {
    fail(`Development source packaged: ${rel}`);
  }

  // Secret scan on text-ish files
  if (/\.(js|json|html|css|txt|md|map)$/i.test(base)) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        fail(`Possible secret matched in ${rel} (${pattern})`);
      }
    }
  }
}

// Content script must be classic/IIFE (no top-level import/export)
const contentJs = readFileSync(join(dir, 'content.js'), 'utf8');
if (/^\s*import\s+/m.test(contentJs) || /^\s*export\s+/m.test(contentJs)) {
  fail('content.js must be a classic IIFE bundle (no top-level import/export)');
}

if (target === 'firefox') {
  if (!manifest.browser_specific_settings?.gecko?.id) {
    fail('Firefox manifest requires browser_specific_settings.gecko.id');
  }
  warn('Firefox package validated structurally only — runtime testing has not been performed.');
}

if (target === 'chrome' || target === 'edge') {
  if (!manifest.background?.service_worker) {
    fail(`${target} manifest requires background.service_worker`);
  }
}

printAndExit();

function printAndExit() {
  for (const w of warnings) console.warn(`⚠ ${w}`);
  if (errors.length) {
    console.error(`\n✗ Release validation failed for ${target} (${errors.length} error(s)):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ Release validation passed for ${target} (${files.length} files)`);
  process.exit(0);
}
