import { EventBus } from '@app/doris/events/event-bus';
import { ToastMsgType } from '@app/interfaces';
import { FirstPersonCameraController } from '@app/keeptrack/camera/controllers/first-person-camera-controller';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4, quat, vec3 } from 'gl-matrix';
import { BaseObject, DEG2RAD, Milliseconds } from 'ootk';
import { CameraControllerType, KeepTrackMainCamera } from '../../keeptrack/camera/legacy-camera';

export class SatelliteViewCameraController extends FirstPersonCameraController {
  isInitialized_ = false;
  targetObject_: BaseObject | null = null;
  camera: KeepTrackMainCamera;
  normalizedZenith: vec3 = vec3.create();
  normalizedNadir: vec3 = vec3.create();
  normalizedCameraLeft: vec3 = vec3.create();

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

  protected onActivate(): void {
    super.onActivate?.();
    if (this.onValidate()) {
      keepTrackApi.getUiManager().toast('Camera Mode: Satellite Orbital', ToastMsgType.normal);
    }
  }

  protected onValidate(): boolean {
    this.targetObject_ = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj ?? null;
    if ((this.targetObject_?.id ?? -1) === -1) {
      return false;
    }

    return true;
  }

  protected updateInternal(delta: number): void {
    super.updateInternal?.(delta);
    if (!this.onValidate()) {
      this.camera.switchCameraController(CameraControllerType.EARTH_CENTERED_ORBITAL);
      this.camera.update(delta as Milliseconds); // Tell the camera to update its new controller
    }
  }

  renderInternal(): void {
    const targetPositionTemp = vec3.fromValues(-this.targetObject_!.position.x, -this.targetObject_!.position.y, -this.targetObject_!.position.z);
    const viewMatrix = this.camera.getViewMatrix();

    mat4.translate(viewMatrix, viewMatrix, targetPositionTemp);
    vec3.normalize(this.normalizedZenith, targetPositionTemp);
    vec3.normalize(this.normalizedNadir, [this.targetObject_!.velocity.x, this.targetObject_!.velocity.y, this.targetObject_!.velocity.z]);
    vec3.transformQuat(
      this.normalizedCameraLeft,
      this.normalizedZenith,
      quat.fromValues(this.normalizedNadir[0], this.normalizedNadir[1], this.normalizedNadir[2], 90 * DEG2RAD),
    );

    const targetNextPosition = vec3.fromValues(
      this.targetObject_!.position.x + this.targetObject_!.velocity.x,
      this.targetObject_!.position.y + this.targetObject_!.velocity.y,
      this.targetObject_!.position.z + this.targetObject_!.velocity.z,
    );

    mat4.lookAt(viewMatrix, targetNextPosition, targetPositionTemp, this.normalizedZenith);

    mat4.translate(viewMatrix, viewMatrix, [this.targetObject_!.position.x, this.targetObject_!.position.y, this.targetObject_!.position.z]);

    mat4.rotate(viewMatrix, viewMatrix, this.pitch_ * DEG2RAD, this.normalizedCameraLeft);
    mat4.rotate(viewMatrix, viewMatrix, -this.yaw_ * DEG2RAD, this.normalizedZenith);

    mat4.translate(viewMatrix, viewMatrix, targetPositionTemp);
  }
}
