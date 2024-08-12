/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
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
import { getEl } from '@app/lib/get-el';
import fovPng from '@public/img/icons/fov.png';
import { Sensor } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SensorSurvFence } from '../sensor-surv/sensor-surv-fence';

export class SensorFov extends KeepTrackPlugin {
  static readonly PLUGIN_NAME = 'Sensor Field of View';
  constructor() {
    super(SensorFov.PLUGIN_NAME);
  }

  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      this.disableFovView();
    } else {
      this.enableFovView();
    }
  };

  bottomIconElementName = 'menu-sensor-fov';
  bottomIconLabel = 'Sensor FOV';
  bottomIconImg = fovPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  isRequireSensorSelected = true;

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
      cbName: this.PLUGIN_NAME,
      cb: (sensor: Sensor | string): void => {
        if (sensor) {
          getEl(this.bottomIconElementName).classList.remove(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = false;
        } else {
          getEl(this.bottomIconElementName).classList.add(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = true;
          this.isMenuButtonActive = false;
          getEl(this.bottomIconElementName).classList.remove(KeepTrackPlugin.iconSelectedClassString);
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.sensorDotSelected,
      cbName: this.PLUGIN_NAME,
      cb: (sensor: Sensor): void => {
        if (sensor) {
          getEl(this.bottomIconElementName).classList.remove(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = false;
        } else {
          getEl(this.bottomIconElementName).classList.add(KeepTrackPlugin.iconDisabledClassString);
          this.isIconDisabled = true;
          this.isMenuButtonActive = false;
          getEl(this.bottomIconElementName).classList.remove(KeepTrackPlugin.iconSelectedClassString);
        }
      },
    });
  }

  disableFovView() {
    keepTrackApi.runEvent(KeepTrackApiEvents.changeSensorMarkers, this.PLUGIN_NAME);
    this.setBottomIconToUnselected(false);
  }

  public enableFovView() {
    keepTrackApi.getPlugin(SensorSurvFence)?.setBottomIconToUnselected();

    this.setBottomIconToSelected();
  }
}
