import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { SettingsManager } from '@app/settings/settings';
import disabledVisiblePng from '@public/img/icons/disabled-visible.png';

export class HideOtherSatellitesPlugin extends KeepTrackPlugin {
  readonly id = 'HideOtherSatellitesPlugin';
  dependencies_ = [];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'hide-other-sats-bottom-icon',
      label: 'Hide Others',
      image: disabledVisiblePng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'HideOtherSatellitesPlugin.toggle',
        label: t7e('plugins.HideOtherSatellitesPlugin.commandPalette.toggle'),
        category: 'Display',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      if (settingsManager.colors.transparent[3] === 0) {
        this.setBottomIconToSelected();
      }
    });
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      this.hideOtherSats();
    } else {
      this.showOtherSats();
    }
  }

  hideOtherSats(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0];
    this.applyColorChange_();
    this.setBottomIconToSelected();
  }

  showOtherSats(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.1];
    this.applyColorChange_();
    this.setBottomIconToUnselected();
  }

  private applyColorChange_(): void {
    const colorSchemeManager = ServiceLocator.getColorSchemeManager();

    colorSchemeManager.calculateColorBuffers(true);
    colorSchemeManager.reloadColors();
    SettingsManager.preserveSettings();
  }
}
