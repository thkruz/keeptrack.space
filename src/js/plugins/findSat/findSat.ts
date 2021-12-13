import { SatObject } from '@app/js/api/keepTrackTypes';
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
export const searchSats = (
  azimuth: number,
  elevation: number,
  range: number,
  inclination: number,
  azMarg: number,
  elMarg: number,
  rangeMarg: number,
  incMarg: number,
  period: number,
  periodMarg: number,
  rcs: number,
  rcsMarg: number,
  objtype: number,
  raan: number,
  raanMarg: number,
  argPe: number,
  argPeMarg: number
) => {
  const isValidAz = !isNaN(azimuth) && isFinite(azimuth);
  const isValidEl = !isNaN(elevation) && isFinite(elevation);
  const isValidRange = !isNaN(range) && isFinite(range);
  const isValidInc = !isNaN(inclination) && isFinite(inclination);
  const isValidRaan = !isNaN(raan) && isFinite(raan);
  const isValidArgPe = !isNaN(argPe) && isFinite(argPe);
  const isValidPeriod = !isNaN(period) && isFinite(period);
  const isValidRcs = !isNaN(rcs) && isFinite(rcs);
  azMarg = !isNaN(azMarg) && isFinite(azMarg) ? azMarg : 5;
  elMarg = !isNaN(elMarg) && isFinite(elMarg) ? elMarg : 5;
  rangeMarg = !isNaN(rangeMarg) && isFinite(rangeMarg) ? rangeMarg : 200;
  incMarg = !isNaN(incMarg) && isFinite(incMarg) ? incMarg : 1;
  periodMarg = !isNaN(periodMarg) && isFinite(periodMarg) ? periodMarg : 0.5;
  rcsMarg = !isNaN(rcsMarg) && isFinite(rcsMarg) ? rcsMarg : rcs / 10;
  raanMarg = !isNaN(raanMarg) && isFinite(raanMarg) ? raanMarg : 1;
  argPeMarg = !isNaN(argPeMarg) && isFinite(argPeMarg) ? argPeMarg : 1;

  if (!isValidEl && !isValidRange && !isValidAz && !isValidInc && !isValidPeriod && !isValidRcs && !isValidArgPe && !isValidRaan) throw new Error('No Search Criteria Entered');

  const { satSet, satellite, uiManager } = keepTrackApi.programs;

  const satData = satSet.satData;

  let res = satData
    .filter((sat: SatObject) => !sat.static && !sat.missile && sat.active)
    .map((sat: SatObject) => {
      const tearr = satellite.getTEARR(sat);
      return { ...sat, az: tearr.az, el: tearr.el, rng: tearr.rng, inView: tearr.inView };
    });

  res = !isValidInc && !isValidPeriod ? checkInview(res) : res;
  res = objtype !== 0 ? checkObjtype(res, objtype) : res;

  if (isValidAz) {
    const minaz = azimuth - azMarg;
    const maxaz = azimuth + azMarg;
    res = checkAz(res, minaz, maxaz);
  }

  if (isValidEl) {
    const minel = elevation - elMarg;
    const maxel = elevation + elMarg;
    res = checkEl(res, minel, maxel);
  }

  if (isValidRange) {
    const minrange = range - rangeMarg;
    const maxrange = range + rangeMarg;
    res = checkRange(res, minrange, maxrange);
  }

  if (isValidInc) {
    const minInc = inclination - incMarg;
    const maxInc = inclination + incMarg;
    res = checkInc(res, minInc, maxInc);
  }

  if (isValidRaan) {
    const minRaan = raan - raanMarg;
    const maxRaan = raan + raanMarg;
    res = checkRaan(res, minRaan, maxRaan);
  }

  if (isValidArgPe) {
    const minArgPe = argPe - argPeMarg;
    const maxArgPe = argPe + argPeMarg;
    res = checkArgPe(res, minArgPe, maxArgPe);
  }

  if (isValidPeriod) {
    const minPeriod = period - periodMarg;
    const maxPeriod = period + periodMarg;
    res = checkPeriod(res, minPeriod, maxPeriod);
  }

  if (isValidRcs) {
    const minRcs = rcs - rcsMarg;
    const maxRcs = rcs + rcsMarg;
    res = checkRcs(res, minRcs, maxRcs);
  }
  // $('#findByLooks-results').text('');
  // IDEA: Intentionally doesn't clear previous searches. Could be an option later.
  const sccList = [];
  for (let i = 0; i < res.length; i++) {
    // $('#findByLooks-results').append(res[i].sccNum + '<br />');
    if (i < res.length - 1) {
      $('#search').val($('#search').val() + res[i].sccNum + ',');
    } else {
      $('#search').val($('#search').val() + res[i].sccNum);
    }
    sccList.push(res[i].sccNum);
  }
  uiManager.doSearch($('#search').val());
  // console.log(sccList);
  return res;
};

export const checkInview = (possibles: any[]) => {
  possibles = possibles.filter((possible) => possible.inView);
  return possibles;
};

export const checkObjtype = (possibles: any[], objtype: number) => {
  possibles = possibles.filter((possible) => possible.OT === objtype);
  return possibles;
};

export const checkAz = (possibles: any[], minaz: number, maxaz: number) => {
  possibles = possibles.filter((possible) => possible.az >= minaz && possible.az <= maxaz);
  return possibles;
};
export const checkEl = (possibles: any[], minel: number, maxel: number) => {
  possibles = possibles.filter((possible) => possible.el >= minel && possible.el <= maxel);
  return possibles;
};
export const checkRange = (possibles: any[], minrange: number, maxrange: number) => {
  possibles = possibles.filter((possible) => possible.rng >= minrange && possible.rng <= maxrange);
  return possibles;
};

export const newLaunchSubmit = (): void => {
  const { timeManager, mainCamera, satellite, satSet, orbitManager, uiManager, objectManager } = keepTrackApi.programs;

  const scc = $('#nl-scc').val();
  const satId = satSet.getIdFromObjNum(scc);
  let sat = satSet.getSat(satId);

  const upOrDown = $('#nl-updown').val();
  const launchFac = $('#nl-facility').val();
  let launchLat, launchLon;

  if (objectManager.isLaunchSiteManagerLoaded) {
    for (const launchSite in objectManager.launchSiteManager.launchSiteList) {
      if (objectManager.launchSiteManager.launchSiteList[launchSite].name === launchFac) {
        launchLat = objectManager.launchSiteManager.launchSiteList[launchSite].lat;
        launchLon = objectManager.launchSiteManager.launchSiteList[launchSite].lon;
      }
    }
  }
  if (launchLon > 180) {
    // if West not East
    launchLon -= 360; // Convert from 0-360 to -180-180
  }

  // if (sat.inclination * RAD2DEG < launchLat) {
  //   uiManager.toast(`Satellite Inclination Lower than Launch Latitude!`, 'critical');
  //   $('#loading-screen').fadeOut('slow');
  //   return;
  // }
  // Set time to 0000z for relative time.
  const today = new Date(); // Need to know today for offset calculation
  const quadZTime = new Date(today.getFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision

  // Date object defaults to local time.
  quadZTime.setUTCHours(0); // Move to UTC Hour

  timeManager.changeStaticOffset(quadZTime.getTime() - today.getTime()); // Find the offset from today
  mainCamera.isCamSnapMode = false;

  const simulationTimeObj = timeManager.calculateSimulationTime();

  const TLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, simulationTimeObj);

  const TLE1 = TLEs[0];
  const TLE2 = TLEs[1];

  if (satellite.altitudeCheck(TLE1, TLE2, timeManager.calculateSimulationTime()) > 1) {
    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      active: true,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

    sat = satSet.getSat(satId);
  } else {
    uiManager.toast(`Failed Altitude Test - Try a Different Satellite!`, 'critical');
  }
  $('#loading-screen').fadeOut('slow');
};
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

  $('#newLaunch').on('submit', function (e: Event) {
    $('#loading-screen').fadeIn(1000, newLaunchSubmit);
    e.preventDefault();
  });

  // Allow resizing of the side menu
  $('#newLaunch-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-find-sat" class="bmenu-item">
          <img alt="find2" src="data:image/png;base64,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">
          <span class="bmenu-title">Find Satellite</span>
          <div class="status-icon"></div>
        </div>     
      `);

  $('#findByLooks').on('submit', function (e: Event) {
    findByLooksSubmit();
    e.preventDefault();
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
  const fblAzimuth = parseFloat($('#fbl-azimuth').val());
  const fblElevation = parseFloat($('#fbl-elevation').val());
  const fblRange = parseFloat($('#fbl-range').val());
  const fblInc = parseFloat($('#fbl-inc').val());
  const fblPeriod = parseFloat($('#fbl-period').val());
  const fblRcs = parseFloat($('#fbl-rcs').val());
  const fblAzimuthM = parseFloat($('#fbl-azimuth-margin').val());
  const fblElevationM = parseFloat($('#fbl-elevation-margin').val());
  const fblRangeM = parseFloat($('#fbl-range-margin').val());
  const fblIncM = parseFloat($('#fbl-inc-margin').val());
  const fblPeriodM = parseFloat($('#fbl-period-margin').val());
  const fblRcsM = parseFloat($('#fbl-rcs-margin').val());
  const fblType = parseInt($('#fbl-type').val());
  const fblRaan = parseFloat($('#fbl-raan').val());
  const fblRaanM = parseFloat($('#fbl-raan-margin').val());
  const fblArgPe = parseFloat($('#fbl-argPe').val());
  const fblArgPeM = parseFloat($('#fbl-argPe-margin').val());
  $('#search').val(''); // Reset the search first
  const { uiManager } = keepTrackApi.programs;
  try {
    const res = searchSats(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM, fblPeriod, fblPeriodM, fblRcs, fblRcsM, fblType, fblRaan, fblRaanM, fblArgPe, fblArgPeM);
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
  if (possibles.length >= limit) uiManager.toast('Too many results, limited to 200', 'warning');
  possibles = possibles.filter((_possible, i) => i > limit - 1);
  return possibles;
};
