import { mat4 } from 'gl-matrix';
import { DEG2RAD } from 'ootk';
import { LegacyCamera } from '../legacy-camera';
import { CameraMode } from './camera-mode';

export class FirstPersonCameraMode extends CameraMode {
  isInitialized_ = false;

  constructor(camera: LegacyCamera) {
    super(camera);
  }

  initialize(): void {
    if (this.isInitialized_) {
      return;
    }
    this.camera.setCameraMode(this);
    this.isInitialized_ = true;
  }

  update(): void {
    // No update logic needed for this camera mode
  }

  render(): void {
    if (!this.isInitialized_) {
      this.initialize();
    }

    // Rotate the camera
    mat4.rotate(this.camera.camMatrix, this.camera.camMatrix, -this.camera.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.camera.camMatrix, this.camera.camMatrix, this.camera.fpsYaw * DEG2RAD, [0, 0, 1]);
    // Move the camera to the FPS position
    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [this.camera.fpsPos[0], this.camera.fpsPos[1], -this.camera.fpsPos[2]]);
  }
}
