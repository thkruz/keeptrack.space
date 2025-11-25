import { rgbaArray, SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { LagrangeInterpolator } from '@app/engine/ootk/src/interpolator/LagrangeInterpolator';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { OrbitPathLine } from '@app/engine/rendering/line-manager/orbit-path';
import { BaseObject, J2000, Kilometers, Seconds, SpaceObjectType, TEME } from '@ootk/src/main';
import { vec4 } from 'gl-matrix';
import { SatelliteModels } from '../rendering/mesh/model-resolver';

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
  CENTER_NAME: 'EARTH' | 'MARS BARYCENTER';
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


export class OemSatellite extends BaseObject {
  header: OemHeader;
  OemDataBlocks: OemDataBlock[];
  model: keyof typeof SatelliteModels = SatelliteModels.aehf;
  isStable = true;
  source: string;
  orbitPathCache_: Float32Array | null = null;
  stateVectorIdx_: number = 0;
  dataBlockIdx_: number = 0;
  orbitFullPathCache_: Float32Array | null = null;
  /** Cached points for drawing the full orbit path */
  pointsForOrbitPath: [number, number, number][] | null = null;
  orbitFullPathLine: OrbitPathLine | null = null;
  orbitHistoryLine: OrbitPathLine | null = null;
  isDrawOrbitHistory = true;
  lagrangeInterpolator: LagrangeInterpolator | null = null;
  pointsTeme: [number, number, number, number][] = [];
  pointsJ2000: [number, number, number, number][] = [];
  moonPositionCache_: { [key: number]: { position: { x: number; y: number; z: number } } } = {};

  orbitColor: vec4 = LineColors.GREEN;
  dotColor: rgbaArray = [0, 255, 0, 1];

  eci(date: Date): { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } } | null {
    const posAndVel = this.updatePosAndVel(date.getTime() / 1000 as Seconds);

    if (!posAndVel) {
      return null;
    }

    return {
      position: { x: posAndVel[0], y: posAndVel[1], z: posAndVel[2] },
      velocity: { x: posAndVel[3], y: posAndVel[4], z: posAndVel[5] },
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
    this.orbitPathCache_ = this.getOrbitPath(settingsManager.oemOrbitSegments);
  }

  get dataBlockIdx(): number {
    return this.dataBlockIdx_;
  }

  set dataBlockIdx(value: number) {
    if (this.dataBlockIdx_ === value) {
      return;
    }

    this.dataBlockIdx_ = value;
    this.orbitPathCache_ = this.getOrbitPath(settingsManager.oemOrbitSegments);
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
      case 'EARTH':
      default:
        this.centerBody = SolarBody.Earth;
        break;
    }

    this.OemDataBlocks = oem.dataBlocks;
    this.lagrangeInterpolator = LagrangeInterpolator.fromEphemeris(this.OemDataBlocks.flatMap((block) => block.ephemeris), this.OemDataBlocks[0].metadata.INTERPOLATION_DEGREE);
    this.source = 'OEM Import';
    this.header = oem.header;

    EventBus.getInstance().on(EventBusEvent.onLinesCleared, () => {
      this.removeFullOrbitPath();
    });
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

  updatePosAndVel(simTime: Seconds): [number, number, number, number, number, number] | null {
    if (!this?.OemDataBlocks || this.OemDataBlocks.length === 0) {
      return null;
    }

    if (this.isDrawOrbitHistory) {
      this.drawOrbitHistory();
    }

    const posAndVel = [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number];
    let dt = 0;

    this.findStateVectorTime_(simTime);

    dt = (simTime - this.OemDataBlocks[this.dataBlockIdx].ephemeris[this.stateVectorIdx].epoch.posix) as Seconds;

    const currentSv: TEME = this.OemDataBlocks[this.dataBlockIdx].ephemeris[this.stateVectorIdx].toTEME();

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

    const nextSv: TEME =
      this.OemDataBlocks[this.dataBlockIdx].ephemeris[this.stateVectorIdx + 1]?.toTEME() ??
      this.OemDataBlocks[this.dataBlockIdx + 1]?.ephemeris[0]?.toTEME() ??
      currentSv;

    // interpolate position linearly between current and next state vector
    const totalDt = (nextSv.epoch.posix - currentSv.epoch.posix) as Seconds;

    if (totalDt > 0) {
      posAndVel[0] = (currentSv.position.x + offsetOrigin.position.x) + ((nextSv.position.x - currentSv.position.x) * dt) / totalDt;
      posAndVel[1] = (currentSv.position.y + offsetOrigin.position.y) + ((nextSv.position.y - currentSv.position.y) * dt) / totalDt;
      posAndVel[2] = (currentSv.position.z + offsetOrigin.position.z) + ((nextSv.position.z - currentSv.position.z) * dt) / totalDt;
    } else {
      posAndVel[0] = currentSv.position.x + offsetOrigin.position.x;
      posAndVel[1] = currentSv.position.y + offsetOrigin.position.y;
      posAndVel[2] = currentSv.position.z + offsetOrigin.position.z;
    }

    this.position = { x: posAndVel[0] as Kilometers, y: posAndVel[1] as Kilometers, z: posAndVel[2] as Kilometers };

    // set velocity to current state vector velocity
    posAndVel[3] = currentSv.velocity.x;
    posAndVel[4] = currentSv.velocity.y;
    posAndVel[5] = currentSv.velocity.z;

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

  getOrbitPath(segments?: number): Float32Array {
    if (!this.orbitFullPathCache_) {
      this.generateOrbitPath_();
    }

    // If segments is specified and cached path exists, return only the
    // requested segments starting with current position
    if (this.orbitFullPathCache_ && segments) {
      this.updatePosAndVel(ServiceLocator.getTimeManager().simulationTimeObj.getTime() / 1000 as Seconds); // Ensure current indices are up to date

      return this.getSegmentsFromCache_(segments);
    }

    if (segments) {
      return this.getOrbitPath(segments);
    }

    // Return the whole cached path if segments is not specified
    this.orbitPathCache_ = this.orbitFullPathCache_;

    return this.orbitFullPathCache_!;
  }

  private generateOrbitPath_(): Float32Array {
    for (const block of this.OemDataBlocks) {
      for (const stateVector of block.ephemeris) {
        const j2000 = stateVector;
        const teme = stateVector.toTEME();

        this.pointsTeme.push([teme.position.x, teme.position.y, teme.position.z, teme.epoch.posix * 1000]);
        this.pointsJ2000.push([j2000.position.x, j2000.position.y, j2000.position.z, j2000.epoch.posix * 1000]);
      }
    }

    const pointsOut = new Float32Array(this.pointsTeme.flat());

    this.orbitPathCache_ = pointsOut;
    this.orbitFullPathCache_ = pointsOut;

    return pointsOut;
  }

  private getSegmentsFromCache_(segments: number) {
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

    // Calculate current position based on this.dataBlockIdx and this.stateVectorIdx
    let currentIndex = 0;

    for (let i = 0; i < this.dataBlockIdx; i++) {
      currentIndex += this.OemDataBlocks[i].ephemeris.length;
    }
    currentIndex += this.stateVectorIdx;

    const pointsOut = new Float32Array(segments * 4);
    let loopIdx = 0;

    // Fill pointsOut starting from currentIndex
    for (let i = 0; i < segments; i++) {
      if (i === 0) {
        if (settingsManager.centerBody !== SolarBody.Earth) {
          pointsOut[i * 4] = this.position.x - offsetOrigin.position.x;
          pointsOut[i * 4 + 1] = this.position.y - offsetOrigin.position.y;
          pointsOut[i * 4 + 2] = this.position.z - offsetOrigin.position.z;
        } else {
          pointsOut[i * 4] = this.position.x;
          pointsOut[i * 4 + 1] = this.position.y;
          pointsOut[i * 4 + 2] = this.position.z;
        }
        pointsOut[i * 4 + 3] = 1.0; // Alpha channel
      } else {
        const idx = (currentIndex + i);

        if (idx < this.orbitFullPathCache_.length / 4) {
          let deltaOffsetPos = { x: 0, y: 0, z: 0 };

          if (this.isInertialMoonFrame) {
            if (!this.moonPositionCache_[idx]) {
              this.moonPositionCache_[idx] = ServiceLocator.getScene().moons.Moon.getTeme(new Date(this.orbitFullPathCache_[idx * 4 + 3]));
            }

            const newOffsetPos = this.moonPositionCache_[idx];

            deltaOffsetPos = {
              x: newOffsetPos.position.x - offsetOrigin.position.x,
              y: newOffsetPos.position.y - offsetOrigin.position.y,
              z: newOffsetPos.position.z - offsetOrigin.position.z,
            };
          }

          pointsOut[i * 4] = this.orbitFullPathCache_[idx * 4] - deltaOffsetPos.x;
          pointsOut[i * 4 + 1] = this.orbitFullPathCache_[idx * 4 + 1] - deltaOffsetPos.y;
          pointsOut[i * 4 + 2] = this.orbitFullPathCache_[idx * 4 + 2] - deltaOffsetPos.z;
          pointsOut[i * 4 + 3] = 1.0; // Alpha channel

          loopIdx = i;
        } else {
          // If we exceed the available points, continue using the last point in a looped fashion
          pointsOut[i * 4] = pointsOut[loopIdx * 4];
          pointsOut[i * 4 + 1] = pointsOut[loopIdx * 4 + 1];
          pointsOut[i * 4 + 2] = pointsOut[loopIdx * 4 + 2];
          pointsOut[i * 4 + 3] = 1.0; // Alpha channel
        }
      }
    }

    this.orbitPathCache_ = pointsOut;

    return pointsOut;
  }

  drawOrbitHistory(): void {
    if (!this.orbitFullPathCache_) {
      this.generateOrbitPath_();
    }

    const lineManager = ServiceLocator.getLineManager();
    const points: [number, number, number][] = [];

    // Calculate current position based on this.dataBlockIdx and this.stateVectorIdx
    let currentIndex = 0;

    for (let i = 0; i < this.dataBlockIdx; i++) {
      currentIndex += this.OemDataBlocks[i].ephemeris.length;
    }
    currentIndex += this.stateVectorIdx;

    // Starting at currentIndex, go backwards to the start
    for (let i = currentIndex; i >= 0; i--) {
      const idx = i;

      if (idx < this.orbitFullPathCache_!.length / 4) {
        points.push([
          this.orbitFullPathCache_![idx * 4],
          this.orbitFullPathCache_![idx * 4 + 1],
          this.orbitFullPathCache_![idx * 4 + 2],
        ]);
      }
    }

    // Set the last point to the current position
    if (this.position) {
      points[0] = [
        this.position.x,
        this.position.y,
        this.position.z,
      ];
    }

    if (this.orbitHistoryLine) {
      this.orbitHistoryLine.isGarbage = true;
    }

    this.orbitHistoryLine = lineManager.createOrbitPath(points, this.orbitColor ?? LineColors.GREEN, SolarBody.Earth);
  }

  removeOrbitHistory(): void {
    if (this.orbitHistoryLine) {
      this.orbitHistoryLine.isGarbage = true;
      this.orbitHistoryLine = null;
    }
  }

  drawFullOrbitPath(): void {
    if (this.orbitFullPathLine) {
      return;
    }

    const lineManager = ServiceLocator.getLineManager();
    const points: [number, number, number][] = [];

    if (!this.pointsForOrbitPath) {
      for (const block of this.OemDataBlocks) {
        for (const stateVector of block.ephemeris) {
          const teme = stateVector.toTEME();

          points.push([teme.position.x, teme.position.y, teme.position.z]);
        }
      }

      this.pointsForOrbitPath = points;
    }

    this.orbitFullPathLine = lineManager.createOrbitPath(this.pointsForOrbitPath, LineColors.BLUE, SolarBody.Earth);
  }

  removeFullOrbitPath(): void {
    if (this.orbitFullPathLine) {
      this.orbitFullPathLine.isGarbage = true;
      this.orbitFullPathLine = null;
    }
  }
}
