import findSatPng from '@app/img/icons/find2.png';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { getEl, getUnique, hideLoading, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { keepTrackApi } from '../../api/keepTrackApi';
import { RAD2DEG } from '../../lib/constants';

let isFindByLooksMenuOpen = false;
export const checkInc = (possibles: any[], min: number, max: number) =>
  possibles.filter((possible) => possible.inclination * RAD2DEG < max && possible.inclination * RAD2DEG > min);
export const checkRaan = (possibles: any[], min: number, max: number) => possibles.filter((possible) => possible.raan * RAD2DEG < max && possible.raan * RAD2DEG > min);
export const checkArgPe = (possibles: any[], min: number, max: number) => possibles.filter((possible) => possible.argPe * RAD2DEG < max && possible.argPe * RAD2DEG > min);
export const checkPeriod = (possibles: any[], minPeriod: number, maxPeriod: number) => possibles.filter((possible) => possible.period > minPeriod && possible.period < maxPeriod);
export const checkRcs = (possibles: any[], minRcs: number, maxRcs: number) => possibles.filter((possible) => parseFloat(possible.R) > minRcs && parseFloat(possible.R) < maxRcs);

export interface SearchSatParams {
  az: number;
  el: number;
  rng: number;
  inc: number;
  azMarg: number;
  elMarg: number;
  rngMarg: number;
  incMarg: number;
  period: number;
  periodMarg: number;
  rcs: number;
  rcsMarg: number;
  objType: number;
  raan: number;
  raanMarg: number;
  argPe: number;
  argPeMarg: number;
  shape: string;
  payload: string;
  bus: string;
}

interface SearchResults extends SatObject {
  rng: number;
}

export const searchSats = (searchParams: SearchSatParams) => {
  // NOSONAR
  let { az, el, rng, inc, azMarg, elMarg, rngMarg, incMarg, period, periodMarg, rcs, rcsMarg, objType, raan, raanMarg, argPe, argPeMarg, bus, shape, payload } = searchParams;

  const isValidAz = !isNaN(az) && isFinite(az);
  const isValidEl = !isNaN(el) && isFinite(el);
  const isValidRange = !isNaN(rng) && isFinite(rng);
  const isValidInc = !isNaN(inc) && isFinite(inc);
  const isValidRaan = !isNaN(raan) && isFinite(raan);
  const isValidArgPe = !isNaN(argPe) && isFinite(argPe);
  const isValidPeriod = !isNaN(period) && isFinite(period);
  const isValidRcs = !isNaN(rcs) && isFinite(rcs);
  const isSpecificBus = bus !== 'All';
  const isSpecificShape = shape !== 'All';
  const isSpecificPayload = payload !== 'All';
  azMarg = !isNaN(azMarg) && isFinite(azMarg) ? azMarg : 5;
  elMarg = !isNaN(elMarg) && isFinite(elMarg) ? elMarg : 5;
  rngMarg = !isNaN(rngMarg) && isFinite(rngMarg) ? rngMarg : 200;
  incMarg = !isNaN(incMarg) && isFinite(incMarg) ? incMarg : 1;
  periodMarg = !isNaN(periodMarg) && isFinite(periodMarg) ? periodMarg : 0.5;
  rcsMarg = !isNaN(rcsMarg) && isFinite(rcsMarg) ? rcsMarg : rcs / 10;
  raanMarg = !isNaN(raanMarg) && isFinite(raanMarg) ? raanMarg : 1;
  argPeMarg = !isNaN(argPeMarg) && isFinite(argPeMarg) ? argPeMarg : 1;

  if (
    !isValidEl &&
    !isValidRange &&
    !isValidAz &&
    !isValidInc &&
    !isValidPeriod &&
    !isValidRcs &&
    !isValidArgPe &&
    !isValidRaan &&
    !isSpecificBus &&
    !isSpecificShape &&
    !isSpecificPayload
  ) {
    throw new Error('No Search Criteria Entered');
  }

  const { satSet, satellite, uiManager } = keepTrackApi.programs;

  const satData = satSet.satData;

  let res = satData
    .filter((sat: SatObject) => !sat.static && !sat.missile && sat.active)
    .map((sat: SatObject) => {
      const tearr = satellite.getTEARR(sat);
      return <SearchResults>{ ...sat, az: tearr.az, el: tearr.el, rng: tearr.rng, inView: tearr.inView };
    });

  res = !isValidInc && !isValidPeriod && (isValidAz || isValidEl || isValidRange) ? checkInview(res) : res;

  res = objType !== 0 ? checkObjtype(res, objType) : res;
  if (isValidAz) res = checkAz(res, az - azMarg, az + azMarg);
  if (isValidEl) res = checkEl(res, el - elMarg, el + elMarg);
  if (isValidRange) res = checkRange(res, rng - rngMarg, rng + rngMarg);
  if (isValidInc) res = checkInc(res, inc - incMarg, inc + incMarg);
  if (isValidRaan) res = checkRaan(res, raan - raanMarg, raan + raanMarg);
  if (isValidArgPe) res = checkArgPe(res, argPe - argPeMarg, argPe + argPeMarg);
  if (isValidPeriod) res = checkPeriod(res, period - periodMarg, period + periodMarg);
  if (isValidRcs) res = checkRcs(res, rcs - rcsMarg, rcs + rcsMarg);
  if (bus !== 'All') res = res.filter((sat: SatObject) => sat.bus === bus);
  if (shape !== 'All') res = res.filter((sat: SatObject) => sat.shape === shape);

  if (payload !== 'All') {
    res = res.filter(
      (sat: SatObject) =>
        sat.payload
          ?.split(' ')[0]
          ?.split('-')[0]
          ?.replace(/[^a-zA-Z]/gu, '') === payload
    );
  }

  res = limitPossibles(res, settingsManager.searchLimit);

  let result = '';
  res.forEach((sat: SatObject, i: number) => {
    result += i < res.length - 1 ? `${sat.sccNum},` : `${sat.sccNum}`;
  });

  (<HTMLInputElement>getEl('search')).value = result;
  uiManager.doSearch((<HTMLInputElement>getEl('search')).value);
  return res;
};

export const checkInview = (posAll: SearchResults[]) => posAll.filter((pos) => pos.inView);
export const checkObjtype = (posAll: SearchResults[], objtype: number) => posAll.filter((pos) => pos.type === objtype);
export const checkAz = (posAll: SearchResults[], min: number, max: number) => posAll.filter((pos) => pos.az >= min && pos.az <= max);

export const checkEl = (posAll: SearchResults[], min: number, max: number) => posAll.filter((pos) => pos.el >= min && pos.el <= max);

export const checkRange = (posAll: SearchResults[], min: number, max: number) => posAll.filter((pos) => pos.rng >= min && pos.rng <= max);

export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="findByLooks-menu" class="side-menu-parent start-hidden text-select">
          <div id="findByLooks-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Find By Looks</h5>
              <form id="findByLooks-form">
                <div class="row">
                  <div class="input-field col s12">
                    <select value=0 id="fbl-type" type="text">
                      <option value=0>All</option>
                      <option value=1>Payload</option>
                      <option value=2>Rocket Body</option>
                      <option value=3>Debris</option>
                    </select>
                    <label for="disabled">Object Type</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12">
                    <select value=0 id="fbl-bus" type="text">
                      <option value='All'>All</option>
                    </select>
                    <label for="disabled">Satellite Bus</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12">
                    <select value=0 id="fbl-payload" type="text">
                      <option value='All'>All</option>
                    </select>
                    <label for="disabled">Payload</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12">
                    <select value=0 id="fbl-shape" type="text">
                      <option value='All'>All</option>
                    </select>
                    <label for="disabled">Shape</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="xxx.x" id="fbl-azimuth" type="text">
                    <label for="fbl-azimuth" class="active">Azimuth</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="5" id="fbl-azimuth-margin" type="text">
                    <label for="fbl-azimuth-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="XX.X" id="fbl-elevation" type="text">
                    <label for="fbl-elevation "class="active">Elevation</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="5" id="fbl-elevation-margin" type="text">
                    <label for="fbl-elevation-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="xxxx.x" id="fbl-range" type="text">
                    <label for="fbl-range "class="active">Range</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="500" id="fbl-range-margin" type="text">
                    <label for="fbl-range-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="XX.X" id="fbl-inc" type="text">
                    <label for="fbl-inc "class="active">Inclination</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input value="0.5" placeholder="0.5" id="fbl-inc-margin" type="text">
                    <label for="fbl-inc-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="XX.X" id="fbl-period" type="text">
                    <label for="fbl-period "class="active">Period</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input value="10" placeholder="10" id="fbl-period-margin" type="text">
                    <label for="fbl-period-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="XX.X" id="fbl-rcs" type="text">
                    <label for="fbl-rcs "class="active">RCS</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input value="10" placeholder="10" id="fbl-rcs-margin" type="text">
                    <label for="fbl-rcs-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="XX.X" id="fbl-raan" type="text">
                    <label for="fbl-raan "class="active">Right Ascension</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input value="0.5" placeholder="0.5" id="fbl-raan-margin" type="text">
                    <label for="fbl-raan-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12 m6 l6">
                    <input placeholder="XX.X" id="fbl-argPe" type="text">
                    <label for="fbl-argPe "class="active">Arg of Perigee</label>
                  </div>
                  <div class="input-field col s12 m6 l6">
                    <input value="0.5" placeholder="0.5" id="fbl-argPe-margin" type="text">
                    <label for="fbl-argPe-margin "class="active">Margin</label>
                  </div>
                </div>
                <div class="center-align">
                  <button id="findByLooks-submit" class="btn btn-ui waves-effect waves-light" type="submit"
                    name="action">Find Satellite(s) &#9658;
                  </button>
                </div>
              </form>
              <div class="row center-align" style="margin-top:20px;">
                <span id="fbl-error" class="menu-selectable"></span>
              </div>
            </div>
          </div>
        </div>
      `
  );

  getEl('fbl-error').addEventListener('click', function () {
    getEl('fbl-error').style.display = 'none';
  });

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-find-sat" class="bmenu-item">
          <img alt="find2" src="${findSatPng}"/>
          <span class="bmenu-title">Find Satellite</span>
          <div class="status-icon"></div>
        </div>     
      `
  );
};

export const uiManagerFinal = () => {
  const { satSet } = keepTrackApi.programs;

  getEl('findByLooks-form').addEventListener('submit', function (e: Event) {
    e.preventDefault();
    showLoading(() => {
      findByLooksSubmit();
      hideLoading();
    });
  });

  getUnique(satSet.satData.filter((obj: SatObject) => obj.bus).map((obj) => obj.bus))
    // Sort using lower case
    .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
    .forEach((bus) => {
      getEl('fbl-bus').insertAdjacentHTML('beforeend', `<option value="${bus}">${bus}</option>`);
    });

  getUnique(satSet.satData.filter((obj: SatObject) => obj.shape).map((obj) => obj.shape))
    // Sort using lower case
    .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
    .forEach((shape) => {
      getEl('fbl-shape').insertAdjacentHTML('beforeend', `<option value="${shape}">${shape}</option>`);
    });

  const payloadPartials = satSet.satData
    .filter((obj: SatObject) => obj.payload)
    .map((obj) =>
      obj.payload
        .split(' ')[0]
        .split('-')[0]
        .replace(/[^a-zA-Z]/gu, '')
    )
    .filter((obj) => obj.length >= 3);

  getUnique(payloadPartials)
    .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
    .forEach((payload) => {
      if (payload === '') return;
      if (payload.length > 3) {
        getEl('fbl-payload').insertAdjacentHTML('beforeend', `<option value="${payload}">${payload}</option>`);
      }
    });
};

export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-find-sat') {
    const { uiManager } = keepTrackApi.programs;
    if (isFindByLooksMenuOpen) {
      isFindByLooksMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('findByLooks-menu'), 1000);
      isFindByLooksMenuOpen = true;
      getEl('menu-find-sat').classList.add('bmenu-item-selected');
      return;
    }
  }
};
export const hideSideMenus = (): void => {
  slideOutLeft(getEl('findByLooks-menu'), 1000);
  getEl('menu-find-sat').classList.remove('bmenu-item-selected');
  isFindByLooksMenuOpen = false;
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'findSat',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'findSat',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'findSat',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'findSat',
    cb: hideSideMenus,
  });
};
export const findByLooksSubmit = async () => {
  const az = parseFloat((<HTMLInputElement>getEl('fbl-azimuth')).value);
  const el = parseFloat((<HTMLInputElement>getEl('fbl-elevation')).value);
  const rng = parseFloat((<HTMLInputElement>getEl('fbl-range')).value);
  const inc = parseFloat((<HTMLInputElement>getEl('fbl-inc')).value);
  const period = parseFloat((<HTMLInputElement>getEl('fbl-period')).value);
  const rcs = parseFloat((<HTMLInputElement>getEl('fbl-rcs')).value);
  const azMarg = parseFloat((<HTMLInputElement>getEl('fbl-azimuth-margin')).value);
  const elMarg = parseFloat((<HTMLInputElement>getEl('fbl-elevation-margin')).value);
  const rngMarg = parseFloat((<HTMLInputElement>getEl('fbl-range-margin')).value);
  const incMarg = parseFloat((<HTMLInputElement>getEl('fbl-inc-margin')).value);
  const periodMarg = parseFloat((<HTMLInputElement>getEl('fbl-period-margin')).value);
  const rcsMarg = parseFloat((<HTMLInputElement>getEl('fbl-rcs-margin')).value);
  const objType = parseInt((<HTMLInputElement>getEl('fbl-type')).value);
  const raan = parseFloat((<HTMLInputElement>getEl('fbl-raan')).value);
  const raanMarg = parseFloat((<HTMLInputElement>getEl('fbl-raan-margin')).value);
  const argPe = parseFloat((<HTMLInputElement>getEl('fbl-argPe')).value);
  const argPeMarg = parseFloat((<HTMLInputElement>getEl('fbl-argPe-margin')).value);
  const bus = (<HTMLInputElement>getEl('fbl-bus')).value;
  const payload = (<HTMLInputElement>getEl('fbl-payload')).value;
  const shape = (<HTMLInputElement>getEl('fbl-shape')).value;
  (<HTMLInputElement>getEl('search')).value = ''; // Reset the search first
  const { uiManager } = keepTrackApi.programs;
  try {
    const searchParams = {
      az: az,
      el: el,
      rng: rng,
      inc: inc,
      azMarg,
      elMarg,
      rngMarg,
      incMarg,
      period,
      periodMarg,
      rcs,
      rcsMarg,
      objType,
      raan,
      raanMarg,
      argPe,
      argPeMarg,
      bus,
      payload,
      shape,
    };
    const res = searchSats(searchParams);
    if (res.length === 0) {
      uiManager.toast(`No Satellites Found`, 'critical');
    }
  } catch (e) {
    if (e.message === 'No Search Criteria Entered') {
      uiManager.toast(`No Search Criteria Entered`, 'critical');
    }
  }
};

export const limitPossibles = (possibles: any[], limit: number): any[] => {
  const { uiManager } = keepTrackApi.programs;
  if (possibles.length >= limit) uiManager.toast(`Too many results, limited to ${limit}`, 'serious');
  possibles = possibles.slice(0, limit);
  return possibles;
};
