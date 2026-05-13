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

import { MenuMode } from '@app/engine/core/interfaces';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import mapPng from '@public/img/icons/map.png';
import radar1 from '@public/img/radar-1.png';
import redSquare from '@public/img/red-square.png';
import satellite2 from '@public/img/satellite-2.png';
import yellowSquare from '@public/img/yellow-square.png';

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  IBottomIconConfig,
  ICommandPaletteCommand,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { BaseObject, calcGmst, Degrees, eci2lla, Kilometers, LlaVec3, Satellite, TemeVec3 } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './stereo-map.css';

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
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor

    this.logo_.src = `${settingsManager.installDirectory}img/logo-primary.png`;
    this.logo_.onerror = () => errorManagerInstance.warn('Failed to load primary logo image.');
    if (settingsManager.isShowSecondaryLogo) {
      this.secondaryLogo_.src = `${settingsManager.installDirectory}img/logo-secondary.png`;
      this.secondaryLogo_.onerror = () => errorManagerInstance.warn('Failed to load secondary logo image.');
    }
  }

  /** The size of half of the dot used in the stereo map. (See CSS) */
  private readonly halfDotSize_ = 6;
  protected canvas_: HTMLCanvasElement;
  private satCrunchNow_ = 0;
  protected isMapUpdateOverride_ = false;
  protected readonly earthImg_ = new Image();
  private readonly logo_ = new Image();
  private readonly secondaryLogo_ = new Image();

  // Settings (configurable via secondary menu)
  protected orbitMultiplier_ = 1.15;
  protected isGraticuleEnabled_ = false;
  protected mapStyle_: 'day' | 'alt' | 'night' | 'daynight' = 'day';
  protected isSyncingInputs_ = false;
  protected debounceTimer_: ReturnType<typeof setTimeout> | null = null;

  isRequireSatelliteSelected = true;
  isIconDisabled = true;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'stereo-map-bottom-icon',
      label: t7e('plugins.StereoMap.bottomIconLabel' as Parameters<typeof t7e>[0]) ?? 'Stereo Map',
      image: mapPng,
      menuMode: [MenuMode.DISPLAY, MenuMode.ALL],
      isDisabledOnLoad: true,
    };
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      this.syncMinutesFromOrbits_();
      this.updateMap();
    }
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'map-menu',
      title: t7e('plugins.StereoMap.title' as Parameters<typeof t7e>[0]) ?? 'Stereographic Map Menu',
      html: this.buildSideMenuHtml_(),
    };
  }

  private buildSideMenuHtml_(): string {
    const innerHtml = html`
      <div id="map-menu-canvas-wrap" style="position: relative;">
       <canvas id="map-2d" style="display: block;"></canvas>
       <img id="map-sat" class="map-item map-look" src=${satellite2} width="40px" height="40px"/>
       <img id="map-sensor" class="map-item map-look start-hidden" src=${radar1} width="40px" height="40px"/>
       ${StereoMap.generateMapLooks_(50)}
      </div>
    `;

    // When a secondary menu or download exists, generateSideMenuHtml_() in the base plugin
    // wraps sideMenuElementHtml in the standard side-menu template. Without either,
    // the raw HTML is inserted directly, so we must include the wrapper.
    if ('getSecondaryMenuConfig' in this || 'onDownload' in this) {
      return innerHtml;
    }

    return html`
      <div id="map-menu" class="side-menu-parent start-hidden">
        <div id="map-menu-content" class="side-menu">
          ${innerHtml}
        </div>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.StereoMap.title' as Parameters<typeof t7e>[0]) ?? 'Stereographic Map Menu',
      body: t7e('plugins.StereoMap.helpBody' as Parameters<typeof t7e>[0]) ?? '',
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'm',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'StereoMap.toggle',
        label: 'Toggle Stereo Map',
        category: 'Display',
        shortcutHint: 'M',
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'StereoMap.export',
        label: 'Export Stereo Map',
        category: 'Export',
        callback: () => this.onDownload(),
        isAvailable: () => this.isMenuButtonActive,
      },
    ];
  }

  onDownload(): void {
    if (!this.canvas_) {
      return;
    }

    const dataUrl = this.canvas_.toDataURL('image/png');
    const link = document.createElement('a');

    link.download = 'stereo-map.png';
    link.href = dataUrl;
    link.click();
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        // Remove side-menu padding/border that conflicts with full-width canvas
        const contentDiv = getEl('map-menu-content');

        if (contentDiv) {
          contentDiv.style.padding = '0';
          contentDiv.style.borderWidth = '0';
        }

        this.canvas_ = <HTMLCanvasElement>getEl('map-2d');

        this.resize2DMap_();

        window.addEventListener('resize', () => {
          if (!settingsManager.disableUI) {
            this.resize2DMap_();
          }
        });

        getEl('fullscreen-btn', true)?.addEventListener('click', () => {
          this.resize2DMap_();
        });

        getEl('map-menu')?.addEventListener('click', (evt: Event) => {
          if (!(<HTMLElement>evt.target).classList.contains('map-look')) {
            return;
          }
          this.mapMenuClick_(evt);
        });

        const settingsForm = getEl('stereo-map-settings-form', true);

        settingsForm?.addEventListener('submit', (e: Event) => {
          e.preventDefault();
        });
        settingsForm?.addEventListener('change', () => {
          this.applySettings_();
        });

        getEl('stereo-map-orbit-mult', true)?.addEventListener('input', () => {
          this.onOrbitInputChanged_();
        });
        getEl('stereo-map-minutes', true)?.addEventListener('input', () => {
          this.onMinutesInputChanged_();
        });
      },
    );
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.onCruncherMessage,
      this.onCruncherMessage_.bind(this),
    );

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (sat: BaseObject) => {
        if (!this.isMenuButtonActive) {
          return;
        }
        if (sat) {
          this.syncMinutesFromOrbits_();
          this.updateMap();
        }
      },
    );
  }

  updateMap(): void {
    try {
      if ((this.selectSatManager_?.selectedSat ?? -1) <= -1) {
        return;
      }
      if (!this.isMenuButtonActive) {
        return;
      }

      // Clear canvas before redrawing to prevent stale content
      const ctx = this.canvas_?.getContext('2d');

      if (ctx) {
        ctx.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
      }

      this.updateSatPosition_();
      StereoMap.updateSensorPosition_();
      this.drawEarthLayer_();
      if (this.isGraticuleEnabled_) {
        this.drawGraticuleLines_();
      }
      this.drawGroundTrace_();
      if (this.isGraticuleEnabled_) {
        this.drawGraticuleLabels_();
      }
      this.addTextToMap_();
    } catch (e) {
      errorManagerInstance.info(e);
    }
  }

  private static generateMapLooks_(count: number): string {
    let html = '';

    for (let i = 1; i <= count; i++) {
      html += `<img id="map-look${i}" class="map-item map-look start-hidden"/>`;
    }

    return html;
  }

  private static getMapPoints_(now: Date, sat: Satellite, sensorList: DetailedSensor[]): { lla: LlaVec3<Degrees, Kilometers>; overallView: boolean; time: string } {
    const time = dateFormat(now, 'isoDateTime', true);
    let overallView: boolean = false;
    const { gmst } = calcGmst(now);
    const eci = sat.eci(now);

    if (!eci) {
      return { lla: { lat: 0 as Degrees, lon: 0 as Degrees, alt: 0 as Kilometers }, overallView, time };
    }

    const lla = eci2lla(eci.position, gmst);

    for (const sensor of sensorList) {
      if (sensor.isSatInFov(sat, now)) {
        overallView = true;
      }
    }

    return { lla, overallView, time };
  }

  private drawGroundTrace_() {
    const groundTracePoints: GroundTracePoint[] = [];
    const totalPoints = Math.min(4096, Math.max(512, Math.ceil(this.orbitMultiplier_ * 256)));
    // We only have 50 clickable markers
    const selectableInterval = Math.ceil(totalPoints / 50);
    let selectableIdx = 1;

    const sat = ServiceLocator.getCatalogManager().getSat(this.selectSatManager_?.selectedSat ?? -1);
    const sensorList = ServiceLocator.getSensorManager().currentSensors;

    if (!sat || !sensorList) {
      return;
    }

    const timeManagerInstance = ServiceLocator.getTimeManager();
    const periodMs = sat.period * 60 * 1000;

    // Start at 1 so that the first point is NOT the satellite
    for (let i = 1; i < totalPoints; i++) {
      const offset = (i * periodMs * this.orbitMultiplier_) / totalPoints;
      const now = new Date(timeManagerInstance.simulationTimeObj.getTime() + offset);
      const mapPoints = StereoMap.getMapPoints_(now, sat, sensorList);

      groundTracePoints.push({
        x: ((mapPoints.lla.lon + 180) / 360) * settingsManager.mapWidth,
        y: settingsManager.mapHeight - ((mapPoints.lla.lat + 90) / 180) * settingsManager.mapHeight,
        inView: mapPoints.overallView,
      });

      if (i % selectableInterval === 0) {
        const dotDom = getEl(`map-look${selectableIdx}`) as HTMLImageElement | null;

        if (dotDom) {
          dotDom.src = mapPoints.overallView ? yellowSquare : redSquare;
          dotDom.style.left = `${groundTracePoints[i - 1].x - this.halfDotSize_}px`;
          dotDom.style.top = `${groundTracePoints[i - 1].y - this.halfDotSize_}px`;
          dotDom.dataset.time = mapPoints.time;
          showEl(`map-look${selectableIdx}`);
        }

        selectableIdx++;
      }
    }

    // Hide unused dot markers
    for (let i = selectableIdx; i <= 50; i++) {
      hideEl(`map-look${i}`);
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
      const isBigJump = Math.abs(groundTracePoints[i].x - groundTracePoints[i - 1].x) > bigJumpSize;
      const viewChanged = groundTracePoints[i].inView !== groundTracePoints[i - 1].inView;

      if (isBigJump) {
        // Interpolate to the map edge and continue from the opposite side
        const prev = groundTracePoints[i - 1];
        const curr = groundTracePoints[i];
        const mapW = settingsManager.mapWidth;
        let edgeX: number;
        let edgeY: number;
        let oppositeX: number;

        if (curr.x < prev.x) {
          // Right-to-left wrap
          const virtualX = curr.x + mapW;
          const t = (mapW - prev.x) / (virtualX - prev.x);

          edgeY = prev.y + t * (curr.y - prev.y);
          edgeX = mapW;
          oppositeX = 0;
        } else {
          // Left-to-right wrap
          const virtualX = curr.x - mapW;
          const t = -prev.x / (virtualX - prev.x);

          edgeY = prev.y + t * (curr.y - prev.y);
          edgeX = 0;
          oppositeX = mapW;
        }

        ctx.lineTo(edgeX, edgeY);
        ctx.stroke();
        ctx.beginPath();
        if (viewChanged) {
          ctx.strokeStyle = curr.inView ? '#ffff00' : '#ff0000';
        }
        ctx.moveTo(oppositeX, edgeY);
        ctx.lineTo(curr.x, curr.y);
      } else if (viewChanged) {
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = groundTracePoints[i].inView ? '#ffff00' : '#ff0000';
        ctx.moveTo(groundTracePoints[i - 1].x, groundTracePoints[i - 1].y);
        ctx.lineTo(groundTracePoints[i].x, groundTracePoints[i].y);
      } else {
        ctx.lineTo(groundTracePoints[i].x, groundTracePoints[i].y);
      }
    }
    ctx.stroke();
  }

  private addTextToMap_() {
    const ctx = this.canvas_.getContext('2d');
    const cw = this.canvas_.width;
    const ch = this.canvas_.height;

    if (!ctx) {
      return;
    }

    // Draw logo watermark in bottom-right corner
    if (!settingsManager.copyrightOveride && this.logo_.complete && this.logo_.naturalWidth > 0) {
      const paddingX = 40;
      const paddingY = 25;
      const logoHeight = Math.max(40, ch * 0.06);
      const logoWidth = this.logo_.width * (logoHeight / this.logo_.height);

      if (settingsManager.isShowSecondaryLogo && this.secondaryLogo_.complete && this.secondaryLogo_.naturalWidth > 0) {
        const secLogoWidth = this.secondaryLogo_.width * (logoHeight / this.secondaryLogo_.height);

        ctx.drawImage(this.secondaryLogo_, paddingX, ch - logoHeight - paddingY, secLogoWidth, logoHeight);
        ctx.drawImage(this.logo_, paddingX + secLogoWidth + paddingX, ch - logoHeight - paddingY, logoWidth, logoHeight);
      } else {
        ctx.drawImage(this.logo_, cw - logoWidth - paddingX, ch - logoHeight - paddingY, logoWidth, logoHeight);
      }
    }

    // Draw classification text
    if (settingsManager.classificationStr !== '') {
      ctx.font = '24px nasalization';
      const textWidth = ctx.measureText(settingsManager.classificationStr ?? '').width;

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
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const sensorDom = getEl('map-sensor') as HTMLImageElement | null;
    let selectableIdx = 1;

    // Reset all sensor elements
    document.querySelectorAll('[id^="map-sensor-"]').forEach((sensor) => {
      sensor.remove();
    });

    if (!sensorDom || !sensorManagerInstance.isSensorSelected()) {
      return;
    }

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
      getEl('map-menu-canvas-wrap')?.appendChild(newSensor);
      showEl(`map-sensor-${selectableIdx}`);
      selectableIdx++;
    }
  }

  private updateSatPosition_() {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    const sat = catalogManagerInstance.getObject(this.selectSatManager_?.selectedSat ?? -1);

    if (!sat) {
      return;
    }

    const satDom = getEl('map-sat') as HTMLImageElement | null;

    if (!satDom) {
      return;
    }

    const satWithPos = sat as unknown as { position: TemeVec3 };
    const gmst = ServiceLocator.getTimeManager().gmst;
    const lla = eci2lla(satWithPos.position, gmst);
    const map = {
      x: ((lla.lon + 180) / 360) * settingsManager.mapWidth,
      y: settingsManager.mapHeight - ((lla.lat + 90) / 180) * settingsManager.mapHeight,
    };

    satDom.style.left = `${map.x - satDom.width / 2}px`;
    satDom.style.top = `${map.y - satDom.height / 2}px`;
  }

  private static readonly SAT_INFOBOX_WIDTH_ = 360;
  private static readonly MIN_MAP_DIMENSION_ = 2;

  private resize2DMap_(isForceWidescreen?: boolean): void {
    isForceWidescreen ??= false;
    const mapMenuDOM = getEl('map-menu');

    if (mapMenuDOM) {
      if (isForceWidescreen || window.innerWidth > window.innerHeight) {
        // If widescreen, leave room for the sat-info-box on the right
        const availableWidth = Math.max(
          StereoMap.MIN_MAP_DIMENSION_,
          window.innerWidth - StereoMap.SAT_INFOBOX_WIDTH_,
        );

        settingsManager.mapWidth = availableWidth;
        settingsManager.mapHeight = settingsManager.mapWidth / 2;
        mapMenuDOM.style.width = `${availableWidth}px`;
      } else {
        settingsManager.mapHeight = Math.max(
          StereoMap.MIN_MAP_DIMENSION_,
          window.innerHeight - 100, // Subtract 100 portrait (mobile)
        );
        settingsManager.mapWidth = settingsManager.mapHeight * 2;
        mapMenuDOM.style.width = `${settingsManager.mapWidth}px`;
      }

      this.canvas_.width = settingsManager.mapWidth;
      this.canvas_.style.width = `${settingsManager.mapWidth}px`;
      this.canvas_.height = settingsManager.mapHeight;
      this.canvas_.style.height = `${settingsManager.mapHeight}px`;
    }

    this.drawEarthLayer_();
  }

  protected getMapTextureUrl_(): string {
    const textures: Record<string, string> = {
      day: 'earthmap4k.jpg',
      night: 'earthmap-night4k.jpg',
      alt: 'earthmapalt4k.jpg',
    };

    return `${settingsManager.installDirectory}textures/${textures[this.mapStyle_] ?? textures.day}`;
  }

  protected drawEarthLayer_(): void {
    const ctx = this.canvas_.getContext('2d');
    const expectedFilename = this.getMapTextureUrl_().split('/').pop()!;
    const needsReload = !this.earthImg_.src || !this.earthImg_.src.endsWith(expectedFilename);

    if (needsReload) {
      this.earthImg_.src = this.getMapTextureUrl_();
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
    } else if (this.earthImg_.complete && this.earthImg_.naturalWidth !== 0) {
      try {
        ctx?.drawImage(this.earthImg_, 0, 0, settingsManager.mapWidth, settingsManager.mapHeight);
      } catch (e) {
        errorManagerInstance.warn(`Failed to draw earth image on canvas: ${(e as Error).message}`);
      }
    }
  }

  private drawGraticuleLines_(): void {
    const ctx = this.canvas_.getContext('2d');

    if (!ctx) {
      return;
    }

    const w = settingsManager.mapWidth;
    const h = settingsManager.mapHeight;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    // Latitude lines every 20°
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = h - ((lat + 90) / 180) * h;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Longitude lines every 20°
    for (let lon = -160; lon <= 160; lon += 20) {
      const x = ((lon + 180) / 360) * w;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  private drawGraticuleLabels_(): void {
    const ctx = this.canvas_.getContext('2d');

    if (!ctx) {
      return;
    }

    const w = settingsManager.mapWidth;
    const h = settingsManager.mapHeight;
    const pad = 4;

    ctx.font = 'bold 12px sans-serif';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

    // Latitude labels on left and right edges
    ctx.textBaseline = 'middle';
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = h - ((lat + 90) / 180) * h;
      const absLat = Math.abs(lat);
      const label = lat === 0 ? '0\u00B0' : `${absLat}\u00B0${lat > 0 ? 'N' : 'S'}`;

      // Left edge
      ctx.textAlign = 'left';
      ctx.strokeText(label, pad, y);
      ctx.fillText(label, pad, y);

      // Right edge
      ctx.textAlign = 'right';
      ctx.strokeText(label, w - pad, y);
      ctx.fillText(label, w - pad, y);
    }

    // Longitude labels on top and bottom edges
    ctx.textAlign = 'center';
    for (let lon = -160; lon <= 160; lon += 20) {
      const x = ((lon + 180) / 360) * w;
      const absLon = Math.abs(lon);
      const label = lon === 0 ? '0\u00B0' : `${absLon}\u00B0${lon > 0 ? 'E' : 'W'}`;

      // Bottom edge
      ctx.textBaseline = 'bottom';
      ctx.strokeText(label, x, h - pad);
      ctx.fillText(label, x, h - pad);

      // Top edge
      ctx.textBaseline = 'top';
      ctx.strokeText(label, x, pad);
      ctx.fillText(label, x, pad);
    }

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  protected applySettings_(): void {
    const orbitInput = getEl('stereo-map-orbit-mult') as HTMLInputElement | null;
    const graticuleInput = getEl('stereo-map-graticule') as HTMLInputElement | null;
    const styleRadios = document.querySelectorAll<HTMLInputElement>('input[name="stereo-map-style"]');

    if (orbitInput) {
      const val = parseFloat(orbitInput.value);

      if (!isNaN(val) && val >= 0.5 && val <= 20) {
        this.orbitMultiplier_ = val;
      }
    }

    if (graticuleInput) {
      this.isGraticuleEnabled_ = graticuleInput.checked;
    }

    styleRadios.forEach((radio) => {
      if (radio.checked) {
        this.mapStyle_ = radio.value as typeof this.mapStyle_;
      }
    });

    this.isMapUpdateOverride_ = true;
    this.updateMap();
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
    const timeManagerInstance = ServiceLocator.getTimeManager();

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

  protected getSelectedSatPeriod_(): number {
    const sat = ServiceLocator.getCatalogManager().getSat(this.selectSatManager_?.selectedSat ?? -1);

    return sat?.period ?? 0;
  }

  protected syncMinutesFromOrbits_(): void {
    const minutesInput = getEl('stereo-map-minutes') as HTMLInputElement | null;
    const period = this.getSelectedSatPeriod_();

    if (!minutesInput || period <= 0) {
      return;
    }

    minutesInput.value = Math.round(this.orbitMultiplier_ * period).toString();
  }

  protected syncOrbitsFromMinutes_(): void {
    const orbitInput = getEl('stereo-map-orbit-mult') as HTMLInputElement | null;
    const period = this.getSelectedSatPeriod_();

    if (!orbitInput || period <= 0) {
      return;
    }

    orbitInput.value = (this.orbitMultiplier_).toFixed(2);
  }

  protected onOrbitInputChanged_(): void {
    if (this.isSyncingInputs_) {
      return;
    }

    const orbitInput = getEl('stereo-map-orbit-mult') as HTMLInputElement | null;

    if (!orbitInput) {
      return;
    }

    const val = parseFloat(orbitInput.value);

    if (isNaN(val) || val < 0.5 || val > 20) {
      return;
    }

    this.orbitMultiplier_ = val;

    this.isSyncingInputs_ = true;
    this.syncMinutesFromOrbits_();
    this.isSyncingInputs_ = false;

    this.debouncedMapUpdate_();
  }

  protected onMinutesInputChanged_(): void {
    if (this.isSyncingInputs_) {
      return;
    }

    const minutesInput = getEl('stereo-map-minutes') as HTMLInputElement | null;
    const period = this.getSelectedSatPeriod_();

    if (!minutesInput || period <= 0) {
      return;
    }

    const minutes = parseFloat(minutesInput.value);

    if (isNaN(minutes) || minutes < 1) {
      return;
    }

    const orbits = Math.min(20, Math.max(0.5, minutes / period));

    this.orbitMultiplier_ = orbits;

    this.isSyncingInputs_ = true;
    this.syncOrbitsFromMinutes_();
    this.isSyncingInputs_ = false;

    this.debouncedMapUpdate_();
  }

  protected debouncedMapUpdate_(): void {
    if (this.debounceTimer_) {
      clearTimeout(this.debounceTimer_);
    }
    this.debounceTimer_ = setTimeout(() => {
      this.isMapUpdateOverride_ = true;
      this.updateMap();
      this.debounceTimer_ = null;
    }, 200);
  }
}
