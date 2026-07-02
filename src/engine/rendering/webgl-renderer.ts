import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { BaseObject, CatalogSource, GreenwichMeanSiderealTime, Kilometers, Milliseconds, Satellite, TemeVec3 } from '@ootk/src/main';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { GroupType } from '../../app/data/object-group';
import { SettingsManager } from '../../settings/settings';
import { SatLabelMode } from '../../settings/ui-settings';
import { Camera } from '../camera/camera';
import { CameraType } from '../camera/camera-type';
import { GetSatType } from '../core/interfaces';
import { PluginRegistry } from '../core/plugin-registry';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { RADIUS_OF_EARTH } from '../utils/constants';
import { errorManagerInstance } from '../utils/errorManager';
import { getEl } from '../utils/get-el';
import { isThisNode } from '../utils/isThisNode';
import { DepthManager } from './depth-manager';
import { Godrays } from './draw-manager/godrays';
import { PostProcessingManager } from './draw-manager/post-processing';
import { Sun } from './draw-manager/sun';
import { MeshManager } from './mesh-manager';
import { showFatalError } from './show-fatal-error';
import { ViewportManager } from './viewport-manager';

export class WebGLRenderer {
  private isRotationEvent_: boolean;
  private satLabelModeLastTime_ = 0;
  private settings_: SettingsManager;
  isContextLost = false;
  private isResizePendingAfterContextRestore_ = false;
  private contextLostRecoveryTimeoutId_: number | null = null;
  private static readonly CONTEXT_LOST_RECOVERY_TIMEOUT_MS = 5000;

  /** A canvas where the renderer draws its output. */
  domElement: HTMLCanvasElement;
  /**
   * The number of milliseconds since the last draw event
   *
   *  Use this for all ui interactions that are agnostic to propagation rate
   */
  dt: Milliseconds;
  /**
   * The number of milliseconds since the last draw event multiplied by propagation rate
   *
   *  Use this for all time calculations involving position and velocity
   */
  dtAdjusted: Milliseconds;
  /**
   * Main source of glContext for rest of the application
   */
  gl: WebGL2RenderingContext;
  isDrawOrbitsAbove: boolean;
  isPostProcessingResizeNeeded: boolean;
  isUpdateTimeThrottle: boolean;
  meshManager = new MeshManager();
  projectionCameraMatrix: mat4;
  postProcessingManager: PostProcessingManager;

  private selectSatManager_: SelectSatManager;
  sensorPos: { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime } | null = null;
  lastResizeTime: number;
  /**
   * True while a plugin is running a multi-frame offscreen capture (e.g. OpticalSimulation).
   * While set, the engine game loop skips its update/draw pass and cruncher position
   * messages are dropped, so the capture owns canvas size, camera, FOV, and time.
   * Bracketed by EventBusEvent.captureStart / captureEnd.
   */
  isCapturing = false;

  static getCanvasInfo(): { vw: number; vh: number } {
    // Using minimum allows the canvas to be full screen without fighting with scrollbars
    const cw = KeepTrack.getInstance().containerRoot?.clientWidth ?? document.documentElement.clientWidth ?? 0;
    const iw = window.innerWidth || 0;
    const vw = Math.min.apply(null, [cw, iw].filter(Boolean));
    const vh = Math.min(KeepTrack.getInstance().containerRoot?.clientHeight ?? document.documentElement.clientHeight ?? 0, window.innerHeight ?? 0);

    return { vw, vh };
  }

  updatePMatrix(): void {
    if (!this.gl) {
      return;
    }

    // Skip projection matrix recalculation while the context is lost — drawingBufferWidth/Height read 0,
    // producing a NaN aspect ratio that propagates into the matrix and floods logs every frame.
    if (this.isContextLost || this.gl.isContextLost?.()) {
      return;
    }

    const mainCamera = ServiceLocator.getMainCamera();

    mainCamera.projectionMatrix = Camera.calculatePMatrix(this.gl, mainCamera);
  }

  private isAltCanvasSize_ = false;

  render(scene: Scene, camera: Camera): void {
    if (this.isContextLost) {
      return;
    }

    let isResized = false;

    if (EventBus.getInstance().methods.altCanvasResize()) {
      this.resizeCanvas(true);
      this.isAltCanvasSize_ = true;
      isResized = true;
    } else if (this.isAltCanvasSize_) {
      this.resizeCanvas(false);
      this.isAltCanvasSize_ = false;
      isResized = true;
    }

    if (isResized) {
      // resizeCanvas set a full-canvas viewport and a perspective projection.
      // Re-apply the multi-view pass viewport/scissor for the new buffer size,
      // then re-invoke camera.draw so delegates (flat-map, polar-view)
      // recompute their own orthographic projection.
      ViewportManager.getInstance().applyPassViewport(this.gl);
      camera.draw(this.sensorPos);
    }

    // Apply the camera matrix (from the camera being rendered, not the singleton,
    // so multi-viewport passes each compose their own matrix)
    this.projectionCameraMatrix = mat4.mul(mat4.create(), camera.projectionMatrix, camera.matrixWorldInverse);

    scene.render(this, camera);
  }

  private resetGLState_() {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  private onContextLost_(e: WebGLContextEvent) {
    e.preventDefault(); // allows the context to be restored
    errorManagerInstance.info('WebGL Context Lost');
    this.isContextLost = true;

    // The browser owns context restoration — there's no API to force it. If `webglcontextrestored`
    // never fires, surface a one-shot prompt so the user knows a refresh is the only path forward.
    if (this.contextLostRecoveryTimeoutId_ !== null) {
      window.clearTimeout(this.contextLostRecoveryTimeoutId_);
    }
    this.contextLostRecoveryTimeoutId_ = window.setTimeout(() => {
      this.contextLostRecoveryTimeoutId_ = null;
      if (this.isContextLost) {
        // Emit the error event directly so telemetry's sendErrorData_ fires (warn() only toasts).
        // We avoid errorManagerInstance.error() because it auto-opens a GitHub issue URL, which is
        // too invasive for a "please refresh" prompt triggered by a GPU/driver event.
        EventBus.getInstance().emit(
          EventBusEvent.error,
          new Error('WebGL context lost — refresh the page to recover.'),
          'WebGLRenderer.onContextLost_',
        );
        errorManagerInstance.warn('WebGL context lost — refresh the page to recover.');
      }
    }, WebGLRenderer.CONTEXT_LOST_RECOVERY_TIMEOUT_MS);
  }

  private onContextRestore_() {
    errorManagerInstance.info('WebGL Context Restored');
    this.resetGLState_();
    this.isContextLost = false;

    if (this.contextLostRecoveryTimeoutId_ !== null) {
      window.clearTimeout(this.contextLostRecoveryTimeoutId_);
      this.contextLostRecoveryTimeoutId_ = null;
    }

    if (this.isResizePendingAfterContextRestore_) {
      this.isResizePendingAfterContextRestore_ = false;
      this.resizeCanvas();
    }
  }

  // eslint-disable-next-line require-await
  async glInit(): Promise<WebGL2RenderingContext> {
    // Ensure the canvas is available
    this.domElement = <HTMLCanvasElement>getEl('keeptrack-canvas');

    if (!this.domElement) {
      showFatalError({
        title: 'Canvas Element Missing',
        description:
          'KeepTrack could not find its drawing surface. This usually means a browser extension, corporate firewall, or content-security policy is stripping elements from the page.',
        recommendations: [
          'Disable browser extensions (ad-blockers, privacy tools) and reload.',
          'On a managed network? Contact your LAN Office or System Administrator to whitelist this site.',
          'Try a different browser (Chrome, Edge, or Firefox recommended).',
        ],
        technicalDetail: 'document.getElementById("keeptrack-canvas") returned null.',
      });
    }

    EventBus.getInstance().on(
      EventBusEvent.resize,
      () => {
        // Clear any existing resize timer
        clearTimeout(this.lastResizeTime);

        /*
         * Set a new timer to resize the canvas after 100 ms
         * This is to prevent multiple resize events from firing in quick succession
         * and causing performance issues
         */
        this.lastResizeTime = window.setTimeout(() => {
          this.resizeCanvas();
        }, 100);
      },
    );

    // Try to prevent crashes
    if (this.domElement?.addEventListener) {
      this.domElement.addEventListener('webglcontextlost', this.onContextLost_.bind(this));
      this.domElement.addEventListener('webglcontextrestored', this.onContextRestore_.bind(this));
    }

    const gl: WebGL2RenderingContext = isThisNode()
      ? global.mocks.glMock
      : this.domElement.getContext('webgl2', {
        alpha: false,
        premultipliedAlpha: false,
        desynchronized: false, // Setting to true causes flickering on mobile devices
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        stencil: false,
      });

    // Check for WebGL Issues
    if (gl === null) {
      showFatalError({
        title: 'WebGL 2 Not Available',
        description:
          'KeepTrack requires WebGL 2 to render the 3D scene. Your browser or device does not support it, or it has been disabled.',
        recommendations: [
          'Update your browser to the latest version.',
          'Enable hardware acceleration in your browser settings.',
          'Update your graphics drivers.',
          'Try a different browser (Chrome, Edge, or Firefox recommended).',
          'On a managed device? Contact your System Administrator.',
        ],
        technicalDetail: 'canvas.getContext("webgl2") returned null.',
      });
    }

    this.gl = gl;

    this.resizeCanvas();

    gl.getExtension('EXT_frag_depth');
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    DepthManager.setupDepthBuffer(gl);
    this.updatePMatrix();

    this.postProcessingManager = new PostProcessingManager();
    this.postProcessingManager.init(gl);

    return gl;
  }

  // eslint-disable-next-line require-await
  async init(settings: SettingsManager): Promise<void> {
    this.settings_ = settings;
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor

    ServiceLocator.getHoverManager()?.init();
    this.startWithOrbits();

    // Reinitialize the canvas on mobile rotation
    window.addEventListener('orientationchange', () => {
      this.isRotationEvent_ = true;
    });

    ServiceLocator.getScene().earth.init();
  }

  /**
   * Calculates and displays the orbits and labels of satellites above the current camera view.
   * This method is only called when camera type is astronomy or planetarium,
   * or when watchlist satellites are in view.
   *
   * @remarks
   * - If the scene is not yet redrawn with a new camera, the method sets a flag to draw the orbits above once the scene is redrawn.
   * - If the satellite label mode is off or the camera type is not planetarium and there are no satellites in the watchlist in view,
   *   the method clears the satellite mini boxes and returns.
   * - If the current sensor's latitude is null, the method returns.
   * - If the minimum time between satellite labels has not elapsed since the last label update, the method returns.
   * - The method clears the in-view orbits and initializes a counter for the labels.
   * - The method retrieves the DOM element for the satellite mini boxes.
   * - If the camera type is planetarium, the method iterates over the orbital satellites in the catalog and adds their orbits and labels.
   * - If the camera type is not planetarium, the method iterates over the satellites in the watchlist and adds their labels.
   * - The method updates the flag indicating that the satellite mini boxes are in use and records the current time as the last label update time.
   * - If the camera type is not astronomy, planetarium, or there are no satellites in the watchlist in view, the method resets the sensor position and the flag to draw orbits
   *   above.
   * - If the satellite label mode is off or the camera type is not planetarium and there are no satellites in the watchlist in view,
   *   the method clears the satellite mini boxes and returns.
   */
  // eslint-disable-next-line max-statements
  orbitsAbove() {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const watchlistPluginInstance = PluginRegistry.getPlugin(WatchlistPlugin);
    const cameraType = ServiceLocator.getMainCamera().cameraType;
    const labelMode = settingsManager.satLabelMode;
    const hasWatchlistSats = (watchlistPluginInstance?.watchlistList?.length ?? 0) > 0;

    const shouldEnter =
      cameraType === CameraType.ASTRONOMY ||
      cameraType === CameraType.PLANETARIUM ||
      cameraType === CameraType.FLAT_MAP ||
      watchlistPluginInstance?.hasAnyInView() ||
      (labelMode !== SatLabelMode.OFF && hasWatchlistSats);

    if (!shouldEnter) {
      this.sensorPos = null;
      this.isDrawOrbitsAbove = false;
      ServiceLocator.getSatLabelManager()?.updateLabels([], []);

      return;
    }

    // Calculate sensor position (not needed for FLAT_MAP or ALL label mode)
    if (cameraType === CameraType.FLAT_MAP || labelMode === SatLabelMode.ALL) {
      this.sensorPos = null;
    } else {
      // Catch race condition where sensor has been reset but camera hasn't been updated
      try {
        this.sensorPos = sensorManagerInstance.calculateSensorPos(timeManagerInstance.simulationTimeObj, sensorManagerInstance.currentSensors);
      } catch {
        errorManagerInstance.debug('Sensor not found, clearing orbits above!');
        this.sensorPos = null;
        ServiceLocator.getOrbitManager().clearInViewOrbit();
        ServiceLocator.getSatLabelManager()?.updateLabels([], []);

        return;
      }
    }

    if (!this.isDrawOrbitsAbove) {
      /*
       * Don't do this until the scene is redrawn with a new camera or thousands of satellites will
       * appear to be in the field of view
       */
      this.isDrawOrbitsAbove = true;

      return;
    }

    // Check if labels should be cleared
    // FOV_ONLY is NOT cleared here — the inner FOV_ONLY code path checks inViewData
    // directly and naturally produces an empty set when nothing is in view.
    const shouldClearLabels =
      labelMode === SatLabelMode.OFF ||
      (cameraType !== CameraType.PLANETARIUM &&
        cameraType !== CameraType.FLAT_MAP &&
        labelMode !== SatLabelMode.ALL &&
        labelMode !== SatLabelMode.FOV_ONLY &&
        !watchlistPluginInstance?.hasAnyInView());

    if (shouldClearLabels) {
      ServiceLocator.getSatLabelManager()?.updateLabels([], []);

      return;
    }

    // Sensor lat check — skip for FLAT_MAP and ALL label mode (no sensor needed)
    if (cameraType !== CameraType.FLAT_MAP && labelMode !== SatLabelMode.ALL && sensorManagerInstance?.currentSensors[0]?.lat === null) {
      return;
    }

    // Rate limiting
    if (timeManagerInstance.realTime - this.satLabelModeLastTime_ < settingsManager.minTimeBetweenSatLabels) {
      return;
    }

    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    orbitManagerInstance.clearInViewOrbit();

    const visibleSatIds: number[] = [];
    const labelTexts: string[] = [];
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const colorData = ServiceLocator.getColorSchemeManager().colorData;

    // Skip FOV check for PLANETARIUM, FLAT_MAP, or ALL label mode
    const skipFovCheck =
      cameraType === CameraType.PLANETARIUM ||
      cameraType === CameraType.FLAT_MAP ||
      labelMode === SatLabelMode.ALL;

    if (skipFovCheck) {
      watchlistPluginInstance?.watchlistList.forEach(({ id }) => {
        if (visibleSatIds.length >= settingsManager.maxLabels) {
          return;
        }
        // Hide label when dot is fully transparent (filter, FOV fade, etc.)
        if (colorData.length > id * 4 + 3 && colorData[id * 4 + 3] <= 0) {
          return;
        }
        const obj = catalogManagerInstance.getObject(id, GetSatType.POSITION_ONLY);

        if (!obj?.isSatellite()) {
          return;
        }
        const sat = <Satellite>obj;

        visibleSatIds.push(id);
        labelTexts.push(sat.source === CatalogSource.VIMPEL ? `JSC${sat.altId}` : sat.sccNum);
      });
    } else {
      // FOV_ONLY: check inViewData
      const dotsManagerInstance = ServiceLocator.getDotsManager();

      if (!dotsManagerInstance.inViewData) {
        return;
      }

      watchlistPluginInstance?.watchlistList.forEach(({ id }) => {
        const obj = catalogManagerInstance.getObject(id, GetSatType.POSITION_ONLY) as Satellite;

        if (dotsManagerInstance.inViewData[id] === 0) {
          return;
        }
        // Hide label when dot is fully transparent (filter, FOV fade, etc.)
        if (colorData.length > id * 4 + 3 && colorData[id * 4 + 3] <= 0) {
          return;
        }
        const satScreenPositionArray = this.getScreenCoords(obj);

        if (satScreenPositionArray.error) {
          return;
        }
        if (typeof satScreenPositionArray.x === 'undefined' || typeof satScreenPositionArray.y === 'undefined') {
          return;
        }
        if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) {
          return;
        }

        // Draw Orbits
        if (!settingsManager.isShowSatNameNotOrbit) {
          orbitManagerInstance.addInViewOrbit(id);
        }

        visibleSatIds.push(id);
        labelTexts.push(obj.source === CatalogSource.VIMPEL ? `JSC${obj.altId}` : obj.sccNum);
      });
    }

    // Update GPU label manager with visible satellite data
    ServiceLocator.getSatLabelManager()?.updateLabels(visibleSatIds, labelTexts);

    this.satLabelModeLastTime_ = timeManagerInstance.realTime;
  }

  setNearRenderer() {
    if (!this.gl) {
      return;
    }

    if (settingsManager.zNear !== 0.1) {
      settingsManager.selectedColor = [0, 0, 0, 0];
      settingsManager.zNear = 0.1;
      settingsManager.zFar = 200000;
      this.updatePMatrix();
    }
  }

  setFarRenderer() {
    if (!this.gl) {
      return;
    }

    if (settingsManager.zNear !== 2) {
      settingsManager.zNear = 2;
      settingsManager.zFar = 450000;
      this.updatePMatrix();
    }
  }

  getScreenCoords(obj: BaseObject): {
    x: number;
    y: number;
    z: number;
    error: boolean;
  } {
    const mainCamera = ServiceLocator.getMainCamera();

    const pMatrix = mainCamera.projectionMatrix;
    const camMatrix = mainCamera.matrixWorldInverse;
    const screenPos = { x: 0, y: 0, z: 0, error: false };

    try {
      const objWithPos = obj as unknown as { position: TemeVec3 };
      const pos = objWithPos.position;

      if (!pos) {
        throw new Error(`No Position for Sat ${obj.id}`);
      }

      // We need to account for Scene.getInstance().worldShift and modify x, y, z accordingly
      pos.x = pos.x + Scene.getInstance().worldShift[0] as Kilometers;
      pos.y = pos.y + Scene.getInstance().worldShift[1] as Kilometers;
      pos.z = pos.z + Scene.getInstance().worldShift[2] as Kilometers;

      let px = pos.x as number;
      let py = pos.y as number;
      let pz = pos.z as number;

      // In flat map mode, convert ECI to flat map coordinates (must match the shader)
      if (mainCamera.cameraType === CameraType.FLAT_MAP) {
        const eciDist = Math.sqrt(px * px + py * py + pz * pz);

        if (eciDist > 1e7) {
          screenPos.error = true;

          return screenPos;
        }
        const gmst = ServiceLocator.getTimeManager().gmst;
        let lon = Math.atan2(py, px) - gmst;

        lon = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        const lat = Math.atan2(pz, Math.sqrt(px * px + py * py));
        const alt = eciDist - RADIUS_OF_EARTH;

        px = lon * RADIUS_OF_EARTH;
        py = lat * RADIUS_OF_EARTH;
        pz = alt * 0.001;

        // Wrap X to nearest copy of camera center (matches shader logic)
        const mapW = 2 * Math.PI * RADIUS_OF_EARTH;

        px = mainCamera.flatMapPanX + ((px - mainCamera.flatMapPanX + mapW * 0.5) % mapW + mapW) % mapW - mapW * 0.5;
      }

      const posVec4 = <[number, number, number, number]>vec4.fromValues(px, py, pz, 1);

      vec4.transformMat4(posVec4, posVec4, camMatrix);
      vec4.transformMat4(posVec4, posVec4, pMatrix);

      screenPos.x = posVec4[0] / posVec4[3];
      screenPos.y = posVec4[1] / posVec4[3];
      screenPos.z = posVec4[2] / posVec4[3];

      screenPos.x = (screenPos.x + 1) * 0.5 * window.innerWidth;
      screenPos.y = (-screenPos.y + 1) * 0.5 * window.innerHeight;

      // In flat map (ortho) mode the z check is meaningless: the ortho projection maps
      // the tiny positive z (altitude above the map plane) to a slightly negative NDC z,
      // which would always fail the z >= 0 test meant for perspective projections.
      if (mainCamera.cameraType === CameraType.FLAT_MAP) {
        screenPos.error = !(screenPos.x >= 0 && screenPos.y >= 0);
      } else {
        screenPos.error = !(screenPos.x >= 0 && screenPos.y >= 0 && screenPos.z >= 0 && screenPos.z <= 1);
      }
    } catch {
      screenPos.error = true;
    }

    return screenPos;
  }

  resizeCanvas(isForcedResize = false) {
    const gl = this.gl;

    // Skip GPU resource (re)creation while the WebGL context is lost; replay once it's restored.
    if (this.isContextLost || gl?.isContextLost?.()) {
      this.isResizePendingAfterContextRestore_ = true;

      return;
    }

    if (!gl.canvas) {
      // We lost the canvas - try to get it again
      this.glInit();

      return;
    }

    const { vw, vh } = WebGLRenderer.getCanvasInfo();

    // If taking a screenshot then resize no matter what to get high resolution
    if (!isForcedResize && (gl.canvas.width !== vw || gl.canvas.height !== vh)) {
      // If not autoresizing then don't do anything to the canvas
      if (settingsManager.isAutoResizeCanvas) {
        /*
         * If this is a cellphone avoid the keyboard forcing resizes but
         * always resize on rotation
         */
        const oldWidth = this.domElement.width;
        const oldHeight = this.domElement.height;
        /*
         * Changes more than 35% of height but not due to rotation are likely the keyboard! Ignore them
         * but make sure we have set this at least once to trigger
         */
        const isKeyboardOut = Math.abs((vw - oldWidth) / oldWidth) < 0.35 && Math.abs((vh - oldHeight) / oldHeight) > 0.35;

        if (!settingsManager.isMobileModeEnabled || !isKeyboardOut || this.isRotationEvent_ || !ServiceLocator.getMainCamera().projectionMatrix) {
          this.setCanvasSize(vh, vw);
          this.isRotationEvent_ = false;
        } else {
          // No Canvas Change
          return;
        }
      }
    } else if (isForcedResize) {
      if (!settingsManager.hiResHeight || !settingsManager.hiResWidth) {
        settingsManager.hiResHeight = vh;
        settingsManager.hiResWidth = vw;
      }
      this.setCanvasSize(settingsManager.hiResHeight, settingsManager.hiResWidth);
    }

    gl.viewport(0, 0, this.domElement.width, this.domElement.height);
    this.updatePMatrix();
    this.isPostProcessingResizeNeeded = true;

    // Resize the GPU picker framebuffer to match the new canvas size. Wrap in try/catch
    // so a transient GL failure (observed during driver hiccups) only defers the resize
    // until context restore instead of aborting the rest of the resize path.
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    if (dotsManagerInstance.isReady) {
      try {
        dotsManagerInstance.resizePickingFramebuffer();
      } catch (error) {
        errorManagerInstance.warn(
          `Picking framebuffer resize failed during resizeCanvas; deferring until context restore. ${error instanceof Error ? error.message : error}`,
        );
        this.isResizePendingAfterContextRestore_ = true;
      }
    }

    // Fix flat geometry if it has already been created. Wrap in try/catch so a failing
    // shader compile (observed on iOS Safari during the initial postStart resize) only
    // disables godrays instead of aborting the whole startup chain.
    const scene = ServiceLocator.getScene();

    try {
      scene.godrays?.init(gl, scene.sun);
    } catch (error) {
      errorManagerInstance.warn(`Godrays init failed during resizeCanvas; disabling godrays. ${error instanceof Error ? error.message : error}`);
      scene.godrays = null as unknown as Godrays;
    }
  }

  /**
   * @deprecated
   */
  resizePostProcessingTexture(gl: WebGL2RenderingContext, sun: Sun, postProcessingManagerRef: PostProcessingManager): void {
    if (typeof gl === 'undefined' || gl === null) {
      throw new Error('gl is undefined or null');
    }
    if (typeof sun === 'undefined' || sun === null) {
      throw new Error('sun is undefined or null');
    }
    if (typeof postProcessingManagerRef === 'undefined' || postProcessingManagerRef === null) {
      throw new Error('postProcessingManager is undefined or null');
    }

    // Post Processing Texture Needs Scaled
    ServiceLocator.getScene().godrays?.init(gl, sun);
    postProcessingManagerRef.init(gl);

    // Reset Flag now that textures are reinitialized
    this.isPostProcessingResizeNeeded = false;
  }

  /**
   * Update the primary selected satellite
   */
  private updatePrimarySatellite_() {
    if (!this.selectSatManager_) {
      return;
    }

    // If this.selectedSat_.selectedSat has changed then select it
    if (this.selectSatManager_?.selectedSat !== this.selectSatManager_?.lastSelectedSat()) {
      errorManagerInstance.debug('selectedSat has changed');
      // this.selectSatManager_.selectSat(this.selectSatManager_?.selectedSat);
    }

    const sceneInstance = Scene.getInstance();

    if (this.selectSatManager_?.primarySatObj.id !== -1) {
      const timeManagerInstance = ServiceLocator.getTimeManager();
      const primarySat = ServiceLocator.getCatalogManager().getObject(this.selectSatManager_.primarySatObj.id, GetSatType.POSITION_ONLY) as Satellite | MissileObject;
      const satelliteOffset = ServiceLocator.getDotsManager().getPositionArray(this.selectSatManager_.primarySatObj.id).map((coord) => -coord);

      // Route through the base+resolve path (NOT a raw worldShift write): the
      // mesh position baked below must use the resolved shift, which is [0,0,0]
      // when the main camera is in a 2D mode with a world-shift override
      sceneInstance.setWorldShiftBase(satelliteOffset as [number, number, number]);

      this.meshManager.update(timeManagerInstance.selectedDate, primarySat as Satellite);
      ServiceLocator.getMainCamera().snapToSat(primarySat, timeManagerInstance.simulationTimeObj);
      if (primarySat.isMissile()) {
        ServiceLocator.getOrbitManager().setSelectOrbit(primarySat.id);
      }

      // If in satellite view the orbit buffer needs to be updated every time
      // Skip alignment in ECF mode — the shader rotates ECEF data per-frame using GMST
      if (
        !settingsManager.isOrbitCruncherInEcf &&
        !primarySat.isMissile() &&
        (ServiceLocator.getMainCamera().cameraType === CameraType.SATELLITE_FIRST_PERSON || ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_SAT_LVLH || ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_SAT_ECI)
      ) {
        /*
         * Force an update so that the orbit is always using recent data - this
         * will not fix this draw call
         */
        // ServiceLocator.getOrbitManager().updateOrbitBuffer(this.selectSatManager_.primarySatObj.id);

        // Now we can fix this draw call
        const firstPointOut = ServiceLocator.getDotsManager().getPositionArray(Number(this.selectSatManager_.primarySatObj.id));
        const firstRelativePointOut = SatMath.getPositionFromCenterBody({
          x: firstPointOut[0] as Kilometers,
          y: firstPointOut[1] as Kilometers,
          z: firstPointOut[2] as Kilometers,
        });

        if (primarySat instanceof Satellite) {
          ServiceLocator.getOrbitManager().alignOrbitSelectedObject(
            this.selectSatManager_.primarySatObj.id, [firstRelativePointOut.x, firstRelativePointOut.y, firstRelativePointOut.z],
          );
        } else if (primarySat instanceof OemSatellite) {
          ServiceLocator.getOrbitManager().alignOrbitSelectedObject(
            this.selectSatManager_.primarySatObj.id,
            [firstPointOut[0], firstPointOut[1], firstPointOut[2]],
            false,
          );
        } else {
          ServiceLocator.getOrbitManager().alignOrbitSelectedObject(
            this.selectSatManager_.primarySatObj.id,
            [firstRelativePointOut.x, firstRelativePointOut.y, firstRelativePointOut.z],
            true,
          );
        }
      }

      sceneInstance.searchBox.update(primarySat, timeManagerInstance.selectedDate);

      sceneInstance.primaryCovBubble.update(primarySat);
    } else {
      sceneInstance.searchBox.update(null);

      // Update mesh for deep-space satellite when centered (no satellite selected)
      const deepSpaceSat = sceneInstance.deepSpaceSatellites?.[settingsManager.centerBody];

      if (deepSpaceSat) {
        this.meshManager.updateForBody(deepSpaceSat.position, deepSpaceSat.getModelName());
      }
    }
  }

  private updateSecondarySatellite_() {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    if (!selectSatManager || selectSatManager.secondarySat === -1) {
      return;
    }

    // Fetch with POSITION_ONLY so the position is current (same as primary)
    const secondarySat = ServiceLocator.getCatalogManager().getObject(selectSatManager.secondarySat, GetSatType.POSITION_ONLY);

    if (!secondarySat) {
      return;
    }

    ServiceLocator.getScene().secondaryCovBubble.update(secondarySat);
  }

  setCanvasSize(height: number, width: number) {
    this.domElement.width = width;
    this.domElement.height = height;
  }

  setCursor(cursor: 'default' | 'pointer' | 'grab' | 'grabbing') {
    this.domElement.style.cursor = cursor;
  }

  // eslint-disable-next-line require-await
  async startWithOrbits(): Promise<void> {
    if (this.settings_.startWithOrbitsDisplayed) {
      const groupsManagerInstance = ServiceLocator.getGroupsManager();
      const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

      // All Orbits
      groupsManagerInstance.groupList.debris = groupsManagerInstance.createGroup(GroupType.ALL, '', 'AllSats');
      groupsManagerInstance.selectGroup(groupsManagerInstance.groupList.debris);
      colorSchemeManagerInstance.calculateColorBuffers(true); // force color recalc
      groupsManagerInstance.groupList.debris.updateOrbits();
      this.settings_.isOrbitOverlayVisible = true;
    }
  }

  update(): void {
    this.validateProjectionMatrix_();
    const timeManagerInstance = ServiceLocator.getTimeManager();

    this.updatePrimarySatellite_();
    this.updateSecondarySatellite_();
    ServiceLocator.getMainCamera().update(this.dt);
    // Update secondary viewports (rects + camera state) before the projection
    // rebuild so the main camera's viewport-aware aspect ratio is current
    ViewportManager.getInstance().update(this.dt);
    // Rebuild projection matrix after camera update so FOV lerps are reflected immediately
    this.updatePMatrix();

    ServiceLocator.getScene().update(timeManagerInstance.simulationTimeObj);

    this.orbitsAbove(); // this.sensorPos is set here for the Camera Manager

    EventBus.getInstance().emit(EventBusEvent.updateLoop);
  }

  getCurrentViewport(target = vec4.create()): vec4 {
    const gl = this.gl;

    vec4.set(target, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return target;
  }

  getDrawingBufferSize(target = vec2.create()): vec2 {
    const gl = this.gl;

    vec2.set(target, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return target;
  }

  getPixelRatio(): number {
    return window.devicePixelRatio;
  }

  getActiveMipmapLevel(): number {
    const gl = this.gl;
    const activeTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const activeTextureLevel = gl.getTexParameter(activeTexture, gl.TEXTURE_MAX_LEVEL);


    return activeTextureLevel;
  }

  getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  private validateProjectionMatrix_() {
    // No valid projection matrix is possible while the context is lost; suppress checks/retries
    // until the restore handler replays resizeCanvas and rebuilds the matrix.
    if (this.isContextLost || this.gl?.isContextLost?.()) {
      return;
    }

    const mainCamera = ServiceLocator.getMainCamera();
    const projectionMatrix = mainCamera.projectionMatrix;

    if (!projectionMatrix) {
      errorManagerInstance.log('projectionMatrix is undefined - retrying');
      this.updatePMatrix();

      return;
    }

    for (let i = 0; i < 16; i++) {
      if (isNaN(projectionMatrix[i])) {
        const fov = mainCamera.fov;
        const aspect = this.gl ? this.gl.drawingBufferWidth / this.gl.drawingBufferHeight : 'no-gl';
        const cameraType = mainCamera.cameraType;

        errorManagerInstance.log(
          `projectionMatrix[${i}] is NaN - fov=${fov}, aspect=${aspect}, cameraType=${cameraType}, ` +
          `matrix=[${Array.from(projectionMatrix).map((v) => (isNaN(v) ? 'NaN' : v.toFixed(4))).join(', ')}]`,
        );
        this.updatePMatrix();

        return;
      }
    }

    for (let i = 0; i < 16; i++) {
      if (projectionMatrix[i] !== 0) {
        break;
      }
      if (i === 15) {
        errorManagerInstance.log('projectionMatrix is all zeros - retrying');
        this.updatePMatrix();
      }
    }
  }
}
