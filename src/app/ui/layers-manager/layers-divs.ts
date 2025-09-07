import { html } from '@app/engine/utils/development/formatter';

export const planetariumDiv = html`
<ul id="layers-list-planetarium">
  <li>
    <div class="Square-Box layers-payload-box"></div>
    Payload
  </li>
  <li>
    <div class="Square-Box layers-rocketBody-box"></div>
    Rocket Body
  </li>
  <li>
    <div class="Square-Box layers-debris-box"></div>
    Debris
  </li>
  <li>
    <div class="Square-Box layers-pink-box"></div>
    Special Sats
  </li>
</ul>
`.trim();
export const astronomyDiv = html`
<ul id="layers-list-astronomy">
  <li>
    <div class="Square-Box layers-starHi-box"></div>
    VisMag Less Than 3.5
  </li>
  <li>
    <div class="Square-Box layers-starMed-box"></div>
    VisMag Between 3.5 and 4.7
  </li>
  <li>
    <div class="Square-Box layers-starLow-box"></div>
    VisMag Greater Than 4.7
  </li>
</ul>
`.trim();
export const nearDiv = html`
<ul id="layers-list-near">
  <li>
    <div class="Square-Box layers-satLEO-box"></div>
    Apogee < Than 2000 km
  </li>
  <!-- <li><div class="Square-Box layers-satOther-box"></div>Other Satellite</li> -->
  <li>
    <div class="Square-Box layers-inFOV-box"></div>
    Satellite In View
  </li>
</ul>
`.trim();
export const deepDiv = html`
<ul id="layers-list-deep">
  <li>
    <div class="Square-Box layers-satGEO-box"></div>
    Perigee > Than 35000 km
  </li>
  <!-- <li><div class="Square-Box layers-satOther-box"></div>Other Satellite</li> -->
  <li>
    <div class="Square-Box layers-inFOV-box"></div>
    Satellite In View
  </li>
</ul>
`.trim();

