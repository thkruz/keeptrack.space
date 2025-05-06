import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4, quat, vec3 } from 'gl-matrix';
import { DEG2RAD } from 'ootk';
import { CameraMode } from '../../keeptrack/camera/camera-modes/camera-mode';
import { CameraType, LegacyCamera } from '../../keeptrack/camera/legacy-camera';

export class SatelliteViewCameraMode extends CameraMode {
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

    if (!target) {
      this.camera.cameraType = CameraType.FIXED_TO_EARTH;
      this.camera.activeCameraMode = this.camera.cameraModes.get(CameraType.FIXED_TO_EARTH) as CameraMode;
      this.camera.activeCameraMode.render();

      return;
    }

    const targetPositionTemp = vec3.fromValues(-target.position.x, -target.position.y, -target.position.z);

    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, targetPositionTemp);
    vec3.normalize(this.camera.normUp, targetPositionTemp);
    vec3.normalize(this.camera.normForward, [target.velocity.x, target.velocity.y, target.velocity.z]);
    vec3.transformQuat(this.camera.normLeft, this.camera.normUp, quat.fromValues(this.camera.normForward[0], this.camera.normForward[1], this.camera.normForward[2], 90 * DEG2RAD));
    const targetNextPosition = vec3.fromValues(
      target.position.x + target.velocity.x,
      target.position.y + target.velocity.y,
      target.position.z + target.velocity.z,
    );

    mat4.lookAt(this.camera.camMatrix, targetNextPosition, targetPositionTemp, this.camera.normUp);

    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, [target.position.x, target.position.y, target.position.z]);

    mat4.rotate(this.camera.camMatrix, this.camera.camMatrix, this.camera.fpsPitch * DEG2RAD, this.camera.normLeft);
    mat4.rotate(this.camera.camMatrix, this.camera.camMatrix, -this.camera.fpsYaw * DEG2RAD, this.camera.normUp);

    mat4.translate(this.camera.camMatrix, this.camera.camMatrix, targetPositionTemp);
  }
}
