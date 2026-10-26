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

export class SatelliteFixedView extends KeepTrackPlugin {
  readonly id = 'SatelliteFixedView';
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
      elementName: 'satellite-fixed-bottom-icon',
      label: 'Satellite Fixed View',
      image: satelliteAltPng,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.CAMERA_MODE,
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: '4',
        // Key 4 only enters the mode (a second press stays), so the guide must not say "Toggle".
        description: t7e('plugins.SatelliteFixedView.shortcuts.enter'),
        callback: () => this.bottomIconCallback(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'SatelliteFixedView.activate',
        label: t7e('plugins.SatelliteFixedView.commandPalette.activate'),
        category: 'View',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    // Keep icon state in sync with camera type
    EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
      const isFixedToSat = ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_SAT_LVLH;

      if (isFixedToSat && !this.isIconDisabled) {
        this.setBottomIconToSelected();
      } else if (!isFixedToSat && this.isMenuButtonActive) {
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

    if (ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_SAT_LVLH) {
      // Ignore if already in satellite-fixed view
      return;
    }

    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_SAT_LVLH;
    this.selectSatManager_.selectSat(this.selectSatManager_.selectedSat); // Force update of selected satellite to update camera delegate
    this.setBottomIconToSelected();
  };
}
