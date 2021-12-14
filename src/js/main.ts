/* eslint-disable no-unreachable */
/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
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

import { isThisJest, keepTrackApi } from './api/keepTrackApi';
import { MapManager, ObjectManager, OrbitManager, SensorManager } from './api/keepTrackTypes';
import { camera } from './camera/camera';
import { colorSchemeManager } from './colorManager/colorSchemeManager';
import { dotsManager } from './drawManager/dots';
import { drawManager } from './drawManager/drawManager';
import { LineFactory } from './drawManager/sceneManager/sceneManager';
import { groupsManager } from './groupsManager/groupsManager';
import { objectManager } from './objectManager/objectManager';
import { orbitManager } from './orbitManager/orbitManager';
import { sensorManager } from './plugins/sensor/sensorManager';
import { satellite } from './satMath/satMath';
// import { radarDataManager } from'./satSet/radarDataManager.js';
import { satSet } from './satSet/satSet';
import { VERSION } from './settingsManager/version.js';
import { VERSION_DATE } from './settingsManager/versionDate.js';
import { starManager } from './starManager/starManager';
import { timeManager } from './timeManager/timeManager';
import { adviceManager } from './uiManager/adviceManager';
import { searchBox } from './uiManager/searchBox';
import { uiInput, uiManager } from './uiManager/uiManager';

export const forceHttps = (): void => {
  window.location.href.startsWith('http:') ? (window.location.href = window.location.href.replace('http:', 'https:')) : null;
};

export const showErrorCode = (error: Error & { lineNumber: number }): void => {
  let errorHtml = '';
  errorHtml += error?.message ? `${error.message}<br>` : '';
  errorHtml += error?.lineNumber ? `Line: ${error.lineNumber}<br>` : '';
  errorHtml += error?.stack ? `${error.stack}<br>` : '';
  $('#loader-text').html(errorHtml);
  // istanbul ignore next
  if (!isThisJest()) console.warn(error);
};

export const initalizeKeepTrack = async (): Promise<void> => {
  try {
    // Upodate the version number and date
    settingsManager.versionNumber = VERSION;
    settingsManager.versionDate = VERSION_DATE;

    // Add all of the imported programs to the API
    keepTrackApi.programs = <any>{
      adviceManager,
      mainCamera: camera,
      colorSchemeManager,
      drawManager,
      dotsManager,
      groupsManager,
      mapManager: <MapManager>(<unknown>{}),
      objectManager: <ObjectManager>(<unknown>objectManager),
      orbitManager: <OrbitManager>(<unknown>orbitManager),
      satSet,
      satellite,
      searchBox,
      sensorManager: <SensorManager>(<unknown>sensorManager),
      starManager,
      timeManager,
      uiManager,
    };

    uiManager.loadStr('science');
    // Load all the plugins now that we have the API initialized
    await import('./plugins/core')
      .then((mod) => mod.loadCorePlugins(keepTrackApi, settingsManager.plugins))
      .catch(() => {
        // intentionally left blank
      });
    await import('./plugins/plugins')
      .then((mod) => mod.loadExtraPlugins(keepTrackApi))
      .catch(() => {
        // intentionally left blank
      });

    uiManager.loadStr('science2');
    // Start initializing the rest of the website
    timeManager.init();
    uiManager.onReady();
    uiManager.loadStr('dots');
    uiManager.mobileManager.init();
    // We need to know if we are on a small screen before starting webgl
    await drawManager.glInit();

    window.addEventListener('resize', drawManager.resizeCanvas);

    drawManager.loadScene();

    await drawManager.createDotsManager(drawManager.gl);

    await satSet.init();
    await objectManager.init();
    colorSchemeManager.init();
    drawManager.selectSatManager.init();

    await keepTrackApi.methods.loadCatalog(); // Needs Object Manager and gl first
    const satCruncher = satSet.satCruncher;
    // eslint-disable-next-line require-atomic-updates
    keepTrackApi.programs.satCruncher = satCruncher;

    keepTrackApi.programs.dotsManager.setupPickingBuffer(satSet.satData.length);
    satSet.setColorScheme(colorSchemeManager.default, true);

    orbitManager.init();

    const lineManager = new LineFactory();
    // eslint-disable-next-line require-atomic-updates
    keepTrackApi.programs.lineManager = lineManager;

    starManager.init();
    uiManager.init();
    keepTrackApi.programs.dotsManager.updateSizeBuffer(satSet.satData.length);
    // await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
    satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
    (<any>objectManager).satLinkManager.idToSatnum(satSet);

    uiInput.init();

    drawManager.init();

    // Now that everything is loaded, start rendering to thg canvas
    drawManager.drawLoop();

    // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
    uiManager.postStart();

    // Update any CSS now that we know what is loaded
    keepTrackApi.methods.uiManagerFinal();
  } catch (error) {
    showErrorCode(<Error & { lineNumber: number }>error);
  }
};

// Import CSS needed for loading screen
export const importCss = async (): Promise<void> => {
  try {
    if (!settingsManager.disableUI) {
      await import('../css/fonts.css').catch(() => {
        throw new Error('Failed to load fonts.css');
      });
      await import('../css/materialize.css').catch(() => {
        throw new Error('Failed to load materialize.css');
      });
      await import('../css/astroux/css/astro.css').catch(() => {
        throw new Error('Failed to load astro.css');
      });
      await import('../css/materialize-local.css').catch(() => {
        throw new Error('Failed to load materialize-local.css');
      });
      await import('./lib/external/colorPick.css').catch(() => {
        throw new Error('Failed to load colorPick.css');
      });
      await import('../css/perfect-scrollbar.min.css').catch(() => {
        throw new Error('Failed to load perfect-scrollbar.min.css');
      });
      await import('../css/jquery-ui.min.css').catch(() => {
        throw new Error('Failed to load jquery-ui.min.css');
      });
      await import('../css/jquery-ui-timepicker-addon.css').catch(() => {
        throw new Error('Failed to load jquery-ui-timepicker-addon.css');
      });
      await import('../css/style.css')
        .then(
          await import('../css/responsive.css')
            .catch(() => {
              throw new Error('Failed to load responsive.css');
            })
            .then((resp) => resp)
        )
        .catch(() => {
          throw new Error('Failed to load style.css');
        });
    } else if (settingsManager.enableLimitedUI) {
      await import('../css/limitedUI.css').catch(() => {
        throw new Error('Failed to load limitedUI.css');
      });
    }
  } catch (e) {
    // intentionally left blank
  }
};

// Force HTTPS on main website
forceHttps();
// Load the CSS
importCss();
// Load the main website
$(initalizeKeepTrack);
