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
import { jQAlt } from '@app/js/lib/jqalt.js';
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

test('Integration Testing', async () => {
  // /////////////////////////////////////////////////////////////////////
  try {
    await timeManager.init();
    settingsManager.loadStr('dots');
    uiManager.mobileManager.init();
    const cameraManager = new Camera();
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

    const groupsManager = new GroupFactory(satSet, ColorScheme, settingsManager);
    await orbitManager.init(gl, cameraManager, groupsManager);
    searchBox.init(satSet, groupsManager, orbitManager, dotsManager);
    const lineManager = new LineFactory(gl, orbitManager.shader, getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly);
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

  db.gremlins();

  expect(true).toBe(true);
});
