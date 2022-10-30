import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { RAD2DEG } from '@app/js/lib/constants';
import { getEl, stringPad } from '@app/js/lib/helpers';
import { StringifiedNubmer } from '@app/js/satMath/tle/tleFormater';

let doOnce = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'orbitReferences',
    cb: () => uiManagerInit(),
  });
};

export const uiManagerInit = (): void => {
  // Register orbital element data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'orbitReferences',
    cb: selectSatData,
  });
};

export const selectSatData = (sat: SatObject) => {
  // Skip this if there is no satellite object because the menu isn't open
  if (sat === null || typeof sat === 'undefined') {
    return;
  }

  if (!doOnce) {
    getEl('sat-info-top-links').insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
        <div id="orbit-references-link" class="link sat-infobox-links">Generate Orbit Reference Satellites...</div>
      `
    );
    getEl('orbit-references-link').addEventListener('click', orbitReferencesLinkClick);
    doOnce = true;
  }
};

export const orbitReferencesLinkClick = () => {
  const { satSet, objectManager, uiManager, satellite } = keepTrackApi.programs;

  // Determine which satellite is selected
  const sat = satSet.getSat(objectManager.selectedSat);
  let satNum = objectManager.analSatSet[0].id + 20000; // Find Analyst satellite 10,000
  let searchStr = '';

  // Add the satellites
  const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);
  const ecen = satrec.ecco.toFixed(7).substr(2, 7);
  const rasc = <StringifiedNubmer>(satrec.nodeo * RAD2DEG).toString();
  const argPe = <StringifiedNubmer>(satrec.argpo * RAD2DEG).toString();
  const inc = <StringifiedNubmer>sat.TLE2.substr(8, 8);
  const meanmo = <StringifiedNubmer>sat.TLE2.substr(52, 10);
  const epochyr = sat.TLE1.substr(18, 2);
  const epochday = sat.TLE1.substr(20, 12);
  const intl = sat.TLE1.substr(9, 8);
  const sccNum = stringPad.pad0(sat.TLE1.substr(2, 5).trim(), 5);

  const period = 1440.0 / parseFloat(meanmo);

  let j = 0;
  for (let i = 0; i < 360; i++) {
    const meana = <StringifiedNubmer>stringPad.pad0(j.toFixed(4), 8);
    const { TLE1, TLE2 } = satellite.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc: sccNum });
    searchStr += satSet.insertNewAnalystSatellite(TLE1, TLE2, satNum + i, (100000 + i).toString()).sccNum.toString() + ',';
    j += (360 / period) * 4;
    if (j >= 360) break;
  }

  // Remove the last comma
  searchStr = searchStr.substr(0, searchStr.length - 1);
  uiManager.doSearch(searchStr);
};
