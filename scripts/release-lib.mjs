/**
 * Shared helpers for MemShift extension packaging.
 * Version is always sourced from package.json — never hard-coded here.
 */
import { readFileSync, existsSync, mkdirSync, rmSync, cpSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
export const DIST = join(ROOT, 'dist');
export const RELEASE = join(ROOT, 'release');
export const MANIFESTS = join(ROOT, 'config', 'manifests');

export const TARGETS = ['chrome', 'edge', 'firefox'];
/** @typedef {'chrome' | 'edge' | 'firefox'} Target */

export function readPackageJson() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
}

export function loadManifestTemplate(target) {
  const path = join(MANIFESTS, `${target}.json`);
  if (!existsSync(path)) {
    throw new Error(`Missing manifest template: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function buildManifest(target, version) {
  const manifest = loadManifestTemplate(target);
  manifest.version = version;
  return manifest;
}

export function writeManifest(targetDir, manifest) {
  writeFileSync(join(targetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function ensureCleanDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

export function copyDistTo(targetDir) {
  if (!existsSync(DIST)) {
    throw new Error('dist/ is missing. Run the Vite build first.');
  }
  cpSync(DIST, targetDir, { recursive: true });
}

export function runNpmBuild() {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error('npm run build failed');
  }
}

export function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

export function relativePosix(from, to) {
  return relative(from, to).split('\\').join('/');
}

/** Patterns that must never appear in a store package. */
export const FORBIDDEN_PATH_FRAGMENTS = [
  'node_modules',
  '.env',
  '.git',
  '.idea',
  '.vscode',
  'coverage',
];

export const FORBIDDEN_BASENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.DS_Store',
  'Thumbs.db',
  'package-lock.json',
  'tsconfig.json',
]);

export const SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
  /sk-[a-zA-Z0-9]{20,}/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
];
