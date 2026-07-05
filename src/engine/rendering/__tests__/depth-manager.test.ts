import { DepthManager } from '@app/engine/rendering/depth-manager';

describe('DepthManager depth encoding', () => {
  const { near, far } = DepthManager.getConfig();

  it('maps the far plane to window depth 1.0', () => {
    expect(DepthManager.encodeDepth(far)).toBeCloseTo(1.0, 6);
  });

  it('keeps the near plane near window depth 0.0', () => {
    expect(DepthManager.encodeDepth(near)).toBeGreaterThanOrEqual(0);
    expect(DepthManager.encodeDepth(near)).toBeLessThan(0.001);
  });

  it('is strictly monotonic across the full depth range', () => {
    const samples = [near, 0.01, 1, 100, 6371, 42164, 3.84e5, 1.5e8, 3e9, far];
    let previous = -Infinity;

    for (const w of samples) {
      const depth = DepthManager.encodeDepth(w);

      expect(depth).toBeGreaterThan(previous);
      expect(depth).toBeGreaterThanOrEqual(0);
      expect(depth).toBeLessThanOrEqual(1);
      previous = depth;
    }
  });

  it('matches the vertex-shader encoding at shared vertices', () => {
    // The fragment encoder must equal the window-space depth produced by the vertex remap
    // (gl_Position.z / gl_Position.w = log2(1+w)*FC - 1, then 0.5*z_ndc + 0.5), so that
    // fragment-depth passes and vertex-only passes stay mutually depth-consistent.
    const { logDepthBufFC } = DepthManager.getConfig();

    for (const w of [1, 6371, 42164, 3e9]) {
      const ndcZ = Math.log2(1 + w) * logDepthBufFC - 1;
      const windowDepthFromVertex = 0.5 * ndcZ + 0.5;

      expect(DepthManager.encodeDepth(w)).toBeCloseTo(windowDepthFromVertex, 9);
    }
  });
});

describe('DepthManager fragment shader snippet', () => {
  it('guards on logDepthBufFC and writes gl_FragDepth on every path', () => {
    const code = DepthManager.getLogDepthFragCode();

    expect(code).toContain('logDepthBufFC > 0.0');
    expect(code).toContain('gl_FragDepth = log2(1.0 + wFrag) * logDepthBufFC * 0.5');
    // Ortho / 2D-mode path (logDepthBufFC == 0) must still write depth (GLSL ES 3.0 rule).
    expect(code).toContain('gl_FragDepth = gl_FragCoord.z');
  });

  it('applies the wScale bias argument', () => {
    expect(DepthManager.getLogDepthFragCode('0.9995')).toContain('* 0.9995');
  });
});
