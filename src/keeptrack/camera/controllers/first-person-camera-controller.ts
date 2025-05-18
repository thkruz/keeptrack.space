import { CameraController } from '@app/doris/camera/controllers/camera-controller';
import { Doris } from '@app/doris/doris';
import { EventBus } from '@app/doris/events/event-bus';
import { InputEvents, WebGlEvents } from '@app/doris/events/event-types';
import { mat4 } from 'gl-matrix';
import { DEG2RAD } from 'ootk';
import { KeepTrackMainCamera } from '../legacy-camera';

export class FirstPersonCameraController extends CameraController {
  // Camera state
  protected camera: KeepTrackMainCamera;
  protected pitch_: number = 0;
  protected yaw_: number = 0;
  protected rotate_: number = 0;

  protected targetPitch_: number = 0;
  protected targetYaw_: number = 0;
  protected targetRotate_: number = 0;

  forwardSpeed: number = 0;
  sideSpeed: number = 0;
  vertSpeed: number = 0;
  private readonly runMovementSpeed_: number = 3;
  forwardSpeedLock: boolean = false;
  sideSpeedLock: boolean = false;
  vertSpeedLock: boolean = false;
  private fastMultiplier_: number = 1;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  private smoothedPitchDelta_: number = 0;
  private smoothedYawDelta_: number = 0;
  private smoothedRotateDelta_: number = 0;

  constructor(camera: KeepTrackMainCamera, eventBus: EventBus) {
    super(camera, eventBus);
    this.camera = camera;
  }

  protected onActivate(): void {
    super.onActivate?.();
    this.camera.position = [0, 35000, 0];
    this.camera.setFov(0.6);
  }

  protected updateInternal(delta: number): void {
    this.interpolateOrientation_(delta);
    this.clampCameraOrientation_();
    this.handleKeyStates_();
    this.clampSpeed_(delta);
    this.updateCameraPosition_(delta);
  }

  private interpolateOrientation_(delta: number) {
    // Interpolation speed (adjust as needed)
    const interpSpeed = 0.003 * delta;

    this.pitch_ += (this.targetPitch_ - this.pitch_) * interpSpeed;
    this.yaw_ += (this.targetYaw_ - this.yaw_) * interpSpeed;
    this.rotate_ += (this.targetRotate_ - this.rotate_) * interpSpeed;
  }

  private isKeyDown_(key: string): boolean {
    return Doris.getInstance().getInputSystem().isKeyDown(key);
  }

  private handleKeyStates_() {
    // If shift is pressed, set fastMultiplier to 3, otherwise set it to 1
    this.fastMultiplier_ = this.isKeyDown_('shift') ? this.runMovementSpeed_ : 1;

    // Handle key state for movement
    if (this.isKeyDown_('w') && this.isKeyDown_('s')) {
      this.forwardSpeed = 0;
      this.forwardSpeedLock = false;
    } else if (this.isKeyDown_('w')) {
      this.forwardSpeed = -(settingsManager.fpsForwardSpeed ?? 3);
      this.forwardSpeedLock = true;
    } else if (this.isKeyDown_('s')) {
      this.forwardSpeed = settingsManager.fpsForwardSpeed ?? 3;
      this.forwardSpeedLock = true;
    } else {
      this.forwardSpeedLock = false;
    }

    if (this.isKeyDown_('a') && this.isKeyDown_('d')) {
      this.sideSpeed = 0;
      this.sideSpeedLock = false;
    } else if (this.isKeyDown_('a')) {
      this.sideSpeed = settingsManager.fpsSideSpeed ?? 2;
      this.sideSpeedLock = true;
    } else if (this.isKeyDown_('d')) {
      this.sideSpeed = -(settingsManager.fpsSideSpeed ?? 2);
      this.sideSpeedLock = true;
    } else {
      this.sideSpeedLock = false;
    }

    if (this.isKeyDown_('q') && this.isKeyDown_('e')) {
      this.vertSpeed = 0;
      this.vertSpeedLock = false;
    } else if (this.isKeyDown_('q')) {
      this.vertSpeed = settingsManager.fpsVertSpeed ?? 2;
      this.vertSpeedLock = true;
    } else if (this.isKeyDown_('e')) {
      this.vertSpeed = -(settingsManager.fpsVertSpeed ?? 2);
      this.vertSpeedLock = true;
    } else {
      this.vertSpeedLock = false;
    }
  }

  private clampSpeed_(delta: number) {
    if (!this.forwardSpeedLock) {
      this.forwardSpeed *= Math.min(0.90 * delta, 0.90);
    }
    if (!this.sideSpeedLock) {
      this.sideSpeed *= Math.min(0.90 * delta, 0.90);
    }
    if (!this.vertSpeedLock) {
      this.vertSpeed *= Math.min(0.90 * delta, 0.90);
    }

    if (this.forwardSpeed < 0.01 && this.forwardSpeed > -0.01) {
      this.forwardSpeed = 0;
    }
    if (this.sideSpeed < 0.01 && this.sideSpeed > -0.01) {
      this.sideSpeed = 0;
    }
    if (this.vertSpeed < 0.01 && this.vertSpeed > -0.01) {
      this.vertSpeed = 0;
    }
  }

  private updateCameraPosition_(delta: number) {
    if (this.forwardSpeed !== 0) {
      this.camera.position[0] += Math.sin(this.yaw_ * DEG2RAD) * this.forwardSpeed * this.fastMultiplier_ * delta;
      this.camera.position[1] += Math.cos(this.yaw_ * DEG2RAD) * this.forwardSpeed * this.fastMultiplier_ * delta;
      this.camera.position[2] -= Math.sin(this.pitch_ * DEG2RAD) * this.forwardSpeed * this.fastMultiplier_ * delta;
    }
    if (this.vertSpeed !== 0) {
      this.camera.position[2] += this.vertSpeed * this.fastMultiplier_ * delta;
    }
    if (this.sideSpeed !== 0) {
      this.camera.position[0] += Math.cos(-this.yaw_ * DEG2RAD) * this.sideSpeed * this.fastMultiplier_ * delta;
      this.camera.position[1] += Math.sin(-this.yaw_ * DEG2RAD) * this.sideSpeed * this.fastMultiplier_ * delta;
    }
  }

  private clampCameraOrientation_() {
    // Decay deltas when not dragging
    this.smoothedPitchDelta_ *= 0.8;
    this.smoothedYawDelta_ *= 0.8;
    this.smoothedRotateDelta_ *= 0.8;

    // Clamp targets
    if (this.targetPitch_ > 90) {
      this.targetPitch_ = 90;
    }
    if (this.targetPitch_ < -90) {
      this.targetPitch_ = -90;
    }
    if (this.targetRotate_ > 360) {
      this.targetRotate_ -= 360;
      this.rotate_ -= 360;
    }
    if (this.targetRotate_ < -360) {
      this.targetRotate_ += 360;
      this.rotate_ += 360;
    }
    if (this.targetYaw_ > 360) {
      this.targetYaw_ -= 360;
      this.yaw_ -= 360;
    }
    if (this.targetYaw_ < -360) {
      this.targetYaw_ += 360;
      this.yaw_ += 360;
    }

    // Clamp actuals (optional, for safety)
    if (this.pitch_ > 90) {
      this.pitch_ = 90;
    }
    if (this.pitch_ < -90) {
      this.pitch_ = -90;
    }
    if (this.rotate_ > 360) {
      this.rotate_ -= 360;
    }
    if (this.rotate_ < -360) {
      this.rotate_ += 360;
    }
    if (this.yaw_ > 360) {
      this.yaw_ -= 360;
    }
    if (this.yaw_ < -360) {
      this.yaw_ += 360;
    }
  }

  protected renderInternal(camera: KeepTrackMainCamera): void {
    const viewMatrix = camera.getViewMatrix();

    // Rotate the camera
    mat4.rotate(viewMatrix, viewMatrix, -this.pitch_ * DEG2RAD, [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, this.yaw_ * DEG2RAD, [0, 0, 1]);
    mat4.rotate(viewMatrix, viewMatrix, this.rotate_ * DEG2RAD, [0, 1, 0]);
    // Move the camera to the FPS position
    mat4.translate(viewMatrix, viewMatrix, [camera.position[0], camera.position[1], -camera.position[2]]);
  }

  protected registerInputEvents(): void {
    this.eventBus.on(InputEvents.MouseWheel, this.handleMouseWheel.bind(this));
    this.eventBus.on(InputEvents.MouseMove, this.handleMouseDrag.bind(this));
    this.eventBus.on(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.on(InputEvents.MouseUp, this.handleMouseUp.bind(this));
  }

  protected unregisterInputEvents(): void {
    this.eventBus.removeListener(InputEvents.MouseWheel, this.handleMouseWheel.bind(this));
    this.eventBus.removeListener(InputEvents.MouseMove, this.handleMouseDrag.bind(this));
    this.eventBus.removeListener(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.removeListener(InputEvents.MouseUp, this.handleMouseUp.bind(this));
  }

  protected handleMouseWheel(_event: WheelEvent, _x: number, _y: number, delta: number): void {
    this.camera.setFov(this.camera.fov + delta * 0.0002);
    Doris.getInstance().emit(WebGlEvents.FovChanged);
  }

  protected handleMouseDrag(event: MouseEvent, x: number, y: number): void {
    /*
     * Only update deltas while mouse button is held (like FPS games)
     * Calculate deltas
     */
    const deltaX = x - this.lastMouseX;
    const deltaY = y - this.lastMouseY;

    // Smoothing factor (between 0 and 1, lower is smoother)
    const smoothing = 0.2;

    // Left mouse button: pitch/yaw
    if (event.buttons === 1) {
      // Left mouse button: pitch/yaw
      this.smoothedPitchDelta_ += ((-deltaY * 0.1) - this.smoothedPitchDelta_) * smoothing;
      this.smoothedYawDelta_ += ((deltaX * 0.1) - this.smoothedYawDelta_) * smoothing;
      this.targetPitch_ += this.smoothedPitchDelta_;
      this.targetYaw_ += this.smoothedYawDelta_;
    } else if (event.buttons === 4) {
      // Middle mouse button: rotate
      this.smoothedRotateDelta_ += ((-deltaX * 0.1) - this.smoothedRotateDelta_) * smoothing;
      this.targetRotate_ += this.smoothedRotateDelta_;
    }
    this.lastMouseX = x;
    this.lastMouseY = y;
  }


  protected handleMouseDown(_event: MouseEvent, x: number, y: number): void {
    this.lastMouseX = x;
    this.lastMouseY = y;
  }
  protected handleMouseUp(_event: MouseEvent, x: number, y: number): void {
    this.lastMouseX = x;
    this.lastMouseY = y;
  }
}
