import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4 } from 'gl-matrix';
import { CameraType, LegacyCamera } from '../legacy-camera';
import { CameraMode } from './camera-mode';

export class FixedToEarthOffsetCameraMode extends CameraMode {
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

    const target = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

    if ((target?.id ?? -1) > -1) {
      this.camera.cameraType = CameraType.FIXED_TO_SAT;
      this.camera.activeCameraMode = this.camera.cameraModes.get(CameraType.FIXED_TO_SAT) as CameraMode;
      this.camera.activeCameraMode.render();

      return;
    }

    // Rotate the camera
    mat4.rotateX(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.pitch);
    mat4.rotateY(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.roll);
    mat4.rotateZ(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.yaw);
    // Adjust for panning
    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [this.camera.panCurrent.x, this.camera.panCurrent.y, this.camera.panCurrent.z]);
    // Back away from the earth
    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [settingsManager.offsetCameraModeX, this.camera.getCameraDistance(), settingsManager.offsetCameraModeZ]);
    // Adjust for FPS style rotation
    mat4.rotateX(this.camera.camMatrix, this.camera.camMatrix, this.camera.earthCenteredPitch);
    mat4.rotateZ(this.camera.camMatrix, this.camera.camMatrix, -this.camera.earthCenteredYaw);
  }
}
