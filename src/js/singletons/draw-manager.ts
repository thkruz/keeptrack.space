import { keepTrackApi } from '@app/js/keepTrackApi';
import { mat4, vec4 } from 'gl-matrix';
import { GreenwichMeanSiderealTime, Milliseconds } from 'ootk';
import { GetSatType, SatObject } from '../interfaces';
import { getEl } from '../lib/get-el';
import { SpaceObjectType } from '../lib/space-object-type';
import { SelectSatManager } from '../plugins/select-sat-manager/select-sat-manager';
import { StereoMapPlugin } from '../plugins/stereo-map/stereo-map';
import { watchlistPlugin } from '../plugins/watchlist/watchlist';
import { SettingsManager } from '../settings/settings';
import { GlUtils } from '../static/gl-utils';
import { isThisNode } from '../static/isThisNode';
import { SatMath } from '../static/sat-math';
import { Camera, CameraType } from './camera';
import { DotsManager } from './dots-manager';
import { Box as SearchBox } from './draw-manager/cube';
import { Earth } from './draw-manager/earth';
import { lineManagerInstance } from './draw-manager/line-manager';
import { MeshManager } from './draw-manager/mesh-manager';
import { Moon } from './draw-manager/moon';
import { PostProcessingManager } from './draw-manager/post-processing';
import { SkyBoxSphere } from './draw-manager/skybox-sphere';
import { Sun } from './draw-manager/sun';
import { errorManagerInstance } from './errorManager';
import { GroupType } from './object-group';

export interface DrawManager {
  canvas: HTMLCanvasElement;
  demoModeSatellite: any;
  dt: Milliseconds;
  dtAdjusted: Milliseconds;
  gl: WebGL2RenderingContext;
  gmst: GreenwichMeanSiderealTime;
  isDrawOrbitsAbove: boolean;
  isNeedPostProcessing: boolean;
  isPostProcessingResizeNeeded: boolean;
  isShowDistance: boolean;
  isUpdateTimeThrottle: boolean;
  lastSelectedSat: number;
  meshManager: MeshManager;
  pMatrix: mat4;
  pMvCamMatrix: mat4;
  postProcessingManager: PostProcessingManager;
  sat: SatObject;
  sat2: SatObject;
  sceneManager: {
    earth: Earth;
    moon: Moon;
    sun: Sun;
    skybox: SkyBoxSphere;
    searchBox: SearchBox;
  };
  selectSatManager: SelectSatManager;
  sensorPos: { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime };

  clearFrameBuffers(pickFb: WebGLFramebuffer, godFb: WebGLFramebuffer): void;
  draw(dotsManager: DotsManager): void;
  drawOptionalScenery(mainCameraInstance: Camera): void;
  glInit(): Promise<WebGL2RenderingContext>;
  init(settings: SettingsManager): Promise<void>;
  loadHiRes(): Promise<void>;
  loadScene(): Promise<void>;
  orbitsAbove(): void;
  getScreenCoords(sat: SatObject): {
    x: number;
    y: number;
    z: number;
    error: boolean;
  };
  resizeCanvas(): void;
  resizePostProcessingTexture(gl: WebGL2RenderingContext, sun: Sun, postProcessingManagerRef: PostProcessingManager): void;
  satCalculate(): void;
  setCanvasSize(height: number, width: number): void;
  setCursor(cursor: 'default' | 'pointer' | 'grab' | 'grabbing'): void;
  startWithOrbits(): Promise<void>;
  updateLoop(): void;
}

export class StandardDrawManager implements DrawManager {
  private hoverBoxOnSatMiniElements_ = null;
  private isRotationEvent_: boolean;
  private isSatMiniBoxInUse_ = false;
  private labelCount_ = 0;
  private satHoverMiniDOM_: HTMLDivElement;
  private satLabelModeLastTime_ = 0;
  private satMiniBox_: HTMLDivElement;
  private settings_: SettingsManager;

  public canvas: HTMLCanvasElement;
  public demoModeSatellite: any;
  /** The number of milliseconds since the last draw event
   *
   *  Use this for all ui interactions that are agnostic to propagation rate
   */
  public dt: Milliseconds;
  /** The number of milliseconds since the last draw event multiplied by propagation rate
   *
   *  Use this for all time calculations involving position and velocity
   */
  public dtAdjusted: Milliseconds;
  /**
   * Main source of glContext for rest of the application
   */
  public gl: WebGL2RenderingContext;
  public gmst: GreenwichMeanSiderealTime;
  public isDrawOrbitsAbove: boolean;
  public isNeedPostProcessing: boolean;
  public isPostProcessingResizeNeeded: boolean;
  public isShowDistance = false;
  public isUpdateTimeThrottle: boolean;
  public lastSelectedSat: number;
  public meshManager = new MeshManager();
  /**
   * Main source of projection matrix for rest of the application
   */
  public pMatrix: mat4;
  public pMvCamMatrix: mat4;
  public postProcessingManager: PostProcessingManager;
  public sat: SatObject;
  public sat2: SatObject;
  public sceneManager = {
    earth: new Earth(),
    moon: new Moon(),
    sun: new Sun(),
    skybox: new SkyBoxSphere(),
    searchBox: new SearchBox(),
  };

  public selectSatManager = keepTrackApi.getSelectSatManager();
  public sensorPos: { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime };

  public static calculatePMatrix(gl: WebGL2RenderingContext): mat4 {
    const pMatrix = mat4.create();
    mat4.perspective(pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);

    // This converts everything from 3D space to ECI (z and y planes are swapped)
    const eciToOpenGlMat: mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
    mat4.mul(pMatrix, pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat
    return pMatrix;
  }

  public static getCanvasInfo(): { vw: number; vh: number } {
    // Using minimum allows the canvas to be full screen without fighting with scrollbars
    const cw = document.documentElement.clientWidth || 0;
    const iw = window.innerWidth || 0;
    const vw = Math.min.apply(null, [cw, iw].filter(Boolean));
    const vh = Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    return { vw, vh };
  }

  public clearFrameBuffers(pickFb: WebGLFramebuffer, godFb: WebGLFramebuffer): void {
    const gl = this.gl;
    // NOTE: clearColor is set here because two different colors are used. If you set it during
    // frameBuffer init then the wrong color will be applied (this can break gpuPicking)
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Clear all post processing frame buffers
    /* istanbul ignore next */
    if (this.isNeedPostProcessing) {
      this.postProcessingManager.clearAll();
    }
    // Clear the godrays Frame Buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, godFb);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Switch back to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Only needed when doing post processing - otherwise just stay where we are
    // Setup Initial Frame Buffer for Offscreen Drawing
    // gl.bindFramebuffer(gl.FRAMEBUFFER, postProcessingManager.curBuffer);
  }

  private isAltCanvasSize_: boolean = false;

  public draw(dotsManager: DotsManager) {
    // Validation
    if (!this.pMatrix) {
      console.error('pMatrix is undefined - retrying');
      this.pMatrix = StandardDrawManager.calculatePMatrix(this.gl);
    }

    if (keepTrackApi.methods.altCanvasResize()) {
      this.resizeCanvas(true);
      this.isAltCanvasSize_ = true;
    } else if (this.isAltCanvasSize_) {
      this.resizeCanvas(false);
      this.isAltCanvasSize_ = false;
    }

    this.pMvCamMatrix = GlUtils.createPMvCamMatrix(mat4.create(), this.pMatrix, keepTrackApi.getMainCamera().camMatrix);

    // Actually draw things now that math is done
    this.clearFrameBuffers(dotsManager.pickingFrameBuffer, this.sceneManager.sun.godrays.frameBuffer);

    // Sun, and Moon
    this.drawOptionalScenery(keepTrackApi.getMainCamera());

    this.sceneManager.earth.draw(this.pMatrix, this.postProcessingManager.curBuffer, keepTrackApi.callbacks.nightToggle.length > 0 ? keepTrackApi.methods.nightToggle : null);
  }

  public drawOptionalScenery(mainCameraInstance: Camera) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (!settingsManager.isDrawLess) {
      if (this.isPostProcessingResizeNeeded) this.resizePostProcessingTexture(this.gl, this.sceneManager.sun, this.postProcessingManager);

      if (settingsManager.isDrawSun) {
        // Draw the Sun to the Godrays Frame Buffer
        this.sceneManager.sun.draw(this.sceneManager.earth.lightDirection, this.pMatrix, mainCameraInstance.camMatrix, this.sceneManager.sun.godrays.frameBuffer);

        // Draw a black earth and possible black satellite mesh on top of the sun in the godrays frame buffer
        this.sceneManager.earth.drawOcclusion(
          this.pMatrix,
          mainCameraInstance.camMatrix,
          this?.postProcessingManager?.programs?.occlusion,
          this.sceneManager?.sun?.godrays?.frameBuffer
        );
        if (
          !settingsManager.modelsOnSatelliteViewOverride &&
          catalogManagerInstance.selectedSat !== -1 &&
          keepTrackApi.getMainCamera().camDistBuffer <= keepTrackApi.getMainCamera().thresholdForCloseCamera
        ) {
          this.meshManager.drawOcclusion(this.pMatrix, mainCameraInstance.camMatrix, this.postProcessingManager.programs.occlusion, this.sceneManager.sun.godrays.frameBuffer);
        }
        // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
        // todo: this should be a dynamic buffer not hardcoded to bufffer two
        this.postProcessingManager.curBuffer = null;
        this.sceneManager.sun.drawGodrays(this.pMatrix, mainCameraInstance.camMatrix, this.postProcessingManager.curBuffer);
      }

      this.sceneManager.skybox.draw(this.pMatrix, mainCameraInstance.camMatrix, this.postProcessingManager.curBuffer);

      // Apply two pass gaussian blur to the godrays to smooth them out
      // postProcessingManager.programs.gaussian.uniformValues.radius = 2.0;
      // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
      // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
      // postProcessingManager.switchFrameBuffer();
      // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
      // // After second pass apply the results to the canvas
      // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, null);

      // Draw the moon
      if (!settingsManager.isDisableMoon) {
        this.sceneManager.moon.draw(this.sceneManager.sun.drawPosition, this.pMatrix, mainCameraInstance.camMatrix);
      }

      keepTrackApi.methods.drawOptionalScenery();
    }

    this.postProcessingManager.curBuffer = null;
  }

  public async glInit(): Promise<WebGL2RenderingContext> {
    // Ensure the canvas is available
    this.canvas ??= isThisNode() ? <HTMLCanvasElement>(<any>document).canvas : <HTMLCanvasElement>getEl('keeptrack-canvas');

    if (!this.canvas) {
      throw new Error(`The canvas DOM is missing. This could be due to a firewall (ex. Menlo). Contact your LAN Office or System Adminstrator.`);
    }

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    // Try to prevent crashes
    if (this.canvas.addEventListener) {
      this.canvas.addEventListener('webglcontextlost', (e) => {
        console.debug(e);
        e.preventDefault(); // allows the context to be restored
      });
      this.canvas.addEventListener('webglcontextrestored', (e) => {
        console.debug(e);
        this.glInit();
      });
    }

    let gl: WebGL2RenderingContext;
    gl = isThisNode()
      ? global.mocks.glMock
      : this.canvas.getContext('webgl2', {
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

  public async init(settings: SettingsManager): Promise<void> {
    this.settings_ = settings;

    this.satMiniBox_ = <HTMLDivElement>(<unknown>getEl('sat-minibox'));
    keepTrackApi.getHoverManager().init();
    this.startWithOrbits();

    // Reinitialize the canvas on mobile rotation
    window.addEventListener('orientationchange', () => {
      this.isRotationEvent_ = true;
    });

    await this.loadHiRes();
  }

  public async loadHiRes(): Promise<void> {
    this.sceneManager.earth.loadHiRes().catch((error) => {
      errorManagerInstance.error(error, 'loadHiRes');
    });
    this.sceneManager.earth.loadHiResNight().catch((error) => {
      errorManagerInstance.error(error, 'loadHiResNight');
    });
  }

  public async loadScene(): Promise<void> {
    // Make this public
    try {
      // await tools.init();
      await this.sceneManager.earth.init(settingsManager, this.gl);
      keepTrackApi.methods.drawManagerLoadScene();
      await this.sceneManager.sun.init(this.gl);
      if (!settingsManager.isDisableMoon) {
        await this.sceneManager.moon.init(this.gl);
      }
      await this.sceneManager.searchBox.init(this.gl);
      if (!settingsManager.isDisableSkybox) {
        await this.sceneManager.skybox.init(settingsManager, this.gl);
      }
      // await sceneManager.cone.init();
    } catch (error) {
      console.debug(error);
    }
  }

  public orbitsAbove() {
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
          const isAltId = sat.altId;
          if (isAltId) {
            // TODO: Needs to handle nonJSC sats
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

        watchlistPlugin.watchlistList.forEach((satId: number) => {
          sat = catalogManagerInstance.getSat(satId, GetSatType.POSITION_ONLY);
          if (dotsManagerInstance.inViewData[satId] === 0) return;
          const satScreenPositionArray = this.getScreenCoords(sat);
          if (satScreenPositionArray.error) return;
          if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') return;
          if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) return;

          // Draw Sat Labels
          // if (!settingsManager.enableHoverOverlay) continue
          this.satHoverMiniDOM_ = document.createElement('div');
          this.satHoverMiniDOM_.id = 'sat-minibox-' + satId;
          this.satHoverMiniDOM_.textContent = sat.sccNum;

          // Draw Orbits
          if (!settingsManager.isShowSatNameNotOrbit) {
            orbitManagerInstance.addInViewOrbit(satId);
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

  public getScreenCoords(sat: SatObject): {
    x: number;
    y: number;
    z: number;
    error: boolean;
  } {
    const pMatrix = this.pMatrix;
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

  public resizeCanvas(isForcedResize: boolean = false) {
    const gl = this.gl;
    const { vw, vh } = StandardDrawManager.getCanvasInfo();

    // If taking a screenshot then resize no matter what to get high resolution
    if ((!isForcedResize && gl.canvas.width != vw) || gl.canvas.height != vh) {
      // If not autoresizing then don't do anything to the canvas
      if (settingsManager.isAutoResizeCanvas) {
        // If this is a cellphone avoid the keyboard forcing resizes but
        // always resize on rotation
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        // Changes more than 35% of height but not due to rotation are likely the keyboard! Ignore them
        // but make sure we have set this at least once to trigger
        const isKeyboardOut = Math.abs((vw - oldWidth) / oldWidth) < 0.35 && Math.abs((vh - oldHeight) / oldHeight) > 0.35;

        if (!settingsManager.isMobileModeEnabled || isKeyboardOut || this.isRotationEvent_ || !this.pMatrix) {
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

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.pMatrix = StandardDrawManager.calculatePMatrix(gl);
    this.isPostProcessingResizeNeeded = true;

    // Fix the gpu picker texture size if it has already been created
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    if (dotsManagerInstance.isReady) dotsManagerInstance.initProgramPicking();
  }

  public resizePostProcessingTexture(gl: WebGL2RenderingContext, sun: Sun, postProcessingManagerRef: PostProcessingManager): void {
    if (typeof gl === 'undefined' || gl === null) throw new Error('gl is undefined or null');
    if (typeof sun === 'undefined' || sun === null) throw new Error('sun is undefined or null');
    if (typeof postProcessingManagerRef === 'undefined' || postProcessingManagerRef === null) throw new Error('postProcessingManager is undefined or null');

    // Post Processing Texture Needs Scaled
    sun.initGodrays();
    postProcessingManagerRef.init(gl);

    // Reset Flag now that textures are reinitialized
    this.isPostProcessingResizeNeeded = false;
  }

  public satCalculate() {
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

      this.sceneManager.searchBox.update(this.sat, timeManagerInstance.selectedDate);
    } else {
      // Reset the selected satellite if no satellite is selected
      this.sat = <SatObject>{
        id: -1,
        missile: false,
        type: SpaceObjectType.UNKNOWN,
        static: false,
      };

      this.sceneManager.searchBox.update(null);
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

  public setCanvasSize(height: number, width: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setCursor(cursor: 'default' | 'pointer' | 'grab' | 'grabbing') {
    this.canvas.style.cursor = cursor;
  }

  public async startWithOrbits(): Promise<void> {
    if (this.settings_.startWithOrbitsDisplayed) {
      const groupsManagerInstance = keepTrackApi.getGroupsManager();
      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

      // All Orbits
      groupsManagerInstance.groupList['debris'] = groupsManagerInstance.createGroup(GroupType.ALL, '', 'AllSats');
      groupsManagerInstance.selectGroup(groupsManagerInstance.groupList['debris']);
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme, true); // force color recalc
      groupsManagerInstance.groupList['debris'].updateOrbits(orbitManagerInstance);
      this.settings_.isOrbitOverlayVisible = true;
    }
  }

  public updateLoop(): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();

    // Calculate changes related to satellites objects
    this.satCalculate();

    // Calculate camera changes needed since last draw
    keepTrackApi.getMainCamera().update(this.dt);

    // If in satellite view the orbit buffer needs to be updated every time
    if (keepTrackApi.getMainCamera().cameraType == CameraType.SATELLITE && catalogManagerInstance.selectedSat !== -1) {
      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      orbitManagerInstance.updateOrbitBuffer(catalogManagerInstance.lastSelectedSat());
    }

    const { gmst, j } = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj);
    this.gmst = gmst;
    this.sceneManager.sun.update(timeManagerInstance.simulationTimeObj, gmst, j);

    // Update Earth Direction
    this.sceneManager.earth.update(gmst, j);
    this.sceneManager.moon.update(timeManagerInstance.simulationTimeObj, gmst);
    this.sceneManager.skybox.update();

    this.orbitsAbove(); //this.sensorPos is set here for the Camera Manager

    // cone.update([
    //   <Kilometers>dotsManagerInstance.positionData[catalogManagerInstance.selectedSat * 3],
    //   <Kilometers>dotsManagerInstance.positionData[catalogManagerInstance.selectedSat * 3 + 1],
    //   <Kilometers>dotsManagerInstance.positionData[catalogManagerInstance.selectedSat * 3 + 2],
    // ]);

    keepTrackApi.methods.updateLoop();
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
