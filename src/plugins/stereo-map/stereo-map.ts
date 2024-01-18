/*!
  stereo-map.ts was created by Theodore Kruczek using the work of
  Julius Tens' "projections" library (https://github.com/juliuste/projections).
  This file is exclusively released under the same license as the original author.
  The license only applies to stereo-map.ts

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

import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import mapPng from '@public/img/icons/map.png';
import radar1 from '@public/img/radar-1.png';
import redSquare from '@public/img/red-square.png';
import satellite2 from '@public/img/satellite-2.png';
import yellowSquare from '@public/img/yellow-square.png';

import { dateFormat } from '@app/lib/dateFormat';
import { CoordinateTransforms } from '@app/static/coordinate-transforms';
import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, Kilometers, LlaVec3, calcGmst, eci2lla } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

interface GroundTracePoint {
  x: number;
  y: number;
  inView: boolean;
}

export class StereoMap extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Stereo Map';
  dependencies = [SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super(StereoMap.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  /** The size of half of the dot used in the stereo map. (See CSS) */

  private readonly halfDotSize_ = 6;
  private canvas_: HTMLCanvasElement;
  private satCrunchNow_ = 0;
  private isMapUpdateOverride_ = false;
  private earthImg = new Image();

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  bottomIconElementName = 'menu-map';
  bottomIconImg = mapPng;
  bottomIconLabel = 'Stereo Map';
  bottomIconCallback: () => void = () => {
    if (!this.isMenuButtonActive) return;
    this.updateMap();
  };

  helpTitle = `Stereographic Map Menu`;
  helpBody = keepTrackApi.html`The Stereographic Map Menu is used for visualizing satellite ground traces in a stereographic projection.
    <br/><br/>
    You can click on a spot along the ground trace to change the time of the simulation to when the satellite reaches that spot.
    <br/><br/>
    The yellow dots indicate when the satellite is in view of the sensor. The red dots indicate when the satellite is not in view of the sensor. The dot closest to the satellite is the current time.
  `;

  sideMenuElementName = 'map-menu';
  sideMenuElementHtml =
    keepTrackApi.html`
  <div id="map-menu" class="side-menu-parent start-hidden side-menu valign-wrapper">
    <canvas id="map-2d"></canvas>
    <img id="map-sat" class="map-item map-look" src=${satellite2} width="20px" height="20px"/>
    <img id="map-sensor" class="map-item map-look start-hidden" src=${radar1} width="20px" height="20px"/>
    ` +
    StereoMap.generateMapLooks_(50) +
    `</div>`;

  static generateMapLooks_(count: number): string {
    let html = '';
    for (let i = 1; i <= count; i++) {
      html += `<img id="map-look${i}" class="map-item map-look"/>`;
    }

    return html;
  }

  addHtml(): void {
    super.addHtml();
    import('./stereo-map.css');

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        this.canvas_ = <HTMLCanvasElement>getEl('map-2d');

        this.resize2DMap_();

        window.addEventListener('resize', () => {
          if (!settingsManager.disableUI) this.resize2DMap_();
        });

        getEl('fullscreen-icon').addEventListener('click', () => {
          this.resize2DMap_();
        });

        getEl('map-menu').addEventListener('click', (evt: Event) => {
          if (!(<HTMLElement>evt.target).classList.contains('map-look')) return;
          this.mapMenuClick(evt);
        });
      },
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherMessage,
      cbName: this.PLUGIN_NAME,
      cb: this.onCruncherMessage.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: BaseObject) => {
        if (sat) {
          this.updateMap();
        }
      },
    });
  }

  async updateMap(): Promise<void> {
    try {
      if (this.selectSatManager_.selectedSat === -1) return;
      if (!this.isMenuButtonActive) return;

      this.updateSatPosition_();
      StereoMap.updateSensorPosition_();
      this.drawEarthLayer();
      this.drawGroundTrace_();
      this.addTextToMap_();
    } catch (e) {
      errorManagerInstance.info(e);
    }
  }

  static getMapPoints_(now: Date, sat: DetailedSatellite, sensor: DetailedSensor): { lla: LlaVec3<Degrees, Kilometers>; inView: boolean; time: string } {
    const time = dateFormat(now, 'isoDateTime', true);

    const { gmst } = calcGmst(now);
    const lla = eci2lla(sat.eci(now).position, gmst);
    const inView = sensor.isSatInFov(sat, now);

    return { lla, inView, time };
  }

  private drawGroundTrace_() {
    const groundTracePoints: GroundTracePoint[] = [];
    const pointPerOrbit = 512;
    // We only have 50 clickable markers
    const selectableInterval = Math.ceil(pointPerOrbit / 50);
    let selectableIdx = 1;

    const sat = keepTrackApi.getCatalogManager().getSat(this.selectSatManager_.selectedSat);
    const sensor = keepTrackApi.getSensorManager().currentSensors[0];

    // Start at 1 so that the first point is NOT the satellite
    for (let i = 1; i < pointPerOrbit; i++) {
      const now = new Date(keepTrackApi.getTimeManager().simulationTimeObj.getTime() + ((i * sat.period * 1.15) / pointPerOrbit) * 60 * 1000);
      const mapPoints = StereoMap.getMapPoints_(now, sat, sensor);

      groundTracePoints.push({
        x: ((mapPoints.lla.lon + 180) / 360) * settingsManager.mapWidth,
        y: settingsManager.mapHeight - ((mapPoints.lla.lat + 90) / 180) * settingsManager.mapHeight,
        inView: mapPoints.inView,
      });

      if (i % selectableInterval === 0) {
        const dotDom = <HTMLImageElement>getEl(`map-look${selectableIdx}`);

        dotDom.src = mapPoints.inView ? yellowSquare : redSquare;
        dotDom.style.left = `${groundTracePoints[i - 1].x - this.halfDotSize_}px`;
        dotDom.style.top = `${groundTracePoints[i - 1].y - this.halfDotSize_}px`;
        dotDom.dataset.time = mapPoints.time;

        selectableIdx++;
      }
    }

    // Draw ground trace
    const ctx = this.canvas_.getContext('2d');
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
  }

  private addTextToMap_() {
    const ctx = this.canvas_.getContext('2d');
    let d = new Date();
    let n = d.getUTCFullYear();
    const copyrightStr = !settingsManager.copyrightOveride ? `©${n} KEEPTRACK.SPACE` : '';
    let cw = this.canvas_.width;
    let ch = this.canvas_.height;
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

    if (sensorManagerInstance.isSensorSelected()) {
      const map = {
        x: ((sensorManagerInstance.currentSensors[0].lon + 180) / 360) * settingsManager.mapWidth,
        y: settingsManager.mapHeight - ((sensorManagerInstance.currentSensors[0].lat + 90) / 180) * settingsManager.mapHeight,
      };
      const sensorDom = <HTMLImageElement>getEl('map-sensor');
      showEl('map-sensor');
      getEl('map-sensor').style.left = `${map.x - sensorDom.width / 2}px`;
      getEl('map-sensor').style.top = `${map.y - sensorDom.height / 2}px`;
    } else {
      hideEl('map-sensor');
    }
  }

  private updateSatPosition_() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();

    const sat = catalogManagerInstance.getObject(this.selectSatManager_.selectedSat);
    const lla = CoordinateTransforms.eci2lla(sat.position, timeManagerInstance.simulationTimeObj);
    const map = {
      x: ((lla.lon + 180) / 360) * settingsManager.mapWidth,
      y: settingsManager.mapHeight - ((lla.lat + 90) / 180) * settingsManager.mapHeight,
    };
    const satDom = <HTMLImageElement>getEl('map-sat');
    getEl('map-sat').style.left = `${map.x - satDom.width / 2}px`;
    getEl('map-sat').style.top = `${map.y - satDom.height / 2}px`;
  }

  private resize2DMap_(isForceWidescreen?: boolean): void {
    isForceWidescreen ??= false;
    const mapMenuDOM = getEl('map-menu');

    if (isForceWidescreen || window.innerWidth > window.innerHeight) {
      // If widescreen
      settingsManager.mapWidth = window.innerWidth;
      settingsManager.mapHeight = settingsManager.mapWidth / 2;
      mapMenuDOM.style.width = window.innerWidth + 'px';

      this.canvas_.width = settingsManager.mapWidth;
      this.canvas_.height = settingsManager.mapHeight;
    } else {
      settingsManager.mapHeight = window.innerHeight - 100; // Subtract 100 portrait (mobile)
      settingsManager.mapWidth = settingsManager.mapHeight * 2;
      mapMenuDOM.style.width = settingsManager.mapWidth + 'px';

      this.canvas_.width = settingsManager.mapWidth;
      this.canvas_.style.width = settingsManager.mapWidth + 'px';
      this.canvas_.height = settingsManager.mapHeight;
      this.canvas_.style.height = settingsManager.mapHeight + 'px';
    }

    this.drawEarthLayer();
  }

  drawEarthLayer(): void {
    const ctx = this.canvas_.getContext('2d');
    if (this.earthImg.src) {
      ctx.drawImage(this.earthImg, 0, 0, settingsManager.mapWidth, settingsManager.mapHeight);
    } else {
      this.earthImg.src = `${settingsManager.installDirectory}textures/earthmap4k.jpg`;
      this.earthImg.onload = () => {
        ctx.drawImage(this.earthImg, 0, 0, settingsManager.mapWidth, settingsManager.mapHeight);
      };
    }
  }

  onCruncherMessage(): void {
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

  mapMenuClick(evt: any) {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    this.isMapUpdateOverride_ = true;
    if (!evt.target?.dataset.time) return;
    let time = evt.target.dataset.time;
    if (time !== null) {
      time = time.split(' ');
      time = new Date(time[0] + 'T' + time[1] + 'Z');
      const today = new Date(); // Need to know today for offset calculation
      timeManagerInstance.changeStaticOffset(time.getTime() - today.getTime()); // Find the offset from today
    }
  }
}
