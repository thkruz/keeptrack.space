import { OrbitalController } from '@app/doris/camera/controllers/orbital-controller';
import { Doris } from '@app/doris/doris';
import { EventBus } from '@app/doris/events/event-bus';
import { InputEvents } from '@app/doris/events/event-types';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';
import { keepTrackApi } from '@app/keepTrackApi';
import { lat2pitch, lon2yaw, normalizeAngle } from '@app/lib/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatMath } from '@app/static/sat-math';
import { mat4, vec3 } from 'gl-matrix';
import { Degrees, DetailedSensor, eci2lla, EciVec3, Radians, Star, ZoomValue } from 'ootk';
import { KeepTrackMainCamera } from '../legacy-camera';

interface EarthCenteredOrbitalControllerParams {
  camera: KeepTrackMainCamera;
  cameraMovementSpeed?: number;
  cameraDecayFactor?: number;
  autoRotateSpeed?: number;
  minZoomThreshold?: number;
  maxZoomThreshold?: number;
  isAutoRotateEnabled?: boolean;
  isAutoPitchYawToTarget?: boolean;
  isMomentumEnabled?: boolean;
}

export class EarthCenteredOrbitalController extends OrbitalController {
  private autoRotateSpeed_: number;
  protected camera: KeepTrackMainCamera;

  constructor(camera: KeepTrackMainCamera, eventBus: EventBus, params?: EarthCenteredOrbitalControllerParams) {
    super(camera, eventBus, params);
    this.camera = camera;
    this.cameraMovementSpeed_ = params?.cameraMovementSpeed ?? 0.003;
    this.cameraDecayFactor_ = params?.cameraDecayFactor ?? 5;
    this.autoRotateSpeed_ = params?.autoRotateSpeed ?? 0.0075;
    this.minZoomThreshold = params?.minZoomThreshold ?? 0.0001;
    this.maxZoomThreshold = params?.maxZoomThreshold ?? 1;
    this.isAutoRotateEnabled_ = params?.isAutoRotateEnabled ?? true;
    this.isAutoPitchYawToTarget_ = params?.isAutoPitchYawToTarget ?? false;
    this.isMomentumEnabled_ = params?.isMomentumEnabled ?? true;

    Doris.getInstance().on(KeepTrackApiEvents.setSensor, (sensor) => {
      if (!(sensor instanceof DetailedSensor) || this.isDragging_) {
        return;
      }

      this.isAutoRotateEnabled_ = false;
      this.zoomTarget_ = sensor.zoom ?? ZoomValue.GEO;
      this.target(lat2pitch(sensor.lat), lon2yaw(sensor.lon, keepTrackApi.getTimeManager().simulationTimeObj));
    });
    Doris.getInstance().on(KeepTrackApiEvents.enableAutoRotate, (val) => {
      this.autoRotate(val);
    });

    this.registerInputEvents();
  }


  protected updateAutoRotate(dt: number): void {
    if (settingsManager.isAutoRotateL) {
      this.yaw_ = <Radians>(this.yaw_ - this.autoRotateSpeed_ * dt);
    }
    if (settingsManager.isAutoRotateR) {
      this.yaw_ = <Radians>(this.yaw_ + this.autoRotateSpeed_ * dt);
    }
    if (settingsManager.isAutoRotateU) {
      this.pitch_ = <Radians>(this.pitch_ + (this.autoRotateSpeed_ / 2) * dt);
    }
    if (settingsManager.isAutoRotateD) {
      this.pitch_ = <Radians>(this.pitch_ - (this.autoRotateSpeed_ / 2) * dt);
    }
  }

  protected autoMovement(dt: number): void {
    const pitchDiff = normalizeAngle((this.pitch_ - this.pitchTarget_) as Radians);
    const yawDiff = normalizeAngle((this.yaw_ - this.yawTarget_) as Radians);
    const pitchSpeed = Math.abs(pitchDiff) > 0.0001 ? pitchDiff * dt * this.cameraMovementSpeed_ : 0;
    const yawSpeed = Math.abs(yawDiff) > 0.0001 ? yawDiff * dt * this.cameraMovementSpeed_ : 0;

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


  protected renderInternal(): void {
    const target = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

    if ((target?.id ?? -1) > -1) {
      // Tell CameraManager to change camera controller and re-render

      // TODO: This should be caught somewhere else
      this.camera.switchCameraController();
      this.camera.draw();

      return;
    }

    const viewMatrix = this.camera.getViewMatrix();

    // 4. Rotate the camera around the new local origin
    mat4.rotateX(viewMatrix, viewMatrix, -this.camera.localRotateCurrent.pitch);
    mat4.rotateY(viewMatrix, viewMatrix, -this.camera.localRotateCurrent.roll);
    mat4.rotateZ(viewMatrix, viewMatrix, -this.camera.localRotateCurrent.yaw);

    // 3. Adjust for panning
    mat4.translate(viewMatrix, viewMatrix, [this.camera.panCurrent.x, this.camera.panCurrent.y, this.camera.panCurrent.z]);

    // 2. Back away from the earth in the Y direction (depth)
    mat4.translate(viewMatrix, viewMatrix, [0, this.camera.getCameraDistance(), 0]);
    // 1. Rotate around the earth (0,0,0)
    mat4.rotateX(viewMatrix, viewMatrix, this.camera.earthCenteredPitch);
    mat4.rotateZ(viewMatrix, viewMatrix, -this.camera.earthCenteredYaw);
  }

  resetInternal(): void {
    this.pitch_ = 0;
    this.yaw_ = 0;
    this.zoom_ = this.zoomTarget_;
    this.pitchTarget_ = 0;
    this.yawTarget_ = 0;
    this.isAutoPitchYawToTarget_ = false;
    this.isDragging_ = false;
    this.isAutoRotateEnabled_ = false;
    this.isMomentumEnabled_ = true;
  }

  lookAtPosition(pos: EciVec3, isFaceEarth: boolean, selectedDate: Date): void {
    const gmst = SatMath.calculateTimeVariables(selectedDate).gmst;
    const lla = eci2lla(pos, gmst);
    const latModifier = isFaceEarth ? 1 : -1;
    const lonModifier = isFaceEarth ? 0 : 180;

    this.camera.camSnap(lat2pitch(<Degrees>(lla.lat * latModifier)), lon2yaw(<Degrees>(lla.lon + lonModifier), selectedDate));
  }

  lookAtStar(c: Star): void {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const lineManagerInstance = keepTrackApi.getLineManager();

    // Try with the pname
    const satId = catalogManagerInstance.starName2Id(c.name, dotsManagerInstance.starIndex1, dotsManagerInstance.starIndex2);
    const sat = catalogManagerInstance.getObject(satId);

    if (sat === null) {
      throw new Error('Star not found');
    }

    lineManagerInstance.clear();
    this.lookAtPosition(sat.position, false, timeManagerInstance.selectedDate);
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

  private handleMouseDown(_event: MouseEvent, x: number, y: number, button: number): void {
    if (button === 0) {
      this.isDragging_ = true;
      this.dragStartPosition_ = { x, y };
      this.dragStartPitch_ = this.pitch_;
      this.dragStartYaw_ = this.yaw_;
      this.disableAutoRotation();
    }
  }

  autoRotate(val?: boolean): void {
    if (this.autoRotateSpeed_ === 0) {
      this.autoRotateSpeed_ = 0.0075;
    }

    if (typeof val === 'undefined') {
      this.isAutoRotateEnabled_ = !this.isAutoRotateEnabled_;

      return;
    }
    this.isAutoRotateEnabled_ = val;
  }

  private disableAutoRotation() {
    this.isAutoRotateEnabled_ = false;
    settingsManager.isAutoRotateL = false;
    settingsManager.isAutoRotateR = false;
    settingsManager.isAutoRotateU = false;
    settingsManager.isAutoRotateD = false;

    this.isAutoPitchYawToTarget_ = false; // Disable auto movement when zooming
  }

  private handleMouseMove(_event: MouseEvent, x: number, y: number): void {
    if (this.isDragging_) {
      // Calculate drag difference using current mouse position and drag start
      const xDif = this.dragStartPosition_.x - x;
      const yDif = this.dragStartPosition_.y - y;

      // Compute target yaw and pitch based on drag
      const yawTarget = <Radians>(this.dragStartYaw_ + xDif * this.cameraMovementSpeed_);
      const pitchTarget = <Radians>(this.dragStartPitch_ + yDif * -this.cameraMovementSpeed_);

      if (this.isMomentumEnabled_) {
        // Update camera speeds using normalized angle difference
        this.pitchSpeed_ = normalizeAngle(<Radians>(this.pitch_ - pitchTarget)) * -this.cameraMovementSpeed_;
        this.yawSpeed_ = normalizeAngle(<Radians>(this.yaw_ - yawTarget)) * -this.cameraMovementSpeed_;
      } else {
        // Smoothly interpolate camera angles to reduce jitter
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const smoothing = 0.2; // Adjust between 0 (no movement) and 1 (instant)

        this.pitch_ = lerp(this.pitch_, pitchTarget, smoothing);
        this.yaw_ = lerp(this.yaw_, yawTarget, smoothing);
      }
    }
  }

  getCameraOrientation(): vec3 {
    const xRot = Math.sin(-this.camera.camYaw) * Math.cos(this.camera.camPitch);
    const yRot = Math.cos(this.camera.camYaw) * Math.cos(this.camera.camPitch);
    const zRot = Math.sin(-this.camera.camPitch);


    return vec3.fromValues(xRot, yRot, zRot);
  }

  protected onActivate(): void {
    // throw new Error('Method not implemented.');
  }
  protected onDeactivate(): void {
    // throw new Error('Method not implemented.');
  }

  private handleMouseUp(_event: MouseEvent, _x: number, _y: number, button: number): void {
    if (button === 0) {
      this.isDragging_ = false;
    }
  }

  private handleMouseWheel(_event: WheelEvent, _x: number, _y: number, delta: number): void {
    /*
     * Mouse wheel changes zoomTarget_ only; actual zoom is updated in updateInternal
     * Exponential scaling: zoom faster when farther from current zoom level
     */
    const sensitivity = 0.0005;
    const scale = Math.max(1, Math.abs(this.zoomTarget_ - this.zoom_) * 10);
    const zoomDelta = delta * sensitivity * scale;

    this.zoomTarget_ = Math.max(this.minZoomThreshold, Math.min(this.maxZoomThreshold, this.zoomTarget_ + zoomDelta));
    this.disableAutoRotation();
  }

  protected handleKeyDown(): void {
    /*
     * Handle key presses (pan, reset, etc.)
     * This code moves from LegacyCamera.keyDown* methods to here
     */
  }

  protected handleKeyUp(): void {
    /*
     * Handle key releases
     * This code moves from LegacyCamera.keyUp* methods to here
     */
  }
}
