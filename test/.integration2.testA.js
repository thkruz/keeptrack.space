/* eslint-disable no-undefined */
/* globals
  describe
  global
  test
*/

import 'jsdom-worker';

import { keepTrackApi } from '@app/js/api/externalApi';

import '@app/js/api/externalApi';
import 'jquery-ui-bundle';
import 'materialize-css';
import { LineFactory, sceneManager } from '@app/js/drawManager/sceneManager/sceneManager.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
import { mapManager } from '@app/js/plugins/stereoMap/stereoMap';
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
import $ from 'jquery';
import { missileManager } from '@app/js/plugins/missile/missileManager.ts';

// eslint-disable-next-line sort-imports
import { eventFire, setup } from './setup.js';

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

describe('Integration Testing', () => {
  const keepTrackApi = window.keepTrackApi;
  keepTrackApi.programs = {
    adviceManager: adviceManager,
    cameraManager: null,
    ColorScheme: ColorScheme,
    drawManager: drawManager,
    mapManager: mapManager,
    objectManager: objectManager,
    orbitManager: orbitManager,
    satSet: satSet,
    satellite: satellite,
    sceneManager: sceneManager,
    searchBox: searchBox,
    sensorManager: sensorManager,
    settingsManager: settingsManager,
    starManager: starManager,
    timeManager: timeManager,
    uiManager: uiManager,
    uiInput: uiInput,
  };
  let lineManager, groupsManager, cameraManager, satCruncher, dotsManager;

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

  test('Missile Manager Functional', () => {
    let sim = 'simulation/Russia2USA.json';
    missileManager.MassRaidPre(new Date(), sim);

    let a = 101 - 100;
    let b = 500 - 0;
    missileManager.Missile(0, 0, 41, -71, 3, satSet.missileSats - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.clearMissiles();

    missileManager.Missile(0, 0, 100, -71, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], null, null, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, -100, -71, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 40, -501, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 40, 501, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);

    missileManager.Missile(100, 0, 0, -71, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(-100, 0, 0, -71, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 300, 40, 1, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, -300, 40, 1, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 40, 1, 15, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 40, 1, 15.1, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);

    missileManager.Missile(0, 0, 1, 1, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], null, null, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 0, 180, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], null, null, 0.07, 1000, 'United States', 13000);

    $('#ms-type').val(0);
    $('#ms-attacker').val(101);
    $('#ms-lat-lau').val(0);
    $('#ms-lon-lau').val(0);
    $('#ms-target').val('-1');
    $('#ms-lat').val(40);
    $('#ms-lon').val(180);
    eventFire('missile', 'submit');
    $('#ms-attacker').val(201);
    eventFire('missile', 'submit');
    $('#ms-attacker').val(301);
    eventFire('missile', 'submit');
    $('#ms-attacker').val(401);
    eventFire('missile', 'submit');
    $('#ms-attacker').val(501);
    eventFire('missile', 'submit');
    $('#ms-attacker').val(601);
    eventFire('missile', 'submit');
    $('#ms-attacker').val(701);
    eventFire('missile', 'submit');

    $('#ms-type').val(1);
    eventFire('missile', 'submit');
    $('#ms-type').val(2);
    eventFire('missile', 'submit');
    $('#ms-type').val(3);
    eventFire('missile', 'submit');
    $('#ms-type').val(4);
    eventFire('missile', 'submit');
    $('#ms-type').val(5);
    eventFire('missile', 'submit');
    $('#ms-type').val(6);
    eventFire('missile', 'submit');
    $('#ms-type').val(7);
    eventFire('missile', 'submit');

    $('#ms-lat-lau').val('a');
    eventFire('missile', 'submit');
    $('#ms-lon-lau').val('a');
    $('#ms-lat').val('a');
    eventFire('missile', 'submit');
    $('#ms-lon').val('a');
    eventFire('missile', 'submit');
  });

  test('photoManager Functional', () => {
    satSet.getSatFromObjNum = () => exampleSat;
    satSet.getSatExtraOnly = () => exampleSat;

    // const req = {
    //   response:
    //     '[{"identifier":"20210530010437","caption":"This image was taken by NASA\'s EPIC camera onboard the NOAA DSCOVR spacecraft","image":"epic_1b_20210530010437","version":"03","centroid_coordinates":{"lat":21.291504,"lon":165.9375},"dscovr_j2000_position":{"x":521173.554246,"y":1386579.317085,"z":576553.775},"lunar_j2000_position":{"x":173282.377382,"y":-289823.648477,"z":-153187.465575},"sun_j2000_position":{"x":55408994.591638,"y":129514078.915438,"z":56143391.809486},"attitude_quaternions":{"q0":0.5293,"q1":-0.55936,"q2":-0.5925,"q3":0.23644},"date":"2021-05-30 00:59:48","coords":{"centroid_coordinates":{"lat":21.291504,"lon":165.9375},"dscovr_j2000_position":{"x":521173.554246,"y":1386579.317085,"z":576553.775},"lunar_j2000_position":{"x":173282.377382,"y":-289823.648477,"z":-153187.465575},"sun_j2000_position":{"x":55408994.591638,"y":129514078.915438,"z":56143391.809486},"attitude_quaternions":{"q0":0.5293,"q1":-0.55936,"q2":-0.5925,"q3":0.23644}}}]',
    //   status: 200,
    // };

    // photoManager.dscovr();
    // photoManager.dscovrLoaded(req);
    // photoManager.goes1();
    // photoManager.himawari8();
    // photoManager.meteosat8();
    // photoManager.meteosat11();
  });
});
