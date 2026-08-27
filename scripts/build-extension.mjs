#!/usr/bin/env node
/**
 * Build a browser-specific release directory from the shared Vite dist output.
 * Usage: node scripts/build-extension.mjs <chrome|edge|firefox> [--skip-compile]
 */
import {
  ROOT,
  RELEASE,
  TARGETS,
  buildManifest,
  copyDistTo,
  ensureCleanDir,
  readPackageJson,
  runNpmBuild,
  writeManifest,
} from './release-lib.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const skipCompile = args.includes('--skip-compile');
const targetArg = args.find((a) => !a.startsWith('--'));

if (!targetArg || !TARGETS.includes(targetArg)) {
  console.error(`Usage: node scripts/build-extension.mjs <${TARGETS.join('|')}> [--skip-compile]`);
  process.exit(1);
}

const target = targetArg;
const pkg = readPackageJson();

if (!skipCompile) {
  console.log('→ Compiling shared extension (npm run build)…');
  runNpmBuild();
}

const outDir = join(RELEASE, target);
console.log(`→ Assembling ${target} package at release/${target}/…`);
ensureCleanDir(outDir);
copyDistTo(outDir);

const manifest = buildManifest(target, pkg.version);
writeManifest(outDir, manifest);

// Sync public/ and dist manifests for local load-unpacked workflows.
writeManifest(join(ROOT, 'public'), buildManifest('chrome', pkg.version));
writeManifest(join(ROOT, 'dist'), buildManifest('chrome', pkg.version));

writeFileSync(
  join(outDir, 'BUILD_INFO.json'),
  `${JSON.stringify(
    {
      target,
      version: pkg.version,
      builtAt: new Date().toISOString(),
      note:
        target === 'firefox'
          ? 'Firefox package is prepared for architecture compatibility. Runtime validation is still required before claiming Firefox support.'
          : 'Chromium package for store/manual install. Runtime browser validation is still required.',
    },
    null,
    2
  )}\n`,
  'utf8'
);

console.log(`✓ Built MemShift ${pkg.version} for ${target} → release/${target}/`);
