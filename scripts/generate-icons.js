const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNG(size) {
  const width = size;
  const height = size;

  // Raw image RGBA
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((1 + rowBytes) * height);

  const radius = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowBytes);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Emerald gradient circle (#10b981 to #047857)
        const t = (x + y) / (width + height);
        const r = Math.round(16 * (1 - t) + 4 * t);
        const g = Math.round(185 * (1 - t) + 120 * t);
        const b = Math.round(129 * (1 - t) + 87 * t);

        // Anti-aliasing border
        let a = 255;
        if (dist > radius - 1) {
          a = Math.round(255 * (radius - dist));
        }

        // Draw simple inner letter 'S' if size >= 32
        const isS = drawS(x / size, y / size);
        if (isS && size >= 32) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = a;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = a;
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  function drawS(u, v) {
    // Relative coordinates [0, 1]
    if (u < 0.28 || u > 0.72 || v < 0.22 || v > 0.78) return false;
    // Top bar
    if (v >= 0.24 && v <= 0.34 && u >= 0.32 && u <= 0.68) return true;
    // Mid bar
    if (v >= 0.45 && v <= 0.55 && u >= 0.32 && u <= 0.68) return true;
    // Bot bar
    if (v >= 0.66 && v <= 0.76 && u >= 0.32 && u <= 0.68) return true;
    // Top-left vertical
    if (v >= 0.28 && v <= 0.50 && u >= 0.30 && u <= 0.42) return true;
    // Bot-right vertical
    if (v >= 0.50 && v <= 0.72 && u >= 0.58 && u <= 0.70) return true;
    return false;
  }

  // Deflate IDAT
  const compressed = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    typeBuf.copy(buf, 4);
    data.copy(buf, 8);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const targets = [
  'C:\\Users\\vinic\\Desktop\\sofia-whatsapp-web',
  path.join(__dirname, '..', 'extensions', 'sofia-whatsapp-web'),
  path.join(__dirname, '..', 'public', 'sofia-extension')
];

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  targets.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, `icon${size}.png`), png);
      console.log(`Saved icon${size}.png to ${dir}`);
    }
  });
});
console.log('All icons generated successfully!');
