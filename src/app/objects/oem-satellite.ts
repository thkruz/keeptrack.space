/* eslint-disable max-lines */
import { rgbaArray, SolarBody, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import type { ClassicalElements } from '@app/engine/ootk/src/coordinate/ClassicalElements';
import type { ITRF } from '@app/engine/ootk/src/coordinate/ITRF';
import { Tle } from '@app/engine/ootk/src/coordinate/Tle';
import { LagrangeInterpolator } from '@app/engine/ootk/src/interpolator/LagrangeInterpolator';
import { StateInterpolator } from '@app/engine/ootk/src/interpolator/StateInterpolator';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { OrbitPathLine } from '@app/engine/rendering/line-manager/orbit-path';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { t7e } from '@app/locales/keys';
import {
  calcGmst,
  Degrees, EcefVec3,
  eci2ecef, eci2lla, eci2rae,
  EpochUTC,
  J2000, Kilometers, KilometersPerSecond,
  LlaVec3, PosVel, RaeVec3,
  Seconds,
  SpaceObject,
  SpaceObjectType,
  TemeVec3,
} from '@ootk/src/main';
import { vec4 } from 'gl-matrix';
import { SatMath } from '../analysis/sat-math';
import { SatelliteModels } from '../rendering/mesh/model-resolver';
import { DetailedSensor } from '../sensors/DetailedSensor';
import { TearrData, TearrType } from '../sensors/sensor-math';

export interface OemHeader {
  START_TIME: Date;
  STOP_TIME: Date;
  CCSDS_OEM_VERS: string;
  CREATION_DATE: string;
  ORIGINATOR: string;
  MESSAGE_ID?: string;
  CLASSIFICATION?: string;
  COMMENT?: string[];
}

export interface OemMetadata {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  CENTER_NAME: 'EARTH' | 'MARS BARYCENTER' | 'SUN' | 'SOLAR SYSTEM BARYCENTER';
  REF_FRAME: string;
  TIME_SYSTEM: string;
  START_TIME: string;
  STOP_TIME: string;
  USEABLE_START_TIME?: string;
  USEABLE_STOP_TIME?: string;
  INTERPOLATION?: string;
  INTERPOLATION_DEGREE?: number;
  REF_FRAME_EPOCH?: string;
  COMMENT?: string[];
  /** User-defined parameters from CCSDS OEM USER_DEFINED_ keywords */
  USER_DEFINED?: Record<string, string>;
}

export interface OemCovarianceMatrix {
  epoch: Date;
  refFrame?: string;
  // 6x6 lower triangular matrix stored as 21 values
  values: number[];
}

export interface OemDataBlock {
  metadata: OemMetadata;
  ephemeris: J2000[];
  covariance?: OemCovarianceMatrix[] | null;
}

export interface ParsedOem {
  header: OemHeader;
  dataBlocks: OemDataBlock[];
}


export class OemSatellite extends SpaceObject {
  private static hasShownOutOfRangeWarning_ = false;

  header: OemHeader;
  OemDataBlocks: OemDataBlock[];
  model: keyof typeof SatelliteModels = SatelliteModels.aehf;
  isStable = true;
  source: string;
  orbitPathCache_: Float32Array | null = null;
  stateVectorIdx_: number = 0;
  dataBlockIdx_: number = 0;
  orbitFullPathCache_: Float32Array | null = null;
  /** Full-precision epoch timestamps (ms) parallel to orbitFullPathCache_ — avoids Float32 truncation for GMST calculations */
  epochCache_: Float64Array | null = null;
  /** Cached points for drawing the full orbit path */
  pointsForOrbitPath: [number, number, number][] | null = null;
  orbitFullPathLine: OrbitPathLine | null = null;
  orbitHistoryLine: OrbitPathLine | null = null;
  isDrawOrbitHistory = true;
  lagrangeInterpolator: StateInterpolator | null = null;
  pointsTeme: [number, number, number, number][] = [];
  private lastHistoryStateVectorIdx_: number = -1;
  private lastHistoryDataBlockIdx_: number = -1;
  private historyBuffer_: Float32Array | null = null;
  private historyPointCount_ = 0;
  private lastEcfMode_: boolean = false;
  moonPositionCache_: { [key: number]: { position: { x: number; y: number; z: number } } } = {};

  orbitColor: vec4 = LineColors.GREEN;
  orbitFullPathColor: vec4 = LineColors.BLUE;
  dotColor: rgbaArray = [0, 255, 0, 1];
  sccNum = '';
  sccNum5: string | null = null;
  sccNum6: string | null = null;
  intlDes = '';

  // Satellite-compatible properties populated from USER_DEFINED_ OEM metadata
  country = '';
  launchSite = '';
  launchPad = '';
  launchVehicle = '';
  configuration = '';
  mission = '';
  purpose = '';
  owner = '';
  manufacturer = '';
  bus = '';
  launchMass = '';
  dryMass = '';
  lifetime = '';
  power = '';
  payload = '';
  equipment = '';
  motor = '';
  length = '';
  diameter = '';
  span = '';
  shape = '';

  eci(date?: Date): PosVel | null {
    const effectiveDate = date ?? ServiceLocator.getTimeManager().simulationTimeObj;

    if (effectiveDate < this.header.START_TIME || effectiveDate > this.header.STOP_TIME) {
      if (!OemSatellite.hasShownOutOfRangeWarning_) {
        OemSatellite.hasShownOutOfRangeWarning_ = true;
        ServiceLocator.getUiManager().toast(
          t7e('plugins.OemReaderPlugin.outOfRangeWarning' as Parameters<typeof t7e>[0]),
          ToastMsgType.caution,
          true,
        );
      }
    } else {
      OemSatellite.hasShownOutOfRangeWarning_ = false;
    }

    const posAndVel = this.updatePosAndVel(effectiveDate.getTime() / 1000 as Seconds);

    if (!posAndVel) {
      return null;
    }

    return {
      position: {
        x: posAndVel[0] as Kilometers,
        y: posAndVel[1] as Kilometers,
        z: posAndVel[2] as Kilometers,
      },
      velocity: {
        x: posAndVel[3] as KilometersPerSecond,
        y: posAndVel[4] as KilometersPerSecond,
        z: posAndVel[5] as KilometersPerSecond,
      },
    };
  }

  centerBody: SolarBody = SolarBody.Earth;
  isInertialMoonFrame = false;

  get stateVectorIdx(): number {
    return this.stateVectorIdx_;
  }

  set stateVectorIdx(value: number) {
    if (this.stateVectorIdx_ === value) {
      return;
    }

    this.stateVectorIdx_ = value;
    this.orbitPathCache_ = this.getOrbitPath();
  }

  get dataBlockIdx(): number {
    return this.dataBlockIdx_;
  }

  set dataBlockIdx(value: number) {
    if (this.dataBlockIdx_ === value) {
      return;
    }

    this.dataBlockIdx_ = value;
    this.orbitPathCache_ = this.getOrbitPath();
  }

  constructor(oem: ParsedOem) {
    const lastDataBlock = oem.dataBlocks[oem.dataBlocks.length - 1];

    if (!lastDataBlock) {
      throw new Error('No data blocks found in OEM file.');
    }

    if (lastDataBlock.ephemeris.length === 0) {
      throw new Error('No state vectors found in the last data block of the OEM file.');
    }

    const lastStateVector = lastDataBlock.ephemeris[lastDataBlock.ephemeris.length - 1];

    if (!lastStateVector) {
      throw new Error('No state vectors found in the last data block of the OEM file.');
    }

    super({
      id: 0,
      name: oem.dataBlocks[0].metadata.OBJECT_NAME ?? 'Unnamed Satellite',
      type: SpaceObjectType.NOTIONAL,
      position: { x: lastStateVector.position.x, y: lastStateVector.position.y, z: lastStateVector.position.z },
      velocity: { x: lastStateVector.velocity.x, y: lastStateVector.velocity.y, z: lastStateVector.velocity.z },
      active: true,
    });

    switch (oem.dataBlocks[0].metadata.CENTER_NAME) {
      case 'MARS BARYCENTER':
        this.centerBody = SolarBody.Mars;
        break;
      case 'SUN':
      case 'SOLAR SYSTEM BARYCENTER':
        this.centerBody = SolarBody.Sun;
        break;
      case 'EARTH':
      default:
        this.centerBody = SolarBody.Earth;
        break;
    }

    this.OemDataBlocks = oem.dataBlocks;
    this.lagrangeInterpolator = LagrangeInterpolator.fromEphemeris(this.OemDataBlocks.flatMap((block) => block.ephemeris), this.OemDataBlocks[0].metadata.INTERPOLATION_DEGREE);
    this.source = 'OEM File';
    this.header = oem.header;

    // Extract NORAD_ID from COMMENT lines if present (search all data blocks)
    const allComments = [
      ...(oem.header.COMMENT ?? []),
      ...oem.dataBlocks.flatMap((block) => block.metadata.COMMENT ?? []),
    ];

    for (const comment of allComments) {
      // Match any non-whitespace token after NORAD_ID = so alpha-5 ("T0001")
      // and 9-digit extended IDs are captured, not just legacy numerics.
      // classifySatNum below filters the resulting string and only treats it
      // as a known payload when it parses as a valid sccNum form.
      const match = comment.match(/NORAD_ID\s*=\s*(?<id>\S+)/u);

      if (match?.groups?.id) {
        const id = match.groups.id;
        const kind = Tle.classifySatNum(id);

        if (kind === 'invalid') {
          continue;
        }

        // Normalize to the display-canonical numeric form so OemSatellite.sccNum
        // matches the convention used by Satellite (alpha-5 "T0001" → "270001",
        // leading zeros stripped). The alpha-5 string is preserved on sccNum5.
        // Tle.convertA5to6Digit THROWS for extended IDs beyond TLE alpha-5
        // capacity (a 6-digit value > 339999); guard it the same way
        // Satellite.assignAlpha5Forms_ does and keep the original as canonical.
        let normalizedScc = id;

        try {
          normalizedScc = Tle.convertA5to6Digit(id);
        } catch {
          // Extended (e.g. 6-digit > 339999) — leave the numeric form untouched.
        }
        this.sccNum = normalizedScc.replace(/^0+(?=\d)/u, '');
        if (kind === 'numeric5' || kind === 'alpha5' || kind === 'numeric6') {
          this.sccNum5 = Tle.convert6DigitToA5(this.sccNum);
          this.sccNum6 = this.sccNum;
        } else {
          this.sccNum5 = null;
          this.sccNum6 = null;
        }
        // With a real NORAD ID, this is a known payload not a notional object
        this.type = SpaceObjectType.PAYLOAD;
        break;
      }
    }

    this.intlDes = oem.dataBlocks[0]?.metadata.OBJECT_ID ?? '';

    // Extract USER_DEFINED_ metadata (CCSDS 502.0-B-3 Section 7.5.1)
    this.applyUserDefinedMetadata_(oem.dataBlocks[0]?.metadata.USER_DEFINED);

    EventBus.getInstance().on(EventBusEvent.onLinesCleared, () => {
      this.removeFullOrbitPath();
      this.removeOrbitHistory();
    });
  }

  private applyUserDefinedMetadata_(ud?: Record<string, string>): void {
    if (!ud) {
      return;
    }

    this.country = ud.COUNTRY ?? '';
    this.launchSite = ud.LAUNCH_SITE ?? '';
    this.launchPad = ud.LAUNCH_PAD ?? '';
    this.launchVehicle = ud.LAUNCH_VEHICLE ?? '';
    this.configuration = ud.CONFIGURATION ?? '';
    this.mission = ud.MISSION ?? '';
    this.purpose = ud.PURPOSE ?? '';
    this.owner = ud.USER ?? '';
    this.manufacturer = ud.CONTRACTOR ?? '';
    this.bus = ud.BUS ?? '';
    this.launchMass = ud.LAUNCH_MASS ?? '';
    this.dryMass = ud.DRY_MASS ?? '';
    this.lifetime = ud.LIFETIME ?? '';
    this.power = ud.POWER ?? '';
    this.payload = ud.PAYLOAD ?? '';
    this.equipment = ud.EQUIPMENT ?? '';
    this.motor = ud.MOTOR ?? '';
    this.length = ud.LENGTH ?? '';
    this.diameter = ud.DIAMETER ?? '';
    this.span = ud.SPAN ?? '';
    this.shape = ud.SHAPE ?? '';

    if (ud.OBJECT_TYPE) {
      const typeMap: Record<string, SpaceObjectType> = {
        PAYLOAD: SpaceObjectType.PAYLOAD,
        ROCKET_BODY: SpaceObjectType.ROCKET_BODY,
        DEBRIS: SpaceObjectType.DEBRIS,
        SPECIAL: SpaceObjectType.SPECIAL,
      };

      this.type = typeMap[ud.OBJECT_TYPE.toUpperCase()] ?? this.type;
    }

    if (ud.SOURCE) {
      this.source = ud.SOURCE;
    }
  }

  isSatellite(): boolean {
    return true; // OEM objects are always satellites
  }

  isGroundObject(): boolean {
    return false;
  }

  isSensor(): boolean {
    return false;
  }

  isMarker(): boolean {
    return false;
  }

  isStatic(): boolean {
    return false;
  }

  isPayload(): boolean {
    return false;
  }

  isRocketBody(): boolean {
    return false;
  }

  isDebris(): boolean {
    return false;
  }

  isStar(): boolean {
    return false;
  }

  isMissile(): boolean {
    return false;
  }

  getRae(now: Date, sensor: DetailedSensor): RaeVec3<Kilometers, Degrees> | null {
    const eciResult = this.eci(now);

    if (!eciResult) {
      return null;
    }

    return eci2rae(now, eciResult.position, sensor);
  }

  getTearData(now: Date, sensors: DetailedSensor[], isRiseSetOnly = false, isMaxElFound = false): TearrData {
    const sensor = sensors[0];
    const aer = this.getRae(now, sensor);

    if (!aer) {
      return { time: '', rng: null, az: null, el: null };
    }

    const isInFOV = SatMath.checkIsInView(sensor, aer);

    if (aer.az && aer.el && aer.rng && isInFOV) {
      if (isRiseSetOnly) {
        const now1 = new Date();

        now1.setTime(Number(now) - 1000);
        const aerPrevious = this.getRae(now1, sensor);
        const isInFOVPrevious = aerPrevious ? SatMath.checkIsInView(sensor, aerPrevious) : false;
        let isRise = false;

        if (!isInFOVPrevious) {
          isRise = true;
        }

        now1.setTime(Number(now) + 1000);
        const aerNext = this.getRae(now1, sensor);
        const isInFOVNext = aerNext ? SatMath.checkIsInView(sensor, aerNext) : false;

        if (!isMaxElFound && aerNext?.el && aerNext.el < aer.el) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            type: isRise ? TearrType.RISE_AND_MAX_EL : TearrType.MAX_EL,
            inView: isInFOV,
            objName: sensor.objName,
          };
        } else if (isRise) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            type: TearrType.RISE,
            inView: isInFOV,
            objName: sensor.objName,
          };
        }

        if (!isInFOVNext) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            type: !isMaxElFound ? TearrType.MAX_EL_AND_SET : TearrType.SET,
            inView: isInFOV,
            objName: sensor.objName,
          };
        }

        return {
          time: '',
          rng: null,
          az: null,
          el: null,
          inView: isInFOV,
          objName: sensor.objName,
        };
      }

      return {
        time: dateFormat(now, 'isoDateTime', true),
        rng: aer.rng,
        az: aer.az,
        el: aer.el,
        inView: isInFOV,
        objName: sensor.objName,
      };
    }

    return {
      time: '',
      rng: aer.rng,
      az: aer.az,
      el: aer.el,
      inView: isInFOV,
      objName: sensor.objName,
    };
  }

  updatePosAndVel(simTime: Seconds): [number, number, number, number, number, number] | null {
    if (!this?.OemDataBlocks || this.OemDataBlocks.length === 0) {
      return null;
    }

    // Detect ECF mode toggle and regenerate orbit visualizations
    const currentEcfMode = settingsManager.isOrbitCruncherInEcf;

    if (currentEcfMode !== this.lastEcfMode_) {
      this.lastEcfMode_ = currentEcfMode;
      const hadFullPath = !!this.orbitFullPathLine;

      this.removeFullOrbitPath();
      this.removeOrbitHistory();
      this.pointsForOrbitPath = null;
      if (hadFullPath) {
        this.drawFullOrbitPath();
      }
      if (this.isDrawOrbitHistory) {
        this.drawOrbitHistory();
      }
    }

    if (this.isDrawOrbitHistory) {
      const stateChanged = this.stateVectorIdx_ !== this.lastHistoryStateVectorIdx_ ||
        this.dataBlockIdx_ !== this.lastHistoryDataBlockIdx_;

      if (stateChanged) {
        this.lastHistoryStateVectorIdx_ = this.stateVectorIdx_;
        this.lastHistoryDataBlockIdx_ = this.dataBlockIdx_;
        this.drawOrbitHistory();
      } else {
        // Always update the trailing endpoint so the history line tracks the satellite smoothly
        this.updateHistoryEndpoint_();
      }
    }

    // Update indices for orbit history drawing and segment caching
    this.findStateVectorTime_(simTime);

    // Use Lagrange polynomial interpolation for position and velocity
    const epoch = new EpochUTC(simTime);
    const interpolated = this.lagrangeInterpolator?.interpolate(epoch);

    if (!interpolated) {
      return null;
    }

    const teme = interpolated.toTEME();

    let offsetOrigin = { position: { x: 0, y: 0, z: 0 } };

    if (this.isInertialMoonFrame && this.centerBody === SolarBody.Moon) {
      offsetOrigin = ServiceLocator.getScene().moons.Moon.getTeme(ServiceLocator.getTimeManager().simulationTimeObj);
    } else if (this.centerBody === SolarBody.Mars) {
      const eci = ServiceLocator.getScene().planets.Mars.position;

      offsetOrigin = {
        position: {
          x: eci[0],
          y: eci[1],
          z: eci[2],
        },
      };
    }

    const posAndVel = [
      teme.position.x + offsetOrigin.position.x,
      teme.position.y + offsetOrigin.position.y,
      teme.position.z + offsetOrigin.position.z,
      teme.velocity.x,
      teme.velocity.y,
      teme.velocity.z,
    ] as [number, number, number, number, number, number];

    this.position = { x: posAndVel[0] as Kilometers, y: posAndVel[1] as Kilometers, z: posAndVel[2] as Kilometers };

    return posAndVel;
  }

  private findStateVectorTime_(simTime: number): void {
    // Start from last known position (cache optimization)
    const startBlock = this.dataBlockIdx ?? 0;
    const startVector = this.stateVectorIdx ?? 0;

    // First check if we're still in the same vector range (common case for sequential access)
    if (startBlock < this.OemDataBlocks.length) {
      const vectors = this.OemDataBlocks[startBlock].ephemeris;

      if (startVector < vectors.length) {
        const currentTime = vectors[startVector].epoch.posix;
        const nextTime = vectors[startVector + 1]?.epoch.posix ?? Infinity;

        if (currentTime <= simTime && nextTime > simTime) {
          // Still in same position, no search needed
          return;
        }
      }
    }

    // Determine search direction and range based on whether time moved forward or backward
    let searchStart = 0;
    let searchEnd = this.OemDataBlocks.length;

    if (startBlock < this.OemDataBlocks.length) {
      const currentBlockVectors = this.OemDataBlocks[startBlock].ephemeris;
      const cachedTime = currentBlockVectors[startVector]?.epoch.posix;

      if (cachedTime) {
        if (simTime >= cachedTime) {
          // Time moved forward, search from current position onward
          searchStart = startBlock;
        } else {
          // Time moved backward, search from beginning up to current position
          searchEnd = startBlock + 1;
        }
      }
    }

    // Search through the determined range
    for (let i = searchStart; i < searchEnd; i++) {
      const vectors = this.OemDataBlocks[i].ephemeris;

      // Skip this block if simTime is before it starts
      if (simTime < vectors[0].epoch.posix) {
        continue;
      }

      // Skip this block if simTime is after it ends (unless it's the last block)
      if (i < this.OemDataBlocks.length - 1 &&
        simTime >= vectors[vectors.length - 1].epoch.posix) {
        continue;
      }

      // Binary search within this block
      let left = 0;
      let right = vectors.length - 1;

      // Optimize starting position for forward time progression in same block
      if (i === startBlock && simTime >= vectors[startVector]?.epoch.posix) {
        left = startVector;
      }

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const currentTime = vectors[mid].epoch.posix;
        const nextTime = vectors[mid + 1]?.epoch.posix ?? Infinity;

        if (currentTime <= simTime && nextTime > simTime) {
          // Found the correct interval
          this.dataBlockIdx = i;
          this.stateVectorIdx = mid;

          return;
        } else if (currentTime > simTime) {
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }

      // Handle last vector in last block
      if (i === this.OemDataBlocks.length - 1 &&
        simTime >= vectors[vectors.length - 1].epoch.posix) {
        this.dataBlockIdx = i;
        this.stateVectorIdx = vectors.length - 1;

        return;
      }
    }
  }

  getOrbitPath(): Float32Array {
    if (!this.orbitFullPathCache_) {
      this.generateOrbitPath_();
    }

    if (this.orbitFullPathCache_) {
      this.updatePosAndVel(ServiceLocator.getTimeManager().simulationTimeObj.getTime() / 1000 as Seconds); // Ensure current indices are up to date

      return this.getSegmentsFromCache_();
    }

    // Fallback: return the whole cached path
    this.orbitPathCache_ = this.orbitFullPathCache_;

    return this.orbitFullPathCache_!;
  }

  private generateOrbitPath_(): Float32Array {
    this.pointsTeme = [];
    const epochs: number[] = [];

    for (const block of this.OemDataBlocks) {
      for (const stateVector of block.ephemeris) {
        const teme = stateVector.toTEME();
        const epochMs = teme.epoch.posix * 1000;

        this.pointsTeme.push([teme.position.x, teme.position.y, teme.position.z, epochMs]);
        epochs.push(epochMs);
      }
    }

    const pointsOut = new Float32Array(this.pointsTeme.flat());

    this.orbitPathCache_ = pointsOut;
    this.orbitFullPathCache_ = pointsOut;
    this.epochCache_ = new Float64Array(epochs);

    return pointsOut;
  }

  /**
   * Compute the number of data points to span from `currentIndex`, targeting
   * one orbital period. Falls back to remaining data when the period is unknown.
   * Capped at the remaining data so callers never index past the end.
   */
  private computeOrbitSpan_(currentIndex: number, totalPoints: number): number {
    const remainingCount = totalPoints - currentIndex;

    if (remainingCount <= 1 || !this.epochCache_) {
      return remainingCount;
    }

    let spanCount = remainingCount;

    try {
      const periodMin = this.toClassicalElements().period;

      if (periodMin > 0 && isFinite(periodMin)) {
        const endEpochMs = this.epochCache_[currentIndex] + periodMin * 60_000;
        let left = currentIndex;
        let right = totalPoints - 1;

        while (left < right) {
          const mid = (left + right) >>> 1;

          if (this.epochCache_[mid] < endEpochMs) {
            left = mid + 1;
          } else {
            right = mid;
          }
        }
        spanCount = Math.min(remainingCount, Math.max(1, left - currentIndex));
      }
    } catch { /* Classical elements unavailable */ }

    return spanCount;
  }

  private getSegmentsFromCache_() {
    if (!this.orbitFullPathCache_) {
      throw new Error('Orbit full path cache is not available.');
    }

    let offsetOrigin = { position: { x: 0, y: 0, z: 0 } };

    if (this.isInertialMoonFrame) {
      offsetOrigin = ServiceLocator.getScene().moons.Moon.getTeme(ServiceLocator.getTimeManager().simulationTimeObj);
    } else if (this.centerBody === SolarBody.Mars) {
      const eci = ServiceLocator.getScene().planets.Mars.position;

      offsetOrigin = {
        position: {
          x: eci[0],
          y: eci[1],
          z: eci[2],
        },
      };
    }

    // Match orbit cruncher: output ECEF when ECF mode is on (Earth only)
    const isEcf = settingsManager.isOrbitCruncherInEcf && this.centerBody === SolarBody.Earth;

    const currentIndex = this.computeGlobalIndex_();
    const totalPoints = Math.floor(this.orbitFullPathCache_.length / 4);

    // Compute the span of data points to display (one orbital period or remaining data).
    const spanCount = this.computeOrbitSpan_(currentIndex, totalPoints);

    // Clamp span to available data so we never index past the end.
    const lastValidIndex = Math.min(currentIndex + spanCount, totalPoints - 1);
    const actualSpan = lastValidIndex - currentIndex;

    // +1 for the interpolated current position as the first point
    const outputCount = actualSpan + 1;
    const pointsOut = new Float32Array(outputCount * 4);

    // First point is always the current interpolated position
    let px: number = this.position.x;
    let py: number = this.position.y;
    let pz: number = this.position.z;

    if (settingsManager.centerBody !== SolarBody.Earth) {
      px = px - offsetOrigin.position.x as Kilometers;
      py = py - offsetOrigin.position.y as Kilometers;
      pz = pz - offsetOrigin.position.z as Kilometers;
    }

    if (isEcf) {
      const { gmst } = calcGmst(ServiceLocator.getTimeManager().simulationTimeObj);
      const ecef = eci2ecef({ x: px, y: py, z: pz } as TemeVec3, gmst);

      px = ecef.x;
      py = ecef.y;
      pz = ecef.z;
    }

    pointsOut[0] = px;
    pointsOut[1] = py;
    pointsOut[2] = pz;
    pointsOut[3] = 1.0;

    // Remaining points: use every raw ephemeris data point (no downsampling)
    for (let i = 1; i < outputCount; i++) {
      const idx = currentIndex + i;

      if (idx < totalPoints) {
        let deltaOffsetPos = { x: 0, y: 0, z: 0 };

        if (this.isInertialMoonFrame) {
          if (!this.moonPositionCache_[idx]) {
            this.moonPositionCache_[idx] = ServiceLocator.getScene().moons.Moon.getTeme(new Date(this.epochCache_![idx]));
          }

          const newOffsetPos = this.moonPositionCache_[idx];

          deltaOffsetPos = {
            x: newOffsetPos.position.x - offsetOrigin.position.x,
            y: newOffsetPos.position.y - offsetOrigin.position.y,
            z: newOffsetPos.position.z - offsetOrigin.position.z,
          };
        }

        let x = this.orbitFullPathCache_[idx * 4] - deltaOffsetPos.x;
        let y = this.orbitFullPathCache_[idx * 4 + 1] - deltaOffsetPos.y;
        let z = this.orbitFullPathCache_[idx * 4 + 2] - deltaOffsetPos.z;

        // Convert TEME→ECEF if in ECF mode (matching orbit cruncher approach)
        if (isEcf) {
          const epochMs = this.epochCache_![idx];
          const { gmst } = calcGmst(new Date(epochMs));
          const ecef = eci2ecef({ x, y, z } as TemeVec3, gmst);

          x = ecef.x;
          y = ecef.y;
          z = ecef.z;
        }

        pointsOut[i * 4] = x;
        pointsOut[i * 4 + 1] = y;
        pointsOut[i * 4 + 2] = z;
        pointsOut[i * 4 + 3] = 1.0;
      } else {
        // Past end of data — make invisible (alpha=0 hides the segment)
        pointsOut[i * 4 + 3] = 0.0;
      }
    }

    this.orbitPathCache_ = pointsOut;

    return pointsOut;
  }

  drawOrbitHistory(): void {
    if (!this.orbitFullPathCache_) {
      this.generateOrbitPath_();
    }

    const cache = this.orbitFullPathCache_!;
    const dataPointCount = Math.min(this.computeGlobalIndex_() + 1, cache.length / 4);
    // +1 for the interpolated current-position endpoint
    const totalPoints = dataPointCount + 1;
    const requiredSize = totalPoints * 4;

    if (!this.historyBuffer_ || this.historyBuffer_.length < requiredSize) {
      this.historyBuffer_ = new Float32Array(requiredSize);
    }

    const isEcf = settingsManager.isOrbitCruncherInEcf && this.centerBody === SolarBody.Earth;
    let writeIdx = 0;

    for (let i = 0; i < dataPointCount; i++) {
      const srcIdx = i * 4;
      let x = cache[srcIdx];
      let y = cache[srcIdx + 1];
      let z = cache[srcIdx + 2];

      if (isEcf) {
        const { gmst } = calcGmst(new Date(this.epochCache_![i]));
        const ecef = eci2ecef({ x, y, z } as TemeVec3, gmst);

        x = ecef.x;
        y = ecef.y;
        z = ecef.z;
      }

      this.historyBuffer_[writeIdx] = x;
      this.historyBuffer_[writeIdx + 1] = y;
      this.historyBuffer_[writeIdx + 2] = z;
      this.historyBuffer_[writeIdx + 3] = 1.0;
      writeIdx += 4;
    }

    // Append the interpolated current position as an extra trailing point
    this.writeCurrentPositionToBuffer_(writeIdx, isEcf);
    writeIdx += 4;

    this.historyPointCount_ = totalPoints;

    if (this.orbitHistoryLine) {
      this.orbitHistoryLine.updateData(this.historyBuffer_.subarray(0, writeIdx), totalPoints);
    } else {
      const tempPoints: [number, number, number][] = [];

      for (let i = 0; i < totalPoints; i++) {
        const idx = i * 4;

        tempPoints.push([this.historyBuffer_[idx], this.historyBuffer_[idx + 1], this.historyBuffer_[idx + 2]]);
      }
      this.orbitHistoryLine = ServiceLocator.getLineManager().createOrbitPath(tempPoints, this.orbitColor ?? LineColors.GREEN, SolarBody.Earth);
    }
  }

  /** Write the current interpolated position into the history buffer at the given byte offset. */
  private writeCurrentPositionToBuffer_(offset: number, isEcf: boolean): void {
    if (!this.position || !this.historyBuffer_) {
      return;
    }

    let { x, y, z } = this.position;

    if (isEcf) {
      const { gmst } = calcGmst(ServiceLocator.getTimeManager().simulationTimeObj);
      const ecef = eci2ecef({ x, y, z } as TemeVec3, gmst);

      x = ecef.x;
      y = ecef.y;
      z = ecef.z;
    }

    this.historyBuffer_[offset] = x;
    this.historyBuffer_[offset + 1] = y;
    this.historyBuffer_[offset + 2] = z;
    this.historyBuffer_[offset + 3] = 1.0;
  }

  /** Lightweight per-frame update: move the trailing endpoint to the current interpolated position. */
  private updateHistoryEndpoint_(): void {
    if (!this.orbitHistoryLine || !this.historyBuffer_ || this.historyPointCount_ < 1) {
      return;
    }

    const isEcf = settingsManager.isOrbitCruncherInEcf && this.centerBody === SolarBody.Earth;
    const lastPointOffset = (this.historyPointCount_ - 1) * 4;

    this.writeCurrentPositionToBuffer_(lastPointOffset, isEcf);
    this.orbitHistoryLine.updateData(
      this.historyBuffer_.subarray(0, this.historyPointCount_ * 4),
      this.historyPointCount_,
    );
  }

  private computeGlobalIndex_(): number {
    let index = 0;

    for (let i = 0; i < this.dataBlockIdx; i++) {
      index += this.OemDataBlocks[i].ephemeris.length;
    }

    return index + this.stateVectorIdx;
  }

  removeOrbitHistory(): void {
    if (this.orbitHistoryLine) {
      this.orbitHistoryLine.isGarbage = true;
      this.orbitHistoryLine = null;
    }
    this.historyBuffer_ = null;
    this.historyPointCount_ = 0;
    this.lastHistoryStateVectorIdx_ = -1;
    this.lastHistoryDataBlockIdx_ = -1;
  }

  drawFullOrbitPath(): void {
    if (this.orbitFullPathLine) {
      return;
    }

    const isEcf = settingsManager.isOrbitCruncherInEcf && this.centerBody === SolarBody.Earth;

    // Reuse cached ECI points when not in ECF mode
    if (!isEcf && this.pointsForOrbitPath) {
      this.orbitFullPathLine = ServiceLocator.getLineManager().createOrbitPath(this.pointsForOrbitPath, this.orbitFullPathColor, SolarBody.Earth);

      return;
    }

    const points: [number, number, number][] = [];

    for (const block of this.OemDataBlocks) {
      for (const stateVector of block.ephemeris) {
        const teme = stateVector.toTEME();

        if (isEcf) {
          const { gmst } = calcGmst(new Date(teme.epoch.posix * 1000));
          const ecef = eci2ecef({ x: teme.position.x, y: teme.position.y, z: teme.position.z } as TemeVec3, gmst);

          points.push([ecef.x, ecef.y, ecef.z]);
        } else {
          points.push([teme.position.x, teme.position.y, teme.position.z]);
        }
      }
    }

    if (!isEcf) {
      this.pointsForOrbitPath = points;
    }

    this.orbitFullPathLine = ServiceLocator.getLineManager().createOrbitPath(points, this.orbitFullPathColor, SolarBody.Earth);
  }

  removeFullOrbitPath(): void {
    if (this.orbitFullPathLine) {
      this.orbitFullPathLine.isGarbage = true;
      this.orbitFullPathLine = null;
    }
  }

  // ==================== SpaceObject Abstract Method Implementations ====================

  ecef(date?: Date): EcefVec3<Kilometers> | null {
    const eciResult = this.eci(date);

    if (!eciResult) {
      return null;
    }

    const effectiveDate = date ?? ServiceLocator.getTimeManager().simulationTimeObj;
    const { gmst } = calcGmst(effectiveDate);

    return eci2ecef(eciResult.position, gmst);
  }

  lla(date?: Date): LlaVec3<Degrees, Kilometers> | null {
    const eciResult = this.eci(date);

    if (!eciResult) {
      return null;
    }

    const effectiveDate = date ?? ServiceLocator.getTimeManager().simulationTimeObj;
    const { gmst } = calcGmst(effectiveDate);
    const eciPos: TemeVec3 = {
      x: eciResult.position.x,
      y: eciResult.position.y,
      z: eciResult.position.z,
    };

    return eci2lla(eciPos, gmst);
  }

  toJ2000(date?: Date): J2000 {
    const effectiveDate = date ?? ServiceLocator.getTimeManager().simulationTimeObj;
    const posix = effectiveDate.getTime() / 1000;

    // Find the closest state vector to the requested time
    for (const block of this.OemDataBlocks) {
      for (const stateVector of block.ephemeris) {
        if (stateVector.epoch.posix >= posix) {
          return stateVector;
        }
      }
    }

    // Return the last state vector if time is beyond the ephemeris
    const lastBlock = this.OemDataBlocks[this.OemDataBlocks.length - 1];

    return lastBlock.ephemeris[lastBlock.ephemeris.length - 1];
  }

  toITRF(date?: Date): ITRF {
    return this.toJ2000(date).toITRF();
  }

  toClassicalElements(date?: Date): ClassicalElements {
    const j2000 = this.toJ2000(date);

    return j2000.toClassicalElements();
  }

  clone(_options?: Record<string, unknown>): OemSatellite {
    const parsedOem: ParsedOem = {
      header: { ...this.header },
      dataBlocks: this.OemDataBlocks.map((block) => ({
        metadata: { ...block.metadata },
        ephemeris: [...block.ephemeris],
        covariance: block.covariance ? [...block.covariance] : null,
      })),
    };

    const cloned = new OemSatellite(parsedOem);

    cloned.model = this.model;
    cloned.source = this.source;
    cloned.centerBody = this.centerBody;
    cloned.isInertialMoonFrame = this.isInertialMoonFrame;
    cloned.orbitColor = vec4.clone(this.orbitColor);
    cloned.orbitFullPathColor = vec4.clone(this.orbitFullPathColor);
    cloned.dotColor = [...this.dotColor] as rgbaArray;
    cloned.sccNum = this.sccNum;

    return cloned;
  }

  protected serializeSpecific(): Record<string, unknown> {
    return {
      header: this.header,
      OemDataBlocks: this.OemDataBlocks,
      model: this.model,
      source: this.source,
      centerBody: this.centerBody,
      isInertialMoonFrame: this.isInertialMoonFrame,
      orbitColor: Array.from(this.orbitColor),
      orbitFullPathColor: Array.from(this.orbitFullPathColor),
      dotColor: this.dotColor,
      sccNum: this.sccNum,
    };
  }
}
