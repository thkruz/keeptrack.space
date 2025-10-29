/* eslint-disable class-methods-use-this */
import { ControlSiteParams } from '@app/app/data/catalogs/control-sites';
import { BaseObject } from '@ootk/src/main';

export class ControlSite extends BaseObject {
  TStop: string;
  linkAehf: boolean;
  linkWgs: boolean;
  linkIridium: boolean;
  linkGalileo: boolean;
  linkStarlink: boolean;

  constructor(info: ControlSiteParams) {
    super(info);

    Object.keys(info).forEach((key) => {
      this[key] = info[key];
    });
  }

  isLandObject(): boolean {
    return true;
  }

  isStatic(): boolean {
    return true;
  }
}
