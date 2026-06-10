import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  IBottomIconConfig,
  ICommandPaletteCommand,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import filterPng from '@public/img/icons/filter.png';
import restorePng from '@public/img/icons/restore.png';
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
  operationalPayloads?: boolean;
  nonOperationalPayloads?: boolean;
  rocketBodies?: boolean;
  debris?: boolean;
  unknownType?: boolean;
  agencies?: boolean;
  groundSensors?: boolean;
  launchFacilities?: boolean;
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
  celestrakSupSatellites?: boolean;
  satnogsSatellites?: boolean;
  notionalSatellites?: boolean;
}

interface Filters {
  name: string;
  category: string;
  id?: string;
  tooltip?: string;
  checked?: boolean;
  disabled?: boolean;
}

export class FilterMenuPlugin extends KeepTrackPlugin {
  readonly id = 'FilterMenuPlugin';
  dependencies_ = [TopMenu.name];

  static get filters(): Filters[] {
    return [
      {
        id: 'operationalPayloads',
        name: t7e('filterMenu.operationalPayloads.name'),
        category: t7e('filterMenu.operationalPayloads.category'),
        tooltip: t7e('filterMenu.operationalPayloads.tooltip'),
      },
      {
        id: 'nonOperationalPayloads',
        name: t7e('filterMenu.nonOperationalPayloads.name'),
        category: t7e('filterMenu.nonOperationalPayloads.category'),
        tooltip: t7e('filterMenu.nonOperationalPayloads.tooltip'),
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
        id: 'groundSensors',
        name: t7e('filterMenu.groundSensors.name'),
        category: t7e('filterMenu.groundSensors.category'),
        tooltip: t7e('filterMenu.groundSensors.tooltip'),
      },
      {
        id: 'launchFacilities',
        name: t7e('filterMenu.launchFacilities.name'),
        category: t7e('filterMenu.launchFacilities.category'),
        tooltip: t7e('filterMenu.launchFacilities.tooltip'),
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
      ...(settingsManager.isEnableJscCatalog ? [
        {
          id: 'vimpelSatellites',
          name: t7e('filterMenu.vimpelSatellites.name'),
          category: t7e('filterMenu.source.category'),
          tooltip: t7e('filterMenu.vimpelSatellites.tooltip'),
        },
      ] : []),
      {
        id: 'celestrakSatellites',
        name: t7e('filterMenu.celestrakSatellites.name'),
        category: t7e('filterMenu.source.category'),
        tooltip: t7e('filterMenu.celestrakSatellites.tooltip'),
      },
      {
        id: 'celestrakSupSatellites',
        name: t7e('filterMenu.celestrakSupSatellites.name'),
        category: t7e('filterMenu.source.category'),
        tooltip: t7e('filterMenu.celestrakSupSatellites.tooltip'),
      },
      {
        id: 'satnogsSatellites',
        name: t7e('filterMenu.satnogsSatellites.name'),
        category: t7e('filterMenu.source.category'),
        tooltip: t7e('filterMenu.satnogsSatellites.tooltip'),
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
    operationalPayloads: StorageKey.FILTER_SETTINGS_OPERATIONAL_PAYLOADS,
    nonOperationalPayloads: StorageKey.FILTER_SETTINGS_NON_OPERATIONAL_PAYLOADS,
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
    celestrakSupSatellites: StorageKey.FILTER_SETTINGS_CELESTRAK_SUP,
    satnogsSatellites: StorageKey.FILTER_SETTINGS_SATNOGS,
    notionalSatellites: StorageKey.FILTER_SETTINGS_NOTIONAL,
    groundSensors: StorageKey.FILTER_SETTINGS_GROUND_SENSORS,
    launchFacilities: StorageKey.FILTER_SETTINGS_LAUNCH_FACILITIES,
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

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'filter-menu-icon',
      label: t7e('plugins.FilterMenuPlugin.bottomIconLabel'),
      image: filterPng,
      menuMode: [MenuMode.SETTINGS, MenuMode.ALL],
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
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.FilterMenuPlugin.help.overview'),
          image: {
            src: 'img/help/filter-menu/filter-menu.png',
            alt: t7e('plugins.FilterMenuPlugin.help.imgAlt'),
            caption: t7e('plugins.FilterMenuPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.FilterMenuPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.FilterMenuPlugin.help.tip1'),
        t7e('plugins.FilterMenuPlugin.help.tip2'),
      ],
      shortcuts: [{ keys: ['F'], description: t7e('plugins.FilterMenuPlugin.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'f',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const cmd = (key: string) => t7e(`plugins.FilterMenuPlugin.commands.${key}` as Parameters<typeof t7e>[0]);
    const category = cmd('category');

    return [
      // General
      {
        id: 'FilterMenuPlugin.open',
        label: cmd('open'),
        category,
        shortcutHint: 'F',
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'FilterMenuPlugin.resetDefaults',
        label: cmd('resetDefaults'),
        category,
        callback: () => this.resetToDefaults(),
      },

      // Object type toggles
      {
        id: 'FilterMenuPlugin.toggleDebris',
        label: cmd('toggleDebris'),
        category,
        callback: () => this.toggleFilter_('debris'),
      },
      {
        id: 'FilterMenuPlugin.toggleRocketBodies',
        label: cmd('toggleRocketBodies'),
        category,
        callback: () => this.toggleFilter_('rocketBodies'),
      },
      {
        id: 'FilterMenuPlugin.toggleUnknownType',
        label: cmd('toggleUnknownType'),
        category,
        callback: () => this.toggleFilter_('unknownType'),
      },
      {
        id: 'FilterMenuPlugin.toggleNotional',
        label: cmd('toggleNotional'),
        category,
        callback: () => this.toggleFilter_('notionalSatellites'),
      },
      {
        id: 'FilterMenuPlugin.toggleStarlink',
        label: cmd('toggleStarlink'),
        category,
        callback: () => this.toggleFilter_('starlinkSatellites'),
      },

      // Object type presets
      {
        id: 'FilterMenuPlugin.showOnlyPayloads',
        label: cmd('showOnlyPayloads'),
        category,
        callback: () => this.showOnlyPayloads_(),
      },
      {
        id: 'FilterMenuPlugin.hideDebrisAndRocketBodies',
        label: cmd('hideDebrisAndRocketBodies'),
        category,
        callback: () => this.setFilters_({ debris: false, rocketBodies: false }),
      },
      {
        id: 'FilterMenuPlugin.showAllObjectTypes',
        label: cmd('showAllObjectTypes'),
        category,
        callback: () => this.enableGroup_(FilterMenuPlugin.OBJECT_TYPE_FILTERS_, true),
      },

      // Orbital regime toggles
      {
        id: 'FilterMenuPlugin.toggleLEO',
        label: cmd('toggleLEO'),
        category,
        callback: () => this.toggleFilter_('lEOSatellites'),
      },
      {
        id: 'FilterMenuPlugin.toggleMEO',
        label: cmd('toggleMEO'),
        category,
        callback: () => this.toggleFilter_('mEOSatellites'),
      },
      {
        id: 'FilterMenuPlugin.toggleGEO',
        label: cmd('toggleGEO'),
        category,
        callback: () => this.toggleFilter_('gEOSatellites'),
      },
      {
        id: 'FilterMenuPlugin.toggleHEO',
        label: cmd('toggleHEO'),
        category,
        callback: () => this.toggleFilter_('hEOSatellites'),
      },

      // Orbital regime presets
      {
        id: 'FilterMenuPlugin.showOnlyLEO',
        label: cmd('showOnlyLEO'),
        category,
        callback: () => this.showOnlyInGroup_('lEOSatellites', FilterMenuPlugin.ORBITAL_REGIME_FILTERS_),
      },
      {
        id: 'FilterMenuPlugin.showOnlyGEO',
        label: cmd('showOnlyGEO'),
        category,
        callback: () => this.showOnlyInGroup_('gEOSatellites', FilterMenuPlugin.ORBITAL_REGIME_FILTERS_),
      },
      {
        id: 'FilterMenuPlugin.showAllOrbitalRegimes',
        label: cmd('showAllOrbitalRegimes'),
        category,
        callback: () => this.enableGroup_(FilterMenuPlugin.ORBITAL_REGIME_FILTERS_, true),
      },

      // Country presets
      {
        id: 'FilterMenuPlugin.showOnlyUS',
        label: cmd('showOnlyUS'),
        category,
        callback: () => this.showOnlyInGroup_('unitedStates', FilterMenuPlugin.COUNTRY_FILTERS_),
      },
      {
        id: 'FilterMenuPlugin.showOnlyRussia',
        label: cmd('showOnlyRussia'),
        category,
        callback: () => this.showOnlyInGroup_('russia', FilterMenuPlugin.COUNTRY_FILTERS_),
      },
      {
        id: 'FilterMenuPlugin.showOnlyChina',
        label: cmd('showOnlyChina'),
        category,
        callback: () => this.showOnlyInGroup_('china', FilterMenuPlugin.COUNTRY_FILTERS_),
      },
      {
        id: 'FilterMenuPlugin.showAllCountries',
        label: cmd('showAllCountries'),
        category,
        callback: () => this.enableGroup_(FilterMenuPlugin.COUNTRY_FILTERS_, true),
      },
      {
        id: 'FilterMenuPlugin.hideAllCountries',
        label: cmd('hideAllCountries'),
        category,
        callback: () => this.enableGroup_(FilterMenuPlugin.COUNTRY_FILTERS_, false),
      },
    ];
  }

  private buildSideMenuHtml_(): string {
    return html`
    <div class="row">
      <form id="filter-form">
        <div id="filter-general">
          <div class="row filter-reset-row">
            <button id="filter-reset" class="btn btn-ui waves-effect waves-light icon-btn"
              type="button" kt-tooltip="${t7e('plugins.FilterMenuPlugin.resetToDefaults')}">
              <img src="${restorePng}" class="icon-btn-img" alt="" />
            </button>
          </div>
          ${this.generateFilterHtml()}
        </div>
      </form>
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
              filter.tooltip ??= t7e('plugins.FilterMenuPlugin.defaultTooltip').replace('{name}', filter.name);

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

        // Bridge ground-site toggles to existing settings flags
        if (id === 'groundSensors') {
          settingsManager.isDisableSensors = !checkbox.checked;
        } else if (id === 'launchFacilities') {
          settingsManager.isDisableLaunchSites = !checkbox.checked;
        }
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

    EventBus.getInstance().emit(EventBusEvent.filterChanged);
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

    settingsManager.filter[filterId] = checkbox.checked;

    // Bridge ground-site toggles to existing settings flags
    if (filterId === 'groundSensors') {
      settingsManager.isDisableSensors = !checkbox.checked;
    } else if (filterId === 'launchFacilities') {
      settingsManager.isDisableLaunchSites = !checkbox.checked;
    }

    ServiceLocator.getSoundManager()?.play(checkbox.checked ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
    this.saveSettings_();
    this.updateFilterUI_();
  }

  checkIfDefaults() {
    const filterForm = <HTMLFormElement>getEl('filter-form');

    const checkboxes: NodeListOf<HTMLInputElement> = filterForm.querySelectorAll('input[type="checkbox"]');

    let allDefault = true;

    checkboxes.forEach((checkbox) => {
      const filterId = checkbox.id.replace('filter-', '');
      const filter = FilterMenuPlugin.filters.find((f) => f.id === filterId);

      if (filter) {
        const defaultChecked = filter.checked ?? !filter.disabled;

        if (defaultChecked !== checkbox.checked) {
          allDefault = false;
        }
      }
    });

    return allDefault;
  }

  private static readonly OBJECT_TYPE_FILTERS_ = [
    'operationalPayloads', 'nonOperationalPayloads', 'rocketBodies', 'debris',
    'unknownType', 'notionalSatellites', 'groundSensors', 'launchFacilities',
  ];
  private static readonly ORBITAL_REGIME_FILTERS_ = ['vLEOSatellites', 'lEOSatellites', 'mEOSatellites', 'gEOSatellites', 'hEOSatellites', 'xGEOSatellites'];
  private static readonly COUNTRY_FILTERS_ = [
    'unitedStates', 'unitedKingdom', 'france', 'germany', 'japan',
    'china', 'india', 'russia', 'uSSR', 'southKorea', 'australia', 'otherCountries',
  ];

  private toggleFilter_(filterId: string): void {
    const checkbox = <HTMLInputElement>getEl(`filter-${filterId}`);

    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      settingsManager.filter[filterId] = checkbox.checked;
      ServiceLocator.getSoundManager()?.play(checkbox.checked ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
      this.saveSettings_();
      this.updateFilterUI_();
    }
  }

  private setFilters_(settings: Record<string, boolean>): void {
    for (const [filterId, checked] of Object.entries(settings)) {
      const checkbox = <HTMLInputElement>getEl(`filter-${filterId}`);

      if (checkbox && !checkbox.disabled) {
        checkbox.checked = checked;
        settingsManager.filter[filterId] = checked;
      }
    }
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    this.saveSettings_();
    this.updateFilterUI_();
  }

  private showOnlyInGroup_(targetId: string, groupIds: string[]): void {
    const settings: Record<string, boolean> = {};

    for (const id of groupIds) {
      settings[id] = id === targetId;
    }
    this.setFilters_(settings);
  }

  private enableGroup_(groupIds: string[], enabled: boolean): void {
    const settings: Record<string, boolean> = {};

    for (const id of groupIds) {
      settings[id] = enabled;
    }
    this.setFilters_(settings);
  }

  private showOnlyPayloads_(): void {
    const settings: Record<string, boolean> = {};

    for (const id of FilterMenuPlugin.OBJECT_TYPE_FILTERS_) {
      settings[id] = id === 'operationalPayloads' || id === 'nonOperationalPayloads';
    }
    this.setFilters_(settings);
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

        // Bridge ground-site toggles to existing settings flags
        if (filterId === 'groundSensors') {
          settingsManager.isDisableSensors = !checkbox.checked;
        } else if (filterId === 'launchFacilities') {
          settingsManager.isDisableLaunchSites = !checkbox.checked;
        }
      }
    });

    this.saveSettings_();
    this.syncOnLoad_();
  }
}

