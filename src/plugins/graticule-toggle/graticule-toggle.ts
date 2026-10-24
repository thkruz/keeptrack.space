import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
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
    if (this.isMenuButtonActive) {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      settingsManager.isDrawGraticule = true;
      this.setBottomIconToSelected();
    } else {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      settingsManager.isDrawGraticule = false;
      this.setBottomIconToUnselected();
    }
  }
}
