import { OrbitalController, OrbitalControllerParams } from '@app/doris/camera/controllers/orbital-controller';
import { Doris } from '@app/doris/doris';
import { EventBus } from '@app/doris/events/event-bus';
import { InputEvents } from '@app/doris/events/event-types';
import { ToastMsgType } from '@app/interfaces';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';
import { keepTrackApi } from '@app/keepTrackApi';
import { ZOOM_EXP } from '@app/lib/constants';
import { alt2zoom } from '@app/lib/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatMath } from '@app/static/sat-math';
import { mat4, vec3 } from 'gl-matrix';
import { BaseObject, Kilometers, Milliseconds, RADIUS_OF_EARTH, Radians, TAU } from 'ootk';
import { CameraControllerType, KeepTrackMainCamera } from '../legacy-camera';

export interface SatelliteCameraControllerParams extends OrbitalControllerParams {
  isMomentumEnabled?: boolean;
}

export class SatelliteOrbitalCameraController extends OrbitalController {
  private zoomSnapped_ = false;
  private angleSnapped_ = false;
  distanceBuffer = 2;
  protected camera: KeepTrackMainCamera;
  targetObject_: BaseObject | null = null;

  constructor(camera: KeepTrackMainCamera, eventBus: EventBus, params?: SatelliteCameraControllerParams) {
    super(camera, eventBus, params);

    this.isMomentumEnabled_ = params?.isMomentumEnabled ?? true;
    this.eventBus.on(KeepTrackApiEvents.onPrimarySatelliteChange, this.onSatelliteSelect.bind(this));
  }

  protected onActivate(): void {
    super.onActivate?.();
    if (this.onValidate()) {
      keepTrackApi.getUiManager().toast('Camera Mode: Satellite Orbital', ToastMsgType.normal);
      this.zoom_ = Math.max(this.zoomTarget_, this.zoom_);
      this.camera.setZoomLevel(Math.max(this.camera.zoomTarget, this.camera.zoomLevel()));
      this.camera.setFov(0.4);
    }
  }

  protected onDeactivate(): void {
    const targetPosition = vec3.fromValues(0, 0, 0);

    const rootNode = Doris.getInstance().getSceneManager().activeScene?.root;

    rootNode!.transform.setPosition(targetPosition);
    rootNode!.transform.updateWorldMatrix(); // This won't happen automatically

    this.camera.setFov(settingsManager.fieldOfView);
  }

  private onSatelliteSelect(): void {
    this.zoom_ = Math.max(this.zoomTarget_, this.zoom_);
    this.camera.setZoomLevel(Math.max(this.camera.zoomTarget, this.camera.zoomLevel()));
    this.angleSnapped_ = true;
    this.zoomSnapped_ = true;
  }

  protected updateInternal(deltaTime: Milliseconds): void {
    if (!this.onValidate()) {
      this.camera.switchCameraController(CameraControllerType.EARTH_CENTERED_ORBITAL);
      this.camera.onUpdate?.(deltaTime); // Tell the camera to update its new controller

      return;
    }

    if (this.isAutoRotateEnabled_) {
      this.updateAutoRotate(deltaTime);
    } else if (this.isAutoPitchYawToTarget_) {
      this.autoMovement(deltaTime);
      this.updateCameraZoom_(deltaTime);
    } else {
      this.adjustCameraMomentum_(deltaTime);
      this.updateCameraRotation_(deltaTime);
      this.updateCameraZoom_(deltaTime);
    }

    const targetPosition = vec3.fromValues(
      -this.targetObject_!.position?.x,
      -this.targetObject_!.position?.y,
      -this.targetObject_!.position?.z);

    const rootNode = Doris.getInstance().getSceneManager().activeScene?.root;

    rootNode!.transform.setPosition(targetPosition);
    rootNode!.transform.updateWorldMatrix(); // This won't happen automatically
  }
  protected onValidate(): boolean {
    this.targetObject_ = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj ?? null;
    if ((this.targetObject_?.id ?? -1) === -1) {
      return false;
    }

    return true;
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

  getCameraRadius(center: vec3) {
    let targetDistanceFromEarth = 0;

    if (center) {
      const { gmst } = SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj);
      const positionEci = {
        x: center[0] as Kilometers,
        y: center[1] as Kilometers,
        z: center[2] as Kilometers,
      };
      const altitude = SatMath.getAlt(positionEci, gmst);

      targetDistanceFromEarth = altitude + RADIUS_OF_EARTH;
    }
    const radius = this.getCameraDistance() - targetDistanceFromEarth;


    return radius;
  }

  getCameraDistance(zoomLevel?: number): Kilometers {
    return <Kilometers>((zoomLevel ?? this.zoom_) ** ZOOM_EXP * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance);
  }

  // TODO: We need to use internal variables instead of legacy camera ones
  protected renderInternal(camera: KeepTrackMainCamera): void {
    const gmst = SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj).gmst;
    const satAlt = SatMath.getAlt(this.targetObject_!.position, gmst);

    if (camera.getCameraDistance() < satAlt + RADIUS_OF_EARTH + settingsManager.minDistanceFromSatellite) {
      this.zoomTarget_ = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);
      this.zoom_ = this.zoomTarget_;
    }

    const viewMatrix = camera.getViewMatrix();

    mat4.rotateX(viewMatrix, viewMatrix, -camera.localRotateCurrent.pitch);
    mat4.rotateY(viewMatrix, viewMatrix, -camera.localRotateCurrent.roll);
    mat4.rotateZ(viewMatrix, viewMatrix, -camera.localRotateCurrent.yaw);

    mat4.translate(viewMatrix, viewMatrix, [camera.panCurrent.x, camera.panCurrent.y, camera.panCurrent.z]);

    const satellitePosition = this.targetObject_!.position;
    const center = vec3.fromValues(satellitePosition.x, satellitePosition.y, satellitePosition.z);

    mat4.translate(viewMatrix, viewMatrix, [0, this.getCameraRadius(center), 0]);

    mat4.rotateX(viewMatrix, viewMatrix, this.pitch_);
    mat4.rotateZ(viewMatrix, viewMatrix, -this.yaw_);

    // mat4.translate(viewMatrix, viewMatrix, targetPosition);
  }

  protected registerInputEvents(): void {
    super.registerInputEvents();
    this.eventBus.on(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.on(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.on(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.on(InputEvents.KeyUp, this.handleKeyUp.bind(this));
  }

  protected unregisterInputEvents(): void {
    super.unregisterInputEvents();
    this.eventBus.removeListener(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.removeListener(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.removeListener(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.removeListener(InputEvents.KeyUp, this.handleKeyUp.bind(this));
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

  protected handleMouseUp(_event: MouseEvent, _x: number, _y: number, button: number): void {
    if (button === 0) {
      this.isDragging_ = false;
    }
  }

  protected handleMouseWheel(_event: WheelEvent, _x: number, _y: number, delta: number): void {
    super.handleMouseWheel(_event, _x, _y, delta);

    const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

    if (settingsManager.isZoomStopsSnappedOnSat || !selectSatManagerInstance || selectSatManagerInstance?.selectedSat === -1) {
      this.zoomTarget_ += delta / 100 / 25; // delta is +/- 100
      this.zoomSnapped_ = false;
    } else if ((this.distanceBuffer < settingsManager.nearZoomLevel || this.distanceBuffer < (keepTrackApi.getPlugin(SelectSatManager)?.primarySatCovMatrix[2] ?? 0) * 2.25) ||
      this.zoom_ === -1) {
      // Inside distanceBuffer
      settingsManager.selectedColor = [0, 0, 0, 0];
      // Adjust the distance buffer based on scroll delta
      this.distanceBuffer = <Kilometers>(this.distanceBuffer + delta / 100);

      // Calculate minimum and maximum allowed distance buffer
      const minDistance = settingsManager.minDistanceFromSatellite;
      const covMatrixZ = (keepTrackApi.getPlugin(SelectSatManager)?.primarySatCovMatrix[2] ?? 0) * 2.25;
      const nearZoomLevel = settingsManager.nearZoomLevel;
      const cameraNear = this.camera.near;
      const maxDistance = Math.max(nearZoomLevel, covMatrixZ, cameraNear);

      // Clamp the distance buffer within allowed range
      this.distanceBuffer = <Kilometers>Math.min(
        Math.max(this.distanceBuffer, minDistance),
        maxDistance,
      );
    } else if (this.distanceBuffer >= settingsManager.nearZoomLevel) {
      // Outside distanceBuffer
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
      this.zoomTarget_ += delta / 100 / 25; // delta is +/- 100
      this.zoomSnapped_ = false;

      // calculate camera distance from target
      const target = selectSatManagerInstance.getSelectedSat();

      if (target) {
        const satAlt = SatMath.getAlt(target.position, SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj).gmst);
        const curMinZoomLevel = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);

        if (this.zoomTarget_ < this.zoom_ && this.zoomTarget_ < curMinZoomLevel) {
          this.zoomSnapped_ = true;
          this.distanceBuffer = <Kilometers>Math.min(Math.max(this.distanceBuffer, settingsManager.nearZoomLevel), settingsManager.minDistanceFromSatellite);
        }
      }
    }

    // Clamp zoomTarget_ to min and max thresholds
    this.zoomTarget_ = Math.max(this.minZoomThreshold, Math.min(this.maxZoomThreshold, this.zoomTarget_));
    this.disableAutoRotation();
  }

  protected resetInternal(): void {
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
    if (this.angleSnapped_) {
      const pos = target.position;
      const radius = Math.sqrt(pos.x ** 2 + pos.y ** 2);

      const yaw = <Radians>(Math.atan2(pos.y, pos.x) + TAU / 4);
      const pitch = <Radians>Math.atan2(pos.z, radius);

      this.target(pitch, yaw);
    }

    // Snap to the zoom level
    if (this.zoomSnapped_) {
      let camDistTarget = 1;
      const { gmst } = SatMath.calculateTimeVariables(simulationTime);
      const altitude = SatMath.getAlt(target.position, gmst);

      camDistTarget = altitude + RADIUS_OF_EARTH + this.distanceBuffer;
      camDistTarget = camDistTarget < settingsManager.minZoomDistance ? settingsManager.minZoomDistance + 10 : camDistTarget;

      this.zoomTarget_ = ((camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance)) ** (1 / ZOOM_EXP);
    }

    // Only Zoom in Once on Mobile
    if (settingsManager.isMobileModeEnabled) {
      this.zoomSnapped_ = false;
    }

    if (this.zoom_ > settingsManager.satShader.largeObjectMaxZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 1.5;
    } else if (this.zoom_ < settingsManager.satShader.largeObjectMinZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize / 3;
    } else {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize;
    }

    settingsManager.selectedColor = [0, 0, 0, 0];
  }

  protected handleMouseMove(event: MouseEvent, x: number, y: number): void {
    super.handleMouseMove(event, x, y);

    if (this.isDragging_) {
      this.angleSnapped_ = false;
    }
  }

  getCameraOrientation(): vec3 {
    const xRot = Math.sin(-this.yaw_) * Math.cos(this.pitch_);
    const yRot = Math.cos(this.yaw_) * Math.cos(this.pitch_);
    const zRot = Math.sin(-this.pitch_);

    return vec3.fromValues(xRot, yRot, zRot);
  }

  getCameraPosition(): vec3 {
    if (!this.targetObject_) {
      this.camera.switchCameraController(CameraControllerType.EARTH_CENTERED_ORBITAL);
      this.camera.update(0 as Milliseconds);

      return this.camera.node.transform.position;
    }

    const center = vec3.fromValues(this.targetObject_?.position.x, this.targetObject_?.position.y, this.targetObject_?.position.z);
    const orientation: vec3 = this.getCameraOrientation();

    const radius = this.getCameraRadius(center);


    return vec3.fromValues(center[0] + orientation[0] * radius, center[1] + orientation[1] * radius, center[2] - orientation[2] * radius);
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
