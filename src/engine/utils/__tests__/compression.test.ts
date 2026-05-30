import { compressToGzip, decompressFromGzip } from '@app/engine/utils/compression';

describe('gzip compression utils', () => {
  it('round-trips a JSON string through gzip', async () => {
    const input = JSON.stringify({ hello: 'world', nums: [1, 2, 3], nested: { a: true } });

    const compressed = await compressToGzip(input);

    expect(compressed).toBeInstanceOf(Uint8Array);
    expect(compressed.length).toBeGreaterThan(0);

    const output = await decompressFromGzip(compressed);

    expect(output).toBe(input);
  });

  it('compresses highly repetitive data below its raw size', async () => {
    const input = 'a'.repeat(2000);

    const compressed = await compressToGzip(input);

    expect(compressed.length).toBeLessThan(input.length);
    expect(await decompressFromGzip(compressed)).toBe(input);
  });

  it('round-trips unicode content', async () => {
    const input = '☄️ 卫星 ° \' " — λ=51.6';

    expect(await decompressFromGzip(await compressToGzip(input))).toBe(input);
  });
});
