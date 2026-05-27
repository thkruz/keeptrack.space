/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * watchlist.ts is a plugin for creating a list of satellites to actively monitor
 * and display on the globe.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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

import { CameraType } from '@app/engine/camera/camera-type';
import { SoundNames } from '@app/engine/audio/sounds';
import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SensorToSatLine } from '@app/engine/rendering/line-manager/sensor-to-sat-line';
import { clickAndDragWidth } from '@app/engine/utils/click-and-drag';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { SatLabelMode } from '@app/settings/ui-settings';
import { BaseObject, CatalogSource, Satellite } from '@ootk/src/main';
import bookmarkAddPng from '@public/img/icons/bookmark-add.png';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import bookmarksPng from '@public/img/icons/bookmarks.png';
import saveAs from 'file-saver';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { IKeyboardShortcut } from '../../engine/plugins/core/plugin-capabilities';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { EL as SAT_INFO_EL } from '../sat-info-box/sat-info-box-html';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { TopMenu } from '../top-menu/top-menu';

export interface UpdateWatchlistParams {
  updateWatchlistList?: { id: number, inView: boolean }[];
  isSkipSearch?: boolean;
}

export class WatchlistPlugin extends KeepTrackPlugin {
  readonly id = 'WatchlistPlugin';
  dependencies_ = [];

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'W',
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
 return;
}
          this.bottomMenuClicked();
        },
      },
    ];
  }

  bottomIconCallback = () => {
    // The accounts for clicking the button again before the animation is done
    if (!this.isMenuButtonActive) {
      return;
    }

    this.updateWatchlist();
  };

  EL = {
    WATCHLIST_TOGGLE: 'sat-watchlist-toggle',
  };

  bottomIconElementName: string = 'menu-watchlist';
  bottomIconImg = bookmarksPng;

  menuMode: MenuMode[] = [MenuMode.CATALOG, MenuMode.ALL];

  isWatchlistChanged: boolean | null = null;
  sideMenuElementHtml = html`
    <div id="watchlist-menu" class="side-menu-parent start-hidden">
      <div id="watchlist-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Watchlist</h5>
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
                src="" delayedsrc="${bookmarkAddPng}" style="cursor: pointer;"/>
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
  sideMenuTitle = 'Watchlist';

  sideMenuSecondaryHtml = html`
    <div class="switch row">
      <label>
        <input id="watchlist-hide-others" type="checkbox" />
        <span class="lever"></span>
        Hide Other Objects
      </label>
    </div>
    <div class="row" style="margin-bottom: 0;">
      <label style="color: var(--color-dark-text-accent);">Labels</label>
    </div>
    <div class="row" style="margin-top: 5px;">
      <label>
        <input id="watchlist-label-always" name="watchlist-label-mode" type="radio" value="2" />
        <span>Always</span>
      </label>
    </div>
    <div class="row">
      <label>
        <input id="watchlist-label-fov" name="watchlist-label-mode" type="radio" value="1" checked />
        <span>FOV Only</span>
      </label>
    </div>
    <div class="row">
      <label>
        <input id="watchlist-label-off" name="watchlist-label-mode" type="radio" value="0" />
        <span>Off</span>
      </label>
    </div>
  `;

  sideMenuSecondaryOptions = {
    width: 280,
    leftOffset: null,
    zIndex: 3,
  };

  isFilterActive = false;
  watchlistList: { id: number, inView: boolean }[] = [];

  /**
   * Centralized filter state management. Syncs the secondary menu checkbox,
   * the utility panel button, and applies or clears the search filter.
   */
  setFilterActive(active: boolean): void {
    this.isFilterActive = active;

    // Sync secondary menu checkbox
    const hideOthersEl = getEl('watchlist-hide-others') as HTMLInputElement | null;

    if (hideOthersEl) {
      hideOthersEl.checked = active;
    }

    // Sync utility panel button (by element ID to avoid circular imports)
    const filterIconEl = getEl('watchlist-filter-icon');

    if (filterIconEl) {
      if (active) {
        filterIconEl.classList.add('bmenu-item-selected');
      } else {
        filterIconEl.classList.remove('bmenu-item-selected');
      }
    }

    // Apply or clear filter
    if (active && this.watchlistList.length > 0) {
      this.applyWatchlistFilter_();
    } else if (!active) {
      ServiceLocator.getUiManager().doSearch('');
      ServiceLocator.getColorSchemeManager().calculateColorBuffers(true);
    }
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
    EventBus.getInstance().on(EventBusEvent.onCruncherReady, this.onCruncherReady_.bind(this));
    EventBus.getInstance().on(EventBusEvent.satInfoBoxFinal, this.satInfoBoxFinal_.bind(this));

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        if (!settingsManager.isWatchlistTopMenuNotification) {
          return;
        }

        // Optional if top-menu is enabled
        getEl(TopMenu.TOP_RIGHT_ID, true)?.insertAdjacentHTML(
          'afterbegin',
          html`
                <li id="top-menu-watchlist-li" class="hidden">
                  <a id="top-menu-watchlist-btn" class="top-menu-icons">
                    <div class="top-menu-icons bmenu-item-selected">
                      <img id="top-menu-watchlist-btn-icon"
                      src="" delayedsrc="${bookmarksPng}" alt="" />
                    </div>
                  </a>
                </li>
              `,
        );
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        if (!settingsManager.isWatchlistTopMenuNotification) {
          return;
        }

        // Optional if top-menu is enabled
        getEl('top-menu-watchlist-btn', true)?.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

          if (!this.isMenuButtonActive) {
            this.openSideMenu();
            this.setBottomIconToSelected();
            this.bottomIconCallback();
          } else {
            this.setBottomIconToUnselected();
            this.closeSideMenu();
          }
        });
      },
    );
  }

  addJs(): void {
    super.addJs();

    const satInfoBoxPlugin = PluginRegistry.getPlugin(SatInfoBox)!;

    EventBus.getInstance().on(EventBusEvent.satInfoBoxAddListeners, () => {
      getEl(this.EL.WATCHLIST_TOGGLE)?.addEventListener('click', satInfoBoxPlugin.withClickSound(this.addRemoveWatchlist_.bind(this)));
    });

    EventBus.getInstance().on(EventBusEvent.selectSatData, this.selectSatData_.bind(this));
  }

  private satInfoBoxFinal_() {
    getEl(SAT_INFO_EL.NAME)?.insertAdjacentHTML('beforebegin', html`
      <img id="${this.EL.WATCHLIST_TOGGLE}" src="${bookmarkAddPng}" class="sat-watchlist-icon off-watchlist"/>
    `);
  }

  private selectSatData_(obj?: BaseObject) {
    if (!obj) {
      return;
    }

    const toggleEl = getEl(this.EL.WATCHLIST_TOGGLE) as HTMLImageElement | null;

    if (!toggleEl) {
      return;
    }

    if (this.isOnWatchlist(obj.id)) {
      toggleEl.src = bookmarkRemovePng;
      toggleEl.classList.replace('off-watchlist', 'on-watchlist');
    } else {
      toggleEl.src = bookmarkAddPng;
      toggleEl.classList.replace('on-watchlist', 'off-watchlist');
    }
  }

  private addRemoveWatchlist_() {
    const id = PluginRegistry.getPlugin(SelectSatManager)!.selectedSat;

    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    if (this.isOnWatchlist(id)) {
      this.removeSat(id);
    } else {
      this.addSat(id);
    }
  }

  /**
   * Handles the logic when the Cruncher is ready.
   * @returns A promise that resolves to void.
   */
  private async onCruncherReady_(): Promise<void> {
    if (!settingsManager.offlineMode) {
      return;
    }

    let watchlistString = PersistenceManager.getInstance().getItem(StorageKey.WATCHLIST_LIST);

    if (!watchlistString || watchlistString === '[]') {
      try {
        watchlistString = await fetch(`${settingsManager.installDirectory}tle/watchlist.json`).then((response) => response.text());
      } catch {
        watchlistString = null;
      }
    }

    if (watchlistString !== null && watchlistString !== '[]' && watchlistString.length > 0) {
      const newWatchlist = this.createNewWatchlist(watchlistString);

      this.updateWatchlist({ updateWatchlistList: newWatchlist, isSkipSearch: true });
    }
  }

  createNewWatchlist(watchlistString: string): { id: number, inView: boolean }[] {
    let newWatchlist: { id: number, inView: boolean }[];
    // We save it as an array of sccNums
    const savedSatList: string[] = this.unserialize(watchlistString);
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    if (savedSatList.length > 0) {
      // We need to convert it to an array of objects
      newWatchlist = savedSatList.map((sccNum: string) => ({ id: catalogManagerInstance.sccNum2Id(parseInt(sccNum)) ?? -1, inView: false }));
    } else {
      newWatchlist = [];
    }

    for (const obj of newWatchlist) {
      const sat = catalogManagerInstance.getObject(obj.id, GetSatType.EXTRA_ONLY);

      if (sat !== null) {
        obj.id = sat.id;
        obj.inView = false;
      } else {
        errorManagerInstance.warn('List File Format Incorrect');

        return [];
      }
    }
    if (newWatchlist.length > 0) {
      ServiceLocator.getUiManager().toast(`Watchlist Loaded with ${newWatchlist.length} Satellites`, ToastMsgType.normal);
    }

    return newWatchlist;
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

    const inputFiles = (<HTMLInputElement>evt.target).files ?? [];

    if (inputFiles[0]) {
      reader.readAsText(inputFiles[0]);
    }
    evt.preventDefault();
  }

  /**
   * Initializes the UI manager for the watchlist feature.
   * Attaches event listeners to various elements in the watchlist menu.
   */
  private uiManagerFinal_(): void {
    clickAndDragWidth(getEl('watchlist-menu'));

    // Secondary menu: Hide non-watchlist objects toggle
    getEl('watchlist-hide-others')?.addEventListener('change', () => {
      const isChecked = (<HTMLInputElement>getEl('watchlist-hide-others')).checked;

      this.setFilterActive(isChecked);
    });

    // Secondary menu: Label mode radio buttons
    this.syncLabelRadios_();

    getEl('watchlist-label-always')?.addEventListener('change', () => {
      settingsManager.satLabelMode = SatLabelMode.ALL;
    });
    getEl('watchlist-label-fov')?.addEventListener('change', () => {
      settingsManager.satLabelMode = SatLabelMode.FOV_ONLY;
    });
    getEl('watchlist-label-off')?.addEventListener('change', () => {
      settingsManager.satLabelMode = SatLabelMode.OFF;
    });

    // Add button selected on watchlist menu
    getEl('watchlist-add')?.addEventListener('click', () => {
      this.onAddEvent_();
    });
    // Enter pressed/selected on watchlist menu
    getEl('watchlist-content')?.addEventListener('submit', (evt: Event) => {
      evt.preventDefault();
      this.onAddEvent_();
    });

    // Remove button selected on watchlist menu
    getEl('watchlist-list')?.addEventListener('click', (evt: Event) => {
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      if ((<HTMLElement>evt.target).classList.contains('sat-name')) {
        const satName = (<HTMLElement>evt.target).dataset.satName;

        if (satName) {
          this.selectSat(parseInt(satName, 10));
        } else {
          errorManagerInstance.debug('sat-name is null');
        }
      } else if ((<HTMLElement>evt.target).classList.contains('watchlist-remove')) {
        const satId = (<HTMLElement>evt.target).dataset.satId;

        if (satId) {
          this.removeSat(parseInt(satId, 10));
        } else {
          errorManagerInstance.debug('sat-id is null');
        }
      }
    });

    if (this.watchlistList.length > 0) {
      showEl('top-menu-watchlist-li');
    } else {
      hideEl('top-menu-watchlist-li');
    }

    getEl('watchlist-save')?.addEventListener('click', (evt: Event) => {
      this.onSaveClicked_(evt);
    });

    getEl('watchlist-clear')?.addEventListener('click', () => {
      this.onClearClicked_();
    });

    getEl('watchlist-open')?.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
      getEl('watchlist-file')?.click();
    });

    getEl('watchlist-file')?.addEventListener('change', (evt: Event) => {
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
    if (typeof updateWatchlistList !== 'undefined') {
      this.watchlistList = updateWatchlistList;
    }

    if (!this.watchlistList) {
      return;
    }
    this.isWatchlistChanged = this.isWatchlistChanged !== null;
    let watchlistString = '';
    let watchlistListHTML = '';
    let sat: Satellite | null;
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    for (let i = 0; i < this.watchlistList.length; i++) {
      sat = catalogManagerInstance.getSat(this.watchlistList[i].id, GetSatType.EXTRA_ONLY);
      if (sat === null) {
        this.watchlistList.splice(i, 1);
      } else {
        watchlistListHTML += `
        <div class="row">
          <div class="col s3 m3 l3">
             <span class="sat-sccnum" data-sat-sccnum="${sat.id}" style="cursor: pointer;">${sat.sccNum}</span>
          </div>
          <div class="col s7 m7 l7">
             <span class="sat-name" data-sat-name="${sat.id || 'Unknown'}" style="cursor: pointer;">${sat.name || 'Unknown'}</span>
          </div>
          <div class="col s2 m2 l2 center-align remove-icon">
            <img class="watchlist-remove" data-sat-id="${sat.id}" src="${bookmarkRemovePng}" style="cursor: pointer;"></img>
          </div>
        </div>`;
      }
    }

    const watchlistElement = getEl('watchlist-list');

    if (watchlistElement) {
      watchlistElement.innerHTML = watchlistListHTML;
    }

    EventBus.getInstance().emit(EventBusEvent.onWatchlistUpdated, this.watchlistList);

    for (let i = 0; i < this.watchlistList.length; i++) {
      // No duplicates
      watchlistString += catalogManagerInstance.getSat(this.watchlistList[i].id, GetSatType.EXTRA_ONLY)?.sccNum ?? '';
      if (i !== this.watchlistList.length - 1) {
        watchlistString += ',';
      }
    }

    if (this.watchlistList.length > 0) {
      showEl('top-menu-watchlist-li');
    } else {
      hideEl('top-menu-watchlist-li');
    }

    if (!isSkipSearch || this.isFilterActive) {
      ServiceLocator.getUiManager().doSearch(watchlistString, true);
    }
    const colorSchemeManager = ServiceLocator.getColorSchemeManager();

    colorSchemeManager.calculateColorBuffers(true); // force color recalc

    if (settingsManager.offlineMode) {
      PersistenceManager.getInstance().saveItem(StorageKey.WATCHLIST_LIST, this.serialize());
    }
  }

  selectSat(id: number) {
    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

    selectSatManagerInstance?.selectSat(id);
  }

  /**
   * Removes the satellite with the specified id from the watchlist.
   */
  removeSat(id: number) {
    const idxMatch = this.watchlistList.findIndex(({ id: id_ }) => id === id_);

    if (idxMatch === -1) {
      return;
    }

    ServiceLocator.getOrbitManager().removeInViewOrbit(this.watchlistList[idxMatch].id);
    this.watchlistList.splice(idxMatch, 1);

    ServiceLocator.getLineManager().lines.forEach((line) => {
      if (line instanceof SensorToSatLine && line.sat.id === id) {
        line.isGarbage = true;
      }
    });

    this.updateWatchlist();
    EventBus.getInstance().emit(EventBusEvent.onWatchlistRemove, this.watchlistList);

    const uiManagerInstance = ServiceLocator.getUiManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    if (this.watchlistList.length <= 0) {
      if (this.isFilterActive) {
        this.setFilterActive(false);
      } else {
        uiManagerInstance.doSearch('');
        colorSchemeManagerInstance.calculateColorBuffers(true);
      }
    }
  }

  addSat(id: number, isMultiAdd = false) {
    const isDuplicate = this.watchlistList.some(({ id: id_ }) => id_ === id);

    if (!isDuplicate) {
      this.watchlistList.push({ id, inView: false });
    } else {
      const sat = ServiceLocator.getCatalogManager().getSat(id);

      if (sat?.sccNum) {
        errorManagerInstance.warnToast(`NORAD: ${sat.sccNum} already in list!`);
      } else if (sat) {
        const jscString = sat.source === CatalogSource.VIMPEL ? ` (JSC Vimpel ${sat.altId})` : '';

        errorManagerInstance.warnToast(`Object ${id}${jscString} already in list!`);
      }
    }

    if (!isMultiAdd) {
      this.watchlistList.sort(({ id: a }, { id: b }) => {
        const satA = ServiceLocator.getCatalogManager().getSat(a);
        const satB = ServiceLocator.getCatalogManager().getSat(b);

        if (satA === null || satB === null) {
          return 0;
        }

        return satA.sccNum.localeCompare(satB.sccNum, 'en', { numeric: true });
      });
      this.updateWatchlist();
      EventBus.getInstance().emit(EventBusEvent.onWatchlistAdd, this.watchlistList);
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

  protected syncLabelRadios_(): void {
    const mode = settingsManager.satLabelMode.toString();
    const always = getEl('watchlist-label-always') as HTMLInputElement | null;
    const fov = getEl('watchlist-label-fov') as HTMLInputElement | null;
    const off = getEl('watchlist-label-off') as HTMLInputElement | null;

    if (always) {
      always.checked = mode === '2';
    }
    if (fov) {
      fov.checked = mode === '1';
    }
    if (off) {
      off.checked = mode === '0';
    }
  }

  private applyWatchlistFilter_(): void {
    if (this.watchlistList.length === 0) {
      return;
    }

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const uiManagerInstance = ServiceLocator.getUiManager();
    const searchString = this.watchlistList
      .map(({ id }) => catalogManagerInstance.getSat(id, GetSatType.EXTRA_ONLY)?.sccNum)
      .filter(Boolean)
      .join(',');

    uiManagerInstance.doSearch(searchString, true);

    // doSearch(str, true) skips fillResultBox which normally sets isResultsOpen.
    // Without it, getCurrentSearch() returns '' and preValidateColorScheme_
    // clears isUseGroupColorScheme on every calculateColorBuffers call.
    uiManagerInstance.searchManager.isResultsOpen = true;
    ServiceLocator.getColorSchemeManager().calculateColorBuffers(true);
  }

  /**
   * Handles the event when a new satellite is added to the watchlist.
   */
  private onAddEvent_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    const sats = (<HTMLInputElement>getEl('watchlist-new')).value.split(/[\s,]+/u);

    sats.forEach((satNum: string) => {
      const id = ServiceLocator.getCatalogManager().sccNum2Id(parseInt(satNum)) ?? -1;

      if (id === -1) {
        errorManagerInstance.warnToast(`Sat ${satNum} not found!`);

        return;
      }
      this.addSat(id, true);
    });

    this.watchlistList.sort(({ id: a }, { id: b }) => {
      const satA = ServiceLocator.getCatalogManager().getSat(a);
      const satB = ServiceLocator.getCatalogManager().getSat(b);

      if (satA === null || satB === null) {
        return 0;
      }

      return satA.sccNum.localeCompare(satB.sccNum, 'en', { numeric: true });
    });
    this.updateWatchlist();
    (<HTMLInputElement>getEl('watchlist-new')).value = ''; // Clear the search box after enter pressed/selected
  }

  /**
   * Handles the click event when the "Clear" button is clicked.
   * Removes the satellites from the watchlist and clears the lines from sensors to satellites.
   */
  private onClearClicked_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    this.clear();
  }

  clear() {
    const wasFilterActive = this.isFilterActive;

    // Reset filter state and sync UI before clearing list
    if (wasFilterActive) {
      this.setFilterActive(false);
    }

    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    for (const obj of this.watchlistList) {
      orbitManagerInstance.removeInViewOrbit(obj.id);
    }

    ServiceLocator.getLineManager().lines.forEach((line) => {
      if (line instanceof SensorToSatLine) {
        line.isGarbage = true;
      }
    });

    this.updateWatchlist({ updateWatchlistList: [], isSkipSearch: true });
  }

  /**
   * Handles the event when the FileReader finishes loading a file.
   * @param evt - The ProgressEvent<FileReader> object.
   */
  private onReaderLoad_(evt: ProgressEvent<FileReader>) {
    const target = evt.target;

    if (!target) {
      errorManagerInstance.error(new Error('target is null'), 'watchlist.ts', 'Error reading list!');

      return;
    }

    if (target.readyState !== 2) {
      return;
    }

    if (evt.target.error) {
      errorManagerInstance.error(evt.target.error, 'watchlist.ts', 'Error reading list!');

      return;
    }

    let newWatchlist: { id: string, inView: boolean }[];

    try {
      // We save it as an array of sccNums
      const savedSatList: string[] = this.unserialize(<string>evt.target.result);

      if (savedSatList.length > 0) {
        // We need to convert it to an array of objects
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        newWatchlist = savedSatList.map((sccNum: string) => ({ id: String(catalogManagerInstance.sccNum2Id(parseInt(sccNum)) ?? '-1'), inView: false }));
      } else {
        newWatchlist = [];
      }
    } catch {
      errorManagerInstance.warn('List File Format Incorrect');

      return;
    }

    if (newWatchlist.length === 0) {
      errorManagerInstance.warn('List File Format Incorrect');

      return;
    }

    this.watchlistList = [];
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    for (const obj of newWatchlist) {
      const sat = catalogManagerInstance.getObject(obj.id, GetSatType.EXTRA_ONLY);

      if (sat !== null && sat.id !== -1) {
        this.watchlistList.push({ id: sat.id, inView: false });
      } else {
        errorManagerInstance.warnToast(`Sat ${obj.id} not found!`);
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
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    const watchlistString = this.serialize();
    const blob = new Blob([watchlistString], {
      type: 'text/plain;charset=utf-8',
    });

    try {
      saveAs(blob, 'watchlist.json');
    } catch (e) {
      if (!isThisNode()) {
        errorManagerInstance.error(e, 'watchlist.ts', 'Error saving list!');
      }
    }
    evt.preventDefault();
  }

  serialize() {
    const satIds: string[] = [];

    this.watchlistList = this.watchlistList.filter(({ id }) => {
      const sat = ServiceLocator.getCatalogManager().getSat(id, GetSatType.EXTRA_ONLY);

      return sat !== null;
    });

    for (let i = 0; i < this.watchlistList.length; i++) {
      const sat = ServiceLocator.getCatalogManager().getSat(this.watchlistList[i].id, GetSatType.EXTRA_ONLY);

      if (sat === null) {
        errorManagerInstance.warnToast(`Sat ${this.watchlistList[i].id} not found!`);

        continue;
      }
      satIds[i] = sat.sccNum;
    }
    const watchlistString = JSON.stringify(satIds);


    return watchlistString;
  }

  unserialize(watchlistString: string): string[] {
    try {
      const savedSatList: string[] = JSON.parse(watchlistString);


      return savedSatList;
    } catch {
      errorManagerInstance.warn('List File Format Incorrect');

      return [];
    }
  }
}
