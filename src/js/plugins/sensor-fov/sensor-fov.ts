/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
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

import fovPng from '@app/img/icons/fov.png';
import { SensorObject } from '@app/js/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

declare module '@app/js/interfaces' {
  interface UserSettings {
    isSatOverflyModeOn: boolean;
    isShowSurvFence: boolean;
    isFOVBubbleModeOn: boolean;
  }
}

export class SensorFov extends KeepTrackPlugin {
  bottomIconCallback = () => {
    if (!this.verifySensorSelected()) {
      return;
    }

    if (settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence) {
      this.disableFovView_();
    } else if (!settingsManager.isFOVBubbleModeOn) {
      this.enableFovView();
    }
  };

  bottomIconElementName = 'menu-sensor-fov';
  bottomIconLabel = 'Sensor FOV';
  bottomIconImg = fovPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  constructor() {
    const PLUGIN_NAME = 'Sensor Field of View';
    super(PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
      cbName: this.PLUGIN_NAME,
      cb: (sensor: SensorObject): void => {
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
          getEl(this.bottomIconElementName).classList.remove(KeepTrackPlugin.iconSelectedClassString);
        }
      },
    });
  }

  private disableFovView_() {
    settingsManager.isFOVBubbleModeOn = false;
    this.setBottomIconToUnselected();

    keepTrackApi.getCatalogManager().satCruncher.postMessage({
      isShowFOVBubble: 'reset',
      isShowSurvFence: 'disable',
    });
  }

  public enableFovView() {
    keepTrackApi.methods.changeSensorMarkers(this.PLUGIN_NAME);

    settingsManager.isFOVBubbleModeOn = true;
    settingsManager.isSatOverflyModeOn = false;
    settingsManager.isShowSurvFence = false;

    this.setBottomIconToSelected();

    keepTrackApi.getCatalogManager().satCruncher.postMessage({
      isShowFOVBubble: 'enable',
      isShowSurvFence: 'disable',
    });

    keepTrackApi.getCatalogManager().satCruncher.postMessage({
      typ: 'isShowSatOverfly',
      isShowSatOverfly: 'reset',
    });
  }
}

export const sensorFovPlugin = new SensorFov();
