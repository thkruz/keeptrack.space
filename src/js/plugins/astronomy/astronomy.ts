/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * astronomy.ts is a plugin for showing the stars above from the perspective
 * of a view on the earth.
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
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

import constellationPng from '@app/img/icons/constellation.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, shake } from '@app/js/lib/helpers';

export const uiManagerInit = () => {
  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-astronomy" class="bmenu-item bmenu-item-disabled">
          <img
            alt="telescope"
            src=""
            delayedsrc="${constellationPng}"
          />
          <span class="bmenu-title">Astronomy View</span>
          <div class="status-icon"></div>
        </div>
      `
  );
};

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'astronomy',
    cb: uiManagerInit,
  });

  keepTrackApi.programs.astronomy = {};
  keepTrackApi.programs.astronomy.isAstronomyView = false;

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'astronomy',
    cb: bottomMenuClick,
  });
};

// prettier-ignore
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  const { drawManager, starManager, objectManager, uiManager, orbitManager, sensorManager } = keepTrackApi.programs;
  if (iconName === 'menu-astronomy') {
    const mainCamera = keepTrackApi.programs.mainCamera;
    if (keepTrackApi.programs.astronomy.isAstronomyView) {
      keepTrackApi.programs.astronomy.isAstronomyView = false;
      mainCamera.isPanReset = true;
      mainCamera.isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      drawManager.glInit();
      uiManager.hideSideMenus();
      mainCamera.cameraType.current = mainCamera.cameraType.Default; // Back to normal Camera Mode
      uiManager.legendMenuChange('default');
      if (objectManager.isStarManagerLoaded) {
        starManager.clearConstellations();
      }
      getEl('fov-text').innerHTML = ('');
      getEl('menu-astronomy').classList.remove('bmenu-item-selected');
      return;
    } else {
      if (sensorManager.checkSensorSelected()) {
        if (objectManager.isStarManagerLoaded) {
          // TODO: This takes way too long trying to find the star's
          // satellite id from its name. The ids should be predetermined.
          starManager.drawAllConstellations();
        }
        orbitManager.clearInViewOrbit();
        mainCamera.cameraType.current = mainCamera.cameraType.Astronomy; // Activate Astronomy Camera Mode
        getEl('fov-text').innerHTML = ('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
        uiManager.legendMenuChange('astronomy');
        if (typeof keepTrackApi.programs.planetarium !== 'undefined') {
          keepTrackApi.programs.planetarium.isPlanetariumView = false;
          getEl('menu-planetarium').classList.remove('bmenu-item-selected');
        }
        keepTrackApi.programs.astronomy.isAstronomyView = true;
        getEl('menu-astronomy').classList.add('bmenu-item-selected');
      } else {
        uiManager.toast(`Select a Sensor First!`, 'caution');
        shake(getEl('menu-astronomy'));
      }
      return;
    }
  }
};
