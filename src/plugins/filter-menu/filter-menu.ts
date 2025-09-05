import { MenuMode } from '@app/engine/core/interfaces';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { keepTrackApi } from '@app/keepTrackApi';
import filterPng from '@public/img/icons/filter.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';
import { TopMenu } from '../top-menu/top-menu';

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

  static filters: Filters[] = [
    {
      name: 'Payloads',
      category: 'Object Types',
      tooltip: 'Objects that are primarily used to carry a payload, such as communication or weather satellites. This includes operational and defunct satellites.',
    },
    {
      name: 'Rocket Bodies',
      category: 'Object Types',
      tooltip: 'The upper stages of rockets that have delivered payloads to orbit and are now large pieces of space debris.',
    },
    {
      name: 'Debris',
      category: 'Object Types',
      tooltip: 'Fragments of spacecraft and rockets, including broken satellites, that are no longer one piece.',
    },
    {
      name: 'Unknown Type',
      category: 'Object Types',
      tooltip: 'Objects in orbit whose purpose or type is not clearly identified yet.',
    },
    {
      name: 'Notional Satellites',
      category: 'Object Types',
      tooltip: 'Satellites that are planned or proposed but not yet launched.',
    },
    {
      name: 'Agencies',
      category: 'Object Types',
      tooltip: 'Planned feature - This will show agencies on the globe.',
      checked: false,
      disabled: true,
    },
    {
      name: 'vLEO Satellites',
      category: 'Orbital Regimes',
      tooltip: 'Very Low Earth Orbit satellites with an apogee below 400 km.',
    },
    {
      name: 'LEO Satellites',
      category: 'Orbital Regimes',
      tooltip: 'Low Earth Orbit satellites with an apogee between 400 km and 6000 km.',
    },
    {
      name: 'HEO Satellites',
      category: 'Orbital Regimes',
      tooltip: 'Highly Elliptical Orbit satellites with an eccentricity of 0.1 or greater and an apogee below 39786 km.',
    },
    {
      name: 'MEO Satellites',
      category: 'Orbital Regimes',
      tooltip: 'Medium Earth Orbit satellites with an apogee between 6000 km and 34786 km.',
    },
    {
      name: 'GEO Satellites',
      category: 'Orbital Regimes',
      tooltip: 'Geostationary Orbit satellites with an eccentricity below 0.1 and an apogee between 34786 km and 36786 km.',
    },
    {
      name: 'xGEO Satellites',
      category: 'Orbital Regimes',
      tooltip: 'Ex-Geosynchronous Orbit satellites with an eccentricity below 0.1 and an apogee above 36786 km, or an eccentricity of 0.1 or greater and an apogee above 39786 km.',
    },
    {
      name: 'Vimpel Satellites',
      category: 'Source',
      tooltip: 'Vimpel satellite catalog is maintained by the Russian joint-stock company JSC Vimpel, in cooperation with the Keldysh Institute of Applied Mathematics.',
    },
    {
      name: 'Celestrak Satellites',
      category: 'Source',
      tooltip: 'Celestrak is a popular source for satellite orbital data, providing TLEs for a wide range of satellites and debris.',
    },
    {
      name: 'United States',
      category: 'Countries',
      tooltip: 'Includes satellites from the United States of America.',
    },
    {
      name: 'United Kingdom',
      category: 'Countries',
      tooltip: 'Includes satellites from the United Kingdom.',
    },
    {
      name: 'France',
      category: 'Countries',
      tooltip: 'Includes satellites from France.',
    },
    {
      name: 'Germany',
      category: 'Countries',
      tooltip: 'Includes satellites from Germany.',
    },
    {
      name: 'Japan',
      category: 'Countries',
      tooltip: 'Includes satellites from Japan.',
    },
    {
      name: 'China',
      category: 'Countries',
      tooltip: 'Includes satellites from China.',
    },
    {
      name: 'India',
      category: 'Countries',
      tooltip: 'Includes satellites from India.',
    },
    {
      name: 'Russia',
      category: 'Countries',
      tooltip: 'Includes satellites from Russia.',
    },
    {
      name: 'USSR',
      category: 'Countries',
      tooltip: 'Historical designation for satellites launched by the former Soviet Union.',
    },
    {
      name: 'South Korea',
      category: 'Countries',
      tooltip: 'Includes satellites from South Korea.',
    },
    {
      name: 'Australia',
      category: 'Countries',
      tooltip: 'Includes satellites from Australia.',
    },
    {
      name: 'Other Countries',
      category: 'Countries',
      tooltip: 'Includes satellites from countries not listed above.',
    },
    {
      name: 'Starlink Satellites',
      category: 'Miscellaneous',
      tooltip: 'Satellites that are part of SpaceX\'s Starlink constellation, which aims to provide global broadband internet coverage.',
    },
  ];

  bottomIconElementName: string = 'filter-menu-icon';
  bottomIconImg = filterPng;
  bottomIconLabel: string = 'Filter Menu';
  sideMenuElementName: string = 'filter-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
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
                keepTrackApi.getSoundManager()?.play(checkbox.checked ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
              };

              return keepTrackApi.html`
            <div class="switch row">
              <label data-position="top" data-delay="50" kt-tooltip="${filter.tooltip || ''}">
                <input id="filter-${filter.id}" type="checkbox" ${filter.checked ? 'checked' : ''} ${!filter.disabled ? '' : 'disabled'}/>
                <span class="lever"></span>
                ${filter.name}
              </label>
            </div>`;
            })
          .join('');


        // TODO: Move this to a CSS class
        return `${categoryHtml}<div style="padding-top: 0.5rem;">${filtersHtml}</div>`;
      })
      .join('');
  }

  isNotColorPickerInitialSetup = false;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('filter-form')?.addEventListener('change', this.onFormChange_.bind(this));
        getEl('filter-reset')?.addEventListener('click', this.resetToDefaults.bind(this));
      },
    );

    keepTrackApi.on(
      EventBusEvent.uiManagerInit,
      () => {
        getEl('nav-mobile2')?.insertAdjacentHTML(
          'afterbegin',
          keepTrackApi.html`
            <li id="top-menu-filter-li">
              <a id="top-menu-filter-btn" class="top-menu-icons">
                <div class="top-menu-icons bmenu-item-selected">
                  <img id="top-menu-filter-btn-icon"
                  src="" delayedsrc="${filterPng}" alt="" />
                </div>
              </a>
            </li>
          `,
        );
      },
    );

    keepTrackApi.on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('top-menu-filter-btn')?.addEventListener('click', () => {
          this.bottomMenuClicked();
        });
      },
    );
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.on(
      EventBusEvent.uiManagerFinal,
      () => {
        this.syncOnLoad_();
      },
    );

    keepTrackApi.on(EventBusEvent.saveSettings, this.saveSettings_.bind(this));
    keepTrackApi.on(EventBusEvent.loadSettings, this.loadSettings_.bind(this));
  }
  private saveSettings_() {
    const persistenceManagerInstance = PersistenceManager.getInstance();

    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_PAYLOADS, (settingsManager.filter.payloads as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_ROCKET_BODIES, (settingsManager.filter.rocketBodies as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_DEBRIS, (settingsManager.filter.debris as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_UNKNOWN_TYPE, (settingsManager.filter.unknownType as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_AGENCIES, (settingsManager.filter.agencies as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_VLEO, (settingsManager.filter.vLEOSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_LEO, (settingsManager.filter.lEOSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_HEO, (settingsManager.filter.hEOSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_MEO, (settingsManager.filter.mEOSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_GEO, (settingsManager.filter.gEOSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_X_GEO, (settingsManager.filter.xGEOSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_VIMPEL, (settingsManager.filter.vimpelSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_CELESTRAK, (settingsManager.filter.celestrakSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_NOTIONAL, (settingsManager.filter.notionalSatellites as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_UNITED_STATES, (settingsManager.filter.unitedStates as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_UNITED_KINGDOM, (settingsManager.filter.unitedKingdom as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_FRANCE, (settingsManager.filter.france as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_GERMANY, (settingsManager.filter.germany as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_JAPAN, (settingsManager.filter.japan as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_CHINA, (settingsManager.filter.china as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_INDIA, (settingsManager.filter.india as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_RUSSIA, (settingsManager.filter.russia as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_USSR, (settingsManager.filter.uSSR as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_SOUTH_KOREA, (settingsManager.filter.southKorea as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_AUSTRALIA, (settingsManager.filter.australia as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_OTHER_COUNTRIES, (settingsManager.filter.otherCountries as boolean)?.toString() ?? 'true');
    persistenceManagerInstance.saveItem(StorageKey.FILTER_SETTINGS_STARLINK, (settingsManager.filter.starlinkSatellites as boolean)?.toString() ?? 'true');
  }

  private loadSettings_() {
    const persistenceManagerInstance = PersistenceManager.getInstance();

    settingsManager.filter.payloads = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_PAYLOADS, settingsManager.filter.payloads);
    settingsManager.filter.rocketBodies = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_ROCKET_BODIES, settingsManager.filter.rocketBodies);
    settingsManager.filter.debris = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_DEBRIS, settingsManager.filter.debris);
    settingsManager.filter.unknownType = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_UNKNOWN_TYPE, settingsManager.filter.unknownType);
    settingsManager.filter.agencies = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_AGENCIES, settingsManager.filter.agencies);
    settingsManager.filter.vLEOSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_VLEO, settingsManager.filter.vLEOSatellites);
    settingsManager.filter.lEOSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_LEO, settingsManager.filter.lEOSatellites);
    settingsManager.filter.hEOSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_HEO, settingsManager.filter.hEOSatellites);
    settingsManager.filter.mEOSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_MEO, settingsManager.filter.mEOSatellites);
    settingsManager.filter.gEOSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_GEO, settingsManager.filter.gEOSatellites);
    settingsManager.filter.xGEOSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_X_GEO, settingsManager.filter.xGEOSatellites);
    settingsManager.filter.vimpelSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_VIMPEL, settingsManager.filter.vimpelSatellites);
    settingsManager.filter.celestrakSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_CELESTRAK, settingsManager.filter.celestrakSatellites);
    settingsManager.filter.notionalSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_NOTIONAL, settingsManager.filter.notionalSatellites);
    settingsManager.filter.unitedStates = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_UNITED_STATES, settingsManager.filter.unitedStates);
    settingsManager.filter.unitedKingdom = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_UNITED_KINGDOM, settingsManager.filter.unitedKingdom);
    settingsManager.filter.france = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_FRANCE, settingsManager.filter.france);
    settingsManager.filter.germany = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_GERMANY, settingsManager.filter.germany);
    settingsManager.filter.japan = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_JAPAN, settingsManager.filter.japan);
    settingsManager.filter.china = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_CHINA, settingsManager.filter.china);
    settingsManager.filter.india = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_INDIA, settingsManager.filter.india);
    settingsManager.filter.russia = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_RUSSIA, settingsManager.filter.russia);
    settingsManager.filter.uSSR = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_USSR, settingsManager.filter.uSSR);
    settingsManager.filter.southKorea = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_SOUTH_KOREA, settingsManager.filter.southKorea);
    settingsManager.filter.australia = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_AUSTRALIA, settingsManager.filter.australia);
    settingsManager.filter.otherCountries = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_OTHER_COUNTRIES, settingsManager.filter.otherCountries);
    settingsManager.filter.starlinkSatellites = persistenceManagerInstance.checkIfEnabled(StorageKey.FILTER_SETTINGS_STARLINK, settingsManager.filter.starlinkSatellites);
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
    const filterId = checkbox.id;
    const filter = FilterMenuPlugin.filters.find((f) => f.id === filterId.replace('filter-', ''));

    if (filter && filter.cb) {
      filter.cb(e);
      this.saveSettings_();
    }

    this.updateFilterUI_();
  }

  checkIfDefaults() {
    const filterForm = <HTMLFormElement>getEl('filter-form');

    const checkboxes = filterForm.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

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
    keepTrackApi.getSoundManager()?.play(SoundNames.BUTTON_CLICK);
    const filterForm = <HTMLFormElement>getEl('filter-form');

    const checkboxes = filterForm.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

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

