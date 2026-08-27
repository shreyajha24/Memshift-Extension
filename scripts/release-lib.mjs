/**
 * Shared helpers for MemShift Chrome Web Store packaging.
 */
import { readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
export const DIST = join(ROOT, 'dist');
export const CHROME_ZIP = join(ROOT, 'memshift-chrome.zip');

export function readPackageJson() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
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
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /SUPABASE_SERVICE_ROLE/i,
  /service_role/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
  /sk-[a-zA-Z0-9]{20,}/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
];

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

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, filenameBuf, compressedData);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(filenameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(currentOffset, 42);

    centralChunks.push(centralHeader, filenameBuf);
    currentOffset += 30 + filenameBuf.length + compressedSize;
  }

  const centralDirBuffer = Buffer.concat(centralChunks);
  const cdOffset = currentOffset;
  const cdSize = centralDirBuffer.length;
  const numEntries = files.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(numEntries, 8);
  eocd.writeUInt16LE(numEntries, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  writeFileSync(outZipPath, Buffer.concat([...localChunks, centralDirBuffer, eocd]));
}

export function listZipEntries(zipPath) {
  const zipBuffer = readFileSync(zipPath);
  const entries = [];
  let idx = 0;
  while (idx < zipBuffer.length - 4) {
    if (zipBuffer.readUInt32LE(idx) === 0x02014b50) {
      const fnLen = zipBuffer.readUInt16LE(idx + 28);
      const extraLen = zipBuffer.readUInt16LE(idx + 30);
      const commentLen = zipBuffer.readUInt16LE(idx + 32);
      entries.push(zipBuffer.toString('utf8', idx + 46, idx + 46 + fnLen));
      idx += 46 + fnLen + extraLen + commentLen;
    } else {
      idx++;
    }
  }
  return entries;
}
