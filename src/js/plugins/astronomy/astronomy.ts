/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * astronomy.ts is a plugin for showing the stars above from the perspective
 * of a view on the earth.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * TESTING: This plugin requires php to be installed on the server. It won't work
 * with the default http npm module.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';
import constellationPng from '@app/img/icons/constellation.png';

export const uiManagerInit = () => {
  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-astronomy" class="bmenu-item bmenu-item-disabled">
          <img
            alt="telescope"
            src=""
            delayedsrc=${constellationPng}/>
          <span class="bmenu-title">Astronomy View</span>
          <div class="status-icon"></div>
        </div>
      `);
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
      $('#fov-text').html('');
      $('#menu-astronomy').removeClass('bmenu-item-selected');
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
        $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
        uiManager.legendMenuChange('astronomy');
        if (typeof keepTrackApi.programs.planetarium !== 'undefined') {
          keepTrackApi.programs.planetarium.isPlanetariumView = false;
          $('#menu-planetarium').removeClass('bmenu-item-selected');
        }
        keepTrackApi.programs.astronomy.isAstronomyView = true;
        $('#menu-astronomy').addClass('bmenu-item-selected');
      } else {
        uiManager.toast(`Select a Sensor First!`, 'caution');
        if (!$('#menu-astronomy:animated').length) {
          $('#menu-astronomy').effect('shake', {
            distance: 10,
          });
        }
      }
      return;
    }
  }
};
