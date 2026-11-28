/*
 * Workers (positionCruncher, orbitCruncher, ...) import transforms.ts, which imports the WGS84
 * GLSL chunk for its TypeScript mirror. A worker has no `window`, and the error manager reads
 * `window` when it is constructed, so the chunk must not pull it in. Live check L1 found every
 * worker failing with "ReferenceError: window is not defined" through the glsl formatter.
 */
describe('wgs84-glsl import path', () => {
  afterEach(() => {
    vi.doUnmock('@app/engine/utils/errorManager');
    vi.resetModules();
  });

  it('loads without importing the error manager', async () => {
    vi.resetModules();
    vi.doMock('@app/engine/utils/errorManager', () => {
      throw new Error('wgs84-glsl must stay worker safe: it imported the error manager');
    });

    const chunk = await import('@app/engine/rendering/shaders/wgs84-glsl');

    expect(chunk.WGS84_GLSL).toContain('float geodeticLatitude(vec3 ecef)');
    expect(chunk.geodeticLatitudeGlslMirror(6378.137, 0, 0)).toBe(0);
  });
});
