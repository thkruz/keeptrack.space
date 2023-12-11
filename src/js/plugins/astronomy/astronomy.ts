/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * astronomy.ts is a plugin for showing the stars above from the perspective
 * of a view on the earth.
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

import { SensorObject } from '@app/js/interfaces';
import { getEl } from '@app/js/lib/get-el';
import { CameraType } from '@app/js/singletons/camera';

import constellationPng from '@app/img/icons/constellation.png';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { LegendManager } from '@app/js/static/legend-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { Planetarium } from '../planetarium/planetarium';

export class Astronomy extends KeepTrackPlugin {
  bottomIconElementName = 'menu-astronomy';
  bottomIconLabel = 'Astronomy View';
  bottomIconImg = constellationPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  bottomIconCallback = (): void => {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const drawManagerInstance = keepTrackApi.getRenderer();
    const uiManagerInstance = keepTrackApi.getUiManager();
    if (this.isMenuButtonActive) {
      if (!this.verifySensorSelected()) return;

      if (catalogManagerInstance.isStarManagerLoaded) {
        // TODO: This takes way too long trying to find the star's
        // satellite id from its name. The ids should be predetermined.
        keepTrackApi.getStarManager().drawAllConstellations();
      }
      orbitManagerInstance.clearInViewOrbit();
      keepTrackApi.getMainCamera().cameraType = CameraType.ASTRONOMY; // Activate Astronomy Camera Mode
      // getEl('fov-text').innerHTML = ('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
      LegendManager.change('astronomy');

      keepTrackApi.getPlugin(Planetarium)?.setBottomIconToUnselected();
    } else {
      keepTrackApi.getMainCamera().isPanReset = true;
      keepTrackApi.getMainCamera().isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      drawManagerInstance.glInit();
      uiManagerInstance.hideSideMenus();
      keepTrackApi.getMainCamera().cameraType = CameraType.DEFAULT; // Back to normal Camera Mode
      LegendManager.change('default');
      if (catalogManagerInstance.isStarManagerLoaded) {
        keepTrackApi.getStarManager().clearConstellations();
      }
      // getEl('fov-text').innerHTML = ('');
      getEl(this.bottomIconElementName).classList.remove('bmenu-item-selected');
    }
  };

  static PLUGIN_NAME = 'Astronomy';

  constructor() {
    super(Astronomy.PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
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

export const astronomyPlugin = new Astronomy();
