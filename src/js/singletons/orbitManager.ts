/* */

import { keepTrackApi } from '@app/js/keepTrackApi';
import { mat4 } from 'gl-matrix';
import { ColorSchemeManager, GetSatType, MissileParams, OrbitManager, SatObject, UiManager } from '../interfaces';
import { getEl } from '../lib/get-el';
import { isThisNode } from '../static/isThisNode';
import { Camera, CameraType } from './camera';
import { LineManager } from './draw-manager/line-manager';
import { errorManagerInstance } from './errorManager';
import { HoverManager } from './hover-manager';

export interface OrbitCruncherMessageMain {
  data: {
    pointsOut: number[];
    satId: number;
  };
}

/* export const setOrbit = function (satId: number) {
let sat = catalogManagerInstance.getSat(satId: number);
mat4.identity(mat4.create());
//apply steps in reverse order because matrix multiplication
// (last multiplied in is first applied to vertex)

//step 5. rotate to RAAN
mat4.rotateZ(mat4.create(), mat4.create(), sat.raan + Math.PI/2);
//step 4. incline the plane
mat4.rotateY(mat4.create(), mat4.create(), -sat.inclination);
//step 3. rotate to argument of periapsis
mat4.rotateZ(mat4.create(), mat4.create(), sat.argPe - Math.PI/2);
//step 2. put earth at the focus
mat4.translate(mat4.create(), mat4.create(), [sat.semiMajorAxis - sat.apogee - RADIUS_OF_EARTH, 0, 0]);
//step 1. stretch to ellipse
mat4.scale(mat4.create(), mat4.create(), [sat.semiMajorAxis, sat.semiMinorAxis, 0]);

};

orbitManager.clearOrbit = function () {
mat4.identity(mat4.create());
} */

export class StandardOrbitManager implements OrbitManager {
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

  orbitWorker = null;
  playNextSatellite = null;
  tempTransColor: [number, number, number, number] = [0, 0, 0, 0];

  addInViewOrbit(satId: number): void {
    for (const inViewSatId of this.currentInView_) {
      if (satId === inViewSatId) return;
    }
    this.currentInView_.push(satId);
    this.updateOrbitBuffer(satId);
  }

  clearHoverOrbit(): void {
    if (!settingsManager.isDrawOrbits) return;

    const gl = this.gl_;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.hoverOrbitBuf_);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
  }

  clearInViewOrbit(): void {
    if (this.currentInView_.length === 0) return;
    this.currentInView_ = [];
  }

  clearSelectOrbit(isSecondary: boolean = false): void {
    const gl = this.gl_;
    if (isSecondary) {
      this.secondarySelectId_ = -1;
      if (!this.secondaryOrbitBuf_) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.secondaryOrbitBuf_);
    } else {
      this.currentSelectId_ = -1;
      if (!this.selectOrbitBuf_) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.selectOrbitBuf_);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
  }

  draw(
    pMatrix: mat4,
    camMatrix: mat4,
    tgtBuffer: WebGLFramebuffer,
    hoverManagerInstance: HoverManager,
    colorSchemeManagerInstance: ColorSchemeManager,
    mainCameraInstance: Camera
  ): void {
    if (!this.isInitialized_) return;
    const gl = this.gl_;
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

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
      this.drawInViewObjectOrbit(mainCameraInstance);
      this.drawPrimaryObjectOrbit();
      this.drawSecondaryObjectOrbit();
      this.drawHoverObjectOrbit(hoverManagerInstance, colorSchemeManagerInstance);
    }

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);

    if (catalogManagerInstance.selectedSat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
      this.clearSelectOrbit(false);
      this.setSelectOrbit(catalogManagerInstance.selectedSat, false);
    }

    if (catalogManagerInstance.secondarySat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
      this.clearSelectOrbit(true);
      this.setSelectOrbit(catalogManagerInstance.secondarySat, true);
    }
  }

  drawOrbitsSettingChanged(): void {
    // We may have skipped initialization on boot and now need to do it
    if (!this.isInitialized_) {
      this.init(this.lineManagerInstance_, this.gl_);
    }
  }

  init(lineManagerInstance: LineManager, gl: WebGL2RenderingContext, orbitWorker?: Worker): void {
    this.lineManagerInstance_ = lineManagerInstance;
    this.gl_ = gl;

    if (!settingsManager.isDrawOrbits) return;

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

    const satDataString = StandardOrbitManager.getSatDataString(keepTrackApi.getCatalogManager().getSatsFromSatData());

    if (!this.orbitWorker) return;
    this.orbitWorker.postMessage({
      isInit: true,
      orbitFadeFactor: settingsManager.orbitFadeFactor,
      satData: satDataString,
      numSegs: settingsManager.orbitSegments,
    });
    this.isInitialized_ = true;

    keepTrackApi.methods.orbitManagerInit();
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
        } as any;
      }
    } else {
      if (typeof Worker === 'undefined') {
        throw new Error('Your browser does not support web workers.');
      }
      try {
        this.orbitWorker = new Worker(settingsManager.installDirectory + 'js/orbitCruncher.js');
      } catch (error) {
        // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
        if (window.location.href.startsWith('file://')) {
          getEl('loader-text').innerText =
            'Critical Error: You need to allow access to files from your computer! Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other copies of chrome are running when you start it.';
        } else {
          errorManagerInstance.error(error, 'OrbitManager.init', 'Failed to create orbit web worker!');
        }
      }
    }
  }

  removeInViewOrbit(satId: number): void {
    let r = null;
    for (let i = 0; i < this.currentInView_.length; i++) {
      if (satId === this.currentInView_[i]) {
        r = i;
      }
    }
    if (r === null) return;
    this.currentInView_.splice(r, 1);
    this.updateOrbitBuffer(satId);
  }

  setHoverOrbit(satId: number): void {
    this.updateOrbitBuffer(satId);
  }

  setSelectOrbit(satId: number, isSecondary: boolean = false): void {
    if (isSecondary) {
      this.secondarySelectId_ = satId;
    } else {
      this.currentSelectId_ = satId;
    }
    this.updateOrbitBuffer(satId);
  }

  updateAllVisibleOrbits(uiManagerInstance: UiManager): void {
    if (uiManagerInstance.searchManager.isResultsOpen() && !settingsManager.disableUI && !settingsManager.lowPerf) {
      const currentSearchSats = uiManagerInstance.searchManager.getLastResultGroup()?.objects;
      if (typeof currentSearchSats !== 'undefined') {
        if (this.updateAllThrottle_ >= currentSearchSats.length) this.updateAllThrottle_ = 0;
        for (let i = 0; this.updateAllThrottle_ < currentSearchSats.length && i < 5; this.updateAllThrottle_++, i++) {
          this.updateOrbitBuffer(currentSearchSats[this.updateAllThrottle_]);
        }
      }
    }
  }

  changeOrbitBufferData(satId: number, TLE1: string, TLE2: string): void {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (!this.orbitWorker) return;
    this.orbitWorker.postMessage({
      isInit: false,
      isUpdate: true,
      satId: satId,
      dynamicOffsetEpoch: timeManagerInstance.dynamicOffsetEpoch,
      staticOffset: timeManagerInstance.staticOffset,
      rate: timeManagerInstance.propRate,
      TLE1: TLE1,
      TLE2: TLE2,
      isEcfOutput: settingsManager.isOrbitCruncherInEcf,
    });
  }

  updateOrbitBuffer(
    satId: number,
    missileParams: MissileParams = {
      missile: false,
      latList: [],
      lonList: [],
      altList: [],
    }
  ) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();

    const sat = catalogManagerInstance.getSat(satId);
    if (!sat) return;
    if (!settingsManager.isDrawOrbits) return;

    if (!this.inProgress_[satId] && !sat.static) {
      const { missile, latList, lonList, altList } = missileParams;
      if (missile) {
        if (!this.orbitWorker) return;
        this.orbitWorker.postMessage({
          isInit: false,
          isUpdate: true,
          missile: true,
          satId: satId,
          latList: latList,
          lonList: lonList,
          altList: altList,
        });
      } else {
        if (!this.orbitWorker) return;
        this.orbitWorker.postMessage({
          isInit: false,
          satId: satId,
          dynamicOffsetEpoch: timeManagerInstance.dynamicOffsetEpoch,
          staticOffset: timeManagerInstance.staticOffset,
          rate: timeManagerInstance.propRate,
          isEcfOutput: settingsManager.isOrbitCruncherInEcf,
        });
        this.inProgress_[satId] = true;
      }
    }
  }

  private static getSatDataString(satData: SatObject[]) {
    return JSON.stringify(
      satData.map((sat) => ({
        static: sat.static,
        missile: sat.missile,
        isRadarData: sat.isRadarData,
        TLE1: sat.TLE1,
        TLE2: sat.TLE2,
      }))
    );
  }

  private allocateBuffer(): WebGLBuffer {
    const gl = this.gl_;
    let buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
    return buf;
  }

  private isCalculateColorLocked = false;

  private drawGroupObjectOrbit(hoverManagerInstance: HoverManager, colorSchemeManagerInstance: ColorSchemeManager): void {
    const groupManagerInstance = keepTrackApi.getGroupsManager();

    if (groupManagerInstance.selectedGroup !== null && !settingsManager.isGroupOverlayDisabled) {
      const satData = keepTrackApi.getCatalogManager().getSatsFromSatData();

      // DEBUG: Planned future feature
      // if (sensorManager.currentSensor?.lat) {
      //   groupsManager.selectedGroup.forEach(function (id) {
      //     let isInViewSoon = false;
      //     for (let i = 0; i < orbitManager.inViewSoon.length; i++) {
      //       if (id === orbitManager.inViewSoon[i]) {
      //         isInViewSoon = true;
      //         break;
      //       }
      //     }
      //     if (isInViewSoon) {
      //       gl.uniform4fv(pathShader.uColor, settingsManager.orbitInViewColor);
      //     } else {
      //       gl.uniform4fv(pathShader.uColor, settingsManager.orbitGroupColor);
      //     }
      //     gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[id]);
      //     gl.vertexAttribPointer(pathShader.aPos, 4, gl.FLOAT, false, 0, 0);
      //     gl.enableVertexAttribArray(pathShader.aPos);
      //     gl.drawArrays(gl.LINE_STRIP, 0, settingsManager.orbitSegments + 1);
      //   });
      // }
      // gl.uniform4fv(pathShader.uColor, settingsManager.orbitGroupColor);
      groupManagerInstance.selectedGroup.objects.forEach((id: number) => {
        if (id === hoverManagerInstance.getHoverId() || id === this.currentSelectId_) return; // Skip hover and select objects
        if (!satData[id].active) return; // Skip inactive objects

        for (let i = 0; id < 4; id++) {
          if (typeof colorSchemeManagerInstance.colorData[id * i] === 'undefined') throw new Error(`color buffer for ${id} not valid`);
        }

        if (keepTrackApi.getCatalogManager().selectedSat !== id) {
          // if color is black, we probably have old data, so recalculate color buffers
          if (
            settingsManager.isShowLeoSats &&
            settingsManager.isShowMeoSats &&
            settingsManager.isShowGeoSats &&
            settingsManager.isShowHeoSats &&
            colorSchemeManagerInstance.colorData[id * 4] <= 0 &&
            colorSchemeManagerInstance.colorData[id * 4 + 1] <= 0 &&
            colorSchemeManagerInstance.colorData[id * 4 + 2] <= 0
          ) {
            if (this.isCalculateColorLocked) {
              // Prevent unexpected infinite coloring loop!
              // TODO: This should be explored more to see if there is a better way to handle this
              return;
            }
            colorSchemeManagerInstance.calculateColorBuffers(true);
            // Fix: Crued workaround to getting dots to show up when loading with search parameter
            setTimeout(() => {
              colorSchemeManagerInstance.calculateColorBuffers(true);
              this.isCalculateColorLocked = true;
            }, 500);
            setTimeout(() => {
              this.isCalculateColorLocked = false;
            }, 2000);
          }
          if (colorSchemeManagerInstance.colorData[id * 4 + 3] <= 0) {
            return; // Skip transparent objects
            // Debug: This is useful when all objects are supposed to be visible but groups can filter out objects
            // throw new Error(`color buffer for ${id} isn't visible`);
          }
        }

        this.lineManagerInstance_.setColorUniforms([
          colorSchemeManagerInstance.colorData[id * 4],
          colorSchemeManagerInstance.colorData[id * 4 + 1],
          colorSchemeManagerInstance.colorData[id * 4 + 2],
          colorSchemeManagerInstance.colorData[id * 4 + 3] * settingsManager.orbitGroupAlpha,
        ]);
        this.writePathToGpu(id);
      });
    }
  }

  private drawHoverObjectOrbit(hoverManagerInstance: HoverManager, colorSchemeManagerInstance: ColorSchemeManager): void {
    if (settingsManager.isMobileModeEnabled) return; // No hover orbit on mobile

    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    const hoverId = hoverManagerInstance.getHoverId();
    if (hoverId !== -1 && hoverId !== this.currentSelectId_ && !catalogManagerInstance.getSat(hoverId, GetSatType.EXTRA_ONLY).static) {
      // avoid z-fighting
      if (typeof colorSchemeManagerInstance.colorData[hoverId * 4] === 'undefined') throw new Error(`color buffer for ${hoverId} not valid`);
      if (typeof colorSchemeManagerInstance.colorData[hoverId * 4 + 1] === 'undefined') throw new Error(`color buffer for ${hoverId} not valid`);
      if (typeof colorSchemeManagerInstance.colorData[hoverId * 4 + 2] === 'undefined') throw new Error(`color buffer for ${hoverId} not valid`);
      if (typeof colorSchemeManagerInstance.colorData[hoverId * 4 + 3] === 'undefined') throw new Error(`color buffer for ${hoverId} not valid`);
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitHoverColor);
      this.writePathToGpu(hoverId);
    }
  }

  private drawInViewObjectOrbit(mainCameraInstance: Camera): void {
    if (this.currentInView_.length >= 1) {
      // There might be some z-fighting
      if (mainCameraInstance.cameraType == CameraType.PLANETARIUM) {
        this.lineManagerInstance_.setColorUniforms(settingsManager.orbitPlanetariumColor);
      } else {
        this.lineManagerInstance_.setColorUniforms(settingsManager.orbitInViewColor);
      }
      this.currentInView_.forEach((id) => {
        this.writePathToGpu(id);
      });
    }
  }

  private drawPrimaryObjectOrbit() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    if (this.currentSelectId_ !== -1 && !catalogManagerInstance.getSat(this.currentSelectId_, GetSatType.EXTRA_ONLY).static) {
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitSelectColor);
      this.writePathToGpu(this.currentSelectId_);
    }
  }

  private drawSecondaryObjectOrbit(): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    if (this.secondarySelectId_ !== -1 && !catalogManagerInstance.getSat(this.secondarySelectId_, GetSatType.EXTRA_ONLY).static) {
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitSelectColor2);
      this.writePathToGpu(this.secondarySelectId_);
    }
  }

  private workerOnMessage_(m: OrbitCruncherMessageMain): void {
    let satId = m.data.satId;
    let pointsOut = new Float32Array(m.data.pointsOut);
    const gl = this.gl_;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[satId]);
    gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);
    this.inProgress_[satId] = false;
  }

  private writePathToGpu(id: number) {
    if (id === -1) return; // no hover object
    if (typeof this.glBuffers_[id] === 'undefined') throw new Error(`orbit buffer ${id} not allocated`);
    this.lineManagerInstance_.setAttribsAndDrawLineStrip(this.glBuffers_[id], settingsManager.orbitSegments + 1);
  }
}
