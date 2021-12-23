import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { rgbCss } from '@app/js/lib/helpers';
import $ from 'jquery';

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
    <li class="legend-trusat">
      <div class="Square-Box legend-trusat-box"></div>
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
  <li class="legend-trusat">
    <div class="Square-Box legend-trusat-box"></div>
    TruSat
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
    <div class="Square-Box legend-trusat-box"></div>
    TruSat
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
    <div class="Square-Box legend-trusat-box"></div>
    TruSat
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
    Period Less Than 225 min
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
    Period More Than 225 min
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
  const legendHoverDom: JQuery<HTMLElement, HTMLElement> = $('#legend-hover-menu');

  switch (menu) {
    case 'rcs':
      legendHoverDom.html(rcsDiv);
      break;
    case 'small':
      legendHoverDom.html(smallDiv);
      break;
    case 'near':
      legendHoverDom.html(nearDiv);
      break;
    case 'deep':
      legendHoverDom.html(deepDiv);
      break;
    case 'velocity':
      legendHoverDom.html(velocityDiv);
      break;
    case 'sunlight':
      legendHoverDom.html(sunlightDiv);
      break;
    case 'ageOfElset':
      legendHoverDom.html(ageOfElsetDiv);
      break;
    case 'countries':
      legendHoverDom.html(countriesDiv);
      break;
    case 'planetarium':
      legendHoverDom.html(planetariumDiv);
      break;
    case 'astronomy':
      legendHoverDom.html(astronomyDiv);
      break;
    case 'timeMachine':
      legendHoverDom.html(timeMachineMenuDiv);
      break;
    case 'clear':
    case 'default':
    default:
      if (menu === 'clear') legendHoverDom.hide();
      if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected()) {
        legendHoverDom.html(defaultSensorDiv);
      } else {
        legendHoverDom.html(defaultDiv);
      }
      break;
  }

  // Update Legend Colors
  legendColorsChange();

  if (settingsManager.currentLegend !== menu) {
    $('.legend-payload-box').css('background', settingsManager.colors.payload.toString());
    colorSchemeManager.objectTypeFlags.payload = true;
    $('.legend-rocketBody-box').css('background', settingsManager.colors.rocketBody.toString());
    colorSchemeManager.objectTypeFlags.rocketBody = true;
    $('.legend-debris-box').css('background', settingsManager.colors.debris.toString());
    colorSchemeManager.objectTypeFlags.debris = true;
    $('.legend-sensor-box').css('background', settingsManager.colors.sensor.toString());
    colorSchemeManager.objectTypeFlags.sensor = true;
    $('.legend-facility-box').css('background', settingsManager.colors.facility.toString());
    colorSchemeManager.objectTypeFlags.facility = true;
    $('.legend-missile-box').css('background', settingsManager.colors.missile.toString());
    colorSchemeManager.objectTypeFlags.missile = true;
    $('.legend-missileInview-box').css('background', settingsManager.colors.missileInview.toString());
    colorSchemeManager.objectTypeFlags.missileInview = true;
    $('.legend-trusat-box').css('background', settingsManager.colors.trusat.toString());
    colorSchemeManager.objectTypeFlags.trusat = true;
    $('.legend-inFOV-box').css('background', settingsManager.colors.inView.toString());
    colorSchemeManager.objectTypeFlags.inFOV = true;
    $('.legend-starLow-box').css('background', settingsManager.colors.starLow.toString());
    colorSchemeManager.objectTypeFlags.starLow = true;
    $('.legend-starMed-box').css('background', settingsManager.colors.starMed.toString());
    colorSchemeManager.objectTypeFlags.starMed = true;
    $('.legend-starHi-box').css('background', settingsManager.colors.starHi.toString());
    colorSchemeManager.objectTypeFlags.starHi = true;
    $('.legend-satLow-box').css('background', settingsManager.colors.sunlight60.toString());
    colorSchemeManager.objectTypeFlags.satLow = true;
    $('.legend-satMed-box').css('background', settingsManager.colors.sunlight80.toString());
    colorSchemeManager.objectTypeFlags.satMed = true;
    $('.legend-satHi-box').css('background', settingsManager.colors.sunlight100.toString());
    colorSchemeManager.objectTypeFlags.satHi = true;
    $('.legend-rcsSmall-box').css('background', settingsManager.colors.rcsSmall.toString());
    colorSchemeManager.objectTypeFlags.satSmall = true;
    $('.legend-satSmall-box').css('background', settingsManager.colors.satSmall.toString());
    colorSchemeManager.objectTypeFlags.rcsSmall = true;
    $('.legend-rcsMed-box').css('background', settingsManager.colors.rcsMed.toString());
    colorSchemeManager.objectTypeFlags.rcsMed = true;
    $('.legend-rcsLarge-box').css('background', settingsManager.colors.rcsLarge.toString());
    colorSchemeManager.objectTypeFlags.rcsLarge = true;
    $('.legend-rcsUnknown-box').css('background', settingsManager.colors.rcsUnknown.toString());
    colorSchemeManager.objectTypeFlags.rcsUnknown = true;
    $('.legend-velocitySlow-box').css('background', [1.0, 0, 0.0, 1.0].toString());
    colorSchemeManager.objectTypeFlags.velocitySlow = true;
    $('.legend-velocityMed-box').css('background', [0.5, 0.5, 0.0, 1.0].toString());
    colorSchemeManager.objectTypeFlags.velocityMed = true;
    $('.legend-velocityFast-box').css('background', [0, 1, 0.0, 1.0].toString());
    colorSchemeManager.objectTypeFlags.velocityFast = true;
    $('.legend-inviewAlt-box').css('background', settingsManager.colors.inViewAlt.toString());
    colorSchemeManager.objectTypeFlags.inViewAlt = true;
    $('.legend-satLEO-box').css('background', settingsManager.colors.satLEO.toString());
    colorSchemeManager.objectTypeFlags.satLEO = true;
    $('.legend-satGEO-box').css('background', settingsManager.colors.satGEO.toString());
    colorSchemeManager.objectTypeFlags.satGEO = true;
    $('.legend-countryUS-box').css('background', settingsManager.colors.countryUS.toString());
    colorSchemeManager.objectTypeFlags.countryUS = true;
    $('.legend-countryCIS-box').css('background', settingsManager.colors.countryCIS.toString());
    colorSchemeManager.objectTypeFlags.countryCIS = true;
    $('.legend-countryPRC-box').css('background', settingsManager.colors.countryPRC.toString());
    colorSchemeManager.objectTypeFlags.countryPRC = true;
    $('.legend-countryOther-box').css('background', settingsManager.colors.countryOther.toString());
    colorSchemeManager.objectTypeFlags.countryOther = true;
    $('.legend-ageNew-box').css('background', settingsManager.colors.ageNew.toString());
    colorSchemeManager.objectTypeFlags.ageNew = true;
    $('.legend-ageMed-box').css('background', settingsManager.colors.ageMed.toString());
    colorSchemeManager.objectTypeFlags.ageMed = true;
    $('.legend-ageOld-box').css('background', settingsManager.colors.ageOld.toString());
    colorSchemeManager.objectTypeFlags.ageOld = true;
    $('.legend-ageLost-box').css('background', settingsManager.colors.ageLost.toString());
    colorSchemeManager.objectTypeFlags.ageLost = true;
  }
  settingsManager.currentLegend = menu;
};

export const legendColorsChange = function (): void {
  const { colorSchemeManager } = keepTrackApi.programs;
  colorSchemeManager.resetObjectTypeFlags();

  $('.legend-payload-box').css('background', rgbCss(settingsManager.colors.payload));
  $('.legend-rocketBody-box').css('background', rgbCss(settingsManager.colors.rocketBody));
  $('.legend-debris-box').css('background', rgbCss(settingsManager.colors.debris));
  $('.legend-inFOV-box').css('background', rgbCss(settingsManager.colors.inView));
  $('.legend-facility-box').css('background', rgbCss(settingsManager.colors.facility));
  $('.legend-sensor-box').css('background', rgbCss(settingsManager.colors.sensor));
  if (settingsManager.trusatMode || settingsManager.isExtraSatellitesAdded) {
    $('.legend-trusat-box').css('background', rgbCss(settingsManager.colors.trusat));
  } else {
    try {
      $('.legend-trusat-box')[1].parentElement.style.display = 'none';
      $('.legend-trusat-box')[2].parentElement.style.display = 'none';
      $('.legend-trusat-box')[3].parentElement.style.display = 'none';
    } catch {
      // do nothing
    }
  }
  $('.legend-velocityFast-box').css('background', rgbCss([0.75, 0.75, 0, 1]));
  $('.legend-velocityMed-box').css('background', rgbCss([0.75, 0.25, 0, 1]));
  $('.legend-velocitySlow-box').css('background', rgbCss([1, 0, 0, 1]));
  $('.legend-inviewAlt-box').css('background', rgbCss(settingsManager.colors.inViewAlt));
  $('.legend-rcsSmall-box').css('background', rgbCss(settingsManager.colors.rcsSmall));
  $('.legend-rcsMed-box').css('background', rgbCss(settingsManager.colors.rcsMed));
  $('.legend-rcsLarge-box').css('background', rgbCss(settingsManager.colors.rcsLarge));
  $('.legend-rcsUnknown-box').css('background', rgbCss(settingsManager.colors.rcsUnknown));
  $('.legend-ageNew-box').css('background', rgbCss(settingsManager.colors.ageNew));
  $('.legend-ageMed-box').css('background', rgbCss(settingsManager.colors.ageMed));
  $('.legend-ageOld-box').css('background', rgbCss(settingsManager.colors.ageOld));
  $('.legend-ageLost-box').css('background', rgbCss(settingsManager.colors.ageLost));
  $('.legend-satLEO-box').css('background', rgbCss(settingsManager.colors.satLEO));
  $('.legend-satGEO-box').css('background', rgbCss(settingsManager.colors.satGEO));
  $('.legend-satSmall-box').css('background', rgbCss(settingsManager.colors.satSmall));
  $('.legend-countryUS-box').css('background', rgbCss(settingsManager.colors.countryUS));
  $('.legend-countryCIS-box').css('background', rgbCss(settingsManager.colors.countryCIS));
  $('.legend-countryPRC-box').css('background', rgbCss(settingsManager.colors.countryPRC));
  $('.legend-countryOther-box').css('background', rgbCss(settingsManager.colors.countryOther));
};
