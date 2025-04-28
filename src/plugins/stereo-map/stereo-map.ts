/**
 *!
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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
 * stereo-map.ts was created using the work of Julius Tens' "projections" library
 * (https://github.com/juliuste/projections) which was released under the MIT License.
 *
 * The MIT License
 * Copyright (c) 2017, Julius Tens
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl, showEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import mapPng from '@public/img/icons/map.png';
import radar1 from '@public/img/radar-1.png';
import redSquare from '@public/img/red-square.png';
import satellite2 from '@public/img/satellite-2.png';
import yellowSquare from '@public/img/yellow-square.png';

import { dateFormat } from '@app/lib/dateFormat';
import { SatMath } from '@app/static/sat-math';
import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, Kilometers, LlaVec3, calcGmst, eci2lla } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

interface GroundTracePoint {
  x: number;
  y: number;
  inView: boolean;
}

export class StereoMap extends KeepTrackPlugin {
  readonly id = 'StereoMap';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  /** The size of half of the dot used in the stereo map. (See CSS) */
  private readonly halfDotSize_ = 6;
  private canvas_: HTMLCanvasElement;
  private satCrunchNow_ = 0;
  private isMapUpdateOverride_ = false;
  private readonly earthImg_ = new Image();

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = mapPng;
  bottomIconCallback: () => void = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    this.updateMap();
  };

  sideMenuElementName = 'map-menu';
  sideMenuElementHtml = keepTrackApi.html`
   <div id="map-menu" class="side-menu-parent start-hidden side-menu valign-wrapper">
     <canvas id="map-2d"></canvas>
     <img id="map-sat" class="map-item map-look" src=${satellite2} width="40px" height="40px"/>
     <img id="map-sensor" class="map-item map-look start-hidden" src=${radar1} width="40px" height="40px"/>
     ${StereoMap.generateMapLooks_(50)}
    </div>
  `;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        this.canvas_ = <HTMLCanvasElement>getEl('map-2d');

        this.resize2DMap_();

        window.addEventListener('resize', () => {
          if (!settingsManager.disableUI) {
            this.resize2DMap_();
          }
        });

        getEl('fullscreen-icon')?.addEventListener('click', () => {
          this.resize2DMap_();
        });

        getEl('map-menu')?.addEventListener('click', (evt: Event) => {
          if (!(<HTMLElement>evt.target).classList.contains('map-look')) {
            return;
          }
          this.mapMenuClick_(evt);
        });
      },
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherMessage,
      cbName: this.id,
      cb: this.onCruncherMessage_.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.id,
      cb: (sat: BaseObject) => {
        if (!this.isMenuButtonActive) {
          return;
        }
        if (sat) {
          this.updateMap();
        }
      },
    });

    const keyboardManager = keepTrackApi.getInputManager().keyboard;

    keyboardManager.registerKeyUpEvent({
      key: 'M',
      callback: () => {
        if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) <= -1) {
          return;
        }

        if (!this.isMenuButtonActive) {
          this.openSideMenu();
          this.setBottomIconToSelected();
          this.updateMap();
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
        } else {
          this.closeSideMenu();
          this.setBottomIconToUnselected();
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
        }
      },
    });
  }

  updateMap(): void {
    try {
      if ((this.selectSatManager_?.selectedSat ?? -1) <= -1) {
        return;
      }
      if (!this.isMenuButtonActive) {
        return;
      }

      this.updateSatPosition_();
      StereoMap.updateSensorPosition_();
      this.drawEarthLayer_();
      this.drawGroundTrace_();
      this.addTextToMap_();
    } catch (e) {
      errorManagerInstance.info(e);
    }
  }

  private static generateMapLooks_(count: number): string {
    let html = '';

    for (let i = 1; i <= count; i++) {
      html += `<img id="map-look${i}" class="map-item map-look"/>`;
    }

    return html;
  }

  private static getMapPoints_(now: Date, sat: DetailedSatellite, sensorList: DetailedSensor[]): { lla: LlaVec3<Degrees, Kilometers>; overallView: boolean; time: string } {
    const time = dateFormat(now, 'isoDateTime', true);
    let overallView: boolean = false;
    const { gmst } = calcGmst(now);
    const lla = eci2lla(sat.eci(now).position, gmst);

    for (const sensor of sensorList) {
      if (sensor.isSatInFov(sat, now)) {
        overallView = true;
      }
    }

    return { lla, overallView, time };
  }

  private drawGroundTrace_() {
    const groundTracePoints: GroundTracePoint[] = [];
    const pointPerOrbit = 512;
    // We only have 50 clickable markers
    const selectableInterval = Math.ceil(pointPerOrbit / 50);
    let selectableIdx = 1;

    const sat = keepTrackApi.getCatalogManager().getSat(this.selectSatManager_?.selectedSat ?? -1);
    const sensorList = keepTrackApi.getSensorManager().currentSensors;

    if (!sat || !sensorList) {
      return;
    }

    // Start at 1 so that the first point is NOT the satellite
    for (let i = 1; i < pointPerOrbit; i++) {
      const now = new Date(keepTrackApi.getTimeManager().simulationTimeObj.getTime() + ((i * sat.period * 1.15) / pointPerOrbit) * 60 * 1000);
      const mapPoints = StereoMap.getMapPoints_(now, sat, sensorList);

      groundTracePoints.push({
        x: ((mapPoints.lla.lon + 180) / 360) * settingsManager.mapWidth,
        y: settingsManager.mapHeight - ((mapPoints.lla.lat + 90) / 180) * settingsManager.mapHeight,
        inView: mapPoints.overallView,
      });

      if (i % selectableInterval === 0) {
        const dotDom = <HTMLImageElement>getEl(`map-look${selectableIdx}`);

        dotDom.src = mapPoints.overallView ? yellowSquare : redSquare;
        dotDom.style.left = `${groundTracePoints[i - 1].x - this.halfDotSize_}px`;
        dotDom.style.top = `${groundTracePoints[i - 1].y - this.halfDotSize_}px`;
        dotDom.dataset.time = mapPoints.time;

        selectableIdx++;
      }
    }

    // Draw ground trace
    const ctx = this.canvas_.getContext('2d');
    const bigJumpSize = 0.2 * settingsManager.mapWidth;

    if (!ctx) {
      return;
    }

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
        /*
         * If there is a big jump assume we crossed a pole and should
         * jump to the next point to continue drawing the line
         */
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(groundTracePoints[i].x, groundTracePoints[i].y);
      } else {
        ctx.lineTo(groundTracePoints[i].x, groundTracePoints[i].y);
      }
    }
    ctx.stroke();
  }

  private addTextToMap_() {
    const ctx = this.canvas_.getContext('2d');
    const d = new Date();
    const n = d.getUTCFullYear();
    const copyrightStr = !settingsManager.copyrightOveride ? `©${n} KEEPTRACK.SPACE` : '';
    const cw = this.canvas_.width;
    const ch = this.canvas_.height;

    if (!ctx) {
      return;
    }

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
  }

  private static updateSensorPosition_() {
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const sensorDom = <HTMLImageElement>getEl('map-sensor');
    let selectableIdx = 1;

    // Reset all sensor elements
    document.querySelectorAll('[id^="map-sensor-"]').forEach((sensor) => {
      sensor.remove();
    });
    if (sensorManagerInstance.isSensorSelected()) {
      for (const sensor of sensorManagerInstance.currentSensors) {
        const map = {
          x: ((sensor.lon + 180) / 360) * settingsManager.mapWidth,
          y: settingsManager.mapHeight - ((sensor.lat + 90) / 180) * settingsManager.mapHeight,
        };

        // Add new sensor dynamically
        const newSensor = document.createElement('img');

        newSensor.id = `map-sensor-${selectableIdx}`;
        newSensor.className = 'map-item map-look start-hidden';
        newSensor.src = radar1;
        newSensor.style.left = `${map.x - sensorDom.width / 2}px`;
        newSensor.style.top = `${map.y - sensorDom.height / 2}px`;
        newSensor.style.width = `${sensorDom.width}px`;
        newSensor.style.height = `${sensorDom.height}px`;
        getEl('map-menu')?.appendChild(newSensor);
        showEl(`map-sensor-${selectableIdx}`);
        selectableIdx++;
      }
    }
  }

  private updateSatPosition_() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();

    const sat = catalogManagerInstance.getObject(this.selectSatManager_?.selectedSat ?? -1);

    if (!sat) {
      return;
    }

    const gmst = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;
    const lla = eci2lla(sat.position, gmst);
    const map = {
      x: ((lla.lon + 180) / 360) * settingsManager.mapWidth,
      y: settingsManager.mapHeight - ((lla.lat + 90) / 180) * settingsManager.mapHeight,
    };
    const satDom = <HTMLImageElement>getEl('map-sat');

    const mapSatelliteDOM = getEl('map-sat');

    if (mapSatelliteDOM) {
      mapSatelliteDOM.style.left = `${map.x - satDom.width / 2}px`;
      mapSatelliteDOM.style.top = `${map.y - satDom.height / 2}px`;
    }
  }

  private resize2DMap_(isForceWidescreen?: boolean): void {
    isForceWidescreen ??= false;
    const mapMenuDOM = getEl('map-menu');

    if (mapMenuDOM) {
      if (isForceWidescreen || window.innerWidth > window.innerHeight) {
        // If widescreen
        settingsManager.mapWidth = window.innerWidth;
        settingsManager.mapHeight = settingsManager.mapWidth / 2;
        mapMenuDOM.style.width = `${window.innerWidth}px`;

        this.canvas_.width = settingsManager.mapWidth;
        this.canvas_.height = settingsManager.mapHeight;
      } else {
        settingsManager.mapHeight = window.innerHeight - 100; // Subtract 100 portrait (mobile)
        settingsManager.mapWidth = settingsManager.mapHeight * 2;
        mapMenuDOM.style.width = `${settingsManager.mapWidth}px`;

        this.canvas_.width = settingsManager.mapWidth;
        this.canvas_.style.width = `${settingsManager.mapWidth}px`;
        this.canvas_.height = settingsManager.mapHeight;
        this.canvas_.style.height = `${settingsManager.mapHeight}px`;
      }
    }

    this.drawEarthLayer_();
  }

  private drawEarthLayer_(): void {
    const ctx = this.canvas_.getContext('2d');

    // Only draw if the image is completely loaded and not broken
    if (this.earthImg_.complete && this.earthImg_.naturalWidth !== 0) {
      try {
        ctx?.drawImage(this.earthImg_, 0, 0, settingsManager.mapWidth, settingsManager.mapHeight);
      } catch (e) {
        errorManagerInstance.warn(`Failed to draw earth image on canvas: ${(e as Error).message}`);
      }
    } else if (!this.earthImg_.src) {
      this.earthImg_.src = `${settingsManager.installDirectory}textures/earthmap4k.jpg`;
      this.earthImg_.onload = () => {
        try {
          ctx?.drawImage(this.earthImg_, 0, 0, settingsManager.mapWidth, settingsManager.mapHeight);
        } catch (e) {
          errorManagerInstance.warn(`Failed to draw earth image on canvas after load: ${(e as Error).message}`);
        }
      };
      this.earthImg_.onerror = () => {
        errorManagerInstance.warn('Earth image failed to load for stereo map.');
      };
    }
  }

  private onCruncherMessage_(): void {
    if (this.isMenuButtonActive || this.isMapUpdateOverride_) {
      this.satCrunchNow_ = Date.now();
      if (this.satCrunchNow_ > settingsManager.lastMapUpdateTime + 30000 || this.isMapUpdateOverride_) {
        this.updateMap();
        settingsManager.lastMapUpdateTime = this.satCrunchNow_;
        this.isMapUpdateOverride_ = false;
      } else {
        // Update these two items even if we don't update the whole map
        this.updateSatPosition_();
        StereoMap.updateSensorPosition_();
      }
    }
  }

  private mapMenuClick_(evt: Event) {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    this.isMapUpdateOverride_ = true;
    if (!(<HTMLElement>evt.target)?.dataset.time) {
      return;
    }
    const time = (<HTMLElement>evt.target).dataset.time ?? null;

    if (time !== null) {
      const timeArr = time.split(' ');
      const timeObj = new Date(`${timeArr[0]}T${timeArr[1]}Z`);
      const today = new Date(); // Need to know today for offset calculation

      timeManagerInstance.changeStaticOffset(timeObj.getTime() - today.getTime()); // Find the offset from today
    }
  }
}
