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

import sat2Png from '@app/img/icons/sat2.png';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

declare module '@app/js/interfaces' {
  interface UserSettings {
    isSatOverflyModeOn: boolean;
    isShowSurvFence: boolean;
    isFOVBubbleModeOn: boolean;
  }
}

export class SatelliteFov extends KeepTrackPlugin {
  bottomIconCallback = () => {
    if (this.isMenuButtonActive) {
      this.enableFovView_();
      settingsManager.isSatOverflyModeOn = true;
    } else {
      this.disableFovView_();
      settingsManager.isSatOverflyModeOn = false;
    }
  };

  isRequireSatelliteSelected: boolean = true;

  bottomIconElementName = 'menu-sat-fov';
  bottomIconLabel = 'Satellite FOV';
  bottomIconImg = sat2Png;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  constructor() {
    const PLUGIN_NAME = 'Satellite Field of View';
    super(PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.changeSensorMarkers,
      cbName: this.PLUGIN_NAME,
      cb: (caller: string): void => {
        if (caller !== this.PLUGIN_NAME) {
          getEl(this.bottomIconElementName).classList.remove('bmenu-item-selected');
        }
      },
    });
  }

  private disableFovView_() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    settingsManager.isSatOverflyModeOn = false;
    this.setBottomIconToUnselected();

    catalogManagerInstance.satCruncher.postMessage({
      typ: 'isShowSatOverfly',
      isShowSatOverfly: 'reset',
    });
  }

  static getSatFieldOfView_(): number {
    const fovStr = <HTMLInputElement>getEl('satFieldOfView', true);

    if (!fovStr) {
      // There is no settings menu, but this is optional.
      return 30;
    }

    if (fovStr.value === '') {
      errorManagerInstance.warn('No Satellite FOV value entered. Using default value of 30 degrees.');
      return 30;
    }

    const fov = parseFloat(fovStr.value);
    if (isNaN(fov) || fov < 0 || fov > 180) {
      errorManagerInstance.warn('Invalid Satellite FOV value. Using default value of 30 degrees.');
      return 30;
    }

    return fov;
  }

  private enableFovView_() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    keepTrackApi.methods.changeSensorMarkers(this.PLUGIN_NAME);

    settingsManager.isShowSurvFence = false;
    settingsManager.isFOVBubbleModeOn = false;
    settingsManager.isSatOverflyModeOn = true;

    this.setBottomIconToSelected();

    if ((<HTMLInputElement>getEl('search')).value !== '') {
      // If Group Selected
      uiManagerInstance.doSearch((<HTMLInputElement>getEl('search')).value);
    }

    const satFieldOfView = SatelliteFov.getSatFieldOfView_();
    catalogManagerInstance.satCruncher.postMessage({
      isShowFOVBubble: 'reset',
      isShowSurvFence: 'disable',
    });
    catalogManagerInstance.satCruncher.postMessage({
      typ: 'isShowSatOverfly',
      isShowSatOverfly: 'enable',
      selectedSatFOV: satFieldOfView,
    });
    colorSchemeManagerInstance.setColorScheme(settingsManager.currentColorScheme, true);
  }
}

export const satelliteFovPlugin = new SatelliteFov();
