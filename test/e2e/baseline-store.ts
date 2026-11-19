import { type TestInfo } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

/**
 * Per-machine screenshot baselines (#613). Baselines depend on this machine's GPU and fonts, so they are not
 * committed. They live outside any checkout (KT_BASELINE_DIR, else ~/.keeptrack-e2e-baselines) so a dev checkout
 * and a runner checkout on the same machine share them: <dir>/<project>/<name>.png.
 *
 * KT_BASELINE_UPDATE=1 rewrites baselines; KT_BASELINE_STRICT=1 makes a missing baseline a failure.
 * The PNG codec below uses node:zlib only: pixelmatch and pngjs are not in the repo's dependencies.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const baselineDir = (): string => process.env.KT_BASELINE_DIR ?? join(homedir(), '.keeptrack-e2e-baselines');
export const baselinePath = (project: string, name: string): string => join(baselineDir(), project, `${name}.png`);
export const diffDir = (project: string): string => join(ROOT, 'test-results', 'baseline-diffs', project);

/** Per-pixel colour distance (YIQ, 0..1, as pixelmatch) above which a pixel counts as different. */
export const PIXEL_THRESHOLD = 0.2;
/** Share of differing pixels above which a shot fails. */
export const MAX_DIFF_RATIO = 0.0005;

interface Raster {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  data: Uint8Array;
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;

  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  return c >>> 0;
});

const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;

  for (const b of buf) {
    c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, body: Buffer): Buffer => {
  const head = Buffer.alloc(8);

  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);

  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);

  return Buffer.concat([head, body, tail]);
};

/** Decodes 8-bit non-interlaced greyscale, RGB, RGBA or grey+alpha PNGs (what Chromium writes). */
export function decodePng(png: Buffer): Raster {
  if (!png.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG');
  }
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];

  for (let pos = 8; pos < png.length; ) {
    const len = png.readUInt32BE(pos);
    const type = png.toString('ascii', pos + 4, pos + 8);
    const body = png.subarray(pos + 8, pos + 8 + len);

    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      const colour = body[9];

      if (depth !== 8 || body[12] !== 0 || ![0, 2, 4, 6].includes(colour)) {
        throw new Error(`unsupported PNG (depth ${depth}, colour ${colour}, interlace ${body[12]})`);
      }
      channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[colour];
    } else if (type === 'IDAT') {
      idat.push(body);
    }
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let add = 0;

      if (filter === 1) {
        add = a;
      } else if (filter === 2) {
        add = b;
      } else if (filter === 3) {
        add = (a + b) >> 1;
      } else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);

        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = (raw[src + x] + add) & 0xff;
    }
  }
  const data = new Uint8Array(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const o = i * channels;

    if (channels >= 3) {
      data.set([out[o], out[o + 1], out[o + 2], channels === 4 ? out[o + 3] : 255], i * 4);
    } else {
      data.set([out[o], out[o], out[o], channels === 2 ? out[o + 1] : 255], i * 4);
    }
  }

  return { width, height, data };
}

export function encodePng(r: Raster): Buffer {
  const stride = r.width * 4;
  const raw = Buffer.alloc(r.height * (stride + 1));

  for (let y = 0; y < r.height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(r.data.buffer, r.data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);

  ihdr.writeUInt32BE(r.width, 0);
  ihdr.writeUInt32BE(r.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const blend = (c: number, a: number): number => 255 + (c - 255) * a;

/** YIQ delta as pixelmatch (without the anti-aliasing exemption). */
function colourDelta(a: Uint8Array, b: Uint8Array, i: number): number {
  const aa = a[i + 3] / 255;
  const ba = b[i + 3] / 255;
  const r = blend(a[i], aa) - blend(b[i], ba);
  const g = blend(a[i + 1], aa) - blend(b[i + 1], ba);
  const bl = blend(a[i + 2], aa) - blend(b[i + 2], ba);
  const y = r * 0.29889531 + g * 0.58662247 + bl * 0.11448223;
  const iq = r * 0.59597799 - g * 0.2741761 - bl * 0.32180189;
  const q = r * 0.21147017 - g * 0.52261711 + bl * 0.31114694;

  return 0.5053 * y * y + 0.299 * iq * iq + 0.1957 * q * q;
}

export interface Comparison {
  /** Null when the images match. */
  failure: string | null;
  diffPixels: number;
  ratio: number;
  /** Red-on-faded diff image, null on a size change. */
  diff: Buffer | null;
}

export function comparePngs(expected: Buffer, actual: Buffer, threshold = PIXEL_THRESHOLD, maxRatio = MAX_DIFF_RATIO): Comparison {
  const e = decodePng(expected);
  const a = decodePng(actual);

  if (e.width !== a.width || e.height !== a.height) {
    return { failure: `size changed: ${e.width}x${e.height} -> ${a.width}x${a.height}`, diffPixels: 0, ratio: 1, diff: null };
  }
  const max = 35215 * threshold * threshold;
  const diff = new Uint8Array(e.data.length);
  let count = 0;

  for (let i = 0; i < e.data.length; i += 4) {
    if (colourDelta(e.data, a.data, i) > max) {
      count++;
      diff.set([255, 0, 0, 255], i);
    } else {
      const grey = 255 - (255 - (e.data[i] * 0.299 + e.data[i + 1] * 0.587 + e.data[i + 2] * 0.114)) * 0.25;

      diff.set([grey, grey, grey, 255], i);
    }
  }
  const ratio = count / (e.width * e.height);

  return {
    failure: ratio > maxRatio ? `${count} px differ (${(ratio * 100).toFixed(2)} percent, limit ${(maxRatio * 100).toFixed(2)})` : null,
    diffPixels: count,
    ratio,
    diff: encodePng({ width: e.width, height: e.height, data: diff }),
  };
}

export const safeName = (name: string): string => name.replace(/[^A-Za-z0-9._-]+/gu, '_');

export interface CompareOptions {
  /** Share of differing pixels (0..1) above which the shot fails; default {@link MAX_DIFF_RATIO}. */
  maxRatio?: number;
  /** Called with the comparison result of an existing baseline, passing or failing (measuring run-to-run diff). */
  onCompare?: (result: Comparison) => void;
}

/**
 * Records or compares one shot. Returns a failure message (and attaches expected, actual and diff) or null when
 * it passed or was recorded. The caller collects failures and fails once.
 */
export async function compareOrRecord(testInfo: TestInfo, name: string, png: Buffer, options: CompareOptions = {}): Promise<string | null> {
  const project = testInfo.project.name;
  const path = baselinePath(project, safeName(name));
  const update = process.env.KT_BASELINE_UPDATE === '1';

  if (update || !existsSync(path)) {
    if (!update && process.env.KT_BASELINE_STRICT === '1') {
      return `${name}: no baseline at ${path} (KT_BASELINE_STRICT=1)`;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, png);
    testInfo.annotations.push({ type: 'recorded', description: name });

    return null;
  }
  const expected = readFileSync(path);
  const result = comparePngs(expected, png, PIXEL_THRESHOLD, options.maxRatio ?? MAX_DIFF_RATIO);

  options.onCompare?.(result);
  if (!result.failure) {
    return null;
  }
  const dir = diffDir(project);
  const base = safeName(name);

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${base}-expected.png`), expected);
  writeFileSync(join(dir, `${base}-actual.png`), png);
  await testInfo.attach(`${base}-expected.png`, { body: expected, contentType: 'image/png' });
  await testInfo.attach(`${base}-actual.png`, { body: png, contentType: 'image/png' });
  if (result.diff) {
    writeFileSync(join(dir, `${base}-diff.png`), result.diff);
    await testInfo.attach(`${base}-diff.png`, { body: result.diff, contentType: 'image/png' });
  }

  return `${name}: ${result.failure}`;
}
