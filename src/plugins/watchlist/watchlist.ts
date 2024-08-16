/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * watchlist.ts is a plugin for creating a list of satellites to actively monitor
 * and display on the globe.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2024 Theodore Kruczek
 * @Copyright (C) 2020-2024 Heather Kruczek
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

import { GetSatType, KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { clickAndDragWidth } from '@app/lib/click-and-drag';
import { getEl } from '@app/lib/get-el';
import { SensorToSatLine } from '@app/singletons/draw-manager/line-manager/sensor-to-sat-line';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { isThisNode } from '@app/static/isThisNode';
import addPng from '@public/img/icons/add.png';
import removePng from '@public/img/icons/remove.png';
import watchlistPng from '@public/img/icons/watchlist.png';
import saveAs from 'file-saver';
import { CatalogSource, DetailedSatellite } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SoundNames } from '../sounds/SoundNames';

interface UpdateWatchlistParams {
  updateWatchlistList?: { id: number, inView: boolean }[];
  isSkipSearch?: boolean;
}

export class WatchlistPlugin extends KeepTrackPlugin {
  protected dependencies_: string[];
  bottomIconCallback = () => {
    // The accounts for clicking the button again before the animation is done
    if (!this.isMenuButtonActive) {
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

  helpTitle = 'Watchlist Menu';
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
  watchlistList: { id: number, inView: boolean }[] = [];

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.constructor.name,
      cb: this.uiManagerFinal_.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherReady,
      cbName: this.constructor.name,
      cb: this.onCruncherReady_.bind(this),
    });
  }

  /**
   * Handles the logic when the Cruncher is ready.
   * @returns A promise that resolves to void.
   */
  private async onCruncherReady_(): Promise<void> {
    let watchlistString = PersistenceManager.getInstance().getItem(StorageKey.WATCHLIST_LIST);

    if (!watchlistString || watchlistString === '[]') {
      try {
        watchlistString = await fetch(`${settingsManager.installDirectory}tle/watchlist.json`).then((response) => response.text());
      } catch {
        watchlistString = null;
      }
    }
    if (watchlistString !== null && watchlistString !== '[]' && watchlistString.length > 0) {
      let newWatchlist: { id: number, inView: boolean }[];
      // We save it as an array of sccNums
      const savedSatList: string[] = JSON.parse(watchlistString);

      if (savedSatList.length > 0) {
        // We need to convert it to an array of objects
        newWatchlist = savedSatList.map((sccNum: string) => ({ id: parseInt(sccNum), inView: false }));
      } else {
        newWatchlist = [];
      }

      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      for (const obj of newWatchlist) {
        const sat = catalogManagerInstance.getObject(catalogManagerInstance.sccNum2Id(obj.id), GetSatType.EXTRA_ONLY);

        if (sat !== null) {
          obj.id = sat.id;
          obj.inView = false;
        } else {
          errorManagerInstance.warn('Watchlist File Format Incorret');

          return;
        }
      }
      if (newWatchlist.length > 0) {
        keepTrackApi.getUiManager().toast(`Watchlist Loaded with ${newWatchlist.length} Satellites`, ToastMsgType.normal);
      }

      this.updateWatchlist({ updateWatchlistList: newWatchlist, isSkipSearch: true });
    }
  }

  /**
   * Handles the event when a file is changed.
   * @param evt - The event object.
   * @throws {Error} If `evt` is null.
   */
  private onFileChanged_(evt: Event) {
    if (evt === null) {
      throw new Error('evt is null');
    }
    if (!window.FileReader) {
      return;
    } // Browser is not compatible

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
      keepTrackApi.getSoundManager().play(SoundNames.CLICK);
      this.removeSat(parseInt((<HTMLElement>evt.target).dataset.satId));
    });

    getEl('watchlist-save').addEventListener('click', (evt: Event) => {
      this.onSaveClicked_(evt);
    });

    getEl('watchlist-clear').addEventListener('click', () => {
      this.onClearClicked_();
    });

    getEl('watchlist-open').addEventListener('click', () => {
      keepTrackApi.getSoundManager().play(SoundNames.MENU_BUTTON);
      getEl('watchlist-file').click();
    });

    getEl('watchlist-file').addEventListener('change', (evt: Event) => {
      this.onFileChanged_(evt);

      // Reset file input
      (<HTMLInputElement>getEl('watchlist-file')).value = '';
    });
  }

  /**
   * Updates the watchlist with the provided parameters.
   * @param updateWatchlistList - An optional array of numbers representing the updated watchlist.
   * @param updateWatchlistInViewList - An optional array of booleans indicating whether each item in the watchlist should be displayed.
   * @param isSkipSearch - A boolean indicating whether to skip the search operation.
   */
  updateWatchlist({ updateWatchlistList, isSkipSearch = false }: UpdateWatchlistParams = {}) {
    const settingsManager: any = window.settingsManager;

    if (typeof updateWatchlistList !== 'undefined') {
      this.watchlistList = updateWatchlistList;
    }

    if (!this.watchlistList) {
      return;
    }
    settingsManager.isThemesNeeded = true;
    this.isWatchlistChanged = this.isWatchlistChanged != null;
    let watchlistString = '';
    let watchlistListHTML = '';
    let sat: DetailedSatellite;
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    for (let i = 0; i < this.watchlistList.length; i++) {
      sat = catalogManagerInstance.getSat(this.watchlistList[i].id, GetSatType.EXTRA_ONLY);
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

    keepTrackApi.runEvent(KeepTrackApiEvents.onWatchlistUpdated, this.watchlistList);

    for (let i = 0; i < this.watchlistList.length; i++) {
      // No duplicates
      watchlistString += catalogManagerInstance.getSat(this.watchlistList[i].id, GetSatType.EXTRA_ONLY).sccNum;
      if (i !== this.watchlistList.length - 1) {
        watchlistString += ',';
      }
    }

    if (!isSkipSearch) {
      keepTrackApi.getUiManager().doSearch(watchlistString, true);
    }
    keepTrackApi.getColorSchemeManager().setColorScheme(settingsManager.currentColorScheme, true); // force color recalc

    const saveWatchlist = [];

    for (let i = 0; i < this.watchlistList.length; i++) {
      sat = catalogManagerInstance.getSat(this.watchlistList[i].id, GetSatType.EXTRA_ONLY);
      saveWatchlist[i] = sat.sccNum;
    }

    PersistenceManager.getInstance().saveItem(StorageKey.WATCHLIST_LIST, JSON.stringify(saveWatchlist));
  }

  /**
   * Removes the satellite with the specified id from the watchlist.
   */
  removeSat(id: number) {
    const idxMatch = this.watchlistList.findIndex(({ id: id_ }) => id === id_);

    if (idxMatch === -1) {
      return;
    }

    keepTrackApi.getOrbitManager().removeInViewOrbit(this.watchlistList[idxMatch].id);
    this.watchlistList.splice(idxMatch, 1);

    keepTrackApi.getLineManager().lines.forEach((line) => {
      if (line instanceof SensorToSatLine && line.sat.id === id) {
        line.isGarbage = true;
      }
    });

    this.updateWatchlist();

    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    if (this.watchlistList.length <= 0) {
      uiManagerInstance.doSearch('');
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
      uiManagerInstance.colorSchemeChangeAlert(settingsManager.currentColorScheme);
    }
  }

  addSat(id: number, isMultiAdd = false) {
    const isDuplicate = this.watchlistList.some(({ id: id_ }) => id_ === id);

    if (!isDuplicate) {
      this.watchlistList.push({ id, inView: false });
    } else {
      const sat = keepTrackApi.getCatalogManager().getSat(id);

      if (sat.sccNum) {
        errorManagerInstance.warn(`NORAD: ${sat.sccNum} already in watchlist!`, true);
      } else {
        const jscString = sat.source === CatalogSource.VIMPEL ? ` (JSC Vimpel ${sat.altId})` : '';

        errorManagerInstance.warn(`Object ${id}${jscString} already in watchlist!`, true);
      }
    }

    if (!isMultiAdd) {
      this.watchlistList.sort(({ id: a }, { id: b }) => {
        const satA = keepTrackApi.getCatalogManager().getSat(a);
        const satB = keepTrackApi.getCatalogManager().getSat(b);

        if (satA === null || satB === null) {
          return 0;
        }

        return parseInt(satA.sccNum) - parseInt(satB.sccNum);
      });
      this.updateWatchlist();
    }
  }

  isOnWatchlist(id: number) {
    if (id === null) {
      return false;
    }

    return this.watchlistList.some(({ id: id_ }) => id_ === id);
  }

  getSatellites() {
    return this.watchlistList.map(({
      id,
    }) => id);
  }

  hasAnyInView() {
    return this.watchlistList.some(({ inView }) => inView);
  }

  /**
   * Handles the event when a new satellite is added to the watchlist.
   */
  private onAddEvent_() {
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);
    const sats = (<HTMLInputElement>getEl('watchlist-new')).value.split(',');

    sats.forEach((satNum: string) => {
      const id = keepTrackApi.getCatalogManager().sccNum2Id(parseInt(satNum));

      if (id === null) {
        errorManagerInstance.warn(`Sat ${id} not found!`, true);

        return;
      }
      this.addSat(id, true);
    });

    this.watchlistList.sort(({ id: a }, { id: b }) => {
      const satA = keepTrackApi.getCatalogManager().getSat(a);
      const satB = keepTrackApi.getCatalogManager().getSat(b);

      if (satA === null || satB === null) {
        return 0;
      }

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
    keepTrackApi.getSoundManager().play(SoundNames.MENU_BUTTON);
    const orbitManagerInstance = keepTrackApi.getOrbitManager();

    for (const obj of this.watchlistList) {
      orbitManagerInstance.removeInViewOrbit(obj.id);
    }
    // TODO: Clear lines from sensors to satellites
    this.updateWatchlist({ updateWatchlistList: [], isSkipSearch: true });
  }

  /**
   * Handles the event when the FileReader finishes loading a file.
   * @param evt - The ProgressEvent<FileReader> object.
   */
  private onReaderLoad_(evt: ProgressEvent<FileReader>) {
    if (evt.target.readyState !== 2) {
      return;
    }

    if (evt.target.error) {
      errorManagerInstance.error(evt.target.error, 'watchlist.ts', 'Error reading watchlist!');

      return;
    }

    let newWatchlist: { id: number, inView: boolean }[];

    try {
      // We save it as an array of sccNums
      const savedSatList: string[] = JSON.parse(<string>evt.target.result);

      if (savedSatList.length > 0) {
        // We need to convert it to an array of objects
        newWatchlist = savedSatList.map((sccNum: string) => ({ id: parseInt(sccNum), inView: false }));
      } else {
        newWatchlist = [];
      }
    } catch {
      errorManagerInstance.warn('Watchlist File Format Incorret');

      return;
    }

    if (newWatchlist.length === 0) {
      errorManagerInstance.warn('Watchlist File Format Incorret');

      return;
    }

    this.watchlistList = [];
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    for (const obj of newWatchlist) {
      const sat = catalogManagerInstance.getObject(catalogManagerInstance.sccNum2Id(obj.id), GetSatType.EXTRA_ONLY);

      if (sat !== null && sat.id > 0) {
        this.watchlistList.push({ id: sat.id, inView: false });
      } else {
        errorManagerInstance.warn(`Sat ${obj} not found!`, true);
      }
    }
    this.updateWatchlist();
  }

  /**
   * Handles the click event when the save button is clicked.
   * Serializes the watchlist and saves it as a JSON file.
   * @param evt - The click event object.
   */
  private onSaveClicked_(evt: Event) {
    keepTrackApi.getSoundManager().play(SoundNames.MENU_BUTTON);
    const satIds = [];

    for (let i = 0; i < this.watchlistList.length; i++) {
      const sat = keepTrackApi.getCatalogManager().getSat(this.watchlistList[i].id, GetSatType.EXTRA_ONLY);

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
