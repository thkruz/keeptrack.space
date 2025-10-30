// app/keeptrack/camera/camera-state.ts
import { SatMath } from '@app/app/analysis/sat-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { alt2zoom } from '@app/engine/utils/transforms';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees, Kilometers, Radians } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';

/**
 * Centralized state management for the camera system.
 * Groups related properties logically while keeping them in a single class.
 */
export class CameraState {
  // ============ Core Transform ============
  position: vec3 = [0, 0, 0];
  camPitch: Radians = 0 as Radians;
  camYaw: Radians = 0 as Radians;

  // ============ Zoom ============
  private zoomLevel_ = 0.6925;
  private zoomTarget_ = 0.6925;
  private camDistBuffer_: Kilometers = 0 as Kilometers;
  earthCenteredLastZoom = 0.6925;
  isZoomIn = false;

  // ============ Rotation Speeds & Targets ============
  camPitchTarget: Radians = 0 as Radians;
  camPitchSpeed = 0;
  camYawTarget: Radians = 0 as Radians;
  camYawSpeed = 0;
  camRotateSpeed = 0;

  // ============ Earth-Centered Mode ============
  private earthCenteredPitch_: Radians = 0 as Radians;
  private earthCenteredYaw_: Radians = 0 as Radians;

  // ============ Fixed-to-Satellite Mode ============
  ftsPitch = 0;
  ftsYaw: Radians = 0 as Radians;
  ftsRotateReset = true;
  /**
   * This was used when there was only one camera mode and the camera was always centered on the earth
   * It is the overall yaw of the camera?
   */
  camZoomSnappedOnSat = false;
  camAngleSnappedOnSat = false;
  /**
   * This was used when there was only one camera mode and the camera was always centered on the earth
   * It is the overall pitch of the camera?
   */
  camSnapToSat = {
    pos: { x: 0, y: 0, z: 0 },
    radius: 0,
    pitch: <Radians>0,
    yaw: <Radians>0,
    altitude: 0,
    camDistTarget: 0,
  };

  // ============ FPS Mode ============
  private fpsPos_: vec3 = [0, 25000, 0];
  fpsPitch: Degrees = 0 as Degrees;
  fpsYaw: Degrees = 0 as Degrees;
  fpsRotate: Degrees = 0 as Degrees;
  fpsPitchRate = 0;
  fpsYawRate = 0;
  fpsRotateRate = 0;
  fpsForwardSpeed = 0;
  fpsSideSpeed = 0;
  fpsVertSpeed = 0;
  fpsRun = 1;
  private isFPSForwardSpeedLock_ = false;
  private isFPSSideSpeedLock_ = false;
  private isFPSVertSpeedLock_ = false;

  // ============ Local Rotation ============
  isLocalRotateOverride = false;
  isLocalRotateReset = true;
  isLocalRotateRoll = false;
  isLocalRotateYaw = false;
  localRotateTarget = {
    pitch: <Radians>0,
    roll: <Radians>0,
    yaw: <Radians>0,
  };
  localRotateCurrent = {
    pitch: <Radians>0,
    roll: <Radians>0,
    yaw: <Radians>0,
  };
  localRotateDif = {
    pitch: <Radians>0,
    roll: <Radians>0,
    yaw: <Radians>0,
  };
  localRotateSpeed = {
    pitch: 0,
    roll: 0,
    yaw: 0,
  };
  localRotateStartPosition = {
    pitch: 0,
    roll: 0,
    yaw: 0,
  };

  // ============ Panning ============
  isPanReset = false;
  isScreenPan = false;
  isWorldPan = false;
  panCurrent = { x: 0, y: 0, z: 0 };
  panSpeed = { x: 0, y: 0, z: 0 };
  panStartPosition = { x: 0, y: 0, z: 0 };
  private panTarget_ = { x: 0, y: 0, z: 0 };
  private panDif_ = { x: 0, y: 0, z: 0 };

  // ============ User Interaction ============
  isDragging = false;
  dragStartPitch: Radians = 0 as Radians;
  dragStartYaw: Radians = 0 as Radians;
  screenDragPoint = [0, 0];
  mouseX = 0;
  mouseY = 0;
  startMouseX = 0;
  startMouseY = 0;
  speedModifier = 1;
  isHoldingDownAKey = 1;

  // ============ Auto Behaviors ============
  isAutoPitchYawToTarget = false;
  private isAutoRotate_ = true;

  // ============ Getters/Setters ============
  get zoomLevel(): number {
    return this.zoomLevel_;
  }

  set zoomLevel(val: number) {
    this.zoomLevel_ = Math.max(0.0001, Math.min(1, val));
  }

  get zoomTarget(): number {
    return this.zoomTarget_;
  }

  set zoomTarget(val: number) {
    this.zoomTarget_ = Math.max(0.01, Math.min(1, val));
    this.zoomTargetChange();
  }

  get camDistBuffer(): Kilometers {
    return this.camDistBuffer_;
  }

  set camDistBuffer(val: Kilometers) {
    this.camDistBuffer_ = Math.max(val, settingsManager.minDistanceFromSatellite) as Kilometers;
  }

  get earthCenteredPitch(): Radians {
    return this.earthCenteredPitch_;
  }

  set earthCenteredPitch(val: Radians) {
    this.earthCenteredPitch_ = val;
  }

  get earthCenteredYaw(): Radians {
    return this.earthCenteredYaw_;
  }

  set earthCenteredYaw(val: Radians) {
    this.earthCenteredYaw_ = val;
  }

  get fpsPos(): vec3 {
    return this.fpsPos_;
  }

  set fpsPos(val: vec3) {
    this.fpsPos_ = val;
  }

  get isFPSForwardSpeedLock(): boolean {
    return this.isFPSForwardSpeedLock_;
  }

  set isFPSForwardSpeedLock(val: boolean) {
    this.isFPSForwardSpeedLock_ = val;
  }

  get isFPSSideSpeedLock(): boolean {
    return this.isFPSSideSpeedLock_;
  }

  set isFPSSideSpeedLock(val: boolean) {
    this.isFPSSideSpeedLock_ = val;
  }

  get isFPSVertSpeedLock(): boolean {
    return this.isFPSVertSpeedLock_;
  }

  set isFPSVertSpeedLock(val: boolean) {
    this.isFPSVertSpeedLock_ = val;
  }

  get isAutoRotate(): boolean {
    return this.isAutoRotate_;
  }

  set isAutoRotate(val: boolean) {
    this.isAutoRotate_ = val;
  }

  get panTarget() {
    return this.panTarget_;
  }

  get panDif() {
    return this.panDif_;
  }

  // ============ Methods ============

  zoomTargetChange(): void {
    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);
    const maxCovarianceDistance = Math.min((selectSatManagerInstance?.primarySatCovMatrix?.[2] ?? 0) * 10, 10000);

    if ((settingsManager.isZoomStopsSnappedOnSat || (selectSatManagerInstance?.selectedSat ?? -1) === -1) || (this.camDistBuffer >= settingsManager.nearZoomLevel)) {

      settingsManager.selectedColor = settingsManager.selectedColorFallback;
      ServiceLocator.getRenderer().setFarRenderer();
      this.earthCenteredLastZoom = this.zoomTarget;
      this.camZoomSnappedOnSat = false;

      // calculate camera distance from target
      const target = selectSatManagerInstance?.getSelectedSat();

      if (target) {
        const satAlt = SatMath.getAlt(target.position, SatMath.calculateTimeVariables(ServiceLocator.getTimeManager().simulationTimeObj).gmst);
        const curMinZoomLevel = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);

        if (this.zoomTarget < this.zoomLevel && this.zoomTarget < curMinZoomLevel) {
          this.camZoomSnappedOnSat = true;

          if (settingsManager.isDrawCovarianceEllipsoid) {
            this.camDistBuffer = <Kilometers>(Math.max(Math.max(this.camDistBuffer, settingsManager.nearZoomLevel), maxCovarianceDistance) - 1);
          } else {
            this.camDistBuffer =
              <Kilometers>Math.min(Math.max(this.camDistBuffer, settingsManager.nearZoomLevel), settingsManager.minDistanceFromSatellite);
          }
        }
      }

    } else {
      ServiceLocator.getRenderer().setNearRenderer();

      // Clamping camDistBuffer to be between minDistanceFromSatellite and maxZoomDistance
      this.camDistBuffer = <Kilometers>Math.min(
        Math.max(
          this.camDistBuffer,
          settingsManager.minDistanceFromSatellite,
        ),
        Math.max(
          settingsManager.nearZoomLevel,
          maxCovarianceDistance,
        ),
      );
    }
  }

  /**
   * Reset camera state to defaults
   * @param isHardReset - If true, also resets zoom level
   */
  reset(isHardReset = false): void {
    // Reset zoom
    if (isHardReset) {
      this.zoomLevel_ = 0.6925;
    }
    this.zoomTarget_ = 0.6925;
    this.isZoomIn = false;
    this.camZoomSnappedOnSat = false;
    this.camAngleSnappedOnSat = false;
    this.camDistBuffer = 0 as Kilometers;

    // Reset position
    this.position = [0, 0, 0];
    this.fpsPos_ = [0, 25000, 0];

    // Reset rotation
    this.camPitch = 0 as Radians;
    this.camPitchTarget = 0 as Radians;
    this.camPitchSpeed = 0;
    this.camYaw = 0 as Radians;
    this.camYawTarget = 0 as Radians;
    this.camYawSpeed = 0;
    this.camRotateSpeed = 0;

    // Reset FPS state
    this.fpsPitch = 0 as Degrees;
    this.fpsYaw = 0 as Degrees;
    this.fpsRotate = 0 as Degrees;
    this.fpsPitchRate = 0;
    this.fpsYawRate = 0;
    this.fpsRotateRate = 0;
    this.fpsForwardSpeed = 0;
    this.fpsSideSpeed = 0;
    this.fpsVertSpeed = 0;
    this.fpsRun = 1;
    this.isFPSForwardSpeedLock_ = false;
    this.isFPSSideSpeedLock_ = false;
    this.isFPSVertSpeedLock_ = false;

    // Reset local rotation
    this.isLocalRotateReset = !!isHardReset;
    this.isLocalRotateOverride = false;
    this.isLocalRotateRoll = false;
    this.isLocalRotateYaw = false;
    this.localRotateTarget = { pitch: 0 as Radians, roll: 0 as Radians, yaw: 0 as Radians };
    this.localRotateCurrent = { pitch: 0 as Radians, roll: 0 as Radians, yaw: 0 as Radians };
    this.localRotateDif = { pitch: 0 as Radians, roll: 0 as Radians, yaw: 0 as Radians };
    this.localRotateSpeed = { pitch: 0 as Radians, roll: 0 as Radians, yaw: 0 as Radians };
    this.localRotateStartPosition = { pitch: 0 as Radians, roll: 0 as Radians, yaw: 0 as Radians };

    // Reset pan
    this.isPanReset = false;
    this.isScreenPan = false;
    this.isWorldPan = false;
    this.panCurrent = { x: 0, y: 0, z: 0 };
    this.panSpeed = { x: 0, y: 0, z: 0 };
    this.panStartPosition = { x: 0, y: 0, z: 0 };
    this.panTarget_ = { x: 0, y: 0, z: 0 };
    this.panDif_ = { x: 0, y: 0, z: 0 };

    // Reset interaction
    this.isDragging = false;
    this.screenDragPoint = [0, 0];
    this.dragStartPitch = 0 as Radians;
    this.dragStartYaw = 0 as Radians;
    this.mouseX = 0;
    this.mouseY = 0;
    this.startMouseX = 0;
    this.startMouseY = 0;
    this.speedModifier = 1;
    this.isHoldingDownAKey = 1;
    this.isAutoPitchYawToTarget = !!isHardReset;
  }

  /**
   * Reset only rotation-related state
   */
  resetRotation(): void {
    this.isLocalRotateReset = true;
    this.ftsRotateReset = true;
  }

  resetPan(): void {
    if (this.isPanReset) {
      this.panTarget.x = 0;
      this.panTarget.y = 0;
      this.panTarget.z = 0;
      this.panDif.x = -this.panCurrent.x;
      this.panDif.y = this.panCurrent.y;
      this.panDif.z = this.panCurrent.z;
    }
  }

  /**
   * Clone the current state (useful for debugging or snapshots)
   */
  clone(): CameraState {
    const cloned = new CameraState();
    // Deep copy all properties

    Object.assign(cloned, JSON.parse(JSON.stringify(this)));
    // Restore vec3 arrays that got serialized
    cloned.position = [...this.position] as vec3;
    cloned.fpsPos_ = [...this.fpsPos_] as vec3;

    return cloned;
  }
}
