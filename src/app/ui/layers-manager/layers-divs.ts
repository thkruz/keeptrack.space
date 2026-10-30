import { legendLabel } from '@app/engine/rendering/color-schemes/legend-label';
import { html } from '@app/engine/utils/development/formatter';

/*
 * Legend builders are functions (not constants) so the labels are translated on
 * use, after localization has initialized, instead of at module-parse time.
 */

export const planetariumDiv = (): string =>
  html`
<ul id="layers-list-planetarium">
  <li>
    <div class="Square-Box layers-payload-box"></div>
    ${legendLabel('payload')}
  </li>
  <li>
    <div class="Square-Box layers-rocketBody-box"></div>
    ${legendLabel('rocketBody')}
  </li>
  <li>
    <div class="Square-Box layers-debris-box"></div>
    ${legendLabel('debris')}
  </li>
  <li>
    <div class="Square-Box layers-pink-box"></div>
    ${legendLabel('specialSats')}
  </li>
</ul>
`.trim();
export const astronomyDiv = (): string =>
  html`
<ul id="layers-list-astronomy">
  <li>
    <div class="Square-Box layers-starHi-box"></div>
    ${legendLabel('visMagLessThan35')}
  </li>
  <li>
    <div class="Square-Box layers-starMed-box"></div>
    ${legendLabel('visMagBetween35And47')}
  </li>
  <li>
    <div class="Square-Box layers-starLow-box"></div>
    ${legendLabel('visMagGreaterThan47')}
  </li>
</ul>
`.trim();
export const nearDiv = (): string =>
  html`
<ul id="layers-list-near">
  <li>
    <div class="Square-Box layers-satLEO-box"></div>
    ${legendLabel('apogeeBelow2000')}
  </li>
  <!-- <li><div class="Square-Box layers-satOther-box"></div>Other Satellite</li> -->
  <li>
    <div class="Square-Box layers-inFOV-box"></div>
    ${legendLabel('satelliteInView')}
  </li>
</ul>
`.trim();
export const deepDiv = (): string =>
  html`
<ul id="layers-list-deep">
  <li>
    <div class="Square-Box layers-satGEO-box"></div>
    ${legendLabel('perigeeAbove35000')}
  </li>
  <!-- <li><div class="Square-Box layers-satOther-box"></div>Other Satellite</li> -->
  <li>
    <div class="Square-Box layers-inFOV-box"></div>
    ${legendLabel('satelliteInView')}
  </li>
</ul>
`.trim();
