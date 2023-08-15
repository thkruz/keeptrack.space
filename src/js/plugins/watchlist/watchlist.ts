/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * watchlist.ts is a plugin for creating a list of satellites to actively monitor
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

import addPng from '@app/img/add.png';
import infoPng from '@app/img/icons/info.png';
import watchlistPng from '@app/img/icons/watchlist.png';
import removePng from '@app/img/remove.png';
import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, GetSatType, OrbitManager, SatObject, SensorManager, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { clickAndDragWidth } from '@app/js/lib/click-and-drag';
import { dateFormat } from '@app/js/lib/dateFormat';
import { getEl } from '@app/js/lib/get-el';
import { shake } from '@app/js/lib/shake';
import { showLoading } from '@app/js/lib/showLoading';
import { slideInRight, slideOutLeft } from '@app/js/lib/slide';
import { adviceManagerInstance } from '@app/js/singletons/adviceManager';
import { mainCameraInstance } from '@app/js/singletons/camera';
import { lineManagerInstance } from '@app/js/singletons/draw-manager/line-manager';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { TimeManager } from '@app/js/singletons/time-manager';
import { SatMath } from '@app/js/static/sat-math';

import { MILLISECONDS_PER_DAY } from '@app/js/lib/constants';
import { StandardColorSchemeManager } from '@app/js/singletons/color-scheme-manager';
import { DotsManager } from '@app/js/singletons/dots-manager';
import { SensorMath } from '@app/js/static/sensor-math';
import saveAs from 'file-saver';
import { Sgp4 } from 'ootk';
import { helpBodyTextWatchlist, helpTitleTextWatchlist } from './help';

export class WatchlistPlugin {
  // #region Properties (9)

  private infoOverlayDOM = [];
  private isInfoOverlayMenuOpen = false;
  private isWatchlistChanged: boolean = null;
  private isWatchlistMenuOpen = false;
  public lastOverlayUpdateTime = 0;
  private nextPassArray: any = [];
  private lastSimTimeWhenCalc: number;
  public watchlistInViewList: boolean[] = [];

  /** List of ids (not scc numbers) */
  public watchlistList: number[] = [];

  private readonly OVERLAY_CALC_LENGTH_IN_DAYS = 0.5;
  lastSensorNameWhenCalc: string;

  // #endregion Properties (9)

  // #region Public Static Methods (2)

  public static infoOverlayContentClick(evt: any) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    let objNum = evt.target.textContent.split(':');
    objNum = objNum[0];
    const satId = catalogManagerInstance.getIdFromObjNum(objNum);
    if (satId !== null) {
      catalogManagerInstance.setSelectedSat(satId);
    }
  }

  public static uiManagerInit(): void {
    // Side Menu
    getEl('left-menus').insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
    <div id="watchlist-menu" class="side-menu-parent start-hidden text-select">
      <div id="watchlist-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Satellite Watchlist</h5>
          <div id="watchlist-list">
            <!-- <div class="row"> -->
              <!-- <div class="col s3 m3 l3">25544</div> -->
              <!-- <div class="col s7 m7 l7">ISS (ZARYA)</div> -->
              <!-- <div class="col s2 m2 l2 center-align remove-icon"> -->
                <!-- <img -->
                  <!-- alt="remove" -->
                  <!-- src="" delayedsrc="${removePng}" /> -->
              <!-- </div> -->
            <!-- </div> -->
          </div>
          <br />
          <div class="row">
            <div class="input-field col s10 m10 l10">
              <form id="watchlist-submit">
                <input placeholder="xxxxx,xxxxx,xxxxx..." id="watchlist-new" type="text" />
                <label for="watchlist-new">New Satellite(s)</label>
              </form>
            </div>
            <div class="col s2 m2 l2 center-align add-icon">
              <img
                id="watchlist-add"
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
          <div class="center-align row">
            <button id="watchlist-clear" class="btn btn-ui waves-effect waves-light" type="button" name="action">Clear List &#9658;</button>
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
  }

  // #endregion Public Static Methods (2)

  // #region Public Methods (15)

  public bottomMenuClick(iconName: string) {
    if (iconName === 'menu-info-overlay') {
      this.menuInfoOverlayClick_();
    }
    if (iconName === 'menu-watchlist') {
      this.menuWatchlistClick_();
    }
  }

  public hideSideMenus(): void {
    slideOutLeft(getEl('watchlist-menu'), 1000);
    slideOutLeft(getEl('info-overlay-menu'), 0);
    this.setWatchlistButtonOff_();
    this.setOverlayButtonOff_();
  }

  public init(): void {
    // Add HTML
    keepTrackApi.register({
      method: 'uiManagerInit',
      cbName: 'watchlist',
      cb: WatchlistPlugin.uiManagerInit,
    });

    keepTrackApi.register({
      method: 'uiManagerFinal',
      cbName: 'watchlist',
      cb: this.uiManagerFinal.bind(this),
    });

    keepTrackApi.register({
      method: 'updateLoop',
      cbName: 'watchlist',
      cb: this.updateLoop.bind(this),
    });

    // Add JavaScript
    keepTrackApi.register({
      method: 'bottomMenuClick',
      cbName: 'watchlist',
      cb: (iconName: string): void => this.bottomMenuClick(iconName),
    });

    keepTrackApi.register({
      method: 'onCruncherReady',
      cbName: 'watchlist',
      cb: this.onCruncherReady.bind(this),
    });

    keepTrackApi.register({
      method: 'hideSideMenus',
      cbName: 'watchlist',
      cb: this.hideSideMenus.bind(this),
    });

    keepTrackApi.register({
      method: 'onHelpMenuClick',
      cbName: 'watchlist',
      cb: this.onHelpMenuClick.bind(this),
    });
  }

  public menuSelectableClick(): void {
    if (this.watchlistList.length > 0) {
      getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
    }
  }

  public async onCruncherReady(): Promise<void> {
    let watchlistString: string;
    try {
      watchlistString = localStorage.getItem('watchlistList');
    } catch {
      watchlistString = null;
    }
    if (!watchlistString || watchlistString === '[]') {
      try {
        watchlistString = await fetch(`${settingsManager.installDirectory}tle/watchlist.json`).then((response) => response.text());
      } catch {
        watchlistString = null;
      }
    }
    if (watchlistString !== null && watchlistString !== '[]' && watchlistString.length > 0) {
      const newWatchlist = JSON.parse(watchlistString);
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
      const _watchlistInViewList = [];
      for (let i = 0; i < newWatchlist.length; i++) {
        const sat = catalogManagerInstance.getSat(catalogManagerInstance.getIdFromObjNum(newWatchlist[i]), GetSatType.EXTRA_ONLY);
        if (sat !== null) {
          newWatchlist[i] = sat.id;
          _watchlistInViewList.push(false);
        } else {
          errorManagerInstance.warn('Watchlist File Format Incorret');
          return;
        }
      }
      if (newWatchlist.length > 0) {
        keepTrackApi.getUiManager().toast(`Watchlist Loaded with ${newWatchlist.length} Satellites`, 'normal');

        if (keepTrackApi.getSensorManager().isSensorSelected()) {
          getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
        }
      }

      this.updateWatchlist(newWatchlist, _watchlistInViewList, true);
    }
  }

  public onHelpMenuClick(): boolean {
    if (this.isWatchlistMenuOpen) {
      adviceManagerInstance.showAdvice(helpTitleTextWatchlist, helpBodyTextWatchlist);
      return true;
    }

    return false;
  }

  public pushOverlayElement(catalogManagerInstance: any, s: number, propTime: any, infoOverlayDOM: any[]) {
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    const satInView = dotsManagerInstance.inViewData[catalogManagerInstance.getIdFromObjNum(this.nextPassArray[s].sccNum)];
    // If old time and not in view, skip it
    if (this.nextPassArray[s].time - propTime < -1000 * 60 * 5 && !satInView) return;

    // Get the pass Time
    const time = dateFormat(this.nextPassArray[s].time, 'isoTime', true);

    // Yellow - In View and Time to Next Pass is +/- 30 minutes
    if (satInView && this.nextPassArray[s].time - propTime < 1000 * 60 * 30 && propTime - this.nextPassArray[s].time < 1000 * 60 * 30) {
      infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">' + this.nextPassArray[s].sccNum + ': ' + time + '</h5></div>');
      return;
    }
    // Blue - Time to Next Pass is between 10 minutes before and 20 minutes after the current time
    // This makes recent objects stay at the top of the list in blue
    if (this.nextPassArray[s].time - propTime < 1000 * 60 * 10 && propTime - this.nextPassArray[s].time < 1000 * 60 * 20) {
      infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: #0095ff">' + this.nextPassArray[s].sccNum + ': ' + time + '</h5></div>');
      return;
    }
    // White - Any future pass not fitting the above requirements
    if (this.nextPassArray[s].time - propTime > 0) {
      infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: white">' + this.nextPassArray[s].sccNum + ': ' + time + '</h5></div>');
    }
  }

  public uiManagerFinal(): void {
    const MenuSelectableDOM = document.querySelector('.menu-selectable');
    MenuSelectableDOM && MenuSelectableDOM.addEventListener('click', this.menuSelectableClick.bind(this));
    clickAndDragWidth(getEl('watchlist-menu'));

    getEl('info-overlay-content').addEventListener('click', (evt: Event) => {
      // if (!(<HTMLElement>evt.target).classList.contains('watchlist-object')) return;
      WatchlistPlugin.infoOverlayContentClick(evt);
    });

    getEl('watchlist-add').addEventListener('click', () => this.watchlistContentEvent());

    // Add button selected on watchlist menu
    getEl('watchlist-list').addEventListener('click', () => this.watchlistContentEvent());

    // Enter pressed/selected on watchlist menu
    getEl('watchlist-content').addEventListener('submit', (evt: Event) => {
      evt.preventDefault();
      this.watchlistContentEvent(evt);
    });

    getEl('watchlist-save').addEventListener('click', (evt: Event) => {
      this.watchlistSaveClick(evt);
    });

    getEl('watchlist-clear').addEventListener('click', () => {
      const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
      for (let i = 0; i < this.watchlistList.length; i++) {
        orbitManagerInstance.removeInViewOrbit(this.watchlistList[i]);
      }
      // TODO: Clear lines from sensors to satellites
      this.updateWatchlist([], [], true);
    });

    getEl('watchlist-open').addEventListener('click', () => {
      getEl('watchlist-file').click();
    });

    getEl('watchlist-file').addEventListener('change', (evt: Event) => {
      this.watchlistFileChange(evt);

      // Reset file input
      (<HTMLInputElement>document.getElementById('watchlist-file')).value = '';
    });
  }

  public updateLoop() {
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);

    this.updateNextPassOverlay_();

    if (!dotsManagerInstance.inViewData) return;

    if (this.watchlistList.length <= 0) return;
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

    for (let i = 0; i < this.watchlistList.length; i++) {
      const sat = <SatObject>catalogManagerInstance.getSat(this.watchlistList[i]);
      if (sensorManagerInstance.currentSensors.length > 1) {
        orbitManagerInstance.removeInViewOrbit(this.watchlistList[i]);
        for (let j = 0; j < sensorManagerInstance.currentSensors.length; j++) {
          const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
          const sensor = sensorManagerInstance.currentSensors[j];
          const rae = SatMath.getRae(timeManagerInstance.simulationTimeObj, satrec, sensor);
          const isInFov = SatMath.checkIsInView(sensor, rae);
          if (!isInFov) continue;
          lineManagerInstance.create('sat3', [sat.id, catalogManagerInstance.getSensorFromSensorName(sensor.name)], 'g');
        }
      } else {
        const inView = dotsManagerInstance.inViewData[sat.id];
        const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

        if (inView === 1 && this.watchlistInViewList[i] === false) {
          // Is inview and wasn't previously
          this.watchlistInViewList[i] = true;
          uiManagerInstance.toast(`Satellite ${sat.sccNum} is In Field of View!`, 'normal');
          lineManagerInstance.create('sat3', [sat.id, catalogManagerInstance.getSensorFromSensorName(sensorManagerInstance.currentSensors[0].name)], 'g');
          orbitManagerInstance.addInViewOrbit(this.watchlistList[i]);
        }
        if (inView === 0 && this.watchlistInViewList[i] === true) {
          // Isn't inview and was previously
          this.watchlistInViewList[i] = false;
          uiManagerInstance.toast(`Satellite ${sat.sccNum} left Field of View!`, 'standby');
          orbitManagerInstance.removeInViewOrbit(this.watchlistList[i]);
        }
      }
    }
    for (let i = 0; i < this.watchlistInViewList.length; i++) {
      if (this.watchlistInViewList[i] === true) {
        return;
      }
    }
  }

  public updateWatchlist(updateWatchlistList?: any[], updateWatchlistInViewList?: any, isSkipSearch = false) {
    const settingsManager: any = window.settingsManager;
    if (typeof updateWatchlistList !== 'undefined') {
      this.watchlistList = updateWatchlistList;
    }
    if (typeof updateWatchlistInViewList !== 'undefined') {
      this.watchlistInViewList = updateWatchlistInViewList;
    }

    if (!this.watchlistList) return;
    settingsManager.isThemesNeeded = true;
    this.isWatchlistChanged = this.isWatchlistChanged != null;
    let watchlistString = '';
    let watchlistListHTML = '';
    let sat: SatObject;
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    for (let i = 0; i < this.watchlistList.length; i++) {
      sat = catalogManagerInstance.getSat(this.watchlistList[i], GetSatType.EXTRA_ONLY);
      if (sat == null) {
        this.watchlistList.splice(i, 1);
      } else {
        watchlistListHTML += `
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
    getEl('watchlist-list').innerHTML = watchlistListHTML;
    for (let i = 0; i < this.watchlistList.length; i++) {
      // No duplicates
      watchlistString += catalogManagerInstance.getSat(this.watchlistList[i], GetSatType.EXTRA_ONLY).sccNum;
      if (i !== this.watchlistList.length - 1) watchlistString += ',';
    }

    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);

    if (!isSkipSearch) uiManagerInstance.doSearch(watchlistString, true);
    colorSchemeManagerInstance.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc

    const saveWatchlist = [];
    for (let i = 0; i < this.watchlistList.length; i++) {
      sat = catalogManagerInstance.getSat(this.watchlistList[i], GetSatType.EXTRA_ONLY);
      saveWatchlist[i] = sat.sccNum;
    }
    const variable = JSON.stringify(saveWatchlist);
    try {
      localStorage.setItem('watchlistList', variable);
    } catch {
      // DEBUG:
      // console.warn('Watchlist Plugin: Unable to save watchlist - localStorage issue!');
    }
  }

  public watchListReaderOnLoad(evt: any) {
    if (evt.target.readyState !== 2) return;
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

    if (evt.target.error) {
      uiManagerInstance.toast('Error reading watchlist', 'critical');
      return;
    }

    let newWatchlist;
    try {
      newWatchlist = JSON.parse(<string>evt.target.result);
    } catch {
      uiManagerInstance.toast('Watchlist file format incorrect!', 'critical');
      return;
    }

    if (newWatchlist.length === 0) {
      uiManagerInstance.toast('Watchlist file format incorrect!', 'critical');
      return;
    }

    this.watchlistInViewList = [];
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    for (let i = 0; i < newWatchlist.length; i++) {
      const sat = catalogManagerInstance.getSat(catalogManagerInstance.getIdFromObjNum(newWatchlist[i]), GetSatType.EXTRA_ONLY);
      if (sat !== null && sat.id > 0) {
        newWatchlist[i] = sat.id;
        this.watchlistInViewList.push(false);
      } else {
        uiManagerInstance.toast('Sat ' + newWatchlist[i] + ' not found!', 'caution');
        continue;
      }
    }
    this.watchlistList = newWatchlist;
    this.updateWatchlist();

    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);
    if (sensorManagerInstance.isSensorSelected()) {
      getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
    }
  }

  public watchlistContentEvent(e?: any, satId?: number) {
    if (typeof satId !== 'undefined') {
      let duplicate = false;
      for (let i = 0; i < this.watchlistList.length; i++) {
        // No duplicates
        if (this.watchlistList[i] === satId) duplicate = true;
      }
      if (!duplicate) {
        this.watchlistList.push(satId);
        this.watchlistInViewList.push(false);
      }
    }

    const sats = (<HTMLInputElement>getEl('watchlist-new')).value.split(',');
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    sats.forEach((satNum: string) => {
      const satId = catalogManagerInstance.getIdFromObjNum(parseInt(satNum));
      let duplicate = false;
      for (let i = 0; i < this.watchlistList.length; i++) {
        // No duplicates
        if (this.watchlistList[i] === satId) duplicate = true;
      }
      if (!duplicate) {
        this.watchlistList.push(satId);
        this.watchlistInViewList.push(false);
      }
    });

    this.watchlistList.sort((a: number, b: number) => {
      const satA = catalogManagerInstance.getSat(a);
      const satB = catalogManagerInstance.getSat(b);
      if (satA === null || satB === null) return 0;
      return parseInt(satA.sccNum) - parseInt(satB.sccNum);
    });

    this.updateWatchlist();
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);
    if (sensorManagerInstance.isSensorSelected()) {
      getEl('menu-info-overlay').classList.remove('bmenu-item-disabled');
    }
    (<HTMLInputElement>getEl('watchlist-new')).value = ''; // Clear the search box after enter pressed/selected
    if (typeof e !== 'undefined' && e !== null) e.preventDefault();
  }

  public watchlistFileChange(evt: any) {
    if (evt === null) throw new Error('evt is null');
    if (!window.FileReader) return; // Browser is not compatible

    const reader = new FileReader();

    reader.onload = (e) => {
      this.watchListReaderOnLoad(e);
    };
    reader.readAsText((<HTMLInputElement>evt.target).files[0]);
    evt.preventDefault();
  }

  public watchlistListClick(satId: number): void {
    const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);

    for (let i = 0; i < this.watchlistList.length; i++) {
      if (this.watchlistList[i] === satId) {
        orbitManagerInstance.removeInViewOrbit(this.watchlistList[i]);
        this.watchlistList.splice(i, 1);
        this.watchlistInViewList.splice(i, 1);
      }
    }
    this.updateWatchlist();
    if (this.watchlistList.length <= 0) {
      uiManagerInstance.doSearch('');
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
      uiManagerInstance.colorSchemeChangeAlert(settingsManager.currentColorScheme);
    }

    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);
    if (!sensorManagerInstance.isSensorSelected() || this.watchlistList.length <= 0) {
      this.isWatchlistChanged = false;
      getEl('menu-info-overlay').classList.add('bmenu-item-disabled');
    }
  }

  public watchlistSaveClick(evt: any) {
    const saveWatchlist = [];
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    for (let i = 0; i < this.watchlistList.length; i++) {
      const sat = catalogManagerInstance.getSat(this.watchlistList[i], GetSatType.EXTRA_ONLY);
      saveWatchlist[i] = sat.sccNum;
    }
    const variable = JSON.stringify(saveWatchlist);
    const blob = new Blob([variable], {
      type: 'text/plain;charset=utf-8',
    });
    try {
      saveAs(blob, 'watchlist.json');
    } catch (e) {
      errorManagerInstance.error(e, 'watchlist.ts', 'Error saving watchlist!');
    }
    evt.preventDefault();
  }

  // #endregion Public Methods (15)

  // #region Private Methods (8)

  private menuInfoOverlayClick_() {
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

    if (!sensorManagerInstance.isSensorSelected()) {
      // No Sensor Selected
      uiManagerInstance.toast(`Select a Sensor First!`, 'caution', true);
      shake(getEl('menu-info-overlay'));
      return;
    }

    if (this.isInfoOverlayMenuOpen) {
      uiManagerInstance.hideSideMenus();
      return;
    } else {
      if (this.watchlistList.length === 0 && !this.isWatchlistChanged) {
        uiManagerInstance.toast(`Add Satellites to Watchlist!`, 'caution');
        shake(getEl('menu-info-overlay'));
        this.nextPassArray = [];
        return;
      }
      uiManagerInstance.hideSideMenus();
      this.openOverlayMenu(timeManagerInstance);
      return;
    }
  }

  private menuWatchlistClick_() {
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

    if (this.isWatchlistMenuOpen) {
      this.isWatchlistMenuOpen = false;
      uiManagerInstance.hideSideMenus();
      uiManagerInstance.doSearch('');
      return;
    } else {
      uiManagerInstance.hideSideMenus();
      if (settingsManager.isMobileModeEnabled) {
        uiManagerInstance.searchManager.searchToggle(false);
      }
      slideInRight(getEl('watchlist-menu'), 1000, () => {
        if (!this.isWatchlistMenuOpen) return; // The accounts for clicking the button again before the animation is done
        this.updateWatchlist();
      });
      this.setWatchlistButtonOn_();
      return;
    }
  }

  private openOverlayMenu(timeManager: TimeManager) {
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

    if (
      this.nextPassArray.length === 0 ||
      this.lastSimTimeWhenCalc > timeManager.simulationTimeObj.getTime() ||
      new Date(this.lastSimTimeWhenCalc * 1 + (MILLISECONDS_PER_DAY * this.OVERLAY_CALC_LENGTH_IN_DAYS) / 2).getTime() < timeManager.simulationTimeObj.getTime() ||
      this.isWatchlistChanged ||
      this.lastSensorNameWhenCalc !== sensorManagerInstance.currentSensors[0].name
    ) {
      showLoading(() => {
        this.nextPassArray = [];
        const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

        for (let x = 0; x < this.watchlistList.length; x++) {
          this.nextPassArray.push(catalogManagerInstance.getSat(this.watchlistList[x], GetSatType.EXTRA_ONLY));
        }

        this.nextPassArray = SensorMath.nextpassList(this.nextPassArray, 1, this.OVERLAY_CALC_LENGTH_IN_DAYS);
        this.nextPassArray.sort(function (a: { time: string | number | Date }, b: { time: string | number | Date }) {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        });

        this.lastSimTimeWhenCalc = timeManager.simulationTimeObj.getTime();
        this.lastSensorNameWhenCalc = sensorManagerInstance.currentSensors[0].name;

        this.lastOverlayUpdateTime = 0;
        this.updateNextPassOverlay_(true);
        this.isWatchlistChanged = false;
      });
    } else {
      this.updateNextPassOverlay_();
    }

    slideInRight(getEl('info-overlay-menu'), 100, () => {
      getEl('info-overlay-menu').style.transform = '';
    });
    this.setOverlayButtonOn_();
  }

  private setOverlayButtonOff_() {
    getEl('menu-info-overlay').classList.remove('bmenu-item-selected');
    this.isInfoOverlayMenuOpen = false;
  }

  private setOverlayButtonOn_() {
    getEl('menu-info-overlay').classList.add('bmenu-item-selected');
    this.isInfoOverlayMenuOpen = true;
  }

  private setWatchlistButtonOff_() {
    getEl('menu-watchlist').classList.remove('bmenu-item-selected');
    this.isWatchlistMenuOpen = false;
  }

  private setWatchlistButtonOn_() {
    getEl('menu-watchlist').classList.add('bmenu-item-selected');
    this.isWatchlistMenuOpen = true;
  }

  private updateNextPassOverlay_(isForceUpdate = false) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);

    if (this.nextPassArray.length <= 0 && !this.isInfoOverlayMenuOpen) return;
    // TODO: This should auto update the overlay when the time changes outside the original search window
    // Update once every 10 seconds
    if (
      (Date.now() > this.lastOverlayUpdateTime * 1 + 10000 &&
        catalogManagerInstance.selectedSat === -1 &&
        !mainCameraInstance.isDragging &&
        mainCameraInstance.zoomLevel() < mainCameraInstance.zoomTarget + 0.01 &&
        mainCameraInstance.zoomLevel() > mainCameraInstance.zoomTarget - 0.01) ||
      isForceUpdate
    ) {
      this.infoOverlayDOM = [];
      this.infoOverlayDOM.push('<div>');
      for (let s = 0; s < this.nextPassArray.length; s++) {
        this.pushOverlayElement(catalogManagerInstance, s, timeManagerInstance.simulationTimeObj, this.infoOverlayDOM);
      }
      this.infoOverlayDOM.push('</div>');
      getEl('info-overlay-content').innerHTML = this.infoOverlayDOM.join('');
      this.lastOverlayUpdateTime = timeManagerInstance.realTime;
    }
  }

  // #endregion Private Methods (8)
}

export const watchlistPlugin = new WatchlistPlugin();
