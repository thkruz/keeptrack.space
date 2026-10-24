import { SoundNames } from '@app/engine/audio/sounds';
import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import globePng from '@public/img/icons/globe.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class EarthCenteredView extends KeepTrackPlugin {
  readonly id = 'EarthCenteredView';
  dependencies_: string[] = [];

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'earth-centered-bottom-icon',
      label: 'Earth View',
      image: globePng,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.CAMERA_MODE,
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: '1',
        callback: () => this.bottomIconCallback(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'EarthCenteredView.activate',
        label: t7e('plugins.EarthCenteredView.commandPalette.switch'),
        category: 'View',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    // Keep icon state in sync with camera type
    EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
      const isFixedToEarth = ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_EARTH;

      if (isFixedToEarth && !this.isMenuButtonActive) {
        this.setBottomIconToSelected();
      } else if (!isFixedToEarth && this.isMenuButtonActive) {
        // Icon sync only: the camera changed elsewhere, so leave the user's open menu alone.
        this.setBottomIconToUnselected(false);
      }
    });
  }

  bottomIconCallback = (): void => {
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    this.setBottomIconToSelected();
  };
}
