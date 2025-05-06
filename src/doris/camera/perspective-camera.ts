import { mat4 } from 'gl-matrix';
import { EventBus } from '../events/event-bus';
import { Camera } from './camera';

/**
 * A perspective camera implementation using a perspective projection matrix.
 * Suitable for 3D rendering with depth perception.
 */
export class PerspectiveCamera extends Camera {
  /**
   * Creates a new perspective camera
   *
   * @param fov Field of view in degrees
   * @param near Near clipping plane
   * @param far Far clipping plane
   * @param aspectRatio Aspect ratio (width/height)
   * @param eventBus Optional event bus for listening to events
   */
  constructor(
    public fov: number = 60,
    public near: number = 0.1,
    public far: number = 10000,
    aspectRatio: number,
    eventBus?: EventBus,
  ) {
    super(eventBus);
    this.aspectRatio = aspectRatio ?? 1;
    this.updateProjectionMatrix();
  }

  /**
   * Updates the camera for the current frame
   */
  update(): void {
    if (this.isDirty) {
      this.updateViewMatrix();
    }
  }

  /**
   * Recalculates the projection matrix based on camera parameters
   */
  updateProjectionMatrix(): void {
    mat4.perspective(
      this.projectionMatrix,
      this.fov * (Math.PI / 180), // Convert degrees to radians
      this.aspectRatio,
      this.near,
      this.far,
    );
    this.isDirty = true;
  }

  /**
   * Sets a new field of view and updates the projection matrix
   */
  setFov(fov: number): void {
    if (this.fov === fov) {
      return;
    }
    this.fov = fov;
    this.updateProjectionMatrix();
  }

  /**
   * Sets new near and far clipping planes and updates the projection matrix
   */
  setNearFar(near: number, far: number): void {
    if (this.near === near && this.far === far) {
      return;
    }
    this.near = near;
    this.far = far;
    this.updateProjectionMatrix();
  }
}
