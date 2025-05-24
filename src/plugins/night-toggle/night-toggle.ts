import { InputEventType, keepTrackApi } from '@app/keepTrackApi';

import dayNightPng from '@public/img/icons/day-night.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SoundNames } from '../sounds/SoundNames';

export class NightToggle extends KeepTrackPlugin {
  readonly id = 'NightToggle';
  dependencies_ = [];
  bottomIconImg = dayNightPng;

  addJs() {
    super.addJs();

    keepTrackApi.on(InputEventType.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === 'N' && !isRepeat) {
        if (!this.isMenuButtonActive) {
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
          this.setBottomIconToSelected();
        } else {
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
          this.setBottomIconToUnselected();
        }
      }
    });
  }
}
