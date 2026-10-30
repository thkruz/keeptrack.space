import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { SettingsManager } from '@app/settings/settings';
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
      menuMode: [MenuMode.DISPLAY, MenuMode.ALL],
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  addJs(): void {
    super.addJs();

    // The setting is persisted, so night mode may already be on at launch: light the icon to match.
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      this.syncIconToSetting();
    });
  }

  /** Light or dim the icon to match `settingsManager.isDrawNightAsDay` (no sound, no persist). */
  syncIconToSetting(): void {
    if (settingsManager.isDrawNightAsDay) {
      this.setBottomIconToSelected();
    } else {
      // A layer icon going dark must not close whatever side menu is open.
      this.setBottomIconToUnselected(false);
    }
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'N',
        description: t7e('plugins.NightToggle.commandPalette.toggle'),
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'NightToggle.toggle',
        label: t7e('plugins.NightToggle.commandPalette.toggle'),
        category: 'Display',
        shortcutHint: 'N',
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
    this.syncIconToSetting();
    // Persist and announce the change (the Graphics Menu mirrors it on saveSettings).
    SettingsManager.preserveSettings();
  }

  off(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    settingsManager.isDrawNightAsDay = false;
    this.syncIconToSetting();
    SettingsManager.preserveSettings();
  }
}
