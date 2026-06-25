import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import cloudPng from '@public/img/icons/cloud.png';

export class CloudsToggle extends KeepTrackPlugin {
  readonly id = 'CloudsToggle';
  dependencies_ = [];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'clouds-toggle-bottom-icon',
      label: 'Clouds',
      image: cloudPng,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  addJs(): void {
    super.addJs();

    // Sync button state with the setting at launch - clouds may already be on
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      if (settingsManager.isDrawCloudsMap) {
        this.setBottomIconToSelected();
      }
    });
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'c',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'CloudsToggle.toggle',
        label: 'Toggle Clouds Layer',
        category: 'Display',
        shortcutHint: 'c',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      settingsManager.isDrawCloudsMap = true;
      this.setBottomIconToSelected();
    } else {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      settingsManager.isDrawCloudsMap = false;
      this.setBottomIconToUnselected();
    }
  }
}
