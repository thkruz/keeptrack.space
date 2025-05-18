import { OrbitalController } from '@app/doris/camera/controllers/orbital-controller';
import { Doris } from '@app/doris/doris';
import { EventBus } from '@app/doris/events/event-bus';
import { InputEvents } from '@app/doris/events/event-types';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';
import { keepTrackApi } from '@app/keepTrackApi';
import { RADIUS_OF_EARTH } from '@app/lib/constants';
import { lat2pitch, lon2yaw } from '@app/lib/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatMath } from '@app/static/sat-math';
import { mat4, vec3 } from 'gl-matrix';
import { Degrees, DetailedSensor, eci2lla, EciVec3, Radians, Star, TAU, ZoomValue } from 'ootk';
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
  protected minZoomDistance = RADIUS_OF_EARTH + 100;
  protected maxZoomDistance = 350000;
  screenDragPoint: number[];

  constructor(camera: KeepTrackMainCamera, eventBus: EventBus, params?: EarthCenteredOrbitalControllerParams) {
    super(camera, eventBus, params);
    this.camera = camera;
    this.cameraMovementSpeed_ = params?.cameraMovementSpeed ?? 0.003;
    this.cameraDecayFactor_ = params?.cameraDecayFactor ?? 5;
    this.autoRotateSpeed_ = params?.autoRotateSpeed ?? 0.000075;
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

  protected updateInternal(dt: number): void {
    // First handle auto-rotation if enabled
    if (this.isAutoRotateEnabled_) {
      this.updateAutoRotate(dt);
    } else if (this.isAutoPitchYawToTarget_) {
      // Handle target-following movement
      this.autoMovement(dt);
      this.updateCameraZoom_(dt);
    } else {
      // Apply momentum and limits
      this.adjustCameraMomentum_(dt);
      this.updateCameraRotation_(dt);
      this.updateCameraZoom_(dt);

      if (this.zoom_ > this.maxZoomThreshold / 2) {
        this.camera.setNearFar(100, this.camera.far);
      } else {
        this.camera.setNearFar(settingsManager.zNear, settingsManager.zFar);
      }

      // Apply limits to pitch/yaw regardless of control mode
      if (this.pitch_ > Math.PI / 2) {
        this.pitch_ = Math.PI / 2;
      }
      if (this.pitch_ < -Math.PI / 2) {
        this.pitch_ = -Math.PI / 2;
      }

      if (this.yaw_ > TAU) {
        this.yaw_ -= TAU;
      }
      if (this.yaw_ < 0) {
        this.yaw_ += TAU;
      }
    }

    this.updateCameraPosition_();
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

  protected onActivate(): void {
    this.camera.setNearFar(settingsManager.zNear, settingsManager.zFar);
  }

  protected onDeactivate(): void {
    this.camera.setNearFar(settingsManager.zNear, settingsManager.zFar);
  }

  protected updateCameraPosition_(): void {
    // Calculate the camera position based on the current pitch, yaw, and zoom
    const cameraPosition = this.getCameraPosition();

    // Update the camera's position
    this.camera.node.transform.setPosition(vec3.fromValues(cameraPosition[0], cameraPosition[1], cameraPosition[2]));
  }

  protected renderInternal(): void {
    const target = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

    if ((target?.id ?? -1) > -1) {
      // Tell CameraManager to change camera controller and re-render

      // TODO: This should be caught somewhere else
      this.camera.switchCameraController();
      this.camera.render();

      return;
    }

    const viewMatrix = this.camera.getViewMatrix();

    // 4. Rotate the camera around the new local origin
    mat4.rotateX(viewMatrix, viewMatrix, -this.camera.localRotateCurrent.pitch);
    mat4.rotateY(viewMatrix, viewMatrix, -this.camera.localRotateCurrent.roll);
    mat4.rotateZ(viewMatrix, viewMatrix, -this.camera.localRotateCurrent.yaw);

    // 3. Adjust for panning
    mat4.translate(viewMatrix, viewMatrix, [this.camera.panCurrent.x, this.camera.panCurrent.y, this.camera.panCurrent.z]);

    // 1. Rotate around the earth (0,0,0)
    mat4.rotateX(viewMatrix, viewMatrix, this.pitch_);
    mat4.rotateZ(viewMatrix, viewMatrix, this.yaw_);

    // 2. Back away from the earth in the Y direction (depth)
    const cameraPosition = this.getCameraPosition();

    mat4.translate(viewMatrix, viewMatrix, [cameraPosition[0], cameraPosition[1], -cameraPosition[2]]);
  }

  resetInternal(): void {
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

  lookAtAngle(pitch: Radians, yaw: Radians): void {
    // this.isPanReset = true
    this.pitchTarget_ = pitch;
    this.yawTarget_ = this.normalizeAngle(yaw);
    this.isAutoPitchYawToTarget_ = true;
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
    super.registerInputEvents();
    this.eventBus.on(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.on(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.on(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.on(InputEvents.KeyUp, this.handleKeyUp.bind(this));
    this.eventBus.on(InputEvents.MouseDrag, this.handleMouseDrag.bind(this));
  }

  protected unregisterInputEvents(): void {
    super.registerInputEvents();
    this.eventBus.removeListener(InputEvents.MouseDown, this.handleMouseDown.bind(this));
    this.eventBus.removeListener(InputEvents.MouseUp, this.handleMouseUp.bind(this));
    this.eventBus.removeListener(InputEvents.KeyDown, this.handleKeyDown.bind(this));
    this.eventBus.removeListener(InputEvents.KeyUp, this.handleKeyUp.bind(this));
    this.eventBus.removeListener(InputEvents.MouseDrag, this.handleMouseDrag.bind(this));
  }

  protected handleMouseDrag(_event: MouseEvent, x: number, y: number): void {
    // Calculate drag difference and update camera speeds
    const xDif = this.screenDragPoint[0] - x;
    const yDif = this.screenDragPoint[1] - y;
    const yawTarget = <Radians>(this.dragStartYaw_ + xDif * -this.cameraMovementSpeed_);
    const pitchTarget = <Radians>(this.dragStartPitch_ + yDif * -this.cameraMovementSpeed_);

    this.pitchSpeed_ = this.normalizeAngle(pitchTarget - this.pitch_) * this.cameraMovementSpeed_;
    this.yawSpeed_ = this.normalizeAngle(yawTarget - this.yaw_) * this.cameraMovementSpeed_;
  }

  autoRotate(val?: boolean): void {
    if (this.autoRotateSpeed_ === 0) {
      this.autoRotateSpeed_ = 0.000075;
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

  getCameraOrientation(): vec3 {
    const xRot = Math.sin(-this.yaw_) * Math.cos(this.pitch_);
    const yRot = Math.cos(this.yaw_) * Math.cos(this.pitch_);
    const zRot = Math.sin(-this.pitch_);


    return vec3.fromValues(xRot, yRot, zRot);
  }

  protected handleMouseDown(_event: MouseEvent, x: number, y: number, button: number): void {
    const { x: mouseX = 0, y: mouseY = 0 } = Doris.getInstance().getInputSystem().getMousePosition();

    this.screenDragPoint = [mouseX, mouseY];
    this.dragStartPitch_ = this.pitch_;
    this.dragStartYaw_ = this.yaw_;

    // Left mouse button - dragging
    if (button === 0) {
      this.isDragging_ = true;
      this.dragStartPosition_ = { x, y };
      this.isAutoPitchYawToTarget_ = false;
      this.disableAutoRotation();
    }

    // Middle mouse button - rotation
    if (button === 1) {
      this.camera.localRotateStartPosition = this.camera.localRotateCurrent;
      if (Doris.getInstance().getInputSystem().isKeyDown('shift')) {
        this.camera.isLocalRotateRoll = true;
        this.camera.isLocalRotateYaw = false;
      } else {
        this.camera.isLocalRotateRoll = false;
        this.camera.isLocalRotateYaw = true;
      }
    }

    // Right mouse button - panning
    if (button === 2 && (Doris.getInstance().getInputSystem().isKeyDown('shift') ||
      Doris.getInstance().getInputSystem().isKeyDown('ctrl'))) {
      this.camera.panStartPosition = this.camera.panCurrent;
      if (Doris.getInstance().getInputSystem().isKeyDown('shift')) {
        this.camera.isScreenPan = false;
        this.camera.isWorldPan = true;
      } else {
        this.camera.isScreenPan = true;
        this.camera.isWorldPan = false;
      }
    }
  }

  protected handleMouseUp(_event: MouseEvent, _x: number, _y: number, button: number): void {
    if (button === 0) {
      this.isDragging_ = false;
    }
    // Handle other mouse button releases
    if (button === 1) {
      this.camera.isLocalRotateRoll = false;
      this.camera.isLocalRotateYaw = false;
    }

    if (button === 2) {
      this.camera.isScreenPan = false;
      this.camera.isWorldPan = false;
    }
  }

  protected handleMouseWheel(_event: WheelEvent, _x: number, _y: number, delta: number): void {
    super.handleMouseWheel(_event, _x, _y, delta);
    /*
     * Mouse wheel changes zoomTarget_ only; actual zoom is updated in updateInternal
     * Exponential scaling: zoom faster when farther from current zoom level
     */
    const sensitivity = 0.0005;
    const scale = Math.max(1, Math.abs(this.zoomTarget_ - this.zoom_) * 10);
    const zoomDelta = delta * sensitivity * scale;

    let adjustedZoomDelta = zoomDelta;

    if (Math.abs(this.zoomTarget_ - this.zoom_) < 1e-6) {
      adjustedZoomDelta *= 0.5;
    }
    this.zoomTarget_ = Math.max(this.minZoomThreshold, Math.min(this.maxZoomThreshold, this.zoomTarget_ + adjustedZoomDelta));
    this.disableAutoRotation();
  }

  protected handleKeyDown(_event?: KeyboardEvent, key?: string, isRepeat?: boolean): void {
    if (key === 'r' && !isRepeat) {
      this.autoRotate();
    }
  }

  protected handleKeyUp(): void {
    /*
     * Handle key releases
     * This code moves from LegacyCamera.keyUp* methods to here
     */
  }
}
