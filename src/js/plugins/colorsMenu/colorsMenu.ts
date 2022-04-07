import colorsPng from '@app/img/icons/colors.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

let isColorSchemeMenuOpen = false;
export const hideSideMenus = (): void => {
  $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-color-scheme').removeClass('bmenu-item-selected');
  isColorSchemeMenuOpen = false;
};
export const rightBtnMenuAdd = () => {
  $('#right-btn-menu-ul').append(keepTrackApi.html`   
        <li class="rmb-menu-item" id="colors-rmb"><a href="#">Colors &#x27A4;</a></li>
      `);
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'colorsMenu',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'rightBtnMenuAdd',
    cbName: 'photo',
    cb: rightBtnMenuAdd,
  });

  $('#rmb-wrapper').append(keepTrackApi.html`
    <div id="colors-rmb-menu" class="right-btn-menu">
      <ul class='dropdown-contents'>
        <li id="colors-default-rmb"><a href="#">Object Types</a></li>
        <li id="colors-sunlight-rmb"><a href="#">Sunlight Status</a></li>
        <li id="colors-country-rmb"><a href="#">Country</a></li>
        <li id="colors-velocity-rmb"><a href="#">Velocity</a></li>
        <li id="colors-ageOfElset-rmb"><a href="#">Age of Elset</a></li>
      </ul>
    </div>
  `);

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'colorsMenu',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'colorsMenu',
    cb: hideSideMenus,
  });
};
export const uiManagerInit = () => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="color-scheme-menu" class="side-menu-parent start-hidden text-select">
          <div id="colors-menu" class="side-menu">
            <ul>
              <h5 class="center-align">Color Schemes</h5>
              <li class="divider"></li>
              <li class="menu-selectable" data-color="default">Object Type</li>
              <li class="menu-selectable" data-color="sunlight">Sunlight</li>
              <li class="menu-selectable" data-color="velocity">Velocity</li>
              <li class="menu-selectable" data-color="rcs">Radar Cross Section</li>
              <li class="menu-selectable" data-color="smallsats">Small Satellites</li>
              <li class="menu-selectable" data-color="countries">Countries</li>
              <li class="menu-selectable" data-color="near-earth">Near Earth</li>
              <li class="menu-selectable" data-color="deep-space">Deep Space</li>
              <li class="menu-selectable" data-color="elset-age">Elset Age</li>
              <li class="menu-selectable" data-color="lost-objects">Lost Objects</li>
            </ul>
          </div>
        </div>
      `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-color-scheme" class="bmenu-item">
          <img
            alt="colors"
            src=""
            delayedsrc="${colorsPng}"
          />
          <span class="bmenu-title">Color Schemes</span>
          <div class="status-icon"></div>
        </div>
      `);

  $('#colors-menu>ul>li').on('click', function () {
    const colorName = $(this).data('color');
    colorsMenuClick(colorName);
  });

  $('#color-scheme-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });
};

export const bottomMenuClick = (iconName: string): void => {
  const { uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-color-scheme') {
    if (isColorSchemeMenuOpen) {
      uiManager.hideSideMenus();
      isColorSchemeMenuOpen = false;
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      isColorSchemeMenuOpen = true;
      $('#menu-color-scheme').addClass('bmenu-item-selected');
      return;
    }
  }
};
export const colorsMenuClick = (colorName: string) => {
  const { colorSchemeManager, satSet, objectManager, uiManager } = keepTrackApi.programs;
  objectManager.setSelectedSat(-1); // clear selected sat
  if (colorName !== 'sunlight') {
    satSet.satCruncher.postMessage({
      isSunlightView: false,
    });
  }
  switch (colorName) {
    case 'default':
      uiManager.legendMenuChange('default');
      satSet.setColorScheme(colorSchemeManager.default, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'velocity':
      uiManager.legendMenuChange('velocity');
      satSet.setColorScheme(colorSchemeManager.velocity);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'sunlight':
      uiManager.legendMenuChange('sunlight');
      satSet.setColorScheme(colorSchemeManager.sunlight, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      settingsManager.isForceColorScheme = true;
      satSet.satCruncher.postMessage({
        isSunlightView: true,
      });
      break;
    case 'near-earth':
      uiManager.legendMenuChange('near');
      satSet.setColorScheme(colorSchemeManager.leo);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'deep-space':
      uiManager.legendMenuChange('deep');
      satSet.setColorScheme(colorSchemeManager.geo);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'elset-age':
      $('#loading-screen').fadeIn(1000, function () {
        uiManager.legendMenuChange('ageOfElset');
        satSet.setColorScheme(colorSchemeManager.ageOfElset);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'lost-objects':
      $('#search').val('');
      $('#loading-screen').fadeIn(1000, function () {
        settingsManager.lostSatStr = '';
        satSet.setColorScheme(colorSchemeManager.lostobjects);
        (<HTMLInputElement>document.getElementById('search')).value = settingsManager.lostSatStr;
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        uiManager.doSearch($('#search').val());
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'rcs':
      uiManager.legendMenuChange('rcs');
      satSet.setColorScheme(colorSchemeManager.rcs);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'smallsats':
      uiManager.legendMenuChange('small');
      satSet.setColorScheme(colorSchemeManager.smallsats);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'countries':
      uiManager.legendMenuChange('countries');
      satSet.setColorScheme(colorSchemeManager.countries);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
  }

  // Close Open Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
  uiManager.hideSideMenus();
};
