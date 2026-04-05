// Run: node scripts/generate-icons.js
// Generates PWA icons as solid-color PNGs using pure Node.js (no external deps)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = -1;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function createSimplePNG(width, height, bgR, bgG, bgB, fgR, fgG, fgB) {
  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type RGB
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const ihdrChunkType = Buffer.from('IHDR');
  const ihdrCRC = crc32(Buffer.concat([ihdrChunkType, ihdrData]));
  const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13, 0);
  const ihdrCRCBuf = Buffer.alloc(4); ihdrCRCBuf.writeUInt32BE(ihdrCRC, 0);
  const ihdr = Buffer.concat([ihdrLen, ihdrChunkType, ihdrData, ihdrCRCBuf]);

  // Build pixel data with a simple house silhouette
  const rowSize = width * 3 + 1;
  const raw = Buffer.alloc(rowSize * height);

  const s = width;
  // Pre-compute house geometry
  const roofTopX = Math.floor(s * 0.5);
  const roofTopY = Math.floor(s * 0.15);
  const roofLeftX = Math.floor(s * 0.15);
  const roofRightX = Math.floor(s * 0.85);
  const roofBottomY = Math.floor(s * 0.5);
  const bodyX1 = Math.floor(s * 0.22);
  const bodyX2 = Math.floor(s * 0.78);
  const bodyY1 = Math.floor(s * 0.47);
  const bodyY2 = Math.floor(s * 0.85);
  const doorX1 = Math.floor(s * 0.41);
  const doorX2 = Math.floor(s * 0.59);
  const doorY1 = Math.floor(s * 0.62);
  const doorY2 = Math.floor(s * 0.85);

  function isInRoofTriangle(x, y) {
    if (y < roofTopY || y > roofBottomY) return false;
    // Interpolate left and right edge at this y
    const t = (y - roofTopY) / (roofBottomY - roofTopY);
    const leftEdge = roofTopX + t * (roofLeftX - roofTopX);
    const rightEdge = roofTopX + t * (roofRightX - roofTopX);
    return x >= leftEdge && x <= rightEdge;
  }

  function isInBody(x, y) {
    return x >= bodyX1 && x <= bodyX2 && y >= bodyY1 && y <= bodyY2;
  }

  function isInDoor(x, y) {
    return x >= doorX1 && x <= doorX2 && y >= doorY1 && y <= doorY2;
  }

  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3;
      const inHouse = (isInRoofTriangle(x, y) || isInBody(x, y)) && !isInDoor(x, y);
      if (inHouse) {
        raw[offset] = fgR; raw[offset + 1] = fgG; raw[offset + 2] = fgB;
      } else {
        raw[offset] = bgR; raw[offset + 1] = bgG; raw[offset + 2] = bgB;
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunkType = Buffer.from('IDAT');
  const idatCRC = crc32(Buffer.concat([idatChunkType, compressed]));
  const idatLen = Buffer.alloc(4); idatLen.writeUInt32BE(compressed.length, 0);
  const idatCRCBuf = Buffer.alloc(4); idatCRCBuf.writeUInt32BE(idatCRC, 0);
  const idat = Buffer.concat([idatLen, idatChunkType, compressed, idatCRCBuf]);

  // IEND
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const dir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });

[192, 512].forEach(size => {
  // bg: #8B5E3C (139, 94, 60), fg: #FAF7F2 (250, 247, 242)
  const png = createSimplePNG(size, size, 139, 94, 60, 250, 247, 242);
  const filePath = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath}`);
});
