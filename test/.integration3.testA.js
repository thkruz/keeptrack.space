/* eslint-disable no-undefined */
/* globals
  describe
  global
  test
  jest
*/

import 'jsdom-worker';

import { keepTrackApi } from '@app/js/api/externalApi';

import '@app/js/api/externalApi';
import 'jquery-ui-bundle';
import 'materialize-css';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { LineFactory } from '@app/js/drawManager/sceneManager/sceneManager.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
import { meshManager } from '@app/js/drawManager/meshManager';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { orbitManager } from '@app/js/orbitManager/orbitManager.js';
// import { radarDataManager } from'@app/js/satSet/radarDataManager.js';
import { satSet } from '@app/js/satSet/satSet.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { sensorManager } from '@app/js/plugins/sensor/sensorManager.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';
import { starManager } from '@app/js/starManager/starManager.js';
import { timeManager } from '@app/js/timeManager/timeManager.ts';

// eslint-disable-next-line no-duplicate-imports
// eslint-disable-next-line
import { adviceManager } from '@app/js/uiManager/ui-advice.js';

// eslint-disable-next-line sort-imports
import { omManager } from '../src/js/plugins/initialOrbit/omManager';

// eslint-disable-next-line sort-imports
import { setup } from './setup.js';

setup.init();

const exampleSat = {
  C: 'US',
  LS: 'AFETR',
  LV: 'U',
  ON: 'VANGUARD 1',
  OT: 1,
  R: '0.1220',
  SCC_NUM: '00005',
  TLE1: '1     5U 58002B   21107.45725112 -.00000113  00000-0 -16194-3 0  9999',
  TLE2: '2     5  34.2637  11.6832 1848228 280.4329  59.4145 10.84843191238363',
  active: true,
  apogee: 3845.1282721399293,
  argPe: 4.894477435916007,
  eccentricity: 0.1848228,
  id: 0,
  inclination: 0.5980143789155811,
  intlDes: '1958-002B',
  meanMotion: 10.843102290386977,
  perigee: 657.8610581463026,
  period: 132.80332154356245,
  position: {
    x: 4000,
    y: 4000,
    z: 4000,
  },
  velocity: {
    x: 7,
    y: 7,
    z: 7,
    total: 14,
  },
  raan: 0.2039103071690015,
  semiMajorAxis: 8622.494665143116,
  semiMinorAxis: 8473.945136538932,
  getAltitude: () => 100,
  getDirection: () => 'N',
  isInSun: () => true,
  getTEARR: () => {
    const currentTEARR = {
      lat: 0.1,
      lon: 0.1,
      alt: 50000,
      az: 0,
      el: 0,
      rng: 0,
    };
    satellite.setTEARR(currentTEARR);
    return currentTEARR;
  },
};

describe('Integration Testing 3', () => {
  let lineManager, groupsManager, cameraManager, dotsManager, satCruncher;

  const keepTrackApi = window.keepTrackApi;
  keepTrackApi.programs = {
    cameraManager: null,
    ColorScheme: ColorScheme,
    drawManager: drawManager,
    objectManager: objectManager,
    orbitManager: orbitManager,
    satSet: satSet,
    satellite: satellite,
    searchBox: searchBox,
    sensorManager: sensorManager,
    settingsManager: settingsManager,
    starManager: starManager,
    timeManager: timeManager,
    uiManager: uiManager,
    uiInput: uiInput,
  };

  // Make testing go faster
  satellite.lookanglesLength = 0.5;

  test('Setup Test Environment', async () => {
    // Load all the plugins now that we have the API initialized
    await import('@app/js/plugins/core').then((mod) => mod.loadCorePlugins(keepTrackApi, settingsManager.plugins));
    await import('@app/js/plugins/plugins').then((mod) => mod.loadExtraPlugins());

    // Start initializing the rest of the website
    timeManager.init();
    uiManager.onReady();
    settingsManager.loadStr('dots');
    uiManager.mobileManager.init();
    cameraManager = new Camera();
    keepTrackApi.programs.cameraManager = cameraManager;
    // We need to know if we are on a small screen before starting webgl
    await drawManager.glInit();
    window.addEventListener('resize', drawManager.resizeCanvas);

    drawManager.loadScene();

    dotsManager = await drawManager.createDotsManager();
    keepTrackApi.programs.dotsManager = dotsManager;

    satSet.init();
    objectManager.init();
    ColorScheme.init();
    drawManager.selectSatManager.init();

    await satSet.loadCatalog(); // Needs Object Manager and gl first
    satCruncher = satSet.satCruncher;
    keepTrackApi.programs.satCruncher = satCruncher;

    dotsManager.setupPickingBuffer(satSet.satData);
    satSet.setColorScheme(ColorScheme.default, true);

    groupsManager = new GroupFactory();
    keepTrackApi.programs.groupsManager = groupsManager;

    orbitManager.init();
    searchBox.init();

    lineManager = new LineFactory();
    keepTrackApi.programs.lineManager = lineManager;

    starManager.init();
    uiManager.init();
    satellite.initLookangles();
    dotsManager.updateSizeBuffer(satSet.satData);
    // await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
    satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
    objectManager.satLinkManager.idToSatnum(satSet);

    uiInput.init();

    drawManager.init();

    // Now that everything is loaded, start rendering to thg canvas
    drawManager.drawLoop();

    // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
    uiManager.postStart();

    // Update any CSS now that we know what is loaded
    keepTrackApi.methods.uiManagerFinal();
  });

  test('drawManager Functional Tests', () => {
    drawManager.screenShot();
    while (cameraManager.cameraType.current !== cameraManager.cameraType.astronomy) {
      cameraManager.cameraType.current++;
    }
    drawManager.orbitsAbove();

    drawManager.checkIfPostProcessingRequired();

    drawManager.demoMode();

    settingsManager.startWithOrbitsDisplayed = true;
    drawManager.startWithOrbits();

    settingsManager.enableConstantSelectedSatRedraw = true;
    objectManager.selectedSat = 0;
    satSet.getSatExtraOnly = () => exampleSat;
    satSet.getSat = () => exampleSat;
    drawManager.canvas.style = {};
    drawManager.drawLoop();

    settingsManager.lowPerf = true;
    drawManager.updateHover();

    meshManager.shaderProgram = {
      uLightDirection: 0,
      uNormalMatrix: 0,
      uMvMatrix: 0,
      uPMatrix: 0,
      uCamMatrix: 0,
      uInSun: 0,
      enableVertexAttribArrays: jest.fn(),
      applyAttributePointers: jest.fn(),
      disableVertexAttribArrays: jest.fn(),
    };
    meshManager.currentModel = {
      inSun: true,
      model: {
        mesh: {
          vertexBuffer: 0,
          indexBuffer: {
            numItems: 0,
          },
        },
      },
    };

    meshManager.loaded = true;
    meshManager.draw(drawManager.pMatrix, cameraManager.camMatrix, null);

    meshManager.currentModel = {
      id: 1,
      model: {
        mesh: {
          indexBuffer: 0,
        },
      },
      nadirYaw: true,
      inSun: true,
      position: {
        x: 1000,
        y: 1000,
        z: 1000,
      },
    };
    meshManager.draw(drawManager.pMatrix, cameraManager.camMatrix, null);

    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.SCC_NUM = '25544';
    exampleSat.OT = 1;
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.SCC_NUM = '00005';
    exampleSat.ON = 'FLOCK';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'STARLINK';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'GLOBALSTAR';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'IRIDIUM';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'ORBCOMM';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'O3B';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'NAVSTAR';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'GALILEO';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.ON = 'FAKE';
    exampleSat.SCC_NUM = '04630';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.SCC_NUM = '36868';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.SCC_NUM = '00005';
    exampleSat.R = 0.05;
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.R = 0.23;
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.R = 5.23;
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.OT = 2;
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.OT = 3;
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    exampleSat.SCC_NUM = '50000';
    meshManager.update(Camera, cameraManager, timeManager, exampleSat);
    meshManager.initShaders();
    // meshManager.meshes = [{}];
    meshManager.initBuffers();
  });

  test('updateLoop Functional Tests', () => {
    satSet.getSatExtraOnly = () => exampleSat;
    satSet.getSat = () => exampleSat;

    timeManager.propRate = 0;
    timeManager.propOffset = 0;
    objectManager.selectedSat = 1;

    drawManager.init();

    drawManager.updateLoop();

    drawManager.sat = exampleSat;

    drawManager.satCalculate();
    drawManager.screenShot();
    drawManager.screenShot();
    drawManager.watermarkedDataUrl(global.document.canvas, 'test');

    settingsManager.enableHoverOverlay = true;
    settingsManager.isDemoModeOn = false;

    cameraManager.cameraType.current = cameraManager.cameraType.astronomy;
    drawManager.orbitsAbove();
    drawManager.isDrawOrbitsAbove = true;
    drawManager.orbitsAbove();
    cameraManager.cameraType.current = cameraManager.cameraType.planetarium;
    drawManager.orbitsAbove();
    sensorManager.currentSensor = sensorManager.sensorList.COD;
    drawManager.orbitsAbove();

    // drawManager.updateHover();
    drawManager.demoMode();
    drawManager.checkIfPostProcessingRequired();

    cameraManager.cameraType.current = cameraManager.cameraType.default;
    const exampleSat2 = exampleSat;
    satSet.getSatExtraOnly = () => exampleSat2;
    exampleSat2.static = true;
    exampleSat2.type = 'Launch Facility';
    drawManager.hoverBoxOnSat();

    exampleSat2.type = 'Control Facility';
    drawManager.hoverBoxOnSat();

    exampleSat2.type = 'Star';
    exampleSat2.ra = 0;
    exampleSat2.dec = 0;
    drawManager.hoverBoxOnSat();

    exampleSat2.type = 'Random';
    drawManager.hoverBoxOnSat();

    exampleSat2.static = false;
    exampleSat2.missile = true;
    drawManager.hoverBoxOnSat();

    exampleSat2.missile = false;
    settingsManager.enableHoverOverlay = true;
    drawManager.hoverBoxOnSat();
    settingsManager.enableHoverOverlay = false;

    settingsManager.disableUI = true;
    drawManager.hoverBoxOnSat();
    settingsManager.disableUI = false;

    satSet.getSatExtraOnly = () => exampleSat;
    cameraManager.cameraType.current = cameraManager.cameraType.planetarium;

    settingsManager.isMobileModeEnabled = true;
    global.window.resizeTo(5000, 2000);
    drawManager.resizeCanvas();

    cameraManager.cameraType.current = cameraManager.cameraType.default;
    settingsManager.enableHoverOverlay = false;
    drawManager.hoverBoxOnSat(1, 100, 100);

    cameraManager.isDragging = false;
    settingsManager.enableHoverOverlay = true;
    drawManager.hoverBoxOnSat(1, 100, 100);

    cameraManager.cameraType.current = cameraManager.cameraType.planetarium;
    drawManager.canvas.style = {};
    drawManager.hoverBoxOnSat();
  });

  test('orbitManager Functional Tests', () => {
    orbitManager.setSelectOrbit(0);
    orbitManager.addInViewOrbit(0);
    orbitManager.removeInViewOrbit(0);
    orbitManager.clearInViewOrbit();
    orbitManager.setHoverOrbit(0);
    orbitManager.clearHoverOrbit();

    orbitManager.playNextSatellite(10, 1970);
  });

  test('Orbit Math Manager Functional Tests', () => {
    timeManager.init();
    const sv = omManager.sat2sv(exampleSat, timeManager);
    omManager.svs2analyst([sv, sv], satSet, timeManager, satellite);
  });

  test('color-scheme-factory Functional Tests', () => {
    ColorScheme.reloadColors();
    satSet.setColorScheme(ColorScheme.onlyFOV, true);
    satSet.setColorScheme(ColorScheme.sunlight, true);
    satSet.setColorScheme(ColorScheme.velocity, true);
    satSet.setColorScheme(ColorScheme.smallsats, true);
    satSet.setColorScheme(ColorScheme.rcs, true);
    satSet.setColorScheme(ColorScheme.countries, true);
    satSet.setColorScheme(ColorScheme.ageOfElset, true);
    satSet.setColorScheme(ColorScheme.lostobjects, true);
    satSet.setColorScheme(ColorScheme.leo, true);
    satSet.setColorScheme(ColorScheme.geo, true);
    satSet.setColorScheme(ColorScheme.default, true);
  });
});
