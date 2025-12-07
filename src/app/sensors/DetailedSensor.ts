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
  FieldOfViewParams,
  GroundStation,
  GroundStationParams,
  Kilometers,
  Milliseconds,
  PhasedArrayRadar,
  Satellite,
  Sensor,
  SensorType,
  SpaceObjectType,
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
export class DetailedSensor extends GroundStation {
  // Legacy identifiers
  objName: string;
  shortName?: string;
  uiName?: string;
  system?: string;
  freqBand?: string;

  // Primary FOV constraints (legacy properties)
  minAz: Degrees;
  maxAz: Degrees;
  minEl: Degrees;
  maxEl: Degrees;
  minRng: Kilometers;
  maxRng: Kilometers;

  // Secondary FOV constraints
  minAz2?: Degrees;
  maxAz2?: Degrees;
  minEl2?: Degrees;
  maxEl2?: Degrees;
  minRng2?: Kilometers;
  maxRng2?: Kilometers;

  // Radar properties
  boresightAz?: Degrees[];
  boresightEl?: Degrees[];
  beamwidth?: Degrees;

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

  /**
   * ECI position - used for calculateIsInSun.
   * This is set externally when needed.
   */
  position?: { x: Kilometers; y: Kilometers; z: Kilometers };

  /** Internal sensor attached to this ground station */
  private sensor_?: Sensor;

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

    // Create internal sensor if we have FOV data
    this.initializeSensor_();
  }

  /**
   * Initialize the internal sensor based on parameters.
   */
  private initializeSensor_(): void {
    const fovParams = this.buildFieldOfViewParams_();

    // Determine sensor type based on SpaceObjectType
    if (this.type === SpaceObjectType.PHASED_ARRAY_RADAR && this.boresightAz?.length) {
      this.sensor_ = new PhasedArrayRadar({
        id: this.id,
        name: this.name,
        sensorType: SensorType.PHASED_ARRAY_RADAR,
        fieldOfView: fovParams,
        beamwidth: this.beamwidth ?? (2 as Degrees),
        boresightAz: this.boresightAz,
        boresightEl: this.boresightEl ?? this.boresightAz.map(() => 45 as Degrees),
        shortName: this.shortName,
        system: this.system,
        country: this.country,
        operator: this.operator,
        freqBand: this.freqBand,
        isVolumetric: this.isVolumetric,
        url: this.url,
      });
    }

    // Attach sensor to this ground station if created
    if (this.sensor_) {
      this.addSensor(this.sensor_);
      this.sensor_.setParent(this);
    }
  }

  /**
   * Build FieldOfViewParams from legacy FOV properties.
   */
  private buildFieldOfViewParams_(): FieldOfViewParams {
    // Calculate half-angle from az/el ranges
    // For hemisphere-style FOV (old DetailedSensor), use 90 degrees
    const halfAngle = 90 as Degrees;

    return {
      halfAngle,
      minRange: this.minRng,
      maxRange: this.maxRng,
      minElevation: this.minEl,
    };
  }

  /**
   * Gets the internal sensor if one exists.
   */
  getSensor(): Sensor | undefined {
    return this.sensor_;
  }

  /**
   * Check if this is a sensor object (always true for DetailedSensor).
   */
  isSensor(): boolean {
    return true;
  }

  /**
   * Check if RAE coordinates are within sensor FOV (legacy method).
   * Uses the old min/max azimuth/elevation/range checks.
   */
  isRaeInFov(az: Degrees, el: Degrees, rng: Kilometers): boolean {
    // Primary FOV check
    const inPrimaryFov = this.checkFovBounds_(
      az, el, rng,
      this.minAz, this.maxAz,
      this.minEl, this.maxEl,
      this.minRng, this.maxRng,
    );

    if (inPrimaryFov) {
      return true;
    }

    // Secondary FOV check if defined
    if (this.minAz2 !== undefined && this.maxAz2 !== undefined) {
      return this.checkFovBounds_(
        az, el, rng,
        this.minAz2, this.maxAz2,
        this.minEl2 ?? this.minEl, this.maxEl2 ?? this.maxEl,
        this.minRng2 ?? this.minRng, this.maxRng2 ?? this.maxRng,
      );
    }

    return false;
  }

  /**
   * Check if coordinates are within FOV bounds.
   * Handles azimuth wraparound (e.g., minAz=350, maxAz=10).
   */
  private checkFovBounds_(
    az: Degrees, el: Degrees, rng: Kilometers,
    minAz: Degrees, maxAz: Degrees,
    minEl: Degrees, maxEl: Degrees,
    minRng: Kilometers, maxRng: Kilometers,
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
      sensorId: this.sensorId,
      changeObjectInterval: this.changeObjectInterval,
      commLinks: this.commLinks ? [...this.commLinks] : undefined,
      zoom: this.zoom,
      url: this.url,
      country: this.country,
      operator: this.operator,
      isVolumetric: this.isVolumetric,
      volume: this.volume,
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
    ].filter(Boolean).join('\n');
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
