import * as Ootk from 'ootk';
import { isThisJest, keepTrackApi } from './api/keepTrackApi';
import { MapManager } from './api/keepTrackTypes';
import { camera } from './camera/camera';
import { colorSchemeManager } from './colorManager/colorSchemeManager';
import { dotsManager } from './drawManager/dots';
import { drawManager } from './drawManager/drawManager';
import { LineFactory } from './drawManager/sceneManager/sceneManager';
import { createError } from './errorManager/errorManager';
import { groupsManager } from './groupsManager/groupsManager';
import { loadAfterStart, showErrorCode } from './main';
import { ObjectManager, objectManager } from './objectManager/objectManager';
import { OrbitManager, orbitManager } from './orbitManager/orbitManager';
import { sensorManager } from './plugins';
import { missileManager } from './plugins/missile/missileManager';
import { SensorManager } from './plugins/sensor/sensorManager';
import { satellite } from './satMath/satMath';
import { satSet } from './satSet/satSet';
import { VERSION } from './settingsManager/version.js';
import { VERSION_DATE } from './settingsManager/versionDate.js';
import { starManager } from './starManager/starManager';
import { timeManager } from './timeManager/timeManager';
import { adviceManager } from './uiManager/advice/adviceManager';
import { searchBox } from './uiManager/search/searchBox';
import { uiManager } from './uiManager/uiManager';

export const initalizeKeepTrack = async (): Promise<void> => {
  try {
    // Upodate the version number and date
    settingsManager.versionNumber = VERSION;
    settingsManager.versionDate = VERSION_DATE;

    // Error Trapping
    window.addEventListener('error', (e: ErrorEvent) => {
      createError(e.error, 'Global Error Trapper');
    });

    // Add all of the imported programs to the API
    keepTrackApi.programs = <any>{
      adviceManager,
      mainCamera: camera,
      colorSchemeManager,
      drawManager,
      dotsManager,
      groupsManager,
      mapManager: <MapManager>(<unknown>{}),
      missileManager,
      objectManager: <ObjectManager>(<unknown>objectManager),
      ootk: Ootk,
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
    if (!isThisJest()) {
      await import('./plugins')
        .then((mod) => mod.loadCorePlugins(keepTrackApi, settingsManager.plugins))
        .catch(() => {
          // intentionally left blank
        });
    }

    uiManager.loadStr('science2');
    // Start initializing the rest of the website
    timeManager.init();
    uiManager.onReady();
    uiManager.loadStr('dots');
    uiManager.mobileManager.init();
    // We need to know if we are on a small screen before starting webgl
    await drawManager.glInit();
    if (typeof process !== 'undefined') {
      // NOTE: Jest fails with webgl2 so we use webgl1 during testing
      // This means we need to mock some of the webgl2 code
      keepTrackApi.programs.drawManager.gl = global.mocks.glMock;
    }

    window.addEventListener('resize', drawManager.resizeCanvas);

    drawManager.loadScene();

    await drawManager.createDotsManager(drawManager.gl);

    const satSetErrorCode = await satSet.init();
    if (satSetErrorCode !== 0) return;
    objectManager.init();
    colorSchemeManager.init();
    drawManager.selectSatManager.init();

    await keepTrackApi.methods.loadCatalog(); // Needs Object Manager and gl first
    const satCruncher = satSet.satCruncher;
    // eslint-disable-next-line require-atomic-updates
    keepTrackApi.programs.satCruncher = satCruncher;

    keepTrackApi.programs.dotsManager.setupPickingBuffer(satSet.satData?.length);

    orbitManager.init();

    const lineManager = new LineFactory();
    // eslint-disable-next-line require-atomic-updates
    keepTrackApi.programs.lineManager = lineManager;

    starManager.init();
    uiManager.init();
    keepTrackApi.programs.dotsManager.updateSizeBuffer(satSet.satData?.length);
    // await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
    objectManager?.satLinkManager?.idToSatnum(satSet);

    uiManager.uiInput.init();

    drawManager.init();
    await drawManager.loadHiRes(); // NOTE: Doing this after the draw loop causes a bad UX

    // Now that everything is loaded, start rendering to thg canvas
    drawManager.drawLoop();

    // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
    uiManager.postStart();

    loadAfterStart();
  } catch (error) {
    showErrorCode(<Error & { lineNumber: number }>error);
  }
};
