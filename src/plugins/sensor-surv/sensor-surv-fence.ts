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
import { CruncerMessageTypes, MarkerMode } from '@app/webworker/positionCruncher';
import fencePng from '@public/img/icons/fence.png';
import { Sensor } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SatelliteFov } from '../satellite-fov/satellite-fov';

declare module '@app/interfaces' {
  interface UserSettings {
    isSatOverflyModeOn: boolean;
    isShowSurvFence: boolean;
  }
}

export class SensorSurvFence extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Sensor Surveillance Fence';
  constructor() {
    super(SensorSurvFence.PLUGIN_NAME);
  }

  isShowSurvFence = false;

  bottomIconCallback = () => {
    if (this.isShowSurvFence) {
      this.disableSurvView();
    } else {
      this.enableSurvView_();
    }
  };

  bottomIconElementName = 'menu-sensor-surv-fence';
  bottomIconLabel = 'Sensor Fence';
  bottomIconImg = fencePng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  isRequireSensorSelected = true;

  disableSurvView(isTellWorker = true) {
    keepTrackApi.runEvent(KeepTrackApiEvents.changeSensorMarkers, this.PLUGIN_NAME);

    this.isShowSurvFence = false;
    this.setBottomIconToUnselected(false);

    if (isTellWorker) {
      this.isMenuButtonActive = false;
      keepTrackApi.getCatalogManager().satCruncher.postMessage({
        markerMode: MarkerMode.OFF,
        typ: CruncerMessageTypes.UPDATE_MARKERS,
      });
    }
  }

  private enableSurvView_() {
    keepTrackApi.runEvent(KeepTrackApiEvents.changeSensorMarkers, this.PLUGIN_NAME);
    this.setBottomIconToSelected();

    this.isShowSurvFence = true;

    const satFovPlugin = keepTrackApi.getPlugin(SatelliteFov);

    if (satFovPlugin) {
      satFovPlugin.isSatOverflyModeOn = false;
    }

    this.isMenuButtonActive = true;
    keepTrackApi.getCatalogManager().satCruncher.postMessage({
      markerMode: MarkerMode.SURV,
      typ: CruncerMessageTypes.UPDATE_MARKERS,
    });
  }

  addJs(): void {
    super.addJs();

    /*
     * TODO: There are edge cases where the icon remains available when it should not be
     * It does not break anything, but it is a bug
     */

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
      cbName: this.PLUGIN_NAME,
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
      cbName: this.PLUGIN_NAME,
      cb: (sensor: Sensor): void => {
        if (sensor) {
          this.setBottomIconToEnabled();
        } else {
          this.setBottomIconToDisabled();
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.changeSensorMarkers,
      cbName: this.PLUGIN_NAME,
      cb: (caller: string): void => {
        if (caller !== this.PLUGIN_NAME) {
          this.disableSurvView();
        }
      },
    });
  }
}
