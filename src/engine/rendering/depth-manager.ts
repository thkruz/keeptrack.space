export interface DepthConfig {
  readonly logDepthBufFC: number;
  readonly near: number;
  readonly far: number;
  readonly useLogDepth: boolean;
}

export class DepthManager {
  // 1e-6 km = 1 mm. With a logarithmic depth buffer the near plane only affects
  // clipping (not precision), so it can sit arbitrarily close to allow the camera
  // to approach objects at true physical scale.
  private static readonly SATELLITE_NEAR = 1e-6;
  /**
   * Default far plane: 1e12 km (~6700 AU). Must exceed STAR_DISTANCE (3e10 km) plus the largest
   * camera-to-origin distance so background stars never clip. The heliocentric view alone pulls
   * the camera up to 1.5e10 km from the origin, making a star on the far side ~4.5e10 km away -
   * beyond the old 3e10 far plane, which clipped a black hole in the star field. The logarithmic
   * depth buffer makes a far plane this large essentially free in precision.
   *
   * Overridable via settingsManager.zFar: Earth-orbit-only deployments (companion embed) tighten
   * it to ~2e5 km for extra depth precision on close geometry.
   */
  private static readonly SATELLITE_FAR = 1e12;
  private static cachedFar_ = DepthManager.SATELLITE_FAR;
  private static cachedFc_ = 2.0 / Math.log2(DepthManager.SATELLITE_FAR + 1.0);

  private static resolveFar_(): number {
    const zFar = typeof settingsManager !== 'undefined' ? settingsManager?.zFar : undefined;
    const far = typeof zFar === 'number' && zFar > 1 ? zFar : DepthManager.SATELLITE_FAR;

    if (far !== this.cachedFar_) {
      this.cachedFar_ = far;
      this.cachedFc_ = 2.0 / Math.log2(far + 1.0);
    }

    return far;
  }

  static getConfig(): DepthConfig {
    const far = this.resolveFar_();

    return {
      logDepthBufFC: this.cachedFc_,
      near: this.SATELLITE_NEAR,
      far,
      useLogDepth: true,
    };
  }

  /**
   * JS reference encoder for the logarithmic window-space depth (gl_FragDepth, range [0, 1]).
   * Must stay in lockstep with getLogDepthFragCode(). `w` is the clip-space w (== view-space
   * distance in km for our projection). Used by unit tests to verify monotonicity and that the
   * fragment encoding matches the vertex encoding at shared vertices.
   */
  static encodeDepth(w: number): number {
    this.resolveFar_();

    return Math.log2(1.0 + w) * this.cachedFc_ * 0.5;
  }

  static setupDepthBuffer(gl: WebGL2RenderingContext): void {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL); // CRITICAL: Must be LEQUAL for log depth
    gl.clearDepth(1.0);
    gl.depthMask(true);
  }

  static getLogDepthVertCode(): string {
    return `
      if (logDepthBufFC > 0.0) {
        // Guard against non-positive or extremely large gl_Position.w values which
        // can produce NaNs or Infs when used inside a log2. Clamp to a sensible
        // positive minimum to keep depth calculations stable for very large world
        // coordinates (e.g. grid lines).
        float w = clamp(gl_Position.w, 1e-9, 1e20);
        gl_Position.z = (log2(1.0 + w) * logDepthBufFC - 1.0) * w;
      }
    `;
  }

  /**
   * Per-fragment logarithmic depth. Writing gl_FragDepth makes the log depth exact across large
   * triangles (the vertex-only remap sags between vertices and causes z-fighting on sparsely
   * tessellated surfaces). The encoding matches getLogDepthVertCode() exactly at vertices, so
   * fragment-depth passes and vertex-only passes remain mutually depth-consistent.
   *
   * REQUIREMENTS at every injection site: the fragment shader must be `#version 300 es`, use
   * `precision highp float;` (mediump overflows on log2(1 + 3e10)), and declare
   * `uniform float logDepthBufFC;`. gl_FragDepth is a core output in GLSL ES 3.00 (no extension).
   *
   * Do NOT inject this into point-sprite (dots) or GPU-picking shaders: gl_FragCoord.w is constant
   * across a point sprite so it adds nothing, and writing gl_FragDepth defeats early-Z on the
   * heaviest fill passes. Do NOT combine with gl.polygonOffset (offset is ignored once a shader
   * writes gl_FragDepth) - use the wScale bias argument instead.
   *
   * @param wScale Multiplies the reconstructed view-space w before the log encode. Values < 1.0
   *   pull the surface toward the camera (a shader-side replacement for a negative polygonOffset),
   *   e.g. '0.9995' biases by 0.05% of distance.
   */
  static getLogDepthFragCode(wScale = '1.0'): string {
    return `
      // gl_FragDepth must be written on EVERY path once it is written on any path (GLSL ES 3.0),
      // so the ortho / 2D-mode branch (logDepthBufFC == 0.0) writes the interpolated depth.
      if (logDepthBufFC > 0.0) {
        float wFrag = max((1.0 / gl_FragCoord.w) * ${wScale}, 1e-9); // recover clip-space w
        gl_FragDepth = log2(1.0 + wFrag) * logDepthBufFC * 0.5;
      } else {
        gl_FragDepth = gl_FragCoord.z;
      }
    `;
  }
}
