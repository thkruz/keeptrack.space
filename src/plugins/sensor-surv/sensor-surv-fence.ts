/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2016-2024 Theodore Kruczek
 * @Copyright (C) 2020-2024 Heather Kruczek
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

import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import fencePng from '@public/img/icons/fence.png';
import { Sensor } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SensorFov } from '../sensor-fov/sensor-fov';
import { SensorListPlugin } from '../sensor-list/sensor-list';

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

  bottomIconImg = fencePng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  isRequireSensorSelected = true;

  addJs(): void {
    super.addJs();

    /*
     * TODO: There are edge cases where the icon remains available when it should not be
     * It does not break anything, but it is a bug
     */

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
      cbName: this.id,
      cb: (sensor: Sensor | string): void => {
        if (sensor) {
          this.setBottomIconToEnabled();
        } else {
          this.setBottomIconToDisabled();
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.sensorDotSelected,
      cbName: this.id,
      cb: (sensor: Sensor): void => {
        if (sensor) {
          this.setBottomIconToEnabled();
        } else {
          this.setBottomIconToDisabled();
        }
      },
    });
  }

  disableSurvView() {
    this.setBottomIconToUnselected(false);
  }

  private enableSurvView_() {
    keepTrackApi.getPlugin(SensorFov)?.setBottomIconToUnselected();
    this.setBottomIconToSelected();
  }
}
