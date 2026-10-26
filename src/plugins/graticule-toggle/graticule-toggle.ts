import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { SettingsManager } from '@app/settings/settings';
import backgroundGridImage from '@public/img/icons/background-grid-small.png';

export class GraticuleToggle extends KeepTrackPlugin {
  readonly id = 'GraticuleToggle';
  dependencies_ = [];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'graticule-toggle-bottom-icon',
      label: 'Graticule',
      image: backgroundGridImage,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  addJs(): void {
    super.addJs();

    // The setting is persisted, so the graticule may already be on at launch: light the icon to match.
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      this.syncIconToSetting();
    });
  }

  /** Light or dim the icon to match `settingsManager.isDrawGraticule` (no sound, no persist). */
  syncIconToSetting(): void {
    if (settingsManager.isDrawGraticule) {
      this.setBottomIconToSelected();
    } else {
      // A layer icon going dark must not close whatever side menu is open.
      this.setBottomIconToUnselected(false);
    }
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'G',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'GraticuleToggle.toggle',
        label: t7e('plugins.GraticuleToggle.commandPalette.toggle'),
        category: 'Display',
        shortcutHint: 'G',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onBottomIconClick(): void {
    this.setGraticule(this.isMenuButtonActive);
  }

  /** Turn the graticule on or off: setting, icon, sound, then persist (the Graphics Menu mirrors it on saveSettings). */
  setGraticule(isOn: boolean): void {
    ServiceLocator.getSoundManager()?.play(isOn ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
    settingsManager.isDrawGraticule = isOn;
    this.syncIconToSetting();
    SettingsManager.preserveSettings();
  }
}
