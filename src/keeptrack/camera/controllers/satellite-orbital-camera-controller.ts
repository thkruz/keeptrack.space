import { OrbitalController, OrbitalControllerParams } from '@app/doris/camera/controllers/orbital-controller';
import { EventBus } from '@app/doris/events/event-bus';
import { InputEvents } from '@app/doris/events/event-types';
import { keepTrackApi } from '@app/keepTrackApi';
import { ZOOM_EXP } from '@app/lib/constants';
import { alt2zoom, normalizeAngle } from '@app/lib/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatMath } from '@app/static/sat-math';
import { mat4, vec3 } from 'gl-matrix';
import { BaseObject, EciVec3, Kilometers, RADIUS_OF_EARTH, Radians, TAU } from 'ootk';
import { KeepTrackMainCamera } from '../legacy-camera';

export interface SatelliteCameraControllerParams extends OrbitalControllerParams {
  isMomentumEnabled?: boolean;
}

export class SatelliteOrbitalCameraController extends OrbitalController {
  distanceBuffer = 2;
  protected camera: KeepTrackMainCamera;

  constructor(camera: KeepTrackMainCamera, eventBus: EventBus, params?: SatelliteCameraControllerParams) {
    super(camera, eventBus, params);

    this.isMomentumEnabled_ = params?.isMomentumEnabled ?? true;
  }

  protected updateInternal(dt: number): void {
    if (this.isAutoRotateEnabled_) {
      this.updateAutoRotate(dt);
    } else if (this.isAutoPitchYawToTarget_) {
      this.autoMovement(dt);
      this.updateCameraZoom_(dt);
    } else {
      this.adjustCameraMomentum_(dt);
      this.updateCameraRotation_(dt);
      this.updateCameraZoom_(dt);
    }
  }

  protected updateAutoRotate(dt: number): void {
    // Example: auto-rotate around the satellite (yaw)
    if (settingsManager.isAutoRotateL) {
      this.yaw_ -= settingsManager.autoRotateSpeed * dt;
    }
    if (settingsManager.isAutoRotateR) {
      this.yaw_ += settingsManager.autoRotateSpeed * dt;
    }
    if (settingsManager.isAutoRotateU) {
      this.pitch_ += (settingsManager.autoRotateSpeed / 2) * dt;
    }
    if (settingsManager.isAutoRotateD) {
      this.pitch_ -= (settingsManager.autoRotateSpeed / 2) * dt;
    }
  }

  protected autoMovement(dt: number): void {
    // Move pitch/yaw to target values
    const pitchDiff = normalizeAngle((this.pitch_ - this.pitchTarget_) as Radians);
    const yawDiff = normalizeAngle((this.yaw_ - this.yawTarget_) as Radians);
    const pitchSpeed = Math.abs(pitchDiff) > 0.0001 ? pitchDiff * dt * settingsManager.cameraMovementSpeed : 0;
    const yawSpeed = Math.abs(yawDiff) > 0.0001 ? yawDiff * dt * settingsManager.cameraMovementSpeed : 0;

    this.pitch_ -= pitchSpeed;
    this.yaw_ -= yawSpeed;
    if (this.pitch_ > Math.PI / 2) {
      this.pitch_ = Math.PI / 2;
    }
    if (this.pitch_ < -Math.PI / 2) {
      this.pitch_ = -Math.PI / 2;
    }
    if (Math.abs(pitchDiff) < 0.0001 && Math.abs(yawDiff) < 0.0001) {
      this.isAutoPitchYawToTarget_ = false;
    }
  }

  getCameraRadius(target?: EciVec3) {
    let targetDistanceFromEarth = 0;

    if (target) {
      const { gmst } = SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj);
      const altitude = SatMath.getAlt(target, gmst);

      targetDistanceFromEarth = altitude + RADIUS_OF_EARTH;
    }
    const radius = this.getCameraDistance() - targetDistanceFromEarth;


    return radius;
  }

  getCameraDistance(zoomLevel?: number): Kilometers {
    return <Kilometers>((zoomLevel ?? this.zoom_) ** ZOOM_EXP * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance);
  }

  protected renderInternal(camera: KeepTrackMainCamera): void {
    const target = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

    if ((target?.id ?? -1) === -1) {
      this.camera.switchCameraController();
      this.camera.draw();

      return;
    }

    const gmst = SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj).gmst;
    const satAlt = SatMath.getAlt(target!.position, gmst);

    if (camera.getCameraDistance() < satAlt + RADIUS_OF_EARTH + settingsManager.minDistanceFromSatellite) {
      this.zoomTarget_ = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);
      this.zoom_ = this.zoomTarget_;
    }

    const viewMatrix = camera.getViewMatrix();
    const targetPosition = vec3.fromValues(-target!.position?.x, -target!.position?.y, -target!.position?.z);

    /*
     * mat4 commands are run in reverse order
     * 1. Move to the satellite position
     * 2. Twist the camera around Z-axis
     * 3. Pitch the camera around X-axis (this may have moved because of the Z-axis rotation)
     * 4. Back away from the satellite
     * 5. Adjust for panning
     * 6. Rotate the camera FPS style
     */
    mat4.rotateX(viewMatrix, viewMatrix, -camera.localRotateCurrent.pitch);
    mat4.rotateY(viewMatrix, viewMatrix, -camera.localRotateCurrent.roll);
    mat4.rotateZ(viewMatrix, viewMatrix, -camera.localRotateCurrent.yaw);

    mat4.translate(viewMatrix, viewMatrix, [camera.panCurrent.x, camera.panCurrent.y, camera.panCurrent.z]);

    mat4.translate(viewMatrix, viewMatrix, [0, this.camera.getCameraRadius(target!.position), 0]);

    mat4.rotateX(viewMatrix, viewMatrix, this.camera.ftsPitch);
    mat4.rotateZ(viewMatrix, viewMatrix, -this.camera.ftsYaw);

    mat4.translate(viewMatrix, viewMatrix, targetPosition);
  }

  protected registerInputEvents(): void {
    this.eventBus.on(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.on(InputEvents.MouseMove, this.handleMouseMove.bind(this));
    this.eventBus.on(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.on(InputEvents.MouseWheel, this.handleMouseWheel.bind(this));
    this.eventBus.on(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.on(InputEvents.KeyUp, this.handleKeyUp.bind(this));
  }

  protected unregisterInputEvents(): void {
    this.eventBus.removeListener(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.removeListener(InputEvents.MouseMove, this.handleMouseMove.bind(this));
    this.eventBus.removeListener(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.removeListener(InputEvents.MouseWheel, this.handleMouseWheel.bind(this));
    this.eventBus.removeListener(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.removeListener(InputEvents.KeyUp, this.handleKeyUp.bind(this));
  }

  protected onActivate(): void {
    // throw new Error('Method not implemented.');
  }
  protected onDeactivate(): void {
    // throw new Error('Method not implemented.');
  }

  private handleMouseDown(_event: MouseEvent, x: number, y: number, button: number): void {
    if (button === 0) {
      this.isDragging_ = true;
      this.dragStartPosition_ = { x, y };
      this.dragStartPitch_ = this.pitch_;
      this.dragStartYaw_ = this.yaw_;
      this.disableAutoRotation();
    }
  }

  private handleMouseMove(_event: MouseEvent, x: number, y: number): void {
    if (this.isDragging_) {
      const xDif = this.dragStartPosition_.x - x;
      const yDif = this.dragStartPosition_.y - y;
      const yawTarget = this.dragStartYaw_ + xDif * settingsManager.cameraMovementSpeed;
      const pitchTarget = this.dragStartPitch_ + yDif * -settingsManager.cameraMovementSpeed;

      if (this.isMomentumEnabled_) {
        this.pitchSpeed_ = normalizeAngle((this.pitch_ - pitchTarget) as Radians) * -settingsManager.cameraMovementSpeed;
        this.yawSpeed_ = normalizeAngle((this.yaw_ - yawTarget) as Radians) * -settingsManager.cameraMovementSpeed;
      } else {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const smoothing = 0.2;

        this.pitch_ = lerp(this.pitch_, pitchTarget, smoothing);
        this.yaw_ = lerp(this.yaw_, yawTarget, smoothing);
      }
    }
  }

  private handleMouseUp(_event: MouseEvent, _x: number, _y: number, button: number): void {
    if (button === 0) {
      this.isDragging_ = false;
    }
  }

  private handleMouseWheel(_event: WheelEvent, _x: number, _y: number, delta: number): void {
    const sensitivity = 0.0001;
    const scale = Math.max(1, Math.abs(this.zoomTarget_ - this.zoom_) * 10);
    const zoomDelta = delta * sensitivity * scale;

    this.zoomTarget_ = Math.max(this.minZoomThreshold, Math.min(this.maxZoomThreshold, this.zoomTarget_ + zoomDelta));
    this.disableAutoRotation();
  }

  protected resetInternal(): void {
    this.pitch_ = 0;
    this.yaw_ = 0;
    this.zoom_ = 1;
    this.pitchTarget_ = 0;
    this.yawTarget_ = 0;
    this.zoomTarget_ = 1;
    this.isAutoPitchYawToTarget_ = false;
    this.isDragging_ = false;
    this.dragStartPosition_ = { x: 0, y: 0 };
    this.dragStartPitch_ = 0;
    this.dragStartYaw_ = 0;
    this.pitchSpeed_ = 0;
    this.yawSpeed_ = 0;
  }

  snapToSat(target: BaseObject, simulationTime: Date): void {
    // Snap to the angle of the target
    const pos = target.position;
    const radius = Math.sqrt(pos.x ** 2 + pos.y ** 2);
    const yaw = <Radians>(Math.atan2(pos.y, pos.x) + TAU / 4);
    const pitch = <Radians>Math.atan2(pos.z, radius);

    this.target(pitch, yaw);

    // Snap to the zoom level
    let camDistTarget = 1;
    const { gmst } = SatMath.calculateTimeVariables(simulationTime);
    const altitude = SatMath.getAlt(target.position, gmst);

    camDistTarget = altitude + RADIUS_OF_EARTH + this.distanceBuffer;
    camDistTarget = camDistTarget < settingsManager.minZoomDistance ? settingsManager.minZoomDistance + 10 : camDistTarget;

    this.zoomTarget_ = ((camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance)) ** (1 / ZOOM_EXP);

    settingsManager.selectedColor = [0, 0, 0, 0];
  }

  getCameraOrientation(): vec3 {
    const xRot = Math.sin(-this.camera.ftsYaw) * Math.cos(this.camera.ftsPitch);
    const yRot = Math.cos(this.camera.ftsYaw) * Math.cos(this.camera.ftsPitch);
    const zRot = Math.sin(-this.camera.ftsPitch);

    return vec3.fromValues(xRot, yRot, zRot);
  }

  protected handleKeyDown(): void {
    // Implement satellite camera key down logic if needed
  }

  protected handleKeyUp(): void {
    // Implement satellite camera key up logic if needed
  }

  private disableAutoRotation() {
    this.isAutoRotateEnabled_ = false;
    settingsManager.isAutoRotateL = false;
    settingsManager.isAutoRotateR = false;
    settingsManager.isAutoRotateU = false;
    settingsManager.isAutoRotateD = false;
    this.isAutoPitchYawToTarget_ = false;
  }
}
