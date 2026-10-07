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

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import fencePng from '@public/img/icons/fence.png';
import { SensorFov } from '../sensor-fov/sensor-fov';
import { SensorListPlugin } from '../sensor-list/sensor-list';

export class SensorSurvFence extends KeepTrackPlugin {
  readonly id = 'SensorSurvFence';
  dependencies_: string[] = [SensorListPlugin.name];

  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  isRequireSensorSelected = true;

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'sensor-surv-fence-bottom-icon',
      label: 'Surv Fence',
      image: fencePng,
      menuMode: [MenuMode.SENSORS, MenuMode.ALL],
      isDisabledOnLoad: true,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.sensorDotSelected, this.enableIfSensorSelected.bind(this));

    EventBus.getInstance().on(EventBusEvent.resetSensor, (): void => {
      this.disableSurvView();
      this.setBottomIconToDisabled();
    });
  }

  enableIfSensorSelected(sensor?: DetailedSensor): void {
    if (sensor) {
      this.setBottomIconToEnabled();
    } else {
      this.setBottomIconToDisabled();
    }
  }

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      this.disableSurvView();
    } else {
      this.enableSurvView_();
    }
  }

  disableSurvView() {
    this.setBottomIconToUnselected(false);
  }

  private enableSurvView_() {
    PluginRegistry.getPlugin(SensorFov)?.setBottomIconToUnselected();
    this.setBottomIconToSelected();
  }
}
