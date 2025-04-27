/* */

import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { OrbitCruncherType } from '@app/webworker/orbitCruncher';
import { mat4 } from 'gl-matrix';
import { BaseObject, Degrees, DetailedSatellite, Kilometers } from 'ootk';
import { GetSatType } from '../interfaces';
import { setInnerHtml } from '../lib/get-el';
import { isThisNode } from '../static/isThisNode';
import { Camera, CameraType } from './camera';
import { ColorSchemeManager } from './color-scheme-manager';
import { LineManager } from './draw-manager/line-manager';
import { errorManagerInstance } from './errorManager';
import { HoverManager } from './hover-manager';

export interface OrbitCruncherMessageMain {
  data: {
    pointsOut: number[];
    satId: number;
  };
}

export interface ObjDataJson {
  ignore?: boolean;
  missile?: boolean;
  tle1?: string;
  tle2?: string;
}

export class OrbitManager {
  private currentInView_ = <number[]>[];
  private currentSelectId_ = -1;
  private glBuffers_ = <WebGLBuffer[]>[];
  private gl_: WebGL2RenderingContext;
  private hoverOrbitBuf_: WebGLBuffer;
  private inProgress_ = <boolean[]>[];
  private isInitialized_ = false;
  private lineManagerInstance_: LineManager;
  private secondaryOrbitBuf_: WebGLBuffer;
  private secondarySelectId_ = -1;
  private selectOrbitBuf_: WebGLBuffer;
  private updateAllThrottle_ = 0;

  orbitWorker: Worker;
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

    const gl = this.gl_ ?? keepTrackApi.getRenderer().gl;

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
    const gl = this.gl_ ?? keepTrackApi.getRenderer().gl;

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
    pMatrix: mat4,
    camMatrix: mat4,
    tgtBuffer: WebGLFramebuffer | null,
    hoverManagerInstance: HoverManager,
    colorSchemeManagerInstance: ColorSchemeManager,
    mainCameraInstance: Camera,
  ): void {
    if (!this.isInitialized_) {
      return;
    }
    const gl = this.gl_ ?? keepTrackApi.getRenderer().gl;
    const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.useProgram(this.lineManagerInstance_.program);

    if (settingsManager.isDrawOrbits) {
      gl.enable(gl.BLEND);
      if (settingsManager.showOrbitThroughEarth) {
        gl.disable(gl.DEPTH_TEST);
      } else {
        gl.enable(gl.DEPTH_TEST);
      }

      this.lineManagerInstance_.setWorldUniforms(camMatrix, pMatrix);

      this.drawGroupObjectOrbit(hoverManagerInstance, colorSchemeManagerInstance);
      this.drawInViewObjectOrbit_(mainCameraInstance);
      this.drawPrimaryObjectOrbit_();
      this.drawSecondaryObjectOrbit_();
      this.drawHoverObjectOrbit_(hoverManagerInstance, colorSchemeManagerInstance);
    }

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);

    if (settingsManager.enableConstantSelectedSatRedraw) {
      if (selectSatManagerInstance?.selectedSat > -1) {
        this.clearSelectOrbit(false);
        this.setSelectOrbit(selectSatManagerInstance?.selectedSat, false);
      }

      if (selectSatManagerInstance?.secondarySat > -1) {
        this.clearSelectOrbit(true);
        this.setSelectOrbit(selectSatManagerInstance?.secondarySat, true);
      }
    }
  }

  drawOrbitsSettingChanged(): void {
    // We may have skipped initialization on boot and now need to do it
    if (!this.isInitialized_) {
      this.init(keepTrackApi.getLineManager(), keepTrackApi.getRenderer().gl);
    }
  }

  init(lineManagerInstance: LineManager, gl: WebGL2RenderingContext, orbitWorker?: Worker): void {
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
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    // See if we are running jest right now for testing
    this.startCruncher_(orbitWorker);

    this.orbitWorker.onmessage = this.workerOnMessage_.bind(this);

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

    const objDataString = OrbitManager.getObjDataString(keepTrackApi.getCatalogManager().objectCache);

    if (!this.orbitWorker) {
      return;
    }
    this.orbitWorker.postMessage({
      typ: OrbitCruncherType.INIT,
      orbitFadeFactor: settingsManager.orbitFadeFactor,
      objData: objDataString,
      numSegs: settingsManager.orbitSegments,
    });
    this.isInitialized_ = true;

    keepTrackApi.runEvent(KeepTrackApiEvents.orbitManagerInit);
  }

  private startCruncher_(orbitWorker?: Worker) {
    if (isThisNode()) {
      if (typeof orbitWorker !== 'undefined') {
        this.orbitWorker = orbitWorker;
      } else {
        this.orbitWorker = {
          postMessage: () => {
            // This is intentional
          },
        } as unknown as Worker;
      }
    } else {
      if (typeof Worker === 'undefined') {
        throw new Error('Your browser does not support web workers.');
      }
      try {
        this.orbitWorker = new Worker('./js/orbitCruncher.js');
      } catch (error) {
        // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
        if (window.location.href.startsWith('file://')) {
          setInnerHtml(
            'loader-text',
            'Critical Error: You need to allow access to files from your computer! Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other ' +
            'copies of chrome are running when you start it.',
          );
        } else {
          errorManagerInstance.error(error, 'OrbitManager.init', 'Failed to create orbit web worker!');
        }
      }
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
    const uiManagerInstance = keepTrackApi.getUiManager();

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
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (!this.orbitWorker) {
      return;
    }
    this.orbitWorker.postMessage({
      typ: OrbitCruncherType.SATELLITE_UPDATE,
      id,
      dynamicOffsetEpoch: timeManagerInstance.dynamicOffsetEpoch,
      staticOffset: timeManagerInstance.staticOffset,
      rate: timeManagerInstance.propRate,
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
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();

    const obj = catalogManagerInstance.getObject(id, GetSatType.EXTRA_ONLY);

    if (!obj) {
      return;
    }
    if (!settingsManager.isDrawOrbits) {
      return;
    }

    if (!this.inProgress_[id] && !obj.isStatic()) {
      if (obj.isMissile()) {
        if (!this.orbitWorker) {
          return;
        }
        this.orbitWorker.postMessage({
          typ: OrbitCruncherType.MISSILE_UPDATE,
          id,
          dynamicOffsetEpoch: timeManagerInstance.dynamicOffsetEpoch,
          staticOffset: timeManagerInstance.staticOffset,
          propRate: timeManagerInstance.propRate,
          // If we are updating a missile trajectory, we need to pass in the missile params
          latList: missileParams?.latList,
          lonList: missileParams?.lonList,
          altList: missileParams?.altList,
        });
      } else {
        // Then it is a satellite
        if (!this.orbitWorker) {
          return;
        }
        this.orbitWorker.postMessage({
          typ: OrbitCruncherType.SATELLITE_UPDATE,
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
          return { ignore: true } as ObjDataJson;
        }
        if (obj.isMissile()) {
          return { missile: true } as ObjDataJson;
        }

        return {
          tle1: (obj as DetailedSatellite).tle1,
          tle2: (obj as DetailedSatellite).tle2,
        } as ObjDataJson;
      }),
    );
  }

  private allocateBuffer(): WebGLBuffer {
    const gl = this.gl_ ?? keepTrackApi.getRenderer().gl;
    const buf = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);

    return buf;
  }

  // private isCalculateColorLocked = false;

  private drawGroupObjectOrbit(hoverManagerInstance: HoverManager, colorSchemeManagerInstance: ColorSchemeManager): void {
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const colorData = colorSchemeManagerInstance.colorData;

    if (groupManagerInstance.selectedGroup !== null && !settingsManager.isGroupOverlayDisabled) {
      groupManagerInstance.selectedGroup.ids.forEach((id: number) => {
        if (id === hoverManagerInstance.getHoverId() || id === this.currentSelectId_) {
          return;
        } // Skip hover and select objects
        if (!keepTrackApi.getCatalogManager().getObject(id)?.active) {
          return;
        } // Skip inactive objects

        OrbitManager.checColorBuffersValidity_(id, colorData);

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

    if (hoverId !== -1 && hoverId !== this.currentSelectId_ && !keepTrackApi.getCatalogManager().getObject(hoverId, GetSatType.EXTRA_ONLY)?.isStatic()) {
      OrbitManager.checColorBuffersValidity_(hoverId, colorSchemeManagerInstance.colorData);
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitHoverColor);
      this.writePathToGpu_(hoverId);
    }
  }

  private static checColorBuffersValidity_(hoverId: number, colorData: Float32Array) {
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
    if (this.currentSelectId_ !== -1 && !keepTrackApi.getCatalogManager().getObject(this.currentSelectId_, GetSatType.EXTRA_ONLY)?.isStatic()) {
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitSelectColor);
      this.writePathToGpu_(this.currentSelectId_);
    }
  }

  private drawSecondaryObjectOrbit_(): void {
    if (this.secondarySelectId_ !== -1 && !keepTrackApi.getCatalogManager().getObject(this.secondarySelectId_, GetSatType.EXTRA_ONLY)?.isStatic()) {
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitSelectColor2);
      this.writePathToGpu_(this.secondarySelectId_);
    }
  }

  private workerOnMessage_(m: OrbitCruncherMessageMain): void {
    const satId = m.data.satId;
    const pointsOut = new Float32Array(m.data.pointsOut);
    const gl = this.gl_ ?? keepTrackApi.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[satId]);
    gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);
    this.inProgress_[satId] = false;
  }

  updateFirstPointOut(satId: number, firstPointOut: number[]): void {
    // Update the first 3 pointsOut
    const gl = this.gl_ ?? keepTrackApi.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[satId]);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(firstPointOut));
  }

  private writePathToGpu_(id: number) {
    if (id === -1) {
      return;
    } // no hover object
    if (typeof this.glBuffers_[id] === 'undefined') {
      throw new Error(`orbit buffer ${id} not allocated`);
    }
    this.lineManagerInstance_.setAttribsAndDrawLineStrip(this.glBuffers_[id], settingsManager.orbitSegments + 1);
  }
}
