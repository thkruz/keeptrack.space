import { CameraController } from '@app/doris/camera/controllers/camera-controller';
import { EventBus } from '@app/doris/events/event-bus';
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
