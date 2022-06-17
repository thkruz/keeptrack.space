import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, rgbCss } from '@app/js/lib/helpers';

const timeMachineMenuDiv = keepTrackApi.html`
<div id="time-machine-menu">
  <ul id="time-machine-default">
    <li>
      <div class="Square-Box legend-payload-box"></div>
      1960s
    </li>
    <li>
      <div class="Square-Box legend-rocketBody-box"></div>
      1970s
    </li>
    <li>
      <div class="Square-Box legend-debris-box"></div>
      1980s
    </li>
    <li>
      <div class="Square-Box legend-pink-box"></div>
      1990s
    </li>
    <li>
      <div class="Square-Box legend-sensor-box"></div>
      2000s
    </li>
    <li>
      <div class="Square-Box legend-facility-box"></div>
      2010s
    </li>
  </ul>
</div>
`.trim();
const defaultDiv = keepTrackApi.html`
<ul id="legend-list-default">
  <li>
    <div class="Square-Box legend-payload-box"></div>
    Payload
  </li>
  <li>
    <div class="Square-Box legend-rocketBody-box"></div>
    Rocket Body
  </li>
  <li>
    <div class="Square-Box legend-debris-box"></div>
    Debris
  </li>
  <li>
    <div class="Square-Box legend-pink-box"></div>
    Special Sats
  </li>
  <li>
    <div class="Square-Box legend-sensor-box"></div>
    Sensor
  </li>
  <li>
    <div class="Square-Box legend-facility-box"></div>
    Launch Site
  </li>
</ul>
`.trim();
const planetariumDiv = keepTrackApi.html`
<ul id="legend-list-planetarium">
  <li>
    <div class="Square-Box legend-payload-box"></div>
    Payload
  </li>
  <li>
    <div class="Square-Box legend-rocketBody-box"></div>
    Rocket Body
  </li>
  <li>
    <div class="Square-Box legend-debris-box"></div>
    Debris
  </li>
  <li>
    <div class="Square-Box legend-pink-box"></div>
    Special Sats
  </li>
</ul>
`.trim();
const astronomyDiv = keepTrackApi.html`
<ul id="legend-list-astronomy">
  <li>
    <div class="Square-Box legend-starHi-box"></div>
    VisMag Less Than 3.5
  </li>
  <li>
    <div class="Square-Box legend-starMed-box"></div>
    VisMag Between 3.5 and 4.7
  </li>
  <li>
    <div class="Square-Box legend-starLow-box"></div>
    VisMag Greater Than 4.7
  </li>
</ul>
`.trim();
const sunlightDiv = keepTrackApi.html`
<ul id="legend-list-sunlight">
  <li>
    <div class="Square-Box legend-satLow-box"></div>
    In Umbral
  </li>
  <li>
    <div class="Square-Box legend-satMed-box"></div>
    In Penumbral
  </li>
  <li>
    <div class="Square-Box legend-satHi-box"></div>
    In Sunlight
  </li>
  <li>
    <div class="Square-Box legend-inFOV-box"></div>
    Satellite In View
  </li>
</ul>
`.trim();
const defaultSensorDiv = keepTrackApi.html`
<ul id="legend-list-default-sensor">
  <li>
    <div class="Square-Box legend-payload-box"></div>
    Payload
  </li>
  <li>
    <div class="Square-Box legend-rocketBody-box"></div>
    Rocket Body
  </li>
  <li>
    <div class="Square-Box legend-debris-box"></div>
    Debris
  </li>
  <li>
    <div class="Square-Box legend-pink-box"></div>
    Special Sats
  </li>
  <li>
    <div class="Square-Box legend-inFOV-box"></div>
    Satellite In View
  </li>
  <li>
    <div class="Square-Box legend-missile-box"></div>
    Missile
  </li>
  <li>
    <div class="Square-Box legend-missileInview-box"></div>
    Missile In View
  </li>
  <li>
    <div class="Square-Box legend-sensor-box"></div>
    Sensor
  </li>
  <li>
    <div class="Square-Box legend-facility-box"></div>
    Launch Site
  </li>
</ul>
`.trim();
const rcsDiv = keepTrackApi.html`
<ul id="legend-list-rcs">
  <li>
    <div class="Square-Box legend-rcsSmall-box"></div>
    Less Than 0.1 sq m
  </li>
  <li>
    <div class="Square-Box legend-rcsMed-box"></div>
    Between 0.1 and 1 sq m
  </li>
  <li>
    <div class="Square-Box legend-rcsLarge-box"></div>
    More Than 1 sq m
  </li>
  <li>
    <div class="Square-Box legend-rcsUnknown-box"></div>
    No Public Data
  </li>
</ul>
`.trim();
const ageOfElsetDiv = keepTrackApi.html`
<ul id="legend-list-ageOfElset">
  <li>
    <div class="Square-Box legend-ageNew-box"></div>
    Less Than 3 Days
  </li>
  <li>
    <div class="Square-Box legend-ageMed-box"></div>
    Less Than 14 Days
  </li>
  <li>
    <div class="Square-Box legend-ageOld-box"></div>
    Less Than 60 Days
  </li>
  <li>
    <div class="Square-Box legend-ageLost-box"></div>
    More Than 60 Days
  </li>
</ul>
`.trim();
const smallDiv = keepTrackApi.html`
<ul id="legend-list-small">
  <li>
    <div class="Square-Box legend-satSmall-box"></div>
    Small Satellite
  </li>
  <!-- <li><div class="Square-Box legend-inFOV-box"></div>Satellite In View</li> -->
</ul>
`.trim();
const nearDiv = keepTrackApi.html`
<ul id="legend-list-near">
  <li>
    <div class="Square-Box legend-satLEO-box"></div>
    Apogee < Than 2000 km
  </li>
  <!-- <li><div class="Square-Box legend-satOther-box"></div>Other Satellite</li> -->
  <li>
    <div class="Square-Box legend-inFOV-box"></div>
    Satellite In View
  </li>
</ul>
`.trim();
const deepDiv = keepTrackApi.html`
<ul id="legend-list-deep">
  <li>
    <div class="Square-Box legend-satGEO-box"></div>
    Perigee > Than 35000 km
  </li>
  <!-- <li><div class="Square-Box legend-satOther-box"></div>Other Satellite</li> -->
  <li>
    <div class="Square-Box legend-inFOV-box"></div>
    Satellite In View
  </li>
</ul>
`.trim();
const velocityDiv = keepTrackApi.html`
<ul id="legend-list-velocity">
  <li>
    <div class="Square-Box legend-velocityFast-box"></div>
    ~7 km/s Velocity
  </li>
  <li>
    <div class="Square-Box legend-velocityMed-box"></div>
    ~4 km/s Velocity
  </li>
  <li>
    <div class="Square-Box legend-velocitySlow-box"></div>
    ~1 km/s Velocity
  </li>
  <!-- Not sure we need to see what is in view in the mode -->
  <!-- <li><div class="Square-Box legend-inviewAlt-box"></div>Satellite In View</li> -->
</ul>
`.trim();
const countriesDiv = keepTrackApi.html`
<ul id="legend-list-countries">
  <li>
    <div class="Square-Box legend-countryUS-box"></div>
    United States
  </li>
  <li>
    <div class="Square-Box legend-countryCIS-box"></div>
    Russia
  </li>
  <li>
    <div class="Square-Box legend-countryPRC-box"></div>
    China
  </li>
  <li>
    <div class="Square-Box legend-countryOther-box"></div>
    Other
  </li>
</ul>
`.trim();

export const legendMenuChange = (menu: string) => {
  const { objectManager, sensorManager, colorSchemeManager } = keepTrackApi.programs;
  const legendHoverDom = getEl('legend-hover-menu');

  switch (menu) {
    case 'rcs':
      legendHoverDom.innerHTML = rcsDiv;
      break;
    case 'small':
      legendHoverDom.innerHTML = smallDiv;
      break;
    case 'near':
      legendHoverDom.innerHTML = nearDiv;
      break;
    case 'deep':
      legendHoverDom.innerHTML = deepDiv;
      break;
    case 'velocity':
      legendHoverDom.innerHTML = velocityDiv;
      break;
    case 'sunlight':
      legendHoverDom.innerHTML = sunlightDiv;
      break;
    case 'ageOfElset':
      legendHoverDom.innerHTML = ageOfElsetDiv;
      break;
    case 'countries':
      legendHoverDom.innerHTML = countriesDiv;
      break;
    case 'planetarium':
      legendHoverDom.innerHTML = planetariumDiv;
      break;
    case 'astronomy':
      legendHoverDom.innerHTML = astronomyDiv;
      break;
    case 'timeMachine':
      legendHoverDom.innerHTML = timeMachineMenuDiv;
      break;
    case 'clear':
    case 'default':
    default:
      if (menu === 'clear') legendHoverDom.style.display = 'none';
      if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected()) {
        legendHoverDom.innerHTML = defaultSensorDiv;
      } else {
        legendHoverDom.innerHTML = defaultDiv;
      }
      break;
  }

  // Update Legend Colors
  legendColorsChange();

  if (settingsManager.currentLegend !== menu) {
    [
      '.legend-payload-box',
      '.legend-rocketBody-box',
      '.legend-debris-box',
      '.legend-inFOV-box',
      '.legend-facility-box',
      '.legend-sensor-box',
      '.legend-facility-box',
      '.legend-missile-box',
      '.legend-missileInview-box',
      '.legend-pink-box',
      '.legend-inFOV-box',
      '.legend-inviewAlt-box',
      '.legend-starLow-box',
      '.legend-starMed-box',
      '.legend-starHi-box',
      '.legend-satLow-box',
      '.legend-satMed-box',
      '.legend-satHi-box',
      '.legend-inviewAlt-box',
      '.legend-rcsSmall-box',
      '.legend-rcsMed-box',
      '.legend-rcsLarge-box',
      '.legend-rcsUnknown-box',
      '.legend-satLEO-box',
      '.legend-satGEO-box',
      '.legend-countryUS-box',
      '.legend-countryCIS-box',
      '.legend-countryPRC-box',
      '.legend-countryOther-box',
      '.legend-ageNew-box',
      '.legend-ageMed-box',
      '.legend-ageOld-box',
      '.legend-ageLost-box',
      '.legend-satSmall-box',
    ].forEach((selector) => {
      const element = <HTMLElement>document.querySelector(selector);
      if (element) {
        element.style.background = settingsManager.colors[selector.split('-')[1]]?.toString();
      }
      colorSchemeManager.objectTypeFlags[selector.split('-')[1]] = true;
    });
    try {
      (<HTMLElement>document.querySelector('.legend-velocitySlow-box')).style.background = rgbCss([1, 0, 0, 1]);
      (<HTMLElement>document.querySelector('.legend-velocityMed-box')).style.background = rgbCss([0.75, 0.25, 0, 1]);
      (<HTMLElement>document.querySelector('.legend-velocityFast-box')).style.background = rgbCss([0.75, 0.75, 0, 1]);
    } catch {
      // Do nothing
    }
    colorSchemeManager.objectTypeFlags.velocitySlow = true;
    colorSchemeManager.objectTypeFlags.velocityMed = true;
    colorSchemeManager.objectTypeFlags.velocityFast = true;
  }
  settingsManager.currentLegend = menu;
};

export const legendColorsChange = function (): void {
  const { colorSchemeManager } = keepTrackApi.programs;
  colorSchemeManager.resetObjectTypeFlags();

  try {
    try {
      (<HTMLElement>document.querySelector('.legend-velocityFast-box')).style.background = rgbCss([0.75, 0.75, 0, 1]);
      (<HTMLElement>document.querySelector('.legend-velocityMed-box')).style.background = rgbCss([0.75, 0.25, 0, 1]);
      (<HTMLElement>document.querySelector('.legend-velocitySlow-box')).style.background = rgbCss([1, 0, 0, 1]);
    } catch {
      // do nothing
    }
    [
      '.legend-payload-box',
      '.legend-rocketBody-box',
      '.legend-debris-box',
      '.legend-pink-box',
      '.legend-inFOV-box',
      '.legend-facility-box',
      '.legend-sensor-box',
      '.legend-inviewAlt-box',
      '.legend-rcsSmall-box',
      '.legend-rcsMed-box',
      '.legend-rcsLarge-box',
      '.legend-rcsUnknown-box',
      '.legend-satLEO-box',
      '.legend-satGEO-box',
      '.legend-countryUS-box',
      '.legend-countryCIS-box',
      '.legend-countryPRC-box',
      '.legend-countryOther-box',
      '.legend-ageNew-box',
      '.legend-ageMed-box',
      '.legend-ageOld-box',
      '.legend-ageLost-box',
      '.legend-satSmall-box',
    ].forEach((element) => {
      try {
        (<HTMLElement>document.querySelector(element)).style.background = rgbCss(settingsManager.colors[element.split('-')[1]]);
      } catch {
        // do nothing
      }
    });
  } catch {
    setTimeout(legendColorsChange, 100);
  }
};
