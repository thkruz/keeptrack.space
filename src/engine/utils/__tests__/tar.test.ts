import { decompressGzipToBytes } from '@app/engine/utils/compression';
import { extractTarEntry } from '@app/engine/utils/tar';

const BLOCK_SIZE = 512;

/**
 * Gzip raw bytes (binary-safe) using the native CompressionStream, mirroring how
 * the RSO archive's outer .gz layer is produced.
 */
async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  }).pipeThrough(new CompressionStream('gzip'));

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();

    if (done) {
      break;
    }
    chunks.push(value);
  }

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }

  return out;
}

/**
 * Build a single 512-byte USTAR header + padded data blocks for one file entry.
 */
function buildTarEntry(name: string, data: Uint8Array): Uint8Array {
  const header = new Uint8Array(BLOCK_SIZE);
  const encoder = new TextEncoder();

  header.set(encoder.encode(name), 0);
  // size: 11 octal digits at offset 124, NUL terminator at 135
  header.set(encoder.encode(data.length.toString(8).padStart(11, '0')), 124);
  header[156] = 0x30; // typeflag '0' = normal file

  // Checksum: treat the checksum field as spaces, sum all bytes, then write it.
  for (let i = 148; i < 156; i++) {
    header[i] = 0x20;
  }
  let sum = 0;

  for (const byte of header) {
    sum += byte;
  }
  header.set(encoder.encode(sum.toString(8).padStart(6, '0')), 148);
  header[154] = 0;
  header[155] = 0x20;

  const paddedDataLength = Math.ceil(data.length / BLOCK_SIZE) * BLOCK_SIZE;
  const block = new Uint8Array(BLOCK_SIZE + paddedDataLength);

  block.set(header, 0);
  block.set(data, BLOCK_SIZE);

  return block;
}

/**
 * Concatenate entries and append two zero blocks (tar end-of-archive marker).
 */
function buildTar(entries: Uint8Array[]): Uint8Array {
  const trailer = new Uint8Array(BLOCK_SIZE * 2);
  const all = [...entries, trailer];
  const total = all.reduce((sum, e) => sum + e.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  for (const e of all) {
    out.set(e, offset);
    offset += e.length;
  }

  return out;
}

describe('extractTarEntry', () => {
  it('extracts a matching entry from a multi-file archive', () => {
    const encoder = new TextEncoder();
    const payload = encoder.encode('{"hello":"world"}');
    const tar = buildTar([buildTarEntry('manifest.json', encoder.encode('{"version":1}')), buildTarEntry('rso-archive-2026-06-01/catalog.json.gz', payload)]);

    const found = extractTarEntry(tar, (name) => name.endsWith('catalog.json.gz'));

    expect(found).not.toBeNull();
    expect(new TextDecoder().decode(found!)).toBe('{"hello":"world"}');
  });

  it('returns null when no entry matches', () => {
    const encoder = new TextEncoder();
    const tar = buildTar([buildTarEntry('manifest.json', encoder.encode('{}'))]);

    expect(extractTarEntry(tar, (name) => name.endsWith('catalog.json.gz'))).toBeNull();
  });

  it('matches entries whose name contains spaces (NUL-padded name field)', () => {
    const encoder = new TextEncoder();
    const tar = buildTar([buildTarEntry('rso archive/orbit data.json', encoder.encode('payload'))]);

    const found = extractTarEntry(tar, (name) => name === 'rso archive/orbit data.json');

    expect(found).not.toBeNull();
    expect(new TextDecoder().decode(found!)).toBe('payload');
  });

  it('handles data that is not block-aligned', () => {
    const encoder = new TextEncoder();
    const odd = encoder.encode('x'.repeat(700)); // spans two blocks
    const tar = buildTar([buildTarEntry('catalog.json.gz', odd)]);

    const found = extractTarEntry(tar, (name) => name === 'catalog.json.gz');

    expect(found).toHaveLength(700);
  });
});

describe('decompressGzipToBytes', () => {
  it('round-trips arbitrary binary content (including bytes > 0x7f)', async () => {
    const original = new Uint8Array(1024);

    for (let i = 0; i < original.length; i++) {
      original[i] = (i * 37) % 256;
    }

    const bytes = await decompressGzipToBytes(await gzipBytes(original));

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual(Array.from(original));
  });

  it('round-trips a gzipped tar back to an extractable entry (the RSO outer layer)', async () => {
    const encoder = new TextEncoder();
    const tar = buildTar([buildTarEntry('manifest.json', encoder.encode('{}')), buildTarEntry('catalog.json.gz', encoder.encode('inner-bytes'))]);

    const restored = await decompressGzipToBytes(await gzipBytes(tar));
    const found = extractTarEntry(restored, (name) => name.endsWith('catalog.json.gz'));

    expect(found).not.toBeNull();
    expect(new TextDecoder().decode(found!)).toBe('inner-bytes');
  });
});
