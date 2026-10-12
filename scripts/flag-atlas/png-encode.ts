/**
 * Minimal deterministic PNG encoder (8-bit RGBA, non-interlaced) for the flag atlas.
 *
 * Deterministic by construction: no timestamps or text chunks, a fixed zlib level, and a
 * per-row filter picked by the classic minimum-sum-of-absolute-differences heuristic, so
 * the same pixels always produce the same bytes on the same Node/zlib.
 */
import { deflateSync } from 'node:zlib';

const CRC_TABLE_ = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }

  return table;
})();

const crc32_ = (buf: Uint8Array): number => {
  let c = 0xffffffff;

  for (const byte of buf) {
    c = CRC_TABLE_[(c ^ byte) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
};

const chunk_ = (type: string, data: Uint8Array): Buffer => {
  const out = Buffer.alloc(12 + data.length);

  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  Buffer.from(data.buffer, data.byteOffset, data.byteLength).copy(out, 8);
  out.writeUInt32BE(crc32_(out.subarray(4, 8 + data.length)), 8 + data.length);

  return out;
};

const paeth_ = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) {
    return a;
  }

  return pb <= pc ? b : c;
};

/** Encode RGBA pixels (row-major, 4 bytes per pixel) as a PNG file. */
export const encodePngRgba = (width: number, height: number, rgba: Uint8Array): Buffer => {
  const bpp = 4;
  const stride = width * bpp;
  const filtered = new Uint8Array((stride + 1) * height);
  const candidate = new Uint8Array(stride);
  const best = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const row = rgba.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? rgba.subarray((y - 1) * stride, y * stride) : new Uint8Array(stride);
    let bestType = 0;
    let bestSum = Number.POSITIVE_INFINITY;

    for (let type = 0; type < 5; type++) {
      let sum = 0;

      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let predictor = 0;

        if (type === 1) {
          predictor = a;
        } else if (type === 2) {
          predictor = b;
        } else if (type === 3) {
          predictor = (a + b) >>> 1;
        } else if (type === 4) {
          predictor = paeth_(a, b, c);
        }
        const v = (row[i] - predictor) & 0xff;

        candidate[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        bestSum = sum;
        bestType = type;
        best.set(candidate);
      }
    }
    filtered[y * (stride + 1)] = bestType;
    filtered.set(best, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);

  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([signature, chunk_('IHDR', ihdr), chunk_('IDAT', deflateSync(filtered, { level: 9, memLevel: 9 })), chunk_('IEND', new Uint8Array(0))]);
};
