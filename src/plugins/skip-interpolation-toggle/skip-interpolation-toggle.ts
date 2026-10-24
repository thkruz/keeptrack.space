import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import toasterPng from '@public/img/icons/toaster.png';

export class SkipInterpolationToggle extends KeepTrackPlugin {
  readonly id = 'SkipInterpolationToggle';
  dependencies_ = [];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'skip-interpolation-toggle-bottom-icon',
      label: 'Skip Interp',
      image: toasterPng,
      menuMode: [MenuMode.DISPLAY, MenuMode.ALL],
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.SETTINGS_TOGGLE,
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'SkipInterpolationToggle.toggle',
        label: t7e('plugins.SkipInterpolationToggle.commandPalette.toggle'),
        category: 'Display',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      settingsManager.isSkipTleInterpolation = true;
      this.setBottomIconToSelected();
    } else {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      settingsManager.isSkipTleInterpolation = false;
      this.setBottomIconToUnselected();
    }
  }
}
