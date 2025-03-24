import { keepTrackApi } from '@app/keepTrackApi';

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

