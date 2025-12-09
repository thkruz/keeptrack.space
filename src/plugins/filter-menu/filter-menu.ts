import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  IBottomIconConfig,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import filterPng from '@public/img/icons/filter.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { TopMenu } from '../top-menu/top-menu';
import './filter-menu.css';

/**
 * /////////////////////////////////////////////////////////////////////////////
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

declare module '@app/engine/core/interfaces' {
  interface UserSettings {
    isBlackEarth: boolean;
    isDrawMilkyWay: boolean;
  }
}

export interface FilterPluginSettings {
  xGEOSatellites?: boolean;
  vLEOSatellites?: boolean;
  payloads?: boolean;
  rocketBodies?: boolean;
  debris?: boolean;
  unknownType?: boolean;
  agencies?: boolean;
  starlinkSatellites?: boolean;
  hEOSatellites?: boolean;
  mEOSatellites?: boolean;
  gEOSatellites?: boolean;
  lEOSatellites?: boolean;
  unitedStates?: boolean;
  unitedKingdom?: boolean;
  france?: boolean;
  germany?: boolean;
  japan?: boolean;
  china?: boolean;
  india?: boolean;
  russia?: boolean;
  uSSR?: boolean;
  southKorea?: boolean;
  australia?: boolean;
  otherCountries?: boolean;
  vimpelSatellites?: boolean;
  celestrakSatellites?: boolean;
  notionalSatellites?: boolean;
}

interface Filters {
  name: string;
  category: string;
  id?: string;
  tooltip?: string;
  checked?: boolean;
  disabled?: boolean;
  cb?: (e: Event) => void;
}

export class FilterMenuPlugin extends KeepTrackPlugin {
  readonly id = 'FilterMenuPlugin';
  dependencies_ = [TopMenu.name];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL];

  static get filters(): Filters[] {
    return [
      {
        id: 'payloads',
        name: t7e('filterMenu.payloads.name'),
        category: t7e('filterMenu.payloads.category'),
        tooltip: t7e('filterMenu.payloads.tooltip'),
      },
      {
        id: 'rocketBodies',
        name: t7e('filterMenu.rocketBodies.name'),
        category: t7e('filterMenu.rocketBodies.category'),
        tooltip: t7e('filterMenu.rocketBodies.tooltip'),
      },
      {
        id: 'debris',
        name: t7e('filterMenu.debris.name'),
        category: t7e('filterMenu.debris.category'),
        tooltip: t7e('filterMenu.debris.tooltip'),
      },
      {
        id: 'unknownType',
        name: t7e('filterMenu.unknownType.name'),
        category: t7e('filterMenu.unknownType.category'),
        tooltip: t7e('filterMenu.unknownType.tooltip'),
      },
      {
        id: 'notionalSatellites',
        name: t7e('filterMenu.notionalSatellites.name'),
        category: t7e('filterMenu.notionalSatellites.category'),
        tooltip: t7e('filterMenu.notionalSatellites.tooltip'),
      },
      {
        id: 'agencies',
        name: t7e('filterMenu.agencies.name'),
        category: t7e('filterMenu.agencies.category'),
        tooltip: t7e('filterMenu.agencies.tooltip'),
        checked: false,
        disabled: true,
      },
      {
        id: 'vLEOSatellites',
        name: t7e('filterMenu.vleoSatellites.name'),
        category: t7e('filterMenu.vleoSatellites.category'),
        tooltip: t7e('filterMenu.vleoSatellites.tooltip'),
      },
      {
        id: 'lEOSatellites',
        name: t7e('filterMenu.leoSatellites.name'),
        category: t7e('filterMenu.leoSatellites.category'),
        tooltip: t7e('filterMenu.leoSatellites.tooltip'),
      },
      {
        id: 'hEOSatellites',
        name: t7e('filterMenu.heoSatellites.name'),
        category: t7e('filterMenu.heoSatellites.category'),
        tooltip: t7e('filterMenu.heoSatellites.tooltip'),
      },
      {
        id: 'mEOSatellites',
        name: t7e('filterMenu.meoSatellites.name'),
        category: t7e('filterMenu.meoSatellites.category'),
        tooltip: t7e('filterMenu.meoSatellites.tooltip'),
      },
      {
        id: 'gEOSatellites',
        name: t7e('filterMenu.geoSatellites.name'),
        category: t7e('filterMenu.geoSatellites.category'),
        tooltip: t7e('filterMenu.geoSatellites.tooltip'),
      },
      {
        id: 'xGEOSatellites',
        name: t7e('filterMenu.xgeoSatellites.name'),
        category: t7e('filterMenu.xgeoSatellites.category'),
        tooltip: t7e('filterMenu.xgeoSatellites.tooltip'),
      },
      {
        id: 'vimpelSatellites',
        name: t7e('filterMenu.vimpelSatellites.name'),
        category: t7e('filterMenu.source.category'),
        tooltip: t7e('filterMenu.vimpelSatellites.tooltip'),
      },
      {
        id: 'celestrakSatellites',
        name: t7e('filterMenu.celestrakSatellites.name'),
        category: t7e('filterMenu.source.category'),
        tooltip: t7e('filterMenu.celestrakSatellites.tooltip'),
      },
      {
        id: 'unitedStates',
        name: t7e('filterMenu.countries.unitedStates.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.unitedStates.tooltip'),
      },
      {
        id: 'unitedKingdom',
        name: t7e('filterMenu.countries.unitedKingdom.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.unitedKingdom.tooltip'),
      },
      {
        id: 'france',
        name: t7e('filterMenu.countries.france.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.france.tooltip'),
      },
      {
        id: 'germany',
        name: t7e('filterMenu.countries.germany.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.germany.tooltip'),
      },
      {
        id: 'japan',
        name: t7e('filterMenu.countries.japan.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.japan.tooltip'),
      },
      {
        id: 'china',
        name: t7e('filterMenu.countries.china.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.china.tooltip'),
      },
      {
        id: 'india',
        name: t7e('filterMenu.countries.india.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.india.tooltip'),
      },
      {
        id: 'russia',
        name: t7e('filterMenu.countries.russia.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.russia.tooltip'),
      },
      {
        id: 'uSSR',
        name: t7e('filterMenu.countries.ussr.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.ussr.tooltip'),
      },
      {
        id: 'southKorea',
        name: t7e('filterMenu.countries.southKorea.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.southKorea.tooltip'),
      },
      {
        id: 'australia',
        name: t7e('filterMenu.countries.australia.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.australia.tooltip'),
      },
      {
        id: 'otherCountries',
        name: t7e('filterMenu.countries.otherCountries.name'),
        category: t7e('filterMenu.countries.category'),
        tooltip: t7e('filterMenu.countries.otherCountries.tooltip'),
      },
      {
        id: 'starlinkSatellites',
        name: t7e('filterMenu.miscellaneous.starlinkSatellites.name'),
        category: t7e('filterMenu.miscellaneous.category'),
        tooltip: t7e('filterMenu.miscellaneous.starlinkSatellites.tooltip'),
      },
    ];
  }

  private static readonly FILTER_STORAGE_MAP: Record<string, StorageKey> = {
    payloads: StorageKey.FILTER_SETTINGS_PAYLOADS,
    rocketBodies: StorageKey.FILTER_SETTINGS_ROCKET_BODIES,
    debris: StorageKey.FILTER_SETTINGS_DEBRIS,
    unknownType: StorageKey.FILTER_SETTINGS_UNKNOWN_TYPE,
    agencies: StorageKey.FILTER_SETTINGS_AGENCIES,
    vLEOSatellites: StorageKey.FILTER_SETTINGS_VLEO,
    lEOSatellites: StorageKey.FILTER_SETTINGS_LEO,
    hEOSatellites: StorageKey.FILTER_SETTINGS_HEO,
    mEOSatellites: StorageKey.FILTER_SETTINGS_MEO,
    gEOSatellites: StorageKey.FILTER_SETTINGS_GEO,
    xGEOSatellites: StorageKey.FILTER_SETTINGS_X_GEO,
    vimpelSatellites: StorageKey.FILTER_SETTINGS_VIMPEL,
    celestrakSatellites: StorageKey.FILTER_SETTINGS_CELESTRAK,
    notionalSatellites: StorageKey.FILTER_SETTINGS_NOTIONAL,
    unitedStates: StorageKey.FILTER_SETTINGS_UNITED_STATES,
    unitedKingdom: StorageKey.FILTER_SETTINGS_UNITED_KINGDOM,
    france: StorageKey.FILTER_SETTINGS_FRANCE,
    germany: StorageKey.FILTER_SETTINGS_GERMANY,
    japan: StorageKey.FILTER_SETTINGS_JAPAN,
    china: StorageKey.FILTER_SETTINGS_CHINA,
    india: StorageKey.FILTER_SETTINGS_INDIA,
    russia: StorageKey.FILTER_SETTINGS_RUSSIA,
    uSSR: StorageKey.FILTER_SETTINGS_USSR,
    southKorea: StorageKey.FILTER_SETTINGS_SOUTH_KOREA,
    australia: StorageKey.FILTER_SETTINGS_AUSTRALIA,
    otherCountries: StorageKey.FILTER_SETTINGS_OTHER_COUNTRIES,
    starlinkSatellites: StorageKey.FILTER_SETTINGS_STARLINK,
  };

  // Legacy properties - will be removed after full migration
  bottomIconElementName: string = 'filter-menu-icon';
  bottomIconImg = filterPng;
  bottomIconLabel: string = 'Filter Menu';
  sideMenuElementName: string = 'filter-menu';
  sideMenuElementHtml: string = html`
  <div id="filter-menu" class="side-menu-parent start-hidden text-select">
    <div id="filter-content" class="side-menu">
      <div class="row">
        <form id="filter-form">
          <div id="filter-general">
            <div class="row center"></div>
            </br>
            <div class="row center">
              <button id="filter-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
            </div>
            ${this.generateFilterHtml()}
          </div>
        </form>
      </div>
    </div>
  </div>`;

  // Composition-based config methods
  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'filter-menu-icon',
      label: t7e('plugins.FilterMenuPlugin.bottomIconLabel'),
      image: filterPng,
      menuMode: [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'filter-menu',
      title: t7e('plugins.FilterMenuPlugin.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: {
        isDraggable: true,
        minWidth: 350,
      },
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.FilterMenuPlugin.title'),
      body: t7e('plugins.FilterMenuPlugin.helpBody'),
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'F',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  // Legacy bridge per CLAUDE.md
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  onBottomIconClick(): void {
    // Default toggle behavior handled by base class
  }

  private buildSideMenuHtml_(): string {
    return html`
    <div id="filter-menu" class="side-menu-parent start-hidden text-select">
      <div id="filter-content" class="side-menu">
        <div class="row">
          <form id="filter-form">
            <div id="filter-general">
              <div class="row center"></div>
              </br>
              <div class="row center">
                <button id="filter-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">
                  ${t7e('plugins.FilterMenuPlugin.resetToDefaults')} &#9658;
                </button>
              </div>
              ${this.generateFilterHtml()}
            </div>
          </form>
        </div>
      </div>
    </div>`;
  }

  private generateFilterHtml(): string {
    const categories: { [key: string]: Filters[] } = {};

    // Group filters by category
    FilterMenuPlugin.filters.forEach((filter) => {
      if (!categories[filter.category]) {
        categories[filter.category] = [];
      }
      categories[filter.category].push(filter);
    });

    // Generate HTML for each category and its filters
    return Object.entries(categories)
      .map(([category, filters]) => {
        const categoryHtml = KeepTrackPlugin.genH5Title_(category);
        const filtersHtml = filters
          .map(
            (filter) => {
              filter.id ??= FilterMenuPlugin.generateFilterId_(filter.name);
              filter.checked ??= settingsManager.filter[filter.id] ?? true;
              filter.tooltip ??= `Disable to hide ${filter.name}`;

              filter.cb ??= (e: Event) => {
                const checkbox = <HTMLInputElement>e.target;

                settingsManager.filter[filter.id as string] = checkbox.checked;
                ServiceLocator.getSoundManager()?.play(checkbox.checked ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
              };

              return html`
            <div class="switch row">
              <label data-position="top" data-delay="50" kt-tooltip="${filter.tooltip || ''}">
                <input id="filter-${filter.id}" type="checkbox" ${filter.checked ? 'checked' : ''} ${!filter.disabled ? '' : 'disabled'}/>
                <span class="lever"></span>
                ${filter.name}
              </label>
            </div>`;
            })
          .join('');


        return `${categoryHtml}<div class="filter-category">${filtersHtml}</div>`;
      })
      .join('');
  }

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerInit, this.uiManagerInitHtml_.bind(this));
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinalHtml_.bind(this));
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinalJs_.bind(this));
    EventBus.getInstance().on(EventBusEvent.saveSettings, this.saveSettings_.bind(this));
    EventBus.getInstance().on(EventBusEvent.loadSettings, this.loadSettings_.bind(this));
  }

  private uiManagerInitHtml_(): void {
    getEl(TopMenu.TOP_RIGHT_ID)?.insertAdjacentHTML('afterbegin', this.buildTopMenuButtonHtml_());
  }

  private uiManagerFinalHtml_(): void {
    getEl('filter-form')?.addEventListener('change', this.onFormChange_.bind(this));
    getEl('filter-reset')?.addEventListener('click', this.resetToDefaults.bind(this));
    getEl('top-menu-filter-btn')?.addEventListener('click', () => this.bottomMenuClicked());
  }

  private uiManagerFinalJs_(): void {
    this.syncOnLoad_();
  }

  private buildTopMenuButtonHtml_(): string {
    return html`
      <li id="top-menu-filter-li">
        <a id="top-menu-filter-btn" class="top-menu-icons">
          <div class="top-menu-icons bmenu-item-selected">
            <img id="top-menu-filter-btn-icon" src="" delayedsrc="${filterPng}" alt="" />
          </div>
        </a>
      </li>
    `;
  }
  private saveSettings_(): void {
    const persistence = PersistenceManager.getInstance();

    for (const [key, storageKey] of Object.entries(FilterMenuPlugin.FILTER_STORAGE_MAP)) {
      persistence.saveItem(storageKey, (settingsManager.filter[key] as boolean)?.toString() ?? 'true');
    }
  }

  private loadSettings_(): void {
    const persistence = PersistenceManager.getInstance();

    for (const [key, storageKey] of Object.entries(FilterMenuPlugin.FILTER_STORAGE_MAP)) {
      settingsManager.filter[key] = persistence.checkIfEnabled(storageKey, settingsManager.filter[key]);
    }
  }

  syncOnLoad_() {
    FilterMenuPlugin.filters.forEach(({ name, id, checked, disabled }) => {
      id ??= FilterMenuPlugin.generateFilterId_(name);
      const checkbox = <HTMLInputElement>getEl(`filter-${id}`);

      if (checkbox) {
        checkbox.checked = typeof settingsManager.filter[id] !== 'undefined' ? settingsManager.filter[id] : checked ?? !disabled;
        settingsManager.filter[id] = checkbox.checked;
      }
    });

    this.updateFilterUI_();
  }

  private updateFilterUI_() {
    if (this.checkIfDefaults()) {
      (getEl('filter-reset') as HTMLDivElement).setAttribute('disabled', 'true');
      hideEl('top-menu-filter-li');
    } else {
      (getEl('filter-reset') as HTMLDivElement).removeAttribute('disabled');
      showEl('top-menu-filter-li');
    }
  }

  private static generateFilterId_(name: string): string {
    return `${name.charAt(0).toLowerCase()}${name.slice(1).replace(/\s+/gu, '')}`;
  }

  private onFormChange_(e: Event) {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }

    const checkbox = <HTMLInputElement>e.target;
    const filterId = checkbox.id.replace('filter-', '');
    const filter = FilterMenuPlugin.filters.find((f) => f.id === filterId);

    if (filter?.cb) {
      filter.cb(e);
      this.saveSettings_();
    }

    settingsManager.filter[filterId] = checkbox.checked;

    this.updateFilterUI_();
  }

  checkIfDefaults() {
    const filterForm = <HTMLFormElement>getEl('filter-form');

    const checkboxes: NodeListOf<HTMLInputElement> = filterForm.querySelectorAll('input[type="checkbox"]');

    let allDefault = true;

    checkboxes.forEach((checkbox) => {
      const filterId = checkbox.id.replace('filter-', '');
      const filter = FilterMenuPlugin.filters.find((f) => f.id === filterId);

      if (filter && filter.checked !== checkbox.checked) {
        allDefault = false;
      }
    });

    return allDefault;
  }

  resetToDefaults() {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);
    const filterForm = <HTMLFormElement>getEl('filter-form');

    const checkboxes: NodeListOf<HTMLInputElement> = filterForm.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      const filterId = checkbox.id.replace('filter-', '');
      const filter = FilterMenuPlugin.filters.find((f) => f.id === filterId);

      if (filter) {
        checkbox.checked = filter.checked ?? !filter.disabled;
        settingsManager.filter[filterId] = checkbox.checked;
      }
    });


    this.saveSettings_();
    this.syncOnLoad_();
  }
}

