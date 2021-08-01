/* eslint-disable no-undefined */
/* globals
describe
test
$
*/

import 'jsdom-worker';

import { eventFire, setup } from './setup.js';
import { keepTrackApi } from '@app/js/api/externalApi';

import 'jquery-ui-bundle';
import 'materialize-css';
import { LineFactory, sceneManager } from '@app/js/drawManager/sceneManager/sceneManager.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { adviceManager } from '@app/js/uiManager/ui-advice.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
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

keepTrackApi.programs = {
  adviceManager: adviceManager,
  cameraManager: null,
  ColorScheme: ColorScheme,
  drawManager: drawManager,
  mapManager: null,
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

let cameraManager, dotsManager, satCruncher, groupsManager, lineManager, mapManager, adviceList, exampleSat;
setup.init();

describe('Integration Testing', async () => {
  test('Initialization', async () => {
    (function redirectHttpToHttps() {
      // This is necessary for some of the geolocation based functions
      // but it only runs on the main website
      if (window.location.protocol === 'http:' && (window.location.hostname === 'keeptrack.space' || window.location.hostname === 'www.keeptrack.space')) {
        var httpURL = window.location.hostname + window.location.pathname + window.location.search;
        var httpsURL = 'https://' + httpURL;
        window.location = httpsURL;
      }
    })();

    const initalizeKeepTrack = async () => {
      try {
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
        if (typeof process !== 'undefined') {
          // NOTE: Jest fails with webgl2 so we use webgl1 during testing
          // This means we need to mock some of the webgl2 code
          // eslint-disable-next-line no-undef
          keepTrackApi.programs.drawManager.gl = global.mocks.glMock;
        }

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
      } catch (error) {
        /* istanbul ignore next */
        console.warn(error);
      }
    };

    initalizeKeepTrack();
    satellite.lookanglesLength = 0.5;
    exampleSat = {
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
  });

  test('UI Manager Functional 1', () => {
    adviceManager.onReady();
    uiManager.onReady();

    eventFire('clear-lines-rmb', 'click');
    eventFire('findCsoBtn', 'click');
    eventFire('all-objects-link', 'click');
    eventFire('near-orbits-link', 'click');
    eventFire('datetime-text', 'click');
    eventFire('search-close', 'click');
    eventFire('info-overlay-content', 'click');
    eventFire('bottom-icons', 'click');
    eventFire('bottom-menu', 'click');
    eventFire('legend-hover-menu', 'click');
    eventFire('menu-selectable', 'click');
    eventFire('reset-sensor-button', 'click');
    eventFire('search-results', 'click');
    eventFire('share-icon', 'click');
    eventFire('share-icon', 'click');
    eventFire('fullscreen-icon', 'click');
    eventFire('nav-footer-toggle', 'click');
    eventFire('export-lookangles', 'click');
    eventFire('export-launch-info', 'click');
    eventFire('export-multiSiteArray', 'click');
    eventFire('search-icon', 'click');

    eventFire('editSat-newTLE', 'click');
    // eventFire('editSat-save', 'click');
    eventFire('editSat-open', 'click');
    eventFire('map-menu', 'click');
    eventFire('socrates-menu', 'click');
    eventFire('satChng-menu', 'click');
    eventFire('watchlist-list', 'click');
    eventFire('watchlist-content', 'click');
    eventFire('cs-telescope', 'click');

    $('#stfForm').trigger('submit');

    // $('#obfit-form').submit

    // Click Everything Twice
    for (let i = 0; i < 2; i++) {
      uiManager.countryMenuClick('Canada');
      uiManager.countryMenuClick('China');
      uiManager.countryMenuClick('France');
      uiManager.countryMenuClick('India');
      uiManager.countryMenuClick('Israel');
      uiManager.countryMenuClick('Japan');
      uiManager.countryMenuClick('Russia');
      uiManager.countryMenuClick('UnitedKingdom');
      uiManager.countryMenuClick('UnitedStates');
      uiManager.constellationMenuClick('SpaceStations');
      uiManager.constellationMenuClick('GlonassGroup');
      uiManager.constellationMenuClick('GalileoGroup');
      uiManager.constellationMenuClick('GPSGroup');
      uiManager.constellationMenuClick('AmatuerRadio');
      uiManager.constellationMenuClick('aehf');
      uiManager.constellationMenuClick('wgs');
      uiManager.constellationMenuClick('starlink');
      uiManager.constellationMenuClick('sbirs');

      uiManager.legendHoverMenuClick('legend-payload-box');
      uiManager.legendHoverMenuClick('legend-payload-box');
      uiManager.legendHoverMenuClick('legend-rocketBody-box');
      uiManager.legendHoverMenuClick('legend-rocketBody-box');
      uiManager.legendHoverMenuClick('legend-debris-box');
      uiManager.legendHoverMenuClick('legend-debris-box');
      uiManager.legendHoverMenuClick('legend-starHi-box');
      uiManager.legendHoverMenuClick('legend-starHi-box');
      uiManager.legendHoverMenuClick('legend-starMed-box');
      uiManager.legendHoverMenuClick('legend-starMed-box');
      uiManager.legendHoverMenuClick('legend-starLow-box');
      uiManager.legendHoverMenuClick('legend-starLow-box');
      uiManager.legendHoverMenuClick('legend-satHi-box');
      uiManager.legendHoverMenuClick('legend-satHi-box');
      uiManager.legendHoverMenuClick('legend-satMed-box');
      uiManager.legendHoverMenuClick('legend-satMed-box');
      uiManager.legendHoverMenuClick('legend-satLow-box');
      uiManager.legendHoverMenuClick('legend-satLow-box');
      uiManager.legendHoverMenuClick('legend-inFOV-box');
      uiManager.legendHoverMenuClick('legend-inFOV-box');
      uiManager.legendHoverMenuClick('legend-velocityFast-box');
      uiManager.legendHoverMenuClick('legend-velocityFast-box');
      uiManager.legendHoverMenuClick('legend-velocityMed-box');
      uiManager.legendHoverMenuClick('legend-velocityMed-box');
      uiManager.legendHoverMenuClick('legend-velocitySlow-box');
      uiManager.legendHoverMenuClick('legend-velocitySlow-box');
      uiManager.legendHoverMenuClick('legend-inviewAlt-box');
      uiManager.legendHoverMenuClick('legend-inviewAlt-box');
      uiManager.legendHoverMenuClick('legend-ageNew-box');
      uiManager.legendHoverMenuClick('legend-ageNew-box');
      uiManager.legendHoverMenuClick('legend-ageMed-box');
      uiManager.legendHoverMenuClick('legend-ageMed-box');
      uiManager.legendHoverMenuClick('legend-ageOld-box');
      uiManager.legendHoverMenuClick('legend-ageOld-box');
      uiManager.legendHoverMenuClick('legend-ageLost-box');
      uiManager.legendHoverMenuClick('legend-ageLost-box');
      uiManager.legendHoverMenuClick('legend-rcsSmall-box');
      uiManager.legendHoverMenuClick('legend-rcsSmall-box');
      uiManager.legendHoverMenuClick('legend-rcsMed-box');
      uiManager.legendHoverMenuClick('legend-rcsMed-box');
      uiManager.legendHoverMenuClick('legend-rcsLarge-box');
      uiManager.legendHoverMenuClick('legend-rcsLarge-box');
      uiManager.legendHoverMenuClick('legend-rcsUnknown-box');
      uiManager.legendHoverMenuClick('legend-rcsUnknown-box');
      uiManager.legendHoverMenuClick('legend-missile-box');
      uiManager.legendHoverMenuClick('legend-missile-box');
      uiManager.legendHoverMenuClick('legend-missileInview-box');
      uiManager.legendHoverMenuClick('legend-missileInview-box');
      uiManager.legendHoverMenuClick('legend-sensor-box');
      uiManager.legendHoverMenuClick('legend-sensor-box');
      uiManager.legendHoverMenuClick('legend-facility-box');
      uiManager.legendHoverMenuClick('legend-facility-box');
      uiManager.legendHoverMenuClick('legend-trusat-box');
      uiManager.legendHoverMenuClick('legend-trusat-box');
      uiManager.legendHoverMenuClick('legend-countryUS-box');
      uiManager.legendHoverMenuClick('legend-countryUS-box');
      uiManager.legendHoverMenuClick('legend-countryCIS-box');
      uiManager.legendHoverMenuClick('legend-countryCIS-box');
      uiManager.legendHoverMenuClick('legend-countryPRC-box');
      uiManager.legendHoverMenuClick('legend-countryPRC-box');
      uiManager.legendHoverMenuClick('legend-countryOther-box');
      uiManager.legendHoverMenuClick('legend-countryOther-box');
      uiManager.legendHoverMenuClick('fake');

      eventFire('time-machine-icon', 'click');
      eventFire('legend-menu', 'click');
    }

    uiManager.reloadLastSensor();

    uiManager.searchToggle();
    uiManager.searchToggle(true);
    uiManager.searchToggle(false);

    uiManager.keyHandler({ key: undefined });
    uiManager.keyHandler({ key: 'R' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });

    document.getElementById('datetime-text').appendChild(document.createElement('div'));

    uiManager.keyHandler({ key: '!' });
    uiManager.keyHandler({ key: ',' });
    uiManager.keyHandler({ key: '.' });
    uiManager.keyHandler({ key: '<' });
    uiManager.keyHandler({ key: '>' });
    uiManager.keyHandler({ key: '0' });
    uiManager.keyHandler({ key: '+' });
    uiManager.keyHandler({ key: '=' });
    uiManager.keyHandler({ key: '-' });
    uiManager.keyHandler({ key: '_' });
    uiManager.keyHandler({ key: '1' });

    uiManager.hideLoadingScreen();
    uiManager.useCurrentGeolocationAsSensor();

    uiManager.legendMenuChange('rcs');
    uiManager.legendMenuChange('small');
    uiManager.legendMenuChange('near');
    uiManager.legendMenuChange('deep');
    uiManager.legendMenuChange('velocity');
    uiManager.legendMenuChange('sunlight');
    uiManager.legendMenuChange('ageOfElset');
    uiManager.legendMenuChange('countries');
    uiManager.legendMenuChange('planetarium');
    uiManager.legendMenuChange('astronomy');
    uiManager.legendMenuChange('clear');

    uiManager.updateURL();
    uiManager.reloadLastSensor();

    uiManager.footerToggle();
    uiManager.footerToggle();

    uiManager.toast('Test', 'normal', true);
    uiManager.toast('Test', 'caution', true);
    uiManager.toast('Test', 'serious', true);
    uiManager.toast('Test', 'critical', false);

    uiManager.saveHiResPhoto('hd');
    uiManager.saveHiResPhoto('4k');
    uiManager.saveHiResPhoto('8k');

    mapManager.updateMap();

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sensor-list',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sensor-list',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sat-photo',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sat-photo',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-info-overlay',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-info-overlay',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sensor-info',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sensor-info',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookangles',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookangles',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-dops',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-dops',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-watchlist',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-watchlist',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-analysis',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-analysis',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-external',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-external',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookanglesmultisite',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookanglesmultisite',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-find-sat',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-find-sat',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-twitter',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-twitter',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-map',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-map',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-launches',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-launches',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-about',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-about',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satellite-collision',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satellite-collision',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satChng',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satChng',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-obfit',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-obfit',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-settings',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-settings',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-editSat',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-editSat',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-newLaunch',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-newLaunch',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-breakup',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-breakup',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-customSensor',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-customSensor',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-missile',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-missile',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-fov-bubble',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-fov-bubble',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-surveillance',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-surveillance',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sat-fov',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sat-fov',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-day-night',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-day-night',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-time-machine',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-time-machine',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-photo',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-color-scheme',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-color-scheme',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-constellations',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-constellations',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-countries',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-countries',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-nextLaunch',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-nextLaunch',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-planetarium',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-planetarium',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-astronomy',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-astronomy',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satview',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satview',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-record',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-record',
      },
    });

    sensorManager.setSensor('COD', 0);
    drawManager.sensorPos = satellite.calculateSensorPos(sensorManager.currentSensor);
    for (let i = 0; i < 10; i++) {
      cameraManager.cameraType.current++;
      cameraManager.update(exampleSat);
    }

    cameraManager.camPitch = NaN;
    cameraManager.update(exampleSat);

    cameraManager.cameraType.current = cameraManager.cameraType.planetarium;
    cameraManager.update(exampleSat);

    cameraManager.cameraType.current = cameraManager.cameraType.satellite;
    cameraManager.update(exampleSat);

    // cameraManager.earthHitTest(gl, dotsManager, 1, 1);
  });

  test('Line Functional', () => {
    lineManager.clear();

    lineManager.create('ref', [10000, 0, 0], 'r');
    lineManager.create('ref', [0, 10000, 0], 'g');
    lineManager.create('ref', [0, 0, 10000], 'b');
    lineManager.create('ref', [0, 0, 10000], 'o');
    lineManager.create('ref', [0, 0, 10000], 'y');
    lineManager.create('ref', [0, 0, 10000], 'c');
    lineManager.create('ref', [0, 0, 10000], 'p');
    lineManager.create('ref2', [0, 0, 10000, 0, 10000, 0], 'w');

    lineManager.drawWhenSelected();
    lineManager.removeStars();

    lineManager.create('ref', [0, 0, 10000], [1, 1, 1, 1]);
    lineManager.create('ref', [0, 0, 10000], [-1, 1, 1]);
    lineManager.create('ref', [0, 0, 10000]);

    lineManager.create('sat', 0);
    lineManager.create('sat2', [0, 0, 0, 10000]);
    lineManager.create('sat3', [0, 1]);
    lineManager.create('sat4', [0, 1]);
    lineManager.create('sat5', [0, 1]);

    lineManager.draw();
  });

  test('Star Manager Functional', () => {
    starManager.findStarsConstellation('Ursa Minor');
    starManager.drawAllConstellations();
    starManager.drawConstellations('Ursa Minor');
    starManager.clearConstellations();
  });

  test('Group Manager Functional', () => {
    groupsManager.createGroup('yearOrLess', 1965);
    groupsManager.createGroup('idList', [0]);
    let testGroup = groupsManager.createGroup('all', '');
    groupsManager.createGroup('year', ['1980']);
    groupsManager.createGroup('intlDes', ['1998-A']);
    groupsManager.createGroup('countryRegex', /CA/u);
    groupsManager.createGroup('objNum', ['25544']);
    groupsManager.createGroup('nameRegex', /NAVSTAR/iu);

    groupsManager.selectGroup(testGroup, orbitManager);

    groupsManager.selectGroupNoOverlay(testGroup);

    testGroup.hasSat(5);
    testGroup.forEach(() => {
      // do nothing
    });
  });

  test('Camera Manager Functional', () => {
    Camera.longToYaw(60, new Date());
    Camera.latToPitch(60);
    let test = cameraManager.dragStartPitch;
    test = cameraManager.dragStartYaw;
    test = cameraManager.speedModifier;
    test = cameraManager.localRotateStartPosition;
    test = cameraManager.isLocalRotateRoll;
    test = cameraManager.isLocalRotateRoll = 1;
    test = cameraManager.isLocalRotateYaw;
    test = cameraManager.isLocalRotateYaw = 1;
    test = cameraManager.camZoomSnappedOnSat;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    test = cameraManager.camAngleSnappedOnSat;

    cameraManager.camSnap(1, 1);

    cameraManager.keyUpHandler({ key: undefined });
    cameraManager.keyUpHandler({ key: 'A' });
    cameraManager.keyUpHandler({ key: 'D' });
    cameraManager.keyUpHandler({ key: 'S' });
    cameraManager.keyUpHandler({ key: 'W' });
    cameraManager.keyUpHandler({ key: 'Q' });
    cameraManager.keyUpHandler({ key: 'E' });
    cameraManager.keyUpHandler({ key: 'J' });
    cameraManager.keyUpHandler({ key: 'L' });
    cameraManager.keyUpHandler({ key: 'I' });
    cameraManager.keyUpHandler({ key: 'K' });
    cameraManager.keyUpHandler({ key: 'SHIFT' });
    cameraManager.keyUpHandler({ key: 'ShiftRight' });

    cameraManager.keyDownHandler({ key: undefined });
    cameraManager.keyDownHandler({ key: 'A' });
    cameraManager.keyDownHandler({ key: 'D' });
    cameraManager.keyDownHandler({ key: 'S' });
    cameraManager.keyDownHandler({ key: 'W' });
    cameraManager.keyDownHandler({ key: 'Q' });
    cameraManager.keyDownHandler({ key: 'E' });
    cameraManager.keyDownHandler({ key: 'J' });
    cameraManager.keyDownHandler({ key: 'L' });
    cameraManager.keyDownHandler({ key: 'I' });
    cameraManager.keyDownHandler({ key: 'K' });
    cameraManager.keyDownHandler({ key: 'SHIFT' });
    cameraManager.keyDownHandler({ key: 'ShiftRight' });

    cameraManager.calculate(-1, 1);
    cameraManager.calculate(1, 1);
    cameraManager.cameraType.current = cameraManager.cameraType.offset;
    cameraManager.update();
    cameraManager.cameraType.current++;
    cameraManager.update();
    cameraManager.cameraType.current++;
    cameraManager.update();
    // TODO: Include ability to test other camera views

    cameraManager.getCamPos();
  });

  test('satLinkManager Functional', () => {
    objectManager.satLinkManager.showLinks(lineManager, satSet, 'aehf');
    objectManager.satLinkManager.showLinks(lineManager, satSet, 'dscs');
    objectManager.satLinkManager.showLinks(lineManager, satSet, 'wgs');
    objectManager.satLinkManager.showLinks(lineManager, satSet, 'iridium');
    objectManager.satLinkManager.showLinks(lineManager, satSet, 'starlink');
    objectManager.satLinkManager.showLinks(lineManager, satSet, 'galileo');
    objectManager.satLinkManager.showLinks(lineManager, satSet, 'sbirs');
  });

  test('Sensor Manager Functional', () => {
    sensorManager.sensorListLength();
    timeManager.propRate = 0;
    timeManager.propOffset = 0;
    sensorManager.setSensor('SSN', 0);
    sensorManager.setSensor('NATO-MW', 0);
    sensorManager.setSensor('RUS-ALL', 0);
    sensorManager.setSensor('LEO-LABS', 0);
    sensorManager.setSensor('MD-ALL', 0);
    sensorManager.setSensor('COD', 0);
    sensorManager.setSensor('FAKE', 1);
    sensorManager.checkSensorSelected();
  });

  test('lookangles Functional Tests', () => {
    satellite.getlookangles(satSet.getSat(0));
    satellite.getlookanglesMultiSite(satSet.getSat(0));
    satellite.findCloseObjects();

    satellite.map(exampleSat, 0);
    satellite.eci2ll(5000, 5000, 5000);
    satellite.getSunTimes(exampleSat);
    satellite.getDOPs(0, 0, 0);
    satSet.getSatExtraOnly = () => exampleSat;
    satSet.getSat = () => exampleSat;
    satellite.findChangeOrbitToDock(exampleSat, exampleSat, 0, 5000);
    satellite.createManeuverAnalyst(0, 1, 1, 1);
    satellite.findClosestApproachTime(exampleSat, exampleSat, 0, 5000);
    satellite.findNearbyObjectsByOrbit(exampleSat);

    satellite.calculateLookAngles(exampleSat);
    satellite.calculateLookAngles(exampleSat, sensorManager.sensorList.COD);
    satellite.calculateLookAngles(exampleSat, sensorManager.sensorList.COD, 0);

    satellite.findBestPasses('00000,00000', sensorManager.sensorList.COD);

    satellite.distance(exampleSat, exampleSat);

    satellite.calculateVisMag(satSet.getSatFromObjNum(25544), sensorManager.currentSensor, timeManager.propTime(), drawManager.sceneManager.sun);

    satellite.nextpass(exampleSat);
    satellite.nextpass(exampleSat, sensorManager.sensorList.COD);
    satellite.nextpass(exampleSat, sensorManager.sensorList.COD, 1);
    satellite.nextpass(exampleSat, sensorManager.sensorList.COD, 1, 30);

    satellite.nextNpasses(exampleSat);
    satellite.nextNpasses(exampleSat, sensorManager.sensorList.COD);
    satellite.nextNpasses(exampleSat, sensorManager.sensorList.COD, 1);
    satellite.nextNpasses(exampleSat, sensorManager.sensorList.COD, 1, 30);
    satellite.nextNpasses(exampleSat, sensorManager.sensorList.COD, 1, 30, 2);
  });

  test('satSet Functional Tests', () => {
    satSet.searchAzElRange(0, 10, 10, 90, 100, 100, 1000000, 90, 500, 500, 10, 10, 1);

    satSet.exportTle2Txt();
    satSet.exportTle2Csv();

    satSet.setHover(0);
    satSet.selectSat(0);

    satSet.onCruncherReady();

    satSet.searchN2yo(5, 80000);
    satSet.searchCelestrak(5, 80000);

    satSet.selectSat(1);

    satSet.setSat(2, exampleSat);
    satSet.mergeSat(exampleSat);

    satCruncher.onmessage({
      data: {
        extraData: JSON.stringify(satSet.satData),
      },
    });

    satCruncher.onmessage({
      data: {
        extraUpdate: true,
        extraData: JSON.stringify(satSet.satData),
        satId: 0,
      },
    });

    satCruncher.onmessage({
      data: {
        satPos: [0],
        satVel: [0],
        satInView: [0],
        satInSun: [0],
        sensorMarkerArray: [0],
      },
    });

    settingsManager.isMapUpdateOverride = true;
    settingsManager.socratesOnSatCruncher = true;
    satCruncher.onmessage({
      data: {
        satPos: [0],
        satVel: [0],
        satInView: [0],
        satInSun: [0],
        sensorMarkerArray: [0],
      },
    });

    dotsManager.inViewData = [];
    dotsManager.inViewData[0] = true;
    satSet.getSatInViewOnly(0);

    dotsManager.positionData = [1, 1, 1, 1, 1, 1, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

    satSet.getIdFromEci({ x: 5000, y: 5000, z: 50000 });
    satSet.getIdFromSensorName();
    satSet.getScreenCoords(0, drawManager.pMatrix, cameraManager.camMatrix, null, exampleSat.position);

    settingsManager.offline = true;
    satSet.loadCatalog();
    settingsManager.offline = false;
    satSet.loadCatalog();
  });

  test('UI Manager Functional 2', () => {
    adviceList.findISS();
    adviceList.findISS();
    adviceList.findISS();
    adviceList.showSensors();
    adviceList.showSensors();
    adviceList.showSensors();
    adviceList.useLegend();
    adviceList.useLegend();
    adviceList.useLegend();
    adviceList.toggleNight();
    adviceList.toggleNight();
    adviceList.toggleNight();
    adviceList.missileMenu();
    adviceList.missileMenu();
    adviceList.missileMenu();
    adviceList.satelliteSelected();
    adviceList.satelliteSelected();
    adviceList.satelliteSelected();
    adviceList.satelliteSelected();
    adviceList.satelliteSelected();
    adviceList.colorScheme();
    adviceList.colorScheme();
    adviceList.colorScheme();
    adviceList.countries();
    adviceList.countries();
    adviceList.countries();
    adviceList.socrates();
    adviceList.socrates();
    adviceList.socrates();
    adviceList.cspocSensors();
    adviceList.cspocSensors();
    adviceList.cspocSensors();
    adviceList.mwSensors();
    adviceList.mwSensors();
    adviceList.mwSensors();
    adviceList.customSensors();
    adviceList.customSensors();
    adviceList.customSensors();
    adviceList.lookanglesDisabled();
    adviceList.lookanglesDisabled();
    adviceList.lookanglesDisabled();

    uiInput.rmbMenuActions({ target: { id: 'save-hd-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'save-4k-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'save-8k-rmb' } });
    // uiInput.rmbMenuActions({ target: { id: 'view-info-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'view-sat-info-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'view-sensor-info-rmb' } });
    // uiInput.rmbMenuActions({ target: { id: 'view-related-sats-rmb' } });
    // uiInput.rmbMenuActions({ target: { id: 'view-curdops-rmb' } });
    // uiInput.rmbMenuActions({ target: { id: 'view-24dops-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'edit-sat-rmb' } });
    // uiInput.rmbMenuActions({ target: { id: 'create-sensor-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'reset-camera-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'clear-lines-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'line-eci-axis-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'line-earth-sat-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'line-sensor-sat-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'line-sat-sat-rmb' } });
    // uiInput.rmbMenuActions({ target: { id: 'create-observer-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'colors-default-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'colors-sunlight-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'colors-country-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'colors-velocity-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'colors-ageOfElset-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'earth-blue-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'earth-nasa-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'earth-trusat-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'earth-low-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'earth-high-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'earth-high-no-clouds-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'earth-vec-rmb' } });
    uiInput.rmbMenuActions({ target: { id: 'clear-screen-rmb' } });

    eventFire('help-header', 'click');
    eventFire('help-close', 'click');

    uiInput.openRmbMenu();
    uiInput.mouseSat = 1;
    uiInput.openRmbMenu();
    uiManager.earthClicked();
    uiInput.canvasMouseUp({ button: 0 });
    uiInput.canvasMouseUp({ button: 2 });
    uiInput.canvasTouchStart({
      originalEvent: {
        touches: [
          {
            pageX: 100,
            pageY: 100,
          },
          {
            pageX: 200,
            pageY: 200,
          },
        ],
      },
    });
    uiInput.canvasTouchStart({
      originalEvent: {
        touches: [
          {
            clientX: 100,
            clientY: 100,
          },
        ],
      },
    });
    uiInput.canvasMouseDown({ button: 0 });
    uiInput.canvasMouseDown({ button: 2 });
    uiInput.canvasWheel({
      originalEvent: {
        deltaY: 10,
        deltaMode: 1,
      },
    });
    uiInput.canvasWheel({
      originalEvent: {
        deltaY: -10,
        deltaMode: 0,
      },
    });
    uiInput.canvasClick();

    eventFire('keeptrack-canvas', 'click');
    // eventFire('keeptrack-canvas', 'touchmove');
    eventFire('keeptrack-canvas', 'mousemove');
    eventFire('keeptrack-canvas', 'wheel');
    eventFire('keeptrack-canvas', 'mousedown');
    // eventFire('keeptrack-canvas', 'touchstart');
    eventFire('keeptrack-canvas', 'mouseup');
    // eventFire('keeptrack-canvas', 'touchend');

    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });
    uiManager.keyHandler({ key: 'C' });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-info-overlay',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-info-overlay',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sensor-info',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sensor-info',
      },
    });

    satSet.getSatInSun();
    satSet.getSatVel();

    satSet.getSatExtraOnly = () => exampleSat;
    satSet.getSat = () => exampleSat;
    satSet.selectSat(0);

    // SUPER SLOW

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookangles',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookangles',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookanglesmultisite',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-lookanglesmultisite',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-editSat',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-editSat',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-stf',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-stf',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-newLaunch',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-newLaunch',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-breakup',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-breakup',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-fov-bubble',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-fov-bubble',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-surveillance',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-surveillance',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sat-fov',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-sat-fov',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-planetarium',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-planetarium',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-astronomy',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-astronomy',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satview',
      },
    });
    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-satview',
      },
    });

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-map',
      },
    });

    mapManager.updateMap();

    uiManager.bottomIconPress({
      currentTarget: {
        id: 'menu-map',
      },
    });

    objectManager.selectedSat = -1;
    eventFire('near-objects-link', 'click');
    eventFire('stf-on-object-link', 'click');

    // One of these broke everything!

    // objectManager.selectedSat = 0;
    // eventFire('near-objects-link', 'click');
    // eventFire('search-results', 'mouseout');

    // eslint-disable-next-line no-undef
    settingsManager.db.gremlins();

    settingsManager.trusatMode = true;
    settingsManager.isShowLogo = true;
    settingsManager.lowPerf = true;
    uiManager.init(cameraManager, lineManager, starManager, groupsManager, satSet, orbitManager, groupsManager, ColorScheme);
    settingsManager.trusatMode = false;
    settingsManager.isShowLogo = false;
    settingsManager.lowPerf = false;
    uiManager.init(cameraManager, lineManager, starManager, groupsManager, satSet, orbitManager, groupsManager, ColorScheme);

    document.getElementById('es-day').value = '-1';
    eventFire('es-day', 'keyup');
    document.getElementById('es-day').value = '367';
    eventFire('es-day', 'keyup');
    document.getElementById('es-inc').value = '-1';
    eventFire('es-inc', 'keyup');
    document.getElementById('es-inc').value = '181';
    eventFire('es-inc', 'keyup');
    document.getElementById('es-rasc').value = '-1';
    eventFire('es-rasc', 'keyup');
    document.getElementById('es-rasc').value = '361';
    eventFire('es-rasc', 'keyup');
    document.getElementById('es-meanmo').value = '-1';
    eventFire('es-meanmo', 'keyup');
    document.getElementById('es-meanmo').value = '18.5';
    eventFire('es-meanmo', 'keyup');
    document.getElementById('es-argPe').value = '-1';
    eventFire('es-argPe', 'keyup');
    document.getElementById('es-argPe').value = '361';
    eventFire('es-argPe', 'keyup');
    document.getElementById('es-meana').value = '-1';
    eventFire('es-meana', 'keyup');
    document.getElementById('es-meana').value = '361';
    eventFire('es-meana', 'keyup');
    document.getElementById('ms-lat').value = '-91';
    eventFire('ms-lat', 'keyup');
    document.getElementById('ms-lat').value = '91';
    eventFire('ms-lat', 'keyup');
    document.getElementById('ms-lon').value = '-181';
    eventFire('ms-lon', 'keyup');
    document.getElementById('ms-lon').value = '181';
    eventFire('ms-lon', 'keyup');

    let el = document.getElementById('editSat').getElementsByTagName('div')[0].getElementsByTagName('input')[0];
    let evObj = new Event('keydown', { bubbles: true, cancelable: false });
    evObj.keyCode = 46;
    el.dispatchEvent(evObj);
    evObj.keyCode = 65;
    evObj.ctrlKey = true;
    el.dispatchEvent(evObj);
    evObj.ctrlKey = false;
    evObj.keyCode = 65;
    evObj.metaKey = true;
    el.dispatchEvent(evObj);
    evObj.metaKey = false;
    evObj.keyCode = 36;
    el.dispatchEvent(evObj);
    evObj.keyCode = 190;
    el.dispatchEvent(evObj);
    evObj.keyCode = 200;
    el.dispatchEvent(evObj);
    evObj.shiftKey = true;
    el.dispatchEvent(evObj);
    evObj.shiftKey = false;
    evObj.keyCode = 98;
    el.dispatchEvent(evObj);

    el = document.getElementById('es-ecen');
    evObj.keyCode = 190;
    el.dispatchEvent(evObj);
    evObj.keyCode = 191;
    el.dispatchEvent(evObj);
  });
});
