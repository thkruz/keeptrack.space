import { keepTrackApi, KeepTrackApiMethods } from '@app/js/keepTrackApi';

import dayNightPng from '@app/img/icons/day-night.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class NightToggle extends KeepTrackPlugin {
  bottomIconElementName = 'menu-day-night';
  bottomIconLabel = 'Night Toggle';
  bottomIconImg = dayNightPng;
  constructor() {
    const PLUGIN_NAME = 'Night Toggle';
    super(PLUGIN_NAME);
  }

  addJs() {
    super.addJs();

    keepTrackApi.register({
      method: KeepTrackApiMethods.nightToggle,
      cbName: this.PLUGIN_NAME,
      cb: (gl: any, nightTexture: any, texture: any): void => {
        if (!this.isMenuButtonEnabled) {
          gl.bindTexture(gl.TEXTURE_2D, nightTexture);
        } else {
          gl.bindTexture(gl.TEXTURE_2D, texture);
        }
      },
    });
  }
}

export const nightTogglePlugin = new NightToggle();
