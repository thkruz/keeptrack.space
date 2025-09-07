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

import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { SatShader, ToastMsgType } from '@app/engine/core/interfaces';
import { RADIUS_OF_EARTH, ZOOM_EXP } from '@app/engine/utils/constants';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4, quat, vec3 } from 'gl-matrix';
import { DEG2RAD, Degrees, DetailedSatellite, EciVec3, GreenwichMeanSiderealTime, Kilometers, Milliseconds, Radians, SpaceObjectType, Star, TAU, ZoomValue, eci2lla } from 'ootk';
import { SatMath } from '../../app/analysis/sat-math';
import { keepTrackApi } from '../../keepTrackApi';
import { SettingsManager } from '../../settings/settings';
import { EventBusEvent } from '../events/event-bus-events';
import type { OrbitManager } from '../rendering/orbitManager';
import { errorManagerInstance } from '../utils/errorManager';
import { alt2zoom, lat2pitch, lon2yaw, normalizeAngle } from '../utils/transforms';
import { CameraInputHandler } from './camera-input-handler';
import { CameraState } from './state/camera-state';

/**
 * Represents the different types of cameras available.
 *
 * TODO: This should be replaced with different camera classes
 */
export enum CameraType {
  CURRENT = 0,
  DEFAULT = 1,
  FIXED_TO_SAT = 2,
  FPS = 3,
  PLANETARIUM = 4,
  SATELLITE = 5,
  ASTRONOMY = 6,
  MAX_CAMERA_TYPES = 7,
  /** @deprecated */
  OFFSET = 8,
}

export class Camera {
  state = new CameraState();
  inputHandler = new CameraInputHandler(this);

  private chaseSpeed_ = 0.0005;
  private fpsLastTime_ = <Milliseconds>0;
  private isRayCastingEarth_ = false;
  private panMovementSpeed_ = 0.5;
  private localRotateMovementSpeed_ = 0.00005;

  private normForward_ = vec3.create();
  private normLeft_ = vec3.create();
  private normUp_ = vec3.create();

  private yawErr_ = <Radians>0;
  camMatrix = mat4.create().fill(0);
  cameraType: CameraType = CameraType.DEFAULT;

  settings_: SettingsManager;

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
    if (this.settings_.autoRotateSpeed === 0) {
      this.settings_.autoRotateSpeed = 0.0075;
    }

    if (typeof val === 'undefined') {
      this.state.isAutoRotate = !this.state.isAutoRotate;

      // If all auto rotate settings are off, set auto rotate left to true
      if (!this.settings_.isAutoRotateD && !this.settings_.isAutoRotateL && !this.settings_.isAutoRotateR && !this.settings_.isAutoRotateU) {
        this.settings_.isAutoRotateL = true;
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
      case CameraType.DEFAULT:
        this.cameraType = CameraType.FIXED_TO_SAT;
        break;
      case CameraType.FIXED_TO_SAT:
        this.cameraType = CameraType.FPS;
        break;
      case CameraType.FPS:
        this.cameraType = CameraType.SATELLITE;
        break;
      case CameraType.SATELLITE:
        this.cameraType = CameraType.DEFAULT;
        break;
      default:
        this.cameraType = CameraType.MAX_CAMERA_TYPES;
        break;
    }

    if ((this.cameraType === CameraType.FIXED_TO_SAT && !selectSatManagerInstance) || selectSatManagerInstance?.selectedSat === -1) {
      this.cameraType++;
    }
    if (this.cameraType === CameraType.FPS) {
      this.resetFpsPos_();
    }
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
      this.settings_.fieldOfView = 0.6;
      renderer.glInit();
      if ((selectSatManagerInstance?.selectedSat ?? -1) > -1) {
        this.state.camZoomSnappedOnSat = true;
        this.cameraType = CameraType.FIXED_TO_SAT;
      } else {
        this.cameraType = CameraType.DEFAULT;
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
      settingsManager.fieldOfView += delta * 0.0002;
      // getEl('fov-text').innerHTML = 'FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg';
      if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) {
        settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
      }
      if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) {
        settingsManager.fieldOfView = settingsManager.fieldOfViewMin;
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

  /*
   * This is intentionally complex to reduce object creation and GC
   * Splitting it into subfunctions would not be optimal
   */
  draw(sensorPos?: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number } | null): void {
    let target = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

    // TODO: This should be handled better
    target ??= <DetailedSatellite>(<unknown>{
      id: -1,
      missile: false,
      type: SpaceObjectType.UNKNOWN,
      static: false,
    });

    let gmst: GreenwichMeanSiderealTime;

    if (!sensorPos?.gmst) {
      const timeManagerInstance = keepTrackApi.getTimeManager();

      gmst = sensorPos?.gmst ?? SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;
    } else {
      gmst = sensorPos.gmst;
    }

    this.drawPreValidate_(sensorPos);
    mat4.identity(this.camMatrix);

    // Ensure we don't zoom in past our satellite
    if (this.cameraType === CameraType.FIXED_TO_SAT) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        this.cameraType = CameraType.DEFAULT;
      } else {
        const satAlt = SatMath.getAlt(target.position, gmst);

        if (this.getCameraDistance() < satAlt + RADIUS_OF_EARTH + this.settings_.minDistanceFromSatellite) {
          this.state.zoomTarget = alt2zoom(satAlt, this.settings_.minZoomDistance, this.settings_.maxZoomDistance, this.settings_.minDistanceFromSatellite);
          // errorManagerInstance.debug('Zooming in to ' + this.zoomTarget_ + ' to because we are too close to the satellite');
          this.state.zoomLevel = this.state.zoomTarget;
        }
      }
    }

    if (this.cameraType === CameraType.SATELLITE) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        this.cameraType = CameraType.DEFAULT;
      }
    }

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
        this.drawFixedToSatellite_(target);
        break;
      case CameraType.FPS: // FPS style movement
        this.drawFirstPersonView_();
        break;
      case CameraType.PLANETARIUM: {
        /*
         * Pitch is the opposite of the angle to the latitude
         * Yaw is 90 degrees to the left of the angle to the longitude
         */
        if (!sensorPos) {
          throw new Error('Sensor Position is undefined');
        }
        this.drawPlanetarium_(sensorPos);
        break;
      }
      case CameraType.SATELLITE: {
        this.drawSatellite_(target);
        break;
      }
      case CameraType.ASTRONOMY: {
        /*
         * Pitch is the opposite of the angle to the latitude
         * Yaw is 90 degrees to the left of the angle to the longitude
         */
        if (!sensorPos) {
          throw new Error('Sensor Position is undefined');
        }
        this.drawAstronomy_(sensorPos);
        break;
      }
      default:
        break;
    }
  }

  exitFixedToSat(): void {
    if (this.cameraType !== CameraType.FIXED_TO_SAT) {
      return;
    }

    const cameraDistance = this.getCameraDistance();

    this.state.ftsRotateReset = true;

    // If within 9000km then we want to move further back to feel less jarring
    if (cameraDistance > 9000) {
      this.cameraType = CameraType.DEFAULT;

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
    return ((distance - this.settings_.minZoomDistance) / (this.settings_.maxZoomDistance - this.settings_.minZoomDistance)) ** (1 / ZOOM_EXP);
  }

  /**
   * Calculates the zoom distance based on the zoom level
   *
   * Zoom level is ALWAYS raised to the power of ZOOM_EXP to ensure that zooming out is faster than zooming in
   * TODO: This should be handled before getting the zoomLevel_ value
   */
  getCameraDistance(): Kilometers {
    return <Kilometers>(this.state.zoomLevel ** ZOOM_EXP * (this.settings_.maxZoomDistance - this.settings_.minZoomDistance) + this.settings_.minZoomDistance);
  }

  /**
   * Calculates the ECI of the Camera based on the camMatrix
   *
   * Used in RayCasting
   */
  getCamPos(): vec3 {
    vec3.transformMat4(this.state.position, this.state.position, this.camMatrix);

    return this.state.position;
  }

  getDistFromEarth(): Kilometers {
    const position = this.getCamPos();


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
    if (this.cameraType === CameraType.DEFAULT) {
      const xRot = Math.sin(-this.state.camYaw) * Math.cos(this.state.camPitch);
      const yRot = Math.cos(this.state.camYaw) * Math.cos(this.state.camPitch);
      const zRot = Math.sin(-this.state.camPitch);


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
      const gmst = keepTrackApi.getTimeManager().gmst;

      this.state.camSnapToSat.altitude = SatMath.getAlt(target, gmst);
      targetDistanceFromEarth = this.state.camSnapToSat.altitude + RADIUS_OF_EARTH;
    }
    const radius = this.getCameraDistance() - targetDistanceFromEarth;


    return radius;
  }

  getForwardVector(): vec3 {
    const inverted = mat4.create();
    const forward = vec3.create();

    mat4.invert(inverted, this.camMatrix);
    vec3.transformMat4(forward, forward, inverted);

    return forward;
  }

  init(settings: SettingsManager) {
    this.settings_ = settings;

    this.state.zoomLevel = settingsManager.initZoomLevel ?? 0.6925;
    this.state.zoomTarget = settingsManager.initZoomLevel ?? 0.6925;

    this.inputHandler.init();

    keepTrackApi.on(EventBusEvent.selectSatData, () => {
      this.state.isAutoPitchYawToTarget = false;
    });
  }

  /**
   * Sets the camera to look at a specific latitude and longitude with a given zoom level.
   */
  lookAtLatLon(lat: Degrees, lon: Degrees, zoom: ZoomValue | number, date = keepTrackApi.getTimeManager().simulationTimeObj): void {
    this.changeZoom(zoom);
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
    this.cameraType = CameraType.DEFAULT; // Earth will block the view of the star
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
    this.resetFpsPos_();
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

        this.state.camSnapToSat.altitude = SatMath.getAlt(sat.position, gmst);
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
    this.settings_.isAutoPanU = !this.settings_.isAutoPanU;
  }

  panDown() {
    this.settings_.isAutoPanD = !this.settings_.isAutoPanD;
  }

  panLeft() {
    this.settings_.isAutoPanL = !this.settings_.isAutoPanL;
  }

  panRight() {
    this.settings_.isAutoPanR = !this.settings_.isAutoPanR;
  }

  /**
   * Calculate the camera's position and camera matrix
   */
  update(dt: Milliseconds) {
    this.updatePan_(dt);
    this.updateLocalRotation_(dt);
    this.updatePitchYawSpeeds_(dt);
    this.updateFtsRotation_(dt);

    this.state.camRotateSpeed -= this.state.camRotateSpeed * dt * this.settings_.cameraMovementSpeed;

    if (this.cameraType === CameraType.FPS || this.cameraType === CameraType.SATELLITE || this.cameraType === CameraType.ASTRONOMY) {
      this.updateFpsMovement_(dt);
    } else {
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

    if (this.state.isAutoRotate) {
      if (this.settings_.isAutoRotateL) {
        this.state.camYaw = <Radians>(this.state.camYaw - this.settings_.autoRotateSpeed * dt * (this.inputHandler.isHoldingDownAKey));
      }
      if (this.settings_.isAutoRotateR) {
        this.state.camYaw = <Radians>(this.state.camYaw + this.settings_.autoRotateSpeed * dt * (this.inputHandler.isHoldingDownAKey));
      }
      if (this.settings_.isAutoRotateU) {
        this.state.camPitch = <Radians>(this.state.camPitch + (this.settings_.autoRotateSpeed / 2) * dt * (this.inputHandler.isHoldingDownAKey));
      }
      if (this.settings_.isAutoRotateD) {
        this.state.camPitch = <Radians>(this.state.camPitch - (this.settings_.autoRotateSpeed / 2) * dt * (this.inputHandler.isHoldingDownAKey));
      }
    }

    this.updateZoom_(dt);

    this.updateCameraSnapMode(dt);

    if (this.cameraType !== CameraType.FIXED_TO_SAT) {
      if (this.state.camPitch > TAU / 4) {
        this.state.camPitch = <Radians>(TAU / 4);
      }
      if (this.state.camPitch < -TAU / 4) {
        this.state.camPitch = <Radians>(-TAU / 4);
      }
    }

    if (this.state.camYaw > TAU) {
      this.state.camYaw = <Radians>(this.state.camYaw - TAU);
    }
    if (this.state.camYaw < 0) {
      this.state.camYaw = <Radians>(this.state.camYaw + TAU);
    }

    if (this.cameraType === CameraType.DEFAULT || this.cameraType === CameraType.OFFSET) {
      this.state.earthCenteredPitch = this.state.camPitch;
      this.state.earthCenteredYaw = this.state.camYaw;
      if (this.state.earthCenteredYaw < 0) {
        this.state.earthCenteredYaw = <Radians>(this.state.earthCenteredYaw + TAU);
      }
    }
  }

  zoomLevel(): number {
    return this.state.zoomLevel;
  }

  private drawAstronomy_(sensorPos: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number }) {
    this.state.fpsPitch = <Degrees>(-1 * sensorPos.lat * DEG2RAD);

    const sensorPosU = vec3.fromValues(-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01);

    this.state.fpsPos[0] = sensorPos.x;
    this.state.fpsPos[1] = sensorPos.y;
    this.state.fpsPos[2] = sensorPos.z;

    mat4.rotate(this.camMatrix, this.camMatrix, this.state.fpsPitch + -this.state.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.camMatrix, this.camMatrix, -this.state.fpsRotate * DEG2RAD, [0, 1, 0]);
    vec3.normalize(this.normUp_, sensorPosU);
    mat4.rotate(this.camMatrix, this.camMatrix, -this.state.fpsYaw * DEG2RAD, this.normUp_);

    mat4.translate(this.camMatrix, this.camMatrix, [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01]);

    /*
     * const q = quat.create();
     * const newrot = mat4.create();
     * quat.fromEuler(q, this.ftsPitch * RAD2DEG, 0, -this.ftsYaw_ * RAD2DEG);
     * mat4.fromQuat(newrot, q);
     * mat4.multiply(this.camMatrix, newrot, this.camMatrix);
     */
  }

  private drawFixedToEarth_() {
    // 4. Rotate the camera around the new local origin
    mat4.rotateX(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.yaw);

    // 3. Adjust for panning
    mat4.translate(this.camMatrix, this.camMatrix, [this.state.panCurrent.x, this.state.panCurrent.y, this.state.panCurrent.z]);

    // 2. Back away from the earth in the Y direction (depth)
    mat4.translate(this.camMatrix, this.camMatrix, [0, this.getCameraDistance(), 0]);
    // 1. Rotate around the earth (0,0,0)
    mat4.rotateX(this.camMatrix, this.camMatrix, this.state.earthCenteredPitch);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.state.earthCenteredYaw);
  }

  private drawFirstPersonView_() {
    // Rotate the camera
    mat4.rotate(this.camMatrix, this.camMatrix, -this.state.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.camMatrix, this.camMatrix, this.state.fpsYaw * DEG2RAD, [0, 0, 1]);
    // Move the camera to the FPS position
    mat4.translate(this.camMatrix, this.camMatrix, [this.state.fpsPos[0], this.state.fpsPos[1], -this.state.fpsPos[2]]);
  }

  private drawFixedToSatellite_(target: DetailedSatellite | MissileObject) {
    /*
     * mat4 commands are run in reverse order
     * 1. Move to the satellite position
     * 2. Twist the camera around Z-axis
     * 3. Pitch the camera around X-axis (this may have moved because of the Z-axis rotation)
     * 4. Back away from the satellite
     * 5. Adjust for panning
     * 6. Rotate the camera FPS style
     */
    mat4.rotateX(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.yaw);

    mat4.translate(this.camMatrix, this.camMatrix, [this.state.panCurrent.x, this.state.panCurrent.y, this.state.panCurrent.z]);

    mat4.translate(this.camMatrix, this.camMatrix, [0, this.getCameraRadius(target.position), 0]);

    mat4.rotateX(this.camMatrix, this.camMatrix, this.state.ftsPitch);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.state.ftsYaw);

    // mat4.translate(this.camMatrix, this.camMatrix, targetPosition);
  }

  private drawOffsetOfEarth_() {
    // Rotate the camera
    mat4.rotateX(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.state.localRotateCurrent.yaw);
    // Adjust for panning
    mat4.translate(this.camMatrix, this.camMatrix, [this.state.panCurrent.x, this.state.panCurrent.y, this.state.panCurrent.z]);
    // Back away from the earth
    mat4.translate(this.camMatrix, this.camMatrix, [this.settings_.offsetCameraModeX, this.getCameraDistance(), this.settings_.offsetCameraModeZ]);
    // Adjust for FPS style rotation
    mat4.rotateX(this.camMatrix, this.camMatrix, this.state.earthCenteredPitch);
    mat4.rotateZ(this.camMatrix, this.camMatrix, -this.state.earthCenteredYaw);
  }

  private drawPlanetarium_(sensorPos: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number }) {
    this.state.fpsPitch = <Degrees>(-1 * sensorPos.lat * DEG2RAD);
    this.state.fpsRotate = <Degrees>((90 - sensorPos.lon) * DEG2RAD - sensorPos.gmst);
    mat4.rotate(this.camMatrix, this.camMatrix, this.state.fpsPitch, [1, 0, 0]);
    mat4.rotate(this.camMatrix, this.camMatrix, this.state.fpsRotate, [0, 0, 1]);
    mat4.translate(this.camMatrix, this.camMatrix, [-sensorPos.x, -sensorPos.y, -sensorPos.z]);
  }

  private drawPreValidate_(sensorPos?: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number } | null) {
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
        errorManagerInstance.debug(`this.settings_.cameraMovementSpeed: ${this.settings_.cameraMovementSpeed}`);
      } catch (e) {
        errorManagerInstance.info('Camera Math Error');
      }
      this.state.camPitch = <Radians>0.5;
      this.state.camYaw = <Radians>0.5;
      this.state.zoomLevel = 0.5;
      this.state.camPitchTarget = <Radians>0;
      this.state.camYawTarget = <Radians>0;
      this.state.zoomTarget = 0.5;
    }

    if (!sensorPos && (this.cameraType === CameraType.PLANETARIUM || this.cameraType === CameraType.ASTRONOMY)) {
      this.cameraType = CameraType.DEFAULT;
      errorManagerInstance.debug('A sensor should be selected first if this mode is allowed to be planetarium or astronmy.');
    }
  }

  private drawSatellite_(target: DetailedSatellite | MissileObject) {
    const targetPositionTemp = vec3.fromValues(-target.position.x, -target.position.y, -target.position.z);

    mat4.translate(this.camMatrix, this.camMatrix, targetPositionTemp);
    vec3.normalize(this.normUp_, targetPositionTemp);
    vec3.normalize(this.normForward_, [target.velocity.x, target.velocity.y, target.velocity.z]);
    vec3.transformQuat(this.normLeft_, this.normUp_, quat.fromValues(this.normForward_[0], this.normForward_[1], this.normForward_[2], 90 * DEG2RAD));
    const targetNextPosition = vec3.fromValues(target.position.x + target.velocity.x, target.position.y + target.velocity.y, target.position.z + target.velocity.z);

    mat4.lookAt(this.camMatrix, targetNextPosition, targetPositionTemp, this.normUp_);

    mat4.translate(this.camMatrix, this.camMatrix, [target.position.x, target.position.y, target.position.z]);

    mat4.rotate(this.camMatrix, this.camMatrix, this.state.fpsPitch * DEG2RAD, this.normLeft_);
    mat4.rotate(this.camMatrix, this.camMatrix, -this.state.fpsYaw * DEG2RAD, this.normUp_);

    mat4.translate(this.camMatrix, this.camMatrix, targetPositionTemp);
  }

  private resetFpsPos_(): void {
    this.state.fpsPitch = <Degrees>0;
    this.state.fpsYaw = <Degrees>0;
    this.state.fpsPos[0] = 0;

    // Move out from the center of the Earth in FPS Mode
    if (this.cameraType === CameraType.FPS) {
      this.state.fpsPos[1] = 25000;
    } else {
      this.state.fpsPos[1] = 0;
    }
    this.state.fpsPos[2] = 0;
  }

  private updateCameraSnapMode(dt: Milliseconds) {
    if (this.state.isAutoPitchYawToTarget) {
      this.state.camPitch = <Radians>(this.state.camPitch + (this.state.camPitchTarget - this.state.camPitch) * this.chaseSpeed_ * dt);

      this.yawErr_ = normalizeAngle(<Radians>(this.state.camYawTarget - this.state.camYaw));
      this.state.camYaw = <Radians>(this.state.camYaw + this.yawErr_ * this.chaseSpeed_ * dt);
    }
  }

  /*
   * This is intentionally complex to reduce object creation and GC
   * Splitting it into subfunctions would not be optimal
   */
  private updateFpsMovement_(dt: Milliseconds): void {
    this.state.fpsPitch = <Degrees>(this.state.fpsPitch - 20 * this.state.camPitchSpeed * dt);
    this.state.fpsYaw = <Degrees>(this.state.fpsYaw - 20 * this.state.camYawSpeed * dt);
    this.state.fpsRotate = <Degrees>(this.state.fpsRotate - 20 * this.state.camRotateSpeed * dt);

    // Prevent Over Rotation
    if (this.state.fpsPitch > 90) {
      this.state.fpsPitch = <Degrees>90;
    }
    if (this.state.fpsPitch < -90) {
      this.state.fpsPitch = <Degrees>-90;
    }
    if (this.state.fpsRotate > 360) {
      this.state.fpsRotate = <Degrees>(this.state.fpsRotate - 360);
    }
    if (this.state.fpsRotate < 0) {
      this.state.fpsRotate = <Degrees>(this.state.fpsRotate + 360);
    }
    if (this.state.fpsYaw > 360) {
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw - 360);
    }
    if (this.state.fpsYaw < 0) {
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw + 360);
    }

    const fpsTimeNow = <Milliseconds>Date.now();

    if (this.fpsLastTime_ !== 0) {
      const fpsElapsed = <Milliseconds>(fpsTimeNow - this.fpsLastTime_);

      if (this.state.isFPSForwardSpeedLock && this.state.fpsForwardSpeed < 0) {
        this.state.fpsForwardSpeed = Math.max(this.state.fpsForwardSpeed + Math.min(this.state.fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -this.settings_.fpsForwardSpeed);
      } else if (this.state.isFPSForwardSpeedLock && this.state.fpsForwardSpeed > 0) {
        this.state.fpsForwardSpeed = Math.min(this.state.fpsForwardSpeed + Math.max(this.state.fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), this.settings_.fpsForwardSpeed);
      }

      if (this.state.isFPSSideSpeedLock && this.state.fpsSideSpeed < 0) {
        this.state.fpsSideSpeed = Math.max(this.state.fpsSideSpeed + Math.min(this.state.fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -this.settings_.fpsSideSpeed);
      } else if (this.state.isFPSSideSpeedLock && this.state.fpsSideSpeed > 0) {
        this.state.fpsSideSpeed = Math.min(this.state.fpsSideSpeed + Math.max(this.state.fpsSideSpeed * 1.02 * fpsElapsed, 0.2), this.settings_.fpsSideSpeed);
      }

      if (this.state.isFPSVertSpeedLock && this.state.fpsVertSpeed < 0) {
        this.state.fpsVertSpeed = Math.max(this.state.fpsVertSpeed + Math.min(this.state.fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -this.settings_.fpsVertSpeed);
      } else if (this.state.isFPSVertSpeedLock && this.state.fpsVertSpeed > 0) {
        this.state.fpsVertSpeed = Math.min(this.state.fpsVertSpeed + Math.max(this.state.fpsVertSpeed * 1.02 * fpsElapsed, 0.2), this.settings_.fpsVertSpeed);
      }

      if (this.cameraType === CameraType.FPS) {
        if (this.state.fpsForwardSpeed !== 0) {
          this.state.fpsPos[0] -= Math.sin(this.state.fpsYaw * DEG2RAD) * this.state.fpsForwardSpeed * this.state.fpsRun * fpsElapsed;
          this.state.fpsPos[1] -= Math.cos(this.state.fpsYaw * DEG2RAD) * this.state.fpsForwardSpeed * this.state.fpsRun * fpsElapsed;
          this.state.fpsPos[2] += Math.sin(this.state.fpsPitch * DEG2RAD) * this.state.fpsForwardSpeed * this.state.fpsRun * fpsElapsed;
        }
        if (this.state.fpsVertSpeed !== 0) {
          this.state.fpsPos[2] -= this.state.fpsVertSpeed * this.state.fpsRun * fpsElapsed;
        }
        if (this.state.fpsSideSpeed !== 0) {
          this.state.fpsPos[0] -= Math.cos(-this.state.fpsYaw * DEG2RAD) * this.state.fpsSideSpeed * this.state.fpsRun * fpsElapsed;
          this.state.fpsPos[1] -= Math.sin(-this.state.fpsYaw * DEG2RAD) * this.state.fpsSideSpeed * this.state.fpsRun * fpsElapsed;
        }
      }

      if (!this.state.isFPSForwardSpeedLock) {
        this.state.fpsForwardSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      }
      if (!this.state.isFPSSideSpeedLock) {
        this.state.fpsSideSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      }
      if (!this.state.isFPSVertSpeedLock) {
        this.state.fpsVertSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      }

      if (this.state.fpsForwardSpeed < 0.01 && this.state.fpsForwardSpeed > -0.01) {
        this.state.fpsForwardSpeed = 0;
      }
      if (this.state.fpsSideSpeed < 0.01 && this.state.fpsSideSpeed > -0.01) {
        this.state.fpsSideSpeed = 0;
      }
      if (this.state.fpsVertSpeed < 0.01 && this.state.fpsVertSpeed > -0.01) {
        this.state.fpsVertSpeed = 0;
      }

      this.state.fpsPitch = <Degrees>(this.state.fpsPitch + this.state.fpsPitchRate * fpsElapsed);
      this.state.fpsRotate = <Degrees>(this.state.fpsRotate + this.state.fpsRotateRate * fpsElapsed);
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw + this.state.fpsYawRate * fpsElapsed);
    }
    this.fpsLastTime_ = fpsTimeNow;
  }

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

        this.state.camPitchSpeed = (dt * upOrDown * this.settings_.cameraMovementSpeed) / 50;
      }

      if (this.state.camYaw >= this.state.earthCenteredYaw - marginOfError && this.state.camYaw <= this.state.earthCenteredYaw + marginOfError) {
        this.state.camYaw = this.state.earthCenteredYaw;
        this.state.camYawSpeed = 0;
      } else {
        // Figure out the shortest distance back to this.state.earthCenteredYaw from this.state.camYaw
        const leftOrRight = this.state.camYaw - this.state.earthCenteredYaw > 0 ? -1 : 1;

        this.state.camYawSpeed = (dt * leftOrRight * this.settings_.cameraMovementSpeed) / 50;
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
        this.state.localRotateTarget.pitch = <Radians>(this.state.localRotateStartPosition.pitch + this.state.localRotateDif.pitch * -this.settings_.cameraMovementSpeed);
        this.state.localRotateSpeed.pitch =
          normalizeAngle(<Radians>(this.state.localRotateCurrent.pitch - this.state.localRotateTarget.pitch)) * -this.settings_.cameraMovementSpeed;

        if (this.state.isLocalRotateRoll) {
          this.state.localRotateDif.roll = <Radians>(this.state.screenDragPoint[0] - this.state.mouseX);
          this.state.localRotateTarget.roll = <Radians>(this.state.localRotateStartPosition.roll + this.state.localRotateDif.roll * this.settings_.cameraMovementSpeed);
          this.state.localRotateSpeed.roll =
            normalizeAngle(<Radians>(this.state.localRotateCurrent.roll - this.state.localRotateTarget.roll)) * -this.settings_.cameraMovementSpeed;
        }
        if (this.state.isLocalRotateYaw) {
          this.state.localRotateDif.yaw = <Radians>(this.state.screenDragPoint[0] - this.state.mouseX);
          this.state.localRotateTarget.yaw = <Radians>(this.state.localRotateStartPosition.yaw + this.state.localRotateDif.yaw * this.settings_.cameraMovementSpeed);
          this.state.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.state.localRotateCurrent.yaw - this.state.localRotateTarget.yaw)) * -this.settings_.cameraMovementSpeed;
        }
      }

      if (this.state.isLocalRotateOverride) {
        this.state.localRotateTarget.pitch = <Radians>(this.state.localRotateStartPosition.pitch + this.state.localRotateDif.pitch * -this.settings_.cameraMovementSpeed);
        this.state.localRotateSpeed.pitch =
          normalizeAngle(<Radians>(this.state.localRotateCurrent.pitch - this.state.localRotateTarget.pitch)) * -this.settings_.cameraMovementSpeed;
        this.state.localRotateTarget.yaw = <Radians>(this.state.localRotateStartPosition.yaw + this.state.localRotateDif.yaw * this.settings_.cameraMovementSpeed);
        this.state.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.state.localRotateCurrent.yaw - this.state.localRotateTarget.yaw)) * -this.settings_.cameraMovementSpeed;
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
    if (this.settings_.isAutoPanD || this.settings_.isAutoPanU || this.settings_.isAutoPanL || this.settings_.isAutoPanR) {
      if (this.settings_.isAutoPanD) {
        this.state.panCurrent.z += this.settings_.autoPanSpeed * dt;
      }
      if (this.settings_.isAutoPanU) {
        this.state.panCurrent.z -= this.settings_.autoPanSpeed * dt;
      }
      if (this.settings_.isAutoPanL) {
        this.state.panCurrent.x += this.settings_.autoPanSpeed * dt;
      }
      if (this.settings_.isAutoPanR) {
        this.state.panCurrent.x -= this.settings_.autoPanSpeed * dt;
      }
    }
  }

  private updatePitchYawSpeeds_(dt: Milliseconds) {
    if ((this.state.isDragging && !this.settings_.isMobileModeEnabled) ||
      (this.state.isDragging && this.settings_.isMobileModeEnabled && (this.state.mouseX !== 0 || this.state.mouseY !== 0))) {
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
        this.settings_.isMobileModeEnabled
      ) {
        // random screen drag
        const xDif = this.state.screenDragPoint[0] - this.state.mouseX;
        const yDif = this.state.screenDragPoint[1] - this.state.mouseY;
        const yawTarget = <Radians>(this.state.dragStartYaw + xDif * this.settings_.cameraMovementSpeed);
        const pitchTarget = <Radians>(this.state.dragStartPitch + yDif * -this.settings_.cameraMovementSpeed);

        this.state.camPitchSpeed = normalizeAngle(<Radians>(this.state.camPitch - pitchTarget)) * -this.settings_.cameraMovementSpeed;
        this.state.camYawSpeed = normalizeAngle(<Radians>(this.state.camYaw - yawTarget)) * -this.settings_.cameraMovementSpeed;
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
         * // this.camPitchSpeed = pitchDif * this.settings_.cameraMovementSpeed;
         * // this.camYawSpeed = yawDif * this.settings_.cameraMovementSpeed;
         */
      }
      this.state.isAutoPitchYawToTarget = false;
    } else {
      /*
       * this block of code is what causes the momentum effect when moving the camera
       * Most applications like Goolge Earth or STK do not have this effect as pronounced
       * It makes KeepTrack feel more like a game and less like a toolkit
       */
      this.state.camPitchSpeed -= this.state.camPitchSpeed * dt * this.settings_.cameraMovementSpeed * this.settings_.cameraDecayFactor; // decay speeds when globe is "thrown"
      this.state.camYawSpeed -= this.state.camYawSpeed * dt * this.settings_.cameraMovementSpeed * this.settings_.cameraDecayFactor;
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
        this.state.zoomTarget -= dt * this.settings_.autoZoomSpeed;
      }
      if (this.settings_.isAutoZoomOut) {
        this.state.zoomTarget += dt * this.settings_.autoZoomSpeed;
      }
    }

    if (this.state.isAutoPitchYawToTarget) {
      this.state.zoomLevel += (this.state.zoomTarget - this.state.zoomLevel) * dt * this.settings_.zoomSpeed; // Just keep zooming
    } else {
      const inOrOut = this.state.zoomLevel > this.state.zoomTarget ? -1 : 1;

      this.state.zoomLevel += inOrOut * dt * this.settings_.zoomSpeed * Math.abs(this.state.zoomTarget - this.state.zoomLevel);

      if ((this.state.zoomLevel > this.state.zoomTarget && !this.state.isZoomIn) || (this.state.zoomLevel < this.state.zoomTarget && this.state.isZoomIn)) {
        this.state.zoomTarget = this.state.zoomLevel; // If we change direction then consider us at the target
      }
    }

    // Clamp Zoom between 0 and 1
    this.state.zoomLevel = this.state.zoomLevel > 1 ? 1 : this.state.zoomLevel;
    this.state.zoomLevel = this.state.zoomLevel < 0 ? 0.0001 : this.state.zoomLevel;

    // Try to stay out of the earth
    if (this.cameraType === CameraType.DEFAULT || this.cameraType === CameraType.OFFSET || this.cameraType === CameraType.FIXED_TO_SAT) {
      if (this.getDistFromEarth() < RADIUS_OF_EARTH + 30) {
        this.state.zoomTarget = this.state.zoomLevel + 0.001;
      }
    }
  }

  updateSatShaderSizes() {
    if (this.state.zoomLevel > this.settings_.satShader.largeObjectMaxZoom) {
      this.settings_.satShader.maxSize = this.settings_.satShader.maxAllowedSize * 1.5;
    } else if (this.state.zoomLevel < this.settings_.satShader.largeObjectMinZoom) {
      this.settings_.satShader.maxSize = this.settings_.satShader.maxAllowedSize / 3;
    } else {
      this.settings_.satShader.maxSize = this.settings_.satShader.maxAllowedSize;
    }
  }
}
