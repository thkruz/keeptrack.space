import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';
import flagPng from '@app/img/icons/flag.png';

let isCountriesMenuOpen = false;
export const hideSideMenus = (): void => {
  $('#countries-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-countries').removeClass('bmenu-item-selected');
  isCountriesMenuOpen = false;
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'countries',
    cb: uiManagerInit,
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
      $('#countries-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      isCountriesMenuOpen = true;
      $('#menu-countries').addClass('bmenu-item-selected');
      return;
    }
  }
};

export const uiManagerInit = () => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="countries-menu" class="side-menu-parent start-hidden text-select">
          <div id="country-menu" class="side-menu">
            <ul>
              <h5 class="center-align">Countries</h5>
              <li class="divider"></li>
              <li class="menu-selectable country-option" data-group="Canada">Canadian</li>
              <li class="menu-selectable country-option" data-group="China">Chinese</li>
              <li class="menu-selectable country-option" data-group="France">French</li>
              <li class="menu-selectable country-option" data-group="India">Indian</li>
              <li class="menu-selectable country-option" data-group="Israel">Israeli</li>
              <li class="menu-selectable country-option" data-group="Japan">Japanese</li>
              <li class="menu-selectable country-option" data-group="Russia">Russian / USSR</li>
              <li class="menu-selectable country-option" data-group="UnitedKingdom">British</li>
              <li class="menu-selectable country-option" data-group="UnitedStates">American</li>
            </ul>
          </div>
        </div>
      `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-countries" class="bmenu-item">
          <img
            alt="flag"
            src=""
            delayedsrc="${flagPng}"
          />
          <span class="bmenu-title">Countries</span>
          <div class="status-icon"></div>
        </div>
      `);

  // NOTE: Must use function not arrow function to access 'this'
  $('#country-menu>ul>li').on('click', function () {
    countryMenuClick($(this).data('group'));
  });

  $('#countries-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });
};

export const countryMenuClick = (groupName: string): void => { // NOSONAR
  const { groupsManager } = keepTrackApi.programs;
  switch (groupName) {
    case 'Canada':
      if (!groupsManager.Canada) groupsManager.Canada = groupsManager.createGroup('countryRegex', /CA/u);
      break;
    case 'China':
      if (!groupsManager.China) groupsManager.China = groupsManager.createGroup('countryRegex', /PRC/u);
      break;
    case 'France':
      if (!groupsManager.France) groupsManager.France = groupsManager.createGroup('countryRegex', /FR/u);
      break;
    case 'India':
      if (!groupsManager.India) groupsManager.India = groupsManager.createGroup('countryRegex', /IND/u);
      break;
    case 'Israel':
      if (!groupsManager.Israel) groupsManager.Israel = groupsManager.createGroup('countryRegex', /ISRA/u);
      break;
    case 'Japan':
      if (!groupsManager.Japan) groupsManager.Japan = groupsManager.createGroup('countryRegex', /JPN/u);
      break;
    case 'Russia':
      if (!groupsManager.Russia) groupsManager.Russia = groupsManager.createGroup('countryRegex', /CIS/u);
      break;
    case 'UnitedKingdom':
      if (!groupsManager.UnitedKingdom) groupsManager.UnitedKingdom = groupsManager.createGroup('countryRegex', /UK/u);
      break;
    case 'UnitedStates':
      if (!groupsManager.UnitedStates) groupsManager.UnitedStates = groupsManager.createGroup('countryRegex', /US/u);
      break;
    default:
      throw new Error('Unknown country group');
  }
  groupSelected(groupName);
};

export const groupSelected = (groupName: string): void => {
  const { groupsManager, satSet, searchBox, objectManager, uiManager } = keepTrackApi.programs;
  const searchDOM = $('#search');
  if (typeof groupName == 'undefined') return;
  if (typeof groupsManager[groupName] == 'undefined') return;
  groupsManager.selectGroup(groupsManager[groupName]);

  // Populate searchDOM with a search string separated by commas - minus the last one
  searchDOM.val(groupsManager[groupName].sats.reduce((acc: string, obj: { satId: number }) => `${acc}${satSet.getSat(obj.satId).sccNum},`, '').slice(0, -1));
  searchBox.fillResultBox(groupsManager[groupName].sats, satSet);
  objectManager.setSelectedSat(-1); // Clear selected sat

  // Close Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(true);
  uiManager.hideSideMenus();
};
