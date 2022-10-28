import { clickAndDragWidth, getEl, slideInRight, slideOutLeft } from '@app/js/lib/helpers';

import $ from 'jquery';
import flagPng from '@app/img/icons/flag.png';
import { getCountryCode } from '@app/js/objectManager/objectManager';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

let isCountriesMenuOpen = false;
export const hideSideMenus = (): void => {
  slideOutLeft(getEl('countries-menu'), 1000);
  getEl('menu-countries').classList.remove('bmenu-item-selected');
  isCountriesMenuOpen = false;
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'countries',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'countries',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'countries',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'countries',
    cb: hideSideMenus,
  });
};
export const bottomMenuClick = (iconName: string): void => {
  const { uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-countries') {
    if (isCountriesMenuOpen) {
      uiManager.hideSideMenus();
      isCountriesMenuOpen = false;
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('countries-menu'), 1000);
      isCountriesMenuOpen = true;
      getEl('menu-countries').classList.add('bmenu-item-selected');
      return;
    }
  }
};

export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="countries-menu" class="side-menu-parent start-hidden text-select">
          <div id="country-menu" class="side-menu">
            <ul>
              <h5 class="center-align">Countries</h5>
              <li class="divider"></li>
              <li class="menu-selectable country-option" data-group="Argentina">Argentina</li>
              <li class="menu-selectable country-option" data-group="Austria">Austria</li>
              <li class="menu-selectable country-option" data-group="Australia">Australia</li>
              <li class="menu-selectable country-option" data-group="Belgium">Belgium</li>
              <li class="menu-selectable country-option" data-group="Brazil">Brazil</li>
              <li class="menu-selectable country-option" data-group="Canada">Canada</li>
              <li class="menu-selectable country-option" data-group="China">China</li>
              <li class="menu-selectable country-option" data-group="Colombia">Colombia</li>
              <li class="menu-selectable country-option" data-group="Denmark">Denmark</li>
              <li class="menu-selectable country-option" data-group="Egypt">Egypt</li>
              <li class="menu-selectable country-option" data-group="Finland">Finland</li>
              <li class="menu-selectable country-option" data-group="France">France</li>
              <li class="menu-selectable country-option" data-group="Germany">Germany</li>
              <li class="menu-selectable country-option" data-group="Hong Kong">Hong Kong</li>
              <li class="menu-selectable country-option" data-group="Hungary">Hungary</li>
              <li class="menu-selectable country-option" data-group="India">India</li>
              <li class="menu-selectable country-option" data-group="Indonesia">Indonesia</li>
              <li class="menu-selectable country-option" data-group="Iran">Iran</li>
              <li class="menu-selectable country-option" data-group="Ireland">Ireland</li>
              <li class="menu-selectable country-option" data-group="Italy">Italy</li>
              <li class="menu-selectable country-option" data-group="Israel">Israel</li>
              <li class="menu-selectable country-option" data-group="Japan">Japan</li>
              <li class="menu-selectable country-option" data-group="North Korea">North Korea</li>
              <li class="menu-selectable country-option" data-group="South Korea">South Korea</li>
              <li class="menu-selectable country-option" data-group="Mexico">Mexico</li>
              <li class="menu-selectable country-option" data-group="Norway">Norway</li>
              <li class="menu-selectable country-option" data-group="New Zealand">New Zealand</li>
              <li class="menu-selectable country-option" data-group="Philippines">Philippines</li>
              <li class="menu-selectable country-option" data-group="Poland">Poland</li>
              <li class="menu-selectable country-option" data-group="Russia">Russia</li>
              <li class="menu-selectable country-option" data-group="Saudi Arabia">Saudi Arabia</li>
              <li class="menu-selectable country-option" data-group="Singapore">Singapore</li>
              <li class="menu-selectable country-option" data-group="Spain">Spain</li>
              <li class="menu-selectable country-option" data-group="Sweden">Sweden</li>
              <li class="menu-selectable country-option" data-group="Switzerland">Switzerland</li>
              <li class="menu-selectable country-option" data-group="Thailand">Thailand</li>
              <li class="menu-selectable country-option" data-group="Turkey">Turkey</li>
              <li class="menu-selectable country-option" data-group="United Kingdom">United Kingdom</li>
              <li class="menu-selectable country-option" data-group="United States">United States</li>
              <li class="menu-selectable country-option" data-group="Venezuela">Venezuela</li>
              <li class="menu-selectable country-option" data-group="Vietnam">Vietnam</li>
              <li class="menu-selectable country-option" data-group="South Africa">South Africa</li>              
            </ul>
          </div>
        </div>
        `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-countries" class="bmenu-item">
          <img
            alt="flag"
            src=""
            delayedsrc="${flagPng}"
          />
          <span class="bmenu-title">Countries</span>
          <div class="status-icon"></div>
        </div>
      `
  );
};

export const uiManagerFinal = () => {
  // NOTE: Must use function not arrow function to access 'this'
  getEl('country-menu')
    .querySelectorAll('li')
    .forEach((element) => {
      element.addEventListener('click', function () {
        countryMenuClick($(this).data('group'));
      });
    });

  clickAndDragWidth(getEl('countries-menu'));
};

// prettier-ignore
export const countryMenuClick = (groupName: string): void => { // NOSONAR
  const { groupsManager } = keepTrackApi.programs;
  const countryCode = getCountryCode(groupName);
  if (countryCode === '') throw new Error('Unknown country group');
  if (!groupsManager[groupName]) groupsManager[groupName] = groupsManager.createGroup('country', countryCode);      
  groupSelected(groupName);
};

export const groupSelected = (groupName: string): void => {
  const { groupsManager, satSet, searchBox, objectManager, uiManager } = keepTrackApi.programs;
  const searchDOM = $('#search');
  if (typeof groupName == 'undefined') return;
  if (typeof groupsManager[groupName] == 'undefined') return;
  groupsManager.selectGroup(groupsManager[groupName]);

  // Populate searchDOM with a search string separated by commas - minus the last one
  if (groupsManager[groupName].sats.length < settingsManager.searchLimit) {
    searchBox.doSearch(groupsManager[groupName].sats.reduce((acc: string, obj: { satId: number }) => `${acc}${satSet.getSat(obj.satId).sccNum},`, '').slice(0, -1));
  } else {
    searchDOM.val(groupsManager[groupName].sats.reduce((acc: string, obj: { satId: number }) => `${acc}${satSet.getSat(obj.satId).sccNum},`, '').slice(0, -1));
    searchBox.fillResultBox(groupsManager[groupName].sats, satSet);
  }
  objectManager.setSelectedSat(-1); // Clear selected sat

  // Close Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(true);
  uiManager.hideSideMenus();
};
