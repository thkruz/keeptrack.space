import colorsPng from '@app/img/icons/colors.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { clickAndDragWidth, getEl, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import $ from 'jquery';

let isColorSchemeMenuOpen = false;
export const hideSideMenus = (): void => {
  slideOutLeft(getEl('color-scheme-menu'), 1000);
  getEl('menu-color-scheme').classList.remove('bmenu-item-selected');
  isColorSchemeMenuOpen = false;
};
export const rightBtnMenuAdd = () => {
  getEl('right-btn-menu-ul').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`   
        <li class="rmb-menu-item" id="colors-rmb"><a href="#">Colors &#x27A4;</a></li>
        `
  );
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'colorsMenu',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'colorsMenu',
    cb: uiManagerFinal,
  });

  keepTrackApi.register({
    method: 'rightBtnMenuAdd',
    cbName: 'photo',
    cb: rightBtnMenuAdd,
  });

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
  getEl('rmb-wrapper').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="colors-rmb-menu" class="right-btn-menu">
      <ul class='dropdown-contents'>
        <li id="colors-default-rmb"><a href="#">Object Types</a></li>
        <li id="colors-sunlight-rmb"><a href="#">Sunlight Status</a></li>
        <li id="colors-country-rmb"><a href="#">Country</a></li>
        <li id="colors-velocity-rmb"><a href="#">Velocity</a></li>
        <li id="colors-ageOfElset-rmb"><a href="#">Age of Elset</a></li>
      </ul>
    </div>
    `
  );

  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
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
        `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-color-scheme" class="bmenu-item">
          <img
            alt="colors"
            src=""
            delayedsrc="${colorsPng}"
          />
          <span class="bmenu-title">Color Schemes</span>
          <div class="status-icon"></div>
        </div>
        `
  );
};

export const uiManagerFinal = () => {
  document
    .getElementById('colors-menu')
    .querySelectorAll('li')
    .forEach((element) => {
      element.addEventListener('click', function () {
        const colorName = $(this).data('color');
        colorsMenuClick(colorName);
      });
    });

  clickAndDragWidth(getEl('color-scheme-menu'));
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
      slideInRight(getEl('color-scheme-menu'), 1000);
      isColorSchemeMenuOpen = true;
      getEl('menu-color-scheme').classList.add('bmenu-item-selected');
      return;
    }
  }
};
export const colorsMenuClick = (colorName: string) => {
  const { colorSchemeManager, satSet, objectManager, uiManager, groupsManager } = keepTrackApi.programs;
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
      uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      break;
    case 'velocity':
      uiManager.legendMenuChange('velocity');
      satSet.setColorScheme(colorSchemeManager.velocity, true);
      uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      break;
    case 'sunlight':
      satSet.satCruncher.postMessage({
        isSunlightView: true,
      });
      uiManager.legendMenuChange('sunlight');
      uiManager.colorSchemeChangeAlert(colorSchemeManager.sunlight);
      satSet.satCruncher.addEventListener(
        'message',
        (m) => {
          if (m.data.satInSun) {
            satSet.setColorScheme(colorSchemeManager.sunlight, true);
          } else {
            satSet.satCruncher.addEventListener(
              'message',
              (m) => {
                if (m.data.satInSun) {
                  satSet.setColorScheme(colorSchemeManager.sunlight, true);
                } else {
                  console.error('Should have received satInSun by now!');
                }
              },
              { once: true }
            );
          }
        },
        { once: true }
      );
      break;
    case 'near-earth':
      uiManager.legendMenuChange('near');
      satSet.setColorScheme(colorSchemeManager.leo, true);
      uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      break;
    case 'deep-space':
      uiManager.legendMenuChange('deep');
      satSet.setColorScheme(colorSchemeManager.geo, true);
      uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      break;
    case 'elset-age':
      showLoading(() => {
        uiManager.legendMenuChange('ageOfElset');
        satSet.setColorScheme(colorSchemeManager.ageOfElset, true);
        uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      });
      break;
    case 'lost-objects':
      (<HTMLInputElement>getEl('search')).value = '';
      showLoading(() => {
        settingsManager.lostSatStr = '';
        satSet.setColorScheme(colorSchemeManager.lostobjects, true);
        (<HTMLInputElement>getEl('search')).value = settingsManager.lostSatStr;
        uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
        uiManager.doSearch((<HTMLInputElement>getEl('search')).value);
      });
      break;
    case 'rcs':
      uiManager.legendMenuChange('rcs');
      satSet.setColorScheme(colorSchemeManager.rcs, true);
      uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      break;
    case 'smallsats':
      uiManager.legendMenuChange('small');
      satSet.setColorScheme(colorSchemeManager.smallsats, true);
      uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      break;
    case 'countries':
      uiManager.legendMenuChange('countries');
      if (groupsManager.selectedGroup !== null) {
        satSet.setColorScheme(colorSchemeManager.groupCountries, true);
      } else {
        satSet.setColorScheme(colorSchemeManager.countries, true);
      }
      uiManager.colorSchemeChangeAlert(colorSchemeManager.currentColorScheme);
      break;
  }

  // Close Open Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
  uiManager.hideSideMenus();
};
