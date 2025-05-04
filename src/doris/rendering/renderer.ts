import { Camera } from '../camera/camera';
import { EventBus } from '../events/event-bus';
import { CoreEngineEvents } from '../events/event-types';
import { Scene } from '../scene/scene';
import { SceneNode } from '../scene/scene-node';

export class Renderer {
  private gl: WebGL2RenderingContext | null;
  private width: number;
  private height: number;
  private canvas: HTMLCanvasElement;

  constructor(
    private readonly eventBus: EventBus,
  ) {
    // Listen for resize events
    this.eventBus.on(CoreEngineEvents.Resize, this.handleResize.bind(this));
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      alpha: false,
      premultipliedAlpha: false,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
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
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Set up initial viewport
    this.updateViewport();
  }

  render(scene: Scene | null): void {
    if (!scene) {
      return;
    }

    const camera = scene.activeCamera;

    if (!camera) {
      return;
    }

    if (!this.gl) {
      // TODO: Try to reinitialize the context
      throw new Error('WebGL2 context not initialized');
    }

    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Render scene graph
    this.renderNode(scene.root, camera);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private renderNode(_node: SceneNode, _camera: Camera): void {
    // TODO: Implement rendering logic for the node
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
}
