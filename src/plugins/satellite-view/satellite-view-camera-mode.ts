import { EventBus } from '@app/doris/events/event-bus';
import { FirstPersonCameraController } from '@app/keeptrack/camera/controllers/first-person-camera-controller';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4, quat, vec3 } from 'gl-matrix';
import { DEG2RAD } from 'ootk';
import { CameraControllerType, KeepTrackMainCamera } from '../../keeptrack/camera/legacy-camera';

export class SatelliteViewCameraMode extends FirstPersonCameraController {
  isInitialized_ = false;
  camera: KeepTrackMainCamera;

  constructor(camera: KeepTrackMainCamera, eventBus: EventBus) {
    super(camera, eventBus);
    this.camera = camera;
  }

  initialize(): void {
    if (this.isInitialized_) {
      return;
    }
    this.camera.switchCameraController(CameraControllerType.SATELLITE_FIRST_PERSON);
    this.isInitialized_ = true;
  }

  updateInternal(): void {
    // No update logic needed for this camera mode
  }

  renderInternal(): void {
    const target = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

    if ((target?.id ?? -1) === -1) {
      this.camera.switchCameraController();
      this.camera.draw();

      return;
    }

    const targetPositionTemp = vec3.fromValues(-target!.position.x, -target!.position.y, -target!.position.z);
    const viewMatrix = this.camera.getViewMatrix();

    mat4.translate(viewMatrix, viewMatrix, targetPositionTemp);
    vec3.normalize(this.camera.normalizedCameraUp, targetPositionTemp);
    vec3.normalize(this.camera.normalizedCameraForward, [target!.velocity.x, target!.velocity.y, target!.velocity.z]);
    vec3.transformQuat(
      this.camera.normalizedCameraLeft,
      this.camera.normalizedCameraUp,
      quat.fromValues(this.camera.normalizedCameraForward[0], this.camera.normalizedCameraForward[1], this.camera.normalizedCameraForward[2], 90 * DEG2RAD),
    );

    const targetNextPosition = vec3.fromValues(
      target!.position.x + target!.velocity.x,
      target!.position.y + target!.velocity.y,
      target!.position.z + target!.velocity.z,
    );

    mat4.lookAt(viewMatrix, targetNextPosition, targetPositionTemp, this.camera.normalizedCameraUp);

    mat4.translate(viewMatrix, viewMatrix, [target!.position.x, target!.position.y, target!.position.z]);

    mat4.rotate(viewMatrix, viewMatrix, this.camera.fpsPitch * DEG2RAD, this.camera.normalizedCameraLeft);
    mat4.rotate(viewMatrix, viewMatrix, -this.camera.fpsYaw * DEG2RAD, this.camera.normalizedCameraUp);

    mat4.translate(viewMatrix, viewMatrix, targetPositionTemp);
  }
}
