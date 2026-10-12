// biome-ignore-all lint/style/noExcessiveClassesPerFile: DetailedSensor and its thin RfSensor subclass form one legacy compatibility API; splitting would separate the subclass from the base it mirrors
/**
 * DetailedSensor Compatibility Layer
 *
 * This class provides backwards compatibility for the old DetailedSensor API
 * while using the new ootk architecture (GroundStation + Sensor).
 *
 * @license AGPL-3.0-or-later
 * @copyright (c) 2025 Kruczek Labs LLC
 */

import {
  CommLink,
  Degrees,
  ElevationMask,
  FieldOfView,
  FieldOfViewParams,
  GroundStation,
  GroundStationParams,
  Kilometers,
  MechanicalRadar,
  Milliseconds,
  maskMinElevation,
  OpticalSensor,
  PhasedArrayRadar,
  Satellite,
  Sensor,
  SensorType,
  SpaceObjectType,
  sortElevationMasks,
  TtcAntenna,
  ZoomValue,
} from '@ootk/src/main';

/**
 * Parameters for constructing a DetailedSensor (legacy format).
 */
export interface DetailedSensorParams extends Omit<GroundStationParams, 'id'> {
  /** Object name identifier */
  objName?: string;
  /** Short name abbreviation */
  shortName?: string;
  /** Display name for UI */
  uiName?: string;
  /** System name (e.g., 'PAVE PAWS') */
  system?: string;
  /** Frequency band (e.g., 'UHF', 'S-Band') */
  freqBand?: string;

  // FOV parameters (legacy format)
  /** Minimum azimuth in degrees */
  minAz?: Degrees;
  /** Maximum azimuth in degrees */
  maxAz?: Degrees;
  /** Minimum elevation in degrees */
  minEl?: Degrees;
  /** Maximum elevation in degrees */
  maxEl?: Degrees;
  /** Minimum range in kilometers */
  minRng?: Kilometers;
  /** Maximum range in kilometers */
  maxRng?: Kilometers;

  // Secondary FOV (for dual-face sensors)
  /** Secondary minimum azimuth */
  minAz2?: Degrees;
  /** Secondary maximum azimuth */
  maxAz2?: Degrees;
  /** Secondary minimum elevation */
  minEl2?: Degrees;
  /** Secondary maximum elevation */
  maxEl2?: Degrees;
  /** Secondary minimum range */
  minRng2?: Kilometers;
  /** Secondary maximum range */
  maxRng2?: Kilometers;

  // Radar-specific
  /** Boresight azimuth angles for faces */
  boresightAz?: Degrees[];
  /** Boresight elevation angles for faces */
  boresightEl?: Degrees[];
  /** Beamwidth in degrees */
  beamwidth?: Degrees;

  /**
   * Explicit boresight-centric FOV (ootk elliptical cone). When provided, it
   * replaces the lossy min/max az/el derivation for the internal sensor, FOV
   * containment checks, and volume rendering. Required for FOVs that cross
   * zenith (e.g., Space Fence's fan), which the legacy az/el box cannot
   * represent.
   */
  fovParams?: FieldOfViewParams;

  /**
   * Azimuth-dependent horizon mask. The effective minimum elevation is always
   * `max(minEl, mask(az))`. Applied on both the fovParams (ootk cone) path and the
   * legacy az/el box path.
   */
  elevationMasks?: ElevationMask[];
  /** Treat elevationMasks as piecewise-linear vertices (SODA style) rather than step sectors. */
  interpolateMask?: boolean;

  // Additional metadata
  /** Sensor ID for identification */
  sensorId?: number;
  /** Object change interval in milliseconds */
  changeObjectInterval?: Milliseconds;
  /** Communication links */
  commLinks?: CommLink[];
  /** Zoom level for camera */
  zoom?: ZoomValue;
  /** URL for more information */
  url?: string;
  /** Country of operation */
  country?: string;
  /** Operating organization */
  operator?: string;
  /** Whether this is volumetric */
  isVolumetric?: boolean;
  /** Numeric ID */
  id?: number;
  /** Volume sensor flag */
  volume?: boolean;
  /** Where the site coordinates were published (station presets) */
  sourceUrl?: string;
  /** ISO date (YYYY-MM-DD) the source was retrieved */
  sourceRetrieved?: string;
}

/**
 * DetailedSensor compatibility class.
 *
 * Wraps the new GroundStation + Sensor architecture to provide the old
 * DetailedSensor API used throughout KeepTrack.
 *
 * @example
 * ```typescript
 * const sensor = new DetailedSensor({
 *   objName: 'CODSFS',
 *   lat: 41.75 as Degrees,
 *   lon: -70.54 as Degrees,
 *   alt: 0.06 as Kilometers,
 *   minAz: 347 as Degrees,
 *   maxAz: 227 as Degrees,
 *   minEl: 3 as Degrees,
 *   maxEl: 85 as Degrees,
 *   minRng: 200 as Kilometers,
 *   maxRng: 5556 as Kilometers,
 * });
 * ```
 */
/** A single failed field-of-view bound, with the offending value and the limit it broke. */
export interface FovRejectReason {
  kind: 'minRange' | 'maxRange' | 'minEl' | 'maxEl' | 'mask' | 'azimuth' | 'cone';
  value: number;
  limit: number;
  /** Upper azimuth bound, only for `azimuth`. */
  limit2?: number;
}

export class DetailedSensor extends GroundStation {
  // Legacy identifiers
  objName: string;
  shortName?: string;
  uiName?: string;
  system?: string;
  freqBand?: string;

  // Primary FOV constraints (legacy properties)
  /** @deprecated Use getFieldOfView() instead */
  minAz: Degrees;
  /** @deprecated Use getFieldOfView() instead */
  maxAz: Degrees;
  /** @deprecated Use getFieldOfView() instead */
  minEl: Degrees;
  /** @deprecated Use getFieldOfView() instead */
  maxEl: Degrees;
  /** @deprecated Use getFieldOfView() instead */
  minRng: Kilometers;
  /** @deprecated Use getFieldOfView() instead */
  maxRng: Kilometers;

  // Secondary FOV constraints
  /** @deprecated Use getFaceFovs() for multi-face sensors */
  minAz2?: Degrees;
  /** @deprecated Use getFaceFovs() for multi-face sensors */
  maxAz2?: Degrees;
  /** @deprecated Use getFaceFovs() for multi-face sensors */
  minEl2?: Degrees;
  /** @deprecated Use getFaceFovs() for multi-face sensors */
  maxEl2?: Degrees;
  /** @deprecated Use getFaceFovs() for multi-face sensors */
  minRng2?: Kilometers;
  /** @deprecated Use getFaceFovs() for multi-face sensors */
  maxRng2?: Kilometers;

  // Radar properties
  boresightAz?: Degrees[];
  boresightEl?: Degrees[];
  beamwidth?: Degrees;

  /**
   * Explicit boresight-centric FOV parameters. Public (not accessor-based) so
   * they survive structured clone into the position cruncher worker, which
   * rehydrates sensors with `new DetailedSensor(serialized)`.
   */
  fovParams?: FieldOfViewParams;

  /** Horizon mask entries as supplied (public so they survive structured clone to workers). */
  elevationMasks?: ElevationMask[];
  /** True when elevationMasks are interpolated vertices. */
  interpolateMask?: boolean;

  // Additional metadata
  sensorId?: number;
  changeObjectInterval?: Milliseconds;
  commLinks?: CommLink[];
  zoom?: ZoomValue;
  url?: string;
  country?: string;
  operator?: string;
  isVolumetric?: boolean;
  volume?: boolean;
  sourceUrl?: string;
  sourceRetrieved?: string;

  /**
   * ECI position - used for calculateIsInSun.
   * This is set externally when needed.
   */
  position?: { x: Kilometers; y: Kilometers; z: Kilometers };

  /** Internal sensor attached to this ground station */
  private sensor_?: Sensor;
  /** Mask entries pre-sorted once for the legacy hot path (empty when no mask). */
  private maskSorted_: ElevationMask[] = [];

  constructor(params: DetailedSensorParams) {
    // Build GroundStation params
    super({
      id: params.id ?? params.sensorId ?? Date.now(),
      name: params.name ?? params.uiName ?? params.objName ?? 'Unknown Sensor',
      lat: params.lat,
      lon: params.lon,
      alt: params.alt ?? (0 as Kilometers),
      type: params.type ?? SpaceObjectType.GROUND_SENSOR_STATION,
      active: params.active,
      metadata: params.metadata,
    });

    // Store legacy identifiers
    this.objName = params.objName ?? params.name ?? String(this.id);
    this.shortName = params.shortName;
    this.uiName = params.uiName ?? params.name;
    this.system = params.system;
    this.freqBand = params.freqBand;

    // Store FOV constraints with defaults
    this.minAz = params.minAz ?? (0 as Degrees);
    this.maxAz = params.maxAz ?? (360 as Degrees);
    this.minEl = params.minEl ?? (0 as Degrees);
    this.maxEl = params.maxEl ?? (90 as Degrees);
    this.minRng = params.minRng ?? (0 as Kilometers);
    this.maxRng = params.maxRng ?? (50000 as Kilometers);

    // Secondary FOV
    this.minAz2 = params.minAz2;
    this.maxAz2 = params.maxAz2;
    this.minEl2 = params.minEl2;
    this.maxEl2 = params.maxEl2;
    this.minRng2 = params.minRng2;
    this.maxRng2 = params.maxRng2;

    // Radar properties
    this.boresightAz = params.boresightAz;
    this.boresightEl = params.boresightEl;
    this.beamwidth = params.beamwidth;
    this.fovParams = params.fovParams;
    this.elevationMasks = params.elevationMasks && params.elevationMasks.length > 0 ? params.elevationMasks : undefined;
    this.interpolateMask = this.elevationMasks ? (params.interpolateMask ?? false) : undefined;
    if (this.elevationMasks) {
      this.maskSorted_ = this.interpolateMask ? sortElevationMasks(this.elevationMasks) : this.elevationMasks;
    }

    // Additional metadata
    this.sensorId = params.sensorId ?? params.id;
    this.changeObjectInterval = params.changeObjectInterval;
    this.commLinks = params.commLinks;
    this.zoom = params.zoom;
    this.url = params.url;
    this.country = params.country;
    this.operator = params.operator;
    this.isVolumetric = params.isVolumetric;
    this.volume = params.volume;
    this.sourceUrl = params.sourceUrl;
    this.sourceRetrieved = params.sourceRetrieved;

    // Create internal sensor if we have FOV data
    this.initializeSensor_();
  }

  /**
   * Initialize the internal sensor based on parameters.
   */
  private initializeSensor_(): void {
    const fovParams = this.buildFieldOfViewParams_();

    // Determine sensor type based on SpaceObjectType
    switch (this.type) {
      case SpaceObjectType.PHASED_ARRAY_RADAR:
        this.sensor_ = new PhasedArrayRadar({
          id: this.id,
          name: this.name,
          sensorType: SensorType.PHASED_ARRAY_RADAR,
          fieldOfView: fovParams,
          beamwidth: this.beamwidth ?? (2 as Degrees),
          boresightAz: this.boresightAz ?? [fovParams.boresightAz ?? (0 as Degrees)],
          boresightEl: this.boresightEl ?? [fovParams.boresightEl ?? (90 as Degrees)],
          shortName: this.shortName,
          system: this.system,
          country: this.country,
          operator: this.operator,
          freqBand: this.freqBand,
          isVolumetric: this.isVolumetric,
          url: this.url,
        });
        break;

      case SpaceObjectType.MECHANICAL:
        this.sensor_ = new MechanicalRadar({
          id: this.id,
          name: this.name,
          sensorType: SensorType.MECHANICAL_RADAR,
          fieldOfView: fovParams,
          beamwidth: this.beamwidth ?? (2 as Degrees),
          shortName: this.shortName,
          system: this.system,
          country: this.country,
          operator: this.operator,
          freqBand: this.freqBand,
          isVolumetric: this.isVolumetric,
          url: this.url,
        });
        break;

      case SpaceObjectType.OPTICAL:
      case SpaceObjectType.OBSERVER:
        this.sensor_ = new OpticalSensor({
          id: this.id,
          name: this.name,
          sensorType: SensorType.OPTICAL,
          fieldOfView: fovParams,
          shortName: this.shortName,
          system: this.system,
          country: this.country,
          operator: this.operator,
          url: this.url,
        });
        break;

      case SpaceObjectType.GROUND_SENSOR_STATION:
        // TT&C tracking stations (DSN, SCN, ESTRACK, Galileo, etc.) - cooperative dishes
        this.sensor_ = new TtcAntenna({
          id: this.id,
          name: this.name,
          sensorType: SensorType.TT_C_ANTENNA,
          fieldOfView: fovParams,
          shortName: this.shortName,
          system: this.system,
          country: this.country,
          operator: this.operator,
          freqBand: this.freqBand,
          url: this.url,
        });
        break;

      default:
        // For other unhandled types, create a basic optical sensor
        // to ensure FOV checking works
        this.sensor_ = new OpticalSensor({
          id: this.id,
          name: this.name,
          sensorType: SensorType.OPTICAL,
          fieldOfView: fovParams,
        });
        break;
    }

    // Attach sensor to this ground station
    if (this.sensor_) {
      this.addSensor(this.sensor_);
      this.sensor_.setParent(this);
    }
  }

  /**
   * Build FieldOfViewParams from legacy FOV properties.
   * Converts legacy azimuth-sector FOV to ootk boresight-centric cone.
   */
  private buildFieldOfViewParams_(): FieldOfViewParams {
    // Explicit boresight-centric FOV takes priority over the legacy derivation
    if (this.fovParams) {
      return { ...this.fovParams, ...this.maskFovParams_() };
    }

    // Calculate boresight from center of azimuth sector
    const boresightAz = this.calculateBoresightAz_();
    const boresightEl = this.calculateBoresightEl_();

    // Calculate half-angle from sector width, divided by face count
    const azSpan = this.getAzimuthSpan_();
    // Clamp maxEl to valid range (some sensors have maxEl > 90)
    const clampedMaxEl = Math.min(90, this.maxEl);
    const clampedMinEl = Math.max(-90, this.minEl);
    const elSpan = clampedMaxEl - clampedMinEl;

    // Derive halfAngle from face count:
    // - If multi-face (boresightAz array), divide azimuth span by face count
    // - Single face or no boresight: use full azimuth span
    const faceCount = this.boresightAz?.length ?? 1;
    const faceAzSpan = azSpan / faceCount;
    const halfAngle = Math.min(90, Math.max(faceAzSpan / 2, elSpan / 2)) as Degrees;

    return {
      boresightAz,
      boresightEl,
      halfAngle,
      minorHalfAngle: Math.min(90, elSpan / 2) as Degrees,
      minRange: this.minRng,
      maxRange: this.maxRng,
      minElevation: clampedMinEl as Degrees,
      ...this.maskFovParams_(),
    };
  }

  /**
   * The mask fields to merge into FieldOfViewParams. Sensor-level masks win over any
   * mask already inside fovParams; with no sensor-level mask the fovParams mask is kept.
   */
  private maskFovParams_(): Pick<FieldOfViewParams, 'elevationMasks' | 'interpolate'> {
    if (!this.elevationMasks) {
      return {};
    }

    return { elevationMasks: this.elevationMasks, interpolate: this.interpolateMask };
  }

  /**
   * Effective minimum elevation at an azimuth for the legacy path:
   * `max(floorEl, mask(az))`. Returns floorEl unchanged when there is no mask.
   */
  private getMinElevationAt_(az: Degrees, floorEl: Degrees = this.minEl): Degrees {
    if (this.maskSorted_.length === 0) {
      return floorEl;
    }

    return maskMinElevation(this.maskSorted_, az, this.interpolateMask ?? false, floorEl) as Degrees;
  }

  /** True when this sensor carries a horizon mask (sensor-level or inside fovParams). */
  hasElevationMask(): boolean {
    return this.getMaskVertexCount() > 0;
  }

  /** Number of horizon mask entries in effect (0 when unmasked). */
  getMaskVertexCount(): number {
    return this.maskSorted_.length > 0 ? this.maskSorted_.length : (this.fovParams?.elevationMasks?.length ?? 0);
  }

  /**
   * Horizon mask elevation at an azimuth, ignoring the sensor's flat minEl (0 floor), or
   * null when the sensor has no mask. Used by pass tools to tell a mask edge from a
   * minEl edge and by the polar plot to draw the masked annulus.
   */
  getMaskElevationAt(az: Degrees): Degrees | null {
    if (this.maskSorted_.length > 0) {
      return maskMinElevation(this.maskSorted_, az, this.interpolateMask ?? false, -90) as Degrees;
    }

    const fov = this.fovParams?.elevationMasks?.length ? this.getFieldOfView() : undefined;

    if (fov) {
      return maskMinElevation(fov.elevationMasks, az, fov.interpolateMask, -90) as Degrees;
    }

    return null;
  }

  /**
   * Calculate boresight azimuth from legacy minAz/maxAz.
   * Handles wraparound (e.g., minAz=347, maxAz=227).
   */
  private calculateBoresightAz_(): Degrees {
    if (this.minAz > this.maxAz) {
      // Wraparound case (e.g., 347° to 227°)
      const span = 360 - this.minAz + this.maxAz;

      return ((this.minAz + span / 2) % 360) as Degrees;
    }

    // Normal case
    return ((this.minAz + this.maxAz) / 2) as Degrees;
  }

  /**
   * Calculate boresight elevation from legacy minEl/maxEl.
   * Clamps to valid range (-90 to 90) for ootk FieldOfView.
   */
  private calculateBoresightEl_(): Degrees {
    // Clamp values to valid elevation range
    const clampedMinEl = Math.max(-90, this.minEl);
    const clampedMaxEl = Math.min(90, this.maxEl);

    return ((clampedMinEl + clampedMaxEl) / 2) as Degrees;
  }

  /**
   * Get the azimuth span (angular width) of the FOV.
   * Handles wraparound cases.
   */
  private getAzimuthSpan_(): number {
    if (this.minAz > this.maxAz) {
      // Wraparound case
      return 360 - this.minAz + this.maxAz;
    }

    return this.maxAz - this.minAz;
  }

  /**
   * Gets the internal sensor if one exists.
   */
  getSensor(): Sensor | undefined {
    return this.sensor_;
  }

  /**
   * Gets the FieldOfView from the internal sensor.
   * Returns undefined if no internal sensor exists.
   */
  getFieldOfView(): FieldOfView | undefined {
    return this.sensor_?.fieldOfView;
  }

  /**
   * Gets the FieldOfView array for multi-face sensors (like PhasedArrayRadar).
   * For single-face sensors, returns an array with one element.
   * Returns undefined if no internal sensor exists.
   */
  getFaceFovs(): FieldOfView[] | undefined {
    if (this.sensor_ instanceof PhasedArrayRadar) {
      return this.sensor_.faceFovs;
    }

    const fov = this.sensor_?.fieldOfView;

    return fov ? [fov] : undefined;
  }

  /**
   * Check if this is a sensor object (always true for DetailedSensor).
   */
  isSensor(): boolean {
    return true;
  }

  /**
   * Check if RAE coordinates are within sensor FOV.
   *
   * Sensors with explicit boresight-centric fovParams use the ootk cone model
   * (which handles zenith-crossing fans correctly). All other sensors use
   * legacy azimuth-sector bounds checking, because the cone derived from their
   * min/max az/el values is geometrically incompatible with the sector FOV
   * used in the sensor catalog.
   */
  isRaeInFov(az: Degrees, el: Degrees, rng: Kilometers): boolean {
    if (this.fovParams && this.sensor_) {
      return this.sensor_.isInFov({ rng, az, el });
    }

    return this.checkFovBoundsLegacy_(az, el, rng);
  }

  /**
   * Why a look angle is outside the field of view, or null when it is inside.
   * Mirrors the order of {@link checkFovBounds_} (range, then elevation, then
   * azimuth) against the primary face; a secondary face that also fails is
   * not reported separately. Cone-model sensors can only say "outside cone".
   */
  getFovRejectReason(az: Degrees, el: Degrees, rng: Kilometers): FovRejectReason | null {
    if (this.isRaeInFov(az, el, rng)) {
      return null;
    }

    if (this.fovParams && this.sensor_) {
      const fov = this.sensor_.fieldOfView;

      if (rng >= fov.minRange && rng <= fov.maxRange && el >= fov.minElevation) {
        const floor = fov.getMinElevation(az);

        if (el < floor) {
          return { kind: 'mask', value: el, limit: floor };
        }
      }

      return { kind: 'cone', value: el, limit: el };
    }

    if (rng < this.minRng) {
      return { kind: 'minRange', value: rng, limit: this.minRng };
    }
    if (rng > this.maxRng) {
      return { kind: 'maxRange', value: rng, limit: this.maxRng };
    }
    if (el < this.minEl) {
      return { kind: 'minEl', value: el, limit: this.minEl };
    }
    const maskFloor = this.getMinElevationAt_(az);

    if (el < maskFloor) {
      return { kind: 'mask', value: el, limit: maskFloor };
    }
    if (el > this.maxEl) {
      return { kind: 'maxEl', value: el, limit: this.maxEl };
    }

    return { kind: 'azimuth', value: az, limit: this.minAz, limit2: this.maxAz };
  }

  /**
   * Legacy FOV checking using min/max azimuth/elevation/range bounds.
   * @deprecated Use isRaeInFov() which delegates to ootk sensor.
   */
  private checkFovBoundsLegacy_(az: Degrees, el: Degrees, rng: Kilometers): boolean {
    // Primary FOV check. The horizon mask raises the elevation floor on both faces.
    const inPrimaryFov = this.checkFovBounds_(az, el, rng, this.minAz, this.maxAz, this.getMinElevationAt_(az), this.maxEl, this.minRng, this.maxRng);

    if (inPrimaryFov) {
      return true;
    }

    // Secondary FOV check if defined
    if (this.minAz2 !== undefined && this.maxAz2 !== undefined) {
      return this.checkFovBounds_(
        az,
        el,
        rng,
        this.minAz2,
        this.maxAz2,
        this.getMinElevationAt_(az, this.minEl2 ?? this.minEl),
        this.maxEl2 ?? this.maxEl,
        this.minRng2 ?? this.minRng,
        this.maxRng2 ?? this.maxRng
      );
    }

    return false;
  }

  /**
   * Check if coordinates are within FOV bounds.
   * Handles azimuth wraparound (e.g., minAz=350, maxAz=10).
   */
  // biome-ignore lint/complexity/useMaxParams: 9 cohesive frustum bounds (az/el/rng + min/max each); bundling would allocate per call on a hot path
  private checkFovBounds_(
    az: Degrees,
    el: Degrees,
    rng: Kilometers,
    minAz: Degrees,
    maxAz: Degrees,
    minEl: Degrees,
    maxEl: Degrees,
    minRng: Kilometers,
    maxRng: Kilometers
  ): boolean {
    // Range check
    if (rng < minRng || rng > maxRng) {
      return false;
    }

    // Elevation check
    if (el < minEl || el > maxEl) {
      return false;
    }

    // Azimuth check (handles wraparound)
    if (minAz > maxAz) {
      // Wraparound case (e.g., 350° to 10°)
      return az >= minAz || az <= maxAz;
    }

    // Normal case
    return az >= minAz && az <= maxAz;
  }

  /**
   * Check if satellite is in sensor FOV at given time.
   */
  isSatInFov(sat: Satellite, date: Date = new Date()): boolean {
    const rae = sat.rae(this, date);

    if (!rae) {
      return false;
    }

    return this.isRaeInFov(rae.az, rae.el, rae.rng);
  }

  /**
   * Create a deep copy of this sensor.
   */
  override clone(): DetailedSensor {
    return new DetailedSensor({
      objName: this.objName,
      shortName: this.shortName,
      name: this.name,
      uiName: this.uiName,
      system: this.system,
      freqBand: this.freqBand,
      type: this.type,
      lat: this.lat,
      lon: this.lon,
      alt: this.alt,
      minAz: this.minAz,
      maxAz: this.maxAz,
      minEl: this.minEl,
      maxEl: this.maxEl,
      minRng: this.minRng,
      maxRng: this.maxRng,
      minAz2: this.minAz2,
      maxAz2: this.maxAz2,
      minEl2: this.minEl2,
      maxEl2: this.maxEl2,
      minRng2: this.minRng2,
      maxRng2: this.maxRng2,
      boresightAz: this.boresightAz ? [...this.boresightAz] : undefined,
      boresightEl: this.boresightEl ? [...this.boresightEl] : undefined,
      beamwidth: this.beamwidth,
      fovParams: this.fovParams ? { ...this.fovParams } : undefined,
      elevationMasks: this.elevationMasks ? this.elevationMasks.map((m) => ({ ...m })) : undefined,
      interpolateMask: this.interpolateMask,
      sensorId: this.sensorId,
      changeObjectInterval: this.changeObjectInterval,
      commLinks: this.commLinks ? [...this.commLinks] : undefined,
      zoom: this.zoom,
      url: this.url,
      country: this.country,
      operator: this.operator,
      isVolumetric: this.isVolumetric,
      volume: this.volume,
      sourceUrl: this.sourceUrl,
      sourceRetrieved: this.sourceRetrieved,
      active: this.active,
      metadata: this.metadata ? { ...this.metadata } : undefined,
    });
  }

  override toString(): string {
    return [
      `[DetailedSensor: ${this.objName}]`,
      `  Name: ${this.name}`,
      `  Location: ${this.lat.toFixed(4)}°, ${this.lon.toFixed(4)}°, ${this.alt.toFixed(3)} km`,
      `  Azimuth: ${this.minAz}° - ${this.maxAz}°`,
      `  Elevation: ${this.minEl}° - ${this.maxEl}°`,
      `  Range: ${this.minRng} - ${this.maxRng} km`,
      this.system ? `  System: ${this.system}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

/**
 * RfSensor - Alias for DetailedSensor for RF/Radar sensors.
 * Maintains backwards compatibility with old code using RfSensor.
 */
export class RfSensor extends DetailedSensor {
  constructor(params: DetailedSensorParams) {
    super({
      ...params,
      type: params.type ?? SpaceObjectType.PHASED_ARRAY_RADAR,
    });
  }
}
