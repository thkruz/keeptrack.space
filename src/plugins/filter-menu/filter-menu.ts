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
import { PersistenceManager } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import filterPng from '@public/img/icons/filter.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { TopMenu } from '../top-menu/top-menu';
import {
  COUNTRY_FILTERS,
  defaultFilterValue,
  enableGroup,
  FILTER_STORAGE_MAP,
  Filters,
  FilterPluginSettings,
  getFilters,
  isDefaultState,
  OBJECT_TYPE_FILTERS,
  ORBITAL_REGIME_FILTERS,
  showOnlyInGroup,
  showOnlyPayloads,
  SOURCE_FILTERS,
} from './filter-menu-core';
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

// Re-export the plugin's public settings type from its core for backwards compatibility.
export type { FilterPluginSettings };

export class FilterMenuPlugin extends KeepTrackPlugin {
  readonly id = 'FilterMenuPlugin';
  dependencies_ = [TopMenu.name];

  /** Current text in the filter search box, preserved across re-opens. */
  private searchQuery_ = '';

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
        callback: () => this.applyPatch_(showOnlyPayloads()),
      },
      {
        id: 'FilterMenuPlugin.hideDebrisAndRocketBodies',
        label: cmd('hideDebrisAndRocketBodies'),
        category,
        callback: () => this.applyPatch_({ debris: false, rocketBodies: false }),
      },
      {
        id: 'FilterMenuPlugin.showAllObjectTypes',
        label: cmd('showAllObjectTypes'),
        category,
        callback: () => this.applyPatch_(enableGroup(OBJECT_TYPE_FILTERS, true)),
      },
      {
        id: 'FilterMenuPlugin.hideAllObjectTypes',
        label: cmd('hideAllObjectTypes'),
        category,
        callback: () => this.applyPatch_(enableGroup(OBJECT_TYPE_FILTERS, false)),
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
        callback: () => this.applyPatch_(showOnlyInGroup('lEOSatellites', ORBITAL_REGIME_FILTERS)),
      },
      {
        id: 'FilterMenuPlugin.showOnlyGEO',
        label: cmd('showOnlyGEO'),
        category,
        callback: () => this.applyPatch_(showOnlyInGroup('gEOSatellites', ORBITAL_REGIME_FILTERS)),
      },
      {
        id: 'FilterMenuPlugin.showAllOrbitalRegimes',
        label: cmd('showAllOrbitalRegimes'),
        category,
        callback: () => this.applyPatch_(enableGroup(ORBITAL_REGIME_FILTERS, true)),
      },

      // Source presets
      {
        id: 'FilterMenuPlugin.showOnlyCelestrak',
        label: cmd('showOnlyCelestrak'),
        category,
        callback: () => this.applyPatch_(showOnlyInGroup('celestrakSatellites', SOURCE_FILTERS)),
      },
      {
        id: 'FilterMenuPlugin.showAllSources',
        label: cmd('showAllSources'),
        category,
        callback: () => this.applyPatch_(enableGroup(SOURCE_FILTERS, true)),
      },

      // Country presets
      {
        id: 'FilterMenuPlugin.showOnlyUS',
        label: cmd('showOnlyUS'),
        category,
        callback: () => this.applyPatch_(showOnlyInGroup('unitedStates', COUNTRY_FILTERS)),
      },
      {
        id: 'FilterMenuPlugin.showOnlyRussia',
        label: cmd('showOnlyRussia'),
        category,
        callback: () => this.applyPatch_(showOnlyInGroup('russia', COUNTRY_FILTERS)),
      },
      {
        id: 'FilterMenuPlugin.showOnlyChina',
        label: cmd('showOnlyChina'),
        category,
        callback: () => this.applyPatch_(showOnlyInGroup('china', COUNTRY_FILTERS)),
      },
      {
        id: 'FilterMenuPlugin.showAllCountries',
        label: cmd('showAllCountries'),
        category,
        callback: () => this.applyPatch_(enableGroup(COUNTRY_FILTERS, true)),
      },
      {
        id: 'FilterMenuPlugin.hideAllCountries',
        label: cmd('hideAllCountries'),
        category,
        callback: () => this.applyPatch_(enableGroup(COUNTRY_FILTERS, false)),
      },
    ];
  }

  private buildSideMenuHtml_(): string {
    return html`
    <div id="filter-menu" class="side-menu-parent start-hidden kt-ui-v13">
      <div id="filter-content" class="side-menu">
        <form id="filter-form">
          <div class="filter-search-wrapper">
            <input id="filter-search" type="search" autocomplete="off"
              placeholder="${t7e('plugins.FilterMenuPlugin.searchPlaceholder')}" />
          </div>
          <div id="filter-sections">
            ${this.generateFilterHtml_()}
          </div>
          <button id="filter-reset" type="button" class="kt-action waves-effect">
            <span class="kt-action-label">${t7e('plugins.FilterMenuPlugin.resetToDefaults')}</span>
          </button>
        </form>
      </div>
    </div>`;
  }

  private generateFilterHtml_(): string {
    // Group filters by category, preserving the catalog's insertion order.
    const categories = new Map<string, Filters[]>();

    getFilters().forEach((filter) => {
      const group = categories.get(filter.category) ?? [];

      group.push(filter);
      categories.set(filter.category, group);
    });

    return [...categories.entries()]
      .map(([category, filters]) => {
        const rows = filters.map((filter) => this.buildFilterRow_(filter)).join('');

        return html`
          <section class="kt-section">
            <div class="kt-section-label">${category}</div>
            ${rows}
          </section>`;
      })
      .join('');
  }

  private buildFilterRow_(filter: Filters): string {
    const id = filter.id!;
    const checked = settingsManager.filter[id] ?? defaultFilterValue(filter);
    const tooltip = filter.tooltip ?? t7e('plugins.FilterMenuPlugin.defaultTooltip').replace('{name}', filter.name);

    return html`
      <div class="switch row">
        <label data-position="top" data-delay="50" kt-tooltip="${tooltip}">
          <input id="filter-${id}" type="checkbox" ${checked ? 'checked' : ''} ${filter.disabled ? 'disabled' : ''}/>
          <span class="lever"></span>
          ${filter.name}
        </label>
      </div>`;
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
    getEl('filter-search')?.addEventListener('input', this.onSearchInput_.bind(this));
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

    for (const [key, storageKey] of Object.entries(FILTER_STORAGE_MAP)) {
      persistence.saveItem(storageKey, (settingsManager.filter[key] as boolean)?.toString() ?? 'true');
    }
  }

  private loadSettings_(): void {
    const persistence = PersistenceManager.getInstance();

    for (const [key, storageKey] of Object.entries(FILTER_STORAGE_MAP)) {
      settingsManager.filter[key] = persistence.checkIfEnabled(storageKey, settingsManager.filter[key]);
    }
  }

  /**
   * Seed `settingsManager.filter` from persisted/default values and sync the
   * rendered checkboxes to match. `settingsManager.filter` is the source of
   * truth; the DOM only mirrors it.
   */
  syncOnLoad_(): void {
    getFilters().forEach((filter) => {
      const id = filter.id!;
      const value = settingsManager.filter[id] ?? defaultFilterValue(filter);

      // Seed every filter so the persisted state and the rendered checkboxes
      // match settingsManager.
      this.writeFilterValue_(id, value);
    });

    this.applySearchFilter_();
    this.updateFilterUI_();
  }

  /**
   * Write one filter's value to `settingsManager.filter`, mirror it onto the
   * rendered checkbox when present, and keep the legacy ground-site flags in
   * sync. Unconditional - used for load/reset seeding.
   */
  private writeFilterValue_(filterId: string, checked: boolean): void {
    settingsManager.filter[filterId] = checked;

    const checkbox = getEl(`filter-${filterId}`, true) as HTMLInputElement | null;

    if (checkbox) {
      checkbox.checked = checked;
    }

    // Bridge ground-site toggles to existing settings flags.
    if (filterId === 'groundSensors') {
      settingsManager.isDisableSensors = !checked;
    } else if (filterId === 'launchFacilities') {
      settingsManager.isDisableLaunchSites = !checked;
    }
  }

  /**
   * Set a user-driven filter value, ignoring any filters marked disabled so
   * presets and toggles can never enable them.
   */
  private setFilterValue_(filterId: string, checked: boolean): void {
    if (getFilters().find((f) => f.id === filterId)?.disabled) {
      return;
    }

    this.writeFilterValue_(filterId, checked);
  }

  /**
   * Apply a batch of filter changes, then play feedback, persist, and refresh.
   * Works whether or not the side menu is currently rendered, since state lives
   * on `settingsManager.filter`.
   */
  private applyPatch_(patch: Record<string, boolean>): void {
    for (const [filterId, checked] of Object.entries(patch)) {
      this.setFilterValue_(filterId, checked);
    }

    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    this.saveSettings_();
    this.updateFilterUI_();
  }

  private toggleFilter_(filterId: string): void {
    const filter = getFilters().find((f) => f.id === filterId);
    const current = settingsManager.filter[filterId] ?? (filter ? defaultFilterValue(filter) : true);
    const next = !current;

    this.setFilterValue_(filterId, next);
    ServiceLocator.getSoundManager()?.play(next ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
    this.saveSettings_();
    this.updateFilterUI_();
  }

  private onFormChange_(e: Event): void {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }

    const checkbox = e.target as HTMLInputElement;
    const filterId = checkbox.id.replace('filter-', '');

    this.setFilterValue_(filterId, checkbox.checked);
    ServiceLocator.getSoundManager()?.play(checkbox.checked ? SoundNames.TOGGLE_ON : SoundNames.TOGGLE_OFF);
    this.saveSettings_();
    this.updateFilterUI_();
  }

  private onSearchInput_(e: Event): void {
    this.searchQuery_ = (e.target as HTMLInputElement).value;
    this.applySearchFilter_();
  }

  /**
   * Narrow the visible toggles to those whose label contains the query, hiding
   * any card left with no matches. Substring match (no regex) so user input is
   * always a safe literal.
   */
  private applySearchFilter_(): void {
    const menu = getEl('filter-sections', true);

    if (!menu) {
      return;
    }

    const needle = this.searchQuery_.trim().toLowerCase();

    menu.querySelectorAll<HTMLElement>('.kt-section').forEach((section) => {
      let anyVisible = false;

      section.querySelectorAll<HTMLElement>('.switch.row').forEach((row) => {
        const isMatch = needle.length === 0 || (row.textContent ?? '').toLowerCase().includes(needle);

        row.style.display = isMatch ? '' : 'none';
        if (isMatch) {
          anyVisible = true;
        }
      });

      section.style.display = anyVisible ? '' : 'none';
    });
  }

  private updateFilterUI_(): void {
    const resetBtn = getEl('filter-reset', true);

    if (this.checkIfDefaults()) {
      resetBtn?.setAttribute('disabled', 'true');
      hideEl('top-menu-filter-li');
    } else {
      resetBtn?.removeAttribute('disabled');
      showEl('top-menu-filter-li');
    }

    EventBus.getInstance().emit(EventBusEvent.filterChanged);
  }

  checkIfDefaults(): boolean {
    return isDefaultState((id) => settingsManager.filter[id]);
  }

  resetToDefaults(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    getFilters().forEach((filter) => {
      this.writeFilterValue_(filter.id!, defaultFilterValue(filter));
    });

    this.saveSettings_();
    this.applySearchFilter_();
    this.updateFilterUI_();
  }
}
