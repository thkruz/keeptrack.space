import $ from 'jquery';
import { RAD2DEG } from '@app/js/lib/constants';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  let isFindByLooksMenuOpen = false;

  const checkInc = (possibles: string | any[], minInc: number, maxInc: number) => {
    const incRes = [];
    for (let i = 0; i < possibles.length; i++) {
      if (possibles[i].inclination * RAD2DEG < maxInc && possibles[i].inclination * RAD2DEG > minInc) {
        incRes.push(possibles[i]);
      }
    }
    return incRes;
  };
  const checkPeriod = (possibles: string | any[], minPeriod: number, maxPeriod: number) => {
    const periodRes = [];
    for (let i = 0; i < possibles.length; i++) {
      if (possibles[i].period < maxPeriod && possibles[i].period > minPeriod && periodRes.length <= 200) {
        // Don't display more than 200 results - this is because LEO and GEO belt have a lot of satellites
        periodRes.push(possibles[i]);
      }
    }
    if (periodRes.length >= 200) {
      $('#findByLooks-results').text('Limited to 200 Results!');
    }
    return periodRes;
  };
  const checkRcs = (possibles: string | any[], minRcs: number, maxRcs: number) => {
    const rcsRes = [];
    for (let i = 0; i < possibles.length; i++) {
      if (parseFloat(possibles[i].R) < maxRcs && parseFloat(possibles[i].R) > minRcs && rcsRes.length <= 200) {
        // Don't display more than 200 results - this is because LEO and GEO belt have a lot of satellites
        rcsRes.push(possibles[i]);
      }
    }
    if (rcsRes.length >= 200) {
      $('#findByLooks-results').text('Limited to 200 Results!');
    }
    return rcsRes;
  };

  const searchAzElRange = (
    azimuth: string | number,
    elevation: string | number,
    range: string | number,
    inclination: string | number,
    azMarg: string | number,
    elMarg: string | number,
    rangeMarg: string | number,
    incMarg: string | number,
    period: string | number,
    periodMarg: string | number,
    rcs: string | number,
    rcsMarg: string | number,
    objtypeStr: string
  ) => {
    const isCheckAz = !isNaN(parseFloat(<string>azimuth)) && isFinite(parseFloat(<string>azimuth));
    const isCheckEl = !isNaN(parseFloat(<string>elevation)) && isFinite(parseFloat(<string>elevation));
    const isCheckRange = !isNaN(parseFloat(<string>range)) && isFinite(parseFloat(<string>range));
    const isCheckInclination = !isNaN(parseFloat(<string>inclination)) && isFinite(parseFloat(<string>inclination));
    const isCheckPeriod = !isNaN(parseFloat(<string>period)) && isFinite(parseFloat(<string>period));
    const isCheckRcs = !isNaN(parseFloat(<string>rcs)) && isFinite(parseFloat(<string>rcs));
    const isCheckAzMarg = !isNaN(parseFloat(<string>azMarg)) && isFinite(parseFloat(<string>azMarg));
    const isCheckElMarg = !isNaN(parseFloat(<string>elMarg)) && isFinite(parseFloat(<string>elMarg));
    const isCheckRangeMarg = !isNaN(parseFloat(<string>rangeMarg)) && isFinite(parseFloat(<string>rangeMarg));
    const isCheckIncMarg = !isNaN(parseFloat(<string>incMarg)) && isFinite(parseFloat(<string>incMarg));
    const isCheckPeriodMarg = !isNaN(parseFloat(<string>periodMarg)) && isFinite(parseFloat(<string>periodMarg));
    const isCheckRcsMarg = !isNaN(parseFloat(<string>rcsMarg)) && isFinite(parseFloat(<string>rcsMarg));
    const objtype = parseFloat(objtypeStr); // String to Number

    if (!isCheckEl && !isCheckRange && !isCheckAz && !isCheckInclination && !isCheckPeriod && !isCheckRcs) return; // Ensure there is a number typed.

    const checkInview = (possibles: string | any[]) => {
      const inviewRes = [];
      for (let i = 0; i < possibles.length; i++) {
        if (possibles[i].inview) {
          inviewRes.push(possibles[i]);
        }
      }
      return inviewRes;
    };

    const checkObjtype = (possibles: string | any[]) => {
      const objtypeRes = [];
      for (let i = 0; i < possibles.length; i++) {
        if (possibles[i].OT === objtype) {
          objtypeRes.push(possibles[i]);
        }
      }
      return objtypeRes;
    };

    const checkAz = (possibles: string | any[], minaz: number, maxaz: number) => {
      const azRes = [];
      for (let i = 0; i < possibles.length; i++) {
        if (possibles[i].az < maxaz && possibles[i].az > minaz) {
          azRes.push(possibles[i]);
        }
      }
      return azRes;
    };
    const checkEl = (possibles: string | any[], minel: number, maxel: number) => {
      const elRes = [];
      for (let i = 0; i < possibles.length; i++) {
        if (possibles[i].el < maxel && possibles[i].el > minel) {
          elRes.push(possibles[i]);
        }
      }
      return elRes;
    };
    const checkRange = (possibles: string | any[], minrange: number, maxrange: number) => {
      const rangeRes = [];
      for (let i = 0; i < possibles.length; i++) {
        if (possibles[i].rng < maxrange && possibles[i].rng > minrange) {
          rangeRes.push(possibles[i]);
        }
      }
      return rangeRes;
    };

    if (!isCheckAzMarg) {
      azMarg = 5;
    }
    if (!isCheckElMarg) {
      elMarg = 5;
    }
    if (!isCheckRangeMarg) {
      rangeMarg = 200;
    }
    if (!isCheckIncMarg) {
      incMarg = 1;
    }
    if (!isCheckPeriodMarg) {
      periodMarg = 0.5;
    }
    if (!isCheckRcsMarg) {
      rcsMarg = <number>rcs / 10;
    }
    let res = [];

    let s = 0;
    const satData = keepTrackApi.programs.satSet.satData;
    for (let i = 0; i < satData.length; i++) {
      if (satData[i].static || satData[i].missile || !satData[i].active) {
        continue;
      }
      res.push(satData[i]);
      keepTrackApi.programs.satellite.getTEARR(res[s]);
      res[s].az = keepTrackApi.programs.satellite.currentTEARR.az;
      res[s].el = keepTrackApi.programs.satellite.currentTEARR.el;
      res[s].rng = keepTrackApi.programs.satellite.currentTEARR.rng;
      res[s].inview = keepTrackApi.programs.satellite.currentTEARR.inview;
      s++;
    }

    if (!isCheckInclination && !isCheckPeriod) {
      res = checkInview(res);
    }

    if (objtype !== 0) {
      res = checkObjtype(res);
    }

    if (isCheckAz) {
      azimuth = parseFloat(<string>azimuth); // Convert azimuth to int
      azMarg = parseFloat(<string>azMarg);
      const minaz = azimuth - azMarg;
      const maxaz = azimuth + azMarg;
      res = checkAz(res, minaz, maxaz);
    }

    if (isCheckEl) {
      elevation = parseFloat(<string>elevation); // Convert elevation to int
      elMarg = parseFloat(<string>elMarg);
      const minel = elevation - elMarg;
      const maxel = elevation + elMarg;
      res = checkEl(res, minel, maxel);
    }

    if (isCheckRange) {
      range = parseFloat(<string>range); // Convert range to int
      rangeMarg = parseFloat(<string>rangeMarg);
      const minrange = range - rangeMarg;
      const maxrange = range + rangeMarg;
      res = checkRange(res, minrange, maxrange);
    }

    if (isCheckInclination) {
      inclination = parseFloat(<string>inclination); // Convert inclination to int
      incMarg = parseFloat(<string>incMarg);
      const minInc = inclination - incMarg;
      const maxInc = inclination + incMarg;
      res = checkInc(res, minInc, maxInc);
    }

    if (isCheckPeriod) {
      period = parseFloat(<string>period); // Convert period to int
      periodMarg = parseFloat(<string>periodMarg);
      const minPeriod = period - periodMarg;
      const maxPeriod = period + periodMarg;
      res = checkPeriod(res, minPeriod, maxPeriod);
    }

    if (isCheckRcs) {
      rcs = parseFloat(<string>rcs); // Convert period to int
      rcsMarg = parseFloat(<string>rcsMarg);
      const minRcs = rcs - rcsMarg;
      const maxRcs = rcs + rcsMarg;
      res = checkRcs(res, minRcs, maxRcs);
    }
    // $('#findByLooks-results').text('');
    // IDEA: Intentionally doesn't clear previous searches. Could be an option later.
    const sccList = [];
    for (let i = 0; i < res.length; i++) {
      // $('#findByLooks-results').append(res[i].SCC_NUM + '<br />');
      if (i < res.length - 1) {
        $('#search').val($('#search').val() + res[i].SCC_NUM + ',');
      } else {
        $('#search').val($('#search').val() + res[i].SCC_NUM);
      }
      sccList.push(res[i].SCC_NUM);
    }
    keepTrackApi.programs.uiManager.doSearch($('#search').val());
    // console.log(sccList);
    return res;
  };

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'findSat',
    cb: () => {
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

      $('#newLaunch').on('submit', function (e) {
        $('#loading-screen').fadeIn(1000, function () {
          $('#nl-error').hide();
          const scc = $('#nl-scc').val();
          const satId = keepTrackApi.programs.satSet.getIdFromObjNum(scc);
          let sat = keepTrackApi.programs.satSet.getSat(satId);

          let upOrDown = $('#nl-updown').val();
          let launchFac = $('#nl-facility').val();
          let launchLat, launchLon;

          if (keepTrackApi.programs.objectManager.isLaunchSiteManagerLoaded) {
            for (const launchSite in keepTrackApi.programs.objectManager.launchSiteManager.launchSiteList) {
              if (keepTrackApi.programs.objectManager.launchSiteManager.launchSiteList[launchSite].name === launchFac) {
                launchLat = keepTrackApi.programs.objectManager.launchSiteManager.launchSiteList[launchSite].lat;
                launchLon = keepTrackApi.programs.objectManager.launchSiteManager.launchSiteList[launchSite].lon;
              }
            }
          }
          if (launchLon > 180) {
            // if West not East
            launchLon -= 360; // Convert from 0-360 to -180-180
          }

          // if (sat.inclination * RAD2DEG < launchLat) {
          //   keepTrackApi.programs.uiManager.toast(`Satellite Inclination Lower than Launch Latitude!`, 'critical');
          //   $('#loading-screen').fadeOut('slow');
          //   return;
          // }

          // Set time to 0000z for relative time.
          const today = new Date(); // Need to know today for offset calculation
          const quadZTime = new Date(today.getFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision
          // Date object defaults to local time.
          quadZTime.setUTCHours(0); // Move to UTC Hour

          keepTrackApi.programs.timeManager.propOffset = quadZTime.getTime() - today.getTime(); // Find the offset from today
          keepTrackApi.programs.cameraManager.camSnapMode = false;
          keepTrackApi.programs.satSet.satCruncher.postMessage({
            // Tell satSet.satCruncher we have changed times for orbit calculations
            typ: 'offset',
            dat: keepTrackApi.programs.timeManager.propOffset.toString() + ' ' + (1.0).toString(),
          });

          const TLEs = keepTrackApi.programs.satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, keepTrackApi.programs.timeManager.propOffset);

          const TLE1 = TLEs[0];
          const TLE2 = TLEs[1];

          if (keepTrackApi.programs.satellite.altitudeCheck(TLE1, TLE2, keepTrackApi.programs.timeManager.propOffset) > 1) {
            keepTrackApi.programs.satSet.satCruncher.postMessage({
              typ: 'satEdit',
              id: satId,
              active: true,
              TLE1: TLE1,
              TLE2: TLE2,
            });
            keepTrackApi.programs.orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

            sat = keepTrackApi.programs.satSet.getSat(satId);
          } else {
            keepTrackApi.programs.uiManager.toast(`Failed Altitude Test - Try a Different Satellite!`, 'critical');
          }
          $('#loading-screen').fadeOut('slow');
        });
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

      $('#findByLooks').on('submit', function (e) {
        const fblAzimuth = <string | number>$('#fbl-azimuth').val();
        const fblElevation = <string | number>$('#fbl-elevation').val();
        const fblRange = <string | number>$('#fbl-range').val();
        const fblInc = <string | number>$('#fbl-inc').val();
        const fblPeriod = <string | number>$('#fbl-period').val();
        const fblRcs = <string | number>$('#fbl-rcs').val();
        const fblAzimuthM = <string | number>$('#fbl-azimuth-margin').val();
        const fblElevationM = <string | number>$('#fbl-elevation-margin').val();
        const fblRangeM = <string | number>$('#fbl-range-margin').val();
        const fblIncM = <string | number>$('#fbl-inc-margin').val();
        const fblPeriodM = <string | number>$('#fbl-period-margin').val();
        const fblRcsM = <string | number>$('#fbl-rcs-margin').val();
        const fblType = <string>$('#fbl-type').val();
        $('#search').val(''); // Reset the search first
        const res = searchAzElRange(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM, fblPeriod, fblPeriodM, fblRcs, fblRcsM, fblType);
        if (typeof res === 'undefined') {
          keepTrackApi.programs.uiManager.toast(`No Search Criteria Entered`, 'critical');
        } else if (res.length === 0) {
          keepTrackApi.programs.uiManager.toast(`No Satellites Found`, 'critical');
        }
        e.preventDefault();
      });
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'findSat',
    cb: (iconName: string): void => {
      if (iconName === 'menu-find-sat') {
        if (isFindByLooksMenuOpen) {
          isFindByLooksMenuOpen = false;
          keepTrackApi.programs.uiManager.hideSideMenus();
          return;
        } else {
          if (keepTrackApi.programs.settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
          keepTrackApi.programs.uiManager.hideSideMenus();
          $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isFindByLooksMenuOpen = true;
          $('#menu-find-sat').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'findSat',
    cb: (): void => {
      $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-find-sat').removeClass('bmenu-item-selected');
      isFindByLooksMenuOpen = false;
    },
  });
};
