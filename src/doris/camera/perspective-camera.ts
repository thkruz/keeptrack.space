import { mat4 } from 'gl-matrix';
import { Milliseconds } from 'ootk';
import { EventBus } from '../events/event-bus';
import { Camera } from './camera';

/**
 * A perspective camera implementation using a perspective projection matrix.
 * Suitable for 3D rendering with depth perception.
 */
export abstract class PerspectiveCamera extends Camera {
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
  update(deltaTime: Milliseconds): void {
    if (this.isDirty) {
      this.updateViewMatrix();
    }

    this.onUpdate?.(deltaTime);
  }

  abstract onUpdate?(deltaTime: Milliseconds): void;

  /**
   * Recalculates the projection matrix based on camera parameters
   */
  updateProjectionMatrix(): void {
    mat4.perspective(
      this.projectionMatrix,
      this.fov, // radians
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
    if (this.fov > 1.2) {
      this.fov = 0.04;
    }
    if (this.fov < 0.01) {
      this.fov = 0.01;
    }
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
