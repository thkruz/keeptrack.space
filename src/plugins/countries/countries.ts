import { clickAndDragWidth } from '@app/lib/click-and-drag';
import { getEl } from '@app/lib/get-el';

import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { GroupType } from '@app/singletons/object-group';
import { StringExtractor } from '@app/static/string-extractor';
import flagPng from '@public/img/icons/flag.png';

import { Doris } from '@app/doris/doris';
import { Localization } from '@app/locales/locales';
import { SearchResult } from '@app/singletons/search-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

export class CountriesMenu extends KeepTrackPlugin {
  readonly id = 'CountriesMenu';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = flagPng;
  sideMenuElementHtml = keepTrackApi.html`
    <div id="countries-menu" class="side-menu-parent start-hidden text-select">
      <div id="country-menu" class="side-menu">
        <ul id="country-list">
        </ul>
      </div>
    </div>
    `;

  sideMenuElementName = 'countries-menu';

  addHtml(): void {
    super.addHtml();

    Doris.getInstance().on(KeepTrackApiEvents.onCruncherReady, () => {
      getEl('country-list')!.innerHTML = CountriesMenu.generateCountryList_();
    });
  }

  addJs() {
    super.addJs();

    Doris.getInstance().on(KeepTrackApiEvents.AfterHtmlInitialize, () => {
      getEl('country-menu')
        .querySelectorAll('li')
        .forEach((element) => {
          element.addEventListener('click', () => {
            keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);
            CountriesMenu.countryMenuClick_(element.getAttribute('data-group'));
          });
        });

      clickAndDragWidth(getEl(this.sideMenuElementName));
    });
  }

  private static generateCountryList_(): string {
    const header = keepTrackApi.html`
    <h5 class="center-align">${Localization.plugins.CountriesMenu.bottomIconLabel}</h5>
    <li class="divider"></li>
    <br/>`;

    const countryCodeList = [];

    keepTrackApi.getCatalogManager().getSats().forEach((sat) => {
      if (sat.country && !countryCodeList.includes(sat.country) && sat.country !== 'ANALSAT') {
        countryCodeList.push(sat.country);
      }
    });

    const countries = countryCodeList.map((countryCode) => {
      const country = StringExtractor.extractCountry(countryCode);

      return { country, countryCode };
    }).sort((a, b) => a.country.localeCompare(b.country));

    return `${countries.reduce((acc, countryArr) => {
      if (countryArr.countryCode === '') {
        return acc;
      }

      return `${acc}<li class="menu-selectable country-option" data-group="${countryArr.countryCode}">${countryArr.country}</li>`;
    }, header)}<br/>`;
  }

  private static countryMenuClick_(countryCode: string): void {
    const groupManagerInstance = keepTrackApi.getGroupsManager();

    if (countryCode === '') {
      throw new Error('Unknown country code');
    }

    if (!groupManagerInstance.groupList[countryCode]) {
      groupManagerInstance.createGroup(GroupType.COUNTRY, countryCode, countryCode);
    }

    CountriesMenu.groupSelected_(countryCode);
  }

  private static groupSelected_(groupName: string): void {
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

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
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);

    // Close Menus
    if (settingsManager.isMobileModeEnabled) {
      uiManagerInstance.searchManager.closeSearch();
    }
    uiManagerInstance.hideSideMenus();
  }
}
