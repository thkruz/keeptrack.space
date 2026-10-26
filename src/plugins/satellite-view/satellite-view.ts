/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SoundNames } from '@app/engine/audio/sounds';
import { CameraType } from '@app/engine/camera/camera-type';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { t7e } from '@app/locales/keys';
import viewInAirPng from '@public/img/icons/view-in-air.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '../../engine/plugins/core/plugin-capabilities';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class SatelliteViewPlugin extends KeepTrackPlugin {
  readonly id = 'SatelliteViewPlugin';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  menuMode: MenuMode[] = [MenuMode.ALL];

  isRequireSatelliteSelected = true;
  bottomIconImg = viewInAirPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  iconPlacement = IconPlacement.UTILITY_ONLY;
  utilityGroup = UtilityGroup.CAMERA_MODE;

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: '5',
        // Key 5 only enters the mode (a second press stays), so the guide must not say "Toggle".
        description: t7e('plugins.SatelliteViewPlugin.shortcuts.enter'),
        callback: () => this.bottomIconCallback(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'SatelliteViewPlugin.activate',
        label: t7e('plugins.SatelliteViewPlugin.commandPalette.activate'),
        category: 'View',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    const camera = ServiceLocator.getMainCamera();

    // Disable satellite mesh rendering in satellite-first-person view
    EventBus.getInstance().on(EventBusEvent.shouldSkipSatelliteModels, () => camera.cameraType === CameraType.SATELLITE_FIRST_PERSON);

    // Keep icon state in sync with camera type
    EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
      const isSatelliteView = ServiceLocator.getMainCamera().cameraType === CameraType.SATELLITE_FIRST_PERSON;

      if (isSatelliteView && !this.isMenuButtonActive && !this.isIconDisabled) {
        this.setBottomIconToSelected();
      } else if (!isSatelliteView && this.isMenuButtonActive) {
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

    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    ServiceLocator.getMainCamera().cameraType = CameraType.SATELLITE_FIRST_PERSON;
    this.setBottomIconToSelected();
  };
}
