/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
 *
 * http://keeptrack.space
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

import planetariumPng from '@app/img/icons/planetarium.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, shake } from '@app/js/lib/helpers';

export const uiManagerInit = () => {
  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-planetarium" class="bmenu-item bmenu-item-disabled">
          <img
            alt="planetarium"
            src=""
            delayedsrc="${planetariumPng}"
          />
          <span class="bmenu-title">Planetarium View</span>
          <div class="status-icon"></div>
        </div>
        `
  );
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'planetarium',
    cb: uiManagerInit,
  });

  keepTrackApi.programs.planetarium = {};
  keepTrackApi.programs.planetarium.isPlanetariumView = false;

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'planetarium',
    cb: bottomMenuClick,
  });
};

// prettier-ignore
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  const { drawManager, starManager, objectManager, uiManager, orbitManager, sensorManager } = keepTrackApi.programs;
  if (iconName === 'menu-planetarium') {
    const mainCamera = keepTrackApi.programs.mainCamera;
    if (keepTrackApi.programs.planetarium.isPlanetariumView) {
      keepTrackApi.programs.planetarium.isPlanetariumView = false;
      mainCamera.isPanReset = true;
      mainCamera.isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      drawManager.glInit();
      uiManager.hideSideMenus();
      orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
      mainCamera.cameraType.current = mainCamera.cameraType.Default; // Back to normal Camera Mode
      // TODO: implement fov information
      // getEl('fov-text').innerHTML = ('');
      getEl('menu-planetarium').classList.remove('bmenu-item-selected');
      return;
    } else {
      if (sensorManager.checkSensorSelected()) {
        mainCamera.cameraType.current = mainCamera.cameraType.Planetarium; // Activate Planetarium Camera Mode
        // TODO: implement fov information
        // getEl('fov-text').innerHTML = ('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
        uiManager.legendMenuChange('planetarium');
        if (objectManager.isStarManagerLoaded) {
          starManager.clearConstellations();
        }
        // If astronomy plugin is available then set it to false
        if (typeof keepTrackApi.programs.astronomy !== 'undefined') {
          keepTrackApi.programs.astronomy.isAstronomyView = false;
          getEl('menu-astronomy')?.classList.remove('bmenu-item-selected');
        }
        keepTrackApi.programs.planetarium.isPlanetariumView = true;
        getEl('menu-planetarium').classList.add('bmenu-item-selected');
      } else {
        if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.planetariumDisabled();
        uiManager.toast(`Select a Sensor First!`, 'caution');
        shake(getEl('menu-planetarium'));
      }
      return;
    }
  }
};
