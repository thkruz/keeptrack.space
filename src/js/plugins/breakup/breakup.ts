import { keepTrackApi } from '@app/js/api/externalApi';
import { SatObject } from '@app/js/api/keepTrack';
import { stringPad } from '@app/js/lib/helpers';
import $ from 'jquery';

let isBreakupMenuOpen = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'breakup',
    cb: uiManagerInit,
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
};

export const uiManagerInit = (): void => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
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
                  <option value="0.5">0.5 Degrees</option>
                  <option value="0.75">0.75 Degrees</option>
                  <option value="1" selected>1 Degrees</option>
                  <option value="1.25">1.25 Degrees</option>
                  <option value="1.5">1.5 Degrees</option>
                  <option value="1.75">1.75 Degrees</option>
                  <option value="2">2 Degrees</option>
                  <option value="2.25">2.25 Degrees</option>
                  <option value="2.5">2.5 Degrees</option>
                </select>
                <label>Inclination Variation</label>
              </div>
              <div class="input-field col s12">
                <select id="hc-per">
                  <option value="0">0 Percent</option>
                  <option value="0.01">1 Percent</option>
                  <option value="0.02" selected>2 Percent</option>
                  <option value="0.03">3 Percent</option>
                  <option value="0.04">4 Percent</option>
                  <option value="0.05">5 Percent</option>
                </select>
                <label>Period Variation</label>
              </div>
              <div class="input-field col s12">
                <select id="hc-raan">
                  <option value="0">0 Degrees</option>
                  <option value="0.5">0.5 Degrees</option>
                  <option value="0.75">0.75 Degrees</option>
                  <option value="1" selected>1 Degrees</option>
                  <option value="1.25">1.25 Degrees</option>
                  <option value="1.5">1.5 Degrees</option>
                  <option value="1.75">1.75 Degrees</option>
                  <option value="2">2 Degrees</option>
                  <option value="2.25">2.25 Degrees</option>
                  <option value="2.5">2.5 Degrees</option>
                </select>
                <label>Right Ascension Variation</label>
              </div>
              <div class="center-align">
                <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create Breakup &#9658;</button>
              </div>
            </form>
          </div>
        </div>
      </div>   
    `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
      <div id="menu-breakup" class="bmenu-item bmenu-item-disabled">
        <img
          alt="breakup"
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAADH0lEQVR4nO3cz04TURQG8O82pDQG1AUP4AJWE7qxcd2uCIlGQvBZdCfu7LNICEYTw6q4NOCqzgoWPgALpYSUhnhcTWyqM53+Oefcmu+3I5TMnfNl7p25wylARERERERERERERKQuzPLHm2ci8xpIptsIM41pnNjGXJnnQGhyDMAZA3DGAJwxAGdLFgcR4Pi6h53vrdC3OF6RMncsSSrVcIODEPBMezwmV0AAtlZWcfSoIzWL483CsviA4RS0CCFYFx8wXgNiDsGj+IBWAAGf8n+FrdX7OFw/l2WVY09h/VyWK30cFRa/4JxmoRLArxp2RPAh9wOC7dpPvI/hSkhSqdZ+4B0E23mfEeC4d4VdjeOrBJAmYSD3sFcUQgzTUZlpR/sOTm0NiD2EGIoPKC/CsYYQS/EBg7ugNAmD/kO8KLMwNzui/mDY7MhSmQW3/wDPLR4cTW5DLzbC7biFWYAvJ61wpz2Wk1a4g+BzwTiOe1fYvdgIt9pjAQyfA4qmIwnY//Y4vLEaS7cR2gBe/TUOhy0T0wexf4VgXfzMaAhe+1Umm3HD0iQMklT2cIMDVPDVo/iZbiO0N88EArS8NgtdtqPTJAzWrrHrWfxMtxHaaz089dqpVX0BPg2Nl+bDtF/6T4ovZJwxAGcMwBkDcMYAnJk/B0xr0rsX7bupeeEV4IwBOGMAzhiAMwbgjAE4YwDOGIAzBuCMAThjAM4WZi9oUfZ2JsUrwBkDcMYAnDEAZwzAmcqXdZR5e9XsyJLFP+OWUXYss5xvHpcrIEmlermCw80zeetx/GH1U9m/XMVHr04d8wBGmiNeeoZQP5V9CXjt2aljGkBOZ4pLCFnxs5+9QjALYExbkGkIo8XPeIRgEkDJPty6VYuSVPAkfxi2fczqAUzSh2vVohRTH7NqADF1Iw6LqXtTLYBYi5+JJQSVAGIvfiaGEFQCiKkPd5xJ+pg1jq8zBZVYcK36cMso08dcdE6zMH0Qi2HayVNmOtJgFkDMxc94hGASwCIUP2MdAr87eg4Wbjua/mAAzhiAMwbgjAEQEREREREREREREf3/fgOPPc3WB/LHfwAAAABJRU5ErkJggg=="
        />
        <span class="bmenu-title">Breakup</span>
        <div class="status-icon"></div>
      </div>
    `);

  $('#breakup').on('submit', function (e) {
    $('#loading-screen').fadeIn(1000, breakupOnSubmit);
    e.preventDefault();
  });

  $('#breakup-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });
};

export const breakupOnSubmit = (): void => {
  const { orbitManager, satellite, timeManager, uiManager, satSet } = keepTrackApi.programs;
  let satId = satSet.getIdFromObjNum($('#hc-scc').val());
  const mainsat: SatObject = satSet.getSat(satId);
  const origsat = mainsat;

  // Launch Points are the Satellites Current Location
  // TODO: Remove TEARR References
  //
  // var latlon = satellite.eci2ll(mainsat.position.x,mainsat.position.y,mainsat.position.z);
  // var launchLat = satellite.degreesLat(latlon.lat * DEG2RAD);
  // var launchLon = satellite.degreesLong(latlon.lon * DEG2RAD);
  // var alt = satellite.altitudeCheck(mainsat.TLE1, mainsat.TLE2, timeManager.getPropOffset());
  // console.log(launchLat);
  // console.log(launchLon);
  // console.log(alt);
  // Launch Points are the Satellites Current Location
  const TEARR = mainsat.getTEARR();
  const launchLat = satellite.degreesLat(TEARR.lat);
  const launchLon = satellite.degreesLong(TEARR.lon);
  const alt = TEARR.alt;

  const upOrDown = mainsat.getDirection();
  // console.log(upOrDown);
  const currentEpoch = satellite.currentEpoch(timeManager.propTime());
  mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

  keepTrackApi.programs.mainCamera.isCamSnapMode = false;

  let TLEs;
  // Ignore argument of perigee for round orbits OPTIMIZE
  if (mainsat.apogee - mainsat.perigee < 300) {
    TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset);
  } else {
    TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt);
  }
  const TLE1 = TLEs[0];
  const TLE2 = TLEs[1];
  satSet.satCruncher.postMessage({
    typ: 'satEdit',
    id: satId,
    TLE1: TLE1,
    TLE2: TLE2,
  });
  orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

  let breakupSearchString = '';

  const meanmoVariation = parseFloat(<string>$('#hc-per').val());
  const incVariation = parseFloat(<string>$('#hc-inc').val());
  const rascVariation = parseFloat(<string>$('#hc-raan').val());

  const breakupCount = 100; // settingsManager.maxAnalystSats;
  for (let i = 0; i < breakupCount; i++) {
    for (let incIterat = 0; incIterat <= 4; incIterat++) {
      for (let meanmoIterat = 0; meanmoIterat <= 4; meanmoIterat++) {
        for (let rascIterat = 0; rascIterat <= 4; rascIterat++) {
          if (i >= breakupCount) continue;
          satId = satSet.getIdFromObjNum(80000 + i);
          let sat: SatObject = satSet.getSat(satId);
          sat = origsat;
          let iTLE1 = '1 ' + (80000 + i) + TLE1.substr(7);

          const rascOffset = -rascVariation / 2 + rascVariation * (rascIterat / 4);

          var iTLEs;
          // Ignore argument of perigee for round orbits OPTIMIZE
          if (sat.apogee - sat.perigee < 300) {
            iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, 0, rascOffset);
          } else {
            iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt, rascOffset);
          }
          iTLE1 = iTLEs[0];
          let iTLE2 = iTLEs[1];

          // For the first 30
          let inc: string | number | string[] = parseFloat(TLE2.substr(8, 8));
          inc = (inc - incVariation / 2 + incVariation * (incIterat / 4)).toPrecision(7);
          inc = inc.split('.');
          inc[0] = inc[0].substr(-3, 3);
          if (inc[1]) {
            inc[1] = inc[1].substr(0, 4);
          } else {
            inc[1] = '0000';
          }
          inc = (inc[0] + '.' + inc[1]).toString();
          inc = stringPad.padEmpty(inc, 8);

          // For the second 30
          let meanmo: string | number | string[] = parseFloat(iTLE2.substr(52, 10));
          meanmo = (meanmo - (meanmo * meanmoVariation) / 2 + meanmo * meanmoVariation * (meanmoIterat / 4)).toPrecision(10);
          // meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
          meanmo = meanmo.split('.');
          meanmo[0] = meanmo[0].substr(-2, 2);
          if (meanmo[1]) {
            meanmo[1] = meanmo[1].substr(0, 8);
          } else {
            meanmo[1] = '00000000';
          }
          meanmo = (meanmo[0] + '.' + meanmo[1]).toString();

          iTLE2 = `2 ${80000 + i} ${inc} ${iTLE2.substr(17, 35)}${meanmo}${iTLE2.substr(63)}`;
          sat = satSet.getSat(satId);
          sat.TLE1 = iTLE1;
          sat.TLE2 = iTLE2;
          sat.active = true;
          if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.propOffset) > 1) {
            satSet.satCruncher.postMessage({
              typ: 'satEdit',
              id: satId,
              TLE1: iTLE1,
              TLE2: iTLE2,
            });
            orbitManager.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
          } else {
            // console.debug('Breakup Generator Failed');
          }
          i++;
        }
      }
    }
  }
  breakupSearchString += mainsat.SCC_NUM + ',Analyst Sat';
  uiManager.doSearch(breakupSearchString);

  $('#loading-screen').fadeOut('slow');
};

export const hideSideMenus = (): void => {
  $('#breakup-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-breakup').removeClass('bmenu-item-selected');
  isBreakupMenuOpen = false;
};
export const bottomMenuClick = (iconName: string): void => {
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
        $('#breakup-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        $('#menu-breakup').addClass('bmenu-item-selected');
        isBreakupMenuOpen = true;

        const sat: SatObject = satSet.getSatExtraOnly(objectManager.selectedSat);
        $('#hc-scc').val(sat.SCC_NUM);
      } else {
        if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.breakupDisabled();
        uiManager.toast(`Select a Satellite First!`, 'caution');
        if (!$('#menu-breakup:animated').length) {
          $('#menu-breakup').effect('shake', {
            distance: 10,
          });
        }
      }
      return;
    }
  }
};
