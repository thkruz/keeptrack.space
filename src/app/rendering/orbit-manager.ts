import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { OrbitCruncherThreadManager } from '@app/app/threads/orbit-cruncher-thread-manager';
import { CameraType } from '@app/engine/camera/camera-type';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { KeepTrack } from '@app/keeptrack';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { SettingsManager } from '@app/settings/settings';
import { OrbitDrawTypes } from '@app/webworker/orbit-cruncher-messages';
import { BaseObject, Degrees, Kilometers, Satellite } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { Camera } from '../../engine/camera/camera';
import { GetSatType } from '../../engine/core/interfaces';
import { PluginRegistry } from '../../engine/core/plugin-registry';
import { ServiceLocator } from '../../engine/core/service-locator';
import { EventBus } from '../../engine/events/event-bus';
import { EventBusEvent } from '../../engine/events/event-bus-events';
import { KeyboardComponent } from '../../engine/plugins/components/keyboard/keyboard-component';
import { ColorSchemeManager } from '../../engine/rendering/color-scheme-manager';
import { LineManager } from '../../engine/rendering/line-manager';
import { HoverManager } from '../ui/hover-manager';

export class OrbitManager {
  private currentHoverId_ = -1;
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

  /**
   * CPU-side mirror of each variable-length GL buffer's byte size, so we can decide
   * between bufferData (realloc) and bufferSubData without calling
   * gl.getBufferParameter(BUFFER_SIZE) - a synchronous query that stalls the CPU/GPU
   * pipeline. Querying it once per missile per frame (2500+) costs ~100ms/frame.
   */
  private readonly bufferByteSizes_ = new Map<number, number>();

  /**
   * The last orbit-path array reference uploaded to each object's GL buffer. The
   * missile/OEM paths are stable cached references (see MissileObject.getOrbitPath)
   * that only change ~1 Hz as the track advances, so an unchanged reference means the
   * GPU buffer is already correct and the whole upload can be skipped.
   */
  private readonly lastUploadedPath_ = new Map<number, Float32Array>();

  orbitThreadMgr = new OrbitCruncherThreadManager(KeepTrack.getInstance().threads);
  playNextSatellite = null;
  tempTransColor: [number, number, number, number] = [0, 0, 0, 0];

  /**
   * Resets the orbit manager for a catalog swap.
   * Resizes GL buffers to match the new catalog, clears caches,
   * and re-sends INIT to the orbit cruncher worker with updated TLE data.
   */
  resetForCatalogSwap(): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    const gl = this.gl_;
    const newSize = catalogManager.missileSats;

    // Delete excess GL buffers if new catalog is smaller
    while (this.glBuffers_.length > newSize) {
      const buf = this.glBuffers_.pop();

      if (buf) {
        gl.deleteBuffer(buf);
      }
    }

    // Allocate additional GL buffers if new catalog is larger
    while (this.glBuffers_.length < newSize) {
      (this.glBuffers_ as WebGLBuffer[]).push(this.allocateBuffer());
    }

    // Clear state
    this.inProgress_ = [];
    this.orbitCache.clear();
    this.bufferByteSizes_.clear();
    this.lastUploadedPath_.clear();
    this.currentInView_ = [];
    this.currentSelectId_ = -1;
    this.secondarySelectId_ = -1;

    // Re-send object data to the orbit cruncher worker
    const objDataString = OrbitManager.getObjDataString(catalogManager.objectCache);

    this.orbitThreadMgr.sendInit(objDataString, settingsManager.orbitSegments, settingsManager.orbitFadeFactor);
  }

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
    this.currentHoverId_ = -1;
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
      if ((selectSatManagerInstance?.selectedSat ?? -1) !== -1) {
        this.clearSelectOrbit(false);
        this.setSelectOrbit(selectSatManagerInstance?.selectedSat ?? -1, false);
      }

      if ((selectSatManagerInstance?.secondarySat ?? -1) !== -1) {
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

    this.orbitThreadMgr.sendInit(objDataString, settingsManager.orbitSegments, settingsManager.orbitFadeFactor);

    this.isInitialized_ = true;

    new KeyboardComponent('OrbitManager', [
      {
        key: 'L',
        callback: () => {
          this.toggleOrbitLines_();
          SettingsMenuPlugin.syncOnLoad();
          SettingsManager.preserveSettings();
        },
      },
      {
        key: 'e',
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
            return;
          }
          this.toggleEciToEcf_();
          SettingsMenuPlugin.syncOnLoad();
          SettingsManager.preserveSettings();
        },
      },
    ]).init();

    EventBus.getInstance().on(EventBusEvent.highPerformanceRender, () => {
      this.updateAllVisibleOrbits();
    });

    // Re-request active orbits when time jumps while in ECF mode,
    // because ECF coordinates depend on GMST (Earth rotation)
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
      if (settingsManager.isOrbitCruncherInEcf) {
        this.reRequestActiveOrbits_();
      }
    });

    EventBus.getInstance().emit(EventBusEvent.orbitManagerInit);
  }

  private toggleOrbitLines_() {
    if (settingsManager.isDrawOrbits && !settingsManager.isDrawTrailingOrbits) {
      // Full orbits → Tails only
      settingsManager.isDrawTrailingOrbits = true;
      this.updateOrbitType();
      ServiceLocator.getUiManager().toast('Orbit Tails Only', ToastMsgType.normal);
    } else if (settingsManager.isDrawOrbits && settingsManager.isDrawTrailingOrbits) {
      // Tails only → No lines
      settingsManager.isDrawOrbits = false;
      settingsManager.isDrawTrailingOrbits = false;
      this.updateOrbitType();
      ServiceLocator.getUiManager().toast('Orbits Off', ToastMsgType.standby);
    } else {
      // No lines → Full orbits
      settingsManager.isDrawOrbits = true;
      settingsManager.isDrawTrailingOrbits = false;
      this.drawOrbitsSettingChanged();
      this.updateOrbitType();
      ServiceLocator.getUiManager().toast('Orbits On', ToastMsgType.normal);
    }
  }

  private toggleEciToEcf_() {
    settingsManager.isOrbitCruncherInEcf = !settingsManager.isOrbitCruncherInEcf;
    if (settingsManager.isOrbitCruncherInEcf) {
      ServiceLocator.getUiManager().toast('Orbits displayed in ECF', ToastMsgType.normal);
    } else {
      ServiceLocator.getUiManager().toast('Orbits displayed in ECI', ToastMsgType.standby);
    }

    // Cache is in wrong reference frame — clear and re-request
    this.orbitCache.clear();
    this.lastUploadedPath_.clear();
    this.inProgress_ = [];
    this.reRequestActiveOrbits_();
  }

  private reRequestActiveOrbits_() {
    if (this.currentSelectId_ !== -1) {
      this.updateOrbitBuffer(this.currentSelectId_);
    }
    if (this.secondarySelectId_ !== -1) {
      this.updateOrbitBuffer(this.secondarySelectId_);
    }
    if (this.currentHoverId_ !== -1 && this.currentHoverId_ !== this.currentSelectId_ && this.currentHoverId_ !== this.secondarySelectId_) {
      this.updateOrbitBuffer(this.currentHoverId_);
    }
    for (const satId of this.currentInView_) {
      this.updateOrbitBuffer(satId);
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
    this.currentHoverId_ = satId;
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
    this.orbitThreadMgr.sendSatelliteUpdate(
      id, ServiceLocator.getTimeManager().simulationTimeObj.getTime(),
      settingsManager.isOrbitCruncherInEcf, ServiceLocator.getMainCamera().cameraType === CameraType.POLAR_VIEW,
      tle1, tle2,
    );
  }

  /**
   * @param _missileParams Vestigial. Missiles now build their line from their own
   * trajectory (see the missile branch below), so callers no longer need to forward
   * the lists here; the parameter is kept only for call-site compatibility.
   */
  updateOrbitBuffer(
    id: number,
    _missileParams?: {
      latList: Degrees[];
      lonList: Degrees[];
      altList: Kilometers[];
    },
  ) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    const obj = catalogManagerInstance.getObject(id, GetSatType.EXTRA_ONLY);

    if (!obj) {
      return;
    }
    if (!settingsManager.isDrawOrbits) {
      return;
    }

    if (!this.inProgress_[id] && !obj.isStatic()) {
      const isPolarView = ServiceLocator.getMainCamera().cameraType === CameraType.POLAR_VIEW;
      const simTime = ServiceLocator.getTimeManager().simulationTimeObj.getTime();

      if (obj.isMissile()) {
        // Build the line on the main thread from the object's own trajectory: one
        // vertex per 1 Hz sample instead of the coarse orbitSegments-chord worker
        // path, so it stays smooth up close. The ECI shape is time-invariant and
        // cached on the object, so this is a cheap buffer upload each frame.
        this.setVariableLengthOrbitBuffer_(id, (obj as MissileObject).getOrbitPath());
      } else if (obj instanceof OemSatellite) {
        this.setVariableLengthOrbitBuffer_(id, obj.getOrbitPath());
      } else {
        // Then it is a satellite
        this.orbitThreadMgr.sendSatelliteUpdate(
          Number(id), simTime,
          settingsManager.isOrbitCruncherInEcf, isPolarView,
        );
        this.inProgress_[id] = true;
      }
    }
  }

  private static getObjDataString(objData: BaseObject[]) {
    return JSON.stringify(
      // TODO: objData should always be guaranteed
      objData?.map((obj) => {
        if (obj.isMissile()) {
          return { missile: true };
        }
        // OemSatellite passes isSatellite() but has no tle1/tle2 — the orbit
        // cruncher would otherwise receive `undefined` TLEs and break SGP4.
        if (!(obj instanceof Satellite)) {
          return { ignore: true };
        }

        return {
          tle1: obj.tle1,
          tle2: obj.tle2,
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
        if (!ServiceLocator.getCatalogManager().getObject(id, GetSatType.EXTRA_ONLY)?.active) {
          return;
        } // Skip inactive objects

        if (!OrbitManager.checkColorBuffersValidity_(id, colorData)) {
          return;
        }

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
      if (!OrbitManager.checkColorBuffersValidity_(hoverId, colorSchemeManagerInstance.colorData)) {
        return;
      }
      this.lineManagerInstance_.setColorUniforms(settingsManager.orbitHoverColor);
      this.writePathToGpu_(hoverId);
    }
  }

  private static checkColorBuffersValidity_(id: number, colorData: Float32Array): boolean {
    const idIndex = id * 4;

    return (
      OrbitManager.checkColorBufferValidity_(idIndex, colorData) &&
      OrbitManager.checkColorBufferValidity_(idIndex + 1, colorData) &&
      OrbitManager.checkColorBufferValidity_(idIndex + 2, colorData) &&
      OrbitManager.checkColorBufferValidity_(idIndex + 3, colorData)
    );
  }

  private static checkColorBufferValidity_(index: number, colorData: Float32Array): boolean {
    return typeof colorData[index] !== 'undefined';
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

  /**
   * Upload a variable-length orbit path (OEM satellites and missiles) straight to
   * the object's GL buffer, reallocating only when the vertex count changes. Unlike
   * the fixed orbitSegments satellite path, these are drawn with a per-object vertex
   * count (see writePathToGpu_).
   */
  private setVariableLengthOrbitBuffer_(satId: number, pointsOut: Float32Array): void {
    // The path is a stable cached reference (MissileObject.getOrbitPath /
    // OemSatellite) that only changes ~1 Hz as the track advances. When it is the
    // same reference we uploaded last, the GPU buffer already holds it - skip the
    // whole bind + upload. The per-frame head vertex is patched separately in
    // writePathToGpu_, so freshness is preserved. This turns a per-frame upload for
    // every missile into a ~1 Hz upload.
    if (this.lastUploadedPath_.get(satId) === pointsOut) {
      this.inProgress_[satId] = false;

      return;
    }

    const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[satId]);

    // Compare against the CPU-side mirror instead of
    // gl.getBufferParameter(BUFFER_SIZE): that query forces a synchronous CPU/GPU
    // pipeline stall, and doing it once per missile per frame (2500+) costs ~100ms.
    const knownByteSize = this.bufferByteSizes_.get(satId);

    if (knownByteSize === pointsOut.byteLength) {
      // same size - update in place
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pointsOut);
    } else {
      // reallocate buffer if size has changed (or this is the first upload for this id)
      gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);
      this.bufferByteSizes_.set(satId, pointsOut.byteLength);
    }

    this.lastUploadedPath_.set(satId, pointsOut);

    // Invalidate the alignment cache so alignOrbitSelectedObject reads the
    // fresh GPU data next frame instead of reusing a stale orbit shape.
    this.orbitCache.delete(satId);

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

  /** Reusable buffer for ECF first-point correction to avoid per-frame allocation. */
  private static readonly ecfFirstPoint_ = new Float32Array(4);

  private writePathToGpu_(id: number) {
    if (id === -1) {
      return;
    } // no hover object
    if (typeof this.glBuffers_[id] === 'undefined') {
      // colorData is sized to numObjects but glBuffers_ is sized to missileSats,
      // so an id can pass an upstream colorData check yet have no orbit buffer
      // (e.g. FOV markers, or stale picking values). Skip rather than crash the render loop.
      return;
    }

    const obj = ServiceLocator.getCatalogManager().getObject(id, GetSatType.EXTRA_ONLY);

    if (!obj) {
      return;
    }

    // A MIRV child rides the shared bus track until the vehicles separate, so its
    // line is hidden until then - the ascent shows one trajectory, not N stacked.
    if (obj instanceof MissileObject && !obj.isVisibleNow()) {
      return;
    }

    // In ECF mode, patch the first orbit point with the satellite's current
    // ECI position every frame. A negative alpha flags the shader to skip the
    // ECEF→ECI rotation for this vertex, avoiding any CPU/GPU float32 roundtrip.
    if (settingsManager.isOrbitCruncherInEcf && !obj.isStatic() && !obj.isMissile()) {
      const eciPos = ServiceLocator.getDotsManager().getPositionArray(Number(id));

      if (eciPos[0] !== 0 || eciPos[1] !== 0 || eciPos[2] !== 0) {
        const buf = OrbitManager.ecfFirstPoint_;

        buf[0] = eciPos[0];
        buf[1] = eciPos[1];
        buf[2] = eciPos[2];
        buf[3] = -1.0; // negative alpha signals ECI vertex to shader

        const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[id]);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf);
      }
    }

    // Missile lines are stored Earth-fixed (ECEF) and drawn in ECF mode so the
    // shader rotates them to ECI by the live GMST each frame (the track follows the
    // ground); everything else keeps the global ECF setting.
    this.lineManagerInstance_.setEcfMode(obj.isMissile() || settingsManager.isOrbitCruncherInEcf);

    // Patch the missile line's head (vertex 0) every frame with the dot's OWN
    // rendered position, so the line start is pixel-identical to the dot instead
    // of jittering. Two reasons this must come straight from positionData (not a
    // re-computed ECEF vertex the shader rotates): (1) the cached path body only
    // advances once per 1 Hz sample, so a frozen head swings around the per-frame
    // dot; (2) routing the head through the shader's full-GMST ECEF->ECI rotation
    // float32-diverges from the dot's own value and jitters. A negative alpha flags
    // the shader to draw this vertex as-is (ECI, no rotation) - the same trick the
    // satellite ECF path uses.
    if (obj instanceof MissileObject && obj.orbitPathCache_ && obj.orbitPathCache_.length >= 4) {
      // The rendered dot position (ground rotation applied) - the single source of
      // truth shared with the camera follow, world shift, and mesh - so the line
      // head is pixel-identical to the dot instead of jittering.
      const pos = ServiceLocator.getDotsManager().getRenderedPositionArray(Number(id));

      // Skip the {0,0,0} pre-seed (object not yet positioned this frame).
      if (pos[0] !== 0 || pos[1] !== 0 || pos[2] !== 0) {
        const buf = OrbitManager.ecfFirstPoint_;

        buf[0] = pos[0];
        buf[1] = pos[1];
        buf[2] = pos[2];
        buf[3] = -1.0; // negative alpha: shader draws this vertex as-is (ECI), no rotation

        const gl = this.gl_ ?? ServiceLocator.getRenderer().gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers_[id]);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf);
      }
    }

    // OEM satellites and missiles carry a variable-length, high-resolution path
    // and are drawn with their own vertex count; everything else uses the fixed
    // orbitSegments buffer.
    const variableLengthPath = (obj instanceof OemSatellite || obj instanceof MissileObject) ? obj.orbitPathCache_ : null;

    if (variableLengthPath) {
      this.lineManagerInstance_.setAttribsAndDrawLineStrip(this.glBuffers_[id], variableLengthPath.length / 4);
    } else {
      this.lineManagerInstance_.setAttribsAndDrawLineStrip(this.glBuffers_[id], settingsManager.orbitSegments + 1);
    }
  }

  updateOrbitType() {
    this.orbitThreadMgr.sendChangeOrbitType(
      settingsManager.isDrawTrailingOrbits ? OrbitDrawTypes.TRAIL : OrbitDrawTypes.ORBIT,
    );
  }
}
