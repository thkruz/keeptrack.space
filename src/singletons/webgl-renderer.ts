import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { CoreEngineEvents } from '@app/tessa/events/event-types';
import { Tessa } from '@app/tessa/tessa';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { BaseObject } from 'ootk';
import { getEl } from '../lib/get-el';
import { isThisNode } from '../static/isThisNode';
import { Camera } from './camera';
import { MeshManager } from './draw-manager/mesh-manager';
import { PostProcessingManager } from './draw-manager/post-processing';
import { errorManagerInstance } from './errorManager';
import { GroupType } from './object-group';
import { Scene } from './scene';

export class WebGLRenderer {
  static readonly id = 'webgl-renderer';
  private isRotationEvent_: boolean;
  private isContextLost_ = false;

  /** A canvas where the renderer draws its output. */
  domElement: HTMLCanvasElement;
  /**
   * Main source of glContext for rest of the application
   */
  gl: WebGL2RenderingContext;
  isPostProcessingResizeNeeded: boolean;
  isUpdateTimeThrottle: boolean;
  meshManager = new MeshManager();
  /**
   * Main source of projection matrix for rest of the application
   */
  projectionMatrix: mat4;
  projectionCameraMatrix: mat4;
  postProcessingManager: PostProcessingManager;

  lastResizeTime: number;

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
    const cw = keepTrackApi.containerRoot?.clientWidth ?? document.documentElement.clientWidth ?? 0;
    const iw = window.innerWidth || 0;
    const vw = Math.min.apply(null, [cw, iw].filter(Boolean));
    const vh = Math.min(keepTrackApi.containerRoot?.clientHeight ?? document.documentElement.clientHeight ?? 0, window.innerHeight ?? 0);

    return { vw, vh };
  }

  private isAltCanvasSize_ = false;

  render(scene: Scene, camera: Camera): void {
    if (this.isContextLost_) {
      return;
    }

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

  glInit(domElement?: HTMLCanvasElement): WebGL2RenderingContext {
    // Ensure the canvas is available
    this.domElement ??= domElement ?? getEl('canvas') as HTMLCanvasElement;

    if (!this.domElement) {
      throw new Error('The canvas DOM is missing. This could be due to a firewall (ex. Menlo). Contact your LAN Office or System Adminstrator.');
    }

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
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.postProcessingManager = new PostProcessingManager();
    this.postProcessingManager.init(gl);

    return gl;
  }

  init(): void {
    this.startWithOrbits();

    // Reinitialize the canvas on mobile rotation
    window.addEventListener('orientationchange', () => {
      this.isRotationEvent_ = true;
    });

    Tessa.getInstance().on(CoreEngineEvents.BeforeUpdate, this.update.bind(this));

    Tessa.getInstance().on(CoreEngineEvents.Render, () => {
      this.render(keepTrackApi.getScene(), keepTrackApi.getMainCamera());
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.resize,
      cbName: WebGLRenderer.id,
      cb: () => {
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
    });
  }

  getScreenCoords(obj: BaseObject): {
    x: number;
    y: number;
    z: number;
    error: boolean;
  } {
    const pMatrix = this.projectionMatrix;
    const camMatrix = keepTrackApi.getMainCamera().camMatrix;
    const screenPos = { x: 0, y: 0, z: 0, error: false };

    try {
      const pos = obj.position;

      if (!pos) {
        throw new Error(`No Position for Sat ${obj.id}`);
      }

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

    if (dotsManagerInstance.isReady) {
      dotsManagerInstance.initProgramPicking();
    }

    // Fix flat geometry if it has already been created
    keepTrackApi.getScene().godrays?.init(gl, keepTrackApi.getScene().sun);
  }

  setCanvasSize(height: number, width: number) {
    this.domElement.width = width;
    this.domElement.height = height;
  }

  setCursor(cursor: 'default' | 'pointer' | 'grab' | 'grabbing') {
    this.domElement.style.cursor = cursor;
  }

  startWithOrbits(): void {
    if (settingsManager.startWithOrbitsDisplayed) {
      const groupsManagerInstance = keepTrackApi.getGroupsManager();

      // All Orbits
      groupsManagerInstance.groupList.debris = groupsManagerInstance.createGroup(GroupType.ALL, '', 'AllSats');
      groupsManagerInstance.selectGroup(groupsManagerInstance.groupList.debris);
      keepTrackApi.getColorSchemeManager().calculateColorBuffers(true); // force color recalc
      groupsManagerInstance.groupList.debris.updateOrbits();
      settingsManager.isOrbitOverlayVisible = true;
    }
  }

  /**
   * @updateLoop
   */
  update(): void {
    if (!this.projectionMatrix) {
      errorManagerInstance.log('projectionMatrix is undefined - retrying');
      this.projectionMatrix = WebGLRenderer.calculatePMatrix(this.gl);
    }

    for (let i = 0; i < 16; i++) {
      if (isNaN(this.projectionMatrix[i])) {
        errorManagerInstance.log('projectionMatrix is NaN - retrying');
        this.projectionMatrix = WebGLRenderer.calculatePMatrix(this.gl);
      }
    }

    for (let i = 0; i < 16; i++) {
      if (this.projectionMatrix[i] !== 0) {
        break;
      }
      if (i === 15) {
        errorManagerInstance.log('projectionMatrix is all zeros - retrying');
        this.projectionMatrix = WebGLRenderer.calculatePMatrix(this.gl);
      }
    }
  }

  /**
   * @unused
   */
  getCurrentViewport(target = vec4.create()): vec4 {
    const gl = this.gl;

    vec4.set(target, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return target;
  }

  /**
   * @unused
   */
  getDrawingBufferSize(target = vec2.create()): vec2 {
    const gl = this.gl;

    vec2.set(target, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return target;
  }

  /**
   * @unused
   */
  static getPixelRatio(): number {
    return window.devicePixelRatio;
  }

  /**
   * @unused
   */
  getActiveMipmapLevel(): number {
    const gl = this.gl;
    const activeTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const activeTextureLevel = gl.getTexParameter(activeTexture, gl.TEXTURE_MAX_LEVEL);


    return activeTextureLevel;
  }

  /**
   * @unused
   */
  getContext(): WebGL2RenderingContext {
    return this.gl;
  }
}
