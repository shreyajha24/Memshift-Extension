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

import zlib from 'node:zlib';

function crc32(buf) {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function dateToDosDateTime(d) {
  const year = d.getFullYear();
  const dosDate = ((Math.max(1980, year) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  return { dosDate, dosTime };
}

/**
 * Creates a clean, cross-platform ZIP file from the contents of a directory.
 * Ensures POSIX forward slashes ('/') in all internal archive paths for full
 * Chrome Web Store and cross-platform compatibility.
 */
export function createZipFromDirectory(sourceDir, outZipPath) {
  mkdirSync(dirname(outZipPath), { recursive: true });

  const files = walkFiles(sourceDir);
  const localChunks = [];
  const centralChunks = [];
  let currentOffset = 0;
  const now = new Date();
  const { dosDate, dosTime } = dateToDosDateTime(now);

  for (const file of files) {
    const relPosix = relativePosix(sourceDir, file);
    const uncompressedData = readFileSync(file);
    const uncompressedSize = uncompressedData.length;
    const crc = crc32(uncompressedData);
    const compressedData = zlib.deflateRawSync(uncompressedData, { level: 9 });
    const compressedSize = compressedData.length;
    const filenameBuf = Buffer.from(relPosix, 'utf8');

    // Local file header (30 bytes + filename length)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);          // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6);      // Flags (UTF-8 filename)
    localHeader.writeUInt16LE(8, 8);           // Compression method (Deflate)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);          // Extra field length

    localChunks.push(localHeader, filenameBuf, compressedData);

    // Central directory header (46 bytes + filename length)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0x0800, 8);     // Flags (UTF-8)
    centralHeader.writeUInt16LE(8, 10);         // Compression method
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(filenameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);         // Extra field length
    centralHeader.writeUInt16LE(0, 32);         // File comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk number start
    centralHeader.writeUInt16LE(0, 36);         // Internal attributes
    centralHeader.writeUInt32LE(0, 38);         // External attributes
    centralHeader.writeUInt32LE(currentOffset, 42); // Relative offset of local header

    centralChunks.push(centralHeader, filenameBuf);

    currentOffset += 30 + filenameBuf.length + compressedSize;
  }

  const centralDirBuffer = Buffer.concat(centralChunks);
  const cdOffset = currentOffset;
  const cdSize = centralDirBuffer.length;
  const numEntries = files.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0, 4);          // Disk number
  eocd.writeUInt16LE(0, 6);          // Disk with CD
  eocd.writeUInt16LE(numEntries, 8); // Entries on this disk
  eocd.writeUInt16LE(numEntries, 10);// Total entries
  eocd.writeUInt32LE(cdSize, 12);    // CD size
  eocd.writeUInt32LE(cdOffset, 16);  // CD offset
  eocd.writeUInt16LE(0, 20);         // Comment length

  const finalZip = Buffer.concat([...localChunks, centralDirBuffer, eocd]);
  writeFileSync(outZipPath, finalZip);
}
