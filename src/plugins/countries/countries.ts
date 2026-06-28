import { countryFlagIconMap } from '@app/app/data/catalogs/countries';
import { GroupType } from '@app/app/data/object-group';
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
 */
export class CountriesMenu extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'CountriesMenu';
  dependencies_ = [TopMenu.name];

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
    const category = 'Countries';
    const catalogManager = ServiceLocator.getCatalogManager();
    const countryCodeList = [] as string[];

    catalogManager.getSats().forEach((sat) => {
      if (sat.country && !countryCodeList.includes(sat.country) && sat.country !== 'ANALSAT') {
        countryCodeList.push(sat.country);
      }
    });

    const countryGroups: Record<string, string[]> = {};

    countryCodeList.forEach((countryCode) => {
      const country = StringExtractor.extractCountry(countryCode);

      if (countryCode === '') {
        return;
      }
      if (!countryGroups[country]) {
        countryGroups[country] = [];
      }
      countryGroups[country].push(countryCode);
    });

    return Object.entries(countryGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, codes]) => {
        const dataGroup = codes.join('|');

        return {
          id: `CountriesMenu.selectCountry.${dataGroup}`,
          label: t7e('plugins.CountriesMenu.commands.selectCountry').replace('{country}', country),
          category,
          callback: () => this.countryMenuClick_(dataGroup),
        };
      });
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
      tips: [
        t7e('plugins.CountriesMenu.help.tip1'),
        t7e('plugins.CountriesMenu.help.tip2'),
      ],
      shortcuts: [{ keys: ['O'], description: t7e('plugins.CountriesMenu.help.shortcutToggle') }],
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );
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
  }

  private generateCountryList_(): string {
    const uniqueCodes = [] as string[];
    const countByCode: Record<string, number> = {};
    const catalogManager = ServiceLocator.getCatalogManager();

    catalogManager.getSats().forEach((sat) => {
      if (sat.country && sat.country !== 'ANALSAT') {
        countByCode[sat.country] = (countByCode[sat.country] ?? 0) + 1;
        if (!uniqueCodes.includes(sat.country)) {
          uniqueCodes.push(sat.country);
        }
      }
    });

    const countries = uniqueCodes.map((countryCode) => {
      const country = StringExtractor.extractCountry(countryCode);

      return { country, countryCode };
    }).sort((a, b) => a.country.localeCompare(b.country));

    // Group countries by their display name
    const countryGroups: Record<string, string[]> = {};

    countries.forEach(({ country, countryCode }) => {
      if (countryCode === '') {
        return;
      }
      if (!countryGroups[country]) {
        countryGroups[country] = [];
      }
      countryGroups[country].push(countryCode);
    });

    // Create a single full-width v13 action row per country, with all codes
    // merged by '|'. The flag + name live in the .kt-action-label so the count
    // chip rides next to the chevron.
    const mergedList = Object.entries(countryGroups).reduce((acc, [country, codes]) => {
      const dataGroup = codes.join('|');
      const flagCode = countryFlagIconMap[codes[0]] ?? 'unknown';
      const flagClass = `fi fi-${flagCode.toLowerCase()}`;
      const satCount = codes.reduce((sum, code) => sum + (countByCode[code] ?? 0), 0);

      return `${acc}<button type="button" class="kt-action waves-effect country-option" data-group="${dataGroup}">` +
        '<span class="kt-action-label">' +
        `<span class="${flagClass} country-flag"></span>` +
        `<span class="country-name">${country}</span>` +
        '</span>' +
        `<span class="country-count">${satCount.toLocaleString()}</span>` +
        '</button>';
    }, '');

    return mergedList;
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

    searchDOM.value = groupManagerInstance.groupList[groupName].ids.reduce((acc: string, id: number) => `${acc}${catalogManagerInstance.getSat(id)?.sccNum},`, '').slice(0, -1);
    uiManagerInstance.searchManager.fillResultBox(
      groupManagerInstance.groupList[groupName].ids.map((id: number) => ({ id, searchType: SearchResultType.NORAD_ID, strIndex: 0, patlen: 0 }) as SearchResult),
      catalogManagerInstance,
    );

    // If a selectSat plugin exists, deselect the selected satellite
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    // Close Menus
    if (settingsManager.isMobileModeEnabled) {
      uiManagerInstance.searchManager.closeSearch();
    }
    uiManagerInstance.hideSideMenus();
  }
}
