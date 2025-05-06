import { mat4, vec3 } from 'gl-matrix';
import { Component } from '../components/component';
import { EventBus } from '../events/event-bus';
import { CoreEngineEvents } from '../events/event-types';

/**
 * Base abstract camera class representing any camera in the 3D scene.
 * Contains common functionality for all camera types.
 */
export abstract class Camera extends Component {
  static readonly type = 'Camera';

  protected projectionMatrix = mat4.create();
  protected viewMatrix = mat4.create();
  protected aspectRatio = 1.0;
  protected isDirty = true;

  constructor(protected eventBus?: EventBus) {
    super();
    this.type = Camera.type;

    if (this.eventBus) {
      this.eventBus.on(CoreEngineEvents.Resize, this.handleResize.bind(this));
    }
  }

  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.eventBus.on(CoreEngineEvents.Resize, this.handleResize.bind(this));
  }

  protected handleResize(width: number, height: number): void {
    this.aspectRatio = width / height;
    this.updateProjectionMatrix();
    this.isDirty = true;
  }

  abstract updateProjectionMatrix(): void;

  updateViewMatrix(): void {
    if (!this.isDirty) { // !this.node
      return;
    }

    const position = this.node.transform.worldPosition;
    const rotation = this.node.transform.worldRotation;

    mat4.identity(this.viewMatrix);
    const rotationMatrix = mat4.create();

    mat4.fromQuat(rotationMatrix, rotation);
    mat4.multiply(this.viewMatrix, this.viewMatrix, rotationMatrix);
    mat4.translate(this.viewMatrix, this.viewMatrix, vec3.scale(vec3.create(), position, -1));

    this.isDirty = false;
  }

  getViewMatrix(): mat4 {
    this.updateViewMatrix();

    return this.viewMatrix;
  }

  getProjectionMatrix(): mat4 {
    return this.projectionMatrix;
  }

  /**
   * Marks the camera as needing to update its matrices on the next frame
   */
  markDirty(): void {
    this.isDirty = true;
  }

  checkIfDirty(): boolean {
    return this.isDirty;
  }

  protected onAttach(): void {
    super.onAttach();
    this.updateProjectionMatrix();
    this.updateViewMatrix();
  }
}
