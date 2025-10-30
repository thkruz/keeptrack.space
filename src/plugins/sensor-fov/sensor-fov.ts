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

import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import fovPng from '@public/img/icons/fov.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SensorListPlugin } from '../sensor-list/sensor-list';
import { SensorSurvFence } from '../sensor-surv/sensor-surv-fence';

export class SensorFov extends KeepTrackPlugin {
  readonly id = 'SensorFov';
  dependencies_: string[] = [SensorListPlugin.name];
  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      this.disableFovView();
    } else {
      this.enableFovView();
    }
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = fovPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  isRequireSensorSelected = true;

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.setSensor,
      (sensor): void => {
        if (sensor) {
          getEl(this.bottomIconElementName)?.classList.remove(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = false;
        } else {
          getEl(this.bottomIconElementName)?.classList.add(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = true;
          this.isMenuButtonActive = false;
          getEl(this.bottomIconElementName)?.classList.remove(KeepTrackPlugin.iconSelectedClassString);
        }
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.sensorDotSelected,
      (sensor): void => {
        if (sensor) {
          getEl(this.bottomIconElementName)?.classList.remove(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = false;
        } else {
          getEl(this.bottomIconElementName)?.classList.add(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = true;
          this.isMenuButtonActive = false;
          getEl(this.bottomIconElementName)?.classList.remove(KeepTrackPlugin.iconSelectedClassString);
        }
      },
    );
  }

  disableFovView() {
    EventBus.getInstance().emit(EventBusEvent.changeSensorMarkers, this.id);
    this.setBottomIconToUnselected(false);
  }

  enableFovView() {
    PluginRegistry.getPlugin(SensorSurvFence)?.setBottomIconToUnselected();

    this.setBottomIconToSelected();
  }
}
