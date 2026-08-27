#!/usr/bin/env node
/**
 * Validate dist/ as the single Chrome Web Store extension package root.
 */
import {
  DIST,
  FORBIDDEN_BASENAMES,
  SECRET_PATTERNS,
  readPackageJson,
  relativePosix,
  walkFiles,
} from './release-lib.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function addManifestPath(referenced, path) {
  if (typeof path === 'string' && path.length > 0) referenced.add(path);
}

function collectIcons(referenced, icons) {
  if (!icons) return;
  if (typeof icons === 'string') {
    referenced.add(icons);
    return;
  }
  for (const value of Object.values(icons)) addManifestPath(referenced, value);
}

if (!existsSync(DIST)) {
  fail('dist/ is missing. Run npm run build first.');
  printAndExit([]);
}

const files = walkFiles(DIST);
const distManifests = files.filter((file) => basename(file) === 'manifest.json');
if (distManifests.length !== 1 || relativePosix(DIST, distManifests[0]) !== 'manifest.json') {
  fail(`dist/ must contain exactly one root manifest.json; found ${distManifests.map((file) => relativePosix(DIST, file)).join(', ') || 'none'}`);
}

const manifestPath = join(DIST, 'manifest.json');
let manifest = null;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (err) {
  fail(`manifest.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  printAndExit(files);
}

const pkg = readPackageJson();
if (manifest.manifest_version !== 3) fail(`manifest_version must be 3 (got ${manifest.manifest_version})`);
if (!manifest.name || typeof manifest.name !== 'string') fail('manifest.name missing');
if (!manifest.version || typeof manifest.version !== 'string') fail('manifest.version missing');
if (manifest.version !== pkg.version) fail(`manifest.version (${manifest.version}) must match package.json version (${pkg.version})`);
if (!manifest.description || typeof manifest.description !== 'string') fail('manifest.description missing');
if (!manifest.icons || typeof manifest.icons !== 'object') fail('manifest.icons missing');
if (!manifest.action || typeof manifest.action !== 'object') fail('manifest.action missing');
if (!manifest.background?.service_worker) fail('manifest.background.service_worker missing');
if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) fail('manifest.content_scripts missing');
if (!Array.isArray(manifest.permissions)) fail('manifest.permissions missing');
if (!Array.isArray(manifest.host_permissions)) fail('manifest.host_permissions missing');
if (!Object.prototype.hasOwnProperty.call(manifest, 'web_accessible_resources')) {
  warn('manifest.web_accessible_resources is absent; no web-accessible files are declared.');
}

if (manifest.browser_action) fail('Manifest V2 browser_action is not allowed in MV3');
if (manifest.page_action) fail('Manifest V2 page_action is not allowed in MV3');
if (manifest.background?.scripts) fail('Manifest V2 background.scripts is not allowed for Chrome MV3');
if (manifest.background?.persistent) fail('Manifest V2 background.persistent is not allowed in MV3');
if (manifest.browser_specific_settings) fail('Firefox browser_specific_settings must not be present in Chrome package');

const disallowedPermissions = ['history', 'bookmarks', 'cookies', 'webNavigation', 'management', 'downloads', 'tabs'];
for (const permission of disallowedPermissions) {
  if (manifest.permissions?.includes(permission)) fail(`Unnecessary permission requested: ${permission}`);
}

const referenced = new Set();
addManifestPath(referenced, manifest.action?.default_popup);
addManifestPath(referenced, manifest.background?.service_worker);
for (const script of manifest.background?.scripts || []) addManifestPath(referenced, script);
for (const contentScript of manifest.content_scripts || []) {
  for (const js of contentScript.js || []) addManifestPath(referenced, js);
  for (const css of contentScript.css || []) addManifestPath(referenced, css);
}
for (const resource of manifest.web_accessible_resources || []) {
  for (const path of resource.resources || []) addManifestPath(referenced, path);
}
addManifestPath(referenced, manifest.options_page);
addManifestPath(referenced, manifest.options_ui?.page);
collectIcons(referenced, manifest.icons);
collectIcons(referenced, manifest.action?.default_icon);

for (const rel of referenced) {
  if (!existsSync(join(DIST, rel))) fail(`Manifest path does not resolve: ${rel}`);
}

for (const rel of ['public', 'release', 'chrome', 'edge', 'firefox']) {
  if (existsSync(join(DIST, rel))) fail(`Forbidden directory in dist/: ${rel}`);
}

for (const file of files) {
  const rel = relativePosix(DIST, file);
  const base = basename(file);

  if (FORBIDDEN_BASENAMES.has(base) || base.startsWith('.env')) fail(`Forbidden file in dist/: ${rel}`);
  if (rel.includes('node_modules') || rel.includes('.git/') || rel.endsWith('.map')) fail(`Forbidden path in dist/: ${rel}`);
  if (/\.(ts|tsx|jsx)$/.test(rel) || rel.includes('/tests/') || rel.endsWith('vitest.config.ts')) fail(`Development source in dist/: ${rel}`);

  if (/\.(js|json|html|css|txt|md|map)$/i.test(base)) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) fail(`Possible privileged secret matched in ${rel} (${pattern})`);
    }
    if (/localhost|127\.0\.0\.1/i.test(text)) fail(`Local development URL found in ${rel}`);
    if (/\bpassword\b/i.test(text)) warn(`String "password" found in ${rel}; verify this is not a credential.`);
    if (/\bsecret\b/i.test(text)) warn(`String "secret" found in ${rel}; verify this is not a credential.`);
  }
}

const contentJsPath = join(DIST, 'content.js');
if (!existsSync(contentJsPath)) {
  fail('content.js missing');
} else {
  const contentJs = readFileSync(contentJsPath, 'utf8');
  if (/^\s*import\s+/m.test(contentJs) || /^\s*export\s+/m.test(contentJs)) {
    fail('content.js must be a classic IIFE bundle (no top-level import/export)');
  }
}

printAndExit(files);

function printAndExit(filesForCount) {
  for (const message of warnings) console.warn(`Warning: ${message}`);
  if (errors.length) {
    console.error(`Chrome build validation failed (${errors.length} error(s)):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`Chrome build validation passed (${filesForCount.length} files in dist/)`);
}
