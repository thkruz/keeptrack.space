/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek

advice-module.js manages all recommended actions to the user in a semi-tutorial
manner. It works closely with ui.js
http://keeptrack.space

All rights reserved. No part of this web site may be reproduced, published,
distributed, displayed, performed, copied or stored for public or private
use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */
// eslint-disable-next-line sort-imports
import 'jquery-ui-bundle';
import { keepTrackApi } from '../../api/keepTrackApi';
import { AdviceCounter, AdviceList } from '../../api/keepTrackTypes';
import { getEl, shake } from '../../lib/helpers';

let isAdviceEnabled = true;
let helpDOM: HTMLElement;
let helpCloseDOM: HTMLElement;
let helpHeaderDOM: HTMLElement;
let helpTextDOM: HTMLElement;
let tutIconDOM: HTMLElement;
let curFocusDOM: any;
let adviceList: AdviceList;
let adviceCount: AdviceCounter;

export const onReady = (wasAdviceEnabledOverride?: boolean) => {
  // Code Once index.htm is loaded
  let wasAdviceEnabled = null;
  try {
    let pastSelection = localStorage.getItem('isAdviceEnabled');
    if (pastSelection === 'true') wasAdviceEnabled = true;
    if (pastSelection === 'false') wasAdviceEnabled = false;
  } catch (e) {
    console.debug(e);
  }

  if (wasAdviceEnabled || wasAdviceEnabled == null || wasAdviceEnabledOverride) {
    adviceManager.on();

    let adviceDisplayTime = 60 * 1000; // 60s
    adviceManager.adviceArray = [
      adviceList.welcome,
      adviceList.useLegend,
      adviceList.showSensors,
      adviceList.findIss,
      adviceList.missileMenu,
      adviceList.toggleNight,
      adviceList.colorScheme,
      adviceList.customSensors,
      adviceList.countries,
    ];

    // Queue Advice Timers
    for (let i = 0; i < adviceManager.adviceArray.length; i++) {
      setTimeout(adviceManager.adviceArray[i], i * adviceDisplayTime);
    }
  } else {
    adviceManager.off();
  }
  keepTrackApi.methods.adviceReady();
};
export const welcome = (): void => {
  // Only Do this Twice
  if (adviceCount.welcome >= 3) return;
  adviceCount.welcome += 1;

  adviceManager.showAdvice(
    'Welcome',
    'Welcome to KeepTrack.Space! This is the advice system. It will offer ideas on how to use the features on this site. You can enable/disable it at anytime in the top right.',
    getEl('tutorial-icon'),
    'top-left'
  );
};
export const findIss = (): void => {
  // Only Do this Twice
  if (adviceCount.findIss >= 3) return;
  adviceCount.findIss += 1;

  adviceManager.showAdvice('Space Station', 'Did you know the international space station is object 25544?', getEl('search-holder'), 'top-right');
};
export const showSensors = (): void => {
  // Only Do this Twice Times
  if (adviceCount.showSensors >= 3) return;
  adviceCount.showSensors += 1;

  adviceManager.showAdvice('Sensor List', 'Have you tried looking at some of the ground-based sensors?', getEl('menu-sensor-list'), 'bottom-left');
};
export const useLegend = (): void => {
  // Only Do this Twice
  if (adviceCount.useLegend >= 3) return;
  adviceCount.useLegend += 1;

  adviceManager.showAdvice('Filters', "Sometimes it is helpful to filter out satellites you don't want to see right now!", getEl('legend-menu'), 'top-right');
};
export const togleNight = (): void => {
  // Only Do this Twice
  if (adviceCount.toggleNight >= 3) return;
  adviceCount.toggleNight += 1;

  adviceManager.showAdvice('Day/Night Toggle', 'Having trouble seeing parts of the earth? You can toggle on/off the night effect.', getEl('menu-day-night'), 'bottom');
};
export const missileMenu = (): void => {
  // Only Do this Twice
  if (adviceCount.missileMenu >= 3) return;
  adviceCount.missileMenu += 1;

  adviceManager.showAdvice(
    'Missile Scenarios',
    'Curious how intercontinental ballistic missiles work? Try launching a few from the missile menu.',
    getEl('menu-missile'),
    'bottom-right'
  );
};
export const satelliteSelected = (): void => {
  // Only Do this Twice
  if (adviceCount.satelliteView < 1) {
    showSatelliteCameraAdvice();
  } else if (adviceCount.newLaunch < 1) {
    // Only Do this Twice
    showLaunchNominalAdvice();
  } else if (adviceCount.breakup < 1) {
    // Only Do this Twice
    showBreakupAdvice();
  } else if (adviceCount.editSat < 1) {
    // Only Do this Twice
    showEditSatAdvice();
  } else if (adviceCount.satelliteView < 3) {
    showSatelliteCameraAdvice();
  } else if (adviceCount.newLaunch < 3) {
    showLaunchNominalAdvice();
  } else if (adviceCount.breakup < 3) {
    showBreakupAdvice();
  } else if (adviceCount.editSat < 3) {
    // Only Do this Twice
    showEditSatAdvice();
  } else {
    // Intentionally left blank
  }
};
export const colorScheme = (): void => {
  // Only Do this Twice
  if (adviceCount.colorScheme >= 3) return;
  adviceCount.colorScheme += 1;

  adviceManager.showAdvice(
    'Color Schemes',
    'Sometimes it is easier to visualize data by changing the color scheme. You can select from a collection of premade color schemes!',
    getEl('menu-color-scheme'),
    'bottom'
  );
};
export const countries = (): void => {
  // Only Do this Twice
  if (adviceCount.countries >= 3) return;
  adviceCount.countries += 1;

  adviceManager.showAdvice(
    'Countries Menu',
    'Did you know that most orbital objects were launched by three countries! Check out the countries menu to view all the satellites launched by a coutnry.',
    getEl('menu-countries'),
    'bottom'
  );
};
export const cspocSensors = (): void => {
  // Only Do this Twice
  if (adviceCount.cspocSensors >= 3) return;
  adviceCount.cspocSensors += 1;

  adviceManager.showAdvice(
    'Combined Space Operations Center Sensors',
    'Known by many names (USSPACECOM, 1 SPCS, JSpOC, JSpOC/SSA), the CSpOC coordinates space assets from many countries including United States, United Kingdom, Canada, and Australia.',
    null,
    'right'
  );
};
export const mwSensors = (): void => {
  // Only Do this Twice
  if (adviceCount.mwSensors >= 3) return;
  adviceCount.mwSensors += 1;

  adviceManager.showAdvice(
    'USSTRATCOM Missile Warning Sensors',
    'These sensors primary function is to scan the horizon for potential ICBM launches. Their data is relayed to the Missile Warning Center in Cheyene Mountain, CO.',
    null,
    'right'
  );
};
export const customSensors = (): void => {
  // Only Do this Twice
  if (adviceCount.customSensors >= 3) return;
  adviceCount.customSensors += 1;

  adviceManager.showAdvice(
    'Custom Sensor',
    'Trying to visualize a new sensor or what a current sensor would look like with a different configuration? Try making your own using the custom sensor menu!',
    getEl('menu-customSensor'),
    'bottom-left'
  );
};
export const planetariumDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.planetariumDisabled >= 3) return;
  adviceCount.planetariumDisabled += 1;

  adviceManager.showAdvice(
    'Planetarium View',
    'Using Planetarium View requres a sensor to be selected first. Try selecting a sensor using the Sensor List to find one!',
    getEl('menu-sensor-list'),
    'bottom-right'
  );
};
export const satViewDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.satViewDisabled >= 3) return;
  adviceCount.satViewDisabled += 1;

  adviceManager.showAdvice(
    'Satellite View',
    'Using Satellite View requres a satellite to be selected first. Click on any satellite on the screen and then try using this view again!',
    null,
    'bottom-right'
  );
};
export const mapDIsabled = (): void => {
  // Only Do this Twice
  if (adviceCount.mapDisabled >= 3) return;
  adviceCount.mapDisabled += 1;

  adviceManager.showAdvice(
    'Stereographic Map',
    'Using the Stereographic Map requres a satellite to be selected first. Click on any satellite on the screen and then try loading the map again!',
    null,
    'bottom-right'
  );
};
export const lookanglesDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.lookanglesDisabled >= 3) return;
  adviceCount.lookanglesDisabled += 1;

  adviceManager.showAdvice(
    'Look Angles',
    'Calculatiung Look Angles requres a satellite and a sensor to be selected first.Pick a sensor, then click any satellite on the screen, and then try calculating Look Angles again!',
    null,
    'bottom-left'
  );
};
export const ssnLookanglesDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.ssnLookanglesDisabled >= 3) return;
  adviceCount.ssnLookanglesDisabled += 1;

  adviceManager.showAdvice(
    'SSN Lookangles',
    'Calculatiung Look Angles for the whole SSN requres a satellite to be selected first. Click any satellite on the screen, and then try calculating Look Angles for the SSN again!',
    null,
    'bottom-left'
  );
};
export const survFenceDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.survFenceDisabled >= 3) return;
  adviceCount.survFenceDisabled += 1;

  adviceManager.showAdvice(
    'Show/Hide Surveillance Fence',
    'Displaying the Surveillance Fence requres a sensor to be selected first. Try picking a sensor from the Sensor List and then try again!',
    getEl('menu-sensor-list'),
    'bottom-left'
  );
};
export const bubbleDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.bubbleDisabled >= 3) return;
  adviceCount.bubbleDisabled += 1;

  adviceManager.showAdvice(
    'Show/Hide Field Of View Bubble',
    'Displaying the FOV Bubble requres a sensor to be selected first. Try picking a sensor from the Sensor List and then try again!',
    getEl('menu-sensor-list'),
    'bottom-left'
  );
};
export const sensorInfoDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.sensorInfoDisabled >= 3) return;
  adviceCount.sensorInfoDisabled += 1;

  adviceManager.showAdvice(
    'Sensor Information',
    'Displaying Sensor Information requres a sensor to be selected first. Try picking a sensor from the Sensor List and then try again!',
    getEl('menu-sensor-list'),
    'bottom-left'
  );
};
export const editSatDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.editSatDisabled >= 3) return;
  adviceCount.editSatDisabled += 1;

  adviceManager.showAdvice(
    'Edit Satellite',
    'Editing a Satellite requres a satellite to be selected first. Try picking any satellite from the screen and then try again!',
    null,
    'bottom-right'
  );
};
export const breakupDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.breakupDisabled >= 3) return;
  adviceCount.breakupDisabled += 1;

  adviceManager.showAdvice(
    'Create Breakup',
    'Creating a Breakup requres a satellite to be selected first. Pick any satellite from the screen and then try again!',
    null,
    'bottom-right'
  );
};
export const satFovDisabled = (): void => {
  // Only Do this Twice
  if (adviceCount.satFovDisabled >= 3) return;
  adviceCount.satFovDisabled += 1;

  adviceManager.showAdvice(
    'Satellite Field of View',
    "Viewing a satellite's field of view requires a satellite to be selected first. Pick any satellite from the screen and then try again!",
    null,
    'bottom'
  );
};
export const sensor = (): void => {
  // Only Do this Twice
  if (adviceCount.sensorFOV < 1) {
    shoFieldOfViewAdvice();
  } else if (adviceCount.sensorSurv < 1) {
    showSurvFenceAdvice();
  } else if (adviceCount.sensorFOV < 3) {
    shoFieldOfViewAdvice();
  } else if (adviceCount.sensorSurv < 3) {
    showSurvFenceAdvice();
  }
};
export const isEnabled = (): boolean => isAdviceEnabled;
export const on = () => {
  try {
    localStorage.setItem('isAdviceEnabled', 'true');
  } catch {
    // Do Nothing
  }
  isAdviceEnabled = true;
  tutIconDOM.classList.add('bmenu-item-selected');
};
export const off = () => {
  try {
    localStorage.setItem('isAdviceEnabled', 'false');
  } catch {
    // Do Nothing
  }
  isAdviceEnabled = false;
  helpDOM.style.display = 'none';
  tutIconDOM.classList.remove('bmenu-item-selected');
};
export const showAdvice = (header: string, text: string, focusDOM: HTMLElement, setLocation: string) => {
  if (!isAdviceEnabled) return;

  setLocation ??= 'bottom-left';
  adviceManager.clearAdvice();
  curFocusDOM = focusDOM;

  switch (setLocation) {
    case 'top-left':
      helpDOM.style.left = '1%';
      helpDOM.style.right = 'auto';
      helpDOM.style.top = '1%';
      helpDOM.style.bottom = 'auto';
      break;
    case 'left':
      helpDOM.style.left = '1%';
      helpDOM.style.right = 'auto';
      helpDOM.style.top = '40%';
      helpDOM.style.bottom = 'auto';
      break;
    case 'bottom-left':
      helpDOM.style.left = '1%';
      helpDOM.style.right = 'auto';
      helpDOM.style.top = '60%';
      helpDOM.style.bottom = 'auto';
      break;
    case 'bottom':
      var leftValue = window.innerWidth / 2 - 175 + 'px';
      helpDOM.style.left = leftValue;
      helpDOM.style.right = 'auto';
      helpDOM.style.top = '60%';
      helpDOM.style.bottom = 'auto';
      break;
    case 'top-right':
      helpDOM.style.left = 'auto';
      helpDOM.style.right = '1%';
      helpDOM.style.top = '1%';
      helpDOM.style.bottom = 'auto';
      break;
    case 'right':
      helpDOM.style.left = 'auto';
      helpDOM.style.right = '1%';
      helpDOM.style.top = '40%';
      helpDOM.style.bottom = 'auto';
      break;
    case 'bottom-right':
      helpDOM.style.left = 'auto';
      helpDOM.style.right = '1%';
      helpDOM.style.top = '60%';
      helpDOM.style.bottom = 'auto';
      break;
  }

  helpDOM.style.display = 'block';
  helpHeaderDOM.innerHTML = header;
  helpTextDOM.innerText = text;
  if (typeof focusDOM != 'undefined' && focusDOM != null) {
    shake(focusDOM);
    focusDOM.classList.add('bmenu-item-help');
    helpHeaderDOM.classList.add('help-header-sel');

    helpHeaderDOM.addEventListener('click', function () {
      shake(focusDOM);
      focusDOM.classList.add('bmenu-item-help');
    });
    focusDOM.addEventListener('mouseover', function () {
      focusDOM.classList.remove('bmenu-item-help');
    });

    focusDOM.addEventListener('click', function () {
      focusDOM.classList.remove('bmenu-item-help');
      helpDOM.style.display = 'none';
    });

    helpCloseDOM.addEventListener('click', function () {
      helpHeaderDOM.classList.remove('help-header-sel');
      focusDOM.classList.remove('bmenu-item-help');
      helpHeaderDOM.onclick = null;
      if (!(focusDOM === tutIconDOM)) {
        focusDOM.onclick = null;
      }
      helpDOM.style.display = 'none';
    });
  } else {
    helpCloseDOM.addEventListener('click', function () {
      helpDOM.style.display = 'none';
    });
  }
};
export const clearAdvice = function (): void {
  helpHeaderDOM.classList.remove('help-header-sel');
  helpHeaderDOM.onclick = null;
  if (typeof curFocusDOM != 'undefined' && curFocusDOM != null) {
    curFocusDOM.classList.remove('bmenu-item-help');
    if (!(curFocusDOM === tutIconDOM)) {
      curFocusDOM.onclick = null;
    }
  }
};
export const init = () => {
  helpDOM = getEl('help-screen');
  helpCloseDOM = getEl('help-close');
  helpHeaderDOM = getEl('help-header');
  helpTextDOM = getEl('help-text');
  tutIconDOM = getEl('tutorial-icon');

  // Used on a timer to hint at other ideas
  tutIconDOM.addEventListener('click', function () {
    if (isAdviceEnabled) {
      adviceManager.off();
    } else {
      adviceManager.on();
    }
  });

  adviceManager.onReady();
};

export const adviceManager = {
  clearAdvice: clearAdvice,
  isEnabled: isEnabled,
  off: off,
  on: on,
  onReady: onReady,
  showAdvice: showAdvice,
  adviceList: {
    breakupDisabled: breakupDisabled,
    bubbleDisabled: bubbleDisabled,
    colorScheme: colorScheme,
    countries: countries,
    cspocSensors: cspocSensors,
    customSensors: customSensors,
    editSatDisabled: editSatDisabled,
    findIss: findIss,
    lookanglesDisabled: lookanglesDisabled,
    mapDisabled: mapDIsabled,
    missileMenu: missileMenu,
    mwSensors: mwSensors,
    planetariumDisabled: planetariumDisabled,
    satelliteSelected: satelliteSelected,
    satFovDisabled: satFovDisabled,
    satViewDisabled: satViewDisabled,
    sensor: sensor,
    sensorInfoDisabled: sensorInfoDisabled,
    showSensors: showSensors,
    ssnLookanglesDisabled: ssnLookanglesDisabled,
    survFenceDisabled: survFenceDisabled,
    toggleNight: togleNight,
    useLegend: useLegend,
    welcome: welcome,
  },
  adviceCount: {
    breakup: 0,
    breakupDisabled: 0,
    bubbleDisabled: 0,
    colorScheme: 0,
    countries: 0,
    cspocSensors: 0,
    customSensors: 0,
    editSat: 0,
    editSatDisabled: 0,
    findIss: 0,
    lookanglesDisabled: 0,
    mapDisabled: 0,
    missileMenu: 0,
    mwSensors: 0,
    planetariumDisabled: 0,
    satelliteView: 0,
    satFovDisabled: 0,
    satViewDisabled: 0,
    sensorFOV: 0,
    sensorInfoDisabled: 0,
    sensorSurv: 0,
    showSensors: 0,
    ssnLookanglesDisabled: 0,
    survFenceDisabled: 0,
    toggleNight: 0,
    useLegend: 0,
    welcome: 0,
  },
  adviceArray: [] as any[],
};
adviceList = adviceManager.adviceList;
adviceCount = adviceManager.adviceCount;

export { adviceList };

const showEditSatAdvice = () => {
  adviceCount.editSat += 1;

  adviceManager.showAdvice(
    'Edit Satellite',
    'Trying to understand how orbital parameters work? Have you tried editing a satellite to see what the impact is of changing those parameters?',
    getEl('menu-editSat'),
    'bottom-right'
  );
};

const showBreakupAdvice = () => {
  adviceCount.breakup += 1;

  adviceManager.showAdvice(
    'Create a Breakup',
    'Curious what this satellite would look like in a 100 pieces? Create a breakup using the breakup menu below! This is also helpful for understanding what a large cubesat launch looks like over time.',
    getEl('menu-breakup'),
    'right'
  );
};

const showLaunchNominalAdvice = () => {
  adviceCount.newLaunch += 1;

  adviceManager.showAdvice(
    'Create Launch Nominal',
    'Trying to figure out when a new launch will be in your view? After selecting an ' +
      'object with a similar orbit, use the launch nominal creator menu to position the ' +
      'satellite over the launch site at a time of 0000z. Now you can see details using ' +
      'relative time.',
    getEl('menu-newLaunch'),
    'top-right'
  );
};

const showSatelliteCameraAdvice = () => {
  adviceCount.satelliteView += 1;

  adviceManager.showAdvice(
    'Satellite Camera View',
    'Did you know you can change the camera to show what a satellite sees? You have to have a satellite currently selected to use it.',
    getEl('menu-satview'),
    'bottom'
  );
};

const showSurvFenceAdvice = () => {
  adviceCount.sensorSurv += 1;
  adviceManager.showAdvice(
    'Surveillance Fence',
    "Most ground-based sensors don't actively look at their entire field of view! They usually scan the horizon. You can see the difference by showing their surveillance fence.",
    getEl('menu-surveillance'),
    'bottom-left'
  );
};

const shoFieldOfViewAdvice = () => {
  adviceCount.sensorFOV += 1;
  adviceManager.showAdvice(
    'Field Of View Bubbles',
    'Are you having trouble understanding what a sensor can see? Enable the Field of View Bubble to make it easier to visualize!',
    getEl('menu-fov-bubble'),
    'bottom-left'
  );
};
