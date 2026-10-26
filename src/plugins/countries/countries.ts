import { buildCountryCodeGroups, countryFlagIconMap, getCountryDisplayName } from '@app/app/data/catalogs/countries';
import { GroupType, getCountryGroupValues } from '@app/app/data/object-group';
import { SearchResult, SearchResultType } from '@app/app/ui/search-manager';
import { StringExtractor } from '@app/app/ui/string-extractor';
import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCapable,
  ICommandPaletteCommand,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import flagPng from '@public/img/icons/flag.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { TopMenu } from '../top-menu/top-menu';
import './countries.css';

/**
 * Countries Menu Plugin
 *
 * This plugin adds a side menu that allows users to filter satellites by country.
 * Unlike the filter menu, this menu creates groups based on countries, enabling users to
 * view all satellites from a specific country in one go.
 *
 * Selected countries are stored as groups, and populate the search box with the corresponding satellite SCC numbers.
 *
 * Usage:
 * 1. Click on the flag icon in the bottom menu to open the Countries Menu.
 * 2. Select a country from the list to filter satellites by that country.
 * 3. The search box will be populated with the SCC numbers of the satellites from the selected country.
 * 4. The menu stays open and marks the picked country; Clear drops the pick (group and search).
 */
export class CountriesMenu extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'CountriesMenu';
  dependencies_ = [TopMenu.name];

  /** `data-group` of the country picked from this plugin, or null. Verified against the selected group on refresh. */
  private selectedDataGroup_: string | null = null;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-countries',
      label: t7e('plugins.CountriesMenu.bottomIconLabel'),
      image: flagPng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'countries-menu',
      title: t7e('plugins.CountriesMenu.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 200,
      maxWidth: 400,
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div id="countries-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="country-menu" class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${t7e('plugins.CountriesMenu.labels.filterByCountry')}</div>
            <button type="button" id="countries-clear-btn" class="kt-action waves-effect countries-clear" disabled>
              <span class="kt-action-label">${t7e('plugins.CountriesMenu.labels.clear')}</span>
            </button>
            <div class="kt-divider"></div>
            <div id="country-list" class="country-list">
            </div>
          </section>
        </div>
      </div>
    `;
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'O',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.CountriesMenu.bottomIconLabel');

    // Same rows as the menu list, so a palette pick and a list pick select the same group.
    return this.buildCountryRows_().map(({ country, dataGroup }) => ({
      id: `CountriesMenu.selectCountry.${dataGroup}`,
      label: t7e('plugins.CountriesMenu.commands.selectCountry').replace('{country}', country),
      category,
      callback: () => this.countryMenuClick_(dataGroup),
    }));
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.CountriesMenu.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.CountriesMenu.help.overview'),
          image: {
            src: 'img/help/countries/countries-menu.png',
            alt: t7e('plugins.CountriesMenu.help.imgAlt'),
            caption: t7e('plugins.CountriesMenu.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.CountriesMenu.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.CountriesMenu.help.tip1'), t7e('plugins.CountriesMenu.help.tip2')],
      shortcuts: [{ keys: ['O'], description: t7e('plugins.CountriesMenu.help.shortcutToggle') }],
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addHtml(): void {
    super.addHtml();

    const eventBus = EventBus.getInstance();

    eventBus.on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
    // Any other search (typed, emptied, closed) replaces or clears the selected group.
    eventBus.on(EventBusEvent.searchUpdated, () => this.refreshSelectedMarker_());
    eventBus.on(EventBusEvent.catalogReloaded, () => this.refreshSelectedMarker_());
  }

  onBottomIconClick(): void {
    this.refreshSelectedMarker_();
  }

  private uiManagerFinal_(): void {
    const countryListEl = getEl('country-list', true);
    const countryMenuEl = getEl('country-menu', true);

    if (!countryListEl || !countryMenuEl) {
      return;
    }

    countryListEl.innerHTML = this.generateCountryList_();

    countryMenuEl.querySelectorAll('.country-option').forEach((element) => {
      element.addEventListener('click', () => {
        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
        this.countryMenuClick_((element as HTMLElement).dataset.group ?? '');
      });
    });

    getEl('countries-clear-btn', true)?.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      this.clearCountry_();
    });

    this.refreshSelectedMarker_();
  }

  /**
   * One row per country display name, for the menu list and the palette: the shared grouping
   * (same as Find Satellite's Country filter) plus the catalog values no shared entry claims.
   * Each row's chip count uses the value set the COUNTRY group filters on, so it equals the group
   * size. Countries with no objects in the loaded catalog are left out.
   */
  private buildCountryRows_(): { country: string; codes: string[]; dataGroup: string; satCount: number }[] {
    const countByValue: Record<string, number> = {};

    ServiceLocator.getCatalogManager()
      .getSats()
      .forEach((sat) => {
        if (sat.country && sat.country !== 'ANALSAT') {
          countByValue[sat.country] = (countByValue[sat.country] ?? 0) + 1;
        }
      });

    // Rows keyed by display label. The shared grouping (same as Find Satellite's Country filter)
    // merges entries that share a name and adds the region's alias codes, so Luxembourg is one row.
    const codesByLabel = new Map<string, Set<string>>();
    const coveredValues = new Set<string>();

    buildCountryCodeGroups().forEach(({ label, codes }) => {
      codesByLabel.set(label, new Set(codes));
      getCountryGroupValues(codes.join('|')).forEach((value) => {
        coveredValues.add(value);
      });
    });

    // Catalog values no shared entry claims (codes only in the name map, unmapped codes) group by
    // their name as before: unmapped codes form the Unknown row. A name that matches a shared row joins it.
    Object.keys(countByValue).forEach((value) => {
      if (coveredValues.has(value)) {
        return;
      }
      const label = getCountryDisplayName(StringExtractor.extractCountry(value));
      const codes = codesByLabel.get(label) ?? new Set<string>();

      codes.add(value);
      codesByLabel.set(label, codes);
    });

    return [...codesByLabel.entries()]
      .map(([country, codeSet]) => {
        const codes = [...codeSet];
        const dataGroup = codes.join('|');
        // Count with the same value set the COUNTRY group filters on, so the chip equals the group size.
        let satCount = 0;

        getCountryGroupValues(dataGroup).forEach((value) => {
          satCount += countByValue[value] ?? 0;
        });

        return { country, codes, dataGroup, satCount };
      })
      .filter(({ satCount }) => satCount > 0)
      .sort((a, b) => a.country.localeCompare(b.country));
  }

  /**
   * One full-width v13 action row per country, all codes merged by '|'. The flag + name live in
   * the .kt-action-label so the count chip rides next to the chevron.
   */
  private generateCountryList_(): string {
    return this.buildCountryRows_().reduce((acc, { country, codes, dataGroup, satCount }) => {
      const flagCode = countryFlagIconMap[codes[0]] ?? 'unknown';
      const flagClass = `fi fi-${flagCode.toLowerCase()}`;

      return (
        `${acc}<button type="button" class="kt-action waves-effect country-option" data-group="${dataGroup}" aria-pressed="false">` +
        '<span class="kt-action-label">' +
        `<span class="${flagClass} country-flag"></span>` +
        `<span class="country-name">${country}</span>` +
        '</span>' +
        `<span class="country-count">${satCount.toLocaleString()}</span>` +
        '</button>'
      );
    }, '');
  }

  private countryMenuClick_(countryCode: string): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    if (countryCode === '') {
      throw new Error('Unknown country code');
    }

    if (!groupManagerInstance.groupList[countryCode]) {
      groupManagerInstance.createGroup(GroupType.COUNTRY, countryCode, countryCode);
    }

    this.groupSelected_(countryCode);
  }

  private groupSelected_(groupName: string): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const uiManagerInstance = ServiceLocator.getUiManager();

    const searchDOM = <HTMLInputElement>getEl('search');

    if (typeof groupName === 'undefined') {
      return;
    }
    if (typeof groupManagerInstance.groupList[groupName] === 'undefined') {
      return;
    }
    groupManagerInstance.selectGroup(groupManagerInstance.groupList[groupName]);

    // Members without a NORAD number (JSC Vimpel) would write blank tokens into the search box.
    searchDOM.value = groupManagerInstance.groupList[groupName].ids
      .map((id: number) => catalogManagerInstance.getSat(id)?.sccNum)
      .filter((sccNum): sccNum is string => typeof sccNum === 'string' && sccNum !== '')
      .join(',');
    uiManagerInstance.searchManager.fillResultBox(
      groupManagerInstance.groupList[groupName].ids.map((id: number) => ({ id, searchType: SearchResultType.NORAD_ID, strIndex: 0, patlen: 0 }) as SearchResult),
      catalogManagerInstance
    );

    // If a selectSat plugin exists, deselect the selected satellite
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    this.selectedDataGroup_ = groupName;

    // The menu is a chooser: it stays open so the user can switch countries. Mobile still closes the search.
    if (settingsManager.isMobileModeEnabled) {
      uiManagerInstance.searchManager.closeSearch();
    }

    this.refreshSelectedMarker_();
  }

  /** Clears the country pick: empties the search box and the results, which also clears the selected group. */
  private clearCountry_(): void {
    const searchDOM = getEl('search', true) as HTMLInputElement | null;

    if (searchDOM) {
      searchDOM.value = '';
    }
    this.selectedDataGroup_ = null;
    ServiceLocator.getUiManager().searchManager.doSearch('');
    this.refreshSelectedMarker_();
  }

  /** The picked country, or null once another search or a clear replaced its group. */
  private getActiveDataGroup_(): string | null {
    if (this.selectedDataGroup_ === null) {
      return null;
    }
    const groupsManager = ServiceLocator.getGroupsManager();
    const group = groupsManager.groupList[this.selectedDataGroup_];

    if (!group || groupsManager.selectedGroup !== group) {
      this.selectedDataGroup_ = null;
    }

    return this.selectedDataGroup_;
  }

  /** Marks the picked country row (class + aria-pressed) and enables Clear only while a country is picked. */
  private refreshSelectedMarker_(): void {
    const active = this.getActiveDataGroup_();

    getEl('country-list', true)
      ?.querySelectorAll<HTMLElement>('.country-option')
      .forEach((row) => {
        const isSelected = active !== null && row.dataset.group === active;

        row.classList.toggle('country-option--selected', isSelected);
        row.setAttribute('aria-pressed', String(isSelected));
      });

    const clearBtn = getEl('countries-clear-btn', true) as HTMLButtonElement | null;

    if (clearBtn) {
      clearBtn.disabled = active === null;
    }
  }
}
