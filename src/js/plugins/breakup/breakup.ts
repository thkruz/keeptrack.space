import breakupPng from '@app/img/icons/breakup.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { createError } from '@app/js/errorManager/errorManager';
import { clickAndDragWidth, getEl, shake, showLoading, slideInRight, slideOutLeft, stringPad } from '@app/js/lib/helpers';
import { helpBodyTextBreakup, helpTitleTextBreakup } from './help';

let isBreakupMenuOpen = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'breakup',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'breakup',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'breakup',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'breakup',
    cb: hideSideMenus,
  });

  keepTrackApi.register({
    method: 'onHelpMenuClick',
    cbName: 'breakup',
    cb: onHelpMenuClick,
  });
};

export const onHelpMenuClick = (): boolean => {
  if (isBreakupMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextBreakup, helpBodyTextBreakup);
    return true;
  }
  return false;
};

export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
      <div id="breakup-menu" class="side-menu-parent start-hidden text-select">
        <div id="breakup-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">Breakup Simulator</h5>
            <form id="breakup" class="col s12">
              <div class="input-field col s12">
                <input disabled value="00005" id="hc-scc" type="text" />
                <label for="disabled" class="active">Satellite SCC#</label>
              </div>
              <div class="input-field col s12">
                <select id="hc-inc">
                  <option value="0">0 Degrees</option>
                  <option value="0.1">0.1 Degrees</option>
                  <option value="0.2" selected>0.2 Degrees</option>
                  <option value="0.3">0.3 Degrees</option>
                  <option value="0.4">0.4 Degrees</option>
                  <option value="0.5">0.5 Degrees</option>
                  <option value="0.6">0.6 Degrees</option>
                  <option value="0.7">0.7 Degrees</option>
                  <option value="0.8">0.8 Degrees</option>
                  <option value="0.9">0.9 Degrees</option>
                  <option value="1">1 Degrees</option>
                </select>
                <label>Inclination Variation</label>
              </div>
              <div class="input-field col s12">
                <select id="hc-per">
                  <option value="0">0 Percent</option>
                  <option value="0.005">0.5 Percent</option>
                  <option value="0.01">1 Percent</option>
                  <option value="0.015">1.5 Percent</option>
                  <option value="0.02" selected>2 Percent</option>
                  <option value="0.025">2.5 Percent</option>
                  <option value="0.03">3 Percent</option>
                  <option value="0.035">3.5 Percent</option>
                  <option value="0.04">4 Percent</option>
                  <option value="0.045">4.5 Percent</option>
                  <option value="0.05">5 Percent</option>
                </select>
                <label>Period Variation</label>
              </div>
              <div class="input-field col s12">
                <select id="hc-raan">
                <option value="0">0 Degrees</option>
                  <option value="0.1">0.1 Degrees</option>
                  <option value="0.2" selected>0.2 Degrees</option>
                  <option value="0.3">0.3 Degrees</option>
                  <option value="0.4">0.4 Degrees</option>
                  <option value="0.5">0.5 Degrees</option>
                  <option value="0.6">0.6 Degrees</option>
                  <option value="0.7">0.7 Degrees</option>
                  <option value="0.8">0.8 Degrees</option>
                  <option value="0.9">0.9 Degrees</option>
                  <option value="1">1 Degrees</option>
                </select>
                <label>Right Ascension Variation</label>
              </div>
              <div class="input-field col s12">
                <select id="hc-count">
                  <option value="10">10</option>
                  <option value="25" selected>25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                </select>
                <label>Pieces</label>
              </div>
              <div class="center-align">
                <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create Breakup &#9658;</button>
              </div>
            </form>
          </div>
        </div>
      </div>   
    `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
      <div id="menu-breakup" class="bmenu-item bmenu-item-disabled">
        <img
          alt="breakup"
          src="" delayedsrc="${breakupPng}"
        />
        <span class="bmenu-title">Breakup</span>
        <div class="status-icon"></div>
      </div>
    `
  );

  clickAndDragWidth(getEl('breakup-menu'));
};

export const uiManagerFinal = (): void => {
  getEl('breakup').addEventListener('submit', function (e: Event) {
    e.preventDefault();
    showLoading(() => breakupOnSubmit());
  });
};

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const breakupOnSubmit = (): void => { // NOSONAR
  const { orbitManager, satellite, timeManager, uiManager, satSet } = keepTrackApi.programs;
  let satId = satSet.getIdFromObjNum(parseInt((<HTMLInputElement>getEl('hc-scc')).value));
  const mainsat: SatObject = satSet.getSat(satId);
  const origsat = mainsat;

  // Launch Points are the Satellites Current Location
  // TODO: Remove TEARR References
  const TEARR = mainsat.getTEARR();
  const launchLat = satellite.degreesLat(TEARR.lat);
  const launchLon = satellite.degreesLong(TEARR.lon);

  const simulationTimeObj = timeManager.simulationTimeObj;

  const upOrDown = mainsat.getDirection();
  const currentEpoch = satellite.currentEpoch(simulationTimeObj);
  mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

  keepTrackApi.programs.mainCamera.isCamSnapMode = false;

  const alt = mainsat.apogee - mainsat.perigee < 300 ? 0 : TEARR.alt; // Ignore argument of perigee for round orbits OPTIMIZE
  let TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, simulationTimeObj, alt);
  const TLE1 = TLEs[0];
  const TLE2 = TLEs[1];
  satSet.satCruncher.postMessage({
    typ: 'satEdit',
    id: satId,
    TLE1: TLE1,
    TLE2: TLE2,
  });
  orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

  const meanmoVariation = parseFloat(<string>(<HTMLInputElement>getEl('hc-per')).value);
  const incVariation = parseFloat(<string>(<HTMLInputElement>getEl('hc-inc')).value);
  const rascVariation = parseFloat(<string>(<HTMLInputElement>getEl('hc-raan')).value);
  const breakupCount = parseInt(<string>(<HTMLInputElement>getEl('hc-count')).value);
  const eVariation = 0.00015;
  const origEcc = mainsat.eccentricity;

  // NOTE: Previously we used - settingsManager.maxAnalystSats;
  let i = 0;
  for (let rascIterat = 0; rascIterat <= 4; rascIterat++) {
    if (i >= breakupCount) break;
    satId = satSet.getIdFromObjNum(80000 + i);
    satSet.getSat(satId); // TODO: This may be unnecessary needs tested
    let sat = origsat;
    // Is this needed? -- let iTLE1 = '1 ' + (80000 + i) + TLE1.substr(7) ??

    const rascOffset = -rascVariation / 2 + rascVariation * (rascIterat / 4);
    const newAlt = mainsat.apogee - mainsat.perigee < 300 ? 0 : TEARR.alt; // Ignore argument of perigee for round orbits OPTIMIZE
    let iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, simulationTimeObj, newAlt, rascOffset);

    if (iTLEs[0] === 'Error') {
      createError(new Error(iTLEs[1]), 'breakup.ts');
      return;
    }

    let iTLE1 = iTLEs[0];
    let iTLE2 = iTLEs[1];    
    for (; i < (rascIterat + 1) * breakupCount / 4; i++) {

      // Inclination
      let inc = parseFloat(TLE2.substr(8, 8));
      inc = inc + Math.random() * incVariation * 2 - incVariation;
      const incStr = stringPad.pad0(inc.toFixed(4), 8);
      if (incStr.length !== 8) throw new Error(`Inclination length is not 8 - ${incStr} - ${TLE2}`);

      // Ecentricity
      sat.eccentricity = origEcc;
      sat.eccentricity += Math.random() * eVariation * 2 - eVariation;

      // Mean Motion
      let meanmo = parseFloat(iTLE2.substr(52, 10));
      meanmo = meanmo + Math.random() * meanmoVariation * 2 - meanmoVariation;
      // const meanmoStr = stringPad.pad0(meanmo.toPrecision(10), 8);
      const meanmoStr = stringPad.pad0(meanmo.toFixed(8), 11);
      if (meanmoStr.length !== 11) throw new Error(`meanmo length is not 11 - ${meanmoStr} - ${iTLE2}`);

      satId = satSet.getIdFromObjNum(80000 + i);
      iTLE1 = `1 ${80000 + i}` + iTLE1.substr(7);
      iTLE2 = `2 ${80000 + i} ${incStr} ${iTLE2.substr(17, 35)}${meanmoStr}${iTLE2.substr(63)}`;

      if (iTLE1.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${iTLE1}`);
      if (iTLE2.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${iTLE2}`);

      sat = satSet.getSat(satId);
      sat.TLE1 = iTLE1;
      sat.TLE2 = iTLE2;
      sat.active = true;
      if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.simulationTimeObj) > 1) {
        satSet.satCruncher.postMessage({
          typ: 'satEdit',
          id: satId,
          TLE1: iTLE1,
          TLE2: iTLE2,
        });
        orbitManager.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
      } else {
        // DEBUG:
        // console.debug('Breakup Generator Failed');
      }
    }
  }

  uiManager.doSearch(`${mainsat.sccNum},Analyst`);
};

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('breakup-menu'), 1000);
  getEl('menu-breakup').classList.remove('bmenu-item-selected');
  isBreakupMenuOpen = false;
};

// prettier-ignore
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  if (iconName === 'menu-breakup') {
    const { uiManager, satSet, objectManager } = keepTrackApi.programs;
    if (isBreakupMenuOpen) {
      isBreakupMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (objectManager.selectedSat !== -1) {
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        slideInRight(getEl('breakup-menu'), 1000);
        getEl('menu-breakup').classList.add('bmenu-item-selected');
        isBreakupMenuOpen = true;

        const sat: SatObject = satSet.getSatExtraOnly(objectManager.selectedSat);
        (<HTMLInputElement>getEl('hc-scc')).value = sat.sccNum;
      } else {
        uiManager.toast(`Select a Satellite First!`, 'caution');
        shake(getEl('menu-breakup'));
      }
      return;
    }
  }
};
