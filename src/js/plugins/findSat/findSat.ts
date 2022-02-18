import { SatObject } from '@app/js/api/keepTrackTypes';
import { getUnique } from '@app/js/lib/helpers';
import $ from 'jquery';
import { keepTrackApi } from '../../api/keepTrackApi';
import { RAD2DEG } from '../../lib/constants';

let isFindByLooksMenuOpen = false;
export const checkInc = (possibles: any[], min: number, max: number) => {
  possibles = possibles.filter((possible) => possible.inclination * RAD2DEG < max && possible.inclination * RAD2DEG > min);
  return possibles;
};

export const checkRaan = (possibles: any[], min: number, max: number) => {
  possibles = possibles.filter((possible) => possible.raan * RAD2DEG < max && possible.raan * RAD2DEG > min);
  return possibles;
};

export const checkArgPe = (possibles: any[], min: number, max: number) => {
  possibles = possibles.filter((possible) => possible.argPe * RAD2DEG < max && possible.argPe * RAD2DEG > min);
  return possibles;
};

export const checkPeriod = (possibles: any[], minPeriod: number, maxPeriod: number) => {
  possibles = possibles.filter((possible) => possible.period > minPeriod && possible.period < maxPeriod);
  return limitPossibles(possibles, 200);
};
export const checkRcs = (possibles: any[], minRcs: number, maxRcs: number) => {
  possibles = possibles.filter((possible) => parseFloat(possible.R) > minRcs && parseFloat(possible.R) < maxRcs);
  return limitPossibles(possibles, 200);
};

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

export const searchSats = (searchParams: SearchSatParams) => { // NOSONAR
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

  let result = '';
  res.forEach((sat: SatObject, i: number) => {
    result += i < res.length - 1 ? `${sat.sccNum},` : `${sat.sccNum}`;
  });

  $('#search').val(result);
  uiManager.doSearch($('#search').val());
  return res;
};

export const checkInview = (posAll: SearchResults[]) => posAll.filter((pos) => pos.inView);
export const checkObjtype = (posAll: SearchResults[], objtype: number) => posAll.filter((pos) => pos.type === objtype);
export const checkAz = (posAll: SearchResults[], min: number, max: number) => posAll.filter((pos) => pos.az >= min && pos.az <= max);

export const checkEl = (posAll: SearchResults[], min: number, max: number) => posAll.filter((pos) => pos.el >= min && pos.el <= max);

export const checkRange = (posAll: SearchResults[], min: number, max: number) => posAll.filter((pos) => pos.rng >= min && pos.rng <= max);

export const uiManagerInit = (): void => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="findByLooks-menu" class="side-menu-parent start-hidden text-select">
          <div id="findByLooks-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Find By Looks</h5>
              <form id="findByLooks">
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
      `);

  $('#fbl-error').on('click', function () {
    $('#fbl-error').hide();
  });

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-find-sat" class="bmenu-item">
          <img alt="find2" src="data:image/png;base64,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"> <!-- // NO-PIG -->
          <span class="bmenu-title">Find Satellite</span>
          <div class="status-icon"></div>
        </div>     
      `);

  $('#findByLooks').on('submit', function (e: Event) {
    findByLooksSubmit();
    e.preventDefault();
  });
};

export const uiManagerFinal = () => {
  const { satSet } = keepTrackApi.programs;
  getUnique(satSet.satData.filter((obj: SatObject) => obj.bus).map((obj) => obj.bus))
    // Sort using lower case
    .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
    .forEach((bus) => {
      $('#fbl-bus').append(`<option value="${bus}">${bus}</option>`);
    });

  getUnique(satSet.satData.filter((obj: SatObject) => obj.shape).map((obj) => obj.shape))
    // Sort using lower case
    .sort((a, b) => (<string>a).toLowerCase().localeCompare((<string>b).toLowerCase()))
    .forEach((shape) => {
      $('#fbl-shape').append(`<option value="${shape}">${shape}</option>`);
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
        $('#fbl-payload').append(`<option value="${payload}">${payload}</option>`);
      }
    });

  // Update MaterialUI with new menu options
  window.M.AutoInit();
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
      $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      isFindByLooksMenuOpen = true;
      $('#menu-find-sat').addClass('bmenu-item-selected');
      return;
    }
  }
};
export const hideSideMenus = (): void => {
  $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-find-sat').removeClass('bmenu-item-selected');
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
export const findByLooksSubmit = () => {
  const az = parseFloat($('#fbl-azimuth').val());
  const el = parseFloat($('#fbl-elevation').val());
  const rng = parseFloat($('#fbl-range').val());
  const inc = parseFloat($('#fbl-inc').val());
  const period = parseFloat($('#fbl-period').val());
  const rcs = parseFloat($('#fbl-rcs').val());
  const azMarg = parseFloat($('#fbl-azimuth-margin').val());
  const elMarg = parseFloat($('#fbl-elevation-margin').val());
  const rngMarg = parseFloat($('#fbl-range-margin').val());
  const incMarg = parseFloat($('#fbl-inc-margin').val());
  const periodMarg = parseFloat($('#fbl-period-margin').val());
  const rcsMarg = parseFloat($('#fbl-rcs-margin').val());
  const objType = parseInt($('#fbl-type').val());
  const raan = parseFloat($('#fbl-raan').val());
  const raanMarg = parseFloat($('#fbl-raan-margin').val());
  const argPe = parseFloat($('#fbl-argPe').val());
  const argPeMarg = parseFloat($('#fbl-argPe-margin').val());
  const bus = $('#fbl-bus').val();
  const payload = $('#fbl-payload').val();
  const shape = $('#fbl-shape').val();
  $('#search').val(''); // Reset the search first
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
  if (possibles.length >= limit) uiManager.toast('Too many results, limited to 200', 'serious');
  possibles = possibles.filter((_possible, i) => i > limit - 1);
  return possibles;
};
