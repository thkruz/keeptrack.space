import { LegacyCamera } from '../legacy-camera';

export class CameraMode {
  camera: LegacyCamera;
  isInitialized_ = false;

  constructor(camera: LegacyCamera) {
    this.camera = camera;
  }

  initialize(): void {
    if (this.isInitialized_) {
      return;
    }
    this.isInitialized_ = true;
  }

  render(): void {
    if (!this.isInitialized_) {
      this.initialize();
    }
  }
}
