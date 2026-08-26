import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to write CRC32 checksum for PNG chunks
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

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;

  // RGBA raw scanlines: each line starts with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  // Background: Deep dark #0B0F19 with a rounded border & cyan accent
  // Primary brand colors: #0ea5e9 (cyan) to #10b981 (emerald)
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      const nx = (x / (width - 1)) * 2 - 1; // -1 to 1
      const ny = (y / (height - 1)) * 2 - 1; // -1 to 1
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Rounded squircle icon background
      if (Math.abs(nx) > 0.88 || Math.abs(ny) > 0.88) {
        // Corner radius check
        const cornerX = Math.max(0, Math.abs(nx) - 0.7) / 0.3;
        const cornerY = Math.max(0, Math.abs(ny) - 0.7) / 0.3;
        if (cornerX * cornerX + cornerY * cornerY > 1.0) {
          // Transparent outside squircle
          rawData[pxOffset] = 0;
          rawData[pxOffset + 1] = 0;
          rawData[pxOffset + 2] = 0;
          rawData[pxOffset + 3] = 0;
          continue;
        }
      }

      // Icon interior: dark slate gradient #0F172A to #1E293B
      let r = Math.round(15 + 15 * (y / height));
      let g = Math.round(23 + 18 * (y / height));
      let b = Math.round(42 + 20 * (y / height));

      // Draw stylized 'M' symbol inside
      const mx = x / width; // 0 to 1
      const my = y / height; // 0 to 1

      // Central glyph geometry: an 'M' bridge
      const inMLeftLeg = mx >= 0.22 && mx <= 0.36 && my >= 0.25 && my <= 0.75;
      const inMRightLeg = mx >= 0.64 && mx <= 0.78 && my >= 0.25 && my <= 0.75;
      const inMLeftDiag = mx >= 0.32 && mx <= 0.52 && Math.abs((my - 0.25) - (mx - 0.32) * 1.5) < 0.12 && my <= 0.65;
      const inMRightDiag = mx >= 0.48 && mx <= 0.68 && Math.abs((my - 0.25) - (0.68 - mx) * 1.5) < 0.12 && my <= 0.65;

      if (inMLeftLeg || inMRightLeg || inMLeftDiag || inMRightDiag) {
        // Cyan-to-Emerald glowing gradient
        r = Math.round(14 + 2 * mx);
        g = Math.round(165 + 40 * mx);
        b = Math.round(233 - 100 * mx);
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per sample
  ihdr.writeUInt8(6, 9); // Color type 6 (RGBA)
  ihdr.writeUInt8(0, 10); // Compression method 0
  ihdr.writeUInt8(0, 11); // Filter method 0
  ihdr.writeUInt8(0, 12); // Interlace method 0

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const pngBuf = generatePng(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${filePath} (${size}x${size}, ${pngBuf.length} bytes)`);
}

console.log('All MemShift extension icons successfully generated.');
