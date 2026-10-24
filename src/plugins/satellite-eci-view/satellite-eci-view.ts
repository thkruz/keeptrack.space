import { SoundNames } from '@app/engine/audio/sounds';
import { CameraType } from '@app/engine/camera/camera-type';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import satelliteAltPng from '@public/img/icons/satellite-alt.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class SatelliteEciView extends KeepTrackPlugin {
  readonly id = 'SatelliteEciView';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  menuMode: MenuMode[] = [MenuMode.ALL];

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'satellite-eci-bottom-icon',
      label: 'Satellite ECI View',
      image: satelliteAltPng,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.CAMERA_MODE,
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: '3',
        callback: () => this.bottomIconCallback(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'SatelliteEciView.activate',
        label: 'Switch to Satellite ECI View',
        category: 'View',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
      const isFixedToSatEci = ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_SAT_ECI;

      if (isFixedToSatEci && !this.isIconDisabled) {
        this.setBottomIconToSelected();
      } else if (!isFixedToSatEci && this.isMenuButtonActive) {
        // Icon sync only: the camera changed elsewhere, so leave the user's open menu alone.
        this.setBottomIconToUnselected(false);
      }
    });
  }

  bottomIconCallback = (): void => {
    if (this.selectSatManager_.selectedSat === -1) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.SelectSatelliteFirst'), ToastMsgType.serious, true);
      this.shakeBottomIcon();

      return;
    }

    if (ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_SAT_ECI) {
      // Ignore if already in ECI view
      return;
    }

    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_SAT_ECI;
    this.selectSatManager_.selectSat(this.selectSatManager_.selectedSat); // Force update of selected satellite to update camera delegate
    this.setBottomIconToSelected();
  };
}
