import { OemSatellite } from '@app/app/objects/oem-satellite';
import { OrbitCruncherThreadManager } from '@app/app/threads/orbit-cruncher-thread-manager';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { KeepTrack } from '@app/keeptrack';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { SettingsManager } from '@app/settings/settings';
import { OrbitCruncherMsgType, OrbitDrawTypes } from '@app/webworker/orbit-cruncher-interfaces';
import { BaseObject, Degrees, DetailedSatellite, Kilometers } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { Camera, CameraType } from '../../engine/camera/camera';
import { GetSatType } from '../../engine/core/interfaces';
import { PluginRegistry } from '../../engine/core/plugin-registry';
import { ServiceLocator } from '../../engine/core/service-locator';
import { EventBus } from '../../engine/events/event-bus';
import { EventBusEvent } from '../../engine/events/event-bus-events';
import { ColorSchemeManager } from '../../engine/rendering/color-scheme-manager';
import { LineManager } from '../../engine/rendering/line-manager';
import { HoverManager } from '../ui/hover-manager';

export class OrbitManager {
  private currentInView_ = <number[]>[];
  private currentSelectId_ = -1;
  readonly glBuffers_ = <WebGLBuffer[]>[];
  private gl_: WebGL2RenderingContext;
  private hoverOrbitBuf_: WebGLBuffer;
  inProgress_ = <boolean[]>[];
  private isInitialized_ = false;
  private lineManagerInstance_: LineManager;
  private secondaryOrbitBuf_: WebGLBuffer;
  private secondarySelectId_ = -1;
  private selectOrbitBuf_: WebGLBuffer;
  private updateAllThrottle_ = 0;
  orbitCache = new Map<number, Float32Array>();

  orbitThreadMgr = new OrbitCruncherThreadManager(KeepTrack.getInstance().threads);
  playNextSatellite = null;
  tempTransColor: [number, number, number, number] = [0, 0, 0, 0];

  addInViewOrbit(satId: number): void {
    for (const inViewSatId of this.currentInView_) {
      if (satId === inViewSatId) {
        return;
      }
    }
    this.currentInView_.push(satId);
    this.updateOrbitBuffer(satId);
  }

  clearHoverOrbit(): void {
    if (!settingsManager.isDrawOrbits) {
      return;
    }

    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.hoverOrbitBuf_);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
  }

  clearInViewOrbit(): void {
    if (this.currentInView_.length === 0) {
      return;
    }
    this.currentInView_ = [];
  }

  clearSelectOrbit(isSecondary = false): void {
    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;

    if (isSecondary) {
      this.secondarySelectId_ = -1;
      if (!this.secondaryOrbitBuf_) {
        return;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.secondaryOrbitBuf_);
    } else {
      this.currentSelectId_ = -1;
      if (!this.selectOrbitBuf_) {
        return;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.selectOrbitBuf_);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
  }

  draw(
    projectionCameraMatrix: mat4,
    tgtBuffer: WebGLFramebuffer | null,
    hoverManagerInstance: HoverManager,
    colorSchemeManagerInstance: ColorSchemeManager,
    mainCameraInstance: Camera,
  ): void {
    if (!this.isInitialized_) {
      return;
    }
    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;
    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.useProgram(this.lineManagerInstance_.program);

    if (settingsManager.isDrawOrbits) {
      gl.enable(gl.BLEND);
      if (settingsManager.showOrbitThroughEarth) {
        gl.disable(gl.DEPTH_TEST);
      } else {
        gl.enable(gl.DEPTH_TEST);
      }

      const modelViewMatrix = mat4.create();

      // Default to 1 so no transformation
      mat4.identity(modelViewMatrix);

      this.lineManagerInstance_.setWorldUniforms(modelViewMatrix, projectionCameraMatrix);

      this.drawGroupObjectOrbit(hoverManagerInstance, colorSchemeManagerInstance);
      this.drawInViewObjectOrbit_(mainCameraInstance);
      this.drawPrimaryObjectOrbit_();
      this.drawSecondaryObjectOrbit_();
      this.drawHoverObjectOrbit_(hoverManagerInstance, colorSchemeManagerInstance);
    }

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);

    if (settingsManager.enableConstantSelectedSatRedraw) {
      if ((selectSatManagerInstance?.selectedSat ?? -1) > -1) {
        this.clearSelectOrbit(false);
        this.setSelectOrbit(selectSatManagerInstance?.selectedSat ?? -1, false);
      }

      if ((selectSatManagerInstance?.secondarySat ?? -1) > -1) {
        this.clearSelectOrbit(true);
        this.setSelectOrbit(selectSatManagerInstance?.secondarySat ?? -1, true);
      }
    }
  }

  drawOrbitsSettingChanged(): void {
    // We may have skipped initialization on boot and now need to do it
    if (!this.isInitialized_) {
      this.init(ServiceLocator.getLineManager(), ServiceLocator.getRenderer().gl);
    }
  }

  init(lineManagerInstance: LineManager, gl: WebGL2RenderingContext, orbitWorkerOverride?: Worker): void {
    if (this.isInitialized_) {
      return;
    } // Only initialize once
    if (!settingsManager.isDrawOrbits) {
      return;
    }
    if (!settingsManager.colors) {
      return;
    }

    this.lineManagerInstance_ = lineManagerInstance;
    this.gl_ = gl;

    this.tempTransColor = settingsManager.colors.transparent;
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    this.orbitThreadMgr.init(orbitWorkerOverride);

    this.selectOrbitBuf_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.selectOrbitBuf_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), this.gl_.DYNAMIC_DRAW);

    this.secondaryOrbitBuf_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.secondaryOrbitBuf_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), this.gl_.DYNAMIC_DRAW);

    this.hoverOrbitBuf_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.hoverOrbitBuf_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), this.gl_.DYNAMIC_DRAW);

    // Allocate one buffer for every satellite
    for (let i = 0; i < catalogManagerInstance.missileSats; i++) {
      this.glBuffers_.push(this.allocateBuffer());
    }

    const objDataString = OrbitManager.getObjDataString(ServiceLocator.getCatalogManager().objectCache);

    this.orbitThreadMgr.postMessage({
      type: OrbitCruncherMsgType.INIT,
      orbitFadeFactor: settingsManager.orbitFadeFactor,
      objData: objDataString,
      numSegs: settingsManager.orbitSegments,
    });

    this.isInitialized_ = true;

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (!isRepeat) {
        switch (key) {
          case 'L':
            this.toggleOrbitLines_();
            SettingsMenuPlugin.syncOnLoad();
            SettingsManager.preserveSettings();
            break;
          case 'E':
            this.toggleEciToEcf_();
            SettingsMenuPlugin.syncOnLoad();
            SettingsManager.preserveSettings();
            break;
          default:
            break;
        }
      }
    });

    EventBus.getInstance().on(EventBusEvent.highPerformanceRender, () => {
      this.updateAllVisibleOrbits();
    });

    EventBus.getInstance().emit(EventBusEvent.orbitManagerInit);
  }

  private toggleOrbitLines_() {
    settingsManager.isDrawOrbits = !settingsManager.isDrawOrbits;
    if (settingsManager.isDrawOrbits) {
      ServiceLocator.getUiManager().toast('Orbits On', ToastMsgType.normal);
    } else {
      ServiceLocator.getUiManager().toast('Orbits Off', ToastMsgType.standby);
    }
  }

  private toggleEciToEcf_() {
    settingsManager.isOrbitCruncherInEcf = !settingsManager.isOrbitCruncherInEcf;
    if (settingsManager.isOrbitCruncherInEcf) {
      ServiceLocator.getUiManager().toast('GEO Orbits displayed in ECF', ToastMsgType.normal);
    } else {
      ServiceLocator.getUiManager().toast('GEO Orbits displayed in ECI', ToastMsgType.standby);
    }
  }

  removeInViewOrbit(satId: number): void {
    let r: number | null = null;

    for (let i = 0; i < this.currentInView_.length; i++) {
      if (satId === this.currentInView_[i]) {
        r = i;
      }
    }
    if (r === null) {
      return;
    }
    this.currentInView_.splice(r, 1);
    this.updateOrbitBuffer(satId);
  }

  setHoverOrbit(satId: number): void {
    this.updateOrbitBuffer(satId);
  }

  setSelectOrbit(satId: number, isSecondary = false): void {
    if (isSecondary) {
      this.secondarySelectId_ = satId;
    } else {
      this.currentSelectId_ = satId;
    }
    this.updateOrbitBuffer(satId);
  }

  updateAllVisibleOrbits(): void {
    const uiManagerInstance = ServiceLocator.getUiManager();

    if (uiManagerInstance.searchManager?.isResultsOpen && !settingsManager.disableUI && !settingsManager.lowPerf) {
      const currentSearchSats = uiManagerInstance.searchManager.getLastResultGroup()?.ids;

      if (typeof currentSearchSats !== 'undefined') {
        if (this.updateAllThrottle_ >= currentSearchSats.length) {
          this.updateAllThrottle_ = 0;
        }
        for (let i = 0; this.updateAllThrottle_ < currentSearchSats.length && i < 5; this.updateAllThrottle_++, i++) {
          this.updateOrbitBuffer(currentSearchSats[this.updateAllThrottle_]);
        }
      }
    }
  }

  changeOrbitBufferData(id: number, tle1: string, tle2: string): void {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    this.orbitThreadMgr.postMessage({
      type: OrbitCruncherMsgType.SATELLITE_UPDATE,
      id,
      dynamicOffsetEpoch: timeManagerInstance.dynamicOffsetEpoch,
      staticOffset: timeManagerInstance.staticOffset,
      propRate: timeManagerInstance.propRate,
      tle1,
      tle2,
      isEcfOutput: settingsManager.isOrbitCruncherInEcf,
    });
  }

  updateOrbitBuffer(
    id: number,
    missileParams?: {
      latList: Degrees[];
      lonList: Degrees[];
      altList: Kilometers[];
    },
  ) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const timeManagerInstance = ServiceLocator.getTimeManager();

    const obj = catalogManagerInstance.getObject(id, GetSatType.EXTRA_ONLY);

    if (!obj) {
      return;
    }
    if (!settingsManager.isDrawOrbits) {
      return;
    }

    if (!this.inProgress_[id] && !obj.isStatic()) {
      if (obj.isMissile()) {
        this.orbitThreadMgr.postMessage({
          type: OrbitCruncherMsgType.MISSILE_UPDATE,
          id,
          dynamicOffsetEpoch: timeManagerInstance.dynamicOffsetEpoch,
          staticOffset: timeManagerInstance.staticOffset,
          propRate: timeManagerInstance.propRate,
          latList: missileParams?.latList,
          lonList: missileParams?.lonList,
          altList: missileParams?.altList,
          isEcfOutput: settingsManager.isOrbitCruncherInEcf,
        });
      } else if (obj instanceof OemSatellite) {
        this.setOemSatelliteOrbitBuffer_(id, obj.getOrbitPath(settingsManager.oemOrbitSegments));
      } else {
        // Then it is a satellite
        this.orbitThreadMgr.postMessage({
          type: OrbitCruncherMsgType.SATELLITE_UPDATE,
          id,
          dynamicOffsetEpoch: timeManagerInstance.dynamicOffsetEpoch,
          staticOffset: timeManagerInstance.staticOffset,
          propRate: timeManagerInstance.propRate,
          isEcfOutput: settingsManager.isOrbitCruncherInEcf,
        });
        this.inProgress_[id] = true;
      }
    }
  }

  private static getObjDataString(objData: BaseObject[]) {
    return JSON.stringify(
      // TODO: objData should always be guaranteed
      objData?.map((obj) => {
        if (!obj.isSatellite() && !obj.isMissile()) {
          return { ignore: true };
        }
        if (obj.isMissile()) {
          return { missile: true };
        }

        return {
          tle1: (obj as DetailedSatellite).tle1,
          tle2: (obj as DetailedSatellite).tle2,
        };
      }),
    );
  }

  private allocateBuffer(bufferLength = (settingsManager.orbitSegments + 1) * 4): WebGLBuffer {
    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;
    const buf = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferLength), gl.DYNAMIC_DRAW);

    return buf;
  }

  // private isCalculateColorLocked = false;

  private drawGroupObjectOrbit(hoverManagerInstance: HoverManager, colorSchemeManagerInstance: ColorSchemeManager): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const colorData = colorSchemeManagerInstance.colorData;

    if (groupManagerInstance.selectedGroup !== null && !settingsManager.isGroupOverlayDisabled) {
      groupManagerInstance.selectedGroup.ids.forEach((id: number) => {
        if (id === hoverManagerInstance.getHoverId() || id === this.currentSelectId_) {
          return;
        } // Skip hover and select objects
        if (!ServiceLocator.getCatalogManager().getObject(id)?.active) {
          return;
        } // Skip inactive objects

        OrbitManager.checkColorBuffersValidity_(id, colorData);

        // if color is black, we probably have old data, so recalculate color buffers
        if (
          settingsManager.isShowLeoSats &&
          settingsManager.isShowMeoSats &&
          settingsManager.isShowGeoSats &&
          settingsManager.isShowHeoSats &&
          colorData[id * 4] <= 0 &&
          colorData[id * 4 + 1] <= 0 &&
          colorData[id * 4 + 2] <= 0
        ) {
          // eslint-disable-next-line no-debugger
          // debugger;
          // if (this.isCalculateColorLocked) {
          //   /*
          //    * Prevent unexpected infinite coloring loop!
          //    * TODO: This should be explored more to see if there is a better way to handle this
          //    */
          //   return;
          // }
          // colorSchemeManagerInstance.calculateColorBuffers(true);
          // // Fix: Crued workaround to getting dots to show up when loading with search parameter
          // setTimeout(() => {
          //   colorSchemeManagerInstance.calculateColorBuffers(true);
          //   this.isCalculateColorLocked = true;
          // }, 500);
          // setTimeout(() => {
          //   this.isCalculateColorLocked = false;
          // }, 2000);
        }

        if (colorData[id * 4 + 3] <= 0) {
          return; // Skip transparent objects
          /*
           * Debug: This is useful when all objects are supposed to be visible but groups can filter out objects
           * throw new Error(`color buffer for ${id} isn't visible`);
           */
        }

        this.lineManagerInstance_.setColorUniforms([colorData[id * 4], colorData[id * 4 + 1], colorData[id * 4 + 2], colorData[id * 4 + 3] * settingsManager.orbitGroupAlpha]);
        this.writePathToGpu_(id);
      });
    }
  }

  private drawHoverObjectOrbit_(hoverManagerInstance: HoverManager, colorSchemeManagerInstance: ColorSchemeManager): void {
    if (settingsManager.isMobileModeEnabled) {
      return;
    } // No hover orbit on mobile

    const hoverId = hoverManagerInstance.getHoverId();

    if (hoverId !== -1 && hoverId !== this.currentSelectId_ && !ServiceLocator.getCatalogManager().getObject(hoverId, GetSatType.EXTRA_ONLY)?.isStatic()) {
      OrbitManager.checkColorBuffersValidity_(hoverId, colorSchemeManagerInstance.colorData);
      const sat = ServiceLocator.getCatalogManager().getObject(hoverId, GetSatType.EXTRA_ONLY);

      if (sat instanceof OemSatellite) {
        this.lineManagerInstance_.setColorUniforms(sat.dotColor ?? settingsManager.orbitHoverColor);
      } else {
        this.lineManagerInstance_.setColorUniforms(settingsManager.orbitHoverColor);
      }
      this.writePathToGpu_(hoverId);
    }
  }

  private static checkColorBuffersValidity_(hoverId: number, colorData: Float32Array) {
    const hoverIdIndex = hoverId * 4;

    OrbitManager.checkColorBufferValidity_(hoverIdIndex, colorData);
    OrbitManager.checkColorBufferValidity_(hoverIdIndex + 1, colorData);
    OrbitManager.checkColorBufferValidity_(hoverIdIndex + 2, colorData);
    OrbitManager.checkColorBufferValidity_(hoverIdIndex + 3, colorData);
  }

  private static checkColorBufferValidity_(index: number, colorData: Float32Array) {
    if (typeof colorData[index] === 'undefined') {
      throw new Error(`color buffer for ${index / 4} not valid`);
    }
  }

  private drawInViewObjectOrbit_(mainCameraInstance: Camera): void {
    if (this.currentInView_.length >= 1) {
      // There might be some z-fighting
      if (mainCameraInstance.cameraType === CameraType.PLANETARIUM) {
        this.lineManagerInstance_.setColorUniforms(settingsManager.orbitPlanetariumColor);
      } else {
        this.lineManagerInstance_.setColorUniforms(settingsManager.orbitInViewColor);
      }
      this.currentInView_.forEach((id) => {
        this.writePathToGpu_(id);
      });
    }
  }

  private drawPrimaryObjectOrbit_() {
    if (this.currentSelectId_ !== -1 && !ServiceLocator.getCatalogManager().getObject(this.currentSelectId_, GetSatType.EXTRA_ONLY)?.isStatic()) {
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitSelectColor);
      this.writePathToGpu_(this.currentSelectId_);
    }
  }

  private drawSecondaryObjectOrbit_(): void {
    if (this.secondarySelectId_ !== -1 && !ServiceLocator.getCatalogManager().getObject(this.secondarySelectId_, GetSatType.EXTRA_ONLY)?.isStatic()) {
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitSelectColor2);
      this.writePathToGpu_(this.secondarySelectId_);
    }
  }

  private setOemSatelliteOrbitBuffer_(satId: number, pointsOut: Float32Array): void {
    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[satId]);

    // get current buffer size
    const currentBufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);

    if (currentBufferSize !== pointsOut.byteLength) {
      // reallocate buffer if size has changed
      gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);
    } else {
      // update buffer data
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pointsOut);
    }

    this.inProgress_[satId] = false;
  }

  /**
   * Updates the orbit data for a satellite by shifting its position relative
   * to the new first point. This compensates for floating point precision issues
   * when dealing with large coordinate values.
   */
  alignOrbitSelectedObject(satId: number, firstPosition: number[], isShiftFirstOnly = false): void {
    let satOrbitData: Float32Array | null;

    if (this.orbitCache.has(satId)) {
      satOrbitData = this.orbitCache.get(satId) ?? null;
    } else {
      satOrbitData = this.getBufferData(satId);
      if (satOrbitData) {
        this.orbitCache.set(satId, satOrbitData);
      }
    }

    if (!satOrbitData) {
      return;
    }

    const deltaOfFirstPoint = [
      firstPosition[0] - satOrbitData[0],
      firstPosition[1] - satOrbitData[1],
      firstPosition[2] - satOrbitData[2],
    ];

    for (let i = 0; i < (isShiftFirstOnly ? 4 : satOrbitData.length); i += 4) {
      satOrbitData[i] += deltaOfFirstPoint[0];
      satOrbitData[i + 1] += deltaOfFirstPoint[1];
      satOrbitData[i + 2] += deltaOfFirstPoint[2];
      // Ignore oppacity
    }

    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[satId]);

    // get current buffer size
    // DEBUG: Disabled reallocation check for now to see if it helps with performance
    // const currentBufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);

    // if (currentBufferSize !== satOrbitData.byteLength) {
    //   // Delete the buffer first
    //   gl.deleteBuffer(this.glBuffers_[satId]);
    //   // Create a new buffer
    //   this.glBuffers_[satId] = this.allocateBuffer(settingsManager.oemOrbitSegments * 4);
    //   gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[satId]);
    //   // reallocate buffer if size has changed
    //   gl.bufferData(gl.ARRAY_BUFFER, satOrbitData, gl.DYNAMIC_DRAW);
    // } else {
    //   // update buffer data
    //   gl.bufferSubData(gl.ARRAY_BUFFER, 0, satOrbitData);
    // }

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, satOrbitData);
  }

  /** Returns the current data from the buffer for the given satId. */
  getBufferData(satId: number): Float32Array | null {
    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;
    const buffer = this.glBuffers_[satId];

    if (!buffer) {
      return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const currentBufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);

    // WebGL2 only: getBufferSubData copies buffer data into an ArrayBufferView
    const out = new Float32Array(currentBufferSize / 4);

    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, out);

    return out;
  }

  private writePathToGpu_(id: number) {
    if (id === -1) {
      return;
    } // no hover object
    if (typeof this.glBuffers_[id] === 'undefined') {
      throw new Error(`orbit buffer ${id} not allocated`);
    }

    const obj = ServiceLocator.getCatalogManager().getObject(id, GetSatType.EXTRA_ONLY);

    if (!obj) {
      return;
    }

    if (obj instanceof OemSatellite && obj.orbitPathCache_) {
      this.lineManagerInstance_.setAttribsAndDrawLineStrip(this.glBuffers_[id], settingsManager.oemOrbitSegments);
    } else {
      this.lineManagerInstance_.setAttribsAndDrawLineStrip(this.glBuffers_[id], settingsManager.orbitSegments + 1);
    }
  }

  updateOrbitType() {
    if (settingsManager.isDrawTrailingOrbits) {
      this.orbitThreadMgr.postMessage({
        type: OrbitCruncherMsgType.CHANGE_ORBIT_TYPE,
        orbitType: OrbitDrawTypes.TRAIL,
      });
    } else {
      this.orbitThreadMgr.postMessage({
        type: OrbitCruncherMsgType.CHANGE_ORBIT_TYPE,
        orbitType: OrbitDrawTypes.ORBIT,
      });
    }
  }
}
