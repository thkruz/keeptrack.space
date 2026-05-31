/* eslint-disable require-jsdoc */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GlUtils } from '@app/engine/rendering/gl-utils';
import { resetTextureLoadRegistry, getTextureStatuses } from '@app/engine/rendering/texture-load-registry';

const fakeGl = {
  createTexture: () => ({} as WebGLTexture),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  pixelStorei: vi.fn(),
  texParameteri: vi.fn(),
  texParameterf: vi.fn(),
  generateMipmap: vi.fn(),
  getExtension: () => null,
  TEXTURE_2D: 0x0DE1,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  UNPACK_FLIP_Y_WEBGL: 0x9240,
  UNPACK_ALIGNMENT: 0x0CF5,
  LINEAR_MIPMAP_LINEAR: 0x2703,
  LINEAR: 0x2601,
  REPEAT: 0x2901,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  CLAMP_TO_EDGE: 0x812F,
} as unknown as WebGL2RenderingContext;

function makeResponse(status: number, headers: Record<string, string> = {}): Response {
  return new Response('', { status, headers });
}

function makeOkResponse(): Response {
  const blob = new Blob([new Uint8Array(4)], { type: 'image/png' });
  // Bake a non-power-of-2 image so the simpler shader-param path runs
  // (avoids the mipmap/anisotropy branch in initTexture, which isn't what these retry tests care about).


  return new Response(blob, { status: 200, headers: { 'Content-Type': 'image/png' } });
}

describe('GlUtils.initTexture retry policy', () => {
  beforeEach(() => {
    resetTextureLoadRegistry();
    vi.useFakeTimers();
    // Override the global 1x1 createImageBitmap mock so initTexture takes the non-POT branch.
    vi.stubGlobal('createImageBitmap', vi.fn(() => Promise.resolve({
      width: 3,
      height: 5,
      close: () => { /* noop */ },
    } as ImageBitmap)));
  });

  it('resolves on first attempt when fetch is OK', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(makeOkResponse());

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/happy.png');

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const status = getTextureStatuses().find((s) => s.url.endsWith('happy.png'));

    expect(status?.state).toBe('loaded');
    expect(status?.attempts).toBe(1);
  });

  it('retries 5xx responses up to 2 times then fails', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(503));

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/hard-503.png');

    promise.catch(() => { /* expected */ });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow(/Failed to load image.*503/u);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const status = getTextureStatuses().find((s) => s.url.endsWith('hard-503.png'));

    expect(status?.state).toBe('failed');
    expect(status?.attempts).toBe(3);
  });

  it('retries 5xx then succeeds on the third attempt', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeOkResponse());

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/transient.png');

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const status = getTextureStatuses().find((s) => s.url.endsWith('transient.png'));

    expect(status?.state).toBe('loaded');
    expect(status?.attempts).toBe(3);
  });

  it('does NOT retry on 404', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(makeResponse(404));

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/missing.png');

    promise.catch(() => { /* expected */ });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow(/Failed to load image.*404/u);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const status = getTextureStatuses().find((s) => s.url.endsWith('missing.png'));

    expect(status?.state).toBe('failed');
    expect(status?.attempts).toBe(1);
  });

  it('retries on network errors (TypeError from fetch)', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(makeOkResponse());

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/flaky.png');

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry AbortError', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValueOnce(abortErr);

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/aborted.png');

    promise.catch(() => { /* expected */ });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honors Retry-After header when within 5s cap', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeResponse(503, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(makeOkResponse());

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/retry-after.png');

    // Advance just under the Retry-After delay (2000ms) — fetch should not have been retried yet
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance past — retry should fire
    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caps long Retry-After at 5000ms', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(makeResponse(503, { 'Retry-After': '60' })) // 60s
      .mockResolvedValueOnce(makeOkResponse());

    vi.stubGlobal('fetch', fetchMock);

    const promise = GlUtils.initTexture(fakeGl, 'http://example.test/textures/long-retry.png');

    // After 6s the cap (5s) is exceeded — retry should have fired
    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
