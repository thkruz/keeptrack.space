import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4 } from 'gl-matrix';
import { CameraType, LegacyCamera } from '../legacy-camera';
import { CameraMode } from './camera-mode';

export class FixedToEarthCameraMode extends CameraMode {
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

    // 4. Rotate the camera around the new local origin
    mat4.rotateX(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.pitch);
    mat4.rotateY(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.roll);
    mat4.rotateZ(this.camera.camMatrix, this.camera.camMatrix, -this.camera.localRotateCurrent.yaw);

    // 3. Adjust for panning
    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [this.camera.panCurrent.x, this.camera.panCurrent.y, this.camera.panCurrent.z]);

    // 2. Back away from the earth in the Y direction (depth)
    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [0, this.camera.getCameraDistance(), 0]);
    // 1. Rotate around the earth (0,0,0)
    mat4.rotateX(this.camera.camMatrix, this.camera.camMatrix, this.camera.earthCenteredPitch);
    mat4.rotateZ(this.camera.camMatrix, this.camera.camMatrix, -this.camera.earthCenteredYaw);
  }
}
