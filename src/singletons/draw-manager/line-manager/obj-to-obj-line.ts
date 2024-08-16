import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { MissileObject } from '@app/singletons/catalog-manager/MissileObject';
import { DetailedSatellite } from 'ootk';
import { Line, LineColors } from './line';

export class ObjToObjLine extends Line {
  obj: DetailedSatellite | MissileObject;
  obj2: DetailedSatellite | MissileObject;

  constructor(obj: DetailedSatellite | MissileObject, obj2: DetailedSatellite | MissileObject, color = LineColors.ORANGE) {
    super();
    this.obj = obj;
    this.obj2 = obj2;
    this.color_ = color;
  }

  update(): void {
    let eciArr: EciArr3;
    let eciArr2: EciArr3;

    if (this.obj instanceof MissileObject) {
      eciArr = [this.obj.position.x, this.obj.position.y, this.obj.position.z] as EciArr3;
    } else if (this.obj instanceof DetailedSatellite) {
      const eci = this.obj.eci(keepTrackApi.getTimeManager().simulationTimeObj);

      eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;
    } else {
      throw new Error('Invalid type');
    }

    if (this.obj2 instanceof MissileObject) {
      eciArr2 = [this.obj2.position.x, this.obj2.position.y, this.obj2.position.z] as EciArr3;
    } else if (this.obj2 instanceof DetailedSatellite) {
      const eci = this.obj2.eci(keepTrackApi.getTimeManager().simulationTimeObj);

      eciArr2 = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;
    } else {
      throw new Error('Invalid type');
    }

    this.updateVertBuf(eciArr, eciArr2);
  }
}
