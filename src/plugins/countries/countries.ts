import { clickAndDragWidth } from '@app/engine/utils/click-and-drag';
import { getEl } from '@app/engine/utils/get-el';
import { t7e, TranslationKey } from '@app/locales/keys';

import { GroupType } from '@app/app/data/object-group';
import { StringExtractor } from '@app/app/ui/string-extractor';
import { MenuMode } from '@app/engine/core/interfaces';
import flagPng from '@public/img/icons/flag.png';

import { SearchResult } from '@app/app/ui/search-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import { TopMenu } from '../top-menu/top-menu';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

export class CountriesMenu extends KeepTrackPlugin {
  readonly id = 'CountriesMenu';
  dependencies_ = [TopMenu.name];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = flagPng;
  sideMenuElementHtml = html`
    <div id="countries-menu" class="side-menu-parent start-hidden text-select">
      <div id="country-menu" class="side-menu">
        <ul id="country-list">
        </ul>
      </div>
    </div>
    `;

  sideMenuElementName = 'countries-menu';

  addHtml() {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('country-list')!.innerHTML = CountriesMenu.generateCountryList_();

        getEl('country-menu')!
          .querySelectorAll('li')
          .forEach((element) => {
            element.addEventListener('click', () => {
              ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
              CountriesMenu.countryMenuClick_(element.getAttribute('data-group') ?? '');
            });
          });

        clickAndDragWidth(getEl(this.sideMenuElementName));
      },
    );
  }

  private static generateCountryList_(): string {
    const header = html`
    <h5 class="center-align">${t7e(`plugins.${CountriesMenu.name}.bottomIconLabel` as TranslationKey)}</h5>
    <li class="divider"></li>`;

    const countryCodeList = [] as string[];

    ServiceLocator.getCatalogManager().getSats().forEach((sat) => {
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

  private static countryMenuClick_(countryCode: string): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    if (countryCode === '') {
      throw new Error('Unknown country code');
    }

    if (!groupManagerInstance.groupList[countryCode]) {
      groupManagerInstance.createGroup(GroupType.COUNTRY, countryCode, countryCode);
    }

    CountriesMenu.groupSelected_(countryCode);
  }

  private static groupSelected_(groupName: string): void {
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
