/* eslint-disable complexity */
/* eslint-disable max-lines */
/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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

import { ToastMsgType } from '@app/engine/core/interfaces';
import { RADIUS_OF_EARTH, ZOOM_EXP } from '@app/engine/utils/constants';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import {
  BaseObject, DEG2RAD, Degrees, DetailedSatellite, EciVec3, GreenwichMeanSiderealTime, Kilometers, Milliseconds, Radians, SpaceObjectType, Star, TAU, ZoomValue, eci2lla,
} from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';
import { SatMath } from '../../app/analysis/sat-math';
import { keepTrackApi } from '../../keepTrackApi';
import { SettingsManager } from '../../settings/settings';
import { Scene } from '../core/scene';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { DepthManager } from '../rendering/depth-manager';
import { CelestialBody } from '../rendering/draw-manager/celestial-bodies/celestial-body';
import { Earth } from '../rendering/draw-manager/earth';
import type { OrbitManager } from '../rendering/orbitManager';
import { errorManagerInstance } from '../utils/errorManager';
import { lat2pitch, lon2yaw, normalizeAngle } from '../utils/transforms';
import { CameraInputHandler } from './camera-input-handler';
import { CameraState } from './state/camera-state';
import type { ICameraBehavior } from './behaviors/ICameraBehavior';
import { CameraBehaviorFactory } from './behaviors/CameraBehaviorFactory';
import type { SensorPosition } from './behaviors/ICameraBehavior';

/**
 * Represents the different types of cameras available.
 * Each camera type has its own behavior class that implements the camera logic.
 */
export enum CameraType {
  CURRENT = 0,
  FIXED_TO_EARTH = 1,
  FIXED_TO_SAT = 2,
  FPS = 3,
  PLANETARIUM = 4,
  SATELLITE = 5,
  ASTRONOMY = 6,
  MAX_CAMERA_TYPES = 7,
}

export class Camera {
  state = new CameraState();
  inputHandler = new CameraInputHandler(this);

  private chaseSpeed_ = 0.0005;
  private isRayCastingEarth_ = false;
  private panMovementSpeed_ = 0.5;
  private localRotateMovementSpeed_ = 0.00005;

  private yawErr_ = <Radians>0;
  private cameraType_: CameraType = CameraType.FIXED_TO_EARTH;
  private behavior_: ICameraBehavior;

  /**
   * Main source of projection matrix for rest of the application
   */
  projectionMatrix: mat4 = mat4.create();

  get matrixWorld(): mat4 {
    return mat4.invert(mat4.create(), this.matrixWorldInverse)!;
  }

  matrixWorldInverse = mat4.create();

  /**
   * Get the current camera type
   */
  get cameraType(): CameraType {
    return this.cameraType_;
  }

  /**
   * Set the camera type and switch to the appropriate behavior
   */
  set cameraType(type: CameraType) {
    if (type === CameraType.CURRENT) {
      return; // CURRENT means keep existing type
    }

    // Call onExit on old behavior if it exists
    this.behavior_?.onExit?.();

    // Update camera type
    const oldType = this.cameraType_;

    this.cameraType_ = type;

    // Create and set new behavior
    this.behavior_ = CameraBehaviorFactory.create(type, this);

    // Call onEnter on new behavior
    this.behavior_?.onEnter?.();

    // Note: Could emit an event here if needed for camera type changes
    // EventBus would need an instance and the event would need to be defined
  }

  constructor() {
    // Initialize with default behavior
    this.behavior_ = CameraBehaviorFactory.create(CameraType.FIXED_TO_EARTH, this);
  }

  resetRotation() {
    if (this.cameraType !== CameraType.FPS) {
      this.state.isPanReset = true;
    }
    this.state.isLocalRotateReset = true;
    if (this.cameraType === CameraType.FIXED_TO_SAT) {
      this.state.ftsRotateReset = true;
    }
  }

  zoomIn(): void {
    this.zoomWheel(-100);
  }

  zoomOut(): void {
    this.zoomWheel(100);
  }

  /**
   * TODO: This should be moved to another class
   */
  static earthHitTest(gl: WebGL2RenderingContext, gpuPickingFrameBuffer: WebGLFramebuffer, pickReadPixelBuffer: Float32Array, x: number, y: number): boolean {
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpuPickingFrameBuffer);
    gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickReadPixelBuffer);

    return pickReadPixelBuffer[0] === 0 && pickReadPixelBuffer[1] === 0 && pickReadPixelBuffer[2] === 0;
  }

  autoRotate(val?: boolean): void {
    if (settingsManager.autoRotateSpeed === 0) {
      settingsManager.autoRotateSpeed = 0.0075;
    }

    if (typeof val === 'undefined') {
      this.state.isAutoRotate = !this.state.isAutoRotate;

      // If all auto rotate settings are off, set auto rotate left to true
      if (!settingsManager.isAutoRotateD && !settingsManager.isAutoRotateL && !settingsManager.isAutoRotateR && !settingsManager.isAutoRotateU) {
        settingsManager.isAutoRotateL = true;
      }

      return;
    }
    this.state.isAutoRotate = val;
  }

  camSnap(pitch: Radians, yaw: Radians): void {
    // this.isPanReset = true
    this.state.camPitchTarget = pitch;
    this.state.camYawTarget = normalizeAngle(yaw);
    this.state.earthCenteredPitch = pitch;
    this.state.earthCenteredYaw = this.state.camYawTarget; // Use the normalized yaw
    // if (this.earthCenteredYaw_ < 0) this.earthCenteredYaw_ = <Radians>(this.earthCenteredYaw_ + TAU);
    this.state.isAutoPitchYawToTarget = true;
  }

  changeCameraType(orbitManager: OrbitManager) {
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

    if (this.cameraType === CameraType.PLANETARIUM) {
      orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
    }

    switch (this.cameraType) {
      case CameraType.FIXED_TO_EARTH:
        this.cameraType = CameraType.FIXED_TO_SAT;
        break;
      case CameraType.FIXED_TO_SAT:
        this.cameraType = CameraType.FPS;
        break;
      case CameraType.FPS:
        this.cameraType = CameraType.SATELLITE;
        break;
      case CameraType.SATELLITE:
        this.cameraType = CameraType.FIXED_TO_EARTH;
        break;
      default:
        this.cameraType = CameraType.MAX_CAMERA_TYPES;
        break;
    }

    if ((this.cameraType === CameraType.FIXED_TO_SAT && !selectSatManagerInstance) || selectSatManagerInstance?.selectedSat === -1) {
      this.cameraType++;
    }
    // FPS position reset is now handled by FpsBehavior.onEnter()
    if (this.cameraType === CameraType.PLANETARIUM && !sensorManagerInstance.isSensorSelected()) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.SATELLITE && selectSatManagerInstance?.selectedSat === -1) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.ASTRONOMY && !sensorManagerInstance.isSensorSelected()) {
      this.cameraType++;
    }

    if (this.cameraType >= CameraType.MAX_CAMERA_TYPES) {
      const renderer = keepTrackApi.getRenderer();

      this.state.isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6 as Radians;
      renderer.glInit();
      if ((selectSatManagerInstance?.selectedSat ?? -1) > -1) {
        this.state.camZoomSnappedOnSat = true;
        this.cameraType = CameraType.FIXED_TO_SAT;
      } else {
        this.cameraType = CameraType.FIXED_TO_EARTH;
      }
    }
  }

  zoomWheel(delta: number): void {
    this.state.isZoomIn = delta < 0;

    if (settingsManager.isZoomStopsRotation) {
      this.autoRotate(false);
    }

    const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

    // Updated zoom logic for satellite/covariance bubble proximity
    const isCameraCloseToSatellite = this.state.camDistBuffer < settingsManager.nearZoomLevel;
    const maxCovarianceDistance = Math.min((selectSatManagerInstance?.primarySatCovMatrix?.[2] ?? 0) * 10, 10000);
    const isCameraCloseToCovarianceBubble = settingsManager.isDrawCovarianceEllipsoid &&
      this.state.camDistBuffer < maxCovarianceDistance;

    if (settingsManager.isZoomStopsSnappedOnSat || (selectSatManagerInstance?.selectedSat ?? -1) === -1) {
      this.state.zoomTarget += delta / 100 / 25 / this.state.speedModifier; // delta is +/- 100
    } else if ((isCameraCloseToSatellite || isCameraCloseToCovarianceBubble) ||
      this.state.zoomLevel === -1) {
      // Inside camDistBuffer

      /*
       * Slowly zoom in/out, scaling speed with camDistBuffer (farther = faster)
       * Exponential scaling for smoother zoom near the satellite
       */
      const scale = Math.max(0.01, (this.state.camDistBuffer / 100) ** 1.15); // Exponential factor > 1 for faster scaling as distance increases

      this.state.camDistBuffer = <Kilometers>(this.state.camDistBuffer + (delta / 5) * scale); // delta is +/- 100
    } else if (this.state.camDistBuffer >= settingsManager.nearZoomLevel) {
      // Outside camDistBuffer
      this.state.zoomTarget += delta / 100 / 25 / this.state.speedModifier; // delta is +/- 100
    }

    this.zoomWheelFov_(delta);
  }

  private zoomWheelFov_(delta: number) {
    if (this.cameraType === CameraType.PLANETARIUM || this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      settingsManager.fieldOfView = settingsManager.fieldOfView + (delta * 0.0002) as Radians;
      // getEl('fov-text').innerHTML = 'FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg';
      if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) {
        settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
      }
      if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) {
        settingsManager.fieldOfView = settingsManager.fieldOfViewMin as Radians;
      }
      keepTrackApi.getRenderer().glInit();
    }
  }

  changeZoom(zoom: ZoomValue | number): void {
    if (typeof zoom !== 'number') {
      throw new Error('Invalid Zoom Value');
    }
    if (zoom > 1 || zoom < 0) {
      throw new Error('Invalid Zoom Value');
    }
    this.state.zoomTarget = zoom;
  }

  /**
   * Set up the camera's view matrix for rendering
   */
  draw(sensorPos?: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number } | null): void {
    let target: BaseObject | null = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj ?? null;

    // TODO: This should be handled better
    if (!target) {
      target = <BaseObject>(<unknown>{
        id: -1,
        missile: false,
        type: SpaceObjectType.UNKNOWN,
        static: false,
      });
    }

    const sensorPosition: SensorPosition | null = sensorPos ? {
      lat: sensorPos.lat,
      lon: sensorPos.lon,
      gmst: sensorPos.gmst,
      x: sensorPos.x,
      y: sensorPos.y,
      z: sensorPos.z,
    } : null;

    this.drawPreValidate_(sensorPosition);

    // Validate camera behavior can be used
    if (!this.behavior_.validate(sensorPosition, target)) {
      // Fall back to fixed-to-earth if current behavior is invalid
      this.cameraType = CameraType.FIXED_TO_EARTH;
    }

    // Reset matrix
    mat4.identity(this.matrixWorldInverse);

    // Delegate drawing to the behavior
    this.behavior_.draw(sensorPosition, target);
  }

  exitFixedToSat(): void {
    if (this.cameraType !== CameraType.FIXED_TO_SAT) {
      return;
    }

    const cameraDistance = this.getDistFromEarth();

    this.state.ftsRotateReset = true;

    // If within 9000km then we want to move further back to feel less jarring
    if (cameraDistance > 9000) {
      this.cameraType = CameraType.FIXED_TO_EARTH;

      this.state.zoomTarget = this.getZoomFromDistance(cameraDistance) + 0.005;
      this.state.camPitch = this.state.earthCenteredPitch;
      this.state.camYaw = this.state.earthCenteredYaw;
      this.state.isAutoPitchYawToTarget = true;

      // eslint-disable-next-line multiline-comment-style
      // this.camPitch = this.earthCenteredPitch_;
      // this.camYaw = this.earthCenteredYaw_;
      // // External to Local Rotation
      // this.localRotateCurrent.pitch = <Radians>(this.ftsPitch * -1);
      // this.localRotateCurrent.yaw = <Radians>(this.ftsYaw_ * -1);
      // this.isLocalRotateReset = true;
    } else {
      this.state.camPitch = this.state.earthCenteredPitch;
      this.state.camYaw = this.state.earthCenteredYaw;
      this.state.zoomTarget = this.getZoomFromDistance(cameraDistance) + 0.15;
    }
  }

  getZoomFromDistance(distance: Kilometers): number {
    return ((distance - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance)) ** (1 / ZOOM_EXP);
  }

  /**
   * Calculates the zoom distance based on the zoom level
   *
   * Zoom level is ALWAYS raised to the power of ZOOM_EXP to ensure that zooming out is faster than zooming in
   * TODO: This should be handled before getting the zoomLevel_ value
   */
  calcDistanceBasedOnZoom(): Kilometers {
    return <Kilometers>(this.state.zoomLevel ** ZOOM_EXP * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance);
  }

  /**
   * Calculates the X, Y, Z of the Camera based on the matrixWorld
   *
   * Used in RayCasting
   */
  getCamPos(origin = [0, 0, 0]): vec3 {
    this.state.position = vec3.fromValues(this.matrixWorld[12], this.matrixWorld[13], this.matrixWorld[14]);

    const relativePosition = vec3.create();

    vec3.subtract(relativePosition, this.state.position, origin);

    return relativePosition;
  }

  getDistFromEntity(entityPos: vec3): Kilometers {
    const position = this.getCamPosEarthCentered();

    return <Kilometers>Math.sqrt((position[0] - entityPos[0]) ** 2 + (position[1] - entityPos[1]) ** 2 + (position[2] - entityPos[2]) ** 2);
  }

  /**
   * Gets the camera position in Earth-Centered coordinates where the north pole is +Z
   */
  getCamPosEarthCentered(): vec3 {
    return this.getCamPos(Scene.getInstance().worldShift);
  }

  getDistFromEarth(): Kilometers {
    const position = this.getCamPosEarthCentered();

    return <Kilometers>Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
  }

  /**
   * This is the direction the camera is facing
   */
  getCameraOrientation() {
    if (this.cameraType === CameraType.FIXED_TO_SAT) {
      const xRot = Math.sin(-this.state.ftsYaw) * Math.cos(this.state.ftsPitch);
      const yRot = Math.cos(this.state.ftsYaw) * Math.cos(this.state.ftsPitch);
      const zRot = Math.sin(-this.state.ftsPitch);


      return vec3.fromValues(xRot, yRot, zRot);
    }
    if (this.cameraType === CameraType.FIXED_TO_EARTH) {
      const xRot = Math.sin(-this.state.camYaw) * Math.cos(this.state.camPitch);
      const yRot = Math.cos(this.state.camYaw) * Math.cos(this.state.camPitch);
      const zRot = Math.sin(-this.state.camPitch);


      return vec3.fromValues(xRot, yRot, zRot);
    }

    return vec3.fromValues(0, 0, 0);
  }

  getCameraRadius(target: EciVec3, centerBody: CelestialBody | Earth) {
    let targetDistanceFromEarth = 0;

    if (target) {
      const gmst = keepTrackApi.getTimeManager().gmst;

      this.state.camSnapToSat.altitude = SatMath.getAlt(target, gmst, centerBody.RADIUS as Kilometers);
      targetDistanceFromEarth = this.state.camSnapToSat.altitude + RADIUS_OF_EARTH;
    }
    const radius = this.calcDistanceBasedOnZoom() - targetDistanceFromEarth;


    return radius;
  }

  getForwardVector(): vec3 {
    const inverted = mat4.create();
    const forward = vec3.create();

    mat4.invert(inverted, this.matrixWorldInverse);
    vec3.transformMat4(forward, forward, inverted);

    return forward;
  }

  init(settings: SettingsManager) {
    settingsManager = settings;

    this.state.zoomLevel = settingsManager.initZoomLevel ?? 0.6925;
    this.state.zoomTarget = settingsManager.initZoomLevel ?? 0.6925;

    this.inputHandler.init();

    EventBus.getInstance().on(EventBusEvent.selectSatData, () => {
      this.state.isAutoPitchYawToTarget = false;
    });
  }

  /**
   * Sets the camera to look at a specific latitude and longitude with a given zoom level.
   */
  lookAtLatLon(lat: Degrees, lon: Degrees, zoom?: ZoomValue | number, date = keepTrackApi.getTimeManager().simulationTimeObj): void {
    if (this.cameraType !== CameraType.FIXED_TO_EARTH) {
      this.cameraType = CameraType.FIXED_TO_EARTH;
    }

    if (zoom) {
      this.changeZoom(zoom);
    }
    this.camSnap(lat2pitch(lat), lon2yaw(lon, date));
  }

  lookAtPosition(pos: EciVec3, isFaceEarth: boolean, selectedDate: Date): void {
    const gmst = SatMath.calculateTimeVariables(selectedDate).gmst;
    const lla = eci2lla(pos, gmst);
    const latModifier = isFaceEarth ? 1 : -1;
    const lonModifier = isFaceEarth ? 0 : 180;

    this.camSnap(lat2pitch(<Degrees>(lla.lat * latModifier)), lon2yaw(<Degrees>(lla.lon + lonModifier), selectedDate));
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
    this.cameraType = CameraType.FIXED_TO_EARTH; // Earth will block the view of the star
    this.lookAtPosition(sat.position, false, timeManagerInstance.selectedDate);
  }

  setCameraType(val: CameraType) {
    if (typeof val !== 'number') {
      throw new TypeError();
    }
    if (val > 6 || val < 0) {
      throw new RangeError();
    }

    this.cameraType = val;
    // FPS position reset is now handled by FpsBehavior.onEnter()
  }

  /**
   * camera function runs every frame that a satellite is selected. However, the user might have broken out of the zoom snap or angle snap. If so, don't change those targets.
   *
   * This is intentionally complex to reduce object creation and GC.
   *
   * Splitting it into subfunctions would not be optimal
   */
  snapToSat(sat: DetailedSatellite | MissileObject, simulationTime: Date) {
    if (typeof sat === 'undefined' || sat === null) {
      return;
    }
    if (!sat.isMissile() && !sat.isSatellite()) {
      return;
    }

    if (!sat.position) {
      throw new Error(`Object ${sat.id} has no position!`);
    }

    if (sat.position.x === 0 && sat.position.y === 0 && sat.position.z === 0) {
      keepTrackApi.getUiManager().toast('Object is inside the earth!', ToastMsgType.critical);
      const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

      if (selectSatManagerInstance) {
        selectSatManagerInstance.selectSat(-1);
      }
      this.state.camZoomSnappedOnSat = false;
      this.state.camAngleSnappedOnSat = false;

      return;
    }

    if (this.state.camAngleSnappedOnSat) {
      this.state.camSnapToSat.pos = sat.position;
      this.state.camSnapToSat.radius = Math.sqrt(this.state.camSnapToSat.pos.x ** 2 + this.state.camSnapToSat.pos.y ** 2);
      this.state.camSnapToSat.yaw = <Radians>(Math.atan2(this.state.camSnapToSat.pos.y, this.state.camSnapToSat.pos.x) + TAU / 4);
      this.state.camSnapToSat.pitch = <Radians>Math.atan2(this.state.camSnapToSat.pos.z, this.state.camSnapToSat.radius);
      if (this.state.camSnapToSat.pitch === null || typeof this.state.camSnapToSat.pitch === 'undefined') {
        errorManagerInstance.info('Pitch Calculation Error');
        this.state.camSnapToSat.pitch = <Radians>0;
        this.state.camZoomSnappedOnSat = false;
        this.state.camAngleSnappedOnSat = false;
      }
      if (this.state.camSnapToSat.yaw === null || typeof this.state.camSnapToSat.yaw === 'undefined') {
        errorManagerInstance.info('Yaw Calculation Error');
        this.state.camSnapToSat.yaw = <Radians>0;
        this.state.camZoomSnappedOnSat = false;
        this.state.camAngleSnappedOnSat = false;
      }
      if (this.cameraType === CameraType.PLANETARIUM) {
        // camSnap(-pitch, -yaw)
      } else {
        this.camSnap(this.state.camSnapToSat.pitch, this.state.camSnapToSat.yaw);
      }
    }

    if (this.state.camZoomSnappedOnSat && !settingsManager.isAutoZoomIn && !settingsManager.isAutoZoomOut) {
      if (sat.active) {
        // if this is a satellite not a missile
        const { gmst } = SatMath.calculateTimeVariables(simulationTime);

        const centerBodyPosition = keepTrackApi.getScene().getBodyById(settingsManager.centerBody)!.position;
        const relativePosition = {
          x: sat.position.x - centerBodyPosition[0] as Kilometers,
          y: sat.position.y - centerBodyPosition[1] as Kilometers,
          z: sat.position.z - centerBodyPosition[2] as Kilometers,
        };
        const centerBody = keepTrackApi.getScene().getBodyById(settingsManager.centerBody)!;

        this.state.camSnapToSat.altitude = SatMath.getAlt(relativePosition, gmst, centerBody.RADIUS as Kilometers);
      }
      if (this.state.camSnapToSat.altitude) {
        this.state.camSnapToSat.camDistTarget = this.state.camSnapToSat.altitude + RADIUS_OF_EARTH + this.state.camDistBuffer;
      } else {
        this.state.camSnapToSat.camDistTarget = RADIUS_OF_EARTH + this.state.camDistBuffer; // Stay out of the center of the earth. You will get stuck there.
        errorManagerInstance.info(`Zoom Calculation Error: ${this.state.camSnapToSat.altitude} -- ${this.state.camSnapToSat.camDistTarget}`);
        this.state.camZoomSnappedOnSat = false;
        this.state.camAngleSnappedOnSat = false;
      }

      this.state.camSnapToSat.camDistTarget = this.state.camSnapToSat.camDistTarget < settingsManager.minZoomDistance
        ? settingsManager.minZoomDistance + 10 : this.state.camSnapToSat.camDistTarget;

      this.state.zoomTarget =
        ((this.state.camSnapToSat.camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance)) ** (1 / ZOOM_EXP);

      if (!settingsManager.isMobileModeEnabled) {
        settingsManager.selectedColor = [0, 0, 0, 0];
      } else {
        settingsManager.selectedColor = settingsManager.selectedColorFallback;
      }

      this.state.zoomLevel = Math.max(this.state.zoomLevel, this.state.zoomTarget);

      // errorManagerInstance.debug(`Zoom Target: ${this.zoomTarget_}`);
      this.state.earthCenteredLastZoom = this.state.zoomTarget + 0.1;

      // Only Zoom in Once on Mobile
      if (settingsManager.isMobileModeEnabled) {
        this.state.camZoomSnappedOnSat = false;
      }
    }

    this.updateSatShaderSizes();
  }

  panUp() {
    settingsManager.isAutoPanU = !settingsManager.isAutoPanU;
  }

  panDown() {
    settingsManager.isAutoPanD = !settingsManager.isAutoPanD;
  }

  panLeft() {
    settingsManager.isAutoPanL = !settingsManager.isAutoPanL;
  }

  panRight() {
    settingsManager.isAutoPanR = !settingsManager.isAutoPanR;
  }

  /**
   * Calculate the camera's position and camera matrix
   */
  update(dt: Milliseconds) {
    // Common updates for all camera types
    this.updatePan_(dt);
    this.updateLocalRotation_(dt);
    this.updatePitchYawSpeeds_(dt);
    this.updateFtsRotation_(dt);

    this.state.camRotateSpeed -= this.state.camRotateSpeed * dt * settingsManager.cameraMovementSpeed;

    // Update pitch/yaw for non-FPS camera types
    if (this.cameraType !== CameraType.FPS && this.cameraType !== CameraType.SATELLITE && this.cameraType !== CameraType.ASTRONOMY) {
      if (this.state.camPitchSpeed !== 0) {
        this.state.camPitch = <Radians>(this.state.camPitch + this.state.camPitchSpeed * dt);
      }
      if (this.state.camYawSpeed !== 0) {
        this.state.camYaw = <Radians>(this.state.camYaw + this.state.camYawSpeed * dt);
      }
      if (this.state.camRotateSpeed !== 0) {
        this.state.fpsRotate = <Degrees>(this.state.fpsRotate + this.state.camRotateSpeed * dt);
      }
    }

    // Auto-rotate if enabled
    if (this.state.isAutoRotate) {
      if (settingsManager.isAutoRotateL) {
        this.state.camYaw = <Radians>(this.state.camYaw - settingsManager.autoRotateSpeed * dt * (this.inputHandler.isHoldingDownAKey));
      }
      if (settingsManager.isAutoRotateR) {
        this.state.camYaw = <Radians>(this.state.camYaw + settingsManager.autoRotateSpeed * dt * (this.inputHandler.isHoldingDownAKey));
      }
      if (settingsManager.isAutoRotateU) {
        this.state.camPitch = <Radians>(this.state.camPitch + (settingsManager.autoRotateSpeed / 2) * dt * (this.inputHandler.isHoldingDownAKey));
      }
      if (settingsManager.isAutoRotateD) {
        this.state.camPitch = <Radians>(this.state.camPitch - (settingsManager.autoRotateSpeed / 2) * dt * (this.inputHandler.isHoldingDownAKey));
      }
    }

    this.updateZoom_(dt);
    this.updateCameraSnapMode(dt);

    // Clamp pitch for non-Fixed-to-Sat cameras
    if (this.cameraType !== CameraType.FIXED_TO_SAT) {
      if (this.state.camPitch > TAU / 4) {
        this.state.camPitch = <Radians>(TAU / 4);
      }
      if (this.state.camPitch < -TAU / 4) {
        this.state.camPitch = <Radians>(-TAU / 4);
      }
    }

    // Normalize yaw angle
    if (this.state.camYaw > TAU) {
      this.state.camYaw = <Radians>(this.state.camYaw - TAU);
    }
    if (this.state.camYaw < 0) {
      this.state.camYaw = <Radians>(this.state.camYaw + TAU);
    }

    // Delegate camera-specific update logic to behavior
    this.behavior_.update(dt);
  }

  zoomLevel(): number {
    return this.state.zoomLevel;
  }

  private drawPreValidate_(_sensorPos: SensorPosition | null) {
    if (
      Number.isNaN(this.state.camPitch) ||
      Number.isNaN(this.state.camYaw) ||
      Number.isNaN(this.state.camPitchTarget) ||
      Number.isNaN(this.state.camYawTarget) ||
      Number.isNaN(this.state.zoomLevel) ||
      Number.isNaN(this.state.zoomTarget)
    ) {
      try {
        errorManagerInstance.debug(`camPitch: ${this.state.camPitch}`);
        errorManagerInstance.debug(`camYaw: ${this.state.camYaw}`);
        errorManagerInstance.debug(`camPitchTarget: ${this.state.camPitchTarget}`);
        errorManagerInstance.debug(`camYawTarget: ${this.state.camYawTarget}`);
        errorManagerInstance.debug(`zoomLevel: ${this.state.zoomLevel}`);
        errorManagerInstance.debug(`zoomTarget: ${this.state.zoomTarget}`);
        errorManagerInstance.debug(`settingsManager.cameraMovementSpeed: ${settingsManager.cameraMovementSpeed}`);
      } catch {
        errorManagerInstance.info('Camera Math Error');
      }
      this.state.camPitch = <Radians>0.5;
      this.state.camYaw = <Radians>0.5;
      this.state.zoomLevel = 0.5;
      this.state.camPitchTarget = <Radians>0;
      this.state.camYawTarget = <Radians>0;
      this.state.zoomTarget = 0.5;
    }

    // Sensor validation is now handled by behavior.validate()
  }

  private updateCameraSnapMode(dt: Milliseconds) {
    if (this.state.isAutoPitchYawToTarget) {
      this.state.camPitch = this.chaseSpeed_ === 1.0
        ? this.state.camPitchTarget
        : <Radians>(this.state.camPitch + (this.state.camPitchTarget - this.state.camPitch) * this.chaseSpeed_ * dt);

      this.yawErr_ = normalizeAngle(<Radians>(this.state.camYawTarget - this.state.camYaw));
      this.state.camYaw = this.chaseSpeed_ === 1.0
        ? this.state.camYawTarget
        : <Radians>(this.state.camYaw + this.yawErr_ * this.chaseSpeed_ * dt);
    }
  }

  /*
   * This is intentionally complex to reduce object creation and GC
   * Splitting it into subfunctions would not be optimal
   */

  private updateFtsRotation_(dt: number) {
    if (this.state.ftsRotateReset) {
      if (this.cameraType !== CameraType.FIXED_TO_SAT) {
        this.state.ftsRotateReset = false;
        this.state.ftsPitch = 0;
        this.state.camPitchSpeed = 0;
      }

      this.state.camYaw = normalizeAngle(this.state.camYaw);
      this.state.camPitch = normalizeAngle(this.state.camPitch);

      const marginOfError = 3;

      if (this.state.camPitch >= this.state.earthCenteredPitch - marginOfError && this.state.camPitch <= this.state.earthCenteredPitch + marginOfError) {
        this.state.camPitch = this.state.earthCenteredPitch;
        this.state.camPitchSpeed = 0;
      } else {
        const upOrDown = this.state.camPitch - this.state.earthCenteredPitch > 0 ? -1 : 1;

        this.state.camPitchSpeed = (dt * upOrDown * settingsManager.cameraMovementSpeed) / 50;
      }

      if (this.state.camYaw >= this.state.earthCenteredYaw - marginOfError && this.state.camYaw <= this.state.earthCenteredYaw + marginOfError) {
        this.state.camYaw = this.state.earthCenteredYaw;
        this.state.camYawSpeed = 0;
      } else {
        // Figure out the shortest distance back to this.state.earthCenteredYaw from this.state.camYaw
        const leftOrRight = this.state.camYaw - this.state.earthCenteredYaw > 0 ? -1 : 1;

        this.state.camYawSpeed = (dt * leftOrRight * settingsManager.cameraMovementSpeed) / 50;
      }

      if (this.state.camYaw === this.state.earthCenteredYaw && this.state.camPitch === this.state.earthCenteredPitch) {
        this.state.ftsRotateReset = false;
      }
    }

    if (this.cameraType === CameraType.FIXED_TO_SAT) {
      this.state.camPitch = normalizeAngle(this.state.camPitch);
      this.state.ftsPitch = this.state.camPitch;
      this.state.ftsYaw = this.state.camYaw;
    }
  }

  private updateLocalRotation_(dt: number) {
    if (this.state.isLocalRotateRoll || this.state.isLocalRotateYaw || this.state.isLocalRotateReset || this.state.isLocalRotateOverride) {
      this.state.localRotateTarget.pitch = normalizeAngle(this.state.localRotateTarget.pitch);
      this.state.localRotateTarget.yaw = normalizeAngle(this.state.localRotateTarget.yaw);
      this.state.localRotateTarget.roll = normalizeAngle(this.state.localRotateTarget.roll);
      this.state.localRotateCurrent.pitch = normalizeAngle(this.state.localRotateCurrent.pitch);
      this.state.localRotateCurrent.yaw = normalizeAngle(this.state.localRotateCurrent.yaw);
      this.state.localRotateCurrent.roll = normalizeAngle(this.state.localRotateCurrent.roll);

      // If user is actively moving
      if (this.state.isLocalRotateRoll || this.state.isLocalRotateYaw) {
        this.state.localRotateDif.pitch = <Radians>(this.state.screenDragPoint[1] - this.state.mouseY);
        this.state.localRotateTarget.pitch = <Radians>(this.state.localRotateStartPosition.pitch + this.state.localRotateDif.pitch * -settingsManager.cameraMovementSpeed);
        this.state.localRotateSpeed.pitch =
          normalizeAngle(<Radians>(this.state.localRotateCurrent.pitch - this.state.localRotateTarget.pitch)) * -settingsManager.cameraMovementSpeed;

        if (this.state.isLocalRotateRoll) {
          this.state.localRotateDif.roll = <Radians>(this.state.screenDragPoint[0] - this.state.mouseX);
          this.state.localRotateTarget.roll = <Radians>(this.state.localRotateStartPosition.roll + this.state.localRotateDif.roll * settingsManager.cameraMovementSpeed);
          this.state.localRotateSpeed.roll =
            normalizeAngle(<Radians>(this.state.localRotateCurrent.roll - this.state.localRotateTarget.roll)) * -settingsManager.cameraMovementSpeed;
        }
        if (this.state.isLocalRotateYaw) {
          this.state.localRotateDif.yaw = <Radians>(this.state.screenDragPoint[0] - this.state.mouseX);
          this.state.localRotateTarget.yaw = <Radians>(this.state.localRotateStartPosition.yaw + this.state.localRotateDif.yaw * settingsManager.cameraMovementSpeed);
          this.state.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.state.localRotateCurrent.yaw - this.state.localRotateTarget.yaw)) * -settingsManager.cameraMovementSpeed;
        }
      }

      if (this.state.isLocalRotateOverride) {
        this.state.localRotateTarget.pitch = <Radians>(this.state.localRotateStartPosition.pitch + this.state.localRotateDif.pitch * -settingsManager.cameraMovementSpeed);
        this.state.localRotateSpeed.pitch =
          normalizeAngle(<Radians>(this.state.localRotateCurrent.pitch - this.state.localRotateTarget.pitch)) * -settingsManager.cameraMovementSpeed;
        this.state.localRotateTarget.yaw = <Radians>(this.state.localRotateStartPosition.yaw + this.state.localRotateDif.yaw * settingsManager.cameraMovementSpeed);
        this.state.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.state.localRotateCurrent.yaw - this.state.localRotateTarget.yaw)) * -settingsManager.cameraMovementSpeed;
      }

      if (this.state.isLocalRotateReset) {
        this.state.localRotateTarget.pitch = <Radians>0;
        this.state.localRotateTarget.roll = <Radians>0;
        this.state.localRotateTarget.yaw = <Radians>0;
        this.state.localRotateDif.pitch = <Radians>-this.state.localRotateCurrent.pitch;
        this.state.localRotateDif.roll = <Radians>-this.state.localRotateCurrent.roll;
        this.state.localRotateDif.yaw = <Radians>-this.state.localRotateCurrent.yaw;
      }

      const resetModifier = this.state.isLocalRotateReset ? 750 : 1;

      this.state.localRotateSpeed.pitch -= this.state.localRotateSpeed.pitch * dt * this.localRotateMovementSpeed_;
      this.state.localRotateCurrent.pitch = <Radians>(this.state.localRotateCurrent.pitch + resetModifier * this.localRotateMovementSpeed_ * this.state.localRotateDif.pitch);

      if (this.state.isLocalRotateRoll || this.state.isLocalRotateReset) {
        this.state.localRotateSpeed.roll -= this.state.localRotateSpeed.roll * dt * this.localRotateMovementSpeed_;
        this.state.localRotateCurrent.roll = <Radians>(this.state.localRotateCurrent.roll + resetModifier * this.localRotateMovementSpeed_ * this.state.localRotateDif.roll);
      }

      if (this.state.isLocalRotateYaw || this.state.isLocalRotateReset || this.state.isLocalRotateOverride) {
        const leftOrRight = this.state.localRotateCurrent.yaw - this.state.localRotateTarget.yaw > 0 ? -1 : 1;

        this.state.localRotateSpeed.yaw += leftOrRight * this.state.localRotateSpeed.yaw * dt * this.localRotateMovementSpeed_;
        this.state.localRotateCurrent.yaw = <Radians>(this.state.localRotateCurrent.yaw + resetModifier * this.localRotateMovementSpeed_ * this.state.localRotateDif.yaw);
      }

      if (this.state.isLocalRotateReset) {
        if (this.state.localRotateCurrent.pitch > -0.001 && this.state.localRotateCurrent.pitch < 0.001) {
          this.state.localRotateCurrent.pitch = <Radians>0;
        }
        if (this.state.localRotateCurrent.roll > -0.001 && this.state.localRotateCurrent.roll < 0.001) {
          this.state.localRotateCurrent.roll = <Radians>0;
        }
        if (this.state.localRotateCurrent.yaw > -0.001 && this.state.localRotateCurrent.yaw < 0.001) {
          this.state.localRotateCurrent.yaw = <Radians>0;
        }
        if (this.state.localRotateCurrent.pitch === 0 && this.state.localRotateCurrent.roll === 0 && this.state.localRotateCurrent.yaw === <Radians>0) {
          this.state.isLocalRotateReset = false;
        }
      }
    }
  }

  private updatePan_(dt: number) {
    if (this.state.isScreenPan || this.state.isWorldPan || this.state.isPanReset) {
      // If user is actively moving
      if (this.state.isScreenPan || this.state.isWorldPan) {
        this.state.camPitchSpeed = 0;
        this.state.camYawSpeed = 0;
        this.state.panDif.x = this.state.screenDragPoint[0] - this.state.mouseX;
        this.state.panDif.y = this.state.screenDragPoint[1] - this.state.mouseY;
        this.state.panDif.z = this.state.screenDragPoint[1] - this.state.mouseY;

        // Slow down the panning if a satellite is selected
        if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1) {
          this.state.panDif.x /= 30;
          this.state.panDif.y /= 30;
          this.state.panDif.z /= 30;
        }

        this.state.panTarget.x = this.state.panStartPosition.x + this.state.panDif.x * this.panMovementSpeed_ * this.state.zoomLevel;
        if (this.state.isWorldPan) {
          this.state.panTarget.y = this.state.panStartPosition.y + this.state.panDif.y * this.panMovementSpeed_ * this.state.zoomLevel;
        }
        if (this.state.isScreenPan) {
          this.state.panTarget.z = this.state.panStartPosition.z + this.state.panDif.z * this.panMovementSpeed_ * this.state.zoomLevel;
        }
      }

      this.state.resetPan();

      const panResetModifier = this.state.isPanReset ? 0.5 : 1;

      // X is X no matter what
      this.state.panSpeed.x = (this.state.panCurrent.x - this.state.panTarget.x) * this.panMovementSpeed_ * this.state.zoomLevel;
      this.state.panSpeed.x -= this.state.panSpeed.x * dt * this.panMovementSpeed_ * this.state.zoomLevel;
      this.state.panCurrent.x += panResetModifier * this.panMovementSpeed_ * this.state.panDif.x;
      // If we are moving like an FPS then Y and Z are based on the angle of the this
      if (this.state.isWorldPan) {
        this.state.fpsPos[1] = <Radians>(this.state.fpsPos[1] - Math.cos(this.state.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed_ * this.state.panDif.y);
        this.state.fpsPos[2] = <Radians>(this.state.fpsPos[1] + Math.sin(this.state.localRotateCurrent.pitch) * panResetModifier * this.panMovementSpeed_ * this.state.panDif.y);
        this.state.fpsPos[1] = <Radians>(this.state.fpsPos[1] - Math.sin(-this.state.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed_ * this.state.panDif.x);
      }
      // If we are moving the screen then Z is always up and Y is not relevant
      if (this.state.isScreenPan || this.state.isPanReset) {
        this.state.panSpeed.z = (this.state.panCurrent.z - this.state.panTarget.z) * this.panMovementSpeed_ * this.state.zoomLevel;
        this.state.panSpeed.z -= this.state.panSpeed.z * dt * this.panMovementSpeed_ * this.state.zoomLevel;
        this.state.panCurrent.z -= panResetModifier * this.panMovementSpeed_ * this.state.panDif.z;
      }

      if (this.state.isPanReset) {
        this.state.fpsPos[0] -= this.state.fpsPos[0] / 25;
        this.state.fpsPos[1] -= this.state.fpsPos[1] / 25;
        this.state.fpsPos[2] -= this.state.fpsPos[2] / 25;

        if (this.state.panCurrent.x > -0.5 && this.state.panCurrent.x < 0.5) {
          this.state.panCurrent.x = 0;
        }
        if (this.state.panCurrent.y > -0.5 && this.state.panCurrent.y < 0.5) {
          this.state.panCurrent.y = 0;
        }
        if (this.state.panCurrent.z > -0.5 && this.state.panCurrent.z < 0.5) {
          this.state.panCurrent.z = 0;
        }
        if (this.state.fpsPos[0] > -0.5 && this.state.fpsPos[0] < 0.5) {
          this.state.fpsPos[0] = 0;
        }
        if (this.state.fpsPos[1] > -0.5 && this.state.fpsPos[1] < 0.5) {
          this.state.fpsPos[1] = 0;
        }
        if (this.state.fpsPos[2] > -0.5 && this.state.fpsPos[2] < 0.5) {
          this.state.fpsPos[2] = 0;
        }

        if (this.state.panCurrent.x === 0 && this.state.panCurrent.y === 0 && this.state.panCurrent.z === 0 &&
          this.state.fpsPos[0] === 0 && this.state.fpsPos[1] === 0 && this.state.fpsPos[2] === 0) {
          this.state.isPanReset = false;
        }
      }
    }
    if (settingsManager.isAutoPanD || settingsManager.isAutoPanU || settingsManager.isAutoPanL || settingsManager.isAutoPanR) {
      if (settingsManager.isAutoPanD) {
        this.state.panCurrent.z += settingsManager.autoPanSpeed * dt;
      }
      if (settingsManager.isAutoPanU) {
        this.state.panCurrent.z -= settingsManager.autoPanSpeed * dt;
      }
      if (settingsManager.isAutoPanL) {
        this.state.panCurrent.x += settingsManager.autoPanSpeed * dt;
      }
      if (settingsManager.isAutoPanR) {
        this.state.panCurrent.x -= settingsManager.autoPanSpeed * dt;
      }
    }
  }

  private updatePitchYawSpeeds_(dt: Milliseconds) {
    if ((this.state.isDragging && !settingsManager.isMobileModeEnabled) ||
      (this.state.isDragging && settingsManager.isMobileModeEnabled && (this.state.mouseX !== 0 || this.state.mouseY !== 0))) {
      /*
       * Disable Raycasting for Performance
       * dragTarget = getEarthScreenPoint(mouseX, mouseY)
       * if (Number.isNaN(dragTarget[0]) || Number.isNaN(dragTarget[1]) || Number.isNaN(dragTarget[2]) ||
       * Number.isNaN(dragPoint[0]) || Number.isNaN(dragPoint[1]) || Number.isNaN(dragPoint[2]) ||
       */
      if (
        !this.isRayCastingEarth_ ||
        this.cameraType === CameraType.FPS ||
        this.cameraType === CameraType.SATELLITE ||
        this.cameraType === CameraType.ASTRONOMY ||
        settingsManager.isMobileModeEnabled
      ) {
        // random screen drag
        const xDif = this.state.screenDragPoint[0] - this.state.mouseX;
        const yDif = this.state.screenDragPoint[1] - this.state.mouseY;
        const yawTarget = <Radians>(this.state.dragStartYaw + xDif * settingsManager.cameraMovementSpeed);
        const pitchTarget = <Radians>(this.state.dragStartPitch + yDif * -settingsManager.cameraMovementSpeed);

        this.state.camPitchSpeed = normalizeAngle(<Radians>(this.state.camPitch - pitchTarget)) * -settingsManager.cameraMovementSpeed;
        this.state.camYawSpeed = normalizeAngle(<Radians>(this.state.camYaw - yawTarget)) * -settingsManager.cameraMovementSpeed;
        /*
         * NOTE: this could be used for motion blur
         * this.camPitchAccel = this.camPitchSpeedLast - this.camPitchSpeed;
         * this.camYawAccel = this.camYawSpeedLast - this.camYawSpeed;
         * this.camPitchSpeedLast = this.camPitchSpeed * 1;
         * this.camYawSpeedLast = this.camYawSpeed * 1;
         */
      } else {
        /*
         * this is how we handle a raycast that hit the earth to make it feel like you are grabbing onto the surface
         * of the earth instead of the screen
         */
        /*
         * // earth surface point drag
         * // dragPointR = Math.sqrt(dragPoint[0] * dragPoint[0] + dragPoint[1] * dragPoint[1]);
         * // dragTargetR = Math.sqrt(dragTarget[0] * dragTarget[0] + dragTarget[1] * dragTarget[1]);
         * // dragPointLon = Math.atan2(dragPoint[1], dragPoint[0]);
         * // dragTargetLon = Math.atan2(dragTarget[1], dragTarget[0]);
         * // dragPointLat = Math.atan2(dragPoint[2], dragPointR);
         * // dragTargetLat = Math.atan2(dragTarget[2], dragTargetR);
         * // pitchDif = dragPointLat - dragTargetLat;
         * // yawDif = normalizeAngle(dragPointLon - dragTargetLon);
         * // this.camPitchSpeed = pitchDif * settingsManager.cameraMovementSpeed;
         * // this.camYawSpeed = yawDif * settingsManager.cameraMovementSpeed;
         */
      }
      this.state.isAutoPitchYawToTarget = false;
    } else {
      /*
       * this block of code is what causes the momentum effect when moving the camera
       * Most applications like Goolge Earth or STK do not have this effect as pronounced
       * It makes KeepTrack feel more like a game and less like a toolkit
       */
      this.state.camPitchSpeed -= this.state.camPitchSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor; // decay speeds when globe is "thrown"
      this.state.camYawSpeed -= this.state.camYawSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor;
      /*
       * NOTE: this could be used for motion blur
       * this.camPitchAccel *= 0.95;
       * this.camYawAccel *= 0.95;
       */
    }
  }

  /**
   * Zoom Changing
   *
   * this code might be better if applied directly to the shader versus a multiplier effect
   */
  private updateZoom_(dt: number) {
    if (this.state.zoomLevel !== this.state.zoomTarget) {
      this.updateSatShaderSizes();
    }

    const cameraDistance = this.getDistFromEarth();

    if (settingsManager.maxZoomDistance < 2e6) {
      // Scale minSize smoothly from 5.5 down to 3 as cameraDistance increases
      const minSizeMax = 5.5;
      const minSizeMin = 3.0;
      const startDist = 140000;
      const endDist = 280000;

      if (cameraDistance <= startDist) {
        settingsManager.satShader.minSize = minSizeMax;
      } else if (cameraDistance >= endDist) {
        settingsManager.satShader.minSize = minSizeMin;
      } else {
        const t = (cameraDistance - startDist) / (endDist - startDist); // 0..1

        settingsManager.satShader.minSize = minSizeMax + (minSizeMin - minSizeMax) * t;
      }
    }

    if (settingsManager.isAutoZoomIn || settingsManager.isAutoZoomOut) {

      if (settingsManager.isAutoZoomIn) {
        this.state.zoomTarget -= dt * settingsManager.autoZoomSpeed;
      }
      if (settingsManager.isAutoZoomOut) {
        this.state.zoomTarget += dt * settingsManager.autoZoomSpeed;
      }
    }

    if (this.state.isAutoPitchYawToTarget) {
      this.state.zoomLevel += (this.state.zoomTarget - this.state.zoomLevel) * dt * settingsManager.zoomSpeed; // Just keep zooming
    } else {
      const inOrOut = this.state.zoomLevel > this.state.zoomTarget ? -1 : 1;

      this.state.zoomLevel += inOrOut * dt * settingsManager.zoomSpeed * Math.abs(this.state.zoomTarget - this.state.zoomLevel);

      if ((this.state.zoomLevel > this.state.zoomTarget && !this.state.isZoomIn) || (this.state.zoomLevel < this.state.zoomTarget && this.state.isZoomIn)) {
        this.state.zoomTarget = this.state.zoomLevel; // If we change direction then consider us at the target
      }
    }

    // Clamp Zoom between 0 and 1
    this.state.zoomLevel = this.state.zoomLevel > 1 ? 1 : this.state.zoomLevel;
    this.state.zoomLevel = this.state.zoomLevel < 0 ? 0.0001 : this.state.zoomLevel;

    // Try to stay out of the earth
    if (this.cameraType === CameraType.FIXED_TO_EARTH || this.cameraType === CameraType.FIXED_TO_SAT) {
      if (this.getDistFromEarth() < RADIUS_OF_EARTH + 30) {
        this.state.zoomTarget = this.state.zoomLevel + 0.001;
      }
    }
  }

  updateSatShaderSizes() {
    if (this.state.zoomLevel > settingsManager.satShader.largeObjectMaxZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 1.5;
    } else if (this.state.zoomLevel < settingsManager.satShader.largeObjectMinZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize / 3;
    } else {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize;
    }
  }

  static calculatePMatrix(gl: WebGL2RenderingContext): mat4 {
    const depthConfig = DepthManager.getConfig();
    const pMatrix = mat4.create();

    mat4.perspective(pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, depthConfig.near, depthConfig.far);

    // This converts everything from 3D space to ECI (z and y planes are swapped)
    const eciToOpenGlMat: mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];

    mat4.mul(pMatrix, pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat

    return pMatrix;
  }
}
