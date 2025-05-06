import { isThisNode } from '@app/doris/utils/isThisNode';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { mat4 } from 'gl-matrix';
import type { SpaceScene as OldScene } from '../../keeptrack/scene/space-scene';
import { Camera } from '../camera/camera';
import { Doris } from '../doris';
import { EventBus } from '../events/event-bus';
import { CanvasEvents, CoreEngineEvents, WebGlEvents } from '../events/event-types';
import { Scene } from '../scene/scene';
import { SceneNode } from '../scene/scene-node';

export class Renderer {
  /** Main source of glContext for rest of the application */
  gl: WebGL2RenderingContext;
  private width: number;
  private height: number;
  /** A canvas where the renderer draws its output. */
  canvas: HTMLCanvasElement;
  projectionCameraMatrix: mat4;
  private isFirstInit = false;

  constructor(
    private readonly eventBus: EventBus,
  ) {
    // Listen for resize events
    this.eventBus.on(CoreEngineEvents.Resize, this.handleResize.bind(this));
    this.eventBus.on(CanvasEvents.BeforeResize, this.handleCanvasBeforeResize.bind(this));
    this.eventBus.on(WebGlEvents.NeedsInit, this.initializeWebGLContext.bind(this));
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.gl = isThisNode()
      ? global.mocks.glMock
      : canvas.getContext('webgl2', {
        alpha: false,
        premultipliedAlpha: false,
        desynchronized: false, // Setting to true causes flickering on mobile devices
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        stencil: false,
      });

    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }

    this.width = canvas.width;
    this.height = canvas.height;

    if (!this.gl) {
      throw new Error('WebGL2 context not initialized');
    }

    // Initialize WebGL context
    this.gl.getExtension('EXT_frag_depth');
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Set up initial viewport
    this.updateViewport();

    Doris.getInstance().emit(WebGlEvents.AfterInit, this.gl);
  }

  render(scene: OldScene): void {
    if (!scene.isInitialized_) {
      return;
    }

    const camera = scene.activeCamera;

    if (!camera) {
      return;
    }

    // Apply the camera matrix
    this.projectionCameraMatrix = mat4.mul(mat4.create(), camera.getProjectionMatrix(), camera.camMatrix);

    Doris.getInstance().emit(CoreEngineEvents.BeforeClearRenderTarget);
    this.clear(this.gl);
    Doris.getInstance().emit(CoreEngineEvents.BeforeRender);
    Doris.getInstance().emit(CoreEngineEvents.Render, scene, camera);
    Doris.getInstance().emit(CoreEngineEvents.AfterRender);
  }

  newRender(scene: Scene | null): void {
    if (!scene) {
      return;
    }

    const camera = scene.activeCamera;

    if (!camera) {
      // return;
    }

    // Apply the camera matrix
    this.projectionCameraMatrix = mat4.mul(mat4.create(), keepTrackApi.getMainCamera().getProjectionMatrix(), keepTrackApi.getMainCamera().camMatrix);

    if (!this.gl) {
      // TODO: Try to reinitialize the context
      throw new Error('WebGL2 context not initialized');
    }

    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Render scene graph
    this.renderNode(scene.root, camera!);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private renderNode(_node: SceneNode, _camera: Camera): void {
    // _node.render(null);
  }

  private handleResize(): void {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.updateViewport();
  }

  private updateViewport(): void {
    if (!this.gl) {
      throw new Error('WebGL2 context not initialized');
    }

    this.gl.viewport(0, 0, this.width, this.height);
  }

  getContext(): WebGL2RenderingContext | null {
    return this.gl;
  }

  clear(gl: WebGL2RenderingContext): void {
    // Switch back to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  initializeWebGLContext(domElement?: HTMLCanvasElement): WebGL2RenderingContext {
    // Ensure the canvas is available
    this.canvas ??= domElement ?? getEl('canvas') as HTMLCanvasElement;

    if (!this.canvas) {
      throw new Error('The canvas DOM is missing. This could be due to a firewall (ex. Menlo). Contact your LAN Office or System Adminstrator.');
    }

    // Try to prevent crashes
    if (this.canvas?.addEventListener) {
      this.canvas.addEventListener('webglcontextlost', this.onContextLost_.bind(this));
      this.canvas.addEventListener('webglcontextrestored', this.onContextRestore_.bind(this));
    }

    const gl: WebGL2RenderingContext = isThisNode()
      ? global.mocks.glMock
      : this.canvas.getContext('webgl2', {
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

    gl.getExtension('EXT_frag_depth');
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (!this.isFirstInit) {
      this.isFirstInit = true;
      Doris.getInstance().emit(WebGlEvents.AfterFirstInit, gl);
    } else {
      Doris.getInstance().emit(WebGlEvents.AfterInit, gl);
    }

    return gl;
  }

  handleCanvasBeforeResize(): void {
    const gl = this.gl;

    if (!gl) {
      return;
    }

    if (!gl.canvas) {
      // We lost the canvas - try to get it again
      this.initializeWebGLContext();
    }
  }

  setCursor(cursor: 'default' | 'pointer' | 'grab' | 'grabbing') {
    this.canvas.style.cursor = cursor;
  }

  private resetGLState_(gl: WebGL2RenderingContext) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  private onContextLost_(e: WebGLContextEvent) {
    e.preventDefault(); // allows the context to be restored
    errorManagerInstance.info('WebGL Context Lost');
    this.eventBus.emit(WebGlEvents.ContextLost);
  }

  private onContextRestore_() {
    if (this.gl) {
      errorManagerInstance.info('WebGL Context Restored');
      this.resetGLState_(this.gl);
      this.eventBus.emit(WebGlEvents.ContextRestored, this.gl);
    }
  }
}
