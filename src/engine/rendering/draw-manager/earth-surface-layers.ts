import { errorManagerInstance } from '@app/engine/utils/errorManager';

/**
 * Generic hook for drawing extra layers on the Earth's surface in the main colour pass.
 *
 * The Earth draws its surface mesh, then asks every registered overlay that reports ready to draw,
 * before the atmosphere and aurora shells. Picking and godray occlusion keep using the base mesh.
 * An overlay owns its GL resources and must leave the state it changes (program, VAO, blend,
 * depth mask, active texture) the way the Earth expects: no VAO bound, blending off, depth mask on.
 *
 * The Earth's lighting lives inline in its surface fragment shader (no shareable GLSL chunk), so an
 * overlay receives the lighting inputs as values and reproduces whatever part of the blend it needs.
 */

/** Lighting inputs the Earth surface shader uses this frame (see `Earth.setSurfaceUniforms_`). */
export interface EarthSurfaceLighting {
  /** Unit vector toward the Sun in world (ECI) space; the surface normals are rotated into the same space. */
  readonly lightDirection: readonly [number, number, number];
  /** `settingsManager.isEarthAmbientLighting`: sun-angle shading on. Off means the shader's diffuse term is 0. */
  readonly isAmbientLighting: boolean;
  /** `settingsManager.isDrawNightAsDay`: the whole globe evenly lit. */
  readonly isDrawNightAsDay: boolean;
  /** `settingsManager.earthNightBrightness` (1 = stock). */
  readonly nightBrightness: number;
  /** The shader's `uZoomLevel` value (night lights fade with it). */
  readonly zoomLevel: number;
  /** `settingsManager.terrainReliefExaggeration` (0 = relief off). */
  readonly reliefExaggeration: number;
  /** `settingsManager.isEarthGrayScale`. */
  readonly isGrayScale: boolean;
  /** True when the surface shader draws its cloud layer this frame. */
  readonly isCloudsVisible: boolean;
  /** Painted cloud opacity multiplier: the zoom and satellite-lock fade times the maximum opacity (cloud-visibility.ts). */
  readonly cloudOpacity: number;
  /** The painted-cloud coverage texture (red channel), when loaded; overlays that shade by cloud cover sample it. */
  readonly cloudTexture?: WebGLTexture | null;
  /** The painted clouds' drift (subtract from u). */
  readonly cloudPosition?: number;
  /** Simulation time in days since the Unix epoch; the input of `CLOUD_EVOLUTION_GLSL` (painted-clouds-glsl.ts). */
  readonly cloudTimeDays?: number;
  /** `settingsManager.cloudEvolutionStrength` (0 = off). */
  readonly cloudEvolutionStrength?: number;
  /** The political map overlay (RGBA, same uv as the surface), or null while it is off; an overlay that covers the surface adds it back. */
  readonly politicalTexture?: WebGLTexture | null;
  /** Border overlay strength 0..1 at this camera altitude (political-map-fade.ts); multiply its alpha by it. */
  readonly politicalFade?: number;
}

/** Everything an overlay needs to draw on the surface in step with the base mesh. */
export interface EarthSurfaceDrawContext {
  readonly gl: WebGL2RenderingContext;
  /** Framebuffer the surface was drawn into (null = default). Already bound when `draw` runs. */
  readonly targetFramebuffer: WebGLFramebuffer | null;
  /** Camera projection matrix (column-major). */
  readonly projectionMatrix: ArrayLike<number>;
  /** Camera view matrix (world to camera, column-major). */
  readonly viewMatrix: ArrayLike<number>;
  /** projection x view, the matrix the surface shader receives as `projectionMatrix`. */
  readonly projectionViewMatrix: ArrayLike<number>;
  /** Earth model matrix: Earth-fixed km to world, GMST rotation and any world shift included. */
  readonly modelMatrix: ArrayLike<number>;
  /** Greenwich mean sidereal time (radians) the model matrix rotates by. */
  readonly gmst: number;
  /** Camera position in world space (km), from the inverse of the view matrix. */
  readonly cameraPosition: readonly [number, number, number];
  /** `CameraType` of the main camera; overlays decide which modes they draw in. */
  readonly cameraType: number;
  /** Logarithmic depth constant the surface shader uses (`DepthManager.getConfig().logDepthBufFC`). */
  readonly logDepthBufFC: number;
  readonly drawingBufferWidth: number;
  readonly drawingBufferHeight: number;
  readonly lighting: EarthSurfaceLighting;
}

/** A layer drawn over the Earth's surface mesh. */
export interface EarthSurfaceOverlay {
  /** Unique id; registering a second overlay with the same id replaces the first. */
  readonly id: string;
  /** Overlays that are not ready are skipped this frame. */
  isReady(): boolean;
  draw(context: EarthSurfaceDrawContext): void;
}

export type SurfaceOverlayLogger = (message: string, error: unknown) => void;

const defaultLogger_: SurfaceOverlayLogger = (message, error) => {
  errorManagerInstance.warn(message, error);
};

/** Ordered set of surface overlays. A throwing overlay is caught and logged once; the others still draw. */
export class EarthSurfaceOverlayRegistry {
  private readonly overlays_: EarthSurfaceOverlay[] = [];
  private readonly loggedFailures_ = new Set<string>();
  private readonly log_: SurfaceOverlayLogger;

  constructor(log: SurfaceOverlayLogger = defaultLogger_) {
    this.log_ = log;
  }

  get size(): number {
    return this.overlays_.length;
  }

  /** Ids in draw order. */
  ids(): string[] {
    return this.overlays_.map((overlay) => overlay.id);
  }

  register(overlay: EarthSurfaceOverlay): void {
    this.unregister(overlay.id);
    this.overlays_.push(overlay);
  }

  unregister(id: string): boolean {
    const index = this.overlays_.findIndex((overlay) => overlay.id === id);

    if (index < 0) {
      return false;
    }
    this.overlays_.splice(index, 1);
    this.loggedFailures_.delete(id);

    return true;
  }

  /** Draw every ready overlay in registration order. */
  drawAll(context: EarthSurfaceDrawContext): void {
    for (const overlay of [...this.overlays_]) {
      this.drawOne_(overlay, context);
    }
  }

  private drawOne_(overlay: EarthSurfaceOverlay, context: EarthSurfaceDrawContext): void {
    try {
      if (overlay.isReady()) {
        overlay.draw(context);
      }
    } catch (error) {
      this.reportFailure_(overlay.id, error);
    }
  }

  private reportFailure_(id: string, error: unknown): void {
    if (this.loggedFailures_.has(id)) {
      return;
    }
    this.loggedFailures_.add(id);
    this.log_(`Earth surface overlay "${id}" failed to draw`, error);
  }
}

/** World-space camera position: the translation of the inverse of a rigid view matrix (column-major). */
export const cameraPositionFromView = (view: ArrayLike<number>): [number, number, number] => {
  // view = [R | t]; camera = -R^T t, with R stored column-major in view[0..10].
  const tx = view[12];
  const ty = view[13];
  const tz = view[14];

  return [-(view[0] * tx + view[1] * ty + view[2] * tz), -(view[4] * tx + view[5] * ty + view[6] * tz), -(view[8] * tx + view[9] * ty + view[10] * tz)];
};

/** Settings fields the surface lighting reads (a subset of `settingsManager`). */
export interface SurfaceLightingSettings {
  readonly isEarthAmbientLighting?: boolean;
  readonly isDrawNightAsDay?: boolean;
  readonly earthNightBrightness?: number;
  readonly terrainReliefExaggeration?: number;
  readonly isEarthGrayScale?: boolean;
}

export interface SurfaceZoom {
  /** `uZoomLevel`. */
  readonly zoomLevel: number;
  /** `uCloudOpacity`. */
  readonly cloudOpacity: number;
  readonly isCloudsVisible: boolean;
}

/** Same defaults as `Earth.setSurfaceUniforms_`. */
export const buildSurfaceLighting = (settings: SurfaceLightingSettings, lightDirection: ArrayLike<number>, zoom: SurfaceZoom): EarthSurfaceLighting => ({
  lightDirection: [lightDirection[0], lightDirection[1], lightDirection[2]],
  isAmbientLighting: settings.isEarthAmbientLighting === true,
  isDrawNightAsDay: settings.isDrawNightAsDay === true,
  nightBrightness: settings.earthNightBrightness ?? 1.0,
  zoomLevel: zoom.zoomLevel,
  reliefExaggeration: settings.terrainReliefExaggeration ?? 2.5,
  isGrayScale: settings.isEarthGrayScale === true,
  isCloudsVisible: zoom.isCloudsVisible,
  cloudOpacity: zoom.cloudOpacity,
});
