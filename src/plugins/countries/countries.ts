import { GroupType } from '@app/app/data/object-group';
import { SearchResult } from '@app/app/ui/search-manager';
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
  IDragOptions,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import flagPng from '@public/img/icons/flag.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { TopMenu } from '../top-menu/top-menu';

export class CountriesMenu extends KeepTrackPlugin {
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
      menuMode: [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL],
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
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div id="countries-menu" class="side-menu-parent start-hidden text-select">
        <div id="country-menu" class="side-menu">
          <ul id="country-list">
          </ul>
        </div>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.CountriesMenu.title'),
      body: t7e('plugins.CountriesMenu.helpBody'),
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
    const countryListEl = getEl('country-list');
    const countryMenuEl = getEl('country-menu');

    if (!countryListEl || !countryMenuEl) {
      return;
    }

    countryListEl.innerHTML = this.generateCountryList_();

    countryMenuEl.querySelectorAll('li').forEach((element) => {
      element.addEventListener('click', () => {
        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
        this.countryMenuClick_(element.getAttribute('data-group') ?? '');
      });
    });
  }

  private generateCountryList_(): string {
    const header = html`
    <h5 class="center-align">${t7e('plugins.CountriesMenu.bottomIconLabel')}</h5>
    <li class="divider"></li>`;

    const countryCodeList = [] as string[];
    const catalogManager = ServiceLocator.getCatalogManager();

    catalogManager.getSats().forEach((sat) => {
      if (sat.country && !countryCodeList.includes(sat.country) && sat.country !== 'ANALSAT') {
        countryCodeList.push(sat.country);
      }
    });

    const countries = countryCodeList.map((countryCode) => {
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

    // Create a single <li> per country, with all codes merged by '|'
    const mergedList = Object.entries(countryGroups).reduce((acc, [country, codes]) => {
      const dataGroup = codes.join('|');

      return `${acc}<li class="menu-selectable country-option" data-group="${dataGroup}">${country}</li>`;
    }, header);

    return `${mergedList}<br/>`;
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
      groupManagerInstance.groupList[groupName].ids.map((id: number) => <SearchResult>{ id }),
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
