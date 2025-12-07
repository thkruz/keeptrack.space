/* eslint-disable class-methods-use-this */
import type { ClassicalElements } from '@app/engine/ootk/src/coordinate/ClassicalElements';
import type { ITRF } from '@app/engine/ootk/src/coordinate/ITRF';
import type { J2000 } from '@app/engine/ootk/src/coordinate/J2000';
import { MissileParams } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SpaceObject, SpaceObjectParams, DEG2RAD, Degrees, EcefVec3, Kilometers, LlaVec3, PosVel, Radians, SpaceObjectType, Vector3D, calcGmst, eci2lla, lla2eci, eci2ecef, TemeVec3 } from '@ootk/src/main';

export class MissileObject extends SpaceObject {
  type = SpaceObjectType.BALLISTIC_MISSILE;
  desc: string;
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
  timeList: number[];
  startTime: number;
  maxAlt: number;
  country: string;
  launchVehicle: string;
  lastTime: number;

  private totalVelocity_: number = 0;

  /**
   * Mutable totalVelocity for missiles - overrides the computed getter in SpaceObject.
   * Missiles need smoothed velocity tracking during flight simulation.
   */
  override get totalVelocity(): number {
    return this.totalVelocity_;
  }

  set totalVelocity(value: number) {
    this.totalVelocity_ = value;
  }

  constructor(info: MissileParams & SpaceObjectParams) {
    super(info);
    this.id = info.id ?? 0;
    this.active = info.active;
    this.desc = info.desc;
    this.latList = info.latList;
    this.lonList = info.lonList;
    this.altList = info.altList;
    this.timeList = info.timeList;
    this.startTime = info.startTime;
    this.maxAlt = info.maxAlt;
    this.country = info.country;
    this.launchVehicle = info.launchVehicle;
  }

  isStatic(): boolean {
    return false;
  }

  isMissile(): boolean {
    return true;
  }

  getAltitude(): Kilometers {
    const { gmst } = calcGmst(ServiceLocator.getTimeManager().simulationTimeObj);
    const eciResult = this.eci();

    if (!eciResult) {
      return 0 as Kilometers;
    }

    const eciPos: TemeVec3 = {
      x: eciResult.position.x,
      y: eciResult.position.y,
      z: eciResult.position.z,
    };

    const lla = eci2lla(eciPos, gmst);

    return lla.alt;
  }

  getTimeInTrajectory(): number {
    this.lastTime ??= 0;

    for (let t = this.lastTime; t < this.altList.length; t++) {
      if (this.startTime * 1 + t * 1000 >= ServiceLocator.getTimeManager().simulationTimeObj.getTime()) {
        this.lastTime = t;
        break;
      }
    }

    return this.lastTime;
  }

  eci(_date?: Date): PosVel | null {
    const t = this.getTimeInTrajectory();
    const { gmst } = calcGmst(ServiceLocator.getTimeManager().simulationTimeObj);
    const lat = this.latList[t];
    const lon = this.lonList[t];
    const alt = this.altList[t];

    if (lat === undefined || lon === undefined || alt === undefined) {
      return null;
    }

    const lla = {
      lat: (lat * DEG2RAD) as Radians,
      lon: (lon * DEG2RAD) as Radians,
      alt,
    };

    const eciPos = lla2eci(lla, gmst);

    // Update position cache
    this.position = {
      x: eciPos.x as Kilometers,
      y: eciPos.y as Kilometers,
      z: eciPos.z as Kilometers,
    };

    return {
      position: {
        x: eciPos.x as Kilometers,
        y: eciPos.y as Kilometers,
        z: eciPos.z as Kilometers,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
        z: this.velocity.z,
      },
    };
  }

  /**
   * Get TEME position as Vector3D (for orbit rendering compatibility)
   */
  getEciVector3D(): Vector3D {
    const eciResult = this.eci();

    if (!eciResult) {
      return new Vector3D(0, 0, 0);
    }

    return new Vector3D(eciResult.position.x, eciResult.position.y, eciResult.position.z);
  }

  isGoingUp(): boolean {
    const t = this.getTimeInTrajectory();

    if (this.altList[t] > this.altList[t - 1]) {
      return true;
    }

    return false;

  }

  // ==================== SpaceObject Abstract Method Implementations ====================

  ecef(date?: Date): EcefVec3<Kilometers> | null {
    const eciResult = this.eci(date);

    if (!eciResult) {
      return null;
    }

    const { gmst } = calcGmst(date ?? ServiceLocator.getTimeManager().simulationTimeObj);

    return eci2ecef(eciResult.position, gmst);
  }

  lla(date?: Date): LlaVec3<Degrees, Kilometers> | null {
    const eciResult = this.eci(date);

    if (!eciResult) {
      return null;
    }

    const { gmst } = calcGmst(date ?? ServiceLocator.getTimeManager().simulationTimeObj);
    const eciPos: TemeVec3 = {
      x: eciResult.position.x,
      y: eciResult.position.y,
      z: eciResult.position.z,
    };

    return eci2lla(eciPos, gmst);
  }

  toJ2000(_date?: Date): J2000 {
    throw new Error('MissileObject does not support J2000 coordinate conversion - missiles follow ballistic trajectories, not orbits.');
  }

  toITRF(_date?: Date): ITRF {
    throw new Error('MissileObject does not support ITRF coordinate conversion - missiles follow ballistic trajectories, not orbits.');
  }

  toClassicalElements(_date?: Date): ClassicalElements {
    throw new Error('MissileObject does not support classical orbital elements - missiles follow ballistic trajectories, not orbits.');
  }

  clone(_options?: Record<string, unknown>): MissileObject {
    return new MissileObject({
      id: this.id,
      name: this.name,
      active: this.active,
      desc: this.desc,
      latList: [...this.latList],
      lonList: [...this.lonList],
      altList: [...this.altList],
      timeList: [...this.timeList],
      startTime: this.startTime,
      maxAlt: this.maxAlt,
      country: this.country,
      launchVehicle: this.launchVehicle,
    });
  }

  protected serializeSpecific(): Record<string, unknown> {
    return {
      desc: this.desc,
      latList: this.latList,
      lonList: this.lonList,
      altList: this.altList,
      timeList: this.timeList,
      startTime: this.startTime,
      maxAlt: this.maxAlt,
      country: this.country,
      launchVehicle: this.launchVehicle,
    };
  }
}
