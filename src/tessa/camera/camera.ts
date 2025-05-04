import { mat4, vec3 } from 'gl-matrix';
import { Component } from '../components/component';
import { EventBus } from '../events/event-bus';
import { CoreEngineEvents } from '../events/event-types';


export abstract class Camera extends Component {
  static readonly type = 'Camera';

  protected projectionMatrix = mat4.create();
  protected viewMatrix = mat4.create();
  protected aspectRatio = 1.0; // Default

  constructor(protected eventBus?: EventBus) {
    super();
    this.type = Camera.type;

    // Subscribe to resize events if we have an event bus
    if (this.eventBus) {
      this.eventBus.on(CoreEngineEvents.Resize, this.handleResize.bind(this));
    }
  }

  // This will be called by the engine when the camera is registered
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.eventBus.on(CoreEngineEvents.Resize, this.handleResize.bind(this));
  }

  private handleResize(width: number, height: number): void {
    this.aspectRatio = width / height;
    this.updateProjectionMatrix();
  }

  abstract updateProjectionMatrix(): void;

  updateViewMatrix(): void {
    // Update based on the transform of the node
    const position = this.node.transform.worldPosition;
    const rotation = this.node.transform.worldRotation;

    // Create view matrix based on position and rotation
    mat4.identity(this.viewMatrix);
    /*
     * Apply rotation and translation
     * This is a simplified example - actual implementation would be more complex
     */
    const rotationMatrix = mat4.create();

    mat4.fromQuat(rotationMatrix, rotation);

    mat4.multiply(this.viewMatrix, this.viewMatrix, rotationMatrix);
    mat4.translate(this.viewMatrix, this.viewMatrix, vec3.scale(vec3.create(), position, -1));
  }

  getViewMatrix(): mat4 {
    this.updateViewMatrix();

    return this.viewMatrix;
  }

  getProjectionMatrix(): mat4 {
    return this.projectionMatrix;
  }

  // Called when component is attached
  protected onAttach(): void {
    super.onAttach();
    // Trigger an initial update
    this.updateProjectionMatrix();
    this.updateViewMatrix();
  }
}
