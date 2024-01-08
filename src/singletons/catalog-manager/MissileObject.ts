/* eslint-disable class-methods-use-this */
import { MissileParams } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, BaseObjectParams, DEG2RAD, Degrees, Kilometers, Radians, SpaceObjectType, Vector3D, calcGmst, eci2lla, lla2eci } from 'ootk';

export class MissileObject extends BaseObject {
  id: number;
  active: boolean;
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

  constructor(info: MissileParams & BaseObjectParams) {
    super(info);
    this.id = info.id;
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
    const { gmst } = calcGmst(keepTrackApi.getTimeManager().simulationTimeObj);
    const lla = eci2lla(this.position, gmst);
    return lla.alt;
  }

  getTimeInTrajectory(): number {
    this.lastTime ??= 0;

    for (let t = this.lastTime; t < this.altList.length; t++) {
      if (this.startTime * 1 + t * 1000 >= keepTrackApi.getTimeManager().simulationTimeObj.getTime()) {
        this.lastTime = t;
        break;
      }
    }

    return this.lastTime;
  }

  direction(): Vector3D {
    // TODO: This doesn't work!

    const t = this.getTimeInTrajectory();
    const eci = this.eci(t);
    const eciNext = this.eci(t + 3);
    // Our model defaults to {x: 0, y: 1, z: 0}
    const modelDirection = new Vector3D(1, 1, 1);

    // We need to rotate it to match the direction of the missile
    const direction = eciNext.subtract(eci).normalize();
    const angle = modelDirection.angle(direction);
    const axis = modelDirection.cross(direction).normalize();
    const rotation = new Vector3D(axis.x, axis.y, axis.z).scale(angle);

    // Convert to Degrees
    const rotationDegrees = new Vector3D((rotation.x * 180) / Math.PI, (rotation.y * 180) / Math.PI, (rotation.z * 180) / Math.PI);
    return rotationDegrees;
  }

  eci(t = this.getTimeInTrajectory()): Vector3D {
    const { gmst } = calcGmst(keepTrackApi.getTimeManager().simulationTimeObj);
    const lat = this.latList[t];
    const lon = this.lonList[t];
    const alt = this.altList[t];
    const lla = {
      lat: (lat * DEG2RAD) as Radians,
      lon: (lon * DEG2RAD) as Radians,
      alt,
    };

    const eci = lla2eci(lla, gmst);
    return new Vector3D(eci.x, eci.y, eci.z);
  }

  isGoingUp(): boolean {
    const t = this.getTimeInTrajectory();
    if (this.altList[t] > this.altList[t - 1]) {
      return true;
    } else {
      return false;
    }
  }
}
