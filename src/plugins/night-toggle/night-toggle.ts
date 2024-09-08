import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';

import dayNightPng from '@public/img/icons/day-night.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SoundNames } from '../sounds/SoundNames';

export class NightToggle extends KeepTrackPlugin {
  readonly id = 'NightToggle';
  dependencies_ = [];
  bottomIconImg = dayNightPng;

  addJs() {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.nightToggle,
      cbName: this.id,
      cb: (gl: WebGL2RenderingContext, nightTexture: WebGLTexture, texture: WebGLTexture): void => {
        if (!this.isMenuButtonActive) {
          gl.bindTexture(gl.TEXTURE_2D, nightTexture);
        } else {
          gl.bindTexture(gl.TEXTURE_2D, texture);
        }
      },
    });

    keepTrackApi.getInputManager().keyboard.registerKeyUpEvent({
      key: 'N',
      callback: () => {
        if (!this.isMenuButtonActive) {
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
          this.setBottomIconToSelected();
        } else {
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
          this.setBottomIconToUnselected();
        }
      },
    });
  }
}
