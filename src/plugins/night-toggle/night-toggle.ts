import { InputEventType, keepTrackApi } from '@app/keepTrackApi';

import { MenuMode } from '@app/interfaces';
import dayNightPng from '@public/img/icons/day-night.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SoundNames } from '../sounds/sounds';

export class NightToggle extends KeepTrackPlugin {
  readonly id = 'NightToggle';
  dependencies_ = [];
  bottomIconImg = dayNightPng;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  addJs() {
    super.addJs();

    keepTrackApi.on(InputEventType.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === 'N' && !isRepeat) {
        this.toggleNightMode();
      }
    });
  }

  bottomIconCallback: () => void = () => {
    this.toggleNightMode();
  };

  toggleNightMode() {
    if (this.isMenuButtonActive) {
      this.on();
    } else {
      this.off();
    }
  }

  on() {
    keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    settingsManager.isDrawNightAsDay = true;
    this.setBottomIconToSelected();
  }

  off() {
    keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    settingsManager.isDrawNightAsDay = false;
    this.setBottomIconToUnselected();
  }
}
