import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';

import dayNightPng from '@public/img/icons/day-night.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class NightToggle extends KeepTrackPlugin {
  readonly id = 'NightToggle';
  dependencies_ = [];
  bottomIconImg = dayNightPng;
  isNightMode = true; // Default to night mode

  addJs() {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.nightToggle,
      cbName: this.id,
      cb: (gl: WebGL2RenderingContext, nightTexture: WebGLTexture, texture: WebGLTexture): void => {
        if (this.isNightMode) {
          gl.bindTexture(gl.TEXTURE_2D, nightTexture);
        } else {
          gl.bindTexture(gl.TEXTURE_2D, texture);
        }
      },
    });
  }
}
