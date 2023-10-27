/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { CatalogManager, OrbitManager, SatObject, SatShader, SensorManager, Singletons, UiManager } from '@app/js/interfaces';
import { DEG2RAD, RADIUS_OF_EARTH, TAU, ZOOM_EXP } from '@app/js/lib/constants';
import { mat4, quat, vec3 } from 'gl-matrix';
import { Degrees, EciVec3, GreenwichMeanSiderealTime, Kilometers, Milliseconds, Radians } from 'ootk';
import { keepTrackContainer } from '../container';
import { keepTrackApi } from '../keepTrackApi';
import { SpaceObjectType } from '../lib/space-object-type';
import { alt2zoom, lat2pitch, lon2yaw, normalizeAngle } from '../lib/transforms';
import { SettingsManager } from '../settings/settings';
import { CoordinateTransforms } from '../static/coordinate-transforms';
import { LegendManager } from '../static/legend-manager';
import { SatMath } from '../static/sat-math';
import { DrawManager } from './draw-manager';
import { errorManagerInstance } from './errorManager';
import { InputManager } from './input-manager';
import { TimeManager } from './time-manager';

declare module '@app/js/interfaces' {
  interface SatShader {
    largeObjectMaxZoom: number;
    largeObjectMinZoom: number;
    maxAllowedSize: number;
    maxSize: number;
  }
  interface UserSettings {
    autoPanSpeed: {
      x: number;
      y: number;
    };
    autoRotateSpeed: number;
    cameraDecayFactor: number;
    cameraMovementSpeed: number;
    fieldOfView: number;
    fpsForwardSpeed: number;
    fpsSideSpeed: number;
    fpsVertSpeed: number;
    isMobileModeEnabled: boolean;
    maxZoomDistance: Kilometers;
    minZoomDistance: Kilometers;
    offsetCameraModeX: number;
    satShader: SatShader;
    zoomSpeed: number;
  }
}

export enum CameraType {
  CURRENT = 0,
  DEFAULT = 1,
  OFFSET = 2,
  FIXED_TO_SAT = 3,
  FPS = 4,
  PLANETARIUM = 5,
  SATELLITE = 6,
  ASTRONOMY = 7,
  MAX_CAMERA_TYPES = 8,
}

export type ZoomValue = 'leo' | 'geo';

export class Camera {
  private camYawTarget_ = <Radians>0;
  private chaseSpeed_ = 0.0035;
  private earthCenteredPitch_ = <Radians>0;
  private earthCenteredYaw_ = <Radians>0;
  private fpsLastTime_ = <Milliseconds>0;
  private fpsPos_ = <vec3>[0, 25000, 0];
  private ftsYaw_ = <Radians>0;
  private isAutoRotate_ = true;
  private isFPSForwardSpeedLock_ = false;
  private isFPSSideSpeedLock_ = false;
  private isFPSVertSpeedLock_ = false;
  private isRayCastingEarth_ = false;
  private localRotateMovementSpeed_ = 0.00005;
  private localRotateTarget_ = {
    pitch: <Radians>0,
    roll: <Radians>0,
    yaw: <Radians>0,
  };

  private normForward_ = vec3.create();
  private normLeft_ = vec3.create();
  private normUp_ = vec3.create();
  private panDif_ = {
    x: 0,
    y: 0,
    z: 0,
  };

  private panMovementSpeed_ = 0.5;
  private panTarget_ = {
    x: 0,
    y: 0,
    z: 0,
  };

  private yawErr_ = <Radians>0;
  /**
   * Percentage of the distance to maxZoomDistance from the minZoomDistance
   */
  private zoomLevel_ = 0.6925;
  private zoomTarget_ = 0.6925;

  public camAngleSnappedOnSat = false;
  public camMatrix = mat4.create().fill(0);
  /**
   * This was used when there was only one camera mode and the camera was always centered on the earth
   * It is the overall pitch of the camera?
   */
  public camPitch = <Radians>0;
  public camPitchSpeed = 0;
  public camPitchTarget = <Radians>0;
  public camRotateSpeed = 0;
  public camSnapToSat = {
    pos: {
      x: 0,
      y: 0,
      z: 0,
    },
    radius: 0,
    pitch: <Radians>0,
    yaw: <Radians>0,
    altitude: 0,
    camDistTarget: 0,
  };

  /**
   * This was used when there was only one camera mode and the camera was always centered on the earth
   * It is the overall yaw of the camera?
   */
  public camYaw = <Radians>0;
  public camYawSpeed = 0;
  public camZoomSnappedOnSat = false;
  public cameraType: CameraType = CameraType.DEFAULT;
  public dragStartPitch = <Radians>0;
  public dragStartYaw = <Radians>0;
  public earthCenteredLastZoom = 0.6925;
  public fpsForwardSpeed = 0;
  public fpsPitch = <Degrees>0;
  public fpsPitchRate = 0;
  public fpsRotate = <Degrees>0;
  public fpsRotateRate = 0;
  public fpsRun = 1;
  public fpsSideSpeed = 0;
  public fpsVertSpeed = 0;
  public fpsYaw = <Degrees>0;
  public fpsYawRate = 0;
  public ftsPitch = 0;
  public ftsRotateReset = true;
  public isAutoPitchYawToTarget = false;
  public isDragging = false;
  public isLocalRotateOverride = false;
  public isLocalRotateReset = true;
  public isLocalRotateRoll = false;
  public isLocalRotateYaw = false;
  public isPanReset = false;
  public isScreenPan = false;
  public isWorldPan = false;
  public isZoomIn = false;
  public localRotateCurrent = {
    pitch: <Radians>0,
    roll: <Radians>0,
    yaw: <Radians>0,
  };

  public localRotateDif = {
    pitch: <Radians>0,
    roll: <Radians>0,
    yaw: <Radians>0,
  };

  public localRotateSpeed = {
    pitch: 0,
    roll: 0,
    yaw: 0,
  };

  public localRotateStartPosition = {
    pitch: 0,
    roll: 0,
    yaw: 0,
  };

  public mouseX = 0;
  public mouseY = 0;
  public panCurrent = {
    x: 0,
    y: 0,
    z: 0,
  };

  public panSpeed = {
    x: 0,
    y: 0,
    z: 0,
  };

  public panStartPosition = {
    x: 0,
    y: 0,
    z: 0,
  };

  public position = <vec3>[0, 0, 0];
  public screenDragPoint = [0, 0];
  public settings_: SettingsManager;
  public speedModifier = 1;
  public startMouseX = 0;
  public startMouseY = 0;
  camDistBuffer = <Kilometers>0;

  constructor() {
    this.settings_ = <SettingsManager>(<unknown>{
      autoPanSpeed: 1,
      autoRotateSpeed: 0.0075,
      cameraDecayFactor: 0.0005,
      cameraMovementSpeed: 0.003,
      fieldOfView: 0.6,
      fpsForwardSpeed: 0.005,
      fpsSideSpeed: 0.005,
      fpsVertSpeed: 0.005,
      isMobileModeEnabled: false,
      maxZoomDistance: <Kilometers>100000,
      minZoomDistance: <Kilometers>(RADIUS_OF_EARTH + 50),
      offsetCameraModeX: 0.5,
      satShader: {
        largeObjectMaxZoom: 0.5,
        largeObjectMinZoom: 0.1,
        maxAllowedSize: 0.5,
        maxSize: 0.1,
      } as SatShader,
      zoomSpeed: 0.0005,
    });
  }

  public get zoomTarget(): number {
    return this.zoomTarget_;
  }

  public set zoomTarget(val: number) {
    // Clamp to [0.01, 1]
    val = Math.max(val, 0.01);
    val = Math.min(val, 1);

    this.zoomTarget_ = val;
  }

  /**
   * TODO: This should be moved to another class
   */
  public static earthHitTest(gl: WebGL2RenderingContext, pickingFrameBuffer: WebGLFramebuffer, pickReadPixelBuffer: Float32Array, x: number, y: number): boolean {
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickingFrameBuffer);
    gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickReadPixelBuffer);
    return pickReadPixelBuffer[0] === 0 && pickReadPixelBuffer[1] === 0 && pickReadPixelBuffer[2] === 0;
  }

  public autoRotate(val?: boolean): void {
    if (this.settings_.autoRotateSpeed === 0) this.settings_.autoRotateSpeed = 0.0075;

    if (typeof val == 'undefined') {
      this.isAutoRotate_ = !this.isAutoRotate_;
      return;
    }
    this.isAutoRotate_ = val;
  }

  public camSnap(pitch: Radians, yaw: Radians): void {
    // this.isPanReset = true
    this.camPitchTarget = pitch;
    this.camYawTarget_ = normalizeAngle(yaw);
    this.earthCenteredPitch_ = pitch;
    this.earthCenteredYaw_ = this.camYawTarget_; // Use the normalized yaw
    // if (this.earthCenteredYaw_ < 0) this.earthCenteredYaw_ = <Radians>(this.earthCenteredYaw_ + TAU);
    this.isAutoPitchYawToTarget = true;
  }

  public changeCameraType(orbitManager: OrbitManager) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

    if (this.cameraType === CameraType.PLANETARIUM) {
      orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
    }

    this.cameraType++;

    if (this.cameraType == CameraType.FIXED_TO_SAT && catalogManagerInstance.selectedSat == -1) {
      this.cameraType++;
    }
    if (this.cameraType == CameraType.FPS) {
      this.resetFpsPos_();
    }
    if (this.cameraType === CameraType.PLANETARIUM && (!catalogManagerInstance.isSensorManagerLoaded || !sensorManagerInstance.isSensorSelected())) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.SATELLITE && catalogManagerInstance.selectedSat === -1) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.ASTRONOMY && (!catalogManagerInstance.isSensorManagerLoaded || !sensorManagerInstance.isSensorSelected())) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.MAX_CAMERA_TYPES) {
      const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

      this.isLocalRotateReset = true;
      this.settings_.fieldOfView = 0.6;
      drawManagerInstance.glInit();
      if (catalogManagerInstance.selectedSat !== -1) {
        this.camZoomSnappedOnSat = true;
        this.cameraType = CameraType.FIXED_TO_SAT;
      } else {
        this.cameraType = CameraType.DEFAULT;
      }
    }
  }

  public thresholdForCloseCamera = <Kilometers>500;

  public zoomWheel(delta: number): void {
    if (delta < 0) {
      this.isZoomIn = true;
    } else {
      this.isZoomIn = false;
    }

    if (settingsManager.isZoomStopsRotation) {
      this.autoRotate(false);
    }

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    if (settingsManager.isZoomStopsSnappedOnSat || catalogManagerInstance.selectedSat == -1) {
      this.zoomTarget += delta / 100 / 50 / this.speedModifier; // delta is +/- 100
      this.earthCenteredLastZoom = this.zoomTarget_;
      this.camZoomSnappedOnSat = false;
    } else if (this.camDistBuffer < this.thresholdForCloseCamera || this.zoomLevel_ == -1) {
      // Zooming Out
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
      this.camDistBuffer = <Kilometers>(this.camDistBuffer + delta / 15); // delta is +/- 100
      this.camDistBuffer = <Kilometers>Math.min(Math.max(this.camDistBuffer, this.settings_.minDistanceFromSatellite), this.thresholdForCloseCamera);
    } else if (this.camDistBuffer >= this.thresholdForCloseCamera) {
      // Zooming In
      settingsManager.selectedColor = [0, 0, 0, 0];
      this.zoomTarget += delta / 100 / 50 / this.speedModifier; // delta is +/- 100
      this.earthCenteredLastZoom = this.zoomTarget;
      this.camZoomSnappedOnSat = false;

      // calculate camera distance from target
      const target = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
      const satAlt = SatMath.getAlt(target.position, SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj).gmst);
      const curMinZoomLevel = alt2zoom(satAlt, this.settings_.minZoomDistance, this.settings_.maxZoomDistance, this.settings_.minDistanceFromSatellite);

      if (this.zoomTarget < this.zoomLevel_ && this.zoomTarget < curMinZoomLevel) {
        this.camZoomSnappedOnSat = true;
        this.camDistBuffer = <Kilometers>Math.min(Math.max(this.camDistBuffer, this.thresholdForCloseCamera), this.settings_.minDistanceFromSatellite);
      }
    }

    this.zoomWheelFov_(delta);
  }

  private zoomWheelFov_(delta: number) {
    if (this.cameraType === CameraType.PLANETARIUM || this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      settingsManager.fieldOfView += delta * 0.0002;
      // getEl('fov-text').innerHTML = 'FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg';
      if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
      if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) settingsManager.fieldOfView = settingsManager.fieldOfViewMin;
      const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
      drawManagerInstance.glInit();
    }
  }

  public changeZoom(zoom: ZoomValue | number): void {
    if (zoom === 'geo') {
      this.zoomTarget = 0.82;
      return;
    }
    if (zoom === 'leo') {
      this.zoomTarget = 0.45;
      return;
    }
    if (typeof zoom !== 'number') throw new Error('Invalid Zoom Value');
    if (zoom > 1 || zoom < 0) throw new Error('Invalid Zoom Value');
    this.zoomTarget = zoom;
  }

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  public draw(target: SatObject, sensorPos?: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number }) {
    target ??= <SatObject>{
      id: -1,
      missile: false,
      type: SpaceObjectType.UNKNOWN,
      static: false,
    };

    let gmst: GreenwichMeanSiderealTime;
    if (!sensorPos?.gmst) {
      const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
      gmst = sensorPos?.gmst ?? SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;
    } else {
      gmst = sensorPos.gmst;
    }

    this.drawPreValidate_(sensorPos);
    mat4.identity(this.camMatrix);

    // Ensure we don't zoom in past our satellite
    if (this.cameraType == CameraType.FIXED_TO_SAT) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        this.cameraType = CameraType.DEFAULT;
      } else {
        const satAlt = SatMath.getAlt(target.position, gmst);
        if (this.getCameraDistance() < satAlt + RADIUS_OF_EARTH + this.settings_.minDistanceFromSatellite) {
          this.zoomTarget = alt2zoom(satAlt, this.settings_.minZoomDistance, this.settings_.maxZoomDistance, this.settings_.minDistanceFromSatellite);
          // errorManagerInstance.debug('Zooming in to ' + this.zoomTarget_ + ' to because we are too close to the satellite');
          this.zoomLevel_ = this.zoomTarget_;
        }
      }
    }

    if (this.cameraType == CameraType.SATELLITE) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        this.cameraType = CameraType.DEFAULT;
      }
    }

    const targetPosition = target.id !== -1 ? vec3.fromValues(-target.position?.x, -target.position?.y, -target.position?.z) : vec3.fromValues(0, 0, 0);
    /*
     * For FPS style movement rotate the this and then translate it
     * for traditional view, move the this and then rotate it
     */
    switch (this.cameraType) {
      case CameraType.DEFAULT: // pivot around the earth with earth in the center
        this.drawFixedToEarth_();
        break;
      case CameraType.OFFSET: // pivot around the earth with earth offset to the bottom right
        this.drawOffsetOfEarth_();
        break;
      case CameraType.FIXED_TO_SAT: // Pivot around the satellite
        this.drawFixedToSatellite_(target, targetPosition);
        break;
      case CameraType.FPS: // FPS style movement
        this.drawFirstPersonView_();
        break;
      case CameraType.PLANETARIUM: {
        // Pitch is the opposite of the angle to the latitude
        // Yaw is 90 degrees to the left of the angle to the longitude
        this.drawPlanetarium_(sensorPos);
        break;
      }
      case CameraType.SATELLITE: {
        this.drawSatellite_(target);
        break;
      }
      case CameraType.ASTRONOMY: {
        // Pitch is the opposite of the angle to the latitude
        // Yaw is 90 degrees to the left of the angle to the longitude
        this.drawAstronomy_(sensorPos);
        break;
      }
    }
  }

  public exitFixedToSat(): void {
    if (this.cameraType !== CameraType.FIXED_TO_SAT) return;

    const cameraDistance = this.getCameraDistance();
    this.ftsRotateReset = true;

    // If within 9000km then we want to move further back to feel less jarring
    if (cameraDistance > 9000) {
      this.cameraType = CameraType.DEFAULT;

      this.zoomTarget = this.getZoomFromDistance(cameraDistance) + 0.005;
      this.camPitch = this.earthCenteredPitch_;
      this.camYaw = this.earthCenteredYaw_;
      this.isAutoPitchYawToTarget = true;

      // this.camPitch = this.earthCenteredPitch_;
      // this.camYaw = this.earthCenteredYaw_;
      // // External to Local Rotation
      // this.localRotateCurrent.pitch = <Radians>(this.ftsPitch * -1);
      // this.localRotateCurrent.yaw = <Radians>(this.ftsYaw_ * -1);
      // this.isLocalRotateReset = true;
    } else {
      this.camPitch = this.earthCenteredPitch_;
      this.camYaw = this.earthCenteredYaw_;
      this.zoomTarget = this.getZoomFromDistance(cameraDistance) + 0.15;
    }
  }

  public getZoomFromDistance(distance: Kilometers): number {
    return Math.pow((distance - this.settings_.minZoomDistance) / (this.settings_.maxZoomDistance - this.settings_.minZoomDistance), 1 / ZOOM_EXP);
  }

  /**
   * Calculates the zoom distance based on the zoom level
   *
   * Zoom level is ALWAYS raised to the power of ZOOM_EXP to ensure that zooming out is faster than zooming in
   * TODO: This should be handled before getting the zoomLevel_ value
   */
  public getCameraDistance(): Kilometers {
    return <Kilometers>(Math.pow(this.zoomLevel_, ZOOM_EXP) * (this.settings_.maxZoomDistance - this.settings_.minZoomDistance) + this.settings_.minZoomDistance);
  }

  /**
   * Calculates the ECI of the Camera based on the camMatrix
   *
   * Used in RayCasting
   */
  public getCamPos(): vec3 {
    vec3.transformMat4(this.position, this.position, this.camMatrix);
    return this.position;
  }

  public getDistFromEarth(): Kilometers {
    const position = this.getCamPos();
    return <Kilometers>Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
  }

  /**
   * This is the direction the camera is facing
   */
  getCameraOrientation() {
    if (this.cameraType === CameraType.FIXED_TO_SAT) {
      const xRot = Math.sin(-this.ftsYaw_) * Math.cos(this.ftsPitch);
      const yRot = Math.cos(this.ftsYaw_) * Math.cos(this.ftsPitch);
      const zRot = Math.sin(-this.ftsPitch);
      return vec3.fromValues(xRot, yRot, zRot);
    }
    if (this.cameraType === CameraType.DEFAULT) {
      const xRot = Math.sin(-this.camYaw) * Math.cos(this.camPitch);
      const yRot = Math.cos(this.camYaw) * Math.cos(this.camPitch);
      const zRot = Math.sin(-this.camPitch);
      return vec3.fromValues(xRot, yRot, zRot);
    }
    return vec3.fromValues(0, 0, 0);
  }

  getCameraPosition(target?: EciVec3, orientation: vec3 = this.getCameraOrientation()) {
    const centerOfEarth = vec3.fromValues(0, 0, 0);

    const radius = this.getCameraRadius(target);
    return vec3.fromValues(centerOfEarth[0] - orientation[0] * radius, centerOfEarth[1] - orientation[1] * radius, centerOfEarth[2] - orientation[2] * radius);
  }

  getCameraRadius(target?: EciVec3) {
    let targetDistanceFromEarth = 0;
    if (target) {
      const { gmst } = SatMath.calculateTimeVariables(keepTrackApi.getTimeManager().simulationTimeObj);
      this.camSnapToSat.altitude = SatMath.getAlt(target, gmst);
      targetDistanceFromEarth = this.camSnapToSat.altitude + RADIUS_OF_EARTH;
    }
    const radius = this.getCameraDistance() - targetDistanceFromEarth;
    return radius;
  }

  public getForwardVector(): vec3 {
    const inverted = mat4.create();
    const forward = vec3.create();

    mat4.invert(inverted, this.camMatrix);
    vec3.transformMat4(forward, forward, inverted);

    return forward;
  }

  public init(settings: SettingsManager) {
    this.settings_ = settings;

    const inputManager = keepTrackContainer.get<InputManager>(Singletons.InputManager);
    const keysDown = ['Shift', 'ShiftRight', 'W', 'A', 'S', 'D', 'I', 'J', 'K', 'L', 'Q', 'E', 'R', 'C'];
    keysDown.forEach((key) => {
      inputManager.keyboard.registerKeyDownEvent({
        key,
        callback: this[`keyDown${key}_`].bind(this),
      });
    });
    const keysUp = ['Shift', 'ShiftRight', 'W', 'A', 'S', 'D', 'I', 'J', 'K', 'L', 'Q', 'E'];
    keysUp.forEach((key) => {
      inputManager.keyboard.registerKeyUpEvent({
        key,
        callback: this[`keyUp${key}_`].bind(this),
      });
    });
  }

  public keyDownC_() {
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);

    this.changeCameraType(orbitManagerInstance);

    switch (this.cameraType) {
      case CameraType.DEFAULT:
        uiManagerInstance.toast('Earth Centered Camera Mode', 'standby');
        this.zoomTarget = 0.5;
        break;
      case CameraType.OFFSET:
        uiManagerInstance.toast('Offset Camera Mode', 'standby');
        break;
      case CameraType.FPS:
        uiManagerInstance.toast('Free Camera Mode', 'standby');
        break;
      case CameraType.PLANETARIUM:
        uiManagerInstance.toast('Planetarium Camera Mode', 'standby');
        LegendManager.change('planetarium');
        break;
      case CameraType.SATELLITE:
        uiManagerInstance.toast('Satellite Camera Mode', 'standby');
        break;
      case CameraType.ASTRONOMY:
        uiManagerInstance.toast('Astronomy Camera Mode', 'standby');
        LegendManager.change('astronomy');
        break;
    }
  }

  public keyDownA_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsSideSpeed = -settingsManager.fpsSideSpeed;
      this.isFPSSideSpeedLock_ = true;
    }
  }

  public keyDownD_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsSideSpeed = settingsManager.fpsSideSpeed;
      this.isFPSSideSpeedLock_ = true;
    }
  }

  public keyDownE_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsVertSpeed = settingsManager.fpsVertSpeed;
      this.isFPSVertSpeedLock_ = true;
    }
    if (this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      this.fpsRotateRate = -settingsManager.fpsRotateRate / this.speedModifier;
    }
  }

  public keyDownI_() {
    if (this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      this.fpsPitchRate = settingsManager.fpsPitchRate / this.speedModifier;
    }
  }

  public keyDownJ_() {
    if (this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE) {
      this.fpsYawRate = -settingsManager.fpsYawRate / this.speedModifier;
    }
    if (this.cameraType === CameraType.ASTRONOMY) {
      this.fpsRotateRate = settingsManager.fpsRotateRate / this.speedModifier;
    }
  }

  public keyDownK_() {
    if (this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      this.fpsPitchRate = -settingsManager.fpsPitchRate / this.speedModifier;
    }
  }

  public keyDownL_() {
    if (this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE) {
      this.fpsYawRate = settingsManager.fpsYawRate / this.speedModifier;
    }
    if (this.cameraType === CameraType.ASTRONOMY) {
      this.fpsRotateRate = -settingsManager.fpsRotateRate / this.speedModifier;
    }
  }

  public keyDownQ_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsVertSpeed = -settingsManager.fpsVertSpeed;
      this.isFPSVertSpeedLock_ = true;
    }
    if (this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      this.fpsRotateRate = settingsManager.fpsRotateRate / this.speedModifier;
    }
  }

  public keyDownR_() {
    this.autoRotate();
  }

  public keyDownS_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
      this.isFPSForwardSpeedLock_ = true;
    }
  }

  public keyDownShiftRight_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsRun = 3;
    }
  }

  public keyDownShift_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsRun = 0.05;
    }
    this.speedModifier = 8;
    settingsManager.cameraMovementSpeed = 0.003 / 8;
    settingsManager.cameraMovementSpeedMin = 0.005 / 8;
  }

  public keyDownW_() {
    if (this.cameraType === CameraType.FPS) {
      this.fpsForwardSpeed = settingsManager.fpsForwardSpeed;
      this.isFPSForwardSpeedLock_ = true;
    }
  }

  public keyUpA_() {
    if (this.fpsSideSpeed === -settingsManager.fpsSideSpeed) {
      this.isFPSSideSpeedLock_ = false;
    }
  }

  public keyUpD_() {
    if (this.fpsSideSpeed === settingsManager.fpsSideSpeed) {
      this.isFPSSideSpeedLock_ = false;
    }
  }

  public keyUpE_() {
    if (this.fpsVertSpeed === settingsManager.fpsVertSpeed) {
      this.isFPSVertSpeedLock_ = false;
    }
    this.fpsRotateRate = 0;
  }

  public keyUpI_() {
    this.fpsPitchRate = 0;
  }

  // Intentionally the same as keyUpI_
  public keyUpK_() {
    this.fpsPitchRate = 0;
  }

  public keyUpJ_() {
    if (this.cameraType === CameraType.ASTRONOMY) {
      this.fpsRotateRate = 0;
    } else {
      this.fpsYawRate = 0;
    }
  }

  // Intentionally the same as keyUpJ_
  public keyUpL_() {
    if (this.cameraType === CameraType.ASTRONOMY) {
      this.fpsRotateRate = 0;
    } else {
      this.fpsYawRate = 0;
    }
  }

  public keyUpQ_() {
    if (this.fpsVertSpeed === -settingsManager.fpsVertSpeed) {
      this.isFPSVertSpeedLock_ = false;
    }
    this.fpsRotateRate = 0;
  }

  public keyUpS_() {
    if (this.fpsForwardSpeed === -settingsManager.fpsForwardSpeed) {
      this.isFPSForwardSpeedLock_ = false;
    }
  }

  public keyUpShiftRight_() {
    this.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    this.speedModifier = 1;
  }

  public keyUpShift_() {
    this.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    this.speedModifier = 1;
    if (!this.isFPSForwardSpeedLock_) this.fpsForwardSpeed = 0;
    if (!this.isFPSSideSpeedLock_) this.fpsSideSpeed = 0;
    if (!this.isFPSVertSpeedLock_) this.fpsVertSpeed = 0;
  }

  public keyUpW_() {
    if (this.fpsForwardSpeed === settingsManager.fpsForwardSpeed) {
      this.isFPSForwardSpeedLock_ = false;
    }
  }

  public lookAtLatLon(lat: Degrees, lon: Degrees, zoom?: ZoomValue | number, date = keepTrackApi.getTimeManager().simulationTimeObj): void {
    // Setup some defaults if they aren't passed in
    zoom ??= <ZoomValue>'leo';

    // Convert the lat/long to a position on the globe and then set the this to look at that position
    this.changeZoom(zoom);
    this.camSnap(lat2pitch(lat), lon2yaw(lon, date));
  }

  public lookAtPosition(pos: EciVec3, isFaceEarth: boolean, selectedDate: Date): void {
    const lla = CoordinateTransforms.eci2lla(pos, selectedDate);
    const latModifier = isFaceEarth ? 1 : -1;
    const lonModifier = isFaceEarth ? 0 : 180;
    this.camSnap(lat2pitch(<Degrees>(lla.lat * latModifier)), lon2yaw(<Degrees>(lla.lon + lonModifier), selectedDate));
  }

  public setCameraType(val: CameraType) {
    if (typeof val !== 'number') throw new TypeError();
    if (val > 6 || val < 0) throw new RangeError();

    this.cameraType = val;
    this.resetFpsPos_();
  }

  /**
   * camera function runs every frame that a satellite is selected. However, the user might have broken out of the zoom snap or angle snap. If so, don't change those targets.
   *
   * This is intentionally complex to reduce object creation and GC.
   *
   * Splitting it into subfunctions would not be optimal
   */
  public snapToSat(sat: SatObject, simulationTime: Date) {
    if (typeof sat === 'undefined' || sat === null || sat.static) return;

    if (!sat.position) throw new Error('Satellite position is undefined');

    if (this.camAngleSnappedOnSat) {
      this.camSnapToSat.pos = sat.position;
      this.camSnapToSat.radius = Math.sqrt(this.camSnapToSat.pos.x ** 2 + this.camSnapToSat.pos.y ** 2);
      this.camSnapToSat.yaw = <Radians>(Math.atan2(this.camSnapToSat.pos.y, this.camSnapToSat.pos.x) + TAU / 4);
      this.camSnapToSat.pitch = <Radians>Math.atan2(this.camSnapToSat.pos.z, this.camSnapToSat.radius);
      if (!this.camSnapToSat.pitch) {
        errorManagerInstance.info('Pitch Calculation Error');
        this.camSnapToSat.pitch = <Radians>0;
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }
      if (!this.camSnapToSat.yaw) {
        errorManagerInstance.info('Yaw Calculation Error');
        this.camSnapToSat.yaw = <Radians>0;
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }
      if (this.cameraType === CameraType.PLANETARIUM) {
        // camSnap(-pitch, -yaw)
      } else {
        this.camSnap(this.camSnapToSat.pitch, this.camSnapToSat.yaw);
      }
    }

    if (this.camZoomSnappedOnSat && !this.settings_.isAutoZoomIn && !this.settings_.isAutoZoomOut) {
      if (!sat.static && sat.active) {
        // if this is a satellite not a missile
        const { gmst } = SatMath.calculateTimeVariables(simulationTime);
        this.camSnapToSat.altitude = SatMath.getAlt(sat.position, gmst);
      }
      if (this.camSnapToSat.altitude) {
        this.camSnapToSat.camDistTarget = this.camSnapToSat.altitude + RADIUS_OF_EARTH + this.camDistBuffer;
      } else {
        this.camSnapToSat.camDistTarget = RADIUS_OF_EARTH + this.camDistBuffer; // Stay out of the center of the earth. You will get stuck there.
        errorManagerInstance.info(`Zoom Calculation Error: ${this.camSnapToSat.altitude} -- ${this.camSnapToSat.camDistTarget}`);
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }

      this.camSnapToSat.camDistTarget = this.camSnapToSat.camDistTarget < this.settings_.minZoomDistance ? this.settings_.minZoomDistance + 10 : this.camSnapToSat.camDistTarget;

      this.zoomTarget = Math.pow(
        (this.camSnapToSat.camDistTarget - this.settings_.minZoomDistance) / (this.settings_.maxZoomDistance - this.settings_.minZoomDistance),
        1 / ZOOM_EXP
      );
      settingsManager.selectedColor = [0, 0, 0, 0];
      // errorManagerInstance.debug(`Zoom Target: ${this.zoomTarget_}`);
      this.earthCenteredLastZoom = this.zoomTarget_ + 0.1;

      // Only Zoom in Once on Mobile
      if (this.settings_.isMobileModeEnabled) this.camZoomSnappedOnSat = false;
    }

    this.updateSatShaderSizes();

    if (this.cameraType === CameraType.PLANETARIUM) {
      this.zoomTarget = 0.01;
    }
  }

  /**
   * Calculate the camera's position and camera matrix
   */
  public update(dt: Milliseconds) {
    this.updatePan_(dt);
    this.updateLocalRotation_(dt);
    this.updatePitchYawSpeeds_(dt);
    this.updateFtsRotation_(dt);

    this.camRotateSpeed -= this.camRotateSpeed * dt * this.settings_.cameraMovementSpeed;

    if (this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      this.updateFpsMovement_(dt);
    } else {
      if (this.camPitchSpeed !== 0) {
        this.camPitch = <Radians>(this.camPitch + this.camPitchSpeed * dt);
      }
      if (this.camYawSpeed !== 0) {
        this.camYaw = <Radians>(this.camYaw + this.camYawSpeed * dt);
      }
      if (this.camRotateSpeed !== 0) {
        this.fpsRotate = <Degrees>(this.fpsRotate + this.camRotateSpeed * dt);
      }
    }

    if (this.isAutoRotate_) {
      if (this.settings_.isAutoRotateL) {
        this.camYaw = <Radians>(this.camYaw - this.settings_.autoRotateSpeed * dt);
      }
      if (this.settings_.isAutoRotateR) {
        this.camYaw = <Radians>(this.camYaw + this.settings_.autoRotateSpeed * dt);
      }
      if (this.settings_.isAutoRotateU) {
        this.camPitch = <Radians>(this.camPitch - (this.settings_.autoRotateSpeed / 2) * dt);
      }
      if (this.settings_.isAutoRotateD) {
        this.camPitch = <Radians>(this.camPitch + (this.settings_.autoRotateSpeed / 2) * dt);
      }
    }

    this.updateZoom_(dt);

    this.updateCameraSnapMode(dt);

    if (this.cameraType !== CameraType.FIXED_TO_SAT) {
      if (this.camPitch > TAU / 4) this.camPitch = <Radians>(TAU / 4);
      if (this.camPitch < -TAU / 4) this.camPitch = <Radians>(-TAU / 4);
    }

    if (this.camYaw > TAU) this.camYaw = <Radians>(this.camYaw - TAU);
    if (this.camYaw < 0) this.camYaw = <Radians>(this.camYaw + TAU);

    if (this.cameraType == CameraType.DEFAULT || this.cameraType == CameraType.OFFSET) {
      this.earthCenteredPitch_ = this.camPitch;
      this.earthCenteredYaw_ = this.camYaw;
      if (this.earthCenteredYaw_ < 0) this.earthCenteredYaw_ = <Radians>(this.earthCenteredYaw_ + TAU);
    }
  }

  public zoomLevel(): number {
    return this.zoomLevel_;
  }

  private drawAstronomy_(sensorPos: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number }) {
    this.fpsPitch = <Degrees>(-1 * sensorPos.lat * DEG2RAD);

    const sensorPosU = vec3.fromValues(-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01);
    this.fpsPos_[0] = sensorPos.x;
    this.fpsPos_[1] = sensorPos.y;
    this.fpsPos_[2] = sensorPos.z;

    mat4.rotate(this.camMatrix, this.camMatrix, this.fpsPitch + -this.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsRotate * DEG2RAD, [0, 1, 0]);
    vec3.normalize(this.normUp_, sensorPosU);
    mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsYaw * DEG2RAD, this.normUp_);

    mat4.translate(this.camMatrix, this.camMatrix, [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01]);

    // const q = quat.create();
    // const newrot = mat4.create();
    // quat.fromEuler(q, this.ftsPitch * RAD2DEG, 0, -this.ftsYaw_ * RAD2DEG);
    // mat4.fromQuat(newrot, q);
    // mat4.multiply(this.camMatrix, newrot, this.camMatrix);
  }

  private drawFixedToEarth_() {
    // 4. Rotate the camera around the new local origin
    mat4.rotateX(this.camMatrix, this.camMatrix, -this.localRotateCurrent.pitch);
    mat4.rotateY(this.camMatrix, this.camMatrix, -this.localRotateCurrent.roll);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.localRotateCurrent.yaw);

    // 3. Adjust for panning
    mat4.translate(this.camMatrix, this.camMatrix, [this.panCurrent.x, this.panCurrent.y, this.panCurrent.z]);

    // 2. Back away from the earth in the Y direction (depth)
    mat4.translate(this.camMatrix, this.camMatrix, [0, this.getCameraDistance(), 0]);
    // 1. Rotate around the earth (0,0,0)
    mat4.rotateX(this.camMatrix, this.camMatrix, this.earthCenteredPitch_);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.earthCenteredYaw_);
  }

  private drawFirstPersonView_() {
    // Rotate the camera
    mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.camMatrix, this.camMatrix, this.fpsYaw * DEG2RAD, [0, 0, 1]);
    // Move the camera to the FPS position
    mat4.translate(this.camMatrix, this.camMatrix, [this.fpsPos_[0], this.fpsPos_[1], -this.fpsPos_[2]]);
  }

  private drawFixedToSatellite_(target: SatObject, targetPosition: vec3) {
    // mat4 commands are run in reverse order
    // 1. Move to the satellite position
    // 2. Twist the camera around Z-axis
    // 3. Pitch the camera around X-axis (this may have moved because of the Z-axis rotation)
    // 4. Back away from the satellite
    // 5. Adjust for panning
    // 6. Rotate the camera FPS style
    mat4.rotateX(this.camMatrix, this.camMatrix, -this.localRotateCurrent.pitch);
    mat4.rotateY(this.camMatrix, this.camMatrix, -this.localRotateCurrent.roll);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.localRotateCurrent.yaw);

    mat4.translate(this.camMatrix, this.camMatrix, [this.panCurrent.x, this.panCurrent.y, this.panCurrent.z]);

    mat4.translate(this.camMatrix, this.camMatrix, [0, this.getCameraRadius(target.position), 0]);

    mat4.rotateX(this.camMatrix, this.camMatrix, this.ftsPitch);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.ftsYaw_);

    mat4.translate(this.camMatrix, this.camMatrix, targetPosition);
  }

  private drawOffsetOfEarth_() {
    // Rotate the camera
    mat4.rotateX(this.camMatrix, this.camMatrix, -this.localRotateCurrent.pitch);
    mat4.rotateY(this.camMatrix, this.camMatrix, -this.localRotateCurrent.roll);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.localRotateCurrent.yaw);
    // Adjust for panning
    mat4.translate(this.camMatrix, this.camMatrix, [this.panCurrent.x, this.panCurrent.y, this.panCurrent.z]);
    // Back away from the earth
    mat4.translate(this.camMatrix, this.camMatrix, [this.settings_.offsetCameraModeX, this.getCameraDistance(), this.settings_.offsetCameraModeZ]);
    // Adjust for FPS style rotation
    mat4.rotateX(this.camMatrix, this.camMatrix, this.earthCenteredPitch_);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.earthCenteredYaw_);
  }

  private drawPlanetarium_(sensorPos: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number }) {
    this.fpsPitch = <Degrees>(-1 * sensorPos.lat * DEG2RAD);
    this.fpsRotate = <Degrees>((90 - sensorPos.lon) * DEG2RAD - sensorPos.gmst);
    mat4.rotate(this.camMatrix, this.camMatrix, this.fpsPitch, [1, 0, 0]);
    mat4.rotate(this.camMatrix, this.camMatrix, this.fpsRotate, [0, 0, 1]);
    mat4.translate(this.camMatrix, this.camMatrix, [-sensorPos.x, -sensorPos.y, -sensorPos.z]);
  }

  private drawPreValidate_(sensorPos: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number }) {
    if (
      Number.isNaN(this.camPitch) ||
      Number.isNaN(this.camYaw) ||
      Number.isNaN(this.camPitchTarget) ||
      Number.isNaN(this.camYawTarget_) ||
      Number.isNaN(this.zoomLevel_) ||
      Number.isNaN(this.zoomTarget_)
    ) {
      try {
        errorManagerInstance.debug(`camPitch: ${this.camPitch}`);
        errorManagerInstance.debug(`camYaw: ${this.camYaw}`);
        errorManagerInstance.debug(`camPitchTarget: ${this.camPitchTarget}`);
        errorManagerInstance.debug(`camYawTarget: ${this.camYawTarget_}`);
        errorManagerInstance.debug(`zoomLevel: ${this.zoomLevel_}`);
        errorManagerInstance.debug(`_zoomTarget: ${this.zoomTarget_}`);
        errorManagerInstance.debug(`this.settings_.cameraMovementSpeed: ${this.settings_.cameraMovementSpeed}`);
      } catch (e) {
        errorManagerInstance.info('Camera Math Error');
      }
      this.camPitch = <Radians>0.5;
      this.camYaw = <Radians>0.5;
      this.zoomLevel_ = 0.5;
      this.camPitchTarget = <Radians>0;
      this.camYawTarget_ = <Radians>0;
      this.zoomTarget = 0.5;
    }

    if (!sensorPos && (this.cameraType == CameraType.PLANETARIUM || this.cameraType == CameraType.ASTRONOMY)) {
      this.cameraType = CameraType.DEFAULT;
      errorManagerInstance.debug('A sensor should be selected first if this mode is allowed to be planetarium or astronmy.');
    }
  }

  private drawSatellite_(target: SatObject) {
    const targetPositionTemp = vec3.fromValues(-target.position.x, -target.position.y, -target.position.z);
    mat4.translate(this.camMatrix, this.camMatrix, targetPositionTemp);
    vec3.normalize(this.normUp_, targetPositionTemp);
    vec3.normalize(this.normForward_, [target.velocity.x, target.velocity.y, target.velocity.z]);
    vec3.transformQuat(this.normLeft_, this.normUp_, quat.fromValues(this.normForward_[0], this.normForward_[1], this.normForward_[2], 90 * DEG2RAD));
    const targetNextPosition = vec3.fromValues(target.position.x + target.velocity.x, target.position.y + target.velocity.y, target.position.z + target.velocity.z);
    mat4.lookAt(this.camMatrix, targetNextPosition, targetPositionTemp, this.normUp_);

    mat4.translate(this.camMatrix, this.camMatrix, [target.position.x, target.position.y, target.position.z]);

    mat4.rotate(this.camMatrix, this.camMatrix, this.fpsPitch * DEG2RAD, this.normLeft_);
    mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsYaw * DEG2RAD, this.normUp_);

    mat4.translate(this.camMatrix, this.camMatrix, targetPositionTemp);
  }

  private resetFpsPos_(): void {
    this.fpsPitch = <Degrees>0;
    this.fpsYaw = <Degrees>0;
    this.fpsPos_[0] = 0;

    // Move out from the center of the Earth in FPS Mode
    if (this.cameraType == CameraType.FPS) {
      this.fpsPos_[1] = 25000;
    } else {
      this.fpsPos_[1] = 0;
    }
    this.fpsPos_[2] = 0;
  }

  private updateCameraSnapMode(dt: Milliseconds) {
    if (this.isAutoPitchYawToTarget) {
      this.camPitch = <Radians>(this.camPitch + (this.camPitchTarget - this.camPitch) * this.chaseSpeed_ * dt);

      this.yawErr_ = normalizeAngle(<Radians>(this.camYawTarget_ - this.camYaw));
      this.camYaw = <Radians>(this.camYaw + this.yawErr_ * this.chaseSpeed_ * dt);
    }
  }

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  private updateFpsMovement_(dt: Milliseconds): void {
    this.fpsPitch = <Degrees>(this.fpsPitch - 20 * this.camPitchSpeed * dt);
    this.fpsYaw = <Degrees>(this.fpsYaw - 20 * this.camYawSpeed * dt);
    this.fpsRotate = <Degrees>(this.fpsRotate - 20 * this.camRotateSpeed * dt);

    // Prevent Over Rotation
    if (this.fpsPitch > 90) this.fpsPitch = <Degrees>90;
    if (this.fpsPitch < -90) this.fpsPitch = <Degrees>-90;
    if (this.fpsRotate > 360) this.fpsRotate = <Degrees>(this.fpsRotate - 360);
    if (this.fpsRotate < 0) this.fpsRotate = <Degrees>(this.fpsRotate + 360);
    if (this.fpsYaw > 360) this.fpsYaw = <Degrees>(this.fpsYaw - 360);
    if (this.fpsYaw < 0) this.fpsYaw = <Degrees>(this.fpsYaw + 360);

    const fpsTimeNow = <Milliseconds>Date.now();
    if (this.fpsLastTime_ !== 0) {
      const fpsElapsed = <Milliseconds>(fpsTimeNow - this.fpsLastTime_);

      if (this.isFPSForwardSpeedLock_ && this.fpsForwardSpeed < 0) {
        this.fpsForwardSpeed = Math.max(this.fpsForwardSpeed + Math.min(this.fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -this.settings_.fpsForwardSpeed);
      } else if (this.isFPSForwardSpeedLock_ && this.fpsForwardSpeed > 0) {
        this.fpsForwardSpeed = Math.min(this.fpsForwardSpeed + Math.max(this.fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), this.settings_.fpsForwardSpeed);
      }

      if (this.isFPSSideSpeedLock_ && this.fpsSideSpeed < 0) {
        this.fpsSideSpeed = Math.max(this.fpsSideSpeed + Math.min(this.fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -this.settings_.fpsSideSpeed);
      } else if (this.isFPSSideSpeedLock_ && this.fpsSideSpeed > 0) {
        this.fpsSideSpeed = Math.min(this.fpsSideSpeed + Math.max(this.fpsSideSpeed * 1.02 * fpsElapsed, 0.2), this.settings_.fpsSideSpeed);
      }

      if (this.isFPSVertSpeedLock_ && this.fpsVertSpeed < 0) {
        this.fpsVertSpeed = Math.max(this.fpsVertSpeed + Math.min(this.fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -this.settings_.fpsVertSpeed);
      } else if (this.isFPSVertSpeedLock_ && this.fpsVertSpeed > 0) {
        this.fpsVertSpeed = Math.min(this.fpsVertSpeed + Math.max(this.fpsVertSpeed * 1.02 * fpsElapsed, 0.2), this.settings_.fpsVertSpeed);
      }

      if (this.cameraType === CameraType.FPS) {
        if (this.fpsForwardSpeed !== 0) {
          this.fpsPos_[0] -= Math.sin(this.fpsYaw * DEG2RAD) * this.fpsForwardSpeed * this.fpsRun * fpsElapsed;
          this.fpsPos_[1] -= Math.cos(this.fpsYaw * DEG2RAD) * this.fpsForwardSpeed * this.fpsRun * fpsElapsed;
          this.fpsPos_[2] += Math.sin(this.fpsPitch * DEG2RAD) * this.fpsForwardSpeed * this.fpsRun * fpsElapsed;
        }
        if (this.fpsVertSpeed !== 0) {
          this.fpsPos_[2] -= this.fpsVertSpeed * this.fpsRun * fpsElapsed;
        }
        if (this.fpsSideSpeed !== 0) {
          this.fpsPos_[0] -= Math.cos(-this.fpsYaw * DEG2RAD) * this.fpsSideSpeed * this.fpsRun * fpsElapsed;
          this.fpsPos_[1] -= Math.sin(-this.fpsYaw * DEG2RAD) * this.fpsSideSpeed * this.fpsRun * fpsElapsed;
        }
      }

      if (!this.isFPSForwardSpeedLock_) this.fpsForwardSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      if (!this.isFPSSideSpeedLock_) this.fpsSideSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      if (!this.isFPSVertSpeedLock_) this.fpsVertSpeed *= Math.min(0.98 * fpsElapsed, 0.98);

      if (this.fpsForwardSpeed < 0.01 && this.fpsForwardSpeed > -0.01) this.fpsForwardSpeed = 0;
      if (this.fpsSideSpeed < 0.01 && this.fpsSideSpeed > -0.01) this.fpsSideSpeed = 0;
      if (this.fpsVertSpeed < 0.01 && this.fpsVertSpeed > -0.01) this.fpsVertSpeed = 0;

      this.fpsPitch = <Degrees>(this.fpsPitch + this.fpsPitchRate * fpsElapsed);
      this.fpsRotate = <Degrees>(this.fpsRotate + this.fpsRotateRate * fpsElapsed);
      this.fpsYaw = <Degrees>(this.fpsYaw + this.fpsYawRate * fpsElapsed);
    }
    this.fpsLastTime_ = fpsTimeNow;
  }

  private updateFtsRotation_(dt: number) {
    if (this.ftsRotateReset) {
      if (this.cameraType !== CameraType.FIXED_TO_SAT) {
        this.ftsRotateReset = false;
        this.ftsPitch = 0;
        this.camPitchSpeed = 0;
      }

      this.camYaw = normalizeAngle(this.camYaw);
      this.camPitch = normalizeAngle(this.camPitch);

      const marginOfError = 0.05;
      if (this.camPitch >= this.earthCenteredPitch_ - marginOfError && this.camPitch <= this.earthCenteredPitch_ + marginOfError) {
        this.camPitch = this.earthCenteredPitch_;
        this.camPitchSpeed = 0;
      } else {
        const upOrDown = this.camPitch - this.earthCenteredPitch_ > 0 ? -1 : 1;
        this.camPitchSpeed = (dt * upOrDown * this.settings_.cameraMovementSpeed) / 50;
      }

      if (this.camYaw >= this.earthCenteredYaw_ - marginOfError && this.camYaw <= this.earthCenteredYaw_ + marginOfError) {
        this.camYaw = this.earthCenteredYaw_;
        this.camYawSpeed = 0;
      } else {
        // Figure out the shortest distance back to this.earthCenteredYaw_ from this.camYaw
        const leftOrRight = this.camYaw - this.earthCenteredYaw_ > 0 ? -1 : 1;
        this.camYawSpeed = (dt * leftOrRight * this.settings_.cameraMovementSpeed) / 50;
      }

      if (this.camYaw == this.earthCenteredYaw_ && this.camPitch == this.earthCenteredPitch_) {
        this.ftsRotateReset = false;
      }
    }

    if (this.cameraType == CameraType.FIXED_TO_SAT) {
      this.camPitch = normalizeAngle(this.camPitch);
      this.ftsPitch = this.camPitch;
      this.ftsYaw_ = this.camYaw;
    }
  }

  private updateLocalRotation_(dt: number) {
    if (this.isLocalRotateRoll || this.isLocalRotateYaw || this.isLocalRotateReset || this.isLocalRotateOverride) {
      this.localRotateTarget_.pitch = normalizeAngle(this.localRotateTarget_.pitch);
      this.localRotateTarget_.yaw = normalizeAngle(this.localRotateTarget_.yaw);
      this.localRotateTarget_.roll = normalizeAngle(this.localRotateTarget_.roll);
      this.localRotateCurrent.pitch = normalizeAngle(this.localRotateCurrent.pitch);
      this.localRotateCurrent.yaw = normalizeAngle(this.localRotateCurrent.yaw);
      this.localRotateCurrent.roll = normalizeAngle(this.localRotateCurrent.roll);

      // If user is actively moving
      if (this.isLocalRotateRoll || this.isLocalRotateYaw) {
        this.localRotateDif.pitch = <Radians>(this.screenDragPoint[1] - this.mouseY);
        this.localRotateTarget_.pitch = <Radians>(this.localRotateStartPosition.pitch + this.localRotateDif.pitch * -this.settings_.cameraMovementSpeed);
        this.localRotateSpeed.pitch = normalizeAngle(<Radians>(this.localRotateCurrent.pitch - this.localRotateTarget_.pitch)) * -this.settings_.cameraMovementSpeed;

        if (this.isLocalRotateRoll) {
          this.localRotateDif.roll = <Radians>(this.screenDragPoint[0] - this.mouseX);
          this.localRotateTarget_.roll = <Radians>(this.localRotateStartPosition.roll + this.localRotateDif.roll * this.settings_.cameraMovementSpeed);
          this.localRotateSpeed.roll = normalizeAngle(<Radians>(this.localRotateCurrent.roll - this.localRotateTarget_.roll)) * -this.settings_.cameraMovementSpeed;
        }
        if (this.isLocalRotateYaw) {
          this.localRotateDif.yaw = <Radians>(this.screenDragPoint[0] - this.mouseX);
          this.localRotateTarget_.yaw = <Radians>(this.localRotateStartPosition.yaw + this.localRotateDif.yaw * this.settings_.cameraMovementSpeed);
          this.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.localRotateCurrent.yaw - this.localRotateTarget_.yaw)) * -this.settings_.cameraMovementSpeed;
        }
      }

      if (this.isLocalRotateOverride) {
        this.localRotateTarget_.pitch = <Radians>(this.localRotateStartPosition.pitch + this.localRotateDif.pitch * -this.settings_.cameraMovementSpeed);
        this.localRotateSpeed.pitch = normalizeAngle(<Radians>(this.localRotateCurrent.pitch - this.localRotateTarget_.pitch)) * -this.settings_.cameraMovementSpeed;
        this.localRotateTarget_.yaw = <Radians>(this.localRotateStartPosition.yaw + this.localRotateDif.yaw * this.settings_.cameraMovementSpeed);
        this.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.localRotateCurrent.yaw - this.localRotateTarget_.yaw)) * -this.settings_.cameraMovementSpeed;
      }

      if (this.isLocalRotateReset) {
        this.localRotateTarget_.pitch = <Radians>0;
        this.localRotateTarget_.roll = <Radians>0;
        this.localRotateTarget_.yaw = <Radians>0;
        this.localRotateDif.pitch = <Radians>-this.localRotateCurrent.pitch;
        this.localRotateDif.roll = <Radians>-this.localRotateCurrent.roll;
        this.localRotateDif.yaw = <Radians>-this.localRotateCurrent.yaw;
      }

      const resetModifier = this.isLocalRotateReset ? 750 : 1;

      this.localRotateSpeed.pitch -= this.localRotateSpeed.pitch * dt * this.localRotateMovementSpeed_;
      this.localRotateCurrent.pitch = <Radians>(this.localRotateCurrent.pitch + resetModifier * this.localRotateMovementSpeed_ * this.localRotateDif.pitch);

      if (this.isLocalRotateRoll || this.isLocalRotateReset) {
        this.localRotateSpeed.roll -= this.localRotateSpeed.roll * dt * this.localRotateMovementSpeed_;
        this.localRotateCurrent.roll = <Radians>(this.localRotateCurrent.roll + resetModifier * this.localRotateMovementSpeed_ * this.localRotateDif.roll);
      }

      if (this.isLocalRotateYaw || this.isLocalRotateReset || this.isLocalRotateOverride) {
        const leftOrRight = this.localRotateCurrent.yaw - this.localRotateTarget_.yaw > 0 ? -1 : 1;
        this.localRotateSpeed.yaw += leftOrRight * this.localRotateSpeed.yaw * dt * this.localRotateMovementSpeed_;
        this.localRotateCurrent.yaw = <Radians>(this.localRotateCurrent.yaw + resetModifier * this.localRotateMovementSpeed_ * this.localRotateDif.yaw);
      }

      if (this.isLocalRotateReset) {
        if (this.localRotateCurrent.pitch > -0.001 && this.localRotateCurrent.pitch < 0.001) this.localRotateCurrent.pitch = <Radians>0;
        if (this.localRotateCurrent.roll > -0.001 && this.localRotateCurrent.roll < 0.001) this.localRotateCurrent.roll = <Radians>0;
        if (this.localRotateCurrent.yaw > -0.001 && this.localRotateCurrent.yaw < 0.001) this.localRotateCurrent.yaw = <Radians>0;
        if (this.localRotateCurrent.pitch == 0 && this.localRotateCurrent.roll == 0 && this.localRotateCurrent.yaw == <Radians>0) {
          this.isLocalRotateReset = false;
        }
      }
    }
  }

  private updatePan_(dt: number) {
    if (this.isScreenPan || this.isWorldPan || this.isPanReset) {
      // If user is actively moving
      if (this.isScreenPan || this.isWorldPan) {
        const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
        this.camPitchSpeed = 0;
        this.camYawSpeed = 0;
        this.panDif_.x = this.screenDragPoint[0] - this.mouseX;
        this.panDif_.y = this.screenDragPoint[1] - this.mouseY;
        this.panDif_.z = this.screenDragPoint[1] - this.mouseY;

        // Slow down the panning if a satellite is selected
        if (catalogManagerInstance.selectedSat !== -1) {
          this.panDif_.x /= 30;
          this.panDif_.y /= 30;
          this.panDif_.z /= 30;
        }

        this.panTarget_.x = this.panStartPosition.x + this.panDif_.x * this.panMovementSpeed_ * this.zoomLevel_;
        if (this.isWorldPan) {
          this.panTarget_.y = this.panStartPosition.y + this.panDif_.y * this.panMovementSpeed_ * this.zoomLevel_;
        }
        if (this.isScreenPan) {
          this.panTarget_.z = this.panStartPosition.z + this.panDif_.z * this.panMovementSpeed_;
        }
      }

      if (this.isPanReset) {
        this.panTarget_.x = 0;
        this.panTarget_.y = 0;
        this.panTarget_.z = 0;
        this.panDif_.x = -this.panCurrent.x;
        this.panDif_.y = this.panCurrent.y;
        this.panDif_.z = this.panCurrent.z;
      }

      const panResetModifier = this.isPanReset ? 0.5 : 1;

      // X is X no matter what
      this.panSpeed.x = (this.panCurrent.x - this.panTarget_.x) * this.panMovementSpeed_ * this.zoomLevel_;
      this.panSpeed.x -= this.panSpeed.x * dt * this.panMovementSpeed_ * this.zoomLevel_;
      this.panCurrent.x += panResetModifier * this.panMovementSpeed_ * this.panDif_.x;
      // If we are moving like an FPS then Y and Z are based on the angle of the this
      if (this.isWorldPan) {
        this.fpsPos_[1] = <Radians>(this.fpsPos_[1] - Math.cos(this.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed_ * this.panDif_.y);
        this.fpsPos_[2] = <Radians>(this.fpsPos_[1] + Math.sin(this.localRotateCurrent.pitch) * panResetModifier * this.panMovementSpeed_ * this.panDif_.y);
        this.fpsPos_[1] = <Radians>(this.fpsPos_[1] - Math.sin(-this.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed_ * this.panDif_.x);
      }
      // If we are moving the screen then Z is always up and Y is not relevant
      if (this.isScreenPan || this.isPanReset) {
        this.panSpeed.z = (this.panCurrent.z - this.panTarget_.z) * this.panMovementSpeed_ * this.zoomLevel_;
        this.panSpeed.z -= this.panSpeed.z * dt * this.panMovementSpeed_ * this.zoomLevel_;
        this.panCurrent.z -= panResetModifier * this.panMovementSpeed_ * this.panDif_.z;
      }

      if (this.isPanReset) {
        this.fpsPos_[0] = this.fpsPos_[0] - this.fpsPos_[0] / 25;
        this.fpsPos_[1] = this.fpsPos_[1] - this.fpsPos_[1] / 25;
        this.fpsPos_[2] = this.fpsPos_[2] - this.fpsPos_[2] / 25;

        if (this.panCurrent.x > -0.5 && this.panCurrent.x < 0.5) this.panCurrent.x = 0;
        if (this.panCurrent.y > -0.5 && this.panCurrent.y < 0.5) this.panCurrent.y = 0;
        if (this.panCurrent.z > -0.5 && this.panCurrent.z < 0.5) this.panCurrent.z = 0;
        if (this.fpsPos_[0] > -0.5 && this.fpsPos_[0] < 0.5) this.fpsPos_[0] = 0;
        if (this.fpsPos_[1] > -0.5 && this.fpsPos_[1] < 0.5) this.fpsPos_[1] = 0;
        if (this.fpsPos_[2] > -0.5 && this.fpsPos_[2] < 0.5) this.fpsPos_[2] = 0;

        if (this.panCurrent.x == 0 && this.panCurrent.y == 0 && this.panCurrent.z == 0 && this.fpsPos_[0] == 0 && this.fpsPos_[1] == 0 && this.fpsPos_[2] == 0) {
          this.isPanReset = false;
        }
      }
    }
    if (this.settings_.isAutoPanD || this.settings_.isAutoPanU || this.settings_.isAutoPanL || this.settings_.isAutoPanR) {
      if (this.settings_.isAutoPanD) this.panCurrent.z += this.settings_.autoPanSpeed * dt;
      if (this.settings_.isAutoPanU) this.panCurrent.z -= this.settings_.autoPanSpeed * dt;
      if (this.settings_.isAutoPanL) this.panCurrent.x += this.settings_.autoPanSpeed * dt;
      if (this.settings_.isAutoPanR) this.panCurrent.x -= this.settings_.autoPanSpeed * dt;
    }
  }

  private updatePitchYawSpeeds_(dt: Milliseconds) {
    if ((this.isDragging && !this.settings_.isMobileModeEnabled) || (this.isDragging && this.settings_.isMobileModeEnabled && (this.mouseX !== 0 || this.mouseY !== 0))) {
      // Disable Raycasting for Performance
      // dragTarget = getEarthScreenPoint(mouseX, mouseY)
      // if (Number.isNaN(dragTarget[0]) || Number.isNaN(dragTarget[1]) || Number.isNaN(dragTarget[2]) ||
      // Number.isNaN(dragPoint[0]) || Number.isNaN(dragPoint[1]) || Number.isNaN(dragPoint[2]) ||
      if (
        !this.isRayCastingEarth_ ||
        this.cameraType === CameraType.FPS ||
        this.cameraType === CameraType.SATELLITE ||
        this.cameraType === CameraType.ASTRONOMY ||
        this.settings_.isMobileModeEnabled
      ) {
        // random screen drag
        const xDif = this.screenDragPoint[0] - this.mouseX;
        const yDif = this.screenDragPoint[1] - this.mouseY;
        const yawTarget = <Radians>(this.dragStartYaw + xDif * this.settings_.cameraMovementSpeed);
        const pitchTarget = <Radians>(this.dragStartPitch + yDif * -this.settings_.cameraMovementSpeed);
        this.camPitchSpeed = normalizeAngle(<Radians>(this.camPitch - pitchTarget)) * -this.settings_.cameraMovementSpeed;
        this.camYawSpeed = normalizeAngle(<Radians>(this.camYaw - yawTarget)) * -this.settings_.cameraMovementSpeed;
        // NOTE: this could be used for motion blur
        // this.camPitchAccel = this.camPitchSpeedLast - this.camPitchSpeed;
        // this.camYawAccel = this.camYawSpeedLast - this.camYawSpeed;
        // this.camPitchSpeedLast = this.camPitchSpeed * 1;
        // this.camYawSpeedLast = this.camYawSpeed * 1;
      } else {
        // this is how we handle a raycast that hit the earth to make it feel like you are grabbing onto the surface
        // of the earth instead of the screen
        /*
        // earth surface point drag
        // dragPointR = Math.sqrt(dragPoint[0] * dragPoint[0] + dragPoint[1] * dragPoint[1]);
        // dragTargetR = Math.sqrt(dragTarget[0] * dragTarget[0] + dragTarget[1] * dragTarget[1]);
        // dragPointLon = Math.atan2(dragPoint[1], dragPoint[0]);
        // dragTargetLon = Math.atan2(dragTarget[1], dragTarget[0]);
        // dragPointLat = Math.atan2(dragPoint[2], dragPointR);
        // dragTargetLat = Math.atan2(dragTarget[2], dragTargetR);
        // pitchDif = dragPointLat - dragTargetLat;
        // yawDif = normalizeAngle(dragPointLon - dragTargetLon);
        // this.camPitchSpeed = pitchDif * this.settings_.cameraMovementSpeed;
        // this.camYawSpeed = yawDif * this.settings_.cameraMovementSpeed;
      */
      }
      this.isAutoPitchYawToTarget = false;
    } else {
      // this block of code is what causes the momentum effect when moving the camera
      // Most applications like Goolge Earth or STK do not have this effect as pronounced
      // It makes KeepTrack feel more like a game and less like a toolkit
      this.camPitchSpeed -= this.camPitchSpeed * dt * this.settings_.cameraMovementSpeed * this.settings_.cameraDecayFactor; // decay speeds when globe is "thrown"
      this.camYawSpeed -= this.camYawSpeed * dt * this.settings_.cameraMovementSpeed * this.settings_.cameraDecayFactor;
      // NOTE: this could be used for motion blur
      // this.camPitchAccel *= 0.95;
      // this.camYawAccel *= 0.95;
    }
  }

  /**
   * Zoom Changing
   *
   * this code might be better if applied directly to the shader versus a multiplier effect
   */
  private updateZoom_(dt: number) {
    if (this.zoomLevel_ !== this.zoomTarget_) {
      this.updateSatShaderSizes();
    }

    if (this.settings_.isAutoZoomIn || this.settings_.isAutoZoomOut) {
      const cameraDistance = this.getCameraDistance();
      if (cameraDistance > 140000) {
        this.settings_.satShader.minSize = 7;
      }
      if (cameraDistance > 180000) {
        this.settings_.satShader.minSize = 6;
      }
      if (cameraDistance > 220000) {
        this.settings_.satShader.minSize = 5;
      }
      if (cameraDistance > 280000) {
        this.settings_.satShader.minSize = 4;
      }
      if (cameraDistance > 350000) {
        this.settings_.satShader.minSize = 3;
      }
      if (cameraDistance > 400000) {
        this.settings_.satShader.minSize = 2;
      }
      if (cameraDistance > 450000) {
        this.settings_.satShader.minSize = 1;
      }

      if (this.settings_.isAutoZoomIn) {
        this.zoomTarget_ -= dt * this.settings_.autoZoomSpeed;
      }
      if (this.settings_.isAutoZoomOut) {
        this.zoomTarget_ += dt * this.settings_.autoZoomSpeed;
      }
    }

    if (this.isAutoPitchYawToTarget) {
      this.zoomLevel_ = this.zoomLevel_ + (this.zoomTarget_ - this.zoomLevel_) * dt * this.settings_.zoomSpeed; // Just keep zooming
    } else {
      const inOrOut = this.zoomLevel_ > this.zoomTarget_ ? -1 : 1;
      this.zoomLevel_ += inOrOut * dt * this.settings_.zoomSpeed * Math.abs(this.zoomTarget_ - this.zoomLevel_);

      if ((this.zoomLevel_ > this.zoomTarget_ && !this.isZoomIn) || (this.zoomLevel_ < this.zoomTarget_ && this.isZoomIn)) {
        this.zoomTarget_ = this.zoomLevel_; // If we change direction then consider us at the target
      }
    }

    // Clamp Zoom between 0 and 1
    this.zoomLevel_ = this.zoomLevel_ > 1 ? 1 : this.zoomLevel_;
    this.zoomLevel_ = this.zoomLevel_ < 0 ? 0.0001 : this.zoomLevel_;

    // Try to stay out of the earth
    if (this.cameraType === CameraType.DEFAULT || this.cameraType === CameraType.OFFSET || this.cameraType === CameraType.FIXED_TO_SAT) {
      if (this.getDistFromEarth() < RADIUS_OF_EARTH + 30) {
        this.zoomTarget = this.zoomLevel_ + 0.001;
      }
    }
  }

  updateSatShaderSizes() {
    if (this.zoomLevel_ > this.settings_.satShader.largeObjectMaxZoom) {
      this.settings_.satShader.maxSize = this.settings_.satShader.maxAllowedSize * 1.5;
    } else if (this.zoomLevel_ < this.settings_.satShader.largeObjectMinZoom) {
      this.settings_.satShader.maxSize = this.settings_.satShader.maxAllowedSize / 3;
    } else {
      this.settings_.satShader.maxSize = this.settings_.satShader.maxAllowedSize;
    }
  }
}
