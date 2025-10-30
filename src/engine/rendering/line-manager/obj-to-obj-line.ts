import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EciArr3 } from '@app/engine/core/interfaces';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { DetailedSatellite } from '@ootk/src/main';
import { Line, LineColors } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class ObjToObjLine extends Line {
  obj: DetailedSatellite | MissileObject | OemSatellite;
  obj2: DetailedSatellite | MissileObject | OemSatellite;

  constructor(obj: DetailedSatellite | MissileObject | OemSatellite, obj2: DetailedSatellite | MissileObject | OemSatellite, color = LineColors.ORANGE) {
    super();
    this.obj = obj;
    this.obj2 = obj2;
    this.color_ = color;
  }

  update(): void {
    let eciArr: EciArr3;
    let eciArr2: EciArr3;

    if (this.obj instanceof MissileObject || this.obj instanceof OemSatellite) {
      eciArr = [this.obj.position.x, this.obj.position.y, this.obj.position.z] as EciArr3;
    } else if (this.obj instanceof DetailedSatellite) {
      const eci = this.obj.eci(ServiceLocator.getTimeManager().simulationTimeObj);

      if (!eci) {
        errorManagerInstance.debug(`ObjToObjLine: DetailedSatellite ${this.obj.sccNum} is not in orbit.`);
        this.isGarbage = true;

        return;
      }

      eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;
    } else {
      errorManagerInstance.debug(`ObjToObjLine: ${this.obj} is not a MissileObject or DetailedSatellite`);
      this.isGarbage = true;

      return;
    }

    if (this.obj2 instanceof MissileObject) {
      eciArr2 = [this.obj2.position.x, this.obj2.position.y, this.obj2.position.z] as EciArr3;
    } else if (this.obj2 instanceof DetailedSatellite) {
      const eci = this.obj2.eci(ServiceLocator.getTimeManager().simulationTimeObj);

      if (!eci) {
        errorManagerInstance.debug(`ObjToObjLine: DetailedSatellite ${this.obj2.sccNum} is not in orbit.`);
        this.isGarbage = true;

        return;
      }

      eciArr2 = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;
    } else {
      errorManagerInstance.debug(`ObjToObjLine: ${this.obj2} is not a MissileObject or DetailedSatellite`);
      this.isGarbage = true;

      return;
    }

    this.updateVertBuf([eciArr, eciArr2]);
  }
}
