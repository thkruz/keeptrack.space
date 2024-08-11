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
import { errorManagerInstance } from '@app/singletons/errorManager';
import { CruncerMessageTypes, MarkerMode } from '@app/webworker/positionCruncher';
import sat2Png from '@public/img/icons/sat2.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

declare module '@app/interfaces' {
  interface UserSettings {
    isSatOverflyModeOn: boolean;
    isShowSurvFence: boolean;
    isFOVBubbleModeOn: boolean;
  }
}

export class SatelliteFov extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Satellite Field of View';

  constructor() {
    super(SatelliteFov.PLUGIN_NAME);
  }

  isSatOverflyModeOn = false;

  bottomIconCallback = () => {
    if (this.isMenuButtonActive) {
      this.enableFovView_();
    } else {
      this.disableFovView();
    }
  };

  isRequireSatelliteSelected: boolean = true;

  bottomIconElementName = 'menu-sat-fov';
  bottomIconLabel = 'Satellite FOV';
  bottomIconImg = sat2Png;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  addJs(): void {
    super.addJs();

    const keyboardManager = keepTrackApi.getInputManager().keyboard;

    keyboardManager.registerKeyEvent({
      key: 'C',
      callback: () => {
        if (keyboardManager.isShiftPressed) {
          const currentSat = keepTrackApi.getPlugin(SelectSatManager).getSelectedSat();

          if (currentSat) {
            const coneFactory = keepTrackApi.getScene().coneFactory;

            // See if it is already in the scene
            const cone = coneFactory.checkCacheForMesh_(currentSat);

            if (cone) {
              keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
              coneFactory.remove(cone.id);
            } else {
              keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
              coneFactory.generateMesh(currentSat);
            }
          }
        }
      },
    });
  }

  disableFovView(isTellWorker = true) {
    keepTrackApi.runEvent(KeepTrackApiEvents.changeSensorMarkers, this.PLUGIN_NAME);

    this.isSatOverflyModeOn = false;
    this.setBottomIconToUnselected(false);

    if (isTellWorker) {
      keepTrackApi.getCatalogManager().satCruncher.postMessage({
        typ: CruncerMessageTypes.UPDATE_MARKERS,
        markerMode: MarkerMode.OFF,
      });
    }
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
    keepTrackApi.runEvent(KeepTrackApiEvents.changeSensorMarkers, this.PLUGIN_NAME);

    this.isSatOverflyModeOn = true;
    this.setBottomIconToSelected();

    if ((<HTMLInputElement>getEl('search')).value !== '') {
      // If Group Selected
      keepTrackApi.getUiManager().doSearch((<HTMLInputElement>getEl('search')).value);
    }

    const satFieldOfView = SatelliteFov.getSatFieldOfView_();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.UPDATE_MARKERS,
      markerMode: MarkerMode.OVERFLY,
    });
    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.IS_UPDATE_SATELLITE_OVERFLY,
      selectedSatFOV: satFieldOfView,
    });

    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme, true);
  }
}
