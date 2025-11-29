import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import dayNightPng from '@public/img/icons/day-night.png';

export class NightToggle extends KeepTrackPlugin {
  readonly id = 'NightToggle';
  dependencies_ = [];

  // Bridge to onBottomIconClick until base class wires up component callbacks
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'night-toggle-bottom-icon',
      label: 'Night Toggle',
      image: dayNightPng,
      menuMode: [MenuMode.ADVANCED, MenuMode.ALL],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'N',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onBottomIconClick(): void {
    this.toggleNightMode();
  }

  toggleNightMode(): void {
    if (this.isMenuButtonActive) {
      this.on();
    } else {
      this.off();
    }
  }

  on(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    settingsManager.isDrawNightAsDay = true;
    this.setBottomIconToSelected();
  }

  off(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    settingsManager.isDrawNightAsDay = false;
    this.setBottomIconToUnselected();
  }
}
