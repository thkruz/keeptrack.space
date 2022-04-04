/*!
  mapManager.js was created by Theodore Kruczek using the work of
  Julius Tens' "projections" library (https://github.com/juliuste/projections).
  This file is exclusively released under the same license as the original author.
  The license only applies to map.js

  The MIT License
  Copyright (c) 2017, Julius Tens

  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
  to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included
  in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { MapManager } from '@app/js/api/keepTrackTypes';
import $ from 'jquery';
import mapPng from '@app/img/icons/map.png';

const defaults = {
  meridian: 0,
  standardParallel: 0,
  latLimit: 90,
};

export const rad = (degIn: number) => (degIn * Math.PI) / 180;
export const tan = (degIn: number) => Math.tan(rad(degIn));
export const deg = (radIn: number) => (radIn * 180) / Math.PI;
export const init = (): void => {
  const mapManager: MapManager = <MapManager>(<unknown>{
    options,
    braun,
    check,
    addMeridian,
    updateMap,
    isMapMenuOpen: false,
    mapManager: 0,
  });

  keepTrackApi.programs.mapManager = mapManager;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'stereoMap',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'stereoMap',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'stereoMap',
    cb: hideSideMenus,
  });

  keepTrackApi.register({
    method: 'onCruncherMessage',
    cbName: 'stereoMap',
    cb: onCruncherMessage,
  });
};
export const options = (opt: any) => ({ ...defaults, ...(opt || {}) });
export const braun = (point: any, opt: { meridian: number; latLimit: number }) => {
  point = check(point);
  if (point.wgs) {
    point = addMeridian(point, opt.meridian);
    return {
      x: rad(point.lon) / (2 * Math.PI) + 0.5,
      y: (tan(opt.latLimit / 2) - tan(point.lat / 2)) / Math.PI,
    };
  } else {
    const result = {
      lon: deg((2 * point.x - 1) * Math.PI),
      lat: deg(2 * Math.atan(tan(opt.latLimit / 2) - point.y * Math.PI)),
    };
    return addMeridian(result, opt.meridian * -1);
  }
};
export const check = (point: { x?: number; y?: number; lon?: number; lat?: number }) => {
  if (typeof point.x !== 'undefined' && point.x >= 0 && point.x <= 1 && typeof point.y !== 'undefined' && typeof point.lon === 'undefined' && typeof point.lat === 'undefined') {
    return { x: point.x, y: point.y, wgs: false };
  }
  if (typeof point.lon !== 'undefined' && typeof point.lat !== 'undefined' && typeof point.x === 'undefined' && typeof point.y === 'undefined') {
    return { lon: point.lon, lat: point.lat, wgs: true };
  }
  throw new Error('Invalid input point.');
};
export const addMeridian = (point: { x?: number; y?: number; wgs?: boolean; lon: number; lat: number }, meridian: number) => {
  const pointResults = check(point);
  if (meridian !== 0) {
    return check({
      lon: ((pointResults.lon + 180 + 360 - meridian) % 360) - 180,
      lat: pointResults.lat,
    });
  }
  return pointResults;
};
export const updateMap = (): void => {
  const { sensorManager, satellite, mapManager, objectManager, satSet } = keepTrackApi.programs;
  if (objectManager.selectedSat === -1) return;
  if (!mapManager.isMapMenuOpen) return;
  const sat = satSet.getSat(objectManager.selectedSat);
  let map;
  sat.getTEARR();
  map = mapManager.braun(
    {
      lon: satellite.degreesLong(satellite.currentTEARR.lon),
      lat: satellite.degreesLat(satellite.currentTEARR.lat),
    },
    { meridian: 0, latLimit: 90 }
  );
  map.x = map.x * settingsManager.mapWidth - 10;
  map.y = (map.y / 0.6366197723675813) * settingsManager.mapHeight - 10;
  $('#map-sat').attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;'); // Set to size of the map image (800x600)
  if (sensorManager.checkSensorSelected()) {
    map = mapManager.braun(
      {
        lon: sensorManager.currentSensor[0].lon,
        lat: sensorManager.currentSensor[0].lat,
      },
      { meridian: 0, latLimit: 90 }
    );
    map.x = map.x * settingsManager.mapWidth - 10;
    map.y = (map.y / 0.6366197723675813) * settingsManager.mapHeight - 10;
    $('#map-sensor').attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;z-index:11;'); // Set to size of the map image (800x600)
  }
  for (let i = 1; i <= 50; i++) {
    map = mapManager.braun(
      {
        lon: satellite.map(sat, i).lon,
        lat: satellite.map(sat, i).lat,
      },
      { meridian: 0, latLimit: 90 }
    );
    map.x = map.x * settingsManager.mapWidth - 3.5;
    map.y = (map.y / 0.6366197723675813) * settingsManager.mapHeight - 3.5;
    if (map.y > settingsManager.mapHeight / 2) {
      $('#map-look' + i).tooltip({
        // delay: 50,
        html: satellite.map(sat, i).time,
        position: 'top',
      });
    } else {
      $('#map-look' + i).tooltip({
        // delay: 50,
        html: satellite.map(sat, i).time,
        position: 'bottom',
      });
    }
    if (satellite.map(sat, i).inView) {
      $('#map-look' + i).attr('src', 'img/yellow-square.png'); // If inview then make yellow
    } else {
      $('#map-look' + i).attr('src', 'img/red-square.png'); // If not inview then make red
    }
    $('#map-look' + i).attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;'); // Set to size of the map image (800x600)
    $('#map-look' + i).attr('time', satellite.map(sat, i).time);
  }
};
export const resize2DMap = function (isForceWidescreen?: boolean): void {
  isForceWidescreen ??= false;
  const mapImageDOM = $('#map-image');
  const mapMenuDOM = $('#map-menu');

  if (isForceWidescreen || $(window).width() > $(window).height()) {
    // If widescreen
    settingsManager.mapWidth = $(window).width();
    mapImageDOM.width(settingsManager.mapWidth);
    settingsManager.mapHeight = (settingsManager.mapWidth * 3) / 4;
    mapImageDOM.height(settingsManager.mapHeight);
    mapMenuDOM.width($(window).width());
  } else {
    settingsManager.mapHeight = $(window).height() - 100; // Subtract 100 portrait (mobile)
    mapImageDOM.height(settingsManager.mapHeight);
    settingsManager.mapWidth = (settingsManager.mapHeight * 4) / 3;
    mapImageDOM.width(settingsManager.mapWidth);
    mapMenuDOM.width($(window).width());
  }
};
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  if (iconName === 'menu-map') {
    const { mapManager, uiManager, objectManager, satSet } = keepTrackApi.programs;
    if (mapManager.isMapMenuOpen) {
      mapManager.isMapMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (objectManager.selectedSat === -1) {
        // No Satellite Selected
        if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.mapDisabled();
        uiManager.toast(`Select a Satellite First!`, 'caution');
        if (!$('#menu-map:animated').length) {
          (<any>$('#menu-map')).effect('shake', {
            distance: 10,
          });
        }
        return;
      }
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      (<any>$('#map-menu')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
      mapManager.isMapMenuOpen = true;
      mapManager.updateMap();
      const satData = satSet.getSatExtraOnly(objectManager.selectedSat);
      $('#map-sat').tooltip({
        // delay: 50,
        html: satData.sccNum,
        position: 'left',
      });
      $('#menu-map').addClass('bmenu-item-selected');
      return;
    }
  }
};
export const uiManagerInit = (): void => {
  const { uiManager } = keepTrackApi.programs;
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="map-menu" class="side-menu-parent start-hidden side-menu valign-wrapper">
          <img id="map-image" data-src="img/braun-stereographic.jpg" class="lazyload" width="800px" height="600px">
          <img id="map-sat" class="lazyload map-item map-look" data-src="img/satellite-2.png" width="20px" height="20px">
          <img id="map-sensor" class="lazyload map-item map-look start-hidden" data-src="img/radar-1.png" width="20px"
            height="20px">
          <img id="map-look1" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look2" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look3" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look4" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look5" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look6" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look7" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look8" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look9" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look10" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look11" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look12" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look13" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look14" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look15" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look16" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look17" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look18" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look19" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look20" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look21" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look22" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look23" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look24" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look25" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look26" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look27" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look28" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look29" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look30" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look31" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look32" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look33" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look34" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look35" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look36" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look37" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look38" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look39" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look40" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look41" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look42" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look43" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look44" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look45" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look46" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look47" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look48" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look49" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <img id="map-look50" class="lazyload map-item map-look" data-src="img/red-square.png" width="7px" height="7px">
          <div id="braun-credit" style="position:fixed;right:10px;bottom:10px;z-index:5;color:var(--colorTertiaryDarken2);">
            Braun Stereographic Projection (c) Tobias Jung
          </div>
        </div>
      `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-map" class="bmenu-item bmenu-item-disabled">
          <img alt="map" src="" delayedsrc=${mapPng}/>
          <span class="bmenu-title">Stereo Map</span>
          <div class="status-icon"></div>
        </div>
      `);

  resize2DMap();

  $(window).on('resize', function () {
    if (!settingsManager.disableUI) {
      resize2DMap();
    }
  });

  $('#fullscreen-icon').on('click', function () {
    uiManager.resize2DMap();
  });

  $('#map-menu').on('click', '.map-look', function (evt: Event) {
    mapMenuClick(evt);
  });

  resize2DMap();
};
export const onCruncherMessage = (): void => {
  const { mapManager } = keepTrackApi.programs;
  if (mapManager.isMapMenuOpen || settingsManager.isMapUpdateOverride) {
    mapManager.satCrunchNow = Date.now();
    if (mapManager.satCrunchNow > settingsManager.lastMapUpdateTime + 30000 || settingsManager.isMapUpdateOverride) {
      mapManager.updateMap();
      settingsManager.lastMapUpdateTime = mapManager.satCrunchNow;
      settingsManager.isMapUpdateOverride = false;
    }
  }
};
export const hideSideMenus = (): void => {
  const { mapManager } = keepTrackApi.programs;
  (<any>$('#map-menu')).effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-map').removeClass('bmenu-item-selected');
  mapManager.isMapMenuOpen = false;
};
export const mapMenuClick = (evt: any) => {
  const { timeManager } = keepTrackApi.programs;
  settingsManager.isMapUpdateOverride = true;
  // Might be better code for this.
  let time = evt.currentTarget.attributes.time.value;
  if (time !== null) {
    time = time.split(' ');
    time = new Date(time[0] + 'T' + time[1] + 'Z');
    const today = new Date(); // Need to know today for offset calculation
    timeManager.changeStaticOffset(time.getTime() - today.getTime()); // Find the offset from today
  }
};
