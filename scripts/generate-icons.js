import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// Simple PNG generator without external dependencies
function createSimplePNG(size, color = [255, 0, 0]) {
  const width = size;
  const height = size;
  
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createPNGChunk('IHDR', ihdrData);
  
  // Create image data - simple solid color
  const bytesPerPixel = 3;
  const rowSize = width * bytesPerPixel + 1; // +1 for filter byte
  const imageData = Buffer.alloc(height * rowSize);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    imageData[rowOffset] = 0; // filter byte (no filter)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      imageData[pixelOffset] = color[0];     // R
      imageData[pixelOffset + 1] = color[1]; // G
      imageData[pixelOffset + 2] = color[2]; // B
    }
  }
  
  // Simple deflate compression (minimal implementation)
  const compressed = deflateSimple(imageData);
  const idatChunk = createPNGChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createPNGChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = calculateCRC32(typeBuffer, data);
  
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function calculateCRC32(type, data) {
  const crcTable = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  
  let crc = 0xFFFFFFFF;
  const buffer = Buffer.concat([type, data]);
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Very simple deflate - just store uncompressed for small images
function deflateSimple(data) {
  // For small icons, we can use a minimal deflate format
  // This is a simplified version that works for small images
  const zlibHeader = Buffer.from([0x78, 0x9C]); // zlib header (deflate, default compression)
  
  // Create a simple stored block (no compression for simplicity)
  // This is a minimal valid deflate stream
  const blockHeader = Buffer.from([0x01]); // final block, stored (no compression)
  const len = data.length;
  const nlen = (~len) & 0xFFFF;
  
  const lenBytes = Buffer.alloc(4);
  lenBytes.writeUInt16LE(len, 0);
  lenBytes.writeUInt16LE(nlen, 2);
  
  // Calculate adler32 checksum
  const adler32 = calculateAdler32(data);
  const adler32Buffer = Buffer.alloc(4);
  adler32Buffer.writeUInt32BE(adler32, 0);
  
  return Buffer.concat([zlibHeader, blockHeader, lenBytes, data, adler32Buffer]);
}

function calculateAdler32(data) {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0; // Ensure unsigned
}

// Generate icons
const iconsDir = 'public/icons';
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Create simple red square icons (YouTube-like color: #FF0000)
const sizes = [
  { size: 16, file: 'icon16.png' },
  { size: 48, file: 'icon48.png' },
  { size: 128, file: 'icon128.png' },
];

sizes.forEach(({ size, file }) => {
  const pngData = createSimplePNG(size, [255, 0, 0]); // YouTube red
  const filePath = join(iconsDir, file);
  writeFileSync(filePath, pngData);
  console.log(`✓ Generated ${file} (${size}x${size})`);
});

console.log('\n✅ Icons generated successfully!');
