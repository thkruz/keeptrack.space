import { keepTrackApi } from '@app/js/keepTrackApi';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { GreenwichMeanSiderealTime, Milliseconds } from 'ootk';
import { GetSatType, SatObject } from '../interfaces';
import { getEl } from '../lib/get-el';
import { SpaceObjectType } from '../lib/space-object-type';
import { StereoMapPlugin } from '../plugins/stereo-map/stereo-map';
import { watchlistPlugin } from '../plugins/watchlist/watchlist';
import { SettingsManager } from '../settings/settings';
import { CatalogSource } from '../static/catalog-loader';
import { isThisNode } from '../static/isThisNode';
import { SatMath } from '../static/sat-math';
import { Camera, CameraType } from './camera';
import { lineManagerInstance } from './draw-manager/line-manager';
import { MeshManager } from './draw-manager/mesh-manager';
import { PostProcessingManager } from './draw-manager/post-processing';
import { Sun } from './draw-manager/sun';
import { errorManagerInstance } from './errorManager';
import { GroupType } from './object-group';
import { Scene } from './scene';

export class WebGLRenderer {
  private hoverBoxOnSatMiniElements_ = null;
  private isRotationEvent_: boolean;
  private isSatMiniBoxInUse_ = false;
  private labelCount_ = 0;
  private satHoverMiniDOM_: HTMLDivElement;
  private satLabelModeLastTime_ = 0;
  private satMiniBox_: HTMLDivElement;
  private settings_: SettingsManager;
  private isContextLost_ = false;

  /** A canvas where the renderer draws its output. */
  domElement: HTMLCanvasElement;
  demoModeSatellite: any;
  /** The number of milliseconds since the last draw event
   *
   *  Use this for all ui interactions that are agnostic to propagation rate
   */
  dt: Milliseconds;
  /** The number of milliseconds since the last draw event multiplied by propagation rate
   *
   *  Use this for all time calculations involving position and velocity
   */
  dtAdjusted: Milliseconds;
  /**
   * Main source of glContext for rest of the application
   */
  gl: WebGL2RenderingContext;
  gmst: GreenwichMeanSiderealTime;
  isDrawOrbitsAbove: boolean;
  isPostProcessingResizeNeeded: boolean;
  isShowDistance = false;
  isUpdateTimeThrottle: boolean;
  lastSelectedSat: number;
  meshManager = new MeshManager();
  /**
   * Main source of projection matrix for rest of the application
   */
  projectionMatrix: mat4;
  projectionCameraMatrix: mat4;
  postProcessingManager: PostProcessingManager;
  sat: SatObject;
  sat2: SatObject;

  selectSatManager = keepTrackApi.getSelectSatManager();
  sensorPos: { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime };

  static calculatePMatrix(gl: WebGL2RenderingContext): mat4 {
    const pMatrix = mat4.create();
    mat4.perspective(pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);

    // This converts everything from 3D space to ECI (z and y planes are swapped)
    const eciToOpenGlMat: mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
    mat4.mul(pMatrix, pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat
    return pMatrix;
  }

  static getCanvasInfo(): { vw: number; vh: number } {
    // Using minimum allows the canvas to be full screen without fighting with scrollbars
    const cw = document.documentElement.clientWidth || 0;
    const iw = window.innerWidth || 0;
    const vw = Math.min.apply(null, [cw, iw].filter(Boolean));
    const vh = Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    return { vw, vh };
  }

  private isAltCanvasSize_: boolean = false;

  render(scene: Scene, camera: Camera): void {
    if (this.isContextLost_) return;

    if (keepTrackApi.methods.altCanvasResize()) {
      this.resizeCanvas(true);
      this.isAltCanvasSize_ = true;
    } else if (this.isAltCanvasSize_) {
      this.resizeCanvas(false);
      this.isAltCanvasSize_ = false;
    }

    // Apply the camera matrix
    this.projectionCameraMatrix = mat4.mul(mat4.create(), this.projectionMatrix, keepTrackApi.getMainCamera().camMatrix);

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
    this.isContextLost_ = true;
  }

  private onContextRestore_() {
    errorManagerInstance.info('WebGL Context Restored');
    this.resetGLState_();
    this.isContextLost_ = false;
  }

  async glInit(): Promise<WebGL2RenderingContext> {
    // Ensure the canvas is available
    this.domElement ??= isThisNode() ? <HTMLCanvasElement>(<any>document).canvas : <HTMLCanvasElement>getEl('keeptrack-canvas');

    if (!this.domElement) {
      throw new Error(`The canvas DOM is missing. This could be due to a firewall (ex. Menlo). Contact your LAN Office or System Adminstrator.`);
    }

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    // Try to prevent crashes
    if (this.domElement?.addEventListener) {
      this.domElement.addEventListener('webglcontextlost', this.onContextLost_.bind(this));
      this.domElement.addEventListener('webglcontextrestored', this.onContextRestore_.bind(this));
    }

    let gl: WebGL2RenderingContext;
    gl = isThisNode()
      ? global.mocks.glMock
      : this.domElement.getContext('webgl2', {
          alpha: false,
          premultipliedAlpha: false,
          desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
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
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.postProcessingManager = new PostProcessingManager();
    this.postProcessingManager.init(gl);

    return gl;
  }

  async init(settings: SettingsManager): Promise<void> {
    this.settings_ = settings;

    this.satMiniBox_ = <HTMLDivElement>(<unknown>getEl('sat-minibox'));
    keepTrackApi.getHoverManager().init();
    this.startWithOrbits();

    // Reinitialize the canvas on mobile rotation
    window.addEventListener('orientationchange', () => {
      this.isRotationEvent_ = true;
    });

    keepTrackApi.getScene().earth.reloadEarthHiResTextures();
  }

  orbitsAbove() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    if (
      keepTrackApi.getMainCamera().cameraType == CameraType.ASTRONOMY ||
      keepTrackApi.getMainCamera().cameraType == CameraType.PLANETARIUM ||
      watchlistPlugin?.watchlistInViewList?.length > 0
    ) {
      this.sensorPos = sensorManagerInstance.calculateSensorPos(timeManagerInstance.simulationTimeObj, sensorManagerInstance.currentSensors);
      if (!this.isDrawOrbitsAbove) {
        // Don't do this until the scene is redrawn with a new camera or thousands of satellites will
        // appear to be in the field of view
        this.isDrawOrbitsAbove = true;
        return;
      }
      // Previously called showOrbitsAbove();
      if (!settingsManager.isSatLabelModeOn || (keepTrackApi.getMainCamera().cameraType !== CameraType.PLANETARIUM && watchlistPlugin?.watchlistInViewList?.length === 0)) {
        if (this.isSatMiniBoxInUse_) {
          this.hoverBoxOnSatMiniElements_ = getEl('sat-minibox');
          this.hoverBoxOnSatMiniElements_.innerHTML = '';
        }
        this.isSatMiniBoxInUse_ = false;
        return;
      }

      if (sensorManagerInstance?.currentSensors[0]?.lat === null) return;
      if (timeManagerInstance.realTime - this.satLabelModeLastTime_ < settingsManager.minTimeBetweenSatLabels) return;

      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      orbitManagerInstance.clearInViewOrbit();

      let sat: SatObject;
      this.labelCount_ = 0;

      this.hoverBoxOnSatMiniElements_ = getEl('sat-minibox');

      /**
       * @todo Reuse hoverBoxOnSatMini DOM Elements
       * @body Currently are writing and deleting the nodes every draw element. Reusuing them with a transition effect will make it smoother
       */
      this.hoverBoxOnSatMiniElements_.innerHTML = '';
      if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();

        for (let i = 0; i < catalogManagerInstance.orbitalSats && this.labelCount_ < settingsManager.maxLabels; i++) {
          sat = catalogManagerInstance.getSat(i, GetSatType.POSITION_ONLY);

          if (sat.static) continue;
          if (sat.missile) continue;
          if (keepTrackApi.getColorSchemeManager().isPayloadOff(sat)) continue;
          if (keepTrackApi.getColorSchemeManager().isRocketBodyOff(sat)) continue;
          if (keepTrackApi.getColorSchemeManager().isDebrisOff(sat)) continue;
          if (keepTrackApi.getColorSchemeManager().isInViewOff(sat)) continue;

          const satScreenPositionArray = this.getScreenCoords(sat);
          if (satScreenPositionArray.error) continue;
          if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
          if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;

          // Draw Orbits
          if (!settingsManager.isShowSatNameNotOrbit) {
            orbitManagerInstance.addInViewOrbit(i);
          }

          // Draw Sat Labels
          // if (!settingsManager.enableHoverOverlay) continue
          this.satHoverMiniDOM_ = document.createElement('div');
          this.satHoverMiniDOM_.id = 'sat-minibox-' + i;
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
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const dotsManagerInstance = keepTrackApi.getDotsManager();

        if (!dotsManagerInstance.inViewData) return;

        watchlistPlugin.watchlistList.forEach((id: number) => {
          sat = catalogManagerInstance.getSat(id, GetSatType.POSITION_ONLY);
          if (dotsManagerInstance.inViewData[id] === 0) return;
          const satScreenPositionArray = this.getScreenCoords(sat);
          if (satScreenPositionArray.error) return;
          if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') return;
          if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) return;

          // Draw Sat Labels
          // if (!settingsManager.enableHoverOverlay) continue
          this.satHoverMiniDOM_ = document.createElement('div');
          this.satHoverMiniDOM_.id = 'sat-minibox-' + id;
          if (sat.source === CatalogSource.VIMPEL) {
            this.satHoverMiniDOM_.textContent = `JSC${sat.altId}`;
          } else {
            this.satHoverMiniDOM_.textContent = sat.sccNum;
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
    if (!settingsManager.isSatLabelModeOn || (keepTrackApi.getMainCamera().cameraType !== CameraType.PLANETARIUM && watchlistPlugin?.watchlistInViewList?.length === 0)) {
      if (this.isSatMiniBoxInUse_) {
        this.satMiniBox_ = <HTMLDivElement>(<unknown>getEl('sat-minibox'));
        this.satMiniBox_.innerHTML = '';
      }
      this.isSatMiniBoxInUse_ = false;
    }
  }

  getScreenCoords(sat: SatObject): {
    x: number;
    y: number;
    z: number;
    error: boolean;
  } {
    const pMatrix = this.projectionMatrix;
    const camMatrix = keepTrackApi.getMainCamera().camMatrix;
    const screenPos = { x: 0, y: 0, z: 0, error: false };
    try {
      let pos = sat.position;
      if (!pos) throw new Error(`No Position for Sat ${sat.id}`);

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

  resizeCanvas(isForcedResize: boolean = false) {
    const gl = this.gl;
    const { vw, vh } = WebGLRenderer.getCanvasInfo();

    // If taking a screenshot then resize no matter what to get high resolution
    if ((!isForcedResize && gl.canvas.width != vw) || gl.canvas.height != vh) {
      // If not autoresizing then don't do anything to the canvas
      if (settingsManager.isAutoResizeCanvas) {
        // If this is a cellphone avoid the keyboard forcing resizes but
        // always resize on rotation
        const oldWidth = this.domElement.width;
        const oldHeight = this.domElement.height;
        // Changes more than 35% of height but not due to rotation are likely the keyboard! Ignore them
        // but make sure we have set this at least once to trigger
        const isKeyboardOut = Math.abs((vw - oldWidth) / oldWidth) < 0.35 && Math.abs((vh - oldHeight) / oldHeight) > 0.35;

        if (!settingsManager.isMobileModeEnabled || isKeyboardOut || this.isRotationEvent_ || !this.projectionMatrix) {
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
    this.projectionMatrix = WebGLRenderer.calculatePMatrix(this.gl);
    this.isPostProcessingResizeNeeded = true;

    // Fix the gpu picker texture size if it has already been created
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    if (dotsManagerInstance.isReady) dotsManagerInstance.initProgramPicking();
  }

  /**
   * @deprecated
   */
  resizePostProcessingTexture(gl: WebGL2RenderingContext, sun: Sun, postProcessingManagerRef: PostProcessingManager): void {
    if (typeof gl === 'undefined' || gl === null) throw new Error('gl is undefined or null');
    if (typeof sun === 'undefined' || sun === null) throw new Error('sun is undefined or null');
    if (typeof postProcessingManagerRef === 'undefined' || postProcessingManagerRef === null) throw new Error('postProcessingManager is undefined or null');

    // Post Processing Texture Needs Scaled
    keepTrackApi.getScene().godrays?.init(gl, sun);
    postProcessingManagerRef.init(gl);

    // Reset Flag now that textures are reinitialized
    this.isPostProcessingResizeNeeded = false;
  }

  /**
   * Calculate changes related to satellites objects
   */
  satCalculate() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const selectSatManager = keepTrackApi.getSelectSatManager();

    if (catalogManagerInstance.selectedSat !== -1) {
      this.sat = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
      if (!this.sat) {
        // Reset the selected sat if it is not found
        this.sat = <SatObject>{
          id: -1,
          missile: false,
          type: SpaceObjectType.UNKNOWN,
          static: false,
        };
        return;
      }
      this.meshManager.update(timeManagerInstance.selectedDate, this.sat);
      keepTrackApi.getMainCamera().snapToSat(this.sat, timeManagerInstance.simulationTimeObj);
      if (this.sat.missile) orbitManagerInstance.setSelectOrbit(this.sat.id);

      keepTrackApi.getScene().searchBox.update(this.sat, timeManagerInstance.selectedDate);
    } else {
      // Reset the selected satellite if no satellite is selected
      this.sat = <SatObject>{
        id: -1,
        missile: false,
        type: SpaceObjectType.UNKNOWN,
        static: false,
      };

      keepTrackApi.getScene().searchBox.update(null);
    }

    if (catalogManagerInstance.selectedSat !== this.lastSelectedSat) {
      if (catalogManagerInstance.selectedSat === -1 && !selectSatManager.isselectedSatNegativeOne) orbitManagerInstance.clearSelectOrbit();
      // WARNING: This is probably here on purpose - but it is getting called twice
      // THIS IS WHAT ACTUALLY SELECTS A SATELLITE, MOVES THE CAMERA, ETC!
      selectSatManager.selectSat(catalogManagerInstance.selectedSat);
      if (catalogManagerInstance.selectedSat !== -1) {
        orbitManagerInstance.setSelectOrbit(catalogManagerInstance.selectedSat);
        if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].lat != null && keepTrackApi.getDotsManager().inViewData?.[this.sat.id] === 1) {
          lineManagerInstance.drawWhenSelected();
          lineManagerInstance.updateLineToSat(catalogManagerInstance.selectedSat, catalogManagerInstance.getSensorFromSensorName(sensorManagerInstance.currentSensors[0].name));
        }
        if (settingsManager.plugins.stereoMap) (<StereoMapPlugin>keepTrackApi.getPlugin(StereoMapPlugin)).updateMap();
      } else {
        lineManagerInstance.drawWhenSelected();
      }
      this.lastSelectedSat = catalogManagerInstance.selectedSat;
      catalogManagerInstance.lastSelectedSat(catalogManagerInstance.selectedSat);
    }
  }

  setCanvasSize(height: number, width: number) {
    this.domElement.width = width;
    this.domElement.height = height;
  }

  setCursor(cursor: 'default' | 'pointer' | 'grab' | 'grabbing') {
    this.domElement.style.cursor = cursor;
  }

  async startWithOrbits(): Promise<void> {
    if (this.settings_.startWithOrbitsDisplayed) {
      const groupsManagerInstance = keepTrackApi.getGroupsManager();
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

      // All Orbits
      groupsManagerInstance.groupList.debris = groupsManagerInstance.createGroup(GroupType.ALL, '', 'AllSats');
      groupsManagerInstance.selectGroup(groupsManagerInstance.groupList['debris']);
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme, true); // force color recalc
      groupsManagerInstance.groupList.debris.updateOrbits();
      this.settings_.isOrbitOverlayVisible = true;
    }
  }

  update(): void {
    this.validateProjectionMatrix_();

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();

    this.satCalculate();
    keepTrackApi.getMainCamera().update(this.dt);

    // If in satellite view the orbit buffer needs to be updated every time
    if (keepTrackApi.getMainCamera().cameraType == CameraType.SATELLITE && keepTrackApi.getCatalogManager().selectedSat !== -1) {
      keepTrackApi.getOrbitManager().updateOrbitBuffer(catalogManagerInstance.lastSelectedSat());
    }

    const { gmst, j } = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj);
    this.gmst = gmst;

    keepTrackApi.getScene().update(timeManagerInstance.simulationTimeObj, gmst, j);

    this.orbitsAbove(); //this.sensorPos is set here for the Camera Manager

    // cone.update([
    //   <Kilometers>dotsManagerInstance.positionData[catalogManagerInstance.selectedSat * 3],
    //   <Kilometers>dotsManagerInstance.positionData[catalogManagerInstance.selectedSat * 3 + 1],
    //   <Kilometers>dotsManagerInstance.positionData[catalogManagerInstance.selectedSat * 3 + 2],
    // ]);

    keepTrackApi.methods.updateLoop();
  }

  getCurrentViewport(target?: vec4): vec4 {
    const gl = this.gl;
    vec4.set(target ?? vec4.create(), 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    return target;
  }

  getDrawingBufferSize(target?: vec2): vec2 {
    const gl = this.gl;
    vec2.set(target ?? vec2.create(), gl.drawingBufferWidth, gl.drawingBufferHeight);
    return target;
  }

  // eslint-disable-next-line class-methods-use-this
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
    if (!this.projectionMatrix) {
      console.error('projectionMatrix is undefined - retrying');
      this.projectionMatrix = WebGLRenderer.calculatePMatrix(this.gl);
    }

    for (let i = 0; i < 16; i++) {
      if (isNaN(this.projectionMatrix[i])) {
        console.error('projectionMatrix is NaN - retrying');
        this.projectionMatrix = WebGLRenderer.calculatePMatrix(this.gl);
      }
    }

    for (let i = 0; i < 16; i++) {
      if (this.projectionMatrix[i] !== 0) {
        break;
      }
      if (i === 15) {
        console.error('projectionMatrix is all zeros - retrying');
        this.projectionMatrix = WebGLRenderer.calculatePMatrix(this.gl);
      }
    }
  }
}

// DEBUG: Kept for future use
// export const checkIfPostProcessingRequired = (postProcessingManagerOverride?) => {
//   if (postProcessingManagerOverride) drawManager.postProcessingManager = postProcessingManagerOverride;

//   // if (keepTrackApi.getMainCamera().camPitchAccel > 0.0002 || keepTrackApi.getMainCamera().camPitchAccel < -0.0002 || keepTrackApi.getMainCamera().camYawAccel > 0.0002 || keepTrackApi.getMainCamera().camYawAccel < -0.0002) {
//   //   // drawManager.gaussianAmt += this.dt * 2;
//   //   // drawManager.gaussianAmt = Math.min(500, Math.max(drawManager.gaussianAmt, 0));
//   //   drawManager.gaussianAmt = 500;
//   // }

// DEBUG: Kept for future use
//   // if (drawManager.gaussianAmt > 0) {
//   //   drawManager.gaussianAmt -= this.dt * 2;
//   //   drawManager.isNeedPostProcessing = true;
//   drawManager.postProcessingManager.isGaussianNeeded = false;
//   // } else {
//   //   drawManager.postProcessingManager.isGaussianNeeded = false;
//   // }

// DEBUG: Kept for future use
//   // Slight Blur
//   drawManager.postProcessingManager.isFxaaNeeded = false;
//   // Horrible Results
//   drawManager.postProcessingManager.isSmaaNeeded = false;

// DEBUG: Kept for future use
//   if (drawManager.postProcessingManager.isGaussianNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

// DEBUG: Kept for future use
//   if (drawManager.postProcessingManager.isFxaaNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

// DEBUG: Kept for future use
//   if (drawManager.postProcessingManager.isSmaaNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

// DEBUG: Kept for future use
//   // drawManager.postProcessingManager.switchFrameBuffer();
//   drawManager.isNeedPostProcessing = false;
// };
