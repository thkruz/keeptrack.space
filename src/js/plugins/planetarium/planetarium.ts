/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
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

import { CatalogManager, OrbitManager, SensorObject, Singletons, UiManager } from '@app/js/interfaces';
import { getEl } from '@app/js/lib/get-el';
import { CameraType } from '@app/js/singletons/camera';

import planetariumPng from '@app/img/icons/planetarium.png';
import { keepTrackContainer } from '@app/js/container';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { DrawManager } from '@app/js/singletons/draw-manager';
import { LegendManager } from '@app/js/static/legend-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { Astronomy } from '../astronomy/astronomy';

export class Planetarium extends KeepTrackPlugin {
  bottomIconElementName = 'menu-planetarium';
  bottomIconLabel = 'Planetarium View';
  bottomIconImg = planetariumPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  bottomIconCallback = (): void => {
    const { starManager } = keepTrackApi.programs;
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    if (this.isMenuButtonEnabled) {
      if (!this.verifySensorSelected()) return;

      keepTrackApi.getMainCamera().cameraType = CameraType.PLANETARIUM; // Activate Planetarium Camera Mode

      // Assume Sensor plugin is on because we are in planetarium view
      // TODO: This should explicitly check for the sensor plugin
      try {
        getEl('cspocAllSensor').style.display = 'none';
        getEl('mwAllSensor').style.display = 'none';
        getEl('mdAllSensor').style.display = 'none';
        getEl('llAllSensor').style.display = 'none';
        getEl('rusAllSensor').style.display = 'none';
        getEl('prcAllSensor').style.display = 'none';
      } catch {
        // Do nothing
      }

      // TODO: implement fov information
      // getEl('fov-text').innerHTML = ('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
      LegendManager.change('planetarium');
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
      if (catalogManagerInstance.isStarManagerLoaded) {
        starManager.clearConstellations();
      }

      keepTrackApi.getPlugin(Astronomy)?.setBottomIconToUnselected();
    } else {
      keepTrackApi.getMainCamera().isPanReset = true;
      keepTrackApi.getMainCamera().isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      drawManagerInstance.glInit();
      uiManagerInstance.hideSideMenus();
      const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
      orbitManagerInstance.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
      keepTrackApi.getMainCamera().cameraType = CameraType.DEFAULT; // Back to normal Camera Mode
      // TODO: implement fov information
      // getEl('fov-text').innerHTML = ('');
    }
  };

  constructor() {
    const PLUGIN_NAME = 'Astronomy';
    super(PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      method: 'setSensor',
      cbName: this.PLUGIN_NAME,
      cb: (sensor: SensorObject): void => {
        if (sensor) {
          getEl(this.bottomIconElementName).classList.remove('bmenu-item-disabled');
          this.isIconDisabled = false;
        } else {
          getEl(this.bottomIconElementName).classList.add('bmenu-item-disabled');
          this.isIconDisabled = true;
        }
      },
    });
  }
}

export const planetariumPlugin = new Planetarium();
