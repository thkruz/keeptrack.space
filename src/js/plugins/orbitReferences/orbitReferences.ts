import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import { stringPad } from '@app/js/lib/helpers';
import $ from 'jquery';

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

export const selectSatData = () => {
  if (!doOnce) {
    $('#sat-info-top-links').append(keepTrackApi.html`
        <div id="orbit-references-link" class="link sat-infobox-links">Generate Orbit Reference Satellites...</div>
      `);
    $('#orbit-references-link').on('click', orbitReferencesLinkClick);
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
  for (let i = 0; i < 360; i++) {
    const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);

    const ecen = satrec.ecco.toPrecision(7).substr(2, 7);

    let rasc = (satrec.nodeo * RAD2DEG).toPrecision(7);
    const rascA = rasc.split('.');
    rascA[0] = rascA[0].substr(-3, 3);
    rascA[1] = rascA[1].substr(0, 4);
    rasc = (rascA[0] + '.' + rascA[1]).toString();

    let argPe = (satrec.argpo * RAD2DEG).toPrecision(7);
    const argPeA = argPe.split('.');
    argPeA[0] = argPeA[0].substr(-3, 3);
    argPeA[1] = argPeA[1].substr(0, 4);
    argPe = (argPeA[0] + '.' + argPeA[1]).toString();

    let meana = i.toPrecision(10); // sat.TLE2.substr(44 - 1, 7 + 1);
    const meanaA = meana.split('.');
    meanaA[0] = meanaA[0].substr(-3, 3);
    meanaA[1] = meanaA[1].substr(0, 4);
    meana = (meanaA[0] + '.' + meanaA[1]).toString();
    meana = stringPad.pad0(meana, 8);

    const inc = sat.TLE2.substr(8, 8);
    const meanmo = sat.TLE2.substr(52, 10);

    const epochyr = sat.TLE1.substr(18, 2);
    const epochday = sat.TLE1.substr(20, 12);

    const intl = sat.TLE1.substr(9, 8);

    const sccNum = stringPad.pad0(sat.TLE1.substr(2, 5).trim(), 5);

    const { TLE1, TLE2 } = satellite.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc: sccNum });
    searchStr += satSet.insertNewAnalystSatellite(TLE1, TLE2, satNum + i, (100000 + i).toString()).sccNum.toString();
    if (i !== 359) searchStr += ',';
  }

  uiManager.doSearch(searchStr);
};
