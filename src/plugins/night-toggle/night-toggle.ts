import { keepTrackApi } from '@app/keepTrackApi';

import { MenuMode } from '@app/engine/core/interfaces';
import dayNightPng from '@public/img/icons/day-night.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';
import { EventBusEvent } from '@app/engine/events/event-bus-events';

export class NightToggle extends KeepTrackPlugin {
  readonly id = 'NightToggle';
  dependencies_ = [];
  bottomIconImg = dayNightPng;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  addJs() {
    super.addJs();

    keepTrackApi.on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
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
