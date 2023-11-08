/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * externalSources.ts is a plugin to allow downloading and parsing of external
 * data sources from the internet.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

// ////////////////////////////////////////////////////////////////////////////
// TODO: This is currently obsolete. It should be replaced with an update to
// the edit satellite plugin allowing for a user to paste a full two line
// element set in to replace an active satellite.
// ////////////////////////////////////////////////////////////////////////////

/* istanbul ignore file */

import externalPng from '@app/img/icons/external.png';
import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, SatObject, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { clickAndDragWidth } from '@app/js/lib/click-and-drag';
import { getEl } from '@app/js/lib/get-el';
import { showLoading } from '@app/js/lib/showLoading';
import { slideInRight, slideOutLeft } from '@app/js/lib/slide';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

import { adviceManagerInstance } from '@app/js/singletons/adviceManager';

import { helpBodyTextExternal, helpTitleTextExternal } from './help';

let isExternalMenuOpen = false;

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('external-menu'), 1000);
  getEl('menu-external').classList.remove('bmenu-item-selected');
  isExternalMenuOpen = false;
};
export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
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
      `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-external" class="bmenu-item">
          <img
            alt="external"
            src=""
            delayedsrc="${externalPng}" />
          <span class="bmenu-title">External Source</span>
          <div class="status-icon"></div>
        </div>
      `
  );
};

export const uiManagerFinal = () => {
  getEl('n2yo-form').addEventListener('submit', function (e: Event) {
    n2yoFormSubmit();
    e.preventDefault();
  });

  getEl('celestrak-form').addEventListener('submit', function (e: Event) {
    celestrakFormSubmit();
    e.preventDefault();
  });

  clickAndDragWidth(getEl('external-menu'));
};

export const init = (): void => {
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'externalSources',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'externalSources',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'externalSources',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'externalSources',
    cb: hideSideMenus,
  });

  keepTrackApi.register({
    method: 'onHelpMenuClick',
    cbName: 'externalSources',
    cb: onHelpMenuClick,
  });
};

export const onHelpMenuClick = (): boolean => {
  if (isExternalMenuOpen) {
    adviceManagerInstance.showAdvice(helpTitleTextExternal, helpBodyTextExternal);
    return true;
  }
  return false;
};

export const n2yoFormSubmit = () => {
  showLoading(() => {
    const satnum = parseInt(<string>(<HTMLInputElement>getEl('ext-n2yo')).value);
    searchN2yo(satnum);
  });
};

export const searchN2yo = (satNum: any, analsat?: number) => {
  const satData = <SatObject[]>keepTrackApi.getCatalogManager().satData;

  // If no Analyst Satellite specified find the first unused one
  if (typeof analsat == 'undefined') {
    for (let i = 15000; i < satData.length; i++) {
      if (parseInt(satData[i]?.sccNum) >= 80000 && !satData[i]?.active) {
        analsat = i;
        break;
      }
    }
  } else {
    // Satnum to Id
    analsat = keepTrackApi.getCatalogManager().getIdFromObjNum(analsat);
  }

  const request = new XMLHttpRequest();
  request.open('GET', `php/get_data.php?type=n&sat=${satNum}`, true);

  request.onload = () => searchN2yoOnLoad(request, analsat);

  request.send();
};

export const searchN2yoOnLoad = (request: { status: number; response: string }, analsat: number): any => {
  if (request.status >= 200 && request.status < 400) {
    // Success!
    try {
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
      const tles = request.response.split('<div id="tle">')[1].split('<pre>')[1].split('\n');
      const TLE1 = tles[1];
      const TLE2 = tles[2];
      if (TLE1.substr(0, 2) !== '1 ') throw new Error('N2YO TLE 1 is not a valid TLE');
      if (TLE2.substr(0, 2) !== '2 ') throw new Error('N2YO TLE 2 is not a valid TLE');
      const sat = catalogManagerInstance.insertNewAnalystSatellite(TLE1, TLE2, analsat);
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.doSearch(sat.sccNum.toString());
    } catch (e) {
      errorManagerInstance.error(e, 'external-sources.ts', 'Error in Loading N2YO TLE');
    }
  } else {
    errorManagerInstance.warn('Unable to Load N2YO TLE');
  }
};

export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-external') {
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    if (isExternalMenuOpen) {
      isExternalMenuOpen = false;
      getEl('menu-external').classList.remove('bmenu-item-selected');
      uiManagerInstance.hideSideMenus();
      return;
    } else {
      uiManagerInstance.hideSideMenus();
      slideInRight(getEl('external-menu'), 1000);
      keepTrackApi.programs.watchlist.updateWatchlist();
      isExternalMenuOpen = true;
      getEl('menu-external').classList.add('bmenu-item-selected');
      return;
    }
  }
};
export const searchCelestrackOnLoad = (request: any, analsat: number): any => {
  if (request.status >= 200 && request.status < 400) {
    try {
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
      const tles = JSON.parse(request.response).split('\n');
      const TLE1 = tles[1];
      const TLE2 = tles[2];
      if (TLE1.substr(0, 2) !== '1 ') throw new Error(`Celestrak TLE 1 is not a valid TLE -- ${TLE1.substr(0, 2)}`);
      if (TLE2.substr(0, 2) !== '2 ') throw new Error(`Celestrak TLE 2 is not a valid TLE -- ${TLE2.substr(0, 2)}`);
      const sat = catalogManagerInstance.insertNewAnalystSatellite(TLE1, TLE2, analsat);
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.doSearch(sat.sccNum.toString());
    } catch (e) {
      errorManagerInstance.error(e, 'external-sources.ts', 'Error in Loading Celestrak TLE');
    }
  } else {
    errorManagerInstance.warn('Unable to Load Celestrak TLE');
  }
};

export const searchCelestrak = (satNum: any, analsat?: number) => {
  const satData = <SatObject[]>keepTrackApi.getCatalogManager().satData;
  // If no Analyst Satellite specified find the first unused one
  if (typeof analsat == 'undefined') {
    for (let i = 15000; i < satData.length; i++) {
      if (parseInt(satData[i]?.sccNum) >= 80000 && !satData[i]?.active) {
        analsat = i;
        break;
      }
    }
  } else {
    // Satnum to Id
    analsat = keepTrackApi.getCatalogManager().getIdFromObjNum(analsat);
  }

  const request = new XMLHttpRequest();
  request.open('GET', `php/get_data.php?type=c&sat=${satNum}`, true);

  request.onload = () => searchCelestrackOnLoad(request, analsat);

  request.send();
};

export const celestrakFormSubmit = () => {
  showLoading(() => {
    const satnum = parseInt(<string>(<HTMLInputElement>getEl('ext-celestrak')).value);
    searchCelestrak(satnum);
  });
};
