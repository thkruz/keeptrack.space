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
import { CruncerMessageTypes, MarkerMode } from '@app/webworker/positionCruncher';
import fovPng from '@public/img/icons/fov.png';
import { Sensor } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class SensorFov extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Sensor Field of View';
  constructor() {
    super(SensorFov.PLUGIN_NAME);
  }

  isFovBubbleModeOn = false;

  bottomIconCallback = () => {
    if (this.isFovBubbleModeOn) {
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

    keepTrackApi.register({
      event: KeepTrackApiEvents.changeSensorMarkers,
      cbName: this.PLUGIN_NAME,
      cb: (caller: string): void => {
        if (caller !== this.PLUGIN_NAME) {
          this.isFovBubbleModeOn = false;
          this.setBottomIconToUnselected(false);
        }
      },
    });
  }

  disableFovView(isTellWorker = true) {
    keepTrackApi.runEvent(KeepTrackApiEvents.changeSensorMarkers, this.PLUGIN_NAME);

    this.isFovBubbleModeOn = false;
    this.setBottomIconToUnselected(false);

    if (isTellWorker) {
      keepTrackApi.getCatalogManager().satCruncher.postMessage({
        typ: CruncerMessageTypes.UPDATE_MARKERS,
        markerMode: MarkerMode.OFF,
      });
    }
  }

  public enableFovView() {
    keepTrackApi.runEvent(KeepTrackApiEvents.changeSensorMarkers, this.PLUGIN_NAME);

    this.isFovBubbleModeOn = true;
    this.setBottomIconToSelected();

    keepTrackApi.getCatalogManager().satCruncher.postMessage({
      typ: CruncerMessageTypes.UPDATE_MARKERS,
      markerMode: MarkerMode.FOV,
    });
  }
}
