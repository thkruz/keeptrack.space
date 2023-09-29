/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * watchlist.ts is a plugin for creating a list of satellites to actively monitor
 * and display on the globe.
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
import watchlistPng from '@app/img/icons/watchlist.png';
import removePng from '@app/img/remove.png';
import { GetSatType, SatObject } from '@app/js/interfaces';
import { KeepTrackApiMethods, isThisNode, keepTrackApi } from '@app/js/keepTrackApi';
import { clickAndDragWidth } from '@app/js/lib/click-and-drag';
import { getEl } from '@app/js/lib/get-el';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import saveAs from 'file-saver';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { StandardColorSchemeManager } from '@app/js/singletons/color-scheme-manager';

export class WatchlistPlugin extends KeepTrackPlugin {
  static PLUGIN_NAME = 'watchlist';

  bottomIconCallback = () => {
    // The accounts for clicking the button again before the animation is done
    if (!this.isMenuButtonEnabled) {
      return;
    }

    this.updateWatchlist();
  };

  bottomIconElementName: string = 'menu-watchlist';
  bottomIconImg = watchlistPng;
  bottomIconLabel = 'Watchlist';
  helpBody = keepTrackApi.html`
  The Watchlist menu allows you to create a list of priority satellites to track.
  This allows you to quickly retrieve the satellites you are most interested in.
  The list is saved in your browser's local storage and will be available the next time you visit the site.
  <br><br>
  When satellites on the watchlist enter the selected sensor's field of view a notification will be displayed, a line will be drawn from the sensor to the satellite, and the satellite's number will be displayed on the globe.
  <br><br>
  The overlay feature relies on the watchlist being populated.`;

  helpTitle = `Watchlist Menu`;
  isWatchlistChanged: boolean = null;
  sideMenuElementHtml = keepTrackApi.html`
    <div id="watchlist-menu" class="side-menu-parent start-hidden text-select">
      <div id="watchlist-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Satellite Watchlist</h5>
          <div id="watchlist-list">
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
                src="" delayedsrc="${addPng}" style="cursor: pointer;"/>
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
    </div>`;

  sideMenuElementName: string = 'watchlist-menu';
  watchlistInViewList: boolean[] = [];
  /** List of ids (not scc numbers) */
  watchlistList: number[] = [];

  constructor() {
    super(WatchlistPlugin.PLUGIN_NAME);
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: this.uiManagerFinal_.bind(this),
    });

    keepTrackApi.register({
      method: KeepTrackApiMethods.onCruncherReady,
      cbName: this.PLUGIN_NAME,
      cb: this.onCruncherReady_.bind(this),
    });
  }

  /**
   * Handles the logic when the Cruncher is ready.
   * @returns A promise that resolves to void.
   */
  private async onCruncherReady_(): Promise<void> {
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
      const catalogManagerInstance = keepTrackApi.getCatalogManager();
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
      }

      this.updateWatchlist(newWatchlist, _watchlistInViewList, true);
    }
  }

  /**
   * Handles the event when a file is changed.
   * @param evt - The event object.
   * @throws {Error} If `evt` is null.
   */
  private onFileChanged_(evt: Event) {
    if (evt === null) throw new Error('evt is null');
    if (!window.FileReader) return; // Browser is not compatible

    const reader = new FileReader();

    reader.onload = (e) => {
      this.onReaderLoad_(e);
    };
    reader.readAsText((<HTMLInputElement>evt.target).files[0]);
    evt.preventDefault();
  }

  /**
   * Initializes the UI manager for the watchlist feature.
   * Attaches event listeners to various elements in the watchlist menu.
   */
  private uiManagerFinal_(): void {
    clickAndDragWidth(getEl('watchlist-menu'));

    // Add button selected on watchlist menu
    getEl('watchlist-add').addEventListener('click', () => {
      this.onAddEvent_();
    });
    // Enter pressed/selected on watchlist menu
    getEl('watchlist-content').addEventListener('submit', (evt: Event) => {
      evt.preventDefault();
      this.onAddEvent_();
    });

    // Remove button selected on watchlist menu
    getEl('watchlist-list').addEventListener('click', (evt: Event) => {
      this.onRemoveClicked(parseInt((<HTMLElement>evt.target).dataset.satId));
    });

    getEl('watchlist-save').addEventListener('click', (evt: Event) => {
      this.onSaveClicked_(evt);
    });

    getEl('watchlist-clear').addEventListener('click', () => {
      this.onClearClicked_();
    });

    getEl('watchlist-open').addEventListener('click', () => {
      getEl('watchlist-file').click();
    });

    getEl('watchlist-file').addEventListener('change', (evt: Event) => {
      this.onFileChanged_(evt);

      // Reset file input
      (<HTMLInputElement>document.getElementById('watchlist-file')).value = '';
    });
  }

  /**
   * Updates the watchlist with the provided parameters.
   * @param updateWatchlistList - An optional array of numbers representing the updated watchlist.
   * @param updateWatchlistInViewList - An optional array of booleans indicating whether each item in the watchlist should be displayed.
   * @param isSkipSearch - A boolean indicating whether to skip the search operation.
   */
  updateWatchlist(updateWatchlistList?: number[], updateWatchlistInViewList?: boolean[], isSkipSearch = false) {
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
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
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
            <img class="watchlist-remove" data-sat-id="${sat.id}" src="${removePng}" style="cursor: pointer;"></img>
          </div>
        </div>`;
      }
    }
    getEl('watchlist-list').innerHTML = watchlistListHTML;

    keepTrackApi.methods.onWatchlistUpdated(this.watchlistList);

    for (let i = 0; i < this.watchlistList.length; i++) {
      // No duplicates
      watchlistString += catalogManagerInstance.getSat(this.watchlistList[i], GetSatType.EXTRA_ONLY).sccNum;
      if (i !== this.watchlistList.length - 1) watchlistString += ',';
    }

    if (!isSkipSearch) keepTrackApi.getUiManager().doSearch(watchlistString, true);
    keepTrackApi.getColorSchemeManager().setColorScheme(settingsManager.currentColorScheme, true); // force color recalc

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

  /**
   * Handles the click event when the remove button is clicked.
   * Removes the satellite with the specified ID from the watchlist.
   *
   * @param satId - The NORAD ID of the satellite to remove.
   */
  private onRemoveClicked(satId: number): void {
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = <StandardColorSchemeManager>(<unknown>keepTrackApi.getColorSchemeManager());

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
  }

  /**
   * Handles the event when a new satellite is added to the watchlist.
   */
  private onAddEvent_() {
    const sats = (<HTMLInputElement>getEl('watchlist-new')).value.split(',');
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    sats.forEach((satNum: string) => {
      const satId = catalogManagerInstance.getIdFromObjNum(parseInt(satNum));

      if (satId === null) {
        errorManagerInstance.warn(`Sat ${satNum} not found!`);
        return;
      }

      const isDuplicate = this.watchlistList.some((satId_: number) => satId_ === satId);
      if (!isDuplicate) {
        this.watchlistList.push(satId);
        this.watchlistInViewList.push(false);
      } else {
        errorManagerInstance.warn(`Sat ${satNum} already in watchlist!`);
      }
    });

    this.watchlistList.sort((a: number, b: number) => {
      const satA = catalogManagerInstance.getSat(a);
      const satB = catalogManagerInstance.getSat(b);
      if (satA === null || satB === null) return 0;
      return parseInt(satA.sccNum) - parseInt(satB.sccNum);
    });

    this.updateWatchlist();
    (<HTMLInputElement>getEl('watchlist-new')).value = ''; // Clear the search box after enter pressed/selected
  }

  /**
   * Handles the click event when the "Clear" button is clicked.
   * Removes the satellites from the watchlist and clears the lines from sensors to satellites.
   */
  private onClearClicked_() {
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    for (const id of this.watchlistList) {
      orbitManagerInstance.removeInViewOrbit(id);
    }
    // TODO: Clear lines from sensors to satellites
    this.updateWatchlist([], [], true);
  }

  /**
   * Handles the event when the FileReader finishes loading a file.
   * @param evt - The ProgressEvent<FileReader> object.
   */
  private onReaderLoad_(evt: ProgressEvent<FileReader>) {
    if (evt.target.readyState !== 2) return;

    if (evt.target.error) {
      errorManagerInstance.error(evt.target.error, 'watchlist.ts', 'Error reading watchlist!');
      return;
    }

    let newWatchlist: number[];
    try {
      newWatchlist = JSON.parse(<string>evt.target.result);
    } catch {
      errorManagerInstance.warn('Watchlist File Format Incorret');
      return;
    }

    if (newWatchlist.length === 0) {
      errorManagerInstance.warn('Watchlist File Format Incorret');
      return;
    }

    this.watchlistInViewList = [];
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    for (let i = 0; i < newWatchlist.length; i++) {
      const sat = catalogManagerInstance.getSat(catalogManagerInstance.getIdFromObjNum(newWatchlist[i]), GetSatType.EXTRA_ONLY);
      if (sat !== null && sat.id > 0) {
        newWatchlist[i] = sat.id;
        this.watchlistInViewList.push(false);
      } else {
        errorManagerInstance.warn(`Sat ${newWatchlist[i]} not found!`);
      }
    }
    this.watchlistList = newWatchlist;
    this.updateWatchlist();
  }

  /**
   * Handles the click event when the save button is clicked.
   * Serializes the watchlist and saves it as a JSON file.
   * @param evt - The click event object.
   */
  private onSaveClicked_(evt: Event) {
    const satIds = [];

    for (let i = 0; i < this.watchlistList.length; i++) {
      const sat = keepTrackApi.getCatalogManager().getSat(this.watchlistList[i], GetSatType.EXTRA_ONLY);
      satIds[i] = sat.sccNum;
    }
    const watchlistString = JSON.stringify(satIds);
    const blob = new Blob([watchlistString], {
      type: 'text/plain;charset=utf-8',
    });
    try {
      saveAs(blob, 'watchlist.json');
    } catch (e) {
      if (!isThisNode()) {
        errorManagerInstance.error(e, 'watchlist.ts', 'Error saving watchlist!');
      }
    }
    evt.preventDefault();
  }
}

export const watchlistPlugin = new WatchlistPlugin();
