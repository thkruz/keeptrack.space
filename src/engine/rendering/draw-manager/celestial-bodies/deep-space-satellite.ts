/**
 * Data-driven class for deep-space satellites (Voyager 1, Pioneer 10, etc.)
 * Uses Chebyshev polynomial interpolation for compact ephemeris storage.
 * Unlike dwarf planets, instances are created from a config array rather than individual class files.
 * Coefficients are loaded from JSON files at runtime via fetch().
 */
import { rgbaArray, SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { settingsManager } from '@app/settings/settings';
import { ChebyshevCoefficients } from '@ootk/src/interpolator/ChebyshevCoefficients';
import { ChebyshevInterpolator } from '@ootk/src/interpolator/ChebyshevInterpolator';
import { Kilometers, Seconds, SpaceObjectType } from '@ootk/src/main';
import { ChebyshevBody } from './chebyshev-body';

export interface DeepSpaceSatelliteConfig {
  name: string;
  color: rgbaArray;
  orbitalPeriod: Seconds;
  meanDistanceToSun: Kilometers;
  dataFile: string;
  model?: string;
  /** NORAD catalog number, when assigned (resolves ?sat= URLs to this probe) */
  sccNum?: string;
  /** International designator (COSPAR), when assigned (resolves ?intldes= URLs to this probe) */
  intlDes?: string;
}

interface ChebyshevJsonSegment {
  a: number;
  b: number;
  cx: number[];
  cy: number[];
  cz: number[];
}

/**
 * Fetch a Chebyshev JSON file and parse it into ChebyshevCoefficients[].
 */
export async function loadChebyshevJson(dataFile: string): Promise<ChebyshevCoefficients[]> {
  const primaryUrl = `https://r2.keeptrack.space/data/ephemeris/${dataFile}`;
  const fallbackUrl = `data/ephemeris/${dataFile}`;

  let resp = await fetch(primaryUrl).catch(() => null);

  if (!resp?.ok) {
    resp = await fetch(fallbackUrl);
  }

  if (!resp.ok) {
    throw new Error(`Failed to load ephemeris: ${dataFile} (${resp.status})`);
  }

  const segments: ChebyshevJsonSegment[] = await resp.json();

  return segments.map((seg) => new ChebyshevCoefficients(seg.a as Seconds, seg.b as Seconds, new Float64Array(seg.cx), new Float64Array(seg.cy), new Float64Array(seg.cz)));
}

export class DeepSpaceSatellite extends ChebyshevBody {
  readonly RADIUS = 0.001;
  protected readonly NUM_HEIGHT_SEGS = 4;
  protected readonly NUM_WIDTH_SEGS = 4;

  protected interpolator_: ChebyshevInterpolator;
  private config_: DeepSpaceSatelliteConfig;

  type: SpaceObjectType = SpaceObjectType.PAYLOAD;

  constructor(config: DeepSpaceSatelliteConfig) {
    super();
    this.config_ = config;
    this.color = config.color;
    this.orbitalPeriod = config.orbitalPeriod;
    this.meanDistanceToSun = config.meanDistanceToSun;
    // Interpolator is set later via setCoefficients() after async data load
    this.interpolator_ = null as unknown as ChebyshevInterpolator;
  }

  /**
   * True once init() has run and the Chebyshev coefficients are loaded, i.e.
   * position updates are live. False while the async ephemeris fetch is still
   * in flight, which callers (e.g. URL-driven focusing) must wait out.
   */
  get isEphemerisReady(): boolean {
    return this.isLoaded_;
  }

  get config(): DeepSpaceSatelliteConfig {
    return this.config_;
  }

  /** Set the Chebyshev coefficients after async loading. Marks the satellite as ready. */
  setCoefficients(coefficients: ChebyshevCoefficients[]): void {
    this.interpolator_ = new ChebyshevInterpolator(coefficients);
    if (this.gl_) {
      this.isLoaded_ = true;
    }
  }

  getName(): SolarBody {
    return this.config_.name as SolarBody;
  }

  getTexturePath(): string {
    return '';
  }

  useHighestQualityTexture(): void {
    // No texture for deep-space satellites
  }

  // eslint-disable-next-line require-await
  async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;
    // Only mark loaded if we already have coefficient data
    if (this.interpolator_) {
      this.isLoaded_ = true;
    }

    EventBus.getInstance().on(EventBusEvent.onLinesCleared, () => {
      this.isDrawOrbitPath = false;
      if (this.fullOrbitPath) {
        this.fullOrbitPath.isGarbage = true;
      }
      if (this.fullOrbitPathEarthCentered) {
        this.fullOrbitPathEarthCentered.isGarbage = true;
      }
    });
  }

  /**
   * Override update() to skip mesh operations (no mesh for deep-space satellites).
   * Only updates position and dot rendering data.
   */
  update(simTime: Date): void {
    if (!this.isLoaded_) {
      return;
    }
    this.updatePosition(simTime);
    if (this.isDrawOrbitPath && settingsManager.centerBody !== this.getName()) {
      this.drawFullOrbitPath();
    }

    // Update dot position data (no mesh/matrix operations)
    const positionData = ServiceLocator.getDotsManager().positionData;

    if (positionData && this.planetObject?.id) {
      positionData[Number(this.planetObject.id) * 3] = this.position[0];
      positionData[Number(this.planetObject.id) * 3 + 1] = this.position[1];
      positionData[Number(this.planetObject.id) * 3 + 2] = this.position[2];
    }
  }

  getModelName(): string {
    return this.config_.model ?? 'sat2';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  draw(_sunPosition?: unknown, _tgtBuffer?: unknown): void {
    // No-op: deep-space satellites are too small for sphere rendering.
    // 3D mesh rendering is handled by MeshManager when centered.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drawOcclusion(_pMatrix?: unknown, _camMatrix?: unknown, _occlusionPrgm?: unknown, _tgtBuffer?: unknown): void {
    // No-op: spacecraft is too small to occlude the sun for godrays.
  }
}
