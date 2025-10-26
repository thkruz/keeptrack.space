export interface DepthConfig {
  readonly logDepthBufFC: number;
  readonly near: number;
  readonly far: number;
  readonly useLogDepth: boolean;
}

export class DepthManager {
  private static readonly SATELLITE_NEAR = 0.1;
  private static readonly SATELLITE_FAR = 3e10; // 3496000000;
  private static readonly LOG_DEPTH_FC = 2.0 / Math.log2(DepthManager.SATELLITE_FAR + 1.0);

  static getConfig(): DepthConfig {
    return {
      logDepthBufFC: this.LOG_DEPTH_FC,
      near: this.SATELLITE_NEAR,
      far: this.SATELLITE_FAR,
      useLogDepth: true,
    };
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

  static getLogDepthFragCode(): string {
    // TODO: This doesn't work correctly - need to figure out why
    return `
      // float w = 1.0 / gl_FragCoord.w;  // Recover original gl_Position.w
      // gl_FragDepth = (log2(max(1e-6, 1.0 + w)) * logDepthBufFC - 1.0) * 0.5 + 0.5;
    `;
  }
}
