import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { BaseObject, CatalogSource, DetailedSatellite, GreenwichMeanSiderealTime, Kilometers, Milliseconds } from '@ootk/src/main';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { GroupType } from '../../app/data/object-group';
import { SettingsManager } from '../../settings/settings';
import { Camera, CameraType } from '../camera/camera';
import { GetSatType } from '../core/interfaces';
import { PluginRegistry } from '../core/plugin-registry';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { errorManagerInstance } from '../utils/errorManager';
import { getEl } from '../utils/get-el';
import { isThisNode } from '../utils/isThisNode';
import { DepthManager } from './depth-manager';
import { PostProcessingManager } from './draw-manager/post-processing';
import { Sun } from './draw-manager/sun';
import { MeshManager } from './mesh-manager';
import { KeepTrack } from '@app/keeptrack';

export class WebGLRenderer {
  private hoverBoxOnSatMiniElements_: HTMLElement | null = null;
  private isRotationEvent_: boolean;
  private isSatMiniBoxInUse_ = false;
  private labelCount_ = 0;
  private satHoverMiniDOM_: HTMLDivElement;
  private satLabelModeLastTime_ = 0;
  private satMiniBox_: HTMLDivElement;
  private settings_: SettingsManager;
  isContextLost = false;

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

    ServiceLocator.getMainCamera().projectionMatrix = Camera.calculatePMatrix(this.gl);
  }

  private isAltCanvasSize_ = false;

  render(scene: Scene, camera: Camera): void {
    if (this.isContextLost) {
      return;
    }

    if (EventBus.getInstance().methods.altCanvasResize()) {
      this.resizeCanvas(true);
      this.isAltCanvasSize_ = true;
    } else if (this.isAltCanvasSize_) {
      this.resizeCanvas(false);
      this.isAltCanvasSize_ = false;
    }

    const mainCamera = ServiceLocator.getMainCamera();

    // Apply the camera matrix
    this.projectionCameraMatrix = mat4.mul(mat4.create(), mainCamera.projectionMatrix, mainCamera.matrixWorldInverse);

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
  }

  private onContextRestore_() {
    errorManagerInstance.info('WebGL Context Restored');
    this.resetGLState_();
    this.isContextLost = false;
  }

  // eslint-disable-next-line require-await
  async glInit(): Promise<WebGL2RenderingContext> {
    // Ensure the canvas is available
    this.domElement = <HTMLCanvasElement>getEl('keeptrack-canvas');

    if (!this.domElement) {
      throw new Error('The canvas DOM is missing. This could be due to a firewall (ex. Menlo). Contact your LAN Office or System Adminstrator.');
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
      throw new Error('WebGL is not available. Contact your LAN Office or System Administrator.');
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

    this.satMiniBox_ = <HTMLDivElement>(<unknown>getEl('sat-minibox'));
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

    if (
      ServiceLocator.getMainCamera().cameraType === CameraType.ASTRONOMY ||
      ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM ||
      watchlistPluginInstance?.hasAnyInView()
    ) {
      // Catch race condition where sensor has been reset but camera hasn't been updated
      try {
        this.sensorPos = sensorManagerInstance.calculateSensorPos(timeManagerInstance.simulationTimeObj, sensorManagerInstance.currentSensors);
      } catch {
        errorManagerInstance.debug('Sensor not found, clearing orbits above!');
        this.sensorPos = null;
        ServiceLocator.getOrbitManager().clearInViewOrbit();

        return;
      }
      if (!this.isDrawOrbitsAbove) {
        /*
         * Don't do this until the scene is redrawn with a new camera or thousands of satellites will
         * appear to be in the field of view
         */
        this.isDrawOrbitsAbove = true;

        return;
      }
      // Previously called showOrbitsAbove();
      if (!settingsManager.isSatLabelModeOn || (ServiceLocator.getMainCamera().cameraType !== CameraType.PLANETARIUM && !watchlistPluginInstance?.hasAnyInView())) {
        if (this.isSatMiniBoxInUse_) {
          this.hoverBoxOnSatMiniElements_ = getEl('sat-minibox');

          if (this.hoverBoxOnSatMiniElements_) {
            this.hoverBoxOnSatMiniElements_.innerHTML = '';
          }
        }
        this.isSatMiniBoxInUse_ = false;

        return;
      }

      if (sensorManagerInstance?.currentSensors[0]?.lat === null) {
        return;
      }
      if (timeManagerInstance.realTime - this.satLabelModeLastTime_ < settingsManager.minTimeBetweenSatLabels) {
        return;
      }

      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      orbitManagerInstance.clearInViewOrbit();

      let obj: BaseObject | null;

      this.labelCount_ = 0;

      this.hoverBoxOnSatMiniElements_ = getEl('sat-minibox');

      /**
       * @todo Reuse hoverBoxOnSatMini DOM Elements
       * @body Currently are writing and deleting the nodes every draw element. Reusuing them with a transition effect will make it smoother
       */
      this.hoverBoxOnSatMiniElements_.innerHTML = '';
      if (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM) {
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        for (let i = 0; i < catalogManagerInstance.orbitalSats && this.labelCount_ < settingsManager.maxLabels; i++) {
          obj = catalogManagerInstance.getObject(i, GetSatType.POSITION_ONLY);

          if (!obj?.isSatellite()) {
            continue;
          }
          const sat = <DetailedSatellite>obj;
          const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

          if (colorSchemeManagerInstance.isPayloadOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isRocketBodyOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isDebrisOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isJscVimpelSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isNotionalSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isvLeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isGeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isLeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isMeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isHeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isXGeoSatOff(sat)) {
            continue;
          }

          const satScreenPositionArray = this.getScreenCoords(sat);

          if (satScreenPositionArray.error) {
            continue;
          }
          if (typeof satScreenPositionArray.x === 'undefined' || typeof satScreenPositionArray.y === 'undefined') {
            continue;
          }
          if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) {
            continue;
          }

          // Draw Orbits
          if (!settingsManager.isShowSatNameNotOrbit) {
            orbitManagerInstance.addInViewOrbit(i);
          }

          /*
           * Draw Sat Labels
           * if (!settingsManager.enableHoverOverlay) continue
           */
          this.satHoverMiniDOM_ = document.createElement('div');
          this.satHoverMiniDOM_.id = `sat-minibox-${i}`;
          if (sat.source === CatalogSource.VIMPEL) {
            this.satHoverMiniDOM_.textContent = `JSC${sat.altId}`;
          } else {
            this.satHoverMiniDOM_.textContent = sat.sccNum;
          }

          this.satHoverMiniDOM_.style.display = 'block';
          this.satHoverMiniDOM_.style.position = 'absolute';
          this.satHoverMiniDOM_.style.textShadow = '-2px -2px 5px #000, 2px -2px 5px #000, -2px 2px 5px #000, 2px 2px 5px #000';
          this.satHoverMiniDOM_.style.left = `${satScreenPositionArray.x + 20}px`;
          this.satHoverMiniDOM_.style.top = `${satScreenPositionArray.y}px`;

          this.hoverBoxOnSatMiniElements_.appendChild(this.satHoverMiniDOM_);
          this.labelCount_++;
        }
      } else {
        const catalogManagerInstance = ServiceLocator.getCatalogManager();
        const dotsManagerInstance = ServiceLocator.getDotsManager();

        if (!dotsManagerInstance.inViewData) {
          return;
        }

        watchlistPluginInstance?.watchlistList.forEach(({ id }) => {
          const obj = catalogManagerInstance.getObject(id, GetSatType.POSITION_ONLY) as DetailedSatellite;

          if (dotsManagerInstance.inViewData[id] === 0) {
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

          /*
           * Draw Sat Labels
           * if (!settingsManager.enableHoverOverlay) continue
           */
          this.satHoverMiniDOM_ = document.createElement('div');
          this.satHoverMiniDOM_.id = `sat-minibox-${id}`;
          if (obj.source === CatalogSource.VIMPEL) {
            this.satHoverMiniDOM_.textContent = `JSC${obj.altId}`;
          } else {
            this.satHoverMiniDOM_.textContent = obj.sccNum;
          }

          // Draw Orbits
          if (!settingsManager.isShowSatNameNotOrbit) {
            orbitManagerInstance.addInViewOrbit(id);
          }

          this.satHoverMiniDOM_.style.display = 'block';
          this.satHoverMiniDOM_.style.position = 'absolute';
          this.satHoverMiniDOM_.style.textShadow = '-2px -2px 5px #000, 2px -2px 5px #000, -2px 2px 5px #000, 2px 2px 5px #000';
          this.satHoverMiniDOM_.style.left = `${satScreenPositionArray.x + 20}px`;
          this.satHoverMiniDOM_.style.top = `${satScreenPositionArray.y}px`;

          this.hoverBoxOnSatMiniElements_.appendChild(this.satHoverMiniDOM_);
          this.labelCount_++;
        });
      }
      this.isSatMiniBoxInUse_ = true;
      this.satLabelModeLastTime_ = timeManagerInstance.realTime;
    } else {
      this.sensorPos = null;
      this.isDrawOrbitsAbove = false;
    }

    // Hide satMiniBoxes When Not in Use
    if (!settingsManager.isSatLabelModeOn || (ServiceLocator.getMainCamera().cameraType !== CameraType.PLANETARIUM && !watchlistPluginInstance?.hasAnyInView())) {
      if (this.isSatMiniBoxInUse_) {
        this.satMiniBox_ = <HTMLDivElement>(<unknown>getEl('sat-minibox'));
        this.satMiniBox_.innerHTML = '';
      }
      this.isSatMiniBoxInUse_ = false;
    }
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
      const pos = obj.position;

      if (!pos) {
        throw new Error(`No Position for Sat ${obj.id}`);
      }

      // We need to account for Scene.getInstance().worldShift and modify x, y, z accordingly
      pos.x = pos.x + Scene.getInstance().worldShift[0] as Kilometers;
      pos.y = pos.y + Scene.getInstance().worldShift[1] as Kilometers;
      pos.z = pos.z + Scene.getInstance().worldShift[2] as Kilometers;

      const posVec4 = <[number, number, number, number]>vec4.fromValues(pos.x, pos.y, pos.z, 1);

      vec4.transformMat4(posVec4, posVec4, camMatrix);
      vec4.transformMat4(posVec4, posVec4, pMatrix);

      screenPos.x = posVec4[0] / posVec4[3];
      screenPos.y = posVec4[1] / posVec4[3];
      screenPos.z = posVec4[2] / posVec4[3];

      screenPos.x = (screenPos.x + 1) * 0.5 * window.innerWidth;
      screenPos.y = (-screenPos.y + 1) * 0.5 * window.innerHeight;

      screenPos.error = !(screenPos.x >= 0 && screenPos.y >= 0 && screenPos.z >= 0 && screenPos.z <= 1);
    } catch {
      screenPos.error = true;
    }

    return screenPos;
  }

  resizeCanvas(isForcedResize = false) {
    const gl = this.gl;

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

    // Fix the gpu picker texture size if it has already been created
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    if (dotsManagerInstance.isReady) {
      dotsManagerInstance.initProgramPicking();
    }

    // Fix flat geometry if it has already been created
    ServiceLocator.getScene().godrays?.init(gl, ServiceLocator.getScene().sun);
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
      const primarySat = ServiceLocator.getCatalogManager().getObject(this.selectSatManager_.primarySatObj.id, GetSatType.POSITION_ONLY) as DetailedSatellite | MissileObject;
      const satelliteOffset = ServiceLocator.getDotsManager().getPositionArray(this.selectSatManager_.primarySatObj.id).map((coord) => -coord);

      sceneInstance.worldShift = satelliteOffset as [number, number, number];
      // sceneInstance.worldShift[0] = satelliteOffset[0] - sceneInstance.worldShift[0];
      // sceneInstance.worldShift[1] = satelliteOffset[1] - sceneInstance.worldShift[1];
      // sceneInstance.worldShift[2] = satelliteOffset[2] - sceneInstance.worldShift[2];

      this.meshManager.update(timeManagerInstance.selectedDate, primarySat as DetailedSatellite);
      ServiceLocator.getMainCamera().snapToSat(primarySat, timeManagerInstance.simulationTimeObj);
      if (primarySat.isMissile()) {
        ServiceLocator.getOrbitManager().setSelectOrbit(primarySat.id);
      }

      // If in satellite view the orbit buffer needs to be updated every time
      if (
        !primarySat.isMissile() &&
        (ServiceLocator.getMainCamera().cameraType === CameraType.SATELLITE || ServiceLocator.getMainCamera().cameraType === CameraType.FIXED_TO_SAT)
      ) {
        /*
         * Force an update so that the orbit is always using recent data - this
         * will not fix this draw call
         */
        // ServiceLocator.getOrbitManager().updateOrbitBuffer(this.selectSatManager_.primarySatObj.id);

        // Now we can fix this draw call
        const firstPointOut = ServiceLocator.getDotsManager().getPositionArray(this.selectSatManager_.primarySatObj.id);
        const firstRelativePointOut = SatMath.getPositionFromCenterBody({
          x: firstPointOut[0] as Kilometers,
          y: firstPointOut[1] as Kilometers,
          z: firstPointOut[2] as Kilometers,
        });

        if (primarySat instanceof DetailedSatellite) {
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
    }
  }

  private updateSecondarySatellite_() {
    const secondarySat = PluginRegistry.getPlugin(SelectSatManager)?.secondarySatObj;

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
    const projectionMatrix = ServiceLocator.getMainCamera().projectionMatrix;

    if (!projectionMatrix) {
      errorManagerInstance.log('projectionMatrix is undefined - retrying');
      this.updatePMatrix();
    }

    for (let i = 0; i < 16; i++) {
      if (isNaN(projectionMatrix[i])) {
        errorManagerInstance.log('projectionMatrix is NaN - retrying');
        this.updatePMatrix();
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
