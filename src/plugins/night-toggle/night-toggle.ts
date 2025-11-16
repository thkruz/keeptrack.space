
import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import dayNightPng from '@public/img/icons/day-night.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class NightToggle extends KeepTrackPlugin {
  readonly id = 'NightToggle';
  dependencies_ = [];
  bottomIconImg = dayNightPng;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  addJs() {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
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
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    settingsManager.isDrawNightAsDay = true;
    this.setBottomIconToSelected();
  }

  off() {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    settingsManager.isDrawNightAsDay = false;
    this.setBottomIconToUnselected();
  }
}
