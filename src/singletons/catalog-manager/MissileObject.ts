/* eslint-disable class-methods-use-this */
import { MissileParams } from '@app/interfaces';
import { BaseObject, BaseObjectParams, Degrees, Kilometers, SpaceObjectType } from 'ootk';

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
}
