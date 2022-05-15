/* /////////////////////////////////////////////////////////////////////////////

http://keeptrack.space

Copyright (C) 2016-2022 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek
Copyright (C) 2015-2016, James Yoder

Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
under the MIT License. Please reference http://keeptrack.space/licenses/thingsinspace.txt

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

///////////////////////////////////////////////////////////////////////////// */

// organize-imports-ignore
import 'jquery-ui-bundle';
import '@app/js/lib/external/jquery-ui-slideraccess.js';
import '@app/js/lib/external/jquery-ui-timepicker.js';
import '@app/js/lib/external/jquery.colorbox.min.js';
import '@app/js/lib/external/colorPick.js';
import '@materializecss/materialize';
// eslint-disable-next-line sort-imports
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { drawManager } from '@app/js/drawManager/drawManager';
import { rgbCss } from '@app/js/lib/helpers';
import { mobileManager } from '@app/js/uiManager/mobileManager';
import { searchBox } from '@app/js/uiManager/searchBox';
import $ from 'jquery';
import { SatObject, SensorObject, UiManager } from '../api/keepTrackTypes';
import { legendColorsChange, legendMenuChange, initUiValidation, uiInput, useCurrentGeolocationAsSensor, keyHandler, initMenuController } from '.';

// materializecss/materialize goes to window.M, but we want a local reference
const M = window.M;

export type toastMsgType = 'standby' | 'normal' | 'caution' | 'serious' | 'critical';

let isSearchOpen = false;
let forceClose = false;
let forceOpen = false;
let isFooterShown = true;
let updateInterval = 1000;

export const init = () => {  
  initUiValidation();

  // Register all UI callbacks to run at the end of the draw loop
  keepTrackApi.register({
    method: 'onDrawLoopComplete',
    cbName: 'updateSelectBox',
    cb: updateSelectBox,
  });

  if (settingsManager.isShowLogo) document.getElementById('demo-logo').classList.remove('start-hidden');

  keepTrackApi.methods.uiManagerInit();

  initBottomMenuResizing();

  // Initialize Materialize
  M.AutoInit();

  // Initialize Navigation and Select Menus
  let elems;
  elems = document.querySelectorAll('.dropdown-button');
  M.Dropdown.init(elems);
};
// This runs after the drawManager starts
export const postStart = () => {
  setTimeout(() => {
    $('img').each(function () {
      $(this).attr('src', $(this).attr('delayedsrc'));
    });
  }, 0);

  (function _httpsCheck() {
    if (location.protocol !== 'https:') {
      try {
        document.getElementById('cs-geolocation').style.display = 'none';
        document.getElementById('geolocation-btn').style.display = 'none';
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

      document.getElementById('keeptrack-canvas').parentElement.append(hoverboxDOM);
    } catch {
      /* istanbul ignore next */
      console.debug('document.createElement() failed!');
    }
  }
};
export const hideUi = () => {
  if (uiManager.isUiVisible) {
    document.getElementById('header').style.display = 'none';
    document.getElementById('ui-wrapper').style.display = 'none';
    document.getElementById('nav-footer').style.display = 'none';
    uiManager.isUiVisible = false;
  } else {
    document.getElementById('header').style.display = 'block';
    document.getElementById('ui-wrapper').style.display = 'block';
    document.getElementById('nav-footer').style.display = 'block';
    uiManager.isUiVisible = true;
  }
};
export const updateSelectBox = () => {
  const { objectManager, satSet, timeManager } = keepTrackApi.programs;

  // IDEA: Include updates when satellite edited regardless of time.

  // Don't update if no object is selected
  if (objectManager.selectedSat === -1) return;

  const sat = satSet.getSat(objectManager.selectedSat);

  // Don't bring up the update box for static dots
  if (typeof sat === 'undefined' || sat.static) return;

  if (timeManager.realTime * 1 > settingsManager.lastBoxUpdateTime * 1 + updateInterval) {
    keepTrackApi.methods.updateSelectBox(sat);
    settingsManager.lastBoxUpdateTime = timeManager.realTime;
  }
};
export const footerToggle = function () {
  if (isFooterShown) {
    isFooterShown = false;
    document.getElementById('sat-infobox').classList.add('sat-infobox-fullsize');
    document.getElementById('nav-footer').classList.add('footer-slide-trans');
    document.getElementById('nav-footer').classList.remove('footer-slide-up');
    document.getElementById('nav-footer').classList.add('footer-slide-down');
    $('#nav-footer-toggle').html('&#x25B2;');
  } else {
    isFooterShown = true;
    document.getElementById('sat-infobox').classList.remove('sat-infobox-fullsize');
    document.getElementById('nav-footer').classList.add('footer-slide-trans');
    document.getElementById('nav-footer').classList.remove('footer-slide-down');
    document.getElementById('nav-footer').classList.add('footer-slide-up');
    $('#nav-footer-toggle').html('&#x25BC;');
  }
  // After 1 second the transition should be complete so lets stop moving slowly
  setTimeout(() => {
    document.getElementById('nav-footer').classList.remove('footer-slide-trans');
  }, 1000);
};
export const getsensorinfo = () => {
  const { currentSensor }: { currentSensor: SensorObject[] } = keepTrackApi.programs.sensorManager;

  const firstSensor = currentSensor[0];
  $('#sensor-latitude').html(firstSensor.lat.toString());
  $('#sensor-longitude').html(firstSensor.lon.toString());
  $('#sensor-minazimuth').html(firstSensor.obsminaz.toString());
  $('#sensor-maxazimuth').html(firstSensor.obsmaxaz.toString());
  $('#sensor-minelevation').html(firstSensor.obsminel.toString());
  $('#sensor-maxelevation').html(firstSensor.obsmaxel.toString());
  $('#sensor-minrange').html(firstSensor.obsminrange.toString());
  $('#sensor-maxrange').html(firstSensor.obsmaxrange.toString());
};
export const legendHoverMenuClick = (legendType?: string) => { // NOSONAR
  const { satSet, colorSchemeManager } = keepTrackApi.programs;

  const slug = legendType.split('-')[1];

  if (slug.startsWith('velocity')) {
    let colorString: [number, number, number, number] = null;
    switch (slug) {
      case 'velocityFast':
        colorString = [0.75, 0.75, 0, 1]
        break;
      case 'velocityMed':
        colorString = [0.75, 0.25, 0, 1]
        break;
      case 'velocitySlow':
        colorString = [1.0, 0, 0.0, 1.0]
        break;
    }
    if (colorSchemeManager.objectTypeFlags[slug]) {
      colorSchemeManager.objectTypeFlags[slug] = false;
      $(`.legend-${slug}-box`).css('background', 'black');
      settingsManager.isForceColorScheme = true;
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
    } else {
      colorSchemeManager.objectTypeFlags[slug] = true;
      $(`.legend-${slug}-box`).css('background', rgbCss(colorString).toString());
      settingsManager.isForceColorScheme = true;
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
    }
  } else {
    if (colorSchemeManager.objectTypeFlags[slug]) {
      colorSchemeManager.objectTypeFlags[slug] = false;
      $(`.legend-${slug}-box`).css('background', 'black');
      settingsManager.isForceColorScheme = true;
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
    } else {
      colorSchemeManager.objectTypeFlags[slug] = true;
      $(`.legend-${slug}-box`).css('background', rgbCss(settingsManager.colors[slug]));
      settingsManager.isForceColorScheme = true;
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
    }
  }
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
    uiManager.legendColorsChange();
  })();

  uiManager.clearRMBSubMenu = () => {
    document.getElementById('save-rmb-menu').style.display = 'none';
    document.getElementById('view-rmb-menu').style.display = 'none';
    document.getElementById('edit-rmb-menu').style.display = 'none';
    document.getElementById('create-rmb-menu').style.display = 'none';
    document.getElementById('colors-rmb-menu').style.display = 'none';
    document.getElementById('draw-rmb-menu').style.display = 'none';
    document.getElementById('earth-rmb-menu').style.display = 'none';
  };

  uiManager.menuController = initMenuController;

  // Run any plugins code
  keepTrackApi.methods.uiManagerOnReady();
  uiManager.bottomIconPress = (el: HTMLElement) => keepTrackApi.methods.bottomMenuClick(el.id);
  document.getElementById('bottom-icons').addEventListener('click', function (evt: Event) {
    // Only if '.bmenu-item' class is clicked
    // if ((<HTMLDivElement>evt.target).classList.contains('bmenu-item')) {
      uiManager.bottomIconPress((<HTMLElement>evt.target).parentElement);
    // }
  });
  uiManager.hideSideMenus = () => {
    // Close any open colorboxes
    try {
      (<any>$).colorbox.close();
    } catch {
      // Intentionally Left Blank (Fails Jest Testing)
    }

    keepTrackApi.methods.hideSideMenus();
  };
  (<any>$('#bottom-icons')).sortable({ tolerance: 'pointer' });
};

export const panToStar = (c: SatObject): void => {
  const { objectManager, satSet, lineManager, mainCamera, starManager } = keepTrackApi.programs;

  // Try with the pname
  let satId = satSet.getIdFromStarName(c.name);
  let sat = satSet.getSat(satId);

  if (sat == null) throw new Error('Star not found');

  lineManager.clear();
  if (objectManager.isStarManagerLoaded) {
    starManager.isAllConstellationVisible = false;
  }

  lineManager.create('ref', [sat.position.x, sat.position.y, sat.position.z], [1, 0.4, 0, 1]);
  mainCamera.cameraType.current = mainCamera.cameraType.Offset;
  mainCamera.lookAtObject(sat, false);
};
export const loadStr = (str) => {
  if (str == '') {
    $('#loader-text').html('');
    return;
  }
  if (str == 'math') {
    $('#loader-text').html('Attempting to Math...');
  }

  switch (str) {
    case 'science':
      $('#loader-text').html('Locating Science...');
      console.log('Locating Science...');
      break;
    case 'science2':
      $('#loader-text').html('Found Science...');
      console.log('Found Science...');
      break;
    case 'dots':
      $('#loader-text').html('Drawing Dots in Space...');
      console.log('Drawing Dots in Space...');
      break;
    case 'satIntel':
      $('#loader-text').html('Integrating Satellite Intel...');
      console.log('Integrating Satellite Intel...');
      break;
    case 'radarData':
      $('#loader-text').html('Importing Radar Data...');
      console.log('Importing Radar Data...');
      break;
    case 'painting':
      $('#loader-text').html('Painting the Earth...');
      console.log('Painting the Earth...');
      break;
    case 'coloring':
      $('#loader-text').html('Coloring Inside the Lines...');
      console.log('Coloring Inside the Lines...');
      break;
    case 'elsets':
      $('#loader-text').html('Locating ELSETs...');
      console.log('Locating ELSETs...');
      break;
    case 'models':
      $('#loader-text').html('Loading 3D Models...');
      console.log('Loading 3D Models...');
      break;
    case 'easterEgg':
      $('#loader-text').html('Llama Llama Llama Duck!');
      console.log('Llama Llama Llama Duck!');
  }
};
export const doSearch = (searchString: string, isPreventDropDown: boolean) => {
  if (searchString == '') {
    searchBox.hideResults();
    return;
  }

  const { satSet } = keepTrackApi.programs;

  let idList = searchBox.doSearch(searchString, isPreventDropDown);
  if (idList.length === 0) return;

  if (settingsManager.isSatOverflyModeOn) {
    satSet.satCruncher.postMessage({
      typ: 'satelliteSelected',
      satelliteSelected: idList,
    });
  }
  // Don't let the search overlap with the legend
  uiManager.legendMenuChange('clear');
  uiManager.updateURL();
};
export const toast = (toastText: string, type: toastMsgType, isLong: boolean) => {
  let toastMsg = M.toast({
    html: toastText,
  });
  type = type || 'standby';
  if (isLong) toastMsg.timeRemaining = 100000;
  switch (type) {
    case 'standby':
      toastMsg.$el[0].style.background = 'var(--statusDarkStandby)';
      keepTrackApi.programs.soundManager.play('standby');
      break;
    case 'normal':
      toastMsg.$el[0].style.background = 'var(--statusDarkNormal)';
      keepTrackApi.programs.soundManager.play('standby');
      break;
    case 'caution':
      toastMsg.$el[0].style.background = 'var(--statusDarkCaution)';
      break;
    case 'serious':
      toastMsg.$el[0].style.background = 'var(--statusDarkSerious)';
      break;
    case 'critical':
      toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
      break;
  }
};
export const updateURL = () => {
  const { objectManager, satSet, timeManager } = keepTrackApi.programs;

  var arr = window.location.href.split('?');
  var url = arr[0];
  var paramSlices = [];

  if (settingsManager.trusatMode) {
    paramSlices.push('trusat');
  }
  if (objectManager.selectedSat !== -1 && typeof satSet.getSatExtraOnly(objectManager.selectedSat).sccNum != 'undefined') {
    paramSlices.push('sat=' + satSet.getSatExtraOnly(objectManager.selectedSat).sccNum);
  }
  var currentSearch = searchBox.getCurrentSearch();
  if (currentSearch !== '') {
    paramSlices.push('search=' + currentSearch);
  }
  if (timeManager.propRate < 0.99 || timeManager.propRate > 1.01) {
    paramSlices.push('rate=' + timeManager.propRate);
  }

  if (timeManager.staticOffset < -1000 || timeManager.staticOffset > 1000) {
    paramSlices.push('date=' + (timeManager.dynamicOffsetEpoch + timeManager.staticOffset).toString());
  }

  if (paramSlices.length > 0) {
    url += '?' + paramSlices.join('&');
  }

  window.history.replaceState(null, 'Keeptrack', url);
};
export const reloadLastSensor = () => {
  let currentSensor;
  try {
    currentSensor = JSON.parse(localStorage.getItem('currentSensor'));
  } catch (e) {
    currentSensor = null;
  }
  if (currentSensor !== null) {
    try {
      const { sensorManager, mainCamera, timeManager } = keepTrackApi.programs;

      // If there is a staticnum set use that
      if (typeof currentSensor[0] == 'undefined' || currentSensor[0] == null) {
        sensorManager.setSensor(null, currentSensor[1]);
        uiManager.getsensorinfo();
        uiManager.legendMenuChange('default');
      } else {
        // If the sensor is a string, load that collection of sensors
        if (typeof currentSensor[0].shortName == 'undefined') {
          sensorManager.setSensor(currentSensor[0], currentSensor[1]);
          uiManager.getsensorinfo();
          uiManager.legendMenuChange('default');
          mainCamera.lookAtLatLon(sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, sensorManager.selectedSensor.zoom, timeManager.selectedDate);
        } else {
          // Seems to be a single sensor without a staticnum, load that
          sensorManager.setSensor(sensorManager.sensorList[currentSensor[0].shortName], currentSensor[1]);
          uiManager.getsensorinfo();
          uiManager.legendMenuChange('default');
          mainCamera.lookAtLatLon(sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, sensorManager.selectedSensor.zoom, timeManager.selectedDate);
        }
      }
    } catch (e) {
      // Clear old settings because they seem corrupted
      try {
        localStorage.setItem('currentSensor', null);
        console.warn('Saved Sensor Information Invalid');
      } catch {
        // do nothing
      }
    }
  }
};
export const colorSchemeChangeAlert = (newScheme) => {
  // Don't Make an alert the first time!
  if (typeof uiManager.lastColorScheme == 'undefined' && newScheme.default) {
    uiManager.lastColorScheme = newScheme;
    return;
  }

  const { colorSchemeManager } = keepTrackApi.programs;

  // Don't make an alert unless something has really changed
  if (uiManager.lastColorScheme == newScheme) return;

  for (const scheme in colorSchemeManager) {
    if (newScheme == colorSchemeManager[scheme] && scheme !== 'currentColorScheme') {
      // record the new color scheme
      uiManager.lastColorScheme = newScheme;
      // Make an alert
      uiManager.toast(`Color Scheme Changed to ${scheme}`, 'normal', false);
      return;
    }
  }

  // If we get here, the color scheme is invalid
  throw new Error('Invalid Color Scheme');
};
export const hideLoadingScreen = () => {
  // Don't wait if we are running Jest
  if ((drawManager.sceneManager.earth.isUseHiRes && drawManager.sceneManager.earth.isHiResReady !== true) || typeof process !== 'undefined') {
    setTimeout(function () {
      uiManager.hideLoadingScreen();
    }, 100);
    return;
  }

  // Display content when loading is complete.
  $('#canvas-holder').attr('style', 'display:block');

  mobileManager.checkMobileMode();

  if (settingsManager.isMobileModeEnabled) {
    document.getElementById('spinner').style.display = 'none';
    uiManager.loadStr('math');
    document.getElementById('loading-screen').style.display = 'none';
  } else {
    // Loading Screen Resized and Hidden
    setTimeout(function () {
      document.getElementById('loading-screen').classList.remove('full-loader');
      document.getElementById('loading-screen').classList.add('mini-loader-container');
      document.getElementById('logo-inner-container').classList.add('mini-loader');
      document.getElementById('logo-text').innerHTML = '';
      document.getElementById('logo-text-version').innerHTML = '';
      document.getElementById('loading-screen').style.display = 'none';
      uiManager.loadStr('math');
    }, 100);
  }
};
export const searchToggle = (force?: boolean) => {
  // Reset Force Options
  forceClose = false;
  forceOpen = false;

  // Pass false to force close and true to force open
  if (typeof force != 'undefined') {
    if (!force) forceClose = true;
    if (force) forceOpen = true;
  }

  if ((!isSearchOpen && !forceClose) || forceOpen) {
    isSearchOpen = true;
    document.getElementById('search-holder').classList.remove('search-slide-up');
    document.getElementById('search-holder').classList.add('search-slide-down');
    document.getElementById('search-icon').classList.add('search-icon-search-on');
    document.getElementById('fullscreen-icon').classList.add('top-menu-icons-search-on');
    document.getElementById('tutorial-icon').classList.add('top-menu-icons-search-on');
    document.getElementById('legend-icon').classList.add('top-menu-icons-search-on');
  } else {
    isSearchOpen = false;
    document.getElementById('search-holder').classList.remove('search-slide-down');
    document.getElementById('search-holder').classList.add('search-slide-up');
    document.getElementById('search-icon').classList.remove('search-icon-search-on');
    setTimeout(function () {
      document.getElementById('fullscreen-icon').classList.remove('top-menu-icons-search-on');
      document.getElementById('tutorial-icon').classList.remove('top-menu-icons-search-on');
      document.getElementById('legend-icon').classList.remove('top-menu-icons-search-on');
    }, 500);
    uiManager.hideSideMenus();
    searchBox.hideResults();
    // document.getElementById('menu-space-stations').classList.remove('bmenu-item-selected');
    // This is getting called too much. Not sure what it was meant to prevent?
    // satSet.setColorScheme(colorSchemeManager.default, true);
    // uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
  }
};
export const initBottomMenuResizing = () => {
  // Allow Resizing the bottom menu
  const maxHeight = document.getElementById('bottom-icons') !== null ? document.getElementById('bottom-icons').offsetHeight : 0;
  $('.resizable').resizable({
    handles: {
      n: '#footer-handle',
    },
    alsoResize: '#bottom-icons-container',
    // No larger than the stack of icons
    maxHeight: maxHeight,
    minHeight: 50,
    stop: () => {
      let bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
      document.documentElement.style.setProperty('--bottom-menu-height', bottomHeight + 'px');
      if (window.getComputedStyle(document.getElementById('nav-footer')).bottom !== '0px') {
        document.documentElement.style.setProperty('--bottom-menu-top', '0px');
      } else {
        bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
        document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
      }
    },
  });
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
