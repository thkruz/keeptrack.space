import { settingsManager } from '@app/settings/settings';
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

import { CameraController } from '@app/doris/camera/controllers/camera-controller';
import { PerspectiveCamera } from '@app/doris/camera/perspective-camera';
import { Doris } from '@app/doris/doris';
import { CameraSystemEvents, CoreEngineEvents } from '@app/doris/events/event-types';
import { ToastMsgType } from '@app/interfaces';
import { RADIUS_OF_EARTH, ZOOM_EXP } from '@app/lib/constants';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4, vec3, vec4 } from 'gl-matrix';
import {
  BaseObject,
  Degrees, DetailedSatellite, EciVec3,
  Kilometers, Milliseconds, Radians,
  Star, TAU, ZoomValue,
} from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { lat2pitch, lon2yaw, normalizeAngle } from '../../lib/transforms';
import { MissileObject } from '../../singletons/catalog-manager/MissileObject';
import { errorManagerInstance } from '../../singletons/errorManager';
import { SatMath } from '../../static/sat-math';
import { KeepTrackApiEvents } from '../events/event-types';
import { EarthCenteredOrbitalController } from './controllers/earth-centered-camera-controller';
import { FirstPersonCameraController } from './controllers/first-person-camera-controller';
import { SatelliteOrbitalCameraController } from './controllers/satellite-orbital-camera-controller';
import { LegacyCameraKeyHandler } from './legacy-camera-keyhandler';

/**
 * Represents the different types of cameras available.
 *
 * TODO: This should be replaced with different camera classes
 */
// Use a string enum and allow plugins to extend via declaration merging
export enum CameraControllerType {
  EARTH_CENTERED_ORBITAL = 'EARTH_CENTERED_ORBITAL',
  SATELLITE_CENTERED_ORBITAL = 'SATELLITE_CENTERED_ORBITAL',
  FIRST_PERSON = 'FIRST_PERSON',
  SATELLITE_FIRST_PERSON = 'SATELLITE_FIRST_PERSON',
  // Plugins can extend this enum via declaration merging
}

export class KeepTrackMainCamera extends PerspectiveCamera {
  cameraControllers: Map<CameraControllerType, CameraController> = new Map();
  activeCameraController: CameraController = new EarthCenteredOrbitalController(this, Doris.getInstance().getEventBus());
  private static readonly eciToOpenGlMat_: mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
  projectionCameraMatrix: mat4;
  keyHandler: LegacyCameraKeyHandler = new LegacyCameraKeyHandler(this);

  static readonly id = 'Camera';
  earthCenteredPitch = <Radians>0;
  earthCenteredYaw = <Radians>0;
  ftsYaw = 0;
  private isAutoRotate_ = true;
  isFPSForwardSpeedLock = false;
  isFPSSideSpeedLock = false;
  isFPSVertSpeedLock = false;
  private isRayCastingEarth_ = false;
  private localRotateMovementSpeed_ = 0.00005;
  private localRotateTarget_ = {
    pitch: <Radians>0,
    roll: <Radians>0,
    yaw: <Radians>0,
  };

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

  /**
   * Percentage of the distance to maxZoomDistance from the minZoomDistance
   */
  private zoomLevel_ = settingsManager.initZoomLevel ?? 0.6925;
  private zoomTarget_ = settingsManager.initZoomLevel ?? 0.6925;

  camAngleSnappedOnSat = false;
  /**
   * This was used when there was only one camera mode and the camera was always centered on the earth
   * It is the overall pitch of the camera?
   */
  camPitch = <Radians>0;
  camPitchSpeed = 0;
  camPitchTarget = <Radians>0;
  camRotateSpeed = 0;
  camSnapToSat = {
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
  camYaw = <Radians>0;
  camYawTarget = <Radians>0;
  camYawSpeed = 0;
  camZoomSnappedOnSat = false;
  dragStartPitch = <Radians>0;
  dragStartYaw = <Radians>0;
  earthCenteredLastZoom = 0.6925;
  fpsForwardSpeed = 0;
  fpsPitch = <Degrees>0;
  fpsPitchRate = 0;
  fpsRotate = <Degrees>0;
  fpsRotateRate = 0;
  fpsRun = 1;
  fpsSideSpeed = 0;
  fpsVertSpeed = 0;
  fpsYaw = <Degrees>0;
  fpsYawRate = 0;
  ftsPitch = 0;
  ftsRotateReset = true;
  isAutoPitchYawToTarget = false;
  isDragging = false;
  isLocalRotateOverride = false;
  isLocalRotateReset = true;
  isLocalRotateRoll = false;
  isLocalRotateYaw = false;
  isPanReset = false;
  isScreenPan = false;
  isWorldPan = false;
  isZoomIn = false;
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

  mouseX = 0;
  mouseY = 0;
  panCurrent = {
    x: 0,
    y: 0,
    z: 0,
  };

  panSpeed = {
    x: 0,
    y: 0,
    z: 0,
  };

  panStartPosition = {
    x: 0,
    y: 0,
    z: 0,
  };

  position = <vec3>[0, 25000, 0];
  screenDragPoint = [0, 0];
  speedModifier = 1;
  startMouseX = 0;
  startMouseY = 0;
  camDistBuffer = <Kilometers>0;
  private activeCameraType_: CameraControllerType = CameraControllerType.EARTH_CENTERED_ORBITAL;
  get activeCameraType(): CameraControllerType {
    return this.activeCameraType_;
  }

  /**
   * Don't do this! Use the switchCameraController method!!!
   * @deprecated
   */
  set activeCameraType(value: CameraControllerType) {
    this.switchCameraController(value);
  }

  constructor() {
    super(settingsManager.fieldOfView, settingsManager.zNear, settingsManager.zFar, (window.innerWidth / window.innerHeight));

    // Store all camera modes in a map for easy access and extensibility
    const earthCenteredCameraMode = new EarthCenteredOrbitalController(this, Doris.getInstance().getEventBus());
    const fixedToSatelliteCameraMode = new SatelliteOrbitalCameraController(this, Doris.getInstance().getEventBus());
    const firstPersonCameraMode = new FirstPersonCameraController(this, Doris.getInstance().getEventBus());

    this.cameraControllers.set(CameraControllerType.EARTH_CENTERED_ORBITAL, earthCenteredCameraMode);
    this.cameraControllers.set(CameraControllerType.SATELLITE_CENTERED_ORBITAL, fixedToSatelliteCameraMode);
    this.cameraControllers.set(CameraControllerType.FIRST_PERSON, firstPersonCameraMode);

    /*
     * This needs to be initialized earlier
     * Doris.getInstance().on(CoreEngineEvents.AssetLoadComplete, this.initialize.bind(this));
     */
    Doris.getInstance().on(CameraSystemEvents.Reset, this.reset.bind(this));
  }

  updateProjectionMatrix(): void {
    super.updateProjectionMatrix();

    // This converts everything from 3D space to ECI (z and y planes are swapped)
    mat4.mul(this.projectionMatrix, this.projectionMatrix, KeepTrackMainCamera.eciToOpenGlMat_);
  }

  updateViewMatrix(): void {
    // KeepTrack Camera isn't attached to a node yet TODO
    if (!this.isDirty) { // !this.node
      return;
    }

    this.isDirty = false;
  }

  getScreenCoords(obj: BaseObject): {
    x: number;
    y: number;
    z: number;
    error: boolean;
  } {
    const pMatrix = this.projectionMatrix;
    const screenPos = { x: 0, y: 0, z: 0, error: false };

    try {
      const pos = obj.position;

      if (!pos) {
        throw new Error(`No Position for Sat ${obj.id}`);
      }

      const centerVec3 = keepTrackApi.getCenterVec3();
      const posVec4 = <[number, number, number, number]>vec4.fromValues(
        pos.x + centerVec3[0],
        pos.y + centerVec3[1],
        pos.z + centerVec3[2],
        1,
      );

      vec4.transformMat4(posVec4, posVec4, this.viewMatrix);
      vec4.transformMat4(posVec4, posVec4, pMatrix);

      screenPos.x = posVec4[0] / posVec4[3];
      screenPos.y = posVec4[1] / posVec4[3];
      screenPos.z = posVec4[2] / posVec4[3];

      screenPos.x = (screenPos.x + 1) * 0.5 * window.innerWidth;
      screenPos.y = (-screenPos.y + 1) * 0.5 * window.innerHeight;

      screenPos.error = !(screenPos.x >= 0 && screenPos.y >= 0 && screenPos.z >= 0 && screenPos.z <= 1);
    } catch {
      screenPos.error = true;
    }

    return screenPos;
  }

  reset(isHardReset = false) {
    if (isHardReset) {
      this.zoomLevel_ = 0.6925;
    }
    this.zoomTarget = 0.6925;
    this.isAutoPitchYawToTarget = !!isHardReset;
    this.isDragging = false;
    this.isLocalRotateReset = !!isHardReset;
    this.isLocalRotateOverride = false;
    this.isPanReset = false;
    this.isScreenPan = false;
    this.isWorldPan = false;
    this.isZoomIn = false;
    this.localRotateCurrent = {
      pitch: <Radians>0,
      roll: <Radians>0,
      yaw: <Radians>0,
    };
    this.localRotateDif = {
      pitch: <Radians>0,
      roll: <Radians>0,
      yaw: <Radians>0,
    };
    this.localRotateSpeed = {
      pitch: 0,
      roll: 0,
      yaw: 0,
    };
    this.localRotateStartPosition = {
      pitch: 0,
      roll: 0,
      yaw: 0,
    };
    this.panCurrent = {
      x: 0,
      y: 0,
      z: 0,
    };
    this.panSpeed = {
      x: 0,
      y: 0,
      z: 0,
    };
    this.panStartPosition = {
      x: 0,
      y: 0,
      z: 0,
    };
    this.position = <vec3>[0, 0, 0];
    this.screenDragPoint = [0, 0];
  }

  resetRotation() {
    if (this.activeCameraType_ !== CameraControllerType.FIRST_PERSON) {
      this.isPanReset = true;
    }
    this.isLocalRotateReset = true;
    if (this.activeCameraType_ === CameraControllerType.SATELLITE_CENTERED_ORBITAL) {
      this.ftsRotateReset = true;
    }
  }

  get zoomTarget(): number {
    return this.zoomTarget_;
  }

  set zoomTarget(val: number) {
    // Clamp to [0.01, 1]
    val = Math.max(val, 0.01);
    val = Math.min(val, 1);

    this.zoomTarget_ = val;
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

    if (!settingsManager.isAutoRotateD && !settingsManager.isAutoRotateU && !settingsManager.isAutoRotateL && !settingsManager.isAutoRotateR) {
      // Ensure at least one axis is rotating
      settingsManager.isAutoRotateL = true;
    }

    if (typeof val === 'undefined') {
      this.isAutoRotate_ = !this.isAutoRotate_;

      return;
    }
    this.isAutoRotate_ = val;
  }

  camSnap(pitch: Radians, yaw: Radians): void {
    this.activeCameraController.lookAtAngle(pitch, yaw);

    // this.isPanReset = true
    this.camPitchTarget = pitch;
    this.camYawTarget = normalizeAngle(yaw);
    this.earthCenteredPitch = pitch;
    this.earthCenteredYaw = this.camYawTarget; // Use the normalized yaw
    // if (this.earthCenteredYaw_ < 0) this.earthCenteredYaw_ = <Radians>(this.earthCenteredYaw_ + TAU);
    this.isAutoPitchYawToTarget = true;
  }

  switchCameraController(controllerType?: CameraControllerType) {
    // Switch to the type provided
    let newCameraController = controllerType ? this.cameraControllers.get(controllerType) : null;
    let nextControllerType: CameraControllerType | undefined | null = controllerType;

    if (!newCameraController) {
      // Rotate to the next available controller
      nextControllerType = this.getNextControllerType_(this.activeCameraType_);
      const nextCameraController = nextControllerType ? this.cameraControllers.get(nextControllerType) : null;

      if (nextCameraController) {
        newCameraController = nextCameraController;
      }
    }

    if (newCameraController && newCameraController !== this.activeCameraController) {
      this.activeCameraController.deactivate();
      this.activeCameraController = newCameraController;
      this.activeCameraController.activate();
      this.activeCameraType_ = nextControllerType!;
    }
  }

  private getNextControllerType_(currentType: CameraControllerType): CameraControllerType | null {
    const types = Array.from(this.cameraControllers.keys());
    const currentIndex = types.indexOf(currentType);

    if (currentIndex === -1 || types.length === 0) {
      return null;
    }
    const nextIndex = (currentIndex + 1) % types.length;

    // Get the next controller
    const nextControllerType = types[nextIndex];
    const nextCameraController = this.cameraControllers.get(nextControllerType)!;

    if (!nextCameraController.validate()) {
      // Try the next one
      return this.getNextControllerType_(nextControllerType);
    }

    return nextControllerType;
  }

  zoomWheel(delta: number): void {
    this.isZoomIn = delta < 0;

    if (settingsManager.isZoomStopsRotation) {
      this.autoRotate(false);
    }
  }

  changeZoom(zoom: ZoomValue | number): void {
    this.zoomTarget = zoom;
  }

  /*
   * This is called every frame to update the camera
   */
  render(): void {
    if (!keepTrackApi.getTimeManager().simulationTimeObj) {
      return;
    }

    this.drawPreValidate_();
    mat4.identity(this.viewMatrix);

    this.activeCameraController?.render(this);
  }

  exitFixedToSat(): void {
    if (this.activeCameraType_ !== CameraControllerType.SATELLITE_CENTERED_ORBITAL) {
      return;
    }
    this.switchCameraController(CameraControllerType.EARTH_CENTERED_ORBITAL);

    const cameraDistance = this.getCameraDistance();

    this.ftsRotateReset = true;

    // If within 9000km then we want to move further back to feel less jarring
    if (cameraDistance > 9000) {
      this.switchCameraController(CameraControllerType.EARTH_CENTERED_ORBITAL);

      this.zoomTarget = this.getZoomFromDistance(cameraDistance) + 0.005;
      this.camPitch = this.earthCenteredPitch;
      this.camYaw = this.earthCenteredYaw;
      this.isAutoPitchYawToTarget = true;
    } else {
      this.camPitch = this.earthCenteredPitch;
      this.camYaw = this.earthCenteredYaw;
      this.zoomTarget = this.getZoomFromDistance(cameraDistance) + 0.15;
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
  getCameraDistance(zoom?: number): Kilometers {
    if (zoom) {
      return <Kilometers>(zoom ** ZOOM_EXP * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance);
    }

    return <Kilometers>(this.zoomLevel_ ** ZOOM_EXP * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance);
  }

  /**
   * Calculates the ECI of the Camera based on the viewMatrix
   *
   * Used in RayCasting
   */
  getCamPos(): vec3 {
    vec3.transformMat4(this.position, this.position, this.viewMatrix);

    return this.position;
  }

  getDistFromEarth(): Kilometers {
    const position = this.getCamPos();


    return <Kilometers>Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
  }

  /**
   * This is the direction the camera is facing
   */
  getCameraOrientation(): vec3 {
    if (this.activeCameraType_ === CameraControllerType.SATELLITE_CENTERED_ORBITAL) {
      return (this.activeCameraController as SatelliteOrbitalCameraController).getCameraOrientation();
    }
    if (this.activeCameraType_ === CameraControllerType.EARTH_CENTERED_ORBITAL) {
      return (this.activeCameraController as EarthCenteredOrbitalController).getCameraOrientation();
    }

    return this.position;
  }

  getCameraPosition() {
    if (this.activeCameraController instanceof EarthCenteredOrbitalController) {
      return this.activeCameraController.getCameraPosition(vec3.fromValues(0, 0, 0));
    }
    if (this.activeCameraController instanceof SatelliteOrbitalCameraController) {
      return this.activeCameraController.getCameraPosition();
    }

    return this.position;
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

  initialize() {
    this.updateProjectionMatrix();
    this.keyHandler.initialize();

    Doris.getInstance().on(KeepTrackApiEvents.selectSatData, (): void => {
      this.isAutoPitchYawToTarget = false;
    });

    Doris.getInstance().on(KeepTrackApiEvents.canvasMouseDown, this.canvasMouseDown_.bind(this));
    Doris.getInstance().on(KeepTrackApiEvents.touchStart, this.touchStart_.bind(this));
    Doris.getInstance().on(CoreEngineEvents.RenderOpaque, () => {
      this.render();
    });

    Doris.getInstance().on(CoreEngineEvents.BeforeUpdate, this.validateProjectionMatrix_.bind(this));
  }

  canvasMouseDown_(evt: MouseEvent) {
    if (this.speedModifier === 1) {
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
    }

    this.screenDragPoint = [this.mouseX, this.mouseY];
    this.dragStartPitch = this.camPitch;
    this.dragStartYaw = this.camYaw;

    if (evt.button === 0) {
      this.isDragging = true;
    }

    this.isAutoPitchYawToTarget = false;
    if (!settingsManager.disableUI) {
      this.autoRotate(false);
    }
  }

  touchStart_() {
    settingsManager.cameraMovementSpeed = Math.max(0.005 * this.zoomLevel(), settingsManager.cameraMovementSpeedMin);
    this.screenDragPoint = [this.mouseX, this.mouseY];
    this.dragStartPitch = this.camPitch;
    this.dragStartYaw = this.camYaw;
    this.isDragging = true;

    this.isAutoPitchYawToTarget = false;
    if (!settingsManager.disableUI) {
      this.autoRotate(false);
    }
  }

  /**
   * Sets the camera to look at a specific latitude and longitude with a given zoom level.
   */
  lookAtLatLon(lat: Degrees, lon: Degrees, zoom: ZoomValue | number, date = keepTrackApi.getTimeManager().simulationTimeObj): void {
    this.changeZoom(zoom);
    this.camSnap(lat2pitch(lat), lon2yaw(lon, date));
  }

  lookAtStar(c: Star): void {
    this.switchCameraController(CameraControllerType.EARTH_CENTERED_ORBITAL);
    (this.activeCameraController as EarthCenteredOrbitalController).lookAtStar(c);
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
      this.camZoomSnappedOnSat = false;
      this.camAngleSnappedOnSat = false;

      return;
    }

    if (this.camAngleSnappedOnSat) {
      this.camSnapToSat.pos = sat.position;
      this.camSnapToSat.radius = Math.sqrt(this.camSnapToSat.pos.x ** 2 + this.camSnapToSat.pos.y ** 2);
      this.camSnapToSat.yaw = <Radians>(Math.atan2(this.camSnapToSat.pos.y, this.camSnapToSat.pos.x) + TAU / 4);
      this.camSnapToSat.pitch = <Radians>Math.atan2(this.camSnapToSat.pos.z, this.camSnapToSat.radius);
      if (this.camSnapToSat.pitch === null || typeof this.camSnapToSat.pitch === 'undefined') {
        errorManagerInstance.info('Pitch Calculation Error');
        this.camSnapToSat.pitch = <Radians>0;
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }
      if (this.camSnapToSat.yaw === null || typeof this.camSnapToSat.yaw === 'undefined') {
        errorManagerInstance.info('Yaw Calculation Error');
        this.camSnapToSat.yaw = <Radians>0;
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }
      if (this.activeCameraType_ === CameraControllerType.PLANETARIUM) {
        // camSnap(-pitch, -yaw)
      } else {
        this.camSnap(this.camSnapToSat.pitch, this.camSnapToSat.yaw);
      }
    }

    if (this.camZoomSnappedOnSat && !settingsManager.isAutoZoomIn && !settingsManager.isAutoZoomOut) {
      if (sat.active) {
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

      this.camSnapToSat.camDistTarget = this.camSnapToSat.camDistTarget < settingsManager.minZoomDistance ? settingsManager.minZoomDistance + 10 : this.camSnapToSat.camDistTarget;

      this.zoomTarget =
        ((this.camSnapToSat.camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance)) ** (1 / ZOOM_EXP);
      settingsManager.selectedColor = [0, 0, 0, 0];

      this.zoomLevel_ = Math.max(this.zoomLevel_, this.zoomTarget_);

      // errorManagerInstance.debug(`Zoom Target: ${this.zoomTarget_}`);
      this.earthCenteredLastZoom = this.zoomTarget_ + 0.1;

      // Only Zoom in Once on Mobile
      if (settingsManager.isMobileModeEnabled) {
        this.camZoomSnappedOnSat = false;
      }
    }

    if (this.activeCameraController instanceof SatelliteOrbitalCameraController) {
      this.activeCameraController.snapToSat(sat, simulationTime);
    }

    this.updateSatShaderSizes();
  }

  /**
   * Calculate the camera's position and camera matrix
   */
  onUpdate(deltaTime: Milliseconds): void {
    this.updatePan_(deltaTime);
    this.updateLocalRotation_(deltaTime);
    this.updatePitchYawSpeeds_(deltaTime);
    this.updateFtsRotation_(deltaTime);

    this.camRotateSpeed -= this.camRotateSpeed * deltaTime * settingsManager.cameraMovementSpeed;

    if (!(this.activeCameraController instanceof FirstPersonCameraController)) {
      // Account for floating point errors by clamping very small values to zero
      if (Math.abs(this.camPitchSpeed) > 1e-8) {
        this.camPitch = <Radians>(this.camPitch + this.camPitchSpeed * deltaTime);
      } else {
        this.camPitchSpeed = 0;
      }
      if (Math.abs(this.camYawSpeed) > 1e-8) {
        this.camYaw = <Radians>(this.camYaw + this.camYawSpeed * deltaTime);
      } else {
        this.camYawSpeed = 0;
      }
      if (Math.abs(this.camRotateSpeed) > 1e-8) {
        this.fpsRotate = <Degrees>(this.fpsRotate + this.camRotateSpeed * deltaTime);
      } else {
        this.camRotateSpeed = 0;
      }
    }

    if (this.isAutoRotate_) {
      if (settingsManager.isAutoRotateL) {
        this.camYaw = <Radians>(this.camYaw - settingsManager.autoRotateSpeed * deltaTime);
      }
      if (settingsManager.isAutoRotateR) {
        this.camYaw = <Radians>(this.camYaw + settingsManager.autoRotateSpeed * deltaTime);
      }
      if (settingsManager.isAutoRotateU) {
        this.camPitch = <Radians>(this.camPitch + (settingsManager.autoRotateSpeed / 2) * deltaTime);
      }
      if (settingsManager.isAutoRotateD) {
        this.camPitch = <Radians>(this.camPitch - (settingsManager.autoRotateSpeed / 2) * deltaTime);
      }
    }

    this.updateZoom_(deltaTime);

    this.updateCameraSnapMode();

    if (this.activeCameraType_ !== CameraControllerType.SATELLITE_CENTERED_ORBITAL) {
      if (this.camPitch > TAU / 4) {
        this.camPitch = <Radians>(TAU / 4);
      }
      if (this.camPitch < -TAU / 4) {
        this.camPitch = <Radians>(-TAU / 4);
      }
    }

    if (this.camYaw > TAU) {
      this.camYaw = <Radians>(this.camYaw - TAU);
    }
    if (this.camYaw < 0) {
      this.camYaw = <Radians>(this.camYaw + TAU);
    }

    if (this.activeCameraType_ === CameraControllerType.EARTH_CENTERED_ORBITAL) {
      this.earthCenteredPitch = this.camPitch;
      this.earthCenteredYaw = this.camYaw;
      if (this.earthCenteredYaw < 0) {
        this.earthCenteredYaw = <Radians>(this.earthCenteredYaw + TAU);
      }
    }

    this.projectionCameraMatrix = mat4.mul(mat4.create(), this.projectionMatrix, this.viewMatrix);

    const cameraPosition = this.getCameraPosition();

    this.activeCameraController.update(deltaTime);
    this.node.transform.setPosition(cameraPosition);
  }

  validateProjectionMatrix_() {
    if (!this.projectionMatrix) {
      errorManagerInstance.log('projectionMatrix is undefined - retrying');
      this.updateProjectionMatrix();
    }

    for (let i = 0; i < 16; i++) {
      if (isNaN(this.projectionMatrix[i])) {
        errorManagerInstance.log('projectionMatrix is NaN - retrying');
        this.updateProjectionMatrix();
      }
    }

    for (let i = 0; i < 16; i++) {
      if (this.projectionMatrix[i] !== 0) {
        break;
      }
      if (i === 15) {
        errorManagerInstance.log('projectionMatrix is all zeros - retrying');
        this.updateProjectionMatrix();
      }
    }
  }

  zoomLevel(): number {
    return this.zoomLevel_;
  }

  setZoomLevel(zoomLevel: number) {
    this.zoomLevel_ = zoomLevel;
  }

  private drawPreValidate_() {
    if (
      Number.isNaN(this.camPitch) ||
      Number.isNaN(this.camYaw) ||
      Number.isNaN(this.camPitchTarget) ||
      Number.isNaN(this.camYawTarget) ||
      Number.isNaN(this.zoomLevel_) ||
      Number.isNaN(this.zoomTarget_)
    ) {
      try {
        errorManagerInstance.debug(`camPitch: ${this.camPitch}`);
        errorManagerInstance.debug(`camYaw: ${this.camYaw}`);
        errorManagerInstance.debug(`camPitchTarget: ${this.camPitchTarget}`);
        errorManagerInstance.debug(`camYawTarget: ${this.camYawTarget}`);
        errorManagerInstance.debug(`zoomLevel: ${this.zoomLevel_}`);
        errorManagerInstance.debug(`_zoomTarget: ${this.zoomTarget_}`);
        errorManagerInstance.debug(`settingsManager.cameraMovementSpeed: ${settingsManager.cameraMovementSpeed}`);
      } catch (e) {
        errorManagerInstance.info('Camera Math Error');
      }
      this.camPitch = <Radians>0.5;
      this.camYaw = <Radians>0.5;
      this.zoomLevel_ = 0.5;
      this.camPitchTarget = <Radians>0;
      this.camYawTarget = <Radians>0;
      this.zoomTarget = 0.5;
    }
  }

  private updateCameraSnapMode() {
    if (this.isAutoPitchYawToTarget) {
      this.camPitch = this.camPitchTarget;
      this.camYaw = this.camYawTarget;
    }
  }

  private updateFtsRotation_(dt: number) {
    if (this.ftsRotateReset) {
      if (this.activeCameraType_ !== CameraControllerType.SATELLITE_CENTERED_ORBITAL) {
        this.ftsRotateReset = false;
        this.ftsPitch = 0;
        this.camPitchSpeed = 0;
      }

      this.camYaw = normalizeAngle(this.camYaw);
      this.camPitch = normalizeAngle(this.camPitch);

      const marginOfError = 3;

      if (this.camPitch >= this.earthCenteredPitch - marginOfError && this.camPitch <= this.earthCenteredPitch + marginOfError) {
        this.camPitch = this.earthCenteredPitch;
        this.camPitchSpeed = 0;
      } else {
        const upOrDown = this.camPitch - this.earthCenteredPitch > 0 ? -1 : 1;

        this.camPitchSpeed = (dt * upOrDown * settingsManager.cameraMovementSpeed) / 200;
      }

      if (this.camYaw >= this.earthCenteredYaw - marginOfError && this.camYaw <= this.earthCenteredYaw + marginOfError) {
        this.camYaw = this.earthCenteredYaw;
        this.camYawSpeed = 0;
      } else {
        // Figure out the shortest distance back to this.earthCenteredYaw_ from this.camYaw
        const leftOrRight = this.camYaw - this.earthCenteredYaw > 0 ? -1 : 1;

        this.camYawSpeed = (dt * leftOrRight * settingsManager.cameraMovementSpeed) / 200;
      }

      if (this.camYaw === this.earthCenteredYaw && this.camPitch === this.earthCenteredPitch) {
        this.ftsRotateReset = false;
      }
    }

    if (this.activeCameraController instanceof SatelliteOrbitalCameraController) {
      this.camPitch = normalizeAngle(this.camPitch);
      // Smoothly move ftsPitch and ftsYaw towards camPitch and camYaw
      const smoothing = 0.1;

      this.ftsPitch += (this.camPitch - this.ftsPitch) * smoothing;
      this.ftsYaw += (this.camYaw - this.ftsYaw) * smoothing;
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
        this.localRotateTarget_.pitch = <Radians>(this.localRotateStartPosition.pitch + this.localRotateDif.pitch * -settingsManager.cameraMovementSpeed);
        this.localRotateSpeed.pitch = normalizeAngle(<Radians>(this.localRotateCurrent.pitch - this.localRotateTarget_.pitch)) * -settingsManager.cameraMovementSpeed;

        if (this.isLocalRotateRoll) {
          this.localRotateDif.roll = <Radians>(this.screenDragPoint[0] - this.mouseX);
          this.localRotateTarget_.roll = <Radians>(this.localRotateStartPosition.roll + this.localRotateDif.roll * settingsManager.cameraMovementSpeed);
          this.localRotateSpeed.roll = normalizeAngle(<Radians>(this.localRotateCurrent.roll - this.localRotateTarget_.roll)) * -settingsManager.cameraMovementSpeed;
        }
        if (this.isLocalRotateYaw) {
          this.localRotateDif.yaw = <Radians>(this.screenDragPoint[0] - this.mouseX);
          this.localRotateTarget_.yaw = <Radians>(this.localRotateStartPosition.yaw + this.localRotateDif.yaw * settingsManager.cameraMovementSpeed);
          this.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.localRotateCurrent.yaw - this.localRotateTarget_.yaw)) * -settingsManager.cameraMovementSpeed;
        }
      }

      if (this.isLocalRotateOverride) {
        this.localRotateTarget_.pitch = <Radians>(this.localRotateStartPosition.pitch + this.localRotateDif.pitch * -settingsManager.cameraMovementSpeed);
        this.localRotateSpeed.pitch = normalizeAngle(<Radians>(this.localRotateCurrent.pitch - this.localRotateTarget_.pitch)) * -settingsManager.cameraMovementSpeed;
        this.localRotateTarget_.yaw = <Radians>(this.localRotateStartPosition.yaw + this.localRotateDif.yaw * settingsManager.cameraMovementSpeed);
        this.localRotateSpeed.yaw = normalizeAngle(<Radians>(this.localRotateCurrent.yaw - this.localRotateTarget_.yaw)) * -settingsManager.cameraMovementSpeed;
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
        if (this.localRotateCurrent.pitch > -0.001 && this.localRotateCurrent.pitch < 0.001) {
          this.localRotateCurrent.pitch = <Radians>0;
        }
        if (this.localRotateCurrent.roll > -0.001 && this.localRotateCurrent.roll < 0.001) {
          this.localRotateCurrent.roll = <Radians>0;
        }
        if (this.localRotateCurrent.yaw > -0.001 && this.localRotateCurrent.yaw < 0.001) {
          this.localRotateCurrent.yaw = <Radians>0;
        }
        if (this.localRotateCurrent.pitch === 0 && this.localRotateCurrent.roll === 0 && this.localRotateCurrent.yaw === <Radians>0) {
          this.isLocalRotateReset = false;
        }
      }
    }
  }

  private updatePan_(dt: number) {
    if (this.isScreenPan || this.isWorldPan || this.isPanReset) {
      // If user is actively moving
      if (this.isScreenPan || this.isWorldPan) {
        this.camPitchSpeed = 0;
        this.camYawSpeed = 0;
        this.panDif_.x = this.screenDragPoint[0] - this.mouseX;
        this.panDif_.y = this.screenDragPoint[1] - this.mouseY;
        this.panDif_.z = this.screenDragPoint[1] - this.mouseY;

        // Slow down the panning if a satellite is selected
        if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1) {
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
        this.position[1] = <Radians>(this.position[1] - Math.cos(this.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed_ * this.panDif_.y);
        this.position[2] = <Radians>(this.position[1] + Math.sin(this.localRotateCurrent.pitch) * panResetModifier * this.panMovementSpeed_ * this.panDif_.y);
        this.position[1] = <Radians>(this.position[1] - Math.sin(-this.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed_ * this.panDif_.x);
      }
      // If we are moving the screen then Z is always up and Y is not relevant
      if (this.isScreenPan || this.isPanReset) {
        this.panSpeed.z = (this.panCurrent.z - this.panTarget_.z) * this.panMovementSpeed_ * this.zoomLevel_;
        this.panSpeed.z -= this.panSpeed.z * dt * this.panMovementSpeed_ * this.zoomLevel_;
        this.panCurrent.z -= panResetModifier * this.panMovementSpeed_ * this.panDif_.z;
      }

      if (this.isPanReset) {
        this.position[0] -= this.position[0] / 25;
        this.position[1] -= this.position[1] / 25;
        this.position[2] -= this.position[2] / 25;

        if (this.panCurrent.x > -0.5 && this.panCurrent.x < 0.5) {
          this.panCurrent.x = 0;
        }
        if (this.panCurrent.y > -0.5 && this.panCurrent.y < 0.5) {
          this.panCurrent.y = 0;
        }
        if (this.panCurrent.z > -0.5 && this.panCurrent.z < 0.5) {
          this.panCurrent.z = 0;
        }
        if (this.position[0] > -0.5 && this.position[0] < 0.5) {
          this.position[0] = 0;
        }
        if (this.position[1] > -0.5 && this.position[1] < 0.5) {
          this.position[1] = 0;
        }
        if (this.position[2] > -0.5 && this.position[2] < 0.5) {
          this.position[2] = 0;
        }

        if (this.panCurrent.x === 0 && this.panCurrent.y === 0 && this.panCurrent.z === 0 && this.position[0] === 0 && this.position[1] === 0 && this.position[2] === 0) {
          this.isPanReset = false;
        }
      }
    }
    if (settingsManager.isAutoPanD || settingsManager.isAutoPanU || settingsManager.isAutoPanL || settingsManager.isAutoPanR) {
      if (settingsManager.isAutoPanD) {
        this.panCurrent.z += settingsManager.autoPanSpeed * dt;
      }
      if (settingsManager.isAutoPanU) {
        this.panCurrent.z -= settingsManager.autoPanSpeed * dt;
      }
      if (settingsManager.isAutoPanL) {
        this.panCurrent.x += settingsManager.autoPanSpeed * dt;
      }
      if (settingsManager.isAutoPanR) {
        this.panCurrent.x -= settingsManager.autoPanSpeed * dt;
      }
    }
  }

  private updatePitchYawSpeeds_(dt: Milliseconds) {
    if ((this.isDragging && !settingsManager.isMobileModeEnabled) || (this.isDragging && settingsManager.isMobileModeEnabled && (this.mouseX !== 0 || this.mouseY !== 0))) {
      /*
       * Disable Raycasting for Performance
       * dragTarget = getEarthScreenPoint(mouseX, mouseY)
       * if (Number.isNaN(dragTarget[0]) || Number.isNaN(dragTarget[1]) || Number.isNaN(dragTarget[2]) ||
       * Number.isNaN(dragPoint[0]) || Number.isNaN(dragPoint[1]) || Number.isNaN(dragPoint[2]) ||
       */
      if (
        !this.isRayCastingEarth_ ||
        this.activeCameraType_ === CameraControllerType.FIRST_PERSON ||
        this.activeCameraType_ === CameraControllerType.SATELLITE_FIRST_PERSON ||
        settingsManager.isMobileModeEnabled
      ) {
        // random screen drag
        const xDif = this.screenDragPoint[0] - this.mouseX;
        const yDif = this.screenDragPoint[1] - this.mouseY;
        const yawTarget = <Radians>(this.dragStartYaw + xDif * settingsManager.cameraMovementSpeed);
        const pitchTarget = <Radians>(this.dragStartPitch + yDif * -settingsManager.cameraMovementSpeed);

        this.camPitchSpeed = normalizeAngle(<Radians>(this.camPitch - pitchTarget)) * -settingsManager.cameraMovementSpeed;
        this.camYawSpeed = normalizeAngle(<Radians>(this.camYaw - yawTarget)) * -settingsManager.cameraMovementSpeed;
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
      this.isAutoPitchYawToTarget = false;
    } else {
      /*
       * this block of code is what causes the momentum effect when moving the camera
       * Most applications like Goolge Earth or STK do not have this effect as pronounced
       * It makes KeepTrack feel more like a game and less like a toolkit
       */
      if (Math.abs(this.camPitchSpeed) > 0.01) {
        this.camPitchSpeed -= this.camPitchSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor; // decay speeds when globe is "thrown"
      } else {
        this.camPitchSpeed = 0;
      }
      if (Math.abs(this.camYawSpeed) > 0.01) {
        this.camYawSpeed -= this.camYawSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor;
      } else {
        this.camYawSpeed = 0;
      }
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
    // Allow a small margin of error for floating point comparison
    if (Math.abs(this.zoomLevel_ - this.zoomTarget_) > 1e-5) {
      this.updateSatShaderSizes();
    } else {
      this.zoomLevel_ = this.zoomTarget_;
    }

    if (settingsManager.isAutoZoomIn || settingsManager.isAutoZoomOut) {
      const cameraDistance = this.getCameraDistance();

      if (cameraDistance > 140000) {
        settingsManager.satShader.minSize = 7;
      }
      if (cameraDistance > 180000) {
        settingsManager.satShader.minSize = 6;
      }
      if (cameraDistance > 220000) {
        settingsManager.satShader.minSize = 5;
      }
      if (cameraDistance > 280000) {
        settingsManager.satShader.minSize = 4;
      }
      if (cameraDistance > 350000) {
        settingsManager.satShader.minSize = 3;
      }
      if (cameraDistance > 400000) {
        settingsManager.satShader.minSize = 2;
      }
      if (cameraDistance > 450000) {
        settingsManager.satShader.minSize = 1;
      }

      if (settingsManager.isAutoZoomIn) {
        this.zoomTarget_ -= dt * settingsManager.autoZoomSpeed;
      }
      if (settingsManager.isAutoZoomOut) {
        this.zoomTarget_ += dt * settingsManager.autoZoomSpeed;
      }
    }

    if (this.isAutoPitchYawToTarget) {
      this.zoomLevel_ += (this.zoomTarget_ - this.zoomLevel_) * dt * settingsManager.zoomSpeed; // Just keep zooming
    } else if (this.zoomLevel_ !== this.zoomTarget_) {
      const inOrOut = this.zoomLevel_ > this.zoomTarget_ ? -1 : 1;

      this.zoomLevel_ += inOrOut * dt * settingsManager.zoomSpeed * Math.abs(this.zoomTarget_ - this.zoomLevel_);

      if ((this.zoomLevel_ > this.zoomTarget_ && !this.isZoomIn) || (this.zoomLevel_ < this.zoomTarget_ && this.isZoomIn)) {
        this.zoomTarget_ = this.zoomLevel_; // If we change direction then consider us at the target
      }
    }

    // Clamp Zoom between 0 and 1
    this.zoomLevel_ = this.zoomLevel_ > 1 ? 1 : this.zoomLevel_;
    this.zoomLevel_ = this.zoomLevel_ < 0 ? 0.0001 : this.zoomLevel_;

    // Try to stay out of the earth
    if (this.activeCameraType_ === CameraControllerType.EARTH_CENTERED_ORBITAL ||
      this.activeCameraType_ === CameraControllerType.SATELLITE_CENTERED_ORBITAL) {
      if (this.getDistFromEarth() < RADIUS_OF_EARTH + 30) {
        this.zoomTarget = this.zoomLevel_ + 0.001;
      }
    }
  }

  updateSatShaderSizes() {
    if (this.zoomLevel_ > settingsManager.satShader.largeObjectMaxZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 1.5;
    } else if (this.zoomLevel_ < settingsManager.satShader.largeObjectMinZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize / 3;
    } else {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize;
    }
  }
}
