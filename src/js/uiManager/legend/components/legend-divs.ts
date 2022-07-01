import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const timeMachineMenuDiv = keepTrackApi.html`
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
export const defaultDiv = keepTrackApi.html`
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
export const planetariumDiv = keepTrackApi.html`
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
export const astronomyDiv = keepTrackApi.html`
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
export const sunlightDiv = keepTrackApi.html`
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
export const defaultSensorDiv = keepTrackApi.html`
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
export const rcsDiv = keepTrackApi.html`
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
export const ageOfElsetDiv = keepTrackApi.html`
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
export const smallDiv = keepTrackApi.html`
<ul id="legend-list-small">
  <li>
    <div class="Square-Box legend-satSmall-box"></div>
    Small Satellite
  </li>
  <!-- <li><div class="Square-Box legend-inFOV-box"></div>Satellite In View</li> -->
</ul>
`.trim();
export const nearDiv = keepTrackApi.html`
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
export const deepDiv = keepTrackApi.html`
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
export const velocityDiv = keepTrackApi.html`
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
export const countriesDiv = keepTrackApi.html`
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
