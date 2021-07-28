/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * externalSources.ts is a plugin to allow downloading and parsing of external
 * data sources from the internet.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * TESTING: This plugin requires php to be installed on the server. It won't work
 * with the default http npm module.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { satSet, uiManager } = keepTrackApi.programs;
  let isExternalMenuOpen = false;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'shortTermFences',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="external-menu" class="side-menu-parent start-hidden text-select">
          <div id="external-inner-menu" class="side-menu">
            <ul>
              <h5 class="center-align">External TLE Menu</h5>
              <li class="divider"></li>
            </ul>
            <h5 class="center-align">N2YO Lookup</h5>
            <li class="divider"></li>
            <div class="row"></div>
            <form id="n2yo-form">
              <div class="row">
                <div class="input-field col s12">
                  <input value="25544" id="ext-n2yo" type="text" />
                  <label for="anal-sat" class="active">Satellite Number</label>
                </div>
              </div>
              <div class="row">
                <center>
                  <button id="n2yo-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Load TLE &#9658;</button>
                </center>
              </div>
            </form>
            <h5 class="center-align">Celestrak Lookup</h5>
            <li class="divider"></li>
            <div class="row"></div>
            <form id="celestrak-form">
              <div class="row">
                <div class="input-field col s12">
                  <input value="25544" id="ext-celestrak" type="text" />
                  <label for="anal-sat" class="active">Satellite Number</label>
                </div>
              </div>
              <div class="row">
                <center>
                  <button id="celestrak-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Load TLE &#9658;</button>
                </center>
              </div>
            </form>
          </div>
        </div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-external" class="bmenu-item">
          <img
            alt="external"
            src=""
            delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAACS0lEQVR4nO3cPW4TURSG4fdGCCkKO7HshqFLgeiCxH7SxZReDymygKTCTTAusg6Q8mPhS4GCLMBxzMydc+6Z7yljR558r8YeW1ZARERERERERERERKS4ZH0ApYznOff1WIsm/feOB10eiOxPAYwpgDEFMKYAxsJeBbUxuc5HecU58PY599dVUIf2Hb8tBdjQ9/igAL9ZjA8KAMBomV+tV1zwxPgZLks89uADTK7z0cEtnxIcb7tPgqvVHe9LPP6LNr/c5+ct+8iJ6dfX6eOu+z3naSfB1f0dJzfH6dt43v2fG+4MKDV+pwe5IVSA2saHQAFqHB+CBKh1fAgQoObxoeVV0DZtPhspwev4EOAM2MXz+BA8gPfxIXCAGsaHoAFqGR8CBqhpfAgWoLbxIVCAGseHIAFqHR8KvRHrU9fjTz7n6Zc3afqv20q8waz6DCgxfk6cdXqQO1QbIML4UGmAKONDhQEijQ+VBYg2PlQUoMSlpvX4UEmAmq/zd3EfIPL44DxA9PHBcYAhjA9OAwxlfHAYYEjjg7MAQxsfHAUY4vjg5OPo0TK/XN9y8dRXxDNcrg85uWnS9z6PrTQXZ8BylB4SnG+7/fH7+ctRrPHBSQCARZNmwOmfP4/4tLPJTQD4O0L08cHJa8CmRZNm43kmwYfo44OzM+DRokmzH4e8iz4+OA0Av16YrY+hD24DDIUCGFMAYwpgTAGMKYAxBTCmAMYUwJgCGFMAY0U+DfX6f4Q80hlgTAGMKYAxBTCmACIiIiIiIiIiIiIi8f0EO/G3ftHy+QwAAAAASUVORK5CYII="
          />
          <span class="bmenu-title">External Source</span>
          <div class="status-icon"></div>
        </div>
      `);

      $('#n2yo-form').on('submit', function (e) {
        $('#loading-screen').fadeIn(1000, function () {
          let satnum = parseInt(<string>$('#ext-n2yo').val());
          searchN2yo(satnum);
          $('#loading-screen').fadeOut('slow');
        });
        e.preventDefault();
      });

      $('#celestrak-form').on('submit', function (e) {
        $('#loading-screen').fadeIn(1000, function () {
          let satnum = parseInt(<string>$('#ext-celestrak').val());
          searchCelestrak(satnum);
          $('#loading-screen').fadeOut('slow');
        });
        e.preventDefault();
      });

      $('#external-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 280,
      });      
    },
  });

  const searchCelestrak = (satNum: any, analsat?: number) => {
    const satData = keepTrackApi.programs.satSet.satData;
    // If no Analyst Satellite specified find the first unused one
    if (typeof analsat == 'undefined') {
      for (var i = 15000; i < satData.length; i++) {
        if (satData[i].SCC_NUM >= 80000 && !satData[i].active) {
          analsat = i;
          break;
        }
      }
    } else {
      // Satnum to Id
      analsat = satSet.getIdFromObjNum(analsat);
    }

    let request = new XMLHttpRequest();
    request.open('GET', `php/get_data.php?type=c&sat=${satNum}`, true);

    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        // Success!
        let tles = JSON.parse(this.response).split('\n');
        let TLE1 = tles[1];
        let TLE2 = tles[2];
        if (TLE1.substr(0, 2) !== '1 ') throw new Error('N2YO TLE 1 is not a valid TLE');
        if (TLE2.substr(0, 2) !== '2 ') throw new Error('N2YO TLE 2 is not a valid TLE');
        satSet.insertNewAnalystSatellite(TLE1, TLE2, analsat);
      } else {
        // We reached our target server, but it returned an error
        console.debug('Celestrack request returned an error!');
      }
    };

    request.onerror = function () {
      console.debug('Celestrack request failed!');
    };

    request.send();
  };

  const searchN2yo = (satNum: any, analsat?: number) => {
    const satData = keepTrackApi.programs.satSet.satData;
    // If no Analyst Satellite specified find the first unused one
    if (typeof analsat == 'undefined') {
      for (var i = 15000; i < satData.length; i++) {
        if (satData[i].SCC_NUM >= 80000 && !satData[i].active) {
          analsat = i;
          break;
        }
      }
    } else {
      // Satnum to Id
      analsat = satSet.getIdFromObjNum(analsat);
    }

    let request = new XMLHttpRequest();
    request.open('GET', `php/get_data.php?type=n&sat=${satNum}`, true);

    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        // Success!
        let tles = this.response.split('<div id="tle">')[1].split('<pre>')[1].split('\n');
        let TLE1 = tles[1];
        let TLE2 = tles[2];
        if (TLE1.substr(0, 2) !== '1 ') throw new Error('N2YO TLE 1 is not a valid TLE');
        if (TLE2.substr(0, 2) !== '2 ') throw new Error('N2YO TLE 2 is not a valid TLE');
        satSet.insertNewAnalystSatellite(TLE1, TLE2, analsat);
      } else {
        // We reached our target server, but it returned an error
        console.debug('N2YO request returned an error!');
      }
    };

    request.onerror = function () {
      console.debug('N2YO request failed!');
    };

    request.send();
  };

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'shortTermFences',
    cb: (iconName: string): void => {
      if (iconName === 'menu-external') {
        if (isExternalMenuOpen) {
          isExternalMenuOpen = false;
          $('#menu-external').removeClass('bmenu-item-selected');
          uiManager.hideSideMenus();
          return;
        } else {
          uiManager.hideSideMenus();
          $('#external-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          keepTrackApi.programs.watchlist.updateWatchlist();
          isExternalMenuOpen = true;
          $('#menu-external').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'shortTermFences',
    cb: (): void => {
      $('#external-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-external').removeClass('bmenu-item-selected');
      isExternalMenuOpen = false;
    },
  });
};
