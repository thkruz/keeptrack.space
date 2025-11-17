/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satellite-lists.ts is a plugin for creating and maintaining multiple named
 * lists of satellites to actively monitor and display on the globe.
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
import { BaseObject, CatalogSource, DetailedSatellite } from '@ootk/src/main';
import bookmarkAddPng from '@public/img/icons/bookmark-add.png';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import bookmarksPng from '@public/img/icons/bookmarks.png';
import saveAs from 'file-saver';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { EL as SAT_INFO_EL } from '../sat-info-box/sat-info-box-html';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import { TopMenu } from '../top-menu/top-menu';

interface SatelliteList {
  name: string;
  satellites: { id: number; inView: boolean }[];
}

interface SatelliteListsCollection {
  version: string;
  lists: {
    name: string;
    sccNums: string[];
  }[];
}

export class SatelliteListsPlugin extends KeepTrackPlugin {
  readonly id = 'SatelliteListsPlugin';
  dependencies_ = [];

  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      return;
    }

    this.updateCurrentListDisplay();
  };

  EL = {
    ADD_TO_LIST: 'sat-add-to-list',
    REMOVE_FROM_LIST: 'sat-remove-from-list',
  };

  bottomIconElementName: string = 'menu-satellite-lists';
  bottomIconImg = bookmarksPng;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  // Store all lists
  lists: SatelliteList[] = [];
  currentListIndex = 0;

  sideMenuElementHtml = html`
    <div id="satellite-lists-menu" class="side-menu-parent start-hidden text-select">
      <div id="satellite-lists-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Satellite Lists</h5>

          <!-- List Selection -->
          <div class="row">
            <div class="input-field col s12">
              <select id="satellite-lists-select">
                <option value="-1" disabled selected>Select a list...</option>
              </select>
              <label>Current List</label>
            </div>
          </div>

          <!-- List Management -->
          <div class="center-align row">
            <button id="satellite-lists-new-list" class="btn btn-ui waves-effect waves-light" type="button">
              Create New List &#9658;
            </button>
          </div>

          <div class="center-align row">
            <button id="satellite-lists-rename-list" class="btn btn-ui waves-effect waves-light" type="button">
              Rename List &#9658;
            </button>
          </div>

          <div class="center-align row">
            <button id="satellite-lists-delete-list" class="btn btn-ui waves-effect waves-light" type="button">
              Delete List &#9658;
            </button>
          </div>

          <hr />

          <!-- Current List Display -->
          <h6 class="center-align" id="satellite-lists-current-name">No List Selected</h6>
          <div id="satellite-lists-list"></div>
          <br />

          <!-- Add Satellites -->
          <div class="row">
            <div class="input-field col s10 m10 l10">
              <form id="satellite-lists-submit">
                <input placeholder="xxxxx,xxxxx,xxxxx..." id="satellite-lists-new-sat" type="text" />
                <label for="satellite-lists-new-sat">Add Satellite(s)</label>
              </form>
            </div>
            <div class="col s2 m2 l2 center-align add-icon">
              <img
                id="satellite-lists-add"
                class="satellite-lists-add"
                src="" delayedsrc="${bookmarkAddPng}" style="cursor: pointer;"/>
            </div>
          </div>

          <hr />

          <!-- Export/Import Individual List -->
          <div class="center-align row">
            <button id="satellite-lists-export-current" class="btn btn-ui waves-effect waves-light" type="button">
              Export Current List &#9658;
            </button>
          </div>

          <div class="center-align row">
            <button id="satellite-lists-import-single" class="btn btn-ui waves-effect waves-light" type="button">
              Import Single List &#9658;
            </button>
            <input id="satellite-lists-import-single-file" type="file" accept=".json" style="display: none;" />
          </div>

          <hr />

          <!-- Export/Import All Lists -->
          <div class="center-align row">
            <button id="satellite-lists-export-all" class="btn btn-ui waves-effect waves-light" type="button">
              Export All Lists &#9658;
            </button>
          </div>

          <div class="center-align row">
            <button id="satellite-lists-import-all" class="btn btn-ui waves-effect waves-light" type="button">
              Import All Lists &#9658;
            </button>
            <input id="satellite-lists-import-all-file" type="file" accept=".json" style="display: none;" />
          </div>

          <div class="center-align row">
            <button id="satellite-lists-clear-all" class="btn btn-ui waves-effect waves-light" type="button">
              Clear All Lists &#9658;
            </button>
          </div>
        </div>
      </div>
    </div>`;

  sideMenuElementName: string = 'satellite-lists-menu';

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
            <li id="top-menu-satellite-lists-li" class="hidden">
              <a id="top-menu-satellite-lists-btn" class="top-menu-icons">
                <div class="top-menu-icons bmenu-item-selected">
                  <img id="top-menu-satellite-lists-btn-icon"
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
        getEl('top-menu-satellite-lists-btn', true)?.addEventListener('click', () => {
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
      getEl(this.EL.ADD_TO_LIST)?.addEventListener('click', satInfoBoxPlugin.withClickSound(this.addRemoveFromList_.bind(this)));
      getEl(this.EL.REMOVE_FROM_LIST)?.addEventListener('click', satInfoBoxPlugin.withClickSound(this.addRemoveFromList_.bind(this)));
    });

    EventBus.getInstance().on(EventBusEvent.selectSatData, this.selectSatData_.bind(this));
  }

  private satInfoBoxFinal_() {
    // Add html to satellite name
    getEl(SAT_INFO_EL.NAME)?.insertAdjacentHTML('beforebegin', html`
      <img id="${this.EL.ADD_TO_LIST}" src="${bookmarkAddPng}"/>
      <img id="${this.EL.REMOVE_FROM_LIST}" src="${bookmarkRemovePng}"/>
    `);
  }

  private selectSatData_(obj?: BaseObject) {
    if (!obj) {
      return;
    }

    if (this.isOnCurrentList(obj.id)) {
      getEl(this.EL.REMOVE_FROM_LIST)!.style.display = 'block';
      getEl(this.EL.ADD_TO_LIST)!.style.display = 'none';
    } else {
      getEl(this.EL.ADD_TO_LIST)!.style.display = 'block';
      getEl(this.EL.REMOVE_FROM_LIST)!.style.display = 'none';
    }
  }

  private addRemoveFromList_() {
    const id = PluginRegistry.getPlugin(SelectSatManager)!.selectedSat;

    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    if (this.isOnCurrentList(id)) {
      this.removeSatFromCurrentList(id);
    } else {
      this.addSatToCurrentList(id);
    }
  }

  private async onCruncherReady_(): Promise<void> {
    if (!settingsManager.offlineMode) {
      return;
    }

    const listsString = PersistenceManager.getInstance().getItem(StorageKey.SATELLITE_LISTS);

    if (listsString && listsString !== '[]') {
      try {
        const loadedLists = this.deserializeCollection(listsString);

        if (loadedLists && loadedLists.length > 0) {
          this.lists = loadedLists;
          this.currentListIndex = 0;
          ServiceLocator.getUiManager().toast(`Loaded ${this.lists.length} satellite list(s)`, ToastMsgType.normal);
        }
      } catch (error) {
        errorManagerInstance.warn('Error loading satellite lists from storage');
      }
    }
  }

  private uiManagerFinal_(): void {
    clickAndDragWidth(getEl('satellite-lists-menu'));

    // List selection
    getEl('satellite-lists-select')?.addEventListener('change', (evt: Event) => {
      const selectedIndex = parseInt((<HTMLSelectElement>evt.target).value);

      if (selectedIndex >= 0 && selectedIndex < this.lists.length) {
        this.currentListIndex = selectedIndex;
        this.updateCurrentListDisplay();
        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      }
    });

    // Create new list
    getEl('satellite-lists-new-list')?.addEventListener('click', () => {
      this.onCreateNewList_();
    });

    // Rename list
    getEl('satellite-lists-rename-list')?.addEventListener('click', () => {
      this.onRenameList_();
    });

    // Delete list
    getEl('satellite-lists-delete-list')?.addEventListener('click', () => {
      this.onDeleteList_();
    });

    // Add satellites button
    getEl('satellite-lists-add')?.addEventListener('click', () => {
      this.onAddSatellites_();
    });

    // Enter pressed on add satellites
    getEl('satellite-lists-content')?.addEventListener('submit', (evt: Event) => {
      evt.preventDefault();
      this.onAddSatellites_();
    });

    // Remove satellite from list
    getEl('satellite-lists-list')?.addEventListener('click', (evt: Event) => {
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      const target = <HTMLElement>evt.target;

      if (target.classList.contains('sat-name')) {
        const satId = target.dataset.satId;

        if (satId) {
          this.selectSat(parseInt(satId));
        }
      } else if (target.classList.contains('satellite-list-remove')) {
        const satId = target.dataset.satId;

        if (satId) {
          this.removeSatFromCurrentList(parseInt(satId));
        }
      }
    });

    // Export current list
    getEl('satellite-lists-export-current')?.addEventListener('click', () => {
      this.onExportCurrentList_();
    });

    // Import single list
    getEl('satellite-lists-import-single')?.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
      getEl('satellite-lists-import-single-file')?.click();
    });

    getEl('satellite-lists-import-single-file')?.addEventListener('change', (evt: Event) => {
      this.onImportSingleList_(evt);
      (<HTMLInputElement>getEl('satellite-lists-import-single-file')).value = '';
    });

    // Export all lists
    getEl('satellite-lists-export-all')?.addEventListener('click', () => {
      this.onExportAllLists_();
    });

    // Import all lists
    getEl('satellite-lists-import-all')?.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
      getEl('satellite-lists-import-all-file')?.click();
    });

    getEl('satellite-lists-import-all-file')?.addEventListener('change', (evt: Event) => {
      this.onImportAllLists_(evt);
      (<HTMLInputElement>getEl('satellite-lists-import-all-file')).value = '';
    });

    // Clear all lists
    getEl('satellite-lists-clear-all')?.addEventListener('click', () => {
      this.onClearAllLists_();
    });

    this.updateListSelector();
    this.updateTopMenuVisibility();
  }

  private onCreateNewList_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    const listName = prompt('Enter name for new list:');

    if (!listName || listName.trim() === '') {
      return;
    }

    // Check for duplicate names
    if (this.lists.some((list) => list.name === listName.trim())) {
      ServiceLocator.getUiManager().toast('A list with this name already exists', ToastMsgType.caution);

      return;
    }

    this.lists.push({
      name: listName.trim(),
      satellites: [],
    });

    this.currentListIndex = this.lists.length - 1;
    this.updateListSelector();
    this.updateCurrentListDisplay();
    this.saveLists();
    this.updateTopMenuVisibility();

    ServiceLocator.getUiManager().toast(`Created list: ${listName}`, ToastMsgType.normal);
  }

  private onRenameList_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    if (this.lists.length === 0) {
      ServiceLocator.getUiManager().toast('No list selected', ToastMsgType.caution);

      return;
    }

    const currentList = this.lists[this.currentListIndex];
    const newName = prompt('Enter new name for list:', currentList.name);

    if (!newName || newName.trim() === '') {
      return;
    }

    // Check for duplicate names (excluding current list)
    if (this.lists.some((list, idx) => idx !== this.currentListIndex && list.name === newName.trim())) {
      ServiceLocator.getUiManager().toast('A list with this name already exists', ToastMsgType.caution);

      return;
    }

    currentList.name = newName.trim();
    this.updateListSelector();
    this.updateCurrentListDisplay();
    this.saveLists();

    ServiceLocator.getUiManager().toast(`Renamed list to: ${newName}`, ToastMsgType.normal);
  }

  private onDeleteList_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    if (this.lists.length === 0) {
      ServiceLocator.getUiManager().toast('No list selected', ToastMsgType.caution);

      return;
    }

    const currentList = this.lists[this.currentListIndex];
    const confirmed = confirm(`Delete list "${currentList.name}"?`);

    if (!confirmed) {
      return;
    }

    // Clean up satellites in the list
    this.clearCurrentList();

    this.lists.splice(this.currentListIndex, 1);

    if (this.lists.length > 0) {
      this.currentListIndex = Math.min(this.currentListIndex, this.lists.length - 1);
    } else {
      this.currentListIndex = 0;
    }

    this.updateListSelector();
    this.updateCurrentListDisplay();
    this.saveLists();
    this.updateTopMenuVisibility();

    ServiceLocator.getUiManager().toast('List deleted', ToastMsgType.normal);
  }

  private onAddSatellites_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);

    if (this.lists.length === 0) {
      ServiceLocator.getUiManager().toast('Create a list first', ToastMsgType.caution);

      return;
    }

    const input = <HTMLInputElement>getEl('satellite-lists-new-sat');
    const sats = input.value.split(/[\s,]+/u);

    sats.forEach((satNum: string) => {
      if (!satNum.trim()) {
        return;
      }

      const id = ServiceLocator.getCatalogManager().sccNum2Id(parseInt(satNum));

      if (id === null) {
        errorManagerInstance.warn(`Satellite ${satNum} not found!`, true);

        return;
      }
      this.addSatToCurrentList(id, true);
    });

    this.sortCurrentList();
    this.updateCurrentListDisplay();
    input.value = '';
  }

  private onExportCurrentList_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    if (this.lists.length === 0) {
      ServiceLocator.getUiManager().toast('No list selected', ToastMsgType.caution);

      return;
    }

    const currentList = this.lists[this.currentListIndex];
    const serialized = this.serializeSingleList(currentList);
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
    const filename = `${currentList.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_list.json`;

    try {
      saveAs(blob, filename);
      ServiceLocator.getUiManager().toast(`Exported: ${currentList.name}`, ToastMsgType.normal);
    } catch (e) {
      if (!isThisNode()) {
        errorManagerInstance.error(e, 'satellite-lists.ts', 'Error exporting list!');
      }
    }
  }

  private onImportSingleList_(evt: Event) {
    if (!window.FileReader) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      this.onReaderLoadSingle_(e);
    };

    const inputFiles = (<HTMLInputElement>evt.target).files ?? [];

    if (inputFiles[0]) {
      reader.readAsText(inputFiles[0]);
    }
    evt.preventDefault();
  }

  private onReaderLoadSingle_(evt: ProgressEvent<FileReader>) {
    const target = evt.target;

    if (!target || target.readyState !== 2 || target.error) {
      errorManagerInstance.error(target?.error || new Error('Failed to read file'), 'satellite-lists.ts', 'Error reading list!');

      return;
    }

    try {
      const listData = JSON.parse(<string>evt.target.result);
      const listName = listData.name || 'Imported List';
      const sccNums = listData.sccNums || listData.satellites || [];

      if (!Array.isArray(sccNums)) {
        throw new Error('Invalid list format');
      }

      // Check for duplicate names
      let finalName = listName;
      let counter = 1;

      while (this.lists.some((list) => list.name === finalName)) {
        finalName = `${listName} (${counter})`;
        counter++;
      }

      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const satellites: { id: number; inView: boolean }[] = [];

      for (const sccNum of sccNums) {
        const id = catalogManagerInstance.sccNum2Id(parseInt(sccNum));

        if (id !== null) {
          satellites.push({ id, inView: false });
        } else {
          errorManagerInstance.warn(`Satellite ${sccNum} not found`, true);
        }
      }

      this.lists.push({
        name: finalName,
        satellites,
      });

      this.currentListIndex = this.lists.length - 1;
      this.updateListSelector();
      this.updateCurrentListDisplay();
      this.saveLists();
      this.updateTopMenuVisibility();

      ServiceLocator.getUiManager().toast(`Imported list: ${finalName} (${satellites.length} satellites)`, ToastMsgType.normal);
    } catch (error) {
      errorManagerInstance.warn('Invalid list file format');
    }
  }

  private onExportAllLists_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    if (this.lists.length === 0) {
      ServiceLocator.getUiManager().toast('No lists to export', ToastMsgType.caution);

      return;
    }

    const serialized = this.serializeCollection();
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
    const filename = 'satellite_lists_collection.json';

    try {
      saveAs(blob, filename);
      ServiceLocator.getUiManager().toast(`Exported ${this.lists.length} list(s)`, ToastMsgType.normal);
    } catch (e) {
      if (!isThisNode()) {
        errorManagerInstance.error(e, 'satellite-lists.ts', 'Error exporting lists!');
      }
    }
  }

  private onImportAllLists_(evt: Event) {
    if (!window.FileReader) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      this.onReaderLoadAll_(e);
    };

    const inputFiles = (<HTMLInputElement>evt.target).files ?? [];

    if (inputFiles[0]) {
      reader.readAsText(inputFiles[0]);
    }
    evt.preventDefault();
  }

  private onReaderLoadAll_(evt: ProgressEvent<FileReader>) {
    const target = evt.target;

    if (!target || target.readyState !== 2 || target.error) {
      errorManagerInstance.error(target?.error || new Error('Failed to read file'), 'satellite-lists.ts', 'Error reading lists!');

      return;
    }

    try {
      const collectionData = JSON.parse(<string>evt.target.result);
      const importedLists = this.deserializeCollection(JSON.stringify(collectionData));

      if (!importedLists || importedLists.length === 0) {
        throw new Error('No valid lists found');
      }

      const confirmed = confirm(`Import ${importedLists.length} list(s)? This will replace all current lists.`);

      if (!confirmed) {
        return;
      }

      // Clear existing lists
      this.clearAllLists();

      this.lists = importedLists;
      this.currentListIndex = 0;
      this.updateListSelector();
      this.updateCurrentListDisplay();
      this.saveLists();
      this.updateTopMenuVisibility();

      ServiceLocator.getUiManager().toast(`Imported ${this.lists.length} list(s)`, ToastMsgType.normal);
    } catch (error) {
      errorManagerInstance.warn('Invalid collection file format');
    }
  }

  private onClearAllLists_() {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    if (this.lists.length === 0) {
      ServiceLocator.getUiManager().toast('No lists to clear', ToastMsgType.caution);

      return;
    }

    const confirmed = confirm('Clear all lists? This cannot be undone.');

    if (!confirmed) {
      return;
    }

    this.clearAllLists();
    this.lists = [];
    this.currentListIndex = 0;
    this.updateListSelector();
    this.updateCurrentListDisplay();
    this.saveLists();
    this.updateTopMenuVisibility();

    ServiceLocator.getUiManager().toast('All lists cleared', ToastMsgType.normal);
  }

  private updateListSelector() {
    const select = <HTMLSelectElement>getEl('satellite-lists-select');

    if (!select) {
      return;
    }

    let optionsHtml = '<option value="-1" disabled>Select a list...</option>';

    this.lists.forEach((list, idx) => {
      const selected = idx === this.currentListIndex ? 'selected' : '';

      optionsHtml += `<option value="${idx}" ${selected}>${list.name} (${list.satellites.length})</option>`;
    });

    select.innerHTML = optionsHtml;

    // Re-initialize Materialize select
    if (window.M?.FormSelect) {
      window.M.FormSelect.init(select);
    }
  }

  updateCurrentListDisplay() {
    if (this.lists.length === 0) {
      getEl('satellite-lists-current-name')!.textContent = 'No List Selected';
      getEl('satellite-lists-list')!.innerHTML = '';

      return;
    }

    const currentList = this.lists[this.currentListIndex];

    getEl('satellite-lists-current-name')!.textContent = currentList.name;

    let listHtml = '';
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    for (const obj of currentList.satellites) {
      const sat = catalogManagerInstance.getSat(obj.id);

      if (!sat) {
        continue;
      }

      listHtml += `
        <div class="row">
          <div class="col s3 m3 l3">
            <span class="sat-sccnum" style="cursor: pointer;">${sat.sccNum}</span>
          </div>
          <div class="col s7 m7 l7">
            <span class="sat-name" data-sat-id="${sat.id || 'Unknown'}" style="cursor: pointer;">${sat.name || 'Unknown'}</span>
          </div>
          <div class="col s2 m2 l2 center-align remove-icon">
            <img class="satellite-list-remove" data-sat-id="${sat.id}" src="${bookmarkRemovePng}" style="cursor: pointer;"></img>
          </div>
        </div>`;
    }

    getEl('satellite-lists-list')!.innerHTML = listHtml;

    // Update search to show satellites in current list
    const searchString = currentList.satellites
      .map((obj) => catalogManagerInstance.getSat(obj.id, GetSatType.EXTRA_ONLY)?.sccNum)
      .filter((sccNum) => sccNum)
      .join(',');

    if (searchString) {
      ServiceLocator.getUiManager().doSearch(searchString, true);
    } else {
      ServiceLocator.getUiManager().doSearch('', true);
    }

    ServiceLocator.getColorSchemeManager().calculateColorBuffers(true);
  }

  selectSat(id: number) {
    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

    selectSatManagerInstance?.selectSat(id);
  }

  addSatToCurrentList(id: number, isMultiAdd = false) {
    if (this.lists.length === 0) {
      return;
    }

    const currentList = this.lists[this.currentListIndex];
    const isDuplicate = currentList.satellites.some(({ id: id_ }) => id_ === id);

    if (!isDuplicate) {
      currentList.satellites.push({ id, inView: false });
    } else {
      const sat = ServiceLocator.getCatalogManager().getSat(id);

      if (sat?.sccNum) {
        errorManagerInstance.warn(`NORAD: ${sat.sccNum} already in list!`, true);
      } else if (sat) {
        const jscString = sat.source === CatalogSource.VIMPEL ? ` (JSC Vimpel ${sat.altId})` : '';

        errorManagerInstance.warn(`Object ${id}${jscString} already in list!`, true);
      }
    }

    if (!isMultiAdd) {
      this.sortCurrentList();
      this.updateCurrentListDisplay();
      this.saveLists();
    }
  }

  removeSatFromCurrentList(id: number) {
    if (this.lists.length === 0) {
      return;
    }

    const currentList = this.lists[this.currentListIndex];
    const idxMatch = currentList.satellites.findIndex(({ id: id_ }) => id === id_);

    if (idxMatch === -1) {
      return;
    }

    ServiceLocator.getOrbitManager().removeInViewOrbit(currentList.satellites[idxMatch].id);
    currentList.satellites.splice(idxMatch, 1);

    ServiceLocator.getLineManager().lines.forEach((line) => {
      if (line instanceof SensorToSatLine && line.sat.id === id) {
        line.isGarbage = true;
      }
    });

    this.updateCurrentListDisplay();
    this.saveLists();

    if (currentList.satellites.length <= 0) {
      ServiceLocator.getUiManager().doSearch('');
      ServiceLocator.getColorSchemeManager().calculateColorBuffers(true);
    }
  }

  isOnCurrentList(id: number): boolean {
    if (this.lists.length === 0 || id === null) {
      return false;
    }

    const currentList = this.lists[this.currentListIndex];

    return currentList.satellites.some(({ id: id_ }) => id_ === id);
  }

  private sortCurrentList() {
    if (this.lists.length === 0) {
      return;
    }

    const currentList = this.lists[this.currentListIndex];

    currentList.satellites.sort(({ id: a }, { id: b }) => {
      const satA = ServiceLocator.getCatalogManager().getSat(a);
      const satB = ServiceLocator.getCatalogManager().getSat(b);

      if (satA === null || satB === null) {
        return 0;
      }

      return parseInt(satA.sccNum) - parseInt(satB.sccNum);
    });
  }

  private clearCurrentList() {
    if (this.lists.length === 0) {
      return;
    }

    const currentList = this.lists[this.currentListIndex];
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    for (const obj of currentList.satellites) {
      orbitManagerInstance.removeInViewOrbit(obj.id);
    }

    ServiceLocator.getLineManager().lines.forEach((line) => {
      if (line instanceof SensorToSatLine) {
        line.isGarbage = true;
      }
    });

    currentList.satellites = [];
    this.updateCurrentListDisplay();
    this.saveLists();
  }

  private clearAllLists() {
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    for (const list of this.lists) {
      for (const obj of list.satellites) {
        orbitManagerInstance.removeInViewOrbit(obj.id);
      }
    }

    ServiceLocator.getLineManager().lines.forEach((line) => {
      if (line instanceof SensorToSatLine) {
        line.isGarbage = true;
      }
    });
  }

  private serializeSingleList(list: SatelliteList): string {
    const sccNums: string[] = [];
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    for (const obj of list.satellites) {
      const sat = catalogManagerInstance.getSat(obj.id, GetSatType.EXTRA_ONLY);

      if (sat?.sccNum) {
        sccNums.push(sat.sccNum.padStart(6, '0'));
      }
    }

    return JSON.stringify({
      name: list.name,
      sccNums,
    }, null, 2);
  }

  private serializeCollection(): string {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const collection: SatelliteListsCollection = {
      version: '1.0',
      lists: [],
    };

    for (const list of this.lists) {
      const sccNums: string[] = [];

      for (const obj of list.satellites) {
        const sat = catalogManagerInstance.getSat(obj.id, GetSatType.EXTRA_ONLY);

        if (sat?.sccNum) {
          sccNums.push(sat.sccNum.padStart(6, '0'));
        }
      }

      collection.lists.push({
        name: list.name,
        sccNums,
      });
    }

    return JSON.stringify(collection, null, 2);
  }

  private deserializeCollection(data: string): SatelliteList[] {
    try {
      const parsed = JSON.parse(data);
      const lists: SatelliteList[] = [];
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      // Handle both old array format and new collection format
      const listsData = parsed.lists || (Array.isArray(parsed) ? [{ name: 'Imported List', sccNums: parsed }] : []);

      for (const listData of listsData) {
        const satellites: { id: number; inView: boolean }[] = [];
        const sccNums = listData.sccNums || listData.satellites || [];

        for (const sccNum of sccNums) {
          const id = catalogManagerInstance.sccNum2Id(parseInt(sccNum));

          if (id !== null) {
            satellites.push({ id, inView: false });
          }
        }

        if (satellites.length > 0) {
          lists.push({
            name: listData.name || 'Unnamed List',
            satellites,
          });
        }
      }

      return lists;
    } catch (error) {
      errorManagerInstance.warn('Error deserializing collection');

      return [];
    }
  }

  private saveLists() {
    if (settingsManager.offlineMode) {
      PersistenceManager.getInstance().saveItem(StorageKey.SATELLITE_LISTS, this.serializeCollection());
    }
  }

  private updateTopMenuVisibility() {
    const hasLists = this.lists.length > 0 && this.lists.some((list) => list.satellites.length > 0);

    if (hasLists) {
      showEl('top-menu-satellite-lists-li');
    } else {
      hideEl('top-menu-satellite-lists-li');
    }
  }
}
