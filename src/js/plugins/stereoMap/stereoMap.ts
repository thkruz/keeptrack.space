import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

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
export const init = (): void => {
  const { uiManager, settingsManager, objectManager, satSet } = keepTrackApi.programs;
  
  let mapManager: any = {};
  mapManager.isMapMenuOpen = false;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const tan = (deg: number) => Math.tan(rad(deg));
  const deg = (rad: number) => (rad * 180) / Math.PI;

  const defaults = {
    meridian: 0,
    standardParallel: 0,
    latLimit: 90,
  };

  let satCrunchNow = 0;

  mapManager.options = (opt: any) => ({ ...defaults, ...(opt || {}) });

  mapManager.braun = (point: { wgs: any; lon: any; lat: number; x: number; y: number }, opt: { meridian: number; latLimit: number }) => {
    point = mapManager.check(point);
    // opt = options(opt);
    if (point.wgs) {
      point = mapManager.addMeridian(point, opt.meridian);
      return {
        x: rad(point.lon) / (2 * Math.PI) + 0.5,
        y: (tan(opt.latLimit / 2) - tan(point.lat / 2)) / Math.PI,
      };
    } else {
      var result = {
        lon: deg((2 * point.x - 1) * Math.PI),
        lat: deg(2 * Math.atan(tan(opt.latLimit / 2) - point.y * Math.PI)),
      };
      return mapManager.addMeridian(result, opt.meridian * -1);
    }
  };

  mapManager.check = (point: { x: number; y: string | number; lon: string | number; lat: string | number }) => {
    if (typeof point.x !== 'undefined' && point.x >= 0 && point.x <= 1 && typeof point.y !== 'undefined' && typeof point.lon === 'undefined' && typeof point.lat === 'undefined') {
      return { x: +point.x, y: +point.y, wgs: false };
    }
    if (typeof point.lon !== 'undefined' && typeof point.lat !== 'undefined' && typeof point.x === 'undefined' && typeof point.y === 'undefined') {
      return { lon: +point.lon, lat: +point.lat, wgs: true };
    }
    throw new Error('Invalid input point.');
  };

  mapManager.addMeridian = (point: { lon: number; lat: any }, meridian: number) => {
    point = mapManager.check(point);
    if (meridian !== 0) {
      return mapManager.check({
        lon: ((point.lon + 180 + 360 - meridian) % 360) - 180,
        lat: point.lat,
      });
    }
    return point;
  };

  mapManager.updateMap = () => {
    const { sensorManager, satellite, mapManager, settingsManager, objectManager, satSet } = keepTrackApi.programs;
    if (objectManager.selectedSat === -1) return;
    if (!mapManager.isMapMenuOpen) return;
    var sat = satSet.getSat(objectManager.selectedSat);
    var map;
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
          lon: sensorManager.currentSensor.lon,
          lat: sensorManager.currentSensor.lat,
        },
        { meridian: 0, latLimit: 90 }
      );
      map.x = map.x * settingsManager.mapWidth - 10;
      map.y = (map.y / 0.6366197723675813) * settingsManager.mapHeight - 10;
      $('#map-sensor').attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;z-index:11;'); // Set to size of the map image (800x600)
    }
    for (var i = 1; i <= 50; i++) {
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
      if (satellite.map(sat, i).inview === 1) {
        $('#map-look' + i).attr('src', 'img/yellow-square.png'); // If inview then make yellow
      } else {
        $('#map-look' + i).attr('src', 'img/red-square.png'); // If not inview then make red
      }
      $('#map-look' + i).attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;'); // Set to size of the map image (800x600)
      $('#map-look' + i).attr('time', satellite.map(sat, i).time);
    }
  };

  keepTrackApi.programs.mapManager = mapManager;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'stereoMap',
    cb: () => {
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
          <img alt="map" src="" delayedsrc="data:image/png;base64,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">
          <span class="bmenu-title">Stereo Map</span>
          <div class="status-icon"></div>
        </div>
      `);

      const resize2DMap = function () {
        const mapImageDOM = $('#map-image');
        const mapMenuDOM = $('#map-menu');

        if ($(window).width() > $(window).height()) {
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

      resize2DMap();

      $(window).on('resize', function () {
        if (!settingsManager.disableUI) {
          resize2DMap();
        }
      });

      $('#fullscreen-icon').on('click', function () {
        uiManager.resize2DMap();
      });

      $('#map-menu').on('click', '.map-look', function (evt) {
        const { timeManager } = keepTrackApi.programs;
        settingsManager.isMapUpdateOverride = true;
        // Might be better code for this.
        var time = evt.currentTarget.attributes.time.value;
        if (time !== null) {
          time = time.split(' ');
          time = new Date(time[0] + 'T' + time[1] + 'Z');
          var today = new Date(); // Need to know today for offset calculation
          timeManager.propOffset = time.getTime() - today.getTime(); // Find the offset from today
          satSet.satCruncher.postMessage({
            // Tell satSet.satCruncher we have changed times for orbit calculations
            typ: 'offset',
            dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
          });
        }
      });

      if ($(window).width() > $(window).height()) {
        settingsManager.mapHeight = $(window).width(); // Subtract 12 px for the scroll
        $('#map-image').width(settingsManager.mapHeight);
        settingsManager.mapHeight = (settingsManager.mapHeight * 3) / 4;
        $('#map-image').height(settingsManager.mapHeight);
        $('#map-menu').width($(window).width());
      } else {
        settingsManager.mapHeight = $(window).height() - 100; // Subtract 12 px for the scroll
        $('#map-image').height(settingsManager.mapHeight);
        settingsManager.mapHeight = (settingsManager.mapHeight * 4) / 3;
        $('#map-image').width(settingsManager.mapHeight);
        $('#map-menu').width($(window).width());
      }
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'stereoMap',
    cb: (iconName: string): void => {
      if (iconName === 'menu-map') {
        if (mapManager.isMapMenuOpen) {
          mapManager.isMapMenuOpen = false;
          uiManager.hideSideMenus();
          return;
        }
        if (!mapManager.isMapMenuOpen) {
          if (objectManager.selectedSat === -1) {
            // No Satellite Selected
            if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.mapDisabled();
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (!$('#menu-map:animated').length) {
              $('#menu-map').effect('shake', {
                distance: 10,
              });
            }
            return;
          }
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#map-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          mapManager.isMapMenuOpen = true;
          console.warn(mapManager);
          mapManager.updateMap();
          var satData = satSet.getSatExtraOnly(objectManager.selectedSat);
          $('#map-sat').tooltip({
            // delay: 50,
            html: satData.SCC_NUM,
            position: 'left',
          });
          $('#menu-map').addClass('bmenu-item-selected');
          return;
        }
        return;
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'stereoMap',
    cb: (): void => {
      $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-map').removeClass('bmenu-item-selected');
      mapManager.isMapMenuOpen = false;
    },
  });

  keepTrackApi.register({
    method: 'onCruncherMessage',
    cbName: 'stereoMap',
    cb: (): void => {
      if (mapManager.isMapMenuOpen || settingsManager.isMapUpdateOverride) {
        satCrunchNow = Date.now();
        if (satCrunchNow > settingsManager.lastMapUpdateTime + 30000) {
          mapManager.updateMap();
          settingsManager.lastMapUpdateTime = satCrunchNow;
          settingsManager.isMapUpdateOverride = false;
        } else if (settingsManager.isMapUpdateOverride) {
          mapManager.updateMap();
          settingsManager.lastMapUpdateTime = satCrunchNow;
          settingsManager.isMapUpdateOverride = false;
        }
      }
    },
  });
};