import { clickAndDragWidth } from '@app/lib/click-and-drag';
import { getEl } from '@app/lib/get-el';

import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { GroupType } from '@app/singletons/object-group';
import { StringExtractor } from '@app/static/string-extractor';
import flagPng from '@public/img/icons/flag.png';

import { Localization } from '@app/locales/locales';
import { SearchResult } from '@app/singletons/search-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

export class CountriesMenu extends KeepTrackPlugin {
  readonly id = 'CountriesMenu';
  dependencies_ = [];

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

    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherReady,
      cbName: this.id,
      cb: () => {
        getEl('country-list').innerHTML = CountriesMenu.generateCountryList_();
      },
    });
  }

  addJs() {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl('country-menu')
          .querySelectorAll('li')
          .forEach((element) => {
            element.addEventListener('click', () => {
              keepTrackApi.getSoundManager()?.play(SoundNames.CLICK);
              CountriesMenu.countryMenuClick_(element.getAttribute('data-group'));
            });
          });

        clickAndDragWidth(getEl(this.sideMenuElementName));
      },
    });
  }

  private static generateCountryList_(): string {
    const header = keepTrackApi.html`
    <h5 class="center-align">${Localization.plugins.CountriesMenu.bottomIconLabel}</h5>
    <li class="divider"></li>
    <br/>`;

    const countryList = [];

    keepTrackApi.getCatalogManager().getSats().forEach((sat) => {
      if (sat.country && !countryList.includes(sat.country)) {
        countryList.push(sat.country);
      }
    });

    countryList.sort((a, b) => a.localeCompare(b));

    return `${countryList.reduce((acc, country) => {
      const countryCode = StringExtractor.getCountryCode(country);

      if (countryCode === '') {
        return acc;
      }

      return `${acc}<li class="menu-selectable country-option" data-group="${country}">${country}</li>`;
    }, header)}<br/>`;
  }

  private static countryMenuClick_(groupName: string): void {
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const countryCode = StringExtractor.getCountryCode(groupName);

    if (countryCode === '') {
      throw new Error('Unknown country group');
    }

    if (!groupManagerInstance.groupList[groupName]) {
      groupManagerInstance.createGroup(GroupType.COUNTRY, countryCode, groupName);
    }

    CountriesMenu.groupSelected_(groupName);
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

    // Populate searchDOM with a search string separated by commas - minus the last one
    if (groupManagerInstance.groupList[groupName].ids.length < settingsManager.searchLimit) {
      uiManagerInstance.searchManager.doSearch(
        groupManagerInstance.groupList[groupName].ids.reduce((acc: string, id: number) => `${acc}${catalogManagerInstance.getSat(id)?.sccNum},`, '').slice(0, -1),
      );
    } else {
      searchDOM.value = groupManagerInstance.groupList[groupName].ids.reduce((acc: string, id: number) => `${acc}${catalogManagerInstance.getSat(id)?.sccNum},`, '').slice(0, -1);
      uiManagerInstance.searchManager.fillResultBox(
        groupManagerInstance.groupList[groupName].ids.map((id: number) => <SearchResult>{ id }),
        catalogManagerInstance,
      );
    }

    // If a selectSat plugin exists, deselect the selected satellite
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);

    // Close Menus
    if (settingsManager.isMobileModeEnabled) {
      uiManagerInstance.searchManager.closeSearch();
    }
    uiManagerInstance.hideSideMenus();
  }
}
