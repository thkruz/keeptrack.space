/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
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
 * /////////////////////////////////////////////////////////////////////////////
 */

// This file should contain all of the webgl code for generating non .obj meshes
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { LineFactory } from './line-factory.js';
import { Moon } from './moon.js';
import { earth } from './earth.js';
import { keepTrackApi } from '@app/js/api/externalApi';
import { sun } from './sun.js';

const sceneManager = {
  classes: {
    Moon: Moon,
  },
  earth: earth,
  sun: sun,
  registerAtmoshpere: async (Atmosphere) => {
    sceneManager.classes.Atmosphere = Atmosphere;
    keepTrackApi.register({
      method: 'drawManagerLoadScene',
      cbName: 'atmosphere',
      cb: () => {
        sceneManager.atmosphere = new sceneManager.classes.Atmosphere(keepTrackApi.programs.drawManager.gl, sceneManager.earth, keepTrackApi.programs.settingsManager, glm);
      },
    });
    keepTrackApi.register({
      method: 'drawOptionalScenery',
      cbName: 'atmosphere',
      cb: () => {
        if (
          !settingsManager.enableLimitedUI &&
          !settingsManager.isDrawLess &&
          keepTrackApi.programs.cameraManager.cameraType.current !== keepTrackApi.programs.cameraManager.cameraType.planetarium &&
          keepTrackApi.programs.cameraManager.cameraType.current !== keepTrackApi.programs.cameraManager.cameraType.astronomy
        ) {
          sceneManager.atmosphere.draw(keepTrackApi.programs.drawManager.pMatrix, keepTrackApi.programs.cameraManager);
        }
      },
    });
  },
};

export { LineFactory, sceneManager };
