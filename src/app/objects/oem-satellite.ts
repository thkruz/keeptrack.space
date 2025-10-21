import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { Body } from 'astronomy-engine';
import { BaseObject, J2000, Seconds, SpaceObjectType, TEME } from 'ootk';
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
  stateVectors: (J2000 | TEME)[];
  covariance?: OemCovarianceMatrix[] | null;
}

export interface ParsedOem {
  header: OemHeader;
  dataBlocks: OemDataBlock[];
}


export class OemSatellite extends BaseObject {
  header: OemHeader;
  OemDataBlocks: OemDataBlock[];
  model: keyof typeof SatelliteModels = SatelliteModels.s6u;
  isStable = true;
  source: string;
  orbitPathCache_: Float32Array | null = null;
  stateVectorIdx_: number = 0;
  dataBlockIdx_: number = 0;
  orbitFullPathCache_: Float32Array | null = null;
  isDrawingFullOrbitPath = false;
  /** Cached points for drawing the full orbit path */
  pointsForOrbitPath: [number, number, number][] | null = null;

  centerBody: Body = Body.Earth;
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

    if (lastDataBlock.stateVectors.length === 0) {
      throw new Error('No state vectors found in the last data block of the OEM file.');
    }

    const lastStateVector = lastDataBlock.stateVectors[lastDataBlock.stateVectors.length - 1];

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
        this.centerBody = Body.Mars;
        break;
      case 'EARTH':
      default:
        this.centerBody = Body.Earth;
        break;
    }

    this.OemDataBlocks = oem.dataBlocks;
    this.source = 'OEM Import';
    this.header = oem.header;

    EventBus.getInstance().on(EventBusEvent.onLinesCleared, () => {
      this.isDrawingFullOrbitPath = false;
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

    const posAndVel = [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number];
    let dt = 0;

    for (let i = 0; i < this.OemDataBlocks.length; i++) {
      for (let j = 0; j < this.OemDataBlocks[i].stateVectors.length; j++) {
        if (
          (this.OemDataBlocks[i].stateVectors[j].epoch.posix <= simTime && this.OemDataBlocks[i].stateVectors[j + 1]?.epoch.posix > simTime) ||
          (i === this.OemDataBlocks.length - 1 && j === this.OemDataBlocks[i].stateVectors.length - 1 && simTime >= this.OemDataBlocks[i].stateVectors[j].epoch.posix)
        ) {
          this.dataBlockIdx = i;
          this.stateVectorIdx = j;
          break;
        }
      }
    }

    dt = (simTime - this.OemDataBlocks[this.dataBlockIdx].stateVectors[this.stateVectorIdx].epoch.posix) as Seconds;

    const currentSv = this.OemDataBlocks[this.dataBlockIdx].stateVectors[this.stateVectorIdx];

    let offsetOrigin = { position: { x: 0, y: 0, z: 0 } };

    if (this.isInertialMoonFrame && this.centerBody === Body.Moon) {
      offsetOrigin = ServiceLocator.getScene().planets.Moon.getTeme(ServiceLocator.getTimeManager().simulationTimeObj);
    } else if (this.centerBody === Body.Mars) {
      const eci = ServiceLocator.getScene().planets.Mars.position;

      offsetOrigin = {
        position: {
          x: eci[0],
          y: eci[1],
          z: eci[2],
        },
      };
    }

    const nextSv =
      this.OemDataBlocks[this.dataBlockIdx].stateVectors[this.stateVectorIdx + 1] ??
      this.OemDataBlocks[this.dataBlockIdx + 1]?.stateVectors[0] ??
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

    // set velocity to current state vector velocity
    posAndVel[3] = currentSv.velocity.x;
    posAndVel[4] = currentSv.velocity.y;
    posAndVel[5] = currentSv.velocity.z;

    return posAndVel;
  }

  eci(simTime: Date) {
    const simTimePosix = simTime.getTime() / 1000;
    const posAndVel = this.updatePosAndVel(simTimePosix as Seconds);

    if (!posAndVel) {
      return null;
    }

    return {
      position: {
        x: posAndVel[0],
        y: posAndVel[1],
        z: posAndVel[2],
      },
      velocity: {
        x: posAndVel[3],
        y: posAndVel[4],
        z: posAndVel[5],
      },
    };
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
    const points: [number, number, number, number][] = [];

    for (const block of this.OemDataBlocks) {
      for (const stateVector of block.stateVectors) {
        points.push([stateVector.epoch.posix * 1000, stateVector.position.x, stateVector.position.y, stateVector.position.z]);
      }
    }

    const pointsOut = new Float32Array(points.length * 4);

    for (let i = 0; i < points.length; i++) {
      pointsOut[i * 4] = points[i][1]; // x
      pointsOut[i * 4 + 1] = points[i][2]; // y
      pointsOut[i * 4 + 2] = points[i][3]; // z
      pointsOut[i * 4 + 3] = points[i][0]; // Store epoch time in milliseconds
    }

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
      offsetOrigin = ServiceLocator.getScene().planets.Moon.getTeme(ServiceLocator.getTimeManager().simulationTimeObj);
    } else if (this.centerBody === Body.Mars) {
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
      currentIndex += this.OemDataBlocks[i].stateVectors.length;
    }
    currentIndex += this.stateVectorIdx;

    const pointsOut = new Float32Array(segments * 4);
    let loopIdx = 0;

    // Fill pointsOut starting from currentIndex
    for (let i = 0; i < segments; i++) {
      const idx = (currentIndex + i);

      if (idx < this.orbitFullPathCache_.length / 4) {
        let deltaOffsetPos = { x: 0, y: 0, z: 0 };

        if (this.isInertialMoonFrame) {
          const newOffsetPos = ServiceLocator.getScene().planets.Moon.getTeme(new Date(this.orbitFullPathCache_[idx * 4 + 3]));

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

    this.orbitPathCache_ = pointsOut;

    return pointsOut;
  }

  drawFullOrbitPath(): void {
    if (this.isDrawingFullOrbitPath) {
      return;
    }

    const lineManager = ServiceLocator.getLineManager();
    const points: [number, number, number][] = [];

    if (!this.pointsForOrbitPath) {
      for (const block of this.OemDataBlocks) {
        for (const stateVector of block.stateVectors) {
          points.push([stateVector.position.x, stateVector.position.y, stateVector.position.z]);
        }
      }

      this.pointsForOrbitPath = points;
    } else {
      points.push(...this.pointsForOrbitPath);
    }

    for (let i = 1; i < points.length; i++) {
      lineManager.createRef2Ref(points[i - 1], points[i], LineColors.BLUE);
    }

    this.isDrawingFullOrbitPath = true;
  }
}
