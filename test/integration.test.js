/* eslint-disable */
// import 'jsdom-global/register';
import 'jsdom-worker';

// keep a copy of the window object to restore
// it at the end of the tests
const oldWindowLocation = window.location;

// delete the existing `Location` object from `jsdom`
delete window.location;

// create a new `window.location` object that's *almost*
// like the real thing
window.location = Object.defineProperties(
  // start with an empty object on which to define properties
  {},
  {
    // grab all of the property descriptors for the
    // `jsdom` `Location` object
    ...Object.getOwnPropertyDescriptors(oldWindowLocation),

    // overwrite a mocked method for `window.location.assign`
    assign: {
      search: '?sat=44444',
      value: jest.fn(),
    },

    // more mocked methods here as needed
  }
);

document.body.innerHTML = global.docBody;
// jest.spyOn(document, 'createElement').mockReturnValueOnce(true);

import 'jquery-ui-bundle';
import 'materialize-css';
import { getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly, satSet } from '@app/js/satSet/satSet.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { LineFactory } from '@app/js/drawManager/sceneManager/sceneManager.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { orbitManager } from '@app/js/orbitManager/orbitManager.js';
import { radarDataManager } from '@app/js/satSet/radarDataManager.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { sensorManager } from '@app/js/sensorManager/sensorManager.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.js';
import { starManager } from '@app/js/starManager/starManager.js';
import { timeManager } from '@app/js/timeManager/timeManager.js';

import { adviceManager } from '@app/js/uiManager/ui-advice.js';

const eventFire = (elStr, etype) => {
  try {
    el = document.getElementById(elStr);
    if (el.fireEvent) {
      el.fireEvent('on' + etype);
    } else {
      var evObj = document.createEvent('Events');
      evObj.initEvent(etype, true, false);
      el.dispatchEvent(evObj);
    }
  } catch (error) {
    console.debug(elStr);
  }
};

// const flushPromises = () => new Promise(setImmediate);

describe('Integration Testing', () => {
  let lineManager, groupsManager, cameraManager;
  test('main.js', async () => {
    // /////////////////////////////////////////////////////////////////////
    try {
      await timeManager.init();
      settingsManager.loadStr('dots');
      uiManager.mobileManager.init();
      cameraManager = new Camera();
      // We need to know if we are on a small screen before starting webgl
      const gl = await drawManager.glInit();
      drawManager.loadScene();
      const dotsManager = await drawManager.createDotsManager();
      satSet.init(gl, dotsManager, cameraManager);
      objectManager.init(sensorManager);
      await ColorScheme.init(gl, cameraManager, timeManager, sensorManager, objectManager, satSet, satellite, settingsManager);
      drawManager.selectSatManager.init(ColorScheme.group);
      await satSet.loadCatalog(); // Needs Object Manager and gl first
      const satCruncher = satSet.satCruncher;

      dotsManager.setupPickingBuffer(satSet.satData);
      satSet.setColorScheme(ColorScheme.default, true);

      groupsManager = new GroupFactory(satSet, ColorScheme, settingsManager);
      await orbitManager.init(gl, cameraManager, groupsManager);
      searchBox.init(satSet, groupsManager, orbitManager, dotsManager);
      lineManager = new LineFactory(gl, orbitManager.shader, getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly);
      starManager.init(lineManager, getIdFromStarName);
      uiManager.init(cameraManager, lineManager, starManager, groupsManager, satSet, orbitManager, groupsManager, ColorScheme);
      await satellite.initLookangles(satSet, satCruncher, sensorManager, groupsManager);
      dotsManager.updateSizeBuffer(satSet.satData);
      await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
      satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
      objectManager.satLinkManager.idToSatnum(satSet);

      uiInput.init(cameraManager, objectManager, satellite, satSet, lineManager, sensorManager, starManager, ColorScheme, satCruncher, uiManager, drawManager, dotsManager);

      await drawManager.init(groupsManager, uiInput, starManager, satellite, ColorScheme, cameraManager, objectManager, orbitManager, sensorManager, uiManager, lineManager, dotsManager);

      // Now that everything is loaded, start rendering to thg canvas
      await drawManager.drawLoop();

      // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
      uiManager.postStart();

      // Reveleal Key Components to the Console
      window.satSet = satSet;
    } catch (error) {
      console.warn(error);
    }
    // /////////////////////////////////////////////////////////////////////
  });
  test('UI Manager Functional', () => {
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
    eventFire('time-machine-icon', 'click');
    eventFire('legend-menu', 'click');
    eventFire('menu-selectable', 'click');
    eventFire('reset-sensor-button', 'click');
    eventFire('search-results', 'click');
    eventFire('share-icon', 'click');
    eventFire('fullscreen-icon', 'click');
    eventFire('nav-footer-toggle', 'click');
    eventFire('export-lookangles', 'click');
    eventFire('export-launch-info', 'click');
    eventFire('export-multiSiteArray', 'click');
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

  test('UI Manager Functional', () => {
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
    uiManager.keyHandler({ key: '+' });
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

    uiManager.toast('Test', 'normal', true);
    uiManager.toast('Test', 'caution', true);
    uiManager.toast('Test', 'serious', true);
    uiManager.toast('Test', 'critical', false);

    uiManager.saveHiResPhoto('hd');
    uiManager.saveHiResPhoto('4k');
    uiManager.saveHiResPhoto('8k');

    uiManager.updateMap();

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
    testGroup.forEach(() => {});
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
    sensorManager.setSensor('SSN', 0);
    sensorManager.setSensor('NATO-MW', 0);
    sensorManager.setSensor('RUS-ALL', 0);
    sensorManager.setSensor('LEO-LABS', 0);
    sensorManager.setSensor('MD-ALL', 0);
    sensorManager.setSensor('COD', 0);
    sensorManager.setSensor('FAKE', 1);
    sensorManager.checkSensorSelected();
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

    console.error = jest.fn();
    missileManager.Missile(100, 0, 0, -71, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(-100, 0, 0, -71, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 300, 40, 1, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, -300, 40, 1, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 40, 1, 15, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 40, 1, 15.1, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);

    missileManager.Missile(0, 0, 1, 1, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], null, null, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', 13000);
    missileManager.Missile(0, 0, 0, 180, 3, 500 - b, new Date(), missileManager.UsaICBM[a * 4 + 2], null, null, 0.07, 1000, 'United States', 13000);
  });

  test('lookangles Functional Tests', () => {
    satellite.getlookangles(satSet.getSat(0));
    satellite.getlookanglesMultiSite(satSet.getSat(0));
    satellite.findCloseObjects();
  });
});
