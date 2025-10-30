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
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { DetailedSensor } from '@ootk/src/main';
import fencePng from '@public/img/icons/fence.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SensorFov } from '../sensor-fov/sensor-fov';
import { SensorListPlugin } from '../sensor-list/sensor-list';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

export class SensorSurvFence extends KeepTrackPlugin {
  readonly id = 'SensorSurvFence';
  dependencies_: string[] = [SensorListPlugin.name];
  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      this.disableSurvView();
    } else {
      this.enableSurvView_();
    }
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = fencePng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  isRequireSensorSelected = true;

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.setSensor, this.enableIfSensorSelected.bind(this));
    EventBus.getInstance().on(EventBusEvent.sensorDotSelected, this.enableIfSensorSelected.bind(this));
  }

  enableIfSensorSelected(sensor?: DetailedSensor): void {
    if (sensor) {
      this.setBottomIconToEnabled();
    } else {
      this.setBottomIconToDisabled();
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
