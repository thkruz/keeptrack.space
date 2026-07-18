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
import { BaseObject, CatalogSource } from '@ootk/src/main';
import bookmarkAddPng from '@public/img/icons/bookmark-add.png';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import bookmarksPng from '@public/img/icons/bookmarks.png';
import saveAs from 'file-saver';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import {
  IHelpConfig,
  IKeyboardShortcut,
  ISettingsContribution,
  ISettingsContributor,
} from '../../engine/plugins/core/plugin-capabilities';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { EL as SAT_INFO_EL } from '../sat-info-box/sat-info-box-html';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { TopMenu } from '../top-menu/top-menu';
import './watchlist.css';

export interface UpdateWatchlistParams {
  updateWatchlistList?: { id: number, inView: boolean }[];
  isSkipSearch?: boolean;
}

export class WatchlistPlugin extends KeepTrackPlugin implements ISettingsContributor {
  readonly id = 'WatchlistPlugin';
  dependencies_ = [];

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.WatchlistPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.WatchlistPlugin.help.overview'),
          image: {
            src: 'img/help/watchlist/watchlist-menu.png',
            alt: t7e('plugins.WatchlistPlugin.help.imgAlt'),
            caption: t7e('plugins.WatchlistPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.WatchlistPlugin.help.managingHeading'),
          content: t7e('plugins.WatchlistPlugin.help.managing'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.WatchlistPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.WatchlistPlugin.help.tip1'),
        t7e('plugins.WatchlistPlugin.help.tip2'),
        t7e('plugins.WatchlistPlugin.help.tip3'),
      ],
      shortcuts: [{ keys: ['W'], description: t7e('plugins.WatchlistPlugin.help.shortcutToggle') }],
    };
  }

  getSettingsContribution(): ISettingsContribution {
    const l = (key: string) => t7e(`plugins.WatchlistPlugin.settings.satLabelMode.${key}` as Parameters<typeof t7e>[0]);

    return {
      sectionId: this.id,
      sectionLabel: this.bottomIconLabel,
      controls: [
        {
          type: 'select',
          id: 'satLabelMode',
          label: l('label'),
          helpText: l('helpText'),
          options: [
            { value: String(SatLabelMode.OFF), label: l('options.off') },
            { value: String(SatLabelMode.FOV_ONLY), label: l('options.fovOnly') },
            { value: String(SatLabelMode.ALL), label: l('options.all') },
          ],
          get: () => String(settingsManager.satLabelMode),
          set: (next) => {
            const parsed = parseInt(next, 10) as SatLabelMode;

            settingsManager.satLabelMode = parsed;
            PersistenceManager.getInstance().saveItem(
              StorageKey.SETTINGS_SAT_LABEL_MODE_V2,
              parsed.toString(),
            );
          },
        },
      ],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'W',
        callback: () => {
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
  // v13+ "FAANG card" layout. The root carries the kt-ui-v13 marker directly
  // (this HTML is self-authored, not generated, so no JS opt-in is needed here).
  sideMenuElementHtml = html`
    <div id="watchlist-menu" class="side-menu-parent start-hidden kt-ui-v13">
      <div id="watchlist-content" class="side-menu">
        <section class="kt-section">
          <div class="kt-section-label">${t7e('plugins.WatchlistPlugin.labels.satellitesHeader' as Parameters<typeof t7e>[0])}</div>
          <div id="watchlist-list"></div>
          <form id="watchlist-submit" class="watchlist-add-row">
            <div class="input-field">
              <input placeholder="xxxxx,xxxxx,xxxxx..." id="watchlist-new" type="text" />
              <label for="watchlist-new">${t7e('plugins.WatchlistPlugin.labels.newSatellites' as Parameters<typeof t7e>[0])}</label>
            </div>
            <img id="watchlist-add" class="watchlist-add" src="" delayedsrc="${bookmarkAddPng}" style="cursor: pointer;"/>
          </form>
        </section>
        <section class="kt-section">
          <div class="kt-section-label">${t7e('plugins.WatchlistPlugin.labels.actionsHeader' as Parameters<typeof t7e>[0])}</div>
          <button id="watchlist-save" type="button" class="kt-action waves-effect">
            <span class="kt-action-label">${t7e('plugins.WatchlistPlugin.labels.saveList' as Parameters<typeof t7e>[0])}</span>
          </button>
          <input id="watchlist-file" type="file" name="files[]" style="display: none;" />
          <button id="watchlist-open" type="button" class="kt-action waves-effect">
            <span class="kt-action-label">${t7e('plugins.WatchlistPlugin.labels.loadList' as Parameters<typeof t7e>[0])}</span>
          </button>
          <button id="watchlist-clear" type="button" class="kt-action waves-effect">
            <span class="kt-action-label">${t7e('plugins.WatchlistPlugin.labels.clearList' as Parameters<typeof t7e>[0])}</span>
          </button>
        </section>
      </div>
    </div>`;

  sideMenuElementName: string = 'watchlist-menu';
  sideMenuTitle = 'Watchlist';

  sideMenuSecondaryHtml = html`
    <section class="kt-section">
      <div class="kt-section-label">${t7e('plugins.WatchlistPlugin.labels.displayHeader' as Parameters<typeof t7e>[0])}</div>
      <div class="switch row">
        <label>
          <input id="watchlist-hide-others" type="checkbox" />
          <span class="lever"></span>
          ${t7e('plugins.WatchlistPlugin.labels.hideOtherObjects' as Parameters<typeof t7e>[0])}
        </label>
      </div>
    </section>
    <section class="kt-section">
      <div class="kt-section-label">${t7e('plugins.WatchlistPlugin.labels.labelsHeader' as Parameters<typeof t7e>[0])}</div>
      <div class="row" style="margin-top: 5px;">
        <label>
          <input id="watchlist-label-always" name="watchlist-label-mode" type="radio" value="2" />
          <span>${t7e('plugins.WatchlistPlugin.labels.labelAlways' as Parameters<typeof t7e>[0])}</span>
        </label>
      </div>
      <div class="row">
        <label>
          <input id="watchlist-label-fov" name="watchlist-label-mode" type="radio" value="1" checked />
          <span>${t7e('plugins.WatchlistPlugin.labels.labelFovOnly' as Parameters<typeof t7e>[0])}</span>
        </label>
      </div>
      <div class="row">
        <label>
          <input id="watchlist-label-off" name="watchlist-label-mode" type="radio" value="0" />
          <span>${t7e('plugins.WatchlistPlugin.labels.labelOff' as Parameters<typeof t7e>[0])}</span>
        </label>
      </div>
    </section>
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

    // Account sync applied a cloud-newer watchlist: reload it from persistence
    EventBus.getInstance().on(EventBusEvent.remoteSettingsApplied, (changedKeys) => {
      if (changedKeys.includes(StorageKey.WATCHLIST_LIST)) {
        this.reloadFromPersistence_();
      }
    });
  }

  /** Re-apply the persisted watchlist (used when cloud sync updates it post-boot). */
  protected reloadFromPersistence_(): void {
    const watchlistString = PersistenceManager.getInstance().getItem(StorageKey.WATCHLIST_LIST) ?? '[]';
    const newWatchlist = this.createNewWatchlist(watchlistString);

    this.updateWatchlist({ updateWatchlistList: newWatchlist, isSkipSearch: true });
  }

  protected satInfoBoxFinal_() {
    getEl(SAT_INFO_EL.NAME)?.insertAdjacentHTML('beforebegin', html`
      <img id="${this.EL.WATCHLIST_TOGGLE}" src="${bookmarkAddPng}" class="sat-watchlist-icon off-watchlist"/>
    `);
  }

  protected selectSatData_(obj?: BaseObject) {
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

  protected addRemoveWatchlist_() {
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
  protected async onCruncherReady_(): Promise<void> {
    let watchlistString = PersistenceManager.getInstance().getItem(StorageKey.WATCHLIST_LIST);

    // Offline builds bootstrap a default watchlist from disk; web builds start empty
    if ((!watchlistString || watchlistString === '[]') && settingsManager.offlineMode) {
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
      // sccNum2Id accepts the string directly; parseInt would drop alpha-5 / extended IDs.
      newWatchlist = savedSatList.map((sccNum: string) => ({ id: catalogManagerInstance.sccNum2Id(sccNum) ?? -1, inView: false }));
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
      ServiceLocator.getUiManager().toast(
        t7e('plugins.WatchlistPlugin.msgs.watchlistLoaded' as Parameters<typeof t7e>[0]).replace('{count}', newWatchlist.length.toString()),
        ToastMsgType.normal,
      );
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
  protected uiManagerFinal_(): void {
    clickAndDragWidth(getEl('watchlist-menu'));

    // Opt the generated secondary menu into the v13 UI (its content is authored
    // in sideMenuSecondaryHtml as kt-section cards; the wrapper is generated).
    getEl('watchlist-menu-secondary')?.classList.add('kt-ui-v13');

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
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    // Drop entries whose satellite is no longer in the catalog. Filtering up
    // front avoids splicing the array during the render loop, which skipped the
    // entry immediately after every removed one.
    this.watchlistList = this.watchlistList.filter(
      ({ id }) => catalogManagerInstance.getSat(id, GetSatType.EXTRA_ONLY) !== null,
    );

    let watchlistListHTML = '';

    for (const { id } of this.watchlistList) {
      const sat = catalogManagerInstance.getSat(id, GetSatType.EXTRA_ONLY)!;

      watchlistListHTML += `
        <div class="row">
          <div class="col s3 m3 l3">
             <span class="sat-sccnum" data-sat-sccnum="${sat.id}" style="cursor: pointer;">${sat.sccNum}</span>
          </div>
          <div class="col s7 m7 l7">
             <span class="sat-name" data-sat-name="${sat.id}" style="cursor: pointer;">${sat.name || t7e('Common.unknown')}</span>
          </div>
          <div class="col s2 m2 l2 center-align remove-icon">
            <img class="watchlist-remove" data-sat-id="${sat.id}" src="${bookmarkRemovePng}" style="cursor: pointer;"></img>
          </div>
        </div>`;
    }

    const watchlistElement = getEl('watchlist-list');

    if (watchlistElement) {
      watchlistElement.innerHTML = watchlistListHTML;
    }

    EventBus.getInstance().emit(EventBusEvent.onWatchlistUpdated, this.watchlistList);

    const watchlistString = this.watchlistList
      .map(({ id }) => catalogManagerInstance.getSat(id, GetSatType.EXTRA_ONLY)?.sccNum ?? '')
      .join(',');

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

    PersistenceManager.getInstance().saveItem(StorageKey.WATCHLIST_LIST, this.serialize());
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
        errorManagerInstance.warnToast(t7e('plugins.WatchlistPlugin.errorMsgs.NoradAlreadyInList' as Parameters<typeof t7e>[0]).replace('{sccNum}', `${sat.sccNum}`));
      } else if (sat) {
        const jscString = sat.source === CatalogSource.VIMPEL ? ` (JSC Vimpel ${sat.altId})` : '';

        errorManagerInstance.warnToast(t7e('plugins.WatchlistPlugin.errorMsgs.ObjectAlreadyInList' as Parameters<typeof t7e>[0]).replace('{id}', `${id}${jscString}`));
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
    if (typeof id !== 'number') {
      return false;
    }

    return this.watchlistList.some(({ id: id_ }) => id_ === id);
  }

  /**
   * The display color (#rrggbb) of the active watchlist, or null when the
   * default styling should be used. The OSS plugin has a single, uncolored
   * list; the pro plugin overrides this with the current list's color so the
   * overlay rows and in-view orbit lines can reflect it.
   */
  getListColor(): string | null {
    return null;
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
      if (!satNum.trim()) {
        return;
      }

      // Pass the raw string to sccNum2Id, which handles every sccNum form
      // (numeric, alpha-5 "T0001", 6-digit, extended) plus leading-zero
      // normalization. parseInt would turn "T0001" into NaN and silently
      // drop alpha-5 / extended watchlist entries.
      const id = ServiceLocator.getCatalogManager().sccNum2Id(satNum.trim()) ?? -1;

      if (id === -1) {
        errorManagerInstance.warnToast(t7e('plugins.WatchlistPlugin.errorMsgs.SatNotFound' as Parameters<typeof t7e>[0]).replace('{id}', `${satNum}`));

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

        newWatchlist = savedSatList.map((sccNum: string) => ({ id: String(catalogManagerInstance.sccNum2Id(sccNum) ?? '-1'), inView: false }));
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
        errorManagerInstance.warnToast(t7e('plugins.WatchlistPlugin.errorMsgs.SatNotFound' as Parameters<typeof t7e>[0]).replace('{id}', `${obj.id}`));
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
    const catalogManager = ServiceLocator.getCatalogManager();

    // Build from a filtered copy - serialize must not mutate watchlistList.
    const satIds = this.watchlistList
      .map(({ id }) => catalogManager.getSat(id, GetSatType.EXTRA_ONLY)?.sccNum)
      .filter((sccNum): sccNum is string => typeof sccNum === 'string');

    return JSON.stringify(satIds);
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
