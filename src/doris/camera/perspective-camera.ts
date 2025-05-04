import { mat4 } from 'gl-matrix';
import { EventBus } from '../events/event-bus';
import { Camera } from './camera';

export class PerspectiveCamera extends Camera {
  constructor(
    public fov: number = 60,
    public near: number = 0.1,
    public far: number = 10000,
    public aspectRatio: number = 1,
    eventBus?: EventBus,
  ) {
    super(eventBus);
  }

  update(): void {
    // Update the view matrix based on the camera's position and orientation
    this.updateViewMatrix();
  }

  updateProjectionMatrix(): void {
    mat4.perspective(
      this.projectionMatrix,
      this.fov * (Math.PI / 180),
      this.aspectRatio,
      this.near,
      this.far,
    );
  }

  // Additional methods specific to perspective cameras
  setFov(fov: number): void {
    this.fov = fov;
    this.updateProjectionMatrix();
  }

  setNearFar(near: number, far: number): void {
    this.near = near;
    this.far = far;
    this.updateProjectionMatrix();
  }
}
