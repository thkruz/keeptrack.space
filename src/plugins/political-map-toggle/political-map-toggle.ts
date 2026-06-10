import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import mapImage from '@public/img/icons/map.png';

export class PoliticalMapToggle extends KeepTrackPlugin {
  readonly id = 'PoliticalMapToggle';
  dependencies_ = [];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'political-map-toggle-bottom-icon',
      label: 'Political Map',
      image: mapImage,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  addJs(): void {
    super.addJs();

    // Sync button state with the setting at launch - political map may already be on
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      if (settingsManager.isDrawPoliticalMap) {
        this.setBottomIconToSelected();
      }
    });
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'l',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'PoliticalMapToggle.toggle',
        label: 'Toggle Political Boundaries',
        category: 'Display',
        shortcutHint: 'l',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      settingsManager.isDrawPoliticalMap = true;
      this.setBottomIconToSelected();
    } else {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      settingsManager.isDrawPoliticalMap = false;
      this.setBottomIconToUnselected();
    }
  }
}
