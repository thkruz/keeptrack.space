/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * watchlist.ts is a plugin for creating a list of satellites to actively monitor
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
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

import addPng from '@app/img/add.png';
import infoPng from '@app/img/icons/info.png';
import watchlistPng from '@app/img/icons/watchlist.png';
import removePng from '@app/img/remove.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject, Watchlist } from '@app/js/api/keepTrackTypes';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { clickAndDragWidth, getEl, saveAs, shake, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import $ from 'jquery';

let watchlistList: any[] = [];
let watchlistInViewList: boolean[] = [];
let isWatchlistChanged: boolean = null;
let isWatchlistMenuOpen = false;
let nextPassEarliestTime: number;
let nextPassArray: any = [];
let isInfoOverlayMenuOpen = false;

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('watchlist-menu'), 1000);
  slideOutLeft(getEl('info-overlay-menu'), 0);
  getEl('menu-info-overlay').classList.remove('bmenu-item-selected');
  getEl('menu-watchlist').classList.remove('bmenu-item-selected');
  isInfoOverlayMenuOpen = false;
  isWatchlistMenuOpen = false;
};

export const init = (): void => {
  const { satSet, objectManager, uiManager, timeManager }: { satSet: any; objectManager: any; uiManager: any; timeManager: any } = keepTrackApi.programs;
  keepTrackApi.programs.watchlist = <Watchlist>{};
  keepTrackApi.programs.watchlist.lastOverlayUpdateTime = 0;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'watchlist',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'watchlist',
    cb: uiManagerFinal,
  });

  keepTrackApi.programs.watchlist.updateWatchlist = updateWatchlist;

  let infoOverlayDOM = [];
  uiManager.updateNextPassOverlay = (nextPassArrayIn: any, isForceUpdate: any) => {
    if (nextPassArrayIn.length <= 0 && !isInfoOverlayMenuOpen) return;
    const { mainCamera } = keepTrackApi.programs;

    // TODO: This should auto update the overlay when the time changes outside the original search window
    // Update once every 10 seconds
    if (
      (timeManager.realTime > keepTrackApi.programs.watchlist.lastOverlayUpdateTime * 1 + 10000 &&
        objectManager.selectedSat === -1 &&
        !mainCamera.isDragging &&
        mainCamera.zoomLevel === mainCamera.zoomTarget) ||
      isForceUpdate
    ) {
      const propTime = timeManager.simulationTimeObj;
      infoOverlayDOM = [];
      infoOverlayDOM.push('<div>');
      for (let s = 0; s < nextPassArrayIn.length; s++) {
        pushOverlayElement(satSet, nextPassArrayIn, s, propTime, infoOverlayDOM);
      }
      infoOverlayDOM.push('</div>');
      getEl('info-overlay-content').innerHTML = infoOverlayDOM.join('');
      keepTrackApi.programs.watchlist.lastOverlayUpdateTime = timeManager.realTime;
    }
  };

  keepTrackApi.register({
    method: 'updateLoop',
    cbName: 'watchlist',
    cb: updateLoop,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'watchlist',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'onCruncherReady',
    cbName: 'watchlist',
    cb: onCruncherReady,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'watchlist',
    cb: hideSideMenus,
  });
};

// prettier-ignore
export const updateWatchlist = (updateWatchlistList?: any[], updateWatchlistInViewList?: any, isSkipSearch = false) => { // NOSONAR
  const settingsManager: any = window.settingsManager;
  const { satSet, uiManager }: { satSet: any; uiManager: any } = keepTrackApi.programs;
  if (typeof updateWatchlistList !== 'undefined') {
    watchlistList = updateWatchlistList;
  }
  if (typeof updateWatchlistInViewList !== 'undefined') {
    watchlistInViewList = updateWatchlistInViewList;
  }

  if (!watchlistList) return;
  settingsManager.isThemesNeeded = true;
  isWatchlistChanged = isWatchlistChanged != null;
  let watchlistString = '';
  let watchlistListHTML = '';
  let sat: SatObject;
  for (let i = 0; i < watchlistList.length; i++) {
    sat = satSet.getSatExtraOnly(watchlistList[i]);
    if (sat == null) {
      watchlistList.splice(i, 1);
    } else {
    watchlistListHTML +=`
      <div class="row">
        <div class="col s3 m3 l3">
          ${sat.sccNum}
        </div>
        <div class="col s7 m7 l7">
          ${sat.name || 'Unknown'}
        </div>
        <div class="col s2 m2 l2 center-align remove-icon">
          <img class="watchlist-remove" data-sat-id="${sat.id}" src="img/remove.png"></img>
        </div>
      </div>`;
    }
  }
  getEl('watchlist-list').innerHTML = (watchlistListHTML);
  for (let i = 0; i < watchlistList.length; i++) {
    // No duplicates
    watchlistString += satSet.getSatExtraOnly(watchlistList[i]).sccNum;
    if (i !== watchlistList.length - 1) watchlistString += ',';
  }
  if (!isSkipSearch) uiManager.doSearch(watchlistString, true);
  satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc

  const saveWatchlist = [];
  for (let i = 0; i < watchlistList.length; i++) {
    sat = satSet.getSatExtraOnly(watchlistList[i]);
    saveWatchlist[i] = sat.sccNum;
  }
  const variable = JSON.stringify(saveWatchlist);
  try {
    localStorage.setItem('watchlistList', variable);
  } catch {
    // DEBUG:
    // console.warn('Watchlist Plugin: Unable to save watchlist - localStorage issue!');
  }
};

export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
  <div id="watchlist-menu" class="side-menu-parent start-hidden text-select">
    <div id="watchlist-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Satellite Watchlist</h5>
        <div id="watchlist-list">
          <div class="row">
            <div class="col s3 m3 l3">25544</div>
            <div class="col s7 m7 l7">ISS (ZARYA)</div>
            <div class="col s2 m2 l2 center-align remove-icon">
              <img
                alt="remove"
                src="" delayedsrc="${removePng}" />
            </div>
          </div>
        </div>
        <br />
        <div class="row">
          <div class="input-field col s10 m10 l10">
            <form id="watchlist-submit">
              <input placeholder="xxxxx" id="watchlist-new" type="text" />
              <label for="watchlist-new">New Satellite</label>
            </form>
          </div>
          <div class="col s2 m2 l2 center-align add-icon">
            <img
              class="watchlist-add"
              src="" delayedsrc="${addPng}" />
          </div>
        </div>
        <div class="center-align row">
          <button id="watchlist-save" class="btn btn-ui waves-effect waves-light" type="button" name="action">Save List &#9658;</button>
        </div>
        <div class="center-align row">
          <button id="watchlist-open" class="btn btn-ui waves-effect waves-light" type="button" name="action">Load List &#9658;</button>
          <input id="watchlist-file" type="file" name="files[]" style="display: none;" />
        </div>
      </div>
    </div>
  </div>
  <div id="info-overlay-menu" class="start-hidden text-select">
    <div id="info-overlay-content"></div>
  </div>
`
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`  
  <div id="menu-watchlist" class="bmenu-item">
    <img
      alt="watchlist"
      src="" delayedsrc="${watchlistPng}" />
    <span class="bmenu-title">Watchlist</span>
    <div class="status-icon"></div>
  </div>    
  <div id="menu-info-overlay" class="bmenu-item bmenu-item-disabled">
    <img
      alt="info"
      src="" delayedsrc="${infoPng}" />
    <span class="bmenu-title">Overlay</span>
    <div class="status-icon"></div>
  </div>
`
  );
};

export const uiManagerFinal = (): void => {
  document.querySelector('.menu-selectable').addEventListener('click', menuSelectableClick);
  clickAndDragWidth(getEl('watchlist-menu'));

  getEl('info-overlay-content').addEventListener('click', function (evt: Event) {
    if (!(<HTMLElement>evt.target).classList.contains('watchlist-object')) return;
    infoOverlayContentClick(evt);
  });

  getEl('watchlist-list').addEventListener('click', function (evt: Event) {
    const satId = parseInt((<HTMLElement>evt.target).dataset.satId);
    watchlistListClick(satId);
  });

  // Add button selected on watchlist menu
  getEl('watchlist-content').addEventListener('click', watchlistContentEvent);

  // Enter pressed/selected on watchlist menu
  getEl('watchlist-content').addEventListener('submit', function (evt: Event) {
    evt.preventDefault();
    watchlistContentEvent(evt);
  });

  getEl('watchlist-save').addEventListener('click', function (evt: Event) {
    watchlistSaveClick(evt);
  });

  getEl('watchlist-open').addEventListener('click', function () {
    getEl('watchlist-file').click();
  });

  getEl('watchlist-file').addEventListener('change', function (evt: Event) {
    watchlistFileChange(evt);
  });
};

// prettier-ignore
export const updateLoop = () => { // NOSONAR
  const {
    satellite,
    satSet,
    orbitManager,
    uiManager,
    sensorManager,
    timeManager,
  }: { satellite: any; satSet: any; orbitManager: any; uiManager: any; sensorManager: any; timeManager: any } = keepTrackApi.programs;

  uiManager.updateNextPassOverlay(nextPassArray);

  if (watchlistList.length <= 0) return;
  for (let i = 0; i < watchlistList.length; i++) {
    const sat = satSet.getSat(watchlistList[i]);
    if (sensorManager.currentSensorMultiSensor) {
      orbitManager.removeInViewOrbit(watchlistList[i]);
      for (let j = 0; j < sensorManager.currentSensorList.length; j++) {
        const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        const sensor = sensorManager.currentSensorList[j];
        const rae = satellite.getRae(timeManager.dateObject, satrec, sensor);
        const isInFov = satellite.checkIsInView(sensor, rae);
        if (!isInFov) continue;
        keepTrackApi.programs.lineManager.create('sat3', [sat.id, satSet.getSensorFromSensorName(sensor.name)], 'g');
      }
    } else {
      if (sat.inView === 1 && watchlistInViewList[i] === false) {
        // Is inview and wasn't previously
        watchlistInViewList[i] = true;
        uiManager.toast(`Satellite ${sat.sccNum} is In Field of View!`, 'normal');
        keepTrackApi.programs.lineManager.create('sat3', [sat.id, satSet.getSensorFromSensorName(sensorManager.currentSensor[0].name)], 'g');
        orbitManager.addInViewOrbit(watchlistList[i]);
      }
      if (sat.inView === 0 && watchlistInViewList[i] === true) {
        // Isn't inview and was previously
        watchlistInViewList[i] = false;
        uiManager.toast(`Satellite ${sat.sccNum} left Field of View!`, 'standby');
        orbitManager.removeInViewOrbit(watchlistList[i]);
      }
    }
  }
  for (let i = 0; i < watchlistInViewList.length; i++) {
    if (watchlistInViewList[i] === true) {
      return;
    }
  }
};

// prettier-ignore
export const bottomMenuClick = (iconName: string) => { // NOSONAR
  const { satellite, satSet, uiManager, sensorManager, timeManager }: { satellite: any; satSet: any; uiManager: any; sensorManager: any; timeManager: any } = keepTrackApi.programs;

  if (iconName === 'menu-info-overlay') {
    if (!sensorManager.checkSensorSelected()) {
      // No Sensor Selected
      uiManager.toast(`Select a Sensor First!`, 'caution', true);
      shake(getEl('menu-info-overlay'));
      return;
    }
    if (isInfoOverlayMenuOpen) {
      isInfoOverlayMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (watchlistList.length === 0 && !isWatchlistChanged) {
        uiManager.toast(`Add Satellites to Watchlist!`, 'caution');
        shake(getEl('menu-info-overlay'));
        nextPassArray = [];
        return;
      }
      uiManager.hideSideMenus();
      if (
        nextPassArray.length === 0 ||
        nextPassEarliestTime > timeManager.realTime ||
        new Date(nextPassEarliestTime * 1 + 1000 * 60 * 60 * 24) < timeManager.realTime ||
        isWatchlistChanged
      ) {
        showLoading(() => {
          nextPassArray = [];
          for (let x = 0; x < watchlistList.length; x++) {
            nextPassArray.push(satSet.getSatExtraOnly(watchlistList[x]));
          }
          nextPassArray = satellite.nextpassList(nextPassArray);
          nextPassArray.sort(function (a: { time: string | number | Date }, b: { time: string | number | Date }) {
            return new Date(a.time).getTime() - new Date(b.time).getTime();
          });
          nextPassEarliestTime = timeManager.realTime;
          keepTrackApi.programs.watchlist.lastOverlayUpdateTime = 0;
          uiManager.updateNextPassOverlay(nextPassArray, true);
          isWatchlistChanged = false;
        });
      } else {
        uiManager.updateNextPassOverlay(nextPassArray, true);
      }

      slideInRight(getEl('info-overlay-menu'), 100, () => { 
        getEl('info-overlay-menu').style.transform = '';
      });
      getEl('menu-info-overlay').classList.add('bmenu-item-selected');
      isInfoOverlayMenuOpen = true;
      return;
    }
  }
  if (iconName === 'menu-watchlist') {
    if (isWatchlistMenuOpen) {
      isWatchlistMenuOpen = false;
      getEl('menu-watchlist').classList.remove('bmenu-item-selected');
      uiManager.hideSideMenus();
      return;
    } else {
      if ((<any>settingsManager).isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();      
      slideInRight(getEl('watchlist-menu'), 1000);
      updateWatchlist();
      isWatchlistMenuOpen = true;
      getEl('menu-watchlist').classList.add('bmenu-item-selected');
      return;
    }
  }
};

// prettier-ignore
export const onCruncherReady = async (): Promise<void> => { // NOSONAR
  const { satSet, sensorManager }: { satSet: any; sensorManager: any } = keepTrackApi.programs;
  let watchlistJSON;
  try {
    watchlistJSON = localStorage.getItem('watchlistList');
  } catch {
    watchlistJSON = null;
  }
  if (watchlistJSON === null || watchlistJSON === '[]') {
    try {
      watchlistJSON = await $.get(`${settingsManager.installDirectory}tle/watchlist.json`);
    } catch {
      watchlistJSON = null;
    }
  }
  if (watchlistJSON !== null && watchlistJSON !== '[]' && watchlistJSON.length > 0) {
    const newWatchlist = JSON.parse(watchlistJSON);
    const _watchlistInViewList = [];
    for (let i = 0; i < newWatchlist.length; i++) {
      const sat = satSet.getSatExtraOnly(satSet.getIdFromObjNum(newWatchlist[i]));
      if (sat !== null) {
        newWatchlist[i] = sat.id;
        _watchlistInViewList.push(false);
      } else {
        // DEBUG:
        // console.debug('Watchlist File Format Incorret');
        return;
      }
    }
    if (sensorManager.checkSensorSelected() && newWatchlist.length > 0) {
      getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
    }
    updateWatchlist(newWatchlist, _watchlistInViewList, true);
  }
};

export const pushOverlayElement = (satSet: any, nextPassArrayIn: any, s: number, propTime: any, infoOverlayDOM: any[]) => {
  const satInView = keepTrackApi.programs.dotsManager.inViewData[satSet.getIdFromObjNum(nextPassArrayIn[s].sccNum).id];
  // If old time and not in view, skip it
  if (nextPassArrayIn[s].time - propTime < -1000 * 60 * 5 && !satInView) return;

  // Get the pass Time
  const time = dateFormat(nextPassArrayIn[s].time, 'isoTime', true);

  // Yellow - In View and Time to Next Pass is +/- 30 minutes
  if (satInView && nextPassArrayIn[s].time - propTime < 1000 * 60 * 30 && propTime - nextPassArrayIn[s].time < 1000 * 60 * 30) {
    infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">' + nextPassArrayIn[s].sccNum + ': ' + time + '</h5></div>');
    return;
  }
  // Blue - Time to Next Pass is between 10 minutes before and 20 minutes after the current time
  // This makes recent objects stay at the top of the list in blue
  if (nextPassArrayIn[s].time - propTime < 1000 * 60 * 10 && propTime - nextPassArrayIn[s].time < 1000 * 60 * 20) {
    infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: blue">' + nextPassArrayIn[s].sccNum + ': ' + time + '</h5></div>');
    return;
  }
  // White - Any future pass not fitting the above requirements
  if (nextPassArrayIn[s].time - propTime > 0) {
    infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: white">' + nextPassArrayIn[s].sccNum + ': ' + time + '</h5></div>');
  }
};

export const infoOverlayContentClick = (evt: any) => {
  const { satSet, objectManager } = keepTrackApi.programs;
  let objNum = evt.currentTarget.textContent.split(':');
  objNum = objNum[0];
  const satId = satSet.getIdFromObjNum(objNum);
  if (satId !== null) {
    objectManager.setSelectedSat(satId);
  }
};

export const watchlistListClick = (satId: number): void => {
  const { orbitManager, uiManager, satSet, colorSchemeManager, sensorManager } = keepTrackApi.programs;
  for (let i = 0; i < watchlistList.length; i++) {
    if (watchlistList[i] === satId) {
      orbitManager.removeInViewOrbit(watchlistList[i]);
      watchlistList.splice(i, 1);
      watchlistInViewList.splice(i, 1);
    }
  }
  updateWatchlist();
  if (watchlistList.length <= 0) {
    uiManager.doSearch('');
    satSet.setColorScheme(colorSchemeManager.default, true);
    uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
  }
  if (!sensorManager.checkSensorSelected() || watchlistList.length <= 0) {
    isWatchlistChanged = false;
    getEl('menu-info-overlay').classList.add('bmenu-item-disabled');
  }
};

export const watchlistContentEvent = (e?: any, satId?: number) => {
  const { satSet, sensorManager } = keepTrackApi.programs;
  satId ??= satSet.getIdFromObjNum(parseInt((<HTMLInputElement>getEl('watchlist-new')).value));
  let duplicate = false;
  for (let i = 0; i < watchlistList.length; i++) {
    // No duplicates
    if (watchlistList[i] === satId) duplicate = true;
  }
  if (!duplicate) {
    watchlistList.push(satId);
    watchlistInViewList.push(false);
    updateWatchlist();
  }
  if (sensorManager.checkSensorSelected()) {
    getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
  }
  (<HTMLInputElement>getEl('watchlist-new')).value = ''; // Clear the search box after enter pressed/selected
  if (typeof e !== 'undefined' && e !== null) e.preventDefault();
};

export const watchlistSaveClick = (evt: any) => {
  const { satSet } = keepTrackApi.programs;
  const saveWatchlist = [];
  for (let i = 0; i < watchlistList.length; i++) {
    const sat = satSet.getSatExtraOnly(watchlistList[i]);
    saveWatchlist[i] = sat.sccNum;
  }
  const variable = JSON.stringify(saveWatchlist);
  const blob = new Blob([variable], {
    type: 'text/plain;charset=utf-8',
  });
  try {
    saveAs(blob, 'watchlist.json');
  } catch (e) {
    keepTrackApi.programs.uiManager.toast('Error saving watchlist', 'critical');
  }
  evt.preventDefault();
};

export const watchlistFileChange = (evt: any) => {
  if (evt === null) throw new Error('evt is null');
  if (!window.FileReader) return; // Browser is not compatible

  const reader = new FileReader();

  reader.onload = function (e) {
    watchListReaderOnLoad(e);
  };
  reader.readAsText((<HTMLInputElement>evt.target).files[0]);
  evt.preventDefault();
};

export const watchListReaderOnLoad = (evt: any) => {
  const { satSet, uiManager, sensorManager } = keepTrackApi.programs;
  if (evt.target.readyState !== 2) return;
  if (evt.target.error) {
    keepTrackApi.programs.uiManager.toast('Error reading watchlist', 'critical');
    return;
  }

  let newWatchlist;
  try {
    newWatchlist = JSON.parse(<string>evt.target.result);
  } catch {
    uiManager.toast('Watchlist file format incorrect!', 'critical');
    return;
  }

  if (newWatchlist.length === 0) {
    uiManager.toast('Watchlist file format incorrect!', 'critical');
    return;
  }

  watchlistInViewList = [];
  for (let i = 0; i < newWatchlist.length; i++) {
    const sat = satSet.getSatExtraOnly(satSet.getIdFromObjNum(newWatchlist[i]));
    if (sat !== null && sat.id > 0) {
      newWatchlist[i] = sat.id;
      watchlistInViewList.push(false);
    } else {
      uiManager.toast('Sat ' + newWatchlist[i] + ' not found!', 'caution');
      continue;
    }
  }
  watchlistList = newWatchlist;
  updateWatchlist();
  if (sensorManager.checkSensorSelected()) {
    getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
  }
};

export const menuSelectableClick = (): void => {
  if (watchlistList.length > 0) {
    getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
  }
};
