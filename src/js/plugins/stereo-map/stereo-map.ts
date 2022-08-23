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

import mapPng from '@app/img/icons/map.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { MapManager } from '@app/js/api/keepTrackTypes';
import { getEl, shake, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import './components/stereo-map.css';

const earthImg = new Image();

export const init = (): void => {
  const mapManager: MapManager = <MapManager>(<unknown>{
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

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'stereoMap',
    cb: uiManagerFinal,
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

// prettier-ignore
export const updateMap = async (): Promise<void> => { // NOSONAR
  try {
    const { sensorManager, satellite, mapManager, objectManager, satSet } = keepTrackApi.programs;
    if (objectManager.selectedSat === -1) return;
    if (!mapManager.isMapMenuOpen) return;

    const map2d = <HTMLCanvasElement>getEl('map-2d');
    const ctx = map2d.getContext('2d');
    // const canvasDistanceFromTop = map2d.getBoundingClientRect().top;

    const sat = satSet.getSat(objectManager.selectedSat);
    sat.getTEARR();
    let map = {
      x: ((satellite.degreesLong(satellite.currentTEARR.lon) + 180) / 360) * settingsManager.mapWidth,
      y: settingsManager.mapHeight - ((satellite.degreesLat(satellite.currentTEARR.lat) + 90) / 180) * settingsManager.mapHeight,
    };
    const satDom = <HTMLImageElement>getEl('map-sat');
    getEl('map-sat').style.display = 'block';
    getEl('map-sat').style.left = `${map.x - satDom.width / 2}px`;
    getEl('map-sat').style.top = `${map.y - satDom.height / 2}px`;

    if (sensorManager.checkSensorSelected()) {
      map = {
        x: ((sensorManager.currentSensor[0].lon + 180) / 360) * settingsManager.mapWidth,
        y: settingsManager.mapHeight - ((sensorManager.currentSensor[0].lat + 90) / 180) * settingsManager.mapHeight,
      };
      const sensorDom = <HTMLImageElement>getEl('map-sensor');
      getEl('map-sensor').style.display = 'block';
      getEl('map-sensor').style.left = `${map.x - sensorDom.width / 2}px`;
      getEl('map-sensor').style.top = `${map.y - sensorDom.height / 2}px`;
    }

    await drawEarthLayer(ctx);
    const groundTracePoints = [];
    const pointPerOrbit = 512;
    // We only have 50 clickable markers
    const selectableInterval = Math.ceil(pointPerOrbit / 50);
    let selectableIdx = 1;

    // Start at 1 so that the first point is NOT the satellite
    for (let i = 1; i <= pointPerOrbit; i++) {
      let map = satellite.map(sat, i, pointPerOrbit);
      groundTracePoints.push({
        x: ((map.lon + 180) / 360) * settingsManager.mapWidth,
        y: settingsManager.mapHeight - ((map.lat + 90) / 180) * settingsManager.mapHeight,
        inView: map.inView,
      });

      if (i % selectableInterval === 0) {
        // If inview then make yellow
        // If not inview then make red
        (<HTMLImageElement>getEl(`map-look${selectableIdx}`)).src = map.inView ? 'img/yellow-square.png' : 'img/red-square.png';

        (<HTMLImageElement>getEl(`map-look${selectableIdx}`)).style.left = `${groundTracePoints[i - 1].x - 4}px`;
        (<HTMLImageElement>getEl(`map-look${selectableIdx}`)).style.top = `${groundTracePoints[i - 1].y - 4}px`;
        (<HTMLImageElement>getEl(`map-look${selectableIdx}`)).dataset.time = map.time;
        selectableIdx++;
      }
    }

    // Draw ground trace
    const bigJumpSize = 0.2 * settingsManager.mapWidth;
    ctx.strokeStyle = groundTracePoints[0].inView ? '#ffff00' : '#ff0000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(groundTracePoints[0].x, groundTracePoints[0].y);
    for (let i = 1; i < groundTracePoints.length; i++) {
      if (!groundTracePoints[i].inView && groundTracePoints[i - 1].inView) {
        // We are now out of view
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#ff0000';
        ctx.moveTo(groundTracePoints[i - 1].x, groundTracePoints[i - 1].y);
        ctx.lineTo(groundTracePoints[i].x, groundTracePoints[i].y);
      } else if (groundTracePoints[i].inView && !groundTracePoints[i - 1].inView) {
        // We are now in view
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#ffff00';
        ctx.moveTo(groundTracePoints[i - 1].x, groundTracePoints[i - 1].y);
        ctx.lineTo(groundTracePoints[i].x, groundTracePoints[i].y);
      } else if (groundTracePoints[i].x - groundTracePoints[i - 1].x > bigJumpSize || groundTracePoints[i - 1].x - groundTracePoints[i].x > bigJumpSize) {
        // If there is a big jump assume we crossed a pole and should
        // jump to the next point to continue drawing the line
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(groundTracePoints[i].x, groundTracePoints[i].y);
      } else {
        ctx.lineTo(groundTracePoints[i].x, groundTracePoints[i].y);
      }
    }
    ctx.stroke();

    let d = new Date();
    let n = d.getUTCFullYear();
    const copyrightStr = !settingsManager.copyrightOveride ? `©${n} KEEPTRACK.SPACE` : '';
    let cw = map2d.width;
    let ch = map2d.height;
    ctx.font = '24px nasalization';
    let textWidth = ctx.measureText(copyrightStr).width;
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'black';
    ctx.fillText(copyrightStr, cw - textWidth - 30, ch - 30);

    if (settingsManager.classificationStr !== '') {
      ctx.font = '24px nasalization';
      textWidth = ctx.measureText(settingsManager.classificationStr).width;
      ctx.globalAlpha = 1.0;
      switch (settingsManager.classificationStr) {
        case 'Top Secret//SCI':
          ctx.fillStyle = '#fce93a';
          break;
        case 'Top Secret':
          ctx.fillStyle = '#ff8c00';
          break;
        case 'Secret':
          ctx.fillStyle = '#ff0000';
          break;
        case 'Confidential':
          ctx.fillStyle = '#0033a0';
          break;
        case 'CUI':
          ctx.fillStyle = '#512b85';
          break;
        case 'Unclassified':
          ctx.fillStyle = '#007a33';
          break;
        default:
          throw new Error('Invalid classification');
      }
      ctx.fillText(settingsManager.classificationStr, cw / 2 - textWidth, ch - 20);
      ctx.fillText(settingsManager.classificationStr, cw / 2 - textWidth, 34);
    }
  } catch (e) {
    console.debug(e);
  }
};
export const resize2DMap = function (isForceWidescreen?: boolean): void {
  isForceWidescreen ??= false;
  const mapMenuDOM = getEl('map-menu');
  const map2d = <HTMLCanvasElement>getEl('map-2d');

  if (isForceWidescreen || window.innerWidth > window.innerHeight) {
    // If widescreen
    settingsManager.mapWidth = window.innerWidth;
    settingsManager.mapHeight = (settingsManager.mapWidth * 1) / 2;
    mapMenuDOM.style.width = window.innerWidth + 'px';

    map2d.width = settingsManager.mapWidth;
    map2d.height = settingsManager.mapHeight;
  } else {
    settingsManager.mapHeight = window.innerHeight - 100; // Subtract 100 portrait (mobile)
    settingsManager.mapWidth = (settingsManager.mapHeight * 2) / 1;
    mapMenuDOM.style.width = settingsManager.mapWidth + 'px';

    map2d.width = settingsManager.mapWidth;
    map2d.height = settingsManager.mapHeight;
  }

  // Update map canvas
  const ctx = map2d.getContext('2d');
  drawEarthLayer(ctx);
};

export const drawEarthLayer = async (ctx: CanvasRenderingContext2D): Promise<void> => {
  if (earthImg.src) {
    ctx.drawImage(earthImg, 0, 0, settingsManager.mapWidth, settingsManager.mapHeight);
    return Promise.resolve();
  } else {
    // earthImg.src = `${settingsManager.installDirectory}textures/earthmap16k.jpg`;
    earthImg.src = `${settingsManager.installDirectory}textures/earthmap4k.jpg`;
    earthImg.onload = () => {
      ctx.drawImage(earthImg, 0, 0, settingsManager.mapWidth, settingsManager.mapHeight);
      return Promise.resolve();
    };
  }
};

// prettier-ignore
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  if (iconName === 'menu-map') {
    const { mapManager, uiManager, objectManager } = keepTrackApi.programs;
    if (mapManager.isMapMenuOpen) {
      mapManager.isMapMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (objectManager.selectedSat === -1) {
        // No Satellite Selected
        if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.mapDisabled();
        uiManager.toast(`Select a Satellite First!`, 'caution');
        shake(getEl('menu-map'));
        return;
      }
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('map-menu'), 1000);
      mapManager.isMapMenuOpen = true;
      updateMap();
      getEl('menu-map').classList.add('bmenu-item-selected');
      return;
    }
  }
};
export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="map-menu" class="side-menu-parent start-hidden side-menu valign-wrapper">
          <canvas id="map-2d"></canvas>
          <img id="map-sat" class="map-item map-look" src="img/satellite-2.png" width="20px" height="20px">
          <img id="map-sensor" class="map-item map-look start-hidden" src="img/radar-1.png" width="20px"
            height="20px">
          <img id="map-look1" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look2" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look3" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look4" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look5" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look6" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look7" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look8" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look9" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look10" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look11" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look12" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look13" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look14" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look15" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look16" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look17" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look18" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look19" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look20" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look21" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look22" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look23" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look24" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look25" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look26" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look27" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look28" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look29" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look30" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look31" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look32" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look33" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look34" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look35" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look36" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look37" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look38" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look39" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look40" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look41" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look42" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look43" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look44" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look45" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look46" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look47" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look48" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look49" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
          <img id="map-look50" class="map-item map-look" src="img/red-square.png" width="8px" height="8px">
        </div>
        `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-map" class="bmenu-item bmenu-item-disabled">
          <img alt="map" src="" delayedsrc="${mapPng}" />
          <span class="bmenu-title">Stereo Map</span>
          <div class="status-icon"></div>
        </div>
      `
  );
};

export const uiManagerFinal = () => {
  const { uiManager } = keepTrackApi.programs;
  resize2DMap();

  window.addEventListener('resize', () => {
    if (!settingsManager.disableUI) resize2DMap();
  });

  getEl('fullscreen-icon').addEventListener('click', () => {
    uiManager.resize2DMap();
  });

  getEl('map-menu').addEventListener('click', (evt: Event) => {
    if (!(<HTMLElement>evt.target).classList.contains('map-look')) return;
    mapMenuClick(evt);
  });
};

export const onCruncherMessage = (): void => {
  const { mapManager } = keepTrackApi.programs;
  if (mapManager.isMapMenuOpen || settingsManager.isMapUpdateOverride) {
    mapManager.satCrunchNow = Date.now();
    if (mapManager.satCrunchNow > settingsManager.lastMapUpdateTime + 30000 || settingsManager.isMapUpdateOverride) {
      updateMap();
      settingsManager.lastMapUpdateTime = mapManager.satCrunchNow;
      settingsManager.isMapUpdateOverride = false;
    }
  }
};
export const hideSideMenus = (): void => {
  const { mapManager } = keepTrackApi.programs;
  slideOutLeft(getEl('map-menu'), 1000);
  getEl('menu-map').classList.remove('bmenu-item-selected');
  mapManager.isMapMenuOpen = false;
};
export const mapMenuClick = (evt: any) => {
  const { timeManager } = keepTrackApi.programs;
  settingsManager.isMapUpdateOverride = true;
  if (!evt.target || !evt.target.dataset.time) return;
  let time = evt.target.dataset.time;
  if (time !== null) {
    time = time.split(' ');
    time = new Date(time[0] + 'T' + time[1] + 'Z');
    const today = new Date(); // Need to know today for offset calculation
    timeManager.changeStaticOffset(time.getTime() - today.getTime()); // Find the offset from today
  }
};
