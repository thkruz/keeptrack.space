import { CameraController } from '@app/doris/camera/controllers/camera-controller';
import { EventBus } from '@app/doris/events/event-bus';
import { InputEvents } from '@app/doris/events/event-types';
import { KeepTrackMainCamera } from '@app/keeptrack/camera/legacy-camera';
import { keepTrackApi } from '@app/keepTrackApi';
import { alt2zoom } from '@app/lib/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatMath } from '@app/static/sat-math';
import { Kilometers } from 'ootk';
import { Camera } from '../camera';

// Interface for controller settings
export interface OrbitalControllerParams {
  cameraMovementSpeed?: number;
  cameraDecayFactor?: number;
}

export abstract class OrbitalController extends CameraController {
  protected isDragging_: boolean = false;
  protected dragStartPosition_: { x: number, y: number } = { x: 0, y: 0 };
  protected dragStartPitch_ = 0;
  protected dragStartYaw_ = 0;
  protected pitch_ = 0;
  protected pitchTarget_ = 0;
  protected yaw_ = 0;
  protected yawTarget_ = 0;
  protected zoom_ = 0.6925;
  protected pitchSpeed_ = 0;
  protected yawSpeed_ = 0;
  protected zoomTarget_ = 0.6925;
  protected isAutoPitchYawToTarget_ = false;
  protected isMomentumEnabled_ = true;
  protected isAutoRotateEnabled_ = true;

  protected minZoomThreshold = 0.0001;
  protected maxZoomThreshold = 1;
  protected cameraMovementSpeed_ = 0.003;
  protected cameraDecayFactor_ = 5;

  // Private variables for settingsManager properties
  constructor(
    camera: Camera,
    eventBus: EventBus,
    params?: OrbitalControllerParams,
  ) {
    super(camera, eventBus);
    this.cameraMovementSpeed_ = params?.cameraMovementSpeed ?? 0.003;
    this.cameraDecayFactor_ = params?.cameraDecayFactor ?? 5;
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

  protected abstract updateAutoRotate(dt: number): void;
  protected abstract autoMovement(dt: number): void;

  protected readonly maxPitchSpeed = 0.002; // radians per second
  protected readonly maxYawSpeed = 0.002; // radians per second

  protected updateCameraRotation_(dt: number) {
    // Clamp pitchSpeed_ and yawSpeed_ to their respective max values
    const pitchSpeed = Math.max(-this.maxPitchSpeed, Math.min(this.maxPitchSpeed, this.pitchSpeed_ ?? 0));
    const yawSpeed = Math.max(-this.maxYawSpeed, Math.min(this.maxYawSpeed, this.yawSpeed_ ?? 0));

    if (Math.abs(pitchSpeed) > 1e-8) {
      this.pitch_ += pitchSpeed * dt;
    } else {
      this.pitchSpeed_ = 0;
    }
    if (Math.abs(yawSpeed) > 1e-8) {
      this.yaw_ += yawSpeed * dt;
    } else {
      this.yawSpeed_ = 0;
    }
    if (this.pitch_ > Math.PI / 2) {
      this.pitch_ = Math.PI / 2;
    }
    if (this.pitch_ < -Math.PI / 2) {
      this.pitch_ = -Math.PI / 2;
    }
  }

  protected adjustCameraMomentum_(dt: number): void {
    if (!this.isMomentumEnabled_) {
      return;
    }
    // Use decay logic from the original controller for momentum dampening
    if (Math.abs(this.pitchSpeed_) > 0.0001) {
      this.pitchSpeed_ -= this.pitchSpeed_ * dt * this.cameraMovementSpeed_ * this.cameraDecayFactor_;
    } else {
      this.pitchSpeed_ = 0;
    }
    if (Math.abs(this.yawSpeed_) > 0.0001) {
      this.yawSpeed_ -= this.yawSpeed_ * dt * this.cameraMovementSpeed_ * this.cameraDecayFactor_;
    } else {
      this.yawSpeed_ = 0;
    }
  }

  protected updateCameraZoom_(dt: number): void {
    if (Math.abs(this.zoomTarget_ - this.zoom_) > 0.0001) {
      this.zoom_ += (this.zoomTarget_ - this.zoom_) * dt * this.cameraMovementSpeed_;
    }
    if (Math.abs(this.zoomTarget_ - this.zoom_) < 0.0001) {
      this.zoom_ = this.zoomTarget_;
    }
  }

  protected registerInputEvents(): void {
    this.eventBus.on(InputEvents.MouseWheel, this.handleMouseWheel.bind(this));
  }

  protected unregisterInputEvents(): void {
    this.eventBus.removeListener(InputEvents.MouseWheel, this.handleMouseWheel.bind(this));
  }

  protected handleMouseWheel(event: WheelEvent, x: number, y: number, delta: number): void {
    const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);
    const mainCamera = this.camera as KeepTrackMainCamera;
    const isCameraCloseToSatellite = mainCamera.camDistBuffer < settingsManager.nearZoomLevel;
    const maxCovarianceDistance = Math.min((keepTrackApi.getPlugin(SelectSatManager)?.primarySatCovMatrix?.[2] ?? 0) * 10, 10000);
    const isCameraCloseToCovarianceBubble = settingsManager.isDrawCovarianceEllipsoid &&
      mainCamera.camDistBuffer < maxCovarianceDistance;

    if (settingsManager.isZoomStopsSnappedOnSat || !selectSatManagerInstance || selectSatManagerInstance?.selectedSat === -1) {
      mainCamera.zoomTarget += delta / 100 / 25 / mainCamera.speedModifier; // delta is +/- 100
      mainCamera.earthCenteredLastZoom = mainCamera.zoomTarget;
      mainCamera.camZoomSnappedOnSat = false;
    } else if ((isCameraCloseToSatellite || isCameraCloseToCovarianceBubble) ||
      mainCamera.zoomLevel() === -1) {
      // Inside camDistBuffer
      settingsManager.selectedColor = [0, 0, 0, 0];

      /*
       * Slowly zoom in/out, scaling speed with camDistBuffer (farther = faster)
       * Exponential scaling for smoother zoom near the satellite
       */
      const scale = Math.max(0.01, (mainCamera.camDistBuffer / 100) ** 1.15); // Exponential factor > 1 for faster scaling as distance increases

      mainCamera.camDistBuffer = <Kilometers>(mainCamera.camDistBuffer + (delta / 5) * scale); // delta is +/- 100

      // Clamping camDistBuffer to be between minDistanceFromSatellite and maxZoomDistance
      mainCamera.camDistBuffer = <Kilometers>Math.min(
        Math.max(
          mainCamera.camDistBuffer,
          settingsManager.minDistanceFromSatellite,
        ),
        Math.max(
          settingsManager.nearZoomLevel,
          maxCovarianceDistance,
        ),
      );
    } else if (mainCamera.camDistBuffer >= settingsManager.nearZoomLevel) {
      // Outside camDistBuffer
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
      mainCamera.zoomTarget += delta / 100 / 25 / mainCamera.speedModifier; // delta is +/- 100
      mainCamera.earthCenteredLastZoom = mainCamera.zoomTarget;
      mainCamera.camZoomSnappedOnSat = false;

      // calculate camera distance from target
      const target = selectSatManagerInstance.getSelectedSat();

      if (target) {
        const satAlt = SatMath.getAlt(target.position, SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj).gmst);
        const curMinZoomLevel = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);

        if (mainCamera.zoomTarget < mainCamera.zoomLevel() && mainCamera.zoomTarget < curMinZoomLevel) {
          mainCamera.camZoomSnappedOnSat = true;

          if (settingsManager.isDrawCovarianceEllipsoid) {
            mainCamera.camDistBuffer = <Kilometers>(Math.max(Math.max(mainCamera.camDistBuffer, settingsManager.nearZoomLevel), maxCovarianceDistance) - 1);
          } else {
            mainCamera.camDistBuffer = <Kilometers>Math.min(Math.max(mainCamera.camDistBuffer, settingsManager.nearZoomLevel), settingsManager.minDistanceFromSatellite);
          }
        }
      }
    }
  }

  activateMomentum(): void {
    this.isMomentumEnabled_ = true;
  }

  deactivateMomentum(): void {
    this.isMomentumEnabled_ = false;
    this.pitchSpeed_ = 0;
    this.yawSpeed_ = 0;
  }

  target(pitch: number, yaw: number): void {
    if (this.isDragging_) {
      return;
    }
    this.isAutoRotateEnabled_ = false;
    this.pitchTarget_ = pitch;
    this.yawTarget_ = yaw;
    this.isAutoPitchYawToTarget_ = true;
  }
}
