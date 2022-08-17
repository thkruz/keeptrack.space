/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

// organize-imports-ignore
import 'jquery-ui-bundle';
import '@app/js/lib/external/jquery-ui-slideraccess.js';
import '@app/js/lib/external/jquery-ui-timepicker.js';
import '@app/js/lib/external/colorPick.js';
import '@materializecss/materialize';
// eslint-disable-next-line sort-imports
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { clickAndDragHeight, closeColorbox, getEl } from '@app/js/lib/helpers';
import $ from 'jquery';
import { UiManager } from '../api/keepTrackTypes';
import { legendColorsChange, initUiValidation, uiInput, useCurrentGeolocationAsSensor, keyHandler, initMenuController } from '.';
import { searchToggle } from './search/searchToggle';
import { updateURL } from './url/update-url';
import { searchBox } from './search/searchBox';
import { doSearch } from './search/doSearch';
import { toast } from './ui/toast';
import { hideUi } from './ui/hideUi';
import { mobileManager } from './mobile/mobileManager';
import { hideLoadingScreen } from './ui/hideLoadingScreen';
import { colorSchemeChangeAlert } from './ui/colorSchemeChangeAlert';
import { legendHoverMenuClick, legendMenuChange } from './legend/legendMenu';
import { updateSelectBox } from './updateSelectBox';
import { getsensorinfo } from './ui/getsensorinfo';
import { footerToggle } from './ui/footerToggle';
import { loadStr } from './ui/loadStr';
import { reloadLastSensor } from './ui/reloadLastSensor';
import { panToStar } from './ui/panToStar';

// materializecss/materialize goes to window.M, but we want a local reference
export const M = window.M;

export let updateInterval = 1000;

export const init = () => {
  // Register all UI callbacks to run at the end of the draw loop
  keepTrackApi.register({
    method: 'onDrawLoopComplete',
    cbName: 'updateSelectBox',
    cb: updateSelectBox,
  });

  if (settingsManager.isShowLogo) getEl('demo-logo').classList.remove('start-hidden');

  keepTrackApi.methods.uiManagerInit();

  initBottomMenuResizing();

  // Initialize Navigation and Select Menus
  let elems;
  elems = document.querySelectorAll('.dropdown-button');
  M.Dropdown.init(elems);
};
export const initBottomMenuResizing = () => {
  // Allow Resizing the bottom menu
  const maxHeight = getEl('bottom-icons') !== null ? getEl('bottom-icons').offsetHeight : 0;
  clickAndDragHeight(getEl('bottom-icons-container'), maxHeight, () => {
    let bottomHeight = getEl('bottom-icons-container').offsetHeight;
    document.documentElement.style.setProperty('--bottom-menu-height', bottomHeight + 'px');
    if (window.getComputedStyle(getEl('nav-footer')).bottom !== '0px') {
      document.documentElement.style.setProperty('--bottom-menu-top', '0px');
    } else {
      bottomHeight = getEl('bottom-icons-container').offsetHeight;
      document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
    }
  });
};
export const onReady = () => {
  // Code Once index.htm is loaded
  if (settingsManager.offline) updateInterval = 250;

  // Load Bottom icons
  if (!settingsManager.disableUI) {
    $.event.special.touchstart = {
      setup: function (_, ns, handle: any) {
        if (ns.includes('noPreventDefault')) {
          this.addEventListener('touchstart', handle, { passive: false });
        } else {
          this.addEventListener('touchstart', handle, { passive: true });
        }
      },
    };
  }

  (function _menuInit() {
    $('.tooltipped').tooltip(<any>{ delay: 50 });

    // Setup Legend Colors
    legendColorsChange();
  })();

  uiManager.clearRMBSubMenu = () => {
    getEl('save-rmb-menu').style.display = 'none';
    getEl('view-rmb-menu').style.display = 'none';
    getEl('edit-rmb-menu').style.display = 'none';
    getEl('create-rmb-menu').style.display = 'none';
    getEl('colors-rmb-menu').style.display = 'none';
    getEl('draw-rmb-menu').style.display = 'none';
    getEl('earth-rmb-menu').style.display = 'none';
  };

  uiManager.menuController = initMenuController;

  // Run any plugins code
  keepTrackApi.methods.uiManagerOnReady();
  uiManager.bottomIconPress = (el: HTMLElement) => keepTrackApi.methods.bottomMenuClick(el.id);
  getEl('bottom-icons').addEventListener('click', function (evt: Event) {
    if ((<HTMLElement>evt.target).parentElement.id === 'bottom-icons') {
      uiManager.bottomIconPress(<HTMLElement>evt.target);
    } else {
      uiManager.bottomIconPress((<HTMLElement>evt.target).parentElement);
    }
  });
  uiManager.hideSideMenus = () => {
    closeColorbox();
    keepTrackApi.methods.hideSideMenus();
  };
  (<any>$('#bottom-icons')).sortable({ tolerance: 'pointer' });
};
// This runs after the drawManager starts
export const postStart = () => {
  initUiValidation();

  setTimeout(() => {
    document.querySelectorAll('img').forEach((img: any) => {
      if (!img.src.includes('.png') && !img.src.includes('.jpg')) {
        img.src = img.attributes.delayedsrc?.value;
      }
    });
  }, 0);

  (function _httpsCheck() {
    if (location.protocol !== 'https:') {
      try {
        getEl('cs-geolocation').style.display = 'none';
        getEl('geolocation-btn').style.display = 'none';
      } catch {
        // Intended to catch errors when the page is not loaded yet
      }
    }
  })();

  // Enable Satbox Overlay
  if (settingsManager.enableHoverOverlay) {
    try {
      const hoverboxDOM = document.createElement('div');
      hoverboxDOM.innerHTML = `
        <div id="sat-hoverbox">
          <span id="sat-hoverbox1"></span>
          <br/>
          <span id="sat-hoverbox2"></span>
          <br/>
          <span id="sat-hoverbox3"></span>
        </div>`;

      getEl('keeptrack-canvas').parentElement.append(hoverboxDOM);
    } catch {
      /* istanbul ignore next */
      console.debug('document.createElement() failed!');
    }
  }
};

export const uiManager: UiManager = {
  lastBoxUpdateTime: 0,
  hideUi,
  legendColorsChange,
  legendMenuChange,
  isUiVisible: false,
  keyHandler,
  uiInput,
  useCurrentGeolocationAsSensor,
  searchBox,
  mobileManager,
  isCurrentlyTyping: false,
  onReady,
  init,
  postStart,
  getsensorinfo,
  footerToggle,
  searchToggle,
  hideSideMenus: null,
  hideLoadingScreen,
  loadStr,
  colorSchemeChangeAlert,
  lastColorScheme: null,
  updateURL,
  lookAtLatLon: null,
  reloadLastSensor,
  doSearch,
  panToStar,
  clearRMBSubMenu: null,
  menuController: null,
  legendHoverMenuClick,
  bottomIconPress: null,
  toast,
  createClockDOMOnce: false,
  lastNextPassCalcSatId: 0,
  lastNextPassCalcSensorId: null,
  resize2DMap: null,
  isAnalysisMenuOpen: false,
  updateNextPassOverlay: null,
  earthClicked: null,
};
