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
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { RADIUS_OF_EARTH, ZOOM_EXP } from '@app/engine/utils/constants';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import {
  DEG2RAD, Degrees,
  GreenwichMeanSiderealTime, Kilometers, Milliseconds, Radians,
  Satellite,
  SpaceObjectType, Star, TAU,
  TemeVec3,
  ZoomValue, eci2lla,
} from '@ootk/src/main';
import { mat4, quat, vec3 } from 'gl-matrix';
import { SatMath } from '../../app/analysis/sat-math';
import { PluginRegistry } from '../core/plugin-registry';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { DepthManager } from '../rendering/depth-manager';
import { CelestialBody } from '../rendering/draw-manager/celestial-bodies/celestial-body';
import { Earth } from '../rendering/draw-manager/earth';
import { errorManagerInstance } from '../utils/errorManager';
import { alt2zoom, lat2pitch, lon2yaw, normalizeAngle } from '../utils/transforms';
import { CameraInputHandler } from './camera-input-handler';
import { CameraTransition } from './camera-transition';
import { CameraType } from './camera-type';
import { CameraState } from './state/camera-state';

/**
 * Interface for external camera mode implementations (e.g., Flat Map).
 * Allows plugins to define custom draw behavior, zoom, and drag handling
 * without embedding all logic in the Camera class.
 */
export interface ICameraModeDelegate {
  /** Called from Camera.draw() to set projectionMatrix and matrixWorldInverse. */
  draw(camera: Camera): void;
  /** Called from Camera.update() each frame for momentum/animation. */
  update(camera: Camera, dt: Milliseconds): void;
  /** Called from Camera.zoomWheel() to handle zoom. Return true if handled. */
  zoomWheel(camera: Camera, delta: number): boolean;
  /** Called from Camera.updatePitchYawSpeeds_() during drag. Return true if handled. */
  handleDrag(camera: Camera): boolean;
  /** Called when entering this camera mode. */
  onEnter(camera: Camera): void;
  /** Called when leaving this camera mode. */
  onExit(camera: Camera): void;
}

export class Camera {
  state = new CameraState();
  inputHandler = new CameraInputHandler(this);
  readonly transition = new CameraTransition();

  private chaseSpeed_ = 0.0005;
  private wasDragging_ = false;
  private fpsLastTime_ = <Milliseconds>0;
  private isRayCastingEarth_ = false;
  private panMovementSpeed_ = 0.5;
  private localRotateMovementSpeed_ = 0.00005;

  // Flat map state (public: read by renderers for shader uniforms)
  flatMapPanX = 0; // km, longitude direction
  flatMapPanY = 0; // km, latitude direction
  flatMapZoom = 1; // 1 = full earth visible

  // Polar view state (public: read by renderers for shader uniforms)
  polarViewPanX = 0; // km offset from center
  polarViewPanY = 0; // km offset from center
  polarViewZoom = 1; // 1 = full hemisphere visible

  // Camera mode delegates (plugin-provided camera modes like flat map, polar view)
  private cameraModeDelegates_ = new Map<CameraType, ICameraModeDelegate>();
  private lastCameraType_: CameraType = CameraType.FIXED_TO_EARTH;
  private fovTarget_: Radians | null = null;
  private fovDefault_: Radians | null = null;

  registerCameraModeDelegate(type: CameraType, delegate: ICameraModeDelegate): void {
    this.cameraModeDelegates_.set(type, delegate);
  }

  unregisterCameraModeDelegate(type: CameraType): void {
    this.cameraModeDelegates_.delete(type);
  }

  private normForward_ = vec3.create();
  private normLeft_ = vec3.create();
  private normUp_ = vec3.create();

  // LVLH frame basis vectors for FIXED_TO_SAT mode (reused each frame)
  private lvlhRadial_ = vec3.create();
  private lvlhInTrack_ = vec3.create();
  private lvlhCrossTrack_ = vec3.create();
  private lvlhTempMatrix_ = mat4.create();

  private yawErr_ = <Radians>0;
  /**
     * Main source of projection matrix for rest of the application
     */
  projectionMatrix: mat4 = mat4.create();
  private singularMatrixWarned_ = false;
  get matrixWorld(): mat4 {
    const out = mat4.create();
    const inverted = mat4.invert(out, this.matrixWorldInverse);

    if (!inverted) {
      // matrixWorldInverse is singular (zero determinant); return identity so callers
      // reading [12]/[13]/[14] get a valid mat4 instead of null. See issue #1318.
      // Logged once per instance — getCamPos() reads this 3x/frame, so unguarded
      // logging would emit ~180 messages/sec while the singular state persists.
      if (!this.singularMatrixWarned_) {
        this.singularMatrixWarned_ = true;
        errorManagerInstance.debug('Camera.matrixWorld: matrixWorldInverse is non-invertible, returning identity');
      }

      return mat4.identity(out);
    }

    return inverted;
  }
  matrixWorldInverse = mat4.create();
  cameraType: CameraType = CameraType.FIXED_TO_EARTH;

  resetRotation() {
    if (this.cameraType !== CameraType.FPS) {
      this.state.isPanReset = true;
    }
    this.state.isLocalRotateReset = true;
    if (this.cameraType === CameraType.FIXED_TO_SAT_LVLH) {
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
    this.state.hasPrevSatAngles = false;
  }

  changeCameraType() {
    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

    // Snapshot current view for smooth camera transition before changing type
    if (settingsManager.isSmoothCameraTransitions) {
      this.transition.begin(this.matrixWorldInverse, Scene.getInstance().worldShift);
    }

    if (this.cameraType === CameraType.PLANETARIUM) {
      orbitManagerInstance.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
    }

    switch (this.cameraType) {
      case CameraType.FIXED_TO_EARTH:
        this.cameraType = CameraType.FLAT_MAP;
        break;
      case CameraType.FLAT_MAP:
        this.cameraType = CameraType.FIXED_TO_SAT_ECI;
        break;
      case CameraType.FIXED_TO_SAT_ECI:
        this.cameraType = CameraType.FIXED_TO_SAT_LVLH;
        break;
      case CameraType.FIXED_TO_SAT_LVLH:
        this.cameraType = CameraType.POLAR_VIEW;
        break;
      case CameraType.POLAR_VIEW:
        this.cameraType = CameraType.SATELLITE_FIRST_PERSON;
        break;
      case CameraType.SATELLITE_FIRST_PERSON:
        this.cameraType = CameraType.PLANETARIUM;
        break;
      case CameraType.PLANETARIUM:
        this.cameraType = CameraType.ASTRONOMY;
        break;
      case CameraType.ASTRONOMY:
        this.cameraType = CameraType.FPS;
        break;
      case CameraType.FPS:
      default:
        this.cameraType = CameraType.MAX_CAMERA_TYPES;
        break;
    }

    // Skip delegate-backed camera modes if their delegate isn't registered (pro plugin not loaded)
    if (this.cameraType === CameraType.FLAT_MAP && !this.cameraModeDelegates_.has(CameraType.FLAT_MAP)) {
      this.cameraType++;
    }

    if ((this.cameraType === CameraType.FIXED_TO_SAT_LVLH && !selectSatManagerInstance) || selectSatManagerInstance?.selectedSat === -1) {
      this.cameraType++;
    }
    if ((this.cameraType === CameraType.FIXED_TO_SAT_ECI && !selectSatManagerInstance) || selectSatManagerInstance?.selectedSat === -1) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.POLAR_VIEW && !sensorManagerInstance.isSensorSelected()) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.POLAR_VIEW && !this.cameraModeDelegates_.has(CameraType.POLAR_VIEW)) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.PLANETARIUM && !sensorManagerInstance.isSensorSelected()) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.ASTRONOMY && !sensorManagerInstance.isSensorSelected()) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.SATELLITE_FIRST_PERSON && selectSatManagerInstance?.selectedSat === -1) {
      this.cameraType++;
    }

    if (this.cameraType === CameraType.FPS) {
      this.resetFpsPos_();
    }

    if (this.cameraType >= CameraType.MAX_CAMERA_TYPES) {
      const renderer = ServiceLocator.getRenderer();

      this.state.isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6 as Radians;
      renderer.glInit();
      if ((selectSatManagerInstance?.selectedSat ?? '-1') !== '-1') {
        this.state.camZoomSnappedOnSat = true;
        this.cameraType = CameraType.FIXED_TO_SAT_ECI;
      } else {
        this.cameraType = CameraType.FIXED_TO_EARTH;
      }
    }

    // When entering a satellite mode, re-run the full satellite selection pipeline
    // (same path as clicking the dot from FIXED_TO_EARTH) so orientation resets correctly.
    if (this.cameraType === CameraType.FIXED_TO_SAT_LVLH || this.cameraType === CameraType.FIXED_TO_SAT_ECI) {
      const ssm = PluginRegistry.getPlugin(SelectSatManager);

      if (ssm && ssm.selectedSat !== -1) {
        ssm.lastSatCameraType = this.cameraType;
        this.cameraType = CameraType.FIXED_TO_EARTH;
        ssm.selectSat(ssm.selectedSat);
      }
    }

    EventBus.getInstance().emit(EventBusEvent.cameraTypeChanged, CameraType[this.cameraType]);
  }

  zoomWheel(delta: number): void {
    // No zoom in first-person satellite mode — camera is fixed at satellite position
    if (this.cameraType === CameraType.SATELLITE_FIRST_PERSON) {
      return;
    }

    this.state.isZoomIn = delta < 0;

    if (settingsManager.isZoomStopsRotation) {
      this.autoRotate(false);
    }

    // Delegate to plugin camera mode (e.g. flat map, polar view) if registered
    if (this.cameraModeDelegates_.get(this.cameraType)?.zoomWheel(this, delta)) {
      return;
    }

    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

    // Scale zoom sensitivity by current zoom level so zooming naturally decelerates when close to a body.
    // Use asymmetric scaling: full deceleration when zooming in, but a higher floor when zooming out
    // so the user isn't trapped at close zoom levels.
    const isZoomingOut = delta > 0;
    const zoomSensitivity = isZoomingOut
      ? Math.max(this.state.zoomLevel, 0.1)
      : Math.max(this.state.zoomLevel, 0.001);

    if (settingsManager.isZoomStopsSnappedOnSat || (selectSatManagerInstance?.selectedSat ?? '-1') === '-1' || !this.state.camZoomSnappedOnSat) {
      // No satellite selected, not snapped, or snapping disabled — standard Earth-centered zoom
      this.state.zoomTarget += delta / 100 / 25 / this.state.speedModifier * zoomSensitivity;
    } else {
      // Satellite snapped — satellite-relative zoom via camDistBuffer.
      // snapToSat() converts camDistBuffer to zoomTarget each frame.
      // Proportional scaling: each scroll step changes distance by ~7%, giving
      // consistent feel at any distance (0.75km to 100,000km+).
      const fraction = delta / 500;

      this.state.camDistBuffer = <Kilometers>(this.state.camDistBuffer * (1 + fraction));
    }

    this.zoomWheelFov_(delta);
  }

  private zoomWheelFov_(delta: number) {
    if (this.cameraType === CameraType.PLANETARIUM || this.cameraType === CameraType.FPS || this.cameraType === CameraType.ASTRONOMY) {
      settingsManager.fieldOfView = settingsManager.fieldOfView + (delta * 0.0002) as Radians;
      // getEl('fov-text').innerHTML = 'FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg';
      if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) {
        settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
      }
      if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) {
        settingsManager.fieldOfView = settingsManager.fieldOfViewMin as Radians;
      }
      this.fovTarget_ = settingsManager.fieldOfView;
      ServiceLocator.getRenderer().glInit();
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
    let target = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

    // TODO: This should be handled better
    target ??= <Satellite>(<unknown>{
      id: -1,
      missile: false,
      type: SpaceObjectType.UNKNOWN,
      static: false,
    });

    // Detect camera mode transitions for delegate enter/exit (handles direct cameraType assignment)
    if (this.lastCameraType_ !== this.cameraType) {
      this.cameraModeDelegates_.get(this.lastCameraType_)?.onExit(this);
      this.cameraModeDelegates_.get(this.cameraType)?.onEnter(this);

      // Set FOV target based on new camera mode
      if (this.isSatelliteFocusedMode_(this.cameraType)) {
        // We are entering a satellite-focused mode. If we came from a non-satellite mode,
        // capture the current non-satellite FOV so we can restore it on exit.
        if (!this.isSatelliteFocusedMode_(this.lastCameraType_)) {
          this.fovDefault_ = this.fovTarget_;
        }
        this.fovTarget_ = settingsManager.fieldOfViewSatellite;
      } else if (this.isSatelliteFocusedMode_(this.lastCameraType_)) {
        // We are exiting a satellite-focused mode; restore the last non-satellite FOV
        // (fall back to the current settings value if none was captured).
        this.fovTarget_ = this.fovDefault_ ?? settingsManager.fieldOfView;
      }
    }
    this.lastCameraType_ = this.cameraType;

    this.drawPreValidate_(sensorPos);
    mat4.identity(this.matrixWorldInverse);

    // Ensure we don't zoom in past our satellite
    if (this.cameraType === CameraType.FIXED_TO_SAT_LVLH || this.cameraType === CameraType.FIXED_TO_SAT_ECI) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        this.cameraType = CameraType.FIXED_TO_EARTH;
      } else {
        const satAlt = <Kilometers>(Math.sqrt(target.position.x ** 2 + target.position.y ** 2 + target.position.z ** 2) - RADIUS_OF_EARTH);

        if (this.calcDistanceBasedOnZoom() < satAlt + RADIUS_OF_EARTH + settingsManager.minDistanceFromSatellite) {
          this.state.zoomTarget = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);
          this.state.zoomLevel = this.state.zoomTarget;
        }
      }
    }

    if (this.cameraType === CameraType.SATELLITE_FIRST_PERSON) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        this.cameraType = CameraType.FIXED_TO_EARTH;
      }
    }

    /*
     * For FPS style movement rotate the this and then translate it
     * for traditional view, move the this and then rotate it
     */

    switch (this.cameraType) {
      case CameraType.FIXED_TO_EARTH: // pivot around the earth with earth in the center
        this.drawFixedToEarth_();
        break;
      case CameraType.FIXED_TO_SAT_LVLH: // Pivot around the satellite (LVLH frame)
        this.drawFixedToSatellite_(target);
        break;
      case CameraType.FIXED_TO_SAT_ECI: // Pivot around the satellite (ECI frame)
        this.drawFixedToSatelliteEci_(target);
        break;
      case CameraType.FPS: // FPS style movement
        this.drawFirstPersonView_();
        break;
      case CameraType.PLANETARIUM: {
        if (!sensorPos) {
          throw new Error('Sensor Position is undefined');
        }
        this.drawAstronomy_(sensorPos);
        break;
      }
      case CameraType.SATELLITE_FIRST_PERSON: {
        this.drawSatelliteFirstPerson_(target);
        break;
      }
      case CameraType.ASTRONOMY: {
        if (!sensorPos) {
          throw new Error('Sensor Position is undefined');
        }
        this.drawAstronomy_(sensorPos);
        break;
      }
      default:
        this.cameraModeDelegates_.get(this.cameraType)?.draw(this);
        break;
    }

    // Apply camera transition blending (smooth satellite selection changes)
    const blendedView = this.transition.apply(this.matrixWorldInverse, Scene.getInstance().worldShift);

    if (blendedView) {
      mat4.copy(this.matrixWorldInverse, blendedView);
    }
  }

  exitFixedToSat(): void {
    if (this.cameraType !== CameraType.FIXED_TO_SAT_LVLH && this.cameraType !== CameraType.FIXED_TO_SAT_ECI) {
      return;
    }

    // Capture camera's current ECI position BEFORE switching modes
    const camPosEci = this.getCamPosEarthCentered();
    const dist = <Kilometers>Math.sqrt(camPosEci[0] ** 2 + camPosEci[1] ** 2 + camPosEci[2] ** 2);

    this.state.ftsRotateReset = true;
    this.state.camDistBuffer = CameraState.MAX_CAM_DIST_BUFFER;
    this.state.hasPrevSatAngles = false;

    this.cameraType = CameraType.FIXED_TO_EARTH;

    if (dist > 0) {
      // Convert ECI position to pitch/yaw (same formulas as snapToSat)
      const xyRadius = Math.sqrt(camPosEci[0] ** 2 + camPosEci[1] ** 2);
      const pitch = <Radians>Math.atan2(camPosEci[2], xyRadius);
      const yaw = <Radians>(Math.atan2(camPosEci[1], camPosEci[0]) + TAU / 4);

      this.camSnap(pitch, yaw);

      // Enforce minimum altitude of 5000km when exiting satellite view
      const minDist = <Kilometers>(RADIUS_OF_EARTH + 15000);

      this.state.zoomTarget = this.getZoomFromDistance(<Kilometers>Math.max(dist, minDist));
    } else {
      // Fallback: use last known earth-centered angles
      this.camSnap(this.state.earthCenteredPitch, this.state.earthCenteredYaw);
      this.state.zoomTarget = this.state.earthCenteredLastZoom;
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
    if (this.cameraType === CameraType.FIXED_TO_SAT_LVLH || this.cameraType === CameraType.SATELLITE_FIRST_PERSON) {
      const target = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

      if (target && this.computeLvlhFrame_(target)) {
        // Compute camera forward direction in LVLH frame
        const cosYaw = Math.cos(this.state.ftsYaw);
        const sinYaw = Math.sin(this.state.ftsYaw);
        const cosPitch = Math.cos(this.state.ftsPitch);
        const sinPitch = Math.sin(this.state.ftsPitch);

        if (this.cameraType === CameraType.SATELLITE_FIRST_PERSON) {
          // First person: default forward = +inTrack (velocity), yaw around radial, pitch around cross-track
          const ftX = cosYaw * this.lvlhInTrack_[0] + sinYaw * this.lvlhCrossTrack_[0];
          const ftY = cosYaw * this.lvlhInTrack_[1] + sinYaw * this.lvlhCrossTrack_[1];
          const ftZ = cosYaw * this.lvlhInTrack_[2] + sinYaw * this.lvlhCrossTrack_[2];

          const cfX = cosPitch * ftX - sinPitch * this.lvlhRadial_[0];
          const cfY = cosPitch * ftY - sinPitch * this.lvlhRadial_[1];
          const cfZ = cosPitch * ftZ - sinPitch * this.lvlhRadial_[2];

          return vec3.fromValues(cfX, cfY, cfZ);
        }

        const ftX = cosYaw * this.lvlhInTrack_[0] + sinYaw * this.lvlhCrossTrack_[0];
        const ftY = cosYaw * this.lvlhInTrack_[1] + sinYaw * this.lvlhCrossTrack_[1];
        const ftZ = cosYaw * this.lvlhInTrack_[2] + sinYaw * this.lvlhCrossTrack_[2];

        const cfX = cosPitch * ftX + sinPitch * this.lvlhRadial_[0];
        const cfY = cosPitch * ftY + sinPitch * this.lvlhRadial_[1];
        const cfZ = cosPitch * ftZ + sinPitch * this.lvlhRadial_[2];

        return vec3.fromValues(cfX, cfY, cfZ);
      }

      // Fallback to Earth-referenced
      const xRot = Math.sin(-this.state.ftsYaw) * Math.cos(this.state.ftsPitch);
      const yRot = Math.cos(this.state.ftsYaw) * Math.cos(this.state.ftsPitch);
      const zRot = Math.sin(-this.state.ftsPitch);

      return vec3.fromValues(xRot, yRot, zRot);
    }
    if (this.cameraType === CameraType.FIXED_TO_SAT_ECI) {
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

  getCameraRadius(target: TemeVec3, centerBody: CelestialBody | Earth) {
    let targetDistanceFromEarth = 0;

    if (target) {
      const gmst = ServiceLocator.getTimeManager().gmst;

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

  init() {
    this.state.zoomLevel = settingsManager.initZoomLevel ?? CameraState.DEFAULT_ZOOM;
    this.state.zoomTarget = settingsManager.initZoomLevel ?? CameraState.DEFAULT_ZOOM;

    this.inputHandler.init();

    EventBus.getInstance().on(EventBusEvent.selectSatData, () => {
      this.state.isAutoPitchYawToTarget = false;
    });
  }

  /**
   * Sets the camera to look at a specific latitude and longitude with a given zoom level.
   */
  lookAtLatLon(lat: Degrees, lon: Degrees, zoom?: ZoomValue | number, date = ServiceLocator.getTimeManager().simulationTimeObj): void {
    if (this.cameraType !== CameraType.FIXED_TO_EARTH) {
      this.cameraType = CameraType.FIXED_TO_EARTH;
    }

    if (zoom) {
      this.changeZoom(zoom);
    }
    this.camSnap(lat2pitch(lat), lon2yaw(lon, date));
  }

  lookAtPosition(pos: TemeVec3, isFaceEarth: boolean, selectedDate: Date): void {
    const gmst = SatMath.calculateTimeVariables(selectedDate).gmst;
    const lla = eci2lla(pos, gmst);
    const latModifier = isFaceEarth ? 1 : -1;
    const lonModifier = isFaceEarth ? 0 : 180;

    this.camSnap(lat2pitch(<Degrees>(lla.lat * latModifier)), lon2yaw(<Degrees>(lla.lon + lonModifier), selectedDate));
  }

  lookAtStar(c: Star): void {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const lineManagerInstance = ServiceLocator.getLineManager();

    // Try with the pname
    const satId = catalogManagerInstance.starName2Id(c.name, dotsManagerInstance.starIndex1, dotsManagerInstance.starIndex2);
    const sat = catalogManagerInstance.getObject(satId);

    if (sat === null) {
      throw new Error('Star not found');
    }

    lineManagerInstance.clear();
    this.cameraType = CameraType.FIXED_TO_EARTH; // Earth will block the view of the star
    this.lookAtPosition((sat as unknown as { position: TemeVec3 }).position, false, timeManagerInstance.selectedDate);
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
  snapToSat(sat: Satellite | MissileObject, simulationTime: Date) {
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
      ServiceLocator.getUiManager().toast('Object is inside the earth!', ToastMsgType.critical);
      const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

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

        const centerBodyPosition = ServiceLocator.getScene().getBodyById(settingsManager.centerBody)!.position;
        const relativePosition = {
          x: sat.position.x - centerBodyPosition[0] as Kilometers,
          y: sat.position.y - centerBodyPosition[1] as Kilometers,
          z: sat.position.z - centerBodyPosition[2] as Kilometers,
        };
        const centerBody = ServiceLocator.getScene().getBodyById(settingsManager.centerBody)!;

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

      // Only Zoom in Once on Mobile
      if (settingsManager.isMobileModeEnabled) {
        this.state.camZoomSnappedOnSat = false;
      }
    }

    // Switch near/far renderer based on satellite distance for z-buffer precision
    if (this.state.camZoomSnappedOnSat) {
      if (this.state.camDistBuffer <= settingsManager.nearZoomLevel) {
        ServiceLocator.getRenderer().setNearRenderer();
      } else {
        settingsManager.selectedColor = settingsManager.selectedColorFallback;
        ServiceLocator.getRenderer().setFarRenderer();
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
    this.updatePan_(dt);
    this.updateLocalRotation_(dt);
    this.updatePitchYawSpeeds_(dt);
    this.updateFtsRotation_(dt);

    this.state.camRotateSpeed *= settingsManager.momentumDamping ** dt;

    if (this.cameraType === CameraType.ASTRONOMY || this.cameraType === CameraType.PLANETARIUM) {
      this.updateAstronomyLookAround_(dt);
    } else if (this.cameraType === CameraType.FPS) {
      this.updateFpsMovement_(dt);
    } else if (this.cameraModeDelegates_.has(this.cameraType)) {
      this.cameraModeDelegates_.get(this.cameraType)!.update(this, dt);
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
    this.updateFovLerp_(dt);

    this.updateCameraSnapMode(dt);

    // Compensate for Earth rotation in FIXED_TO_EARTH mode
    // so the camera stays fixed to geographic coordinates
    if (this.cameraType === CameraType.FIXED_TO_EARTH && settingsManager.isCompensateForEarthRotation) {
      const currentGmst = ServiceLocator.getTimeManager().gmst;

      if (this.state.hasPrevGmst) {
        const deltaGmst = <Radians>(currentGmst - this.state.prevGmst);

        if (deltaGmst !== 0) {
          this.state.camYaw = <Radians>(this.state.camYaw + deltaGmst);
          if (!this.state.camAngleSnappedOnSat) {
            this.state.camYawTarget = <Radians>(this.state.camYawTarget + deltaGmst);
          }
        }
      }

      this.state.prevGmst = currentGmst;
      this.state.hasPrevGmst = true;
    } else {
      this.state.hasPrevGmst = false;
    }

    if (this.cameraType === CameraType.FIXED_TO_SAT_LVLH || this.cameraType === CameraType.FIXED_TO_SAT_ECI || this.cameraType === CameraType.SATELLITE_FIRST_PERSON) {
      // No pitch clamping — allow continuous rotation around the satellite
      // Wrap to [-TAU, TAU] to prevent unbounded growth
      if (this.state.camPitch > TAU) {
        this.state.camPitch = <Radians>(this.state.camPitch - TAU);
      }
      if (this.state.camPitch < -TAU) {
        this.state.camPitch = <Radians>(this.state.camPitch + TAU);
      }
    } else {
      if (this.state.camPitch > TAU / 4) {
        this.state.camPitch = <Radians>(TAU / 4);
      }
      if (this.state.camPitch < -TAU / 4) {
        this.state.camPitch = <Radians>(-TAU / 4);
      }
    }

    // Wrap camYaw to [0, TAU) — use modulo to handle multi-revolution overflow
    this.state.camYaw = <Radians>(((this.state.camYaw % TAU) + TAU) % TAU);

    if (this.cameraType === CameraType.FIXED_TO_EARTH) {
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

  private astronomyEye_ = vec3.create();
  private astronomyZenith_ = vec3.create();
  private astronomyEast_ = vec3.create();
  private astronomyNorth_ = vec3.create();

  private drawAstronomy_(sensorPos: { lat: number; lon: number; gmst: GreenwichMeanSiderealTime; x: number; y: number; z: number }) {
    // Eye position = sensor ECI position
    vec3.set(this.astronomyEye_, sensorPos.x, sensorPos.y, sensorPos.z);

    // Zenith = radial direction (normalized sensor position)
    vec3.normalize(this.astronomyZenith_, this.astronomyEye_);

    // Compute tangent plane basis vectors
    // Use X-axis instead of Z-axis near poles to avoid degenerate cross product
    const refAxis = Math.abs(this.astronomyZenith_[2]) > 0.99
      ? vec3.fromValues(1, 0, 0)
      : vec3.fromValues(0, 0, 1);

    // East = normalize(cross(refAxis, zenith))
    vec3.cross(this.astronomyEast_, refAxis, this.astronomyZenith_);
    vec3.normalize(this.astronomyEast_, this.astronomyEast_);

    // North = normalize(cross(zenith, east))
    vec3.cross(this.astronomyNorth_, this.astronomyZenith_, this.astronomyEast_);
    vec3.normalize(this.astronomyNorth_, this.astronomyNorth_);

    // Build camera axes from azimuth (fpsYaw) and elevation (fpsPitch)
    // This avoids mat4.lookAt which degenerates when forward ≈ up (at zenith)
    const azRad = this.state.fpsYaw * DEG2RAD;
    const elRad = this.state.fpsPitch * DEG2RAD;
    const cosEl = Math.cos(elRad);
    const sinEl = Math.sin(elRad);
    const cosAz = Math.cos(azRad);
    const sinAz = Math.sin(azRad);

    // Step 1: Rotate base frame by azimuth around zenith
    // forwardTangent = cos(az)*north + sin(az)*east  (forward projected on tangent plane)
    // right = cos(az)*east - sin(az)*north
    const ftX = cosAz * this.astronomyNorth_[0] + sinAz * this.astronomyEast_[0];
    const ftY = cosAz * this.astronomyNorth_[1] + sinAz * this.astronomyEast_[1];
    const ftZ = cosAz * this.astronomyNorth_[2] + sinAz * this.astronomyEast_[2];

    const rX = cosAz * this.astronomyEast_[0] - sinAz * this.astronomyNorth_[0];
    const rY = cosAz * this.astronomyEast_[1] - sinAz * this.astronomyNorth_[1];
    const rZ = cosAz * this.astronomyEast_[2] - sinAz * this.astronomyNorth_[2];

    // Step 2: Rotate by elevation around the right axis
    // camForward = cos(el)*forwardTangent + sin(el)*zenith
    // camUp = -sin(el)*forwardTangent + cos(el)*zenith
    // camRight = right (unchanged)
    const cfX = cosEl * ftX + sinEl * this.astronomyZenith_[0];
    const cfY = cosEl * ftY + sinEl * this.astronomyZenith_[1];
    const cfZ = cosEl * ftZ + sinEl * this.astronomyZenith_[2];

    const cuX = -sinEl * ftX + cosEl * this.astronomyZenith_[0];
    const cuY = -sinEl * ftY + cosEl * this.astronomyZenith_[1];
    const cuZ = -sinEl * ftZ + cosEl * this.astronomyZenith_[2];

    // Step 3: Build view matrix manually (world-to-camera)
    //
    // The projection matrix includes eciToOpenGlMat (E) which swaps Y/Z axes:
    //   X_gl = X_eci,  Y_gl = Z_eci,  Z_gl = -Y_eci
    //
    // To get the correct view matrix for ECI coordinates, we compute:
    //   V_eci = E^-1 * L_gl * E
    // where L_gl is the standard OpenGL lookAt matrix.
    // This yields: Row 0 = right, Row 1 = forward, Row 2 = up (all positive)
    // with negative dot-product translations (standard lookAt pattern).
    const eyeX = this.astronomyEye_[0];
    const eyeY = this.astronomyEye_[1];
    const eyeZ = this.astronomyEye_[2];

    const tx = -(rX * eyeX + rY * eyeY + rZ * eyeZ);
    const ty = -(cfX * eyeX + cfY * eyeY + cfZ * eyeZ);
    const tz = -(cuX * eyeX + cuY * eyeY + cuZ * eyeZ);

    // Column-major layout for glMatrix
    // V_eci = E^-1 * L_gl * E  where E = eciToOpenGlMat
    // This similarity transform accounts for the ECI→OpenGL axis swap (Y↔Z)
    // Row 0: right,  Row 1: forward (positive),  Row 2: up (positive)
    this.matrixWorldInverse[0] = rX;
    this.matrixWorldInverse[1] = cfX;
    this.matrixWorldInverse[2] = cuX;
    this.matrixWorldInverse[3] = 0;
    this.matrixWorldInverse[4] = rY;
    this.matrixWorldInverse[5] = cfY;
    this.matrixWorldInverse[6] = cuY;
    this.matrixWorldInverse[7] = 0;
    this.matrixWorldInverse[8] = rZ;
    this.matrixWorldInverse[9] = cfZ;
    this.matrixWorldInverse[10] = cuZ;
    this.matrixWorldInverse[11] = 0;
    this.matrixWorldInverse[12] = tx;
    this.matrixWorldInverse[13] = ty;
    this.matrixWorldInverse[14] = tz;
    this.matrixWorldInverse[15] = 1;
  }

  private drawFixedToEarth_() {
    // 4. Rotate the camera around the new local origin
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.yaw);

    // 3. Adjust for panning
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [this.state.panCurrent.x, this.state.panCurrent.y, this.state.panCurrent.z]);

    // 2. Back away from the earth in the Y direction (depth)
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [0, this.calcDistanceBasedOnZoom(), 0]);
    // 1. Rotate around the earth (0,0,0)
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, this.state.earthCenteredPitch);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.earthCenteredYaw);
  }

  private drawFirstPersonView_() {
    // Rotate the camera
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, this.state.fpsYaw * DEG2RAD, [0, 0, 1]);
    // Move the camera to the FPS position
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [this.state.fpsPos[0], this.state.fpsPos[1], -this.state.fpsPos[2]]);
  }

  /**
   * Compute LVLH/RIC basis vectors from satellite ECI position and velocity.
   * Returns false if velocity is zero/missing (degenerate case).
   */
  private computeLvlhFrame_(target: Satellite | MissileObject | OemSatellite): boolean {
    const { position: pos, velocity: vel } = target;

    if (vel.x * vel.x + vel.y * vel.y + vel.z * vel.z < 1e-12) {
      return false;
    }

    // Radial: normalized position vector (away from Earth)
    vec3.set(this.lvlhRadial_, pos.x, pos.y, pos.z);
    vec3.normalize(this.lvlhRadial_, this.lvlhRadial_);

    // Cross-Track: normalize(R x V) = orbit normal (angular momentum direction)
    const velVec = vec3.fromValues(vel.x, vel.y, vel.z);

    vec3.cross(this.lvlhCrossTrack_, this.lvlhRadial_, velVec);
    vec3.normalize(this.lvlhCrossTrack_, this.lvlhCrossTrack_);

    // In-Track: C x R (perpendicular to both, approximately aligned with velocity)
    vec3.cross(this.lvlhInTrack_, this.lvlhCrossTrack_, this.lvlhRadial_);
    vec3.normalize(this.lvlhInTrack_, this.lvlhInTrack_);

    return true;
  }

  private drawFixedToSatellite_(target: Satellite | MissileObject | OemSatellite) {
    if (!this.computeLvlhFrame_(target)) {
      // Velocity is zero — fall back to ECI-style draw
      this.drawFixedToSatelliteEci_(target);

      return;
    }

    const yawRad = this.state.ftsYaw;
    const pitchRad = -this.state.ftsPitch;
    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);
    const cosPitch = Math.cos(pitchRad);
    const sinPitch = Math.sin(pitchRad);

    // Step 1: Rotate base LVLH frame by yaw around Radial axis
    // Default forward = +inTrack (looking along velocity direction)
    // Default up = +radial (away from Earth, local zenith)
    // Default right = -crossTrack (negated for right-handed view matrix)

    const ftX = cosYaw * this.lvlhInTrack_[0] + sinYaw * this.lvlhCrossTrack_[0];
    const ftY = cosYaw * this.lvlhInTrack_[1] + sinYaw * this.lvlhCrossTrack_[1];
    const ftZ = cosYaw * this.lvlhInTrack_[2] + sinYaw * this.lvlhCrossTrack_[2];

    // Negate right vector: LVLH (R,I,C) is right-handed, so camera (C,-R,I) would be
    // left-handed — negating right fixes the handedness and prevents texture mirroring
    const rX = -(cosYaw * this.lvlhCrossTrack_[0] - sinYaw * this.lvlhInTrack_[0]);
    const rY = -(cosYaw * this.lvlhCrossTrack_[1] - sinYaw * this.lvlhInTrack_[1]);
    const rZ = -(cosYaw * this.lvlhCrossTrack_[2] - sinYaw * this.lvlhInTrack_[2]);

    // Step 2: Rotate by pitch around the right axis
    // camForward = cos(pitch)*forwardTangent + sin(pitch)*radial
    // camUp = -sin(pitch)*forwardTangent + cos(pitch)*radial
    const cfX = cosPitch * ftX + sinPitch * this.lvlhRadial_[0];
    const cfY = cosPitch * ftY + sinPitch * this.lvlhRadial_[1];
    const cfZ = cosPitch * ftZ + sinPitch * this.lvlhRadial_[2];

    const cuX = -sinPitch * ftX + cosPitch * this.lvlhRadial_[0];
    const cuY = -sinPitch * ftY + cosPitch * this.lvlhRadial_[1];
    const cuZ = -sinPitch * ftZ + cosPitch * this.lvlhRadial_[2];

    // Step 3: Compute eye position (satellite pos + worldShift - camForward * distance)
    // worldShift accounts for non-Earth center bodies (shaders add it to all vertices)
    const satPos = target.position;
    const worldShift = Scene.getInstance().worldShift;
    const shiftedSatX = satPos.x + worldShift[0];
    const shiftedSatY = satPos.y + worldShift[1];
    const shiftedSatZ = satPos.z + worldShift[2];
    const targetDistance = Math.sqrt(satPos.x ** 2 + satPos.y ** 2 + satPos.z ** 2);
    const camDistFromSat = this.calcDistanceBasedOnZoom() - targetDistance;

    const eyeX = shiftedSatX - cfX * camDistFromSat;
    const eyeY = shiftedSatY - cfY * camDistFromSat;
    const eyeZ = shiftedSatZ - cfZ * camDistFromSat;

    // Step 4: Translation component (dot products)
    const tx = -(rX * eyeX + rY * eyeY + rZ * eyeZ);
    const ty = -(cfX * eyeX + cfY * eyeY + cfZ * eyeZ);
    const tz = -(cuX * eyeX + cuY * eyeY + cuZ * eyeZ);

    // Step 5: Build LVLH view matrix into temp
    // V_eci = E^-1 * L_gl * E  (same layout as drawAstronomy_)
    // Row 0: right, Row 1: forward, Row 2: up
    this.lvlhTempMatrix_[0] = rX;
    this.lvlhTempMatrix_[1] = cfX;
    this.lvlhTempMatrix_[2] = cuX;
    this.lvlhTempMatrix_[3] = 0;
    this.lvlhTempMatrix_[4] = rY;
    this.lvlhTempMatrix_[5] = cfY;
    this.lvlhTempMatrix_[6] = cuY;
    this.lvlhTempMatrix_[7] = 0;
    this.lvlhTempMatrix_[8] = rZ;
    this.lvlhTempMatrix_[9] = cfZ;
    this.lvlhTempMatrix_[10] = cuZ;
    this.lvlhTempMatrix_[11] = 0;
    this.lvlhTempMatrix_[12] = tx;
    this.lvlhTempMatrix_[13] = ty;
    this.lvlhTempMatrix_[14] = tz;
    this.lvlhTempMatrix_[15] = 1;

    // Step 6: Apply local rotation and pan first (to identity matrixWorldInverse),
    // then right-multiply the LVLH base — same order as drawFixedToEarth_
    // so local rot and pan act in view/screen space, not world space
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.yaw);

    // Scale pan by camera distance from satellite so it feels consistent at any orbit altitude
    const panScale = Math.max(camDistFromSat / 6371, 0.00025);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [
      this.state.panCurrent.x * panScale,
      this.state.panCurrent.y * panScale,
      this.state.panCurrent.z * panScale,
    ]);

    // Step 7: Combine — V = localRot * pan * lvlhView
    mat4.multiply(this.matrixWorldInverse, this.matrixWorldInverse, this.lvlhTempMatrix_);
  }

  /**
   * Draw the camera pivoting around a satellite using Earth-referenced (ECI) coordinates.
   * Simpler than LVLH — no orbital frame needed, works for any object including zero-velocity.
   */
  private drawFixedToSatelliteEci_(target: Satellite | MissileObject | OemSatellite) {
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.yaw);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [this.state.panCurrent.x, this.state.panCurrent.y, this.state.panCurrent.z]);

    const targetPosition = vec3.fromValues(target.position.x, target.position.y, target.position.z);
    const targetDistance = vec3.length(targetPosition);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [
      0,
      this.calcDistanceBasedOnZoom() - targetDistance,
      0,
    ]);

    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, this.state.ftsPitch);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.ftsYaw);
  }

  /**
   * First-person camera fixed at the satellite's position using LVLH frame.
   * Default look direction: +inTrack (velocity). Yaw around radial, pitch around cross-track.
   * Falls back to old lookAt-based approach when velocity is zero.
   */
  private drawSatelliteFirstPerson_(target: Satellite | MissileObject | OemSatellite) {
    if (!this.computeLvlhFrame_(target)) {
      this.drawSatelliteFirstPersonFallback_(target);

      return;
    }

    const yawRad = this.state.ftsYaw;
    const pitchRad = -this.state.ftsPitch;
    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);
    const cosPitch = Math.cos(pitchRad);
    const sinPitch = Math.sin(pitchRad);

    // Default forward = +inTrack (velocity direction)
    // Default up = +radial (away from Earth)
    // Default right = -crossTrack (negated for right-handed view matrix)

    // Step 1: Yaw rotation around radial axis — rotates forward from inTrack toward crossTrack
    const ftX = cosYaw * this.lvlhInTrack_[0] + sinYaw * this.lvlhCrossTrack_[0];
    const ftY = cosYaw * this.lvlhInTrack_[1] + sinYaw * this.lvlhCrossTrack_[1];
    const ftZ = cosYaw * this.lvlhInTrack_[2] + sinYaw * this.lvlhCrossTrack_[2];

    const rX = -(cosYaw * this.lvlhCrossTrack_[0] - sinYaw * this.lvlhInTrack_[0]);
    const rY = -(cosYaw * this.lvlhCrossTrack_[1] - sinYaw * this.lvlhInTrack_[1]);
    const rZ = -(cosYaw * this.lvlhCrossTrack_[2] - sinYaw * this.lvlhInTrack_[2]);

    // Step 2: Pitch rotation around right (cross-track) axis — tilts forward toward/away from radial
    const cfX = cosPitch * ftX + sinPitch * this.lvlhRadial_[0];
    const cfY = cosPitch * ftY + sinPitch * this.lvlhRadial_[1];
    const cfZ = cosPitch * ftZ + sinPitch * this.lvlhRadial_[2];

    const cuX = -sinPitch * ftX + cosPitch * this.lvlhRadial_[0];
    const cuY = -sinPitch * ftY + cosPitch * this.lvlhRadial_[1];
    const cuZ = -sinPitch * ftZ + cosPitch * this.lvlhRadial_[2];

    // Eye position = satellite position + worldShift (no distance offset)
    const worldShift = Scene.getInstance().worldShift;
    const eyeX = target.position.x + worldShift[0];
    const eyeY = target.position.y + worldShift[1];
    const eyeZ = target.position.z + worldShift[2];

    // Translation: dot products of basis with eye
    const tx = -(rX * eyeX + rY * eyeY + rZ * eyeZ);
    const ty = -(cfX * eyeX + cfY * eyeY + cfZ * eyeZ);
    const tz = -(cuX * eyeX + cuY * eyeY + cuZ * eyeZ);

    // Build view matrix — Row 0: right, Row 1: forward, Row 2: up (ECI convention, eciToOpenGl in pMatrix handles conversion)
    this.lvlhTempMatrix_[0] = rX;
    this.lvlhTempMatrix_[1] = cfX;
    this.lvlhTempMatrix_[2] = cuX;
    this.lvlhTempMatrix_[3] = 0;
    this.lvlhTempMatrix_[4] = rY;
    this.lvlhTempMatrix_[5] = cfY;
    this.lvlhTempMatrix_[6] = cuY;
    this.lvlhTempMatrix_[7] = 0;
    this.lvlhTempMatrix_[8] = rZ;
    this.lvlhTempMatrix_[9] = cfZ;
    this.lvlhTempMatrix_[10] = cuZ;
    this.lvlhTempMatrix_[11] = 0;
    this.lvlhTempMatrix_[12] = tx;
    this.lvlhTempMatrix_[13] = ty;
    this.lvlhTempMatrix_[14] = tz;
    this.lvlhTempMatrix_[15] = 1;

    // Apply local rotation in screen space, then combine with LVLH view
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.yaw);

    mat4.multiply(this.matrixWorldInverse, this.matrixWorldInverse, this.lvlhTempMatrix_);
  }

  /**
   * Fallback first-person view when velocity is zero. Uses lookAt with ECI-based orientation.
   */
  private drawSatelliteFirstPersonFallback_(target: Satellite | MissileObject | OemSatellite) {
    const worldShift = Scene.getInstance().worldShift;
    const sx = target.position.x + worldShift[0];
    const sy = target.position.y + worldShift[1];
    const sz = target.position.z + worldShift[2];

    const targetPositionTemp = vec3.fromValues(-sx, -sy, -sz);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, targetPositionTemp);
    vec3.normalize(this.normUp_, targetPositionTemp);
    vec3.normalize(this.normForward_, [target.velocity.x, target.velocity.y, target.velocity.z]);
    vec3.transformQuat(this.normLeft_, this.normUp_, quat.fromValues(this.normForward_[0], this.normForward_[1], this.normForward_[2], 90 * DEG2RAD));
    const targetNextPosition = vec3.fromValues(sx + target.velocity.x, sy + target.velocity.y, sz + target.velocity.z);

    mat4.lookAt(this.matrixWorldInverse, targetNextPosition, targetPositionTemp, this.normUp_);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [sx, sy, sz]);

    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, this.state.fpsPitch * DEG2RAD, this.normLeft_);
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.fpsYaw * DEG2RAD, this.normUp_);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, targetPositionTemp);
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

    if (!sensorPos && (this.cameraType === CameraType.PLANETARIUM || this.cameraType === CameraType.ASTRONOMY)) {
      this.cameraType = CameraType.FIXED_TO_EARTH;
      errorManagerInstance.debug('A sensor should be selected first if this mode is allowed to be planetarium or astronmy.');
    }
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
      this.state.camPitch = this.chaseSpeed_ === 1.0
        ? this.state.camPitchTarget
        : <Radians>(this.state.camPitch + (this.state.camPitchTarget - this.state.camPitch) * this.chaseSpeed_ * dt);

      this.yawErr_ = normalizeAngle(<Radians>(this.state.camYawTarget - this.state.camYaw));
      this.state.camYaw = this.chaseSpeed_ === 1.0
        ? this.state.camYawTarget
        : <Radians>(this.state.camYaw + this.yawErr_ * this.chaseSpeed_ * dt);
    }
  }

  private updateAstronomyLookAround_(dt: Milliseconds): void {
    // Update elevation and azimuth from mouse drag speeds
    // Yaw sign is flipped vs FPS because azimuth increases eastward (drag right = look right)
    this.state.fpsPitch = <Degrees>(this.state.fpsPitch - 20 * this.state.camPitchSpeed * dt);
    this.state.fpsYaw = <Degrees>(this.state.fpsYaw - 20 * this.state.camYawSpeed * dt);

    // Clamp elevation: slightly below horizon to just past zenith
    // Allow a few degrees past 90 so the ground plane clears the view at zenith
    if (this.state.fpsPitch > 95) {
      this.state.fpsPitch = <Degrees>95;
    }
    if (this.state.fpsPitch < -10) {
      this.state.fpsPitch = <Degrees>-10;
    }

    // Wrap azimuth 0-360
    if (this.state.fpsYaw > 360) {
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw - 360);
    }
    if (this.state.fpsYaw < 0) {
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw + 360);
    }

    // Handle numpad pitch/yaw rates
    const fpsTimeNow = <Milliseconds>Date.now();

    if (this.fpsLastTime_ !== 0) {
      const fpsElapsed = <Milliseconds>(fpsTimeNow - this.fpsLastTime_);

      this.state.fpsPitch = <Degrees>(this.state.fpsPitch + this.state.fpsPitchRate * fpsElapsed);
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw + this.state.fpsRotateRate * fpsElapsed);
    }
    this.fpsLastTime_ = fpsTimeNow;
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
        this.state.fpsForwardSpeed = Math.max(this.state.fpsForwardSpeed + Math.min(this.state.fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsForwardSpeed);
      } else if (this.state.isFPSForwardSpeedLock && this.state.fpsForwardSpeed > 0) {
        this.state.fpsForwardSpeed = Math.min(this.state.fpsForwardSpeed + Math.max(this.state.fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsForwardSpeed);
      }

      if (this.state.isFPSSideSpeedLock && this.state.fpsSideSpeed < 0) {
        this.state.fpsSideSpeed = Math.max(this.state.fpsSideSpeed + Math.min(this.state.fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsSideSpeed);
      } else if (this.state.isFPSSideSpeedLock && this.state.fpsSideSpeed > 0) {
        this.state.fpsSideSpeed = Math.min(this.state.fpsSideSpeed + Math.max(this.state.fpsSideSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsSideSpeed);
      }

      if (this.state.isFPSVertSpeedLock && this.state.fpsVertSpeed < 0) {
        this.state.fpsVertSpeed = Math.max(this.state.fpsVertSpeed + Math.min(this.state.fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsVertSpeed);
      } else if (this.state.isFPSVertSpeedLock && this.state.fpsVertSpeed > 0) {
        this.state.fpsVertSpeed = Math.min(this.state.fpsVertSpeed + Math.max(this.state.fpsVertSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsVertSpeed);
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

  private isSatelliteCameraMode_(): boolean {
    return this.cameraType === CameraType.FIXED_TO_SAT_LVLH ||
      this.cameraType === CameraType.FIXED_TO_SAT_ECI ||
      this.cameraType === CameraType.SATELLITE_FIRST_PERSON;
  }

  private updateFtsRotation_(dt: number) {
    if (this.state.ftsRotateReset) {
      if (!this.isSatelliteCameraMode_()) {
        this.state.ftsRotateReset = false;
        this.state.ftsPitch = 0;
        this.state.camPitchSpeed = 0;
      }

      this.state.camYaw = normalizeAngle(this.state.camYaw);
      this.state.camPitch = normalizeAngle(this.state.camPitch);

      const marginOfError = 3;

      // For satellite camera modes, set the reset target orientation:
      // - LVLH: (0,0) = in-track aligned (looking along velocity)
      // - ECI: aimed at Earth so the satellite is between camera and Earth
      let targetPitch: Radians;
      let targetYaw: Radians;

      if (this.cameraType === CameraType.FIXED_TO_SAT_ECI) {
        const target = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

        if (target?.position) {
          const sx = target.position.x;
          const sy = target.position.y;
          const sz = target.position.z;

          // ECI camera pos = [dist*cos(p)*sin(y), -dist*cos(p)*cos(y), dist*sin(p)]
          // To place camera behind satellite (away from Earth): match normalize(satPos)*dist
          targetPitch = <Radians>Math.atan2(sz, Math.sqrt(sx * sx + sy * sy));
          targetYaw = <Radians>Math.atan2(sx, -sy);
        } else {
          targetPitch = <Radians>0;
          targetYaw = <Radians>0;
        }
      } else if (this.isSatelliteCameraMode_()) {
        targetPitch = <Radians>0;
        targetYaw = <Radians>0;
      } else {
        targetPitch = this.state.earthCenteredPitch;
        targetYaw = this.state.earthCenteredYaw;
      }

      // Use shortest angular path to determine direction (handles ±π wrap-around)
      const pitchDiff = normalizeAngle(<Radians>(targetPitch - this.state.camPitch));

      if (Math.abs(pitchDiff) <= marginOfError) {
        this.state.camPitch = targetPitch;
        this.state.camPitchSpeed = 0;
      } else {
        const upOrDown = pitchDiff > 0 ? 1 : -1;

        this.state.camPitchSpeed = (dt * upOrDown * settingsManager.cameraMovementSpeed) / 50;
      }

      const yawDiff = normalizeAngle(<Radians>(targetYaw - this.state.camYaw));

      if (Math.abs(yawDiff) <= marginOfError) {
        this.state.camYaw = targetYaw;
        this.state.camYawSpeed = 0;
      } else {
        const leftOrRight = yawDiff > 0 ? 1 : -1;

        this.state.camYawSpeed = (dt * leftOrRight * settingsManager.cameraMovementSpeed) / 50;
      }

      if (this.state.camYaw === targetYaw && this.state.camPitch === targetPitch) {
        this.state.ftsRotateReset = false;
      }
    }

    if (this.isSatelliteCameraMode_()) {
      // With satellite camera modes, no Earth-compensation needed — the frame moves with the satellite
      this.state.camPitch = normalizeAngle(this.state.camPitch);
      this.state.ftsPitch = this.state.camPitch;
      this.state.ftsYaw = this.state.camYaw;
    }
  }

  private updateLocalRotation_(dt: number) {
    if (!settingsManager.isLocalRotateEnabled) {
      return;
    }

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
        const localYawDiff = normalizeAngle(<Radians>(this.state.localRotateTarget.yaw - this.state.localRotateCurrent.yaw));
        const leftOrRight = localYawDiff > 0 ? 1 : -1;

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
        if ((PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? '-1') !== '-1') {
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
    if (this.state.isDragging) {

      // Delegate to plugin camera mode (e.g. flat map, polar view) if registered
      if (this.cameraModeDelegates_.get(this.cameraType)?.handleDrag(this)) {
        return;
      }

      /*
       * Disable Raycasting for Performance
       * dragTarget = getEarthScreenPoint(mouseX, mouseY)
       * if (Number.isNaN(dragTarget[0]) || Number.isNaN(dragTarget[1]) || Number.isNaN(dragTarget[2]) ||
       * Number.isNaN(dragPoint[0]) || Number.isNaN(dragPoint[1]) || Number.isNaN(dragPoint[2]) ||
       */
      if (
        !this.isRayCastingEarth_ ||
        this.cameraType === CameraType.FPS ||
        this.cameraType === CameraType.SATELLITE_FIRST_PERSON ||
        this.cameraType === CameraType.ASTRONOMY ||
        this.cameraType === CameraType.PLANETARIUM ||
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
      // Track frame-to-frame velocity (EMA) for momentum on release
      if (this.state.hasPrevDragPos && dt > 0) {
        const dx = (this.state.prevDragX - this.state.mouseX) / dt;
        const dy = (this.state.prevDragY - this.state.mouseY) / dt;
        const alpha = 1 - Math.exp(-dt / 60); // ~60ms time constant

        this.state.dragVelocityX += (dx - this.state.dragVelocityX) * alpha;
        this.state.dragVelocityY += (dy - this.state.dragVelocityY) * alpha;
      }
      this.state.prevDragX = this.state.mouseX;
      this.state.prevDragY = this.state.mouseY;
      this.state.hasPrevDragPos = true;
      this.wasDragging_ = true;

      this.state.isAutoPitchYawToTarget = false;
    } else {
      // On first frame after drag release, override momentum with EMA velocity (touch only)
      if (this.wasDragging_) {
        this.wasDragging_ = false;
        if (settingsManager.isMobileModeEnabled) {
          this.state.camYawSpeed = this.state.dragVelocityX * settingsManager.cameraMovementSpeed;
          this.state.camPitchSpeed = -this.state.dragVelocityY * settingsManager.cameraMovementSpeed;
        }
        this.state.hasPrevDragPos = false;
        this.state.dragVelocityX = 0;
        this.state.dragVelocityY = 0;
      }

      // Frame-rate independent exponential decay for momentum
      const damping = settingsManager.isMobileModeEnabled
        ? settingsManager.touchMomentumDamping
        : settingsManager.momentumDamping;
      const decayMultiplier = damping ** dt;

      this.state.camPitchSpeed *= decayMultiplier;
      this.state.camYawSpeed *= decayMultiplier;
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

    // Frame-rate independent exponential zoom interpolation
    // Exact solution to dz/dt = -rate * (z - target)
    const remaining = this.state.zoomTarget - this.state.zoomLevel;

    this.state.zoomLevel += remaining * (1 - Math.exp(-settingsManager.zoomSpeed * dt));

    if (!this.state.isAutoPitchYawToTarget) {
      // Snap when close enough to prevent floating-point oscillation
      if (Math.abs(this.state.zoomLevel - this.state.zoomTarget) < 0.0001) {
        this.state.zoomLevel = this.state.zoomTarget;
      } else if ((this.state.zoomLevel > this.state.zoomTarget && !this.state.isZoomIn) || (this.state.zoomLevel < this.state.zoomTarget && this.state.isZoomIn)) {
        this.state.zoomTarget = this.state.zoomLevel; // If we change direction then consider us at the target
      }
    }

    // Clamp Zoom between 0 and 1
    this.state.zoomLevel = this.state.zoomLevel > 1 ? 1 : this.state.zoomLevel;
    this.state.zoomLevel = this.state.zoomLevel < 0.0001 ? 0.0001 : this.state.zoomLevel;

    // Try to stay out of the center body
    if (this.cameraType === CameraType.FIXED_TO_EARTH || this.cameraType === CameraType.FIXED_TO_SAT_LVLH) {
      const centerBody = ServiceLocator.getScene().getBodyById(settingsManager.centerBody);
      const centerBodyRadius = centerBody?.RADIUS ?? RADIUS_OF_EARTH;

      if (this.getDistFromEarth() < centerBodyRadius + 30) {
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

  private isSatelliteFocusedMode_(type: CameraType): boolean {
    return type === CameraType.FIXED_TO_SAT_ECI ||
      type === CameraType.FIXED_TO_SAT_LVLH ||
      type === CameraType.SATELLITE_FIRST_PERSON;
  }

  /**
   * Set the field of view immediately, including the lerp target.
   * Writing settingsManager.fieldOfView alone is not enough — updateFovLerp_()
   * pulls the value back toward fovTarget_ on every update, so callers that need
   * a stable FOV (e.g. offscreen capture) must go through this method.
   */
  setFieldOfView(fov: Radians): void {
    settingsManager.fieldOfView = fov;
    this.fovTarget_ = fov;
  }

  private updateFovLerp_(dt: Milliseconds): void {
    if (this.fovTarget_ === null) {
      this.fovTarget_ = settingsManager.fieldOfView;
      this.fovDefault_ = settingsManager.fieldOfView;
    }

    const current = settingsManager.fieldOfView;
    const diff = this.fovTarget_ - current;

    if (Math.abs(diff) < 0.0001) {
      if (current !== this.fovTarget_) {
        settingsManager.fieldOfView = this.fovTarget_;
      }

      return;
    }

    const alpha = 1 - Math.exp(-settingsManager.fieldOfViewLerpSpeed * dt / 1000);

    settingsManager.fieldOfView = (current + diff * alpha) as Radians;
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
