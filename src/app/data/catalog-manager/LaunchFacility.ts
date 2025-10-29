/* eslint-disable class-methods-use-this */
import { BaseObject, SpaceObjectType } from '@ootk/src/main';

export interface LaunchSiteParams {
  name: string;
  lat: number;
  lon: number;
  alt: number;
  site?: string; // Optional site name
  country?: string; // Optional country name
  wikiUrl?: string | null; // Optional Wikipedia URL
  id?: number; // Optional ID for the launch site
}

export class LaunchSite extends BaseObject {
  lat: number;
  lon: number;
  alt: number;
  site?: string; // Optional site name
  country?: string; // Optional country name
  wikiUrl?: string | null; // Optional Wikipedia URL

  constructor(info: LaunchSiteParams) {
    super(info);

    Object.keys(info).forEach((key) => {
      this[key] = info[key];
    });

    this.type = SpaceObjectType.LAUNCH_SITE;
  }

  isLandObject(): boolean {
    return true;
  }

  isStatic(): boolean {
    return true;
  }
}
