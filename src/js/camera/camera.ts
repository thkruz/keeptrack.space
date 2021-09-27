/*!
// /////////////////////////////////////////////////////////////////////////////

Copyright (C) 2016-2021 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

// /////////////////////////////////////////////////////////////////////////////

*/

import * as glm from 'gl-matrix';

import { DEG2RAD, RADIUS_OF_EARTH, TAU, ZOOM_EXP } from '@app/js/lib/constants.js';

import { getDayOfYear } from '../timeManager/timeManager';

export class Camera {
  camMatrix: glm.mat4;
  isZoomIn: boolean;
  mouseX: number;
  mouseY: number;
  screenDragPoint: number[];
  camPitch: number;
  camYaw: number;
  camPitchSpeed: number;
  camYawSpeed: number;
  _zoomLevel: number;
  _zoomTarget: number;
  isShiftPressed: boolean;
  camZoomSnappedOnSat: boolean;
  camAngleSnappedOnSat: boolean;
  dragStartPitch: number;
  dragStartYaw: number;
  isDragging: boolean;
  speedModifier: number;
  isWorldPan: boolean;
  isScreenPan: boolean;
  isPanReset: boolean;
  panCurrent: { x: number; y: number; z: number };
  panStartPosition: { x: number; y: number; z: number };
  isCamSnapMode: boolean;
  isLocalRotateReset: boolean;
  isLocalRotateRoll: boolean;
  isLocalRotateYaw: boolean;
  isLocalRotateOverride: boolean;
  localRotateCurrent: { pitch: number; roll: number; yaw: number };
  localRotateStartPosition: { pitch: number; roll: number; yaw: number };
  ftsRotateReset: boolean;
  ecLastZoom: number;
  cameraType: { current: number; Default: number; FixedToSat: number; Offset: number; Fps: number; Planetarium: number; Satellite: number; Astronomy: number; set: (val: any) => void };
  camMatrixEmpty: glm.mat4;
  isAutoRotate: boolean;
  isAutoPan: boolean;
  yawErr: number;
  camYawTarget: number;
  camPitchTarget: number;
  fpsPitch: number;
  fpsPitchRate: number;
  fpsRotate: number;
  fpsRotateRate: number;
  fpsYaw: number;
  fpsYawRate: number;
  fpsPos: number[];
  fpsForwardSpeed: number;
  fpsSideSpeed: number;
  fpsVertSpeed: number;
  isFPSForwardSpeedLock: boolean;
  isFPSSideSpeedLock: boolean;
  isFPSVertSpeedLock: boolean;
  fpsRun: number;
  fpsLastTime: number;
  camSnapToSat: { pos: { x: number; y: number; z: number }; radius: number; pitch: number; yaw: number; altitude: number; camDistTarget: number };
  isRayCastingEarth: boolean;
  chaseSpeed: number;
  panSpeed: { x: number; y: number; z: number };
  panMovementSpeed: number;
  panTarget: { x: number; y: number; z: number };
  panDif: { x: number; y: number; z: number };
  localRotateSpeed: { pitch: number; roll: number; yaw: number };
  localRotateMovementSpeed: number;
  localRotateTarget: { pitch: number; roll: number; yaw: number };
  localRotateDif: { pitch: number; roll: number; yaw: number };
  ecPitch: number;
  ecYaw: number;
  ftsPitch: number;
  ftsYaw: number;
  camRotateSpeed: number;

  constructor() {
    this.camMatrix = glm.mat4.create();
    this.isZoomIn = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.screenDragPoint = [0, 0];
    this.camPitch = 0;
    this.camYaw = 0;
    this.camPitchSpeed = 0;
    this.camYawSpeed = 0;
    this._zoomLevel = 0.6925;
    this._zoomTarget = 0.6925;
    this.isShiftPressed = false;
    this.camZoomSnappedOnSat = false;
    this.camAngleSnappedOnSat = false;
    this.dragStartPitch = 0;
    this.dragStartYaw = 0;
    this.isDragging = false;
    this.speedModifier = 1;
    this.isWorldPan = false;
    this.isScreenPan = false;
    this.isPanReset = false;
    this.panCurrent = { x: 0, y: 0, z: 0 };
    this.panStartPosition = { x: 0, y: 0, z: 0 };
    this.isCamSnapMode = false;
    this.isLocalRotateReset = false;
    this.isLocalRotateRoll = false;
    this.isLocalRotateYaw = false;
    this.isLocalRotateOverride = false;
    this.localRotateCurrent = { pitch: 0, roll: 0, yaw: 0 };
    this.localRotateStartPosition = { pitch: 0, roll: 0, yaw: 0 };
    this.ftsRotateReset = false;
    this.ecLastZoom = 0.45;
    this.cameraType = {
      current: 0,
      Default: 0,
      FixedToSat: 1,
      Offset: 2,
      Fps: 3,
      Planetarium: 4,
      Satellite: 5,
      Astronomy: 6,
      set: (val) => {
        if (typeof val !== 'number') throw new TypeError();
        if (val > 6 || val < 0) throw new RangeError();

        this.cameraType.current = val;
        this.resetFpsPos();
      },
    };
    this.camMatrixEmpty = glm.mat4.create();
    this.isAutoRotate = true;
    this.isAutoPan = false;
    this.yawErr = 0;
    this.camYawTarget = 0;
    this.camPitchTarget = 0;
    this.fpsPitch = 0;
    this.fpsPitchRate = 0;
    this.fpsRotate = 0;
    this.fpsRotateRate = 0;
    this.fpsYaw = 0;
    this.fpsYawRate = 0;
    this.fpsPos = [0, 0, 0];
    this.fpsForwardSpeed = 0;
    this.fpsSideSpeed = 0;
    this.fpsVertSpeed = 0;
    this.isFPSForwardSpeedLock = false;
    this.isFPSSideSpeedLock = false;
    this.isFPSVertSpeedLock = false;
    this.fpsRun = 1;
    this.fpsLastTime = 1;
    this.camSnapToSat = {
      pos: {
        x: 0,
        y: 0,
        z: 0,
      },
      radius: 0,
      pitch: 0,
      yaw: 0,
      altitude: 0,
      camDistTarget: 0,
    };
    this.isRayCastingEarth = false;
    this.chaseSpeed = 0.0035;
    this.panSpeed = { x: 0, y: 0, z: 0 };
    this.panMovementSpeed = 0.5;
    this.panTarget = { x: 0, y: 0, z: 0 };
    this.panDif = { x: 0, y: 0, z: 0 };
    this.localRotateSpeed = { pitch: 0, roll: 0, yaw: 0 };
    this.localRotateMovementSpeed = 0.00005;
    this.localRotateTarget = { pitch: 0, roll: 0, yaw: 0 };
    this.localRotateDif = { pitch: 0, roll: 0, yaw: 0 };
    this.ecPitch = 0;
    this.ecYaw = 0;
    this.ftsPitch = 0;
    this.ftsYaw = 0;
    this.camRotateSpeed = 0;
  }

  get zoomLevel() {
    return this._zoomLevel;
  }
  set zoomLevel(val: number) {
    this._zoomLevel = val > 1 ? 1 : val;
    this._zoomLevel = val < 0 ? 0 : val;
  }
  get zoomTarget() {
    return this._zoomTarget;
  }
  set zoomTarget(val: number) {
    this._zoomTarget = val > 1 ? 1 : val;
    this._zoomTarget = val < 0 ? 0 : val;
  }

  /**
   *
   * @param angle angle in radians
   * @returns {number} normalized angle in radians
   */
  static normalizeAngle(angle: number): number {
    angle %= TAU;
    if (angle > TAU / 2) angle -= TAU;
    if (angle < -TAU / 2) angle += TAU;
    return angle;
  }

  static longToYaw(long: number, selectedDate: Date) {
    let realTime = new Date();
    let propTime = new Date();
    let angle = 0;

    // NOTE: This formula sometimes is incorrect, but has been stable for over a year
    // NOTE: Looks wrong again as of 8/29/2020 - time of year issue?
    // NOTE: Could this be related to daylight savings time? Subtracting one hour from selected date works
    const doy = getDayOfYear(selectedDate);
    const modifier = 1000 * 60 * 60 * (-11.23 + 0.065666667 * doy);

    propTime.setUTCHours(selectedDate.getUTCHours()); // + (selectedDate.getUTCMonth() * 2 - 11) / 2); // Offset has to account for time of year. Add 2 Hours per month into the year starting at -12.
    propTime.setUTCMinutes(selectedDate.getUTCMinutes());
    propTime.setUTCSeconds(selectedDate.getUTCSeconds());
    propTime = new Date(propTime.getTime() * 1 + modifier);

    realTime.setUTCHours(0);
    realTime.setUTCMinutes(0);
    realTime.setUTCSeconds(0);
    let longOffset = (propTime.getTime() - realTime.getTime()) / 60 / 60 / 1000; // In Hours
    if (longOffset > 24) longOffset = longOffset - 24;
    longOffset = longOffset * 15; // 15 Degress Per Hour longitude Offset

    angle = (long + longOffset) * DEG2RAD;
    angle = Camera.normalizeAngle(angle);
    return angle;
  }

  static latToPitch(lat: number): number {
    let pitch = lat * DEG2RAD;
    if (pitch > TAU / 4) pitch = TAU / 4; // Max 90 Degrees
    if (pitch < -TAU / 4) pitch = -TAU / 4; // Min -90 Degrees
    return pitch;
  }

  /* Private Methods */
  private resetFpsPos() {
    this.fpsPitch = 0;
    this.fpsYaw = 0;
    this.fpsPos[0] = 0;

    // Move out from the center of the Earth in FPS Mode
    if (this.cameraType.current == 3) {
      this.fpsPos[1] = 25000;
    } else {
      this.fpsPos[1] = 0;
    }
    this.fpsPos[2] = 0;
  }

  private fpsMovement() {
    const fpsTimeNow = Date.now();
    if (this.fpsLastTime !== 0) {
      const fpsElapsed = fpsTimeNow - this.fpsLastTime;

      if (this.isFPSForwardSpeedLock && this.fpsForwardSpeed < 0) {
        this.fpsForwardSpeed = Math.max(this.fpsForwardSpeed + Math.min(this.fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsForwardSpeed);
      } else if (this.isFPSForwardSpeedLock && this.fpsForwardSpeed > 0) {
        this.fpsForwardSpeed = Math.min(this.fpsForwardSpeed + Math.max(this.fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsForwardSpeed);
      }

      if (this.isFPSSideSpeedLock && this.fpsSideSpeed < 0) {
        this.fpsSideSpeed = Math.max(this.fpsSideSpeed + Math.min(this.fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsSideSpeed);
      } else if (this.isFPSSideSpeedLock && this.fpsSideSpeed > 0) {
        this.fpsSideSpeed = Math.min(this.fpsSideSpeed + Math.max(this.fpsSideSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsSideSpeed);
      }

      if (this.isFPSVertSpeedLock && this.fpsVertSpeed < 0) {
        this.fpsVertSpeed = Math.max(this.fpsVertSpeed + Math.min(this.fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsVertSpeed);
      } else if (this.isFPSVertSpeedLock && this.fpsVertSpeed > 0) {
        this.fpsVertSpeed = Math.min(this.fpsVertSpeed + Math.max(this.fpsVertSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsVertSpeed);
      }

      // console.log('Front: ' + fpsForwardSpeed + ' - ' + 'Side: ' + fpsSideSpeed + ' - ' + 'Vert: ' + fpsVertSpeed)

      if (this.cameraType.Fps) {
        if (this.fpsForwardSpeed !== 0) {
          this.fpsPos[0] -= Math.sin(this.fpsYaw * DEG2RAD) * this.fpsForwardSpeed * this.fpsRun * fpsElapsed;
          this.fpsPos[1] -= Math.cos(this.fpsYaw * DEG2RAD) * this.fpsForwardSpeed * this.fpsRun * fpsElapsed;
          this.fpsPos[2] += Math.sin(this.fpsPitch * DEG2RAD) * this.fpsForwardSpeed * this.fpsRun * fpsElapsed;
        }
        if (this.fpsVertSpeed !== 0) {
          this.fpsPos[2] -= this.fpsVertSpeed * this.fpsRun * fpsElapsed;
        }
        if (this.fpsSideSpeed !== 0) {
          this.fpsPos[0] -= Math.cos(-this.fpsYaw * DEG2RAD) * this.fpsSideSpeed * this.fpsRun * fpsElapsed;
          this.fpsPos[1] -= Math.sin(-this.fpsYaw * DEG2RAD) * this.fpsSideSpeed * this.fpsRun * fpsElapsed;
        }
      }

      if (!this.isFPSForwardSpeedLock) this.fpsForwardSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      if (!this.isFPSSideSpeedLock) this.fpsSideSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      if (!this.isFPSVertSpeedLock) this.fpsVertSpeed *= Math.min(0.98 * fpsElapsed, 0.98);

      if (this.fpsForwardSpeed < 0.01 && this.fpsForwardSpeed > -0.01) this.fpsForwardSpeed = 0;
      if (this.fpsSideSpeed < 0.01 && this.fpsSideSpeed > -0.01) this.fpsSideSpeed = 0;
      if (this.fpsVertSpeed < 0.01 && this.fpsVertSpeed > -0.01) this.fpsVertSpeed = 0;

      this.fpsPitch += this.fpsPitchRate * fpsElapsed;
      this.fpsRotate += this.fpsRotateRate * fpsElapsed;
      this.fpsYaw += this.fpsYawRate * fpsElapsed;

      // console.log('Pitch: ' + fpsPitch + ' - ' + 'Rotate: ' + fpsRotate + ' - ' + 'Yaw: ' + fpsYaw)
    }
    this.fpsLastTime = fpsTimeNow;
  }

  private getCamDist() {
    return Math.pow(this._zoomLevel, ZOOM_EXP) * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance;
  }

  private alt2zoom(alt: number): number {
    const distanceFromCenter = alt + RADIUS_OF_EARTH + 30;
    return Math.pow((distanceFromCenter - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance), 1 / ZOOM_EXP);
  }

  /**
   * @param val enable or disable the autoRotate (default: toggles the opposite of the current state) - true = enable, false = disable
   *
   * settingsManager.autoRotateSpeed will be set to 1 if it is currently 0
   */
  autoRotate(val?: boolean) {
    if (settingsManager.autoRotateSpeed === 0) settingsManager.autoRotateSpeed = 0.0075;

    if (typeof val == 'undefined') {
      this.isAutoRotate = !this.isAutoRotate;
      return;
    }
    this.isAutoRotate = val;
  }

  /**
   * @param val enable or disable the autopan (default: toggles the opposite of the current state) - true = enable, false = disable
   *
   * settingsManager.autoRotateSpeed will be set to 1 if it is currently 0
   */
  autoPan(val?: boolean) {
    if (settingsManager.autoPanSpeed.x === 0 && settingsManager.autoPanSpeed.x === 0) {
      settingsManager.autoPanSpeed.x === 1; // Can't autopan if speed is 0
    }
    if (typeof val == 'undefined') {
      this.isAutoPan = !this.isAutoPan;
      return;
    }
    this.isAutoPan = val;
  }

  /**
   *
   * @param zoom number between 0 and 1 (0 = center of earth, 1 = max zoom)
   *             or strings 'geo' or 'leo' to zoom to a specific orbit
   */
  changeZoom(zoom: string | number): void {
    if (zoom === 'geo') {
      this._zoomTarget = 0.82;
      return;
    }
    if (zoom === 'leo') {
      this._zoomTarget = 0.45;
      return;
    }
    if (typeof zoom !== 'number') throw new Error('Invalid Zoom Value');
    this._zoomTarget = zoom;
  }

  changeCameraType(orbitManager, drawManager, objectManager, sensorManager) {
    let curCam = this.cameraType.current;
    if (curCam === this.cameraType.Planetarium) {
      orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
    }

    curCam++;

    if (curCam == this.cameraType.FixedToSat && objectManager.selectedSat == -1) {
      curCam++;
    }

    if (curCam === this.cameraType.Planetarium && (!objectManager.isSensorManagerLoaded || !sensorManager.checkSensorSelected())) {
      curCam++;
    }

    if (curCam === this.cameraType.Satellite && objectManager.selectedSat === -1) {
      curCam++;
    }

    if (curCam === this.cameraType.Astronomy && (!objectManager.isSensorManagerLoaded || !sensorManager.checkSensorSelected())) {
      curCam++;
    }

    if (curCam === 7) {
      // 7 is a placeholder to reset camera type
      this.isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      drawManager.glInit();
      if (objectManager.selectedSat !== -1) {
        this.camZoomSnappedOnSat = true;
        curCam = this.cameraType.FixedToSat;
      } else {
        curCam = this.cameraType.Default;
      }
    }

    this.cameraType.set(curCam);
  }

  lookAtLatLon(lat: number, long: number, zoom?: string | number, date?: Date): void {
    // Setup some defaults if they aren't passed in
    zoom ??= 'leo';
    date ??= new Date();

    // Convert the lat/long to a position on the globe and then set the camera to look at that position
    this.changeZoom(zoom);
    this.camSnap(Camera.latToPitch(lat), Camera.longToYaw(long, date));
  }

  camSnap(pitch: number, yaw: number): void {
    // this.isPanReset = true
    this.camPitchTarget = pitch;
    this.camYawTarget = Camera.normalizeAngle(yaw);
    this.ecPitch = pitch;
    this.ecYaw = yaw;
    if (this.ecYaw < 0) this.ecYaw += TAU;
    this.isCamSnapMode = true;
  }

  snapToSat(sat) {
    /* this function runs every frame that a satellite is selected.
    However, the user might have broken out of the zoom snap or angle snap.
    If so, don't change those targets. */

    if (this.camAngleSnappedOnSat) {
      this.camSnapToSat.pos = sat.position;
      this.camSnapToSat.radius = Math.sqrt(this.camSnapToSat.pos.x ** 2 + this.camSnapToSat.pos.y ** 2);
      this.camSnapToSat.yaw = Math.atan2(this.camSnapToSat.pos.y, this.camSnapToSat.pos.x) + TAU / 4;
      this.camSnapToSat.pitch = Math.atan2(this.camSnapToSat.pos.z, this.camSnapToSat.radius);
      if (!this.camSnapToSat.pitch) {
        console.warn('Pitch Calculation Error');
        this.camSnapToSat.pitch = 0;
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }
      if (!this.camSnapToSat.yaw) {
        console.warn('Yaw Calculation Error');
        this.camSnapToSat.yaw = 0;
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }
      if (this.cameraType.current === this.cameraType.Planetarium) {
        // camSnap(-pitch, -yaw)
      } else {
        this.camSnap(this.camSnapToSat.pitch, this.camSnapToSat.yaw);
      }
    }

    if (this.camZoomSnappedOnSat) {
      if (!sat.static && sat.active) {
        // if this is a satellite not a missile
        this.camSnapToSat.altitude = sat.getAltitude();
      }
      if (this.camSnapToSat.altitude) {
        this.camSnapToSat.camDistTarget = this.camSnapToSat.altitude + RADIUS_OF_EARTH + settingsManager.camDistBuffer;
      } else {
        this.camSnapToSat.camDistTarget = RADIUS_OF_EARTH + settingsManager.camDistBuffer; // Stay out of the center of the earth. You will get stuck there.
        console.warn(`Zoom Calculation Error: ${this.camSnapToSat.altitude} -- ${this.camSnapToSat.camDistTarget}`);
        this.camZoomSnappedOnSat = false;
        this.camAngleSnappedOnSat = false;
      }

      this.camSnapToSat.camDistTarget = this.camSnapToSat.camDistTarget < settingsManager.minZoomDistance ? settingsManager.minZoomDistance + 10 : this.camSnapToSat.camDistTarget;

      this._zoomTarget = Math.pow((this.camSnapToSat.camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance), 1 / ZOOM_EXP);
      this.ecLastZoom = this._zoomTarget + 0.1;

      // Only Zoom in Once on Mobile
      if (settingsManager.isMobileModeEnabled) this.camZoomSnappedOnSat = false;
    }

    if (this.cameraType.current === this.cameraType.Planetarium) {
      this._zoomTarget = 0.01;
    }
  }

  fts2default() {
    this.cameraType.current = this.cameraType.current == this.cameraType.FixedToSat ? this.cameraType.Default : this.cameraType.current;
    if (this.cameraType.current == this.cameraType.Default || this.cameraType.current == this.cameraType.Offset) {
      this.camPitch = this.ecPitch;
      this.camYaw = this.ecYaw;
      this._zoomTarget = this.ecLastZoom; // Reset Zoom
    }
  }

  keyUpHandler(evt) {
    // Error Handling
    if (typeof evt.key == 'undefined') return;

    if (evt.key.toUpperCase() === 'A' && this.fpsSideSpeed === -settingsManager.fpsSideSpeed) {
      this.isFPSSideSpeedLock = false;
    }
    if (evt.key.toUpperCase() === 'D' && this.fpsSideSpeed === settingsManager.fpsSideSpeed) {
      this.isFPSSideSpeedLock = false;
    }
    if (evt.key.toUpperCase() === 'S' && this.fpsForwardSpeed === -settingsManager.fpsForwardSpeed) {
      this.isFPSForwardSpeedLock = false;
    }
    if (evt.key.toUpperCase() === 'W' && this.fpsForwardSpeed === settingsManager.fpsForwardSpeed) {
      this.isFPSForwardSpeedLock = false;
    }
    if (evt.key.toUpperCase() === 'Q') {
      if (this.fpsVertSpeed === -settingsManager.fpsVertSpeed) this.isFPSVertSpeedLock = false;
      this.fpsRotateRate = 0;
    }
    if (evt.key.toUpperCase() === 'E') {
      if (this.fpsVertSpeed === settingsManager.fpsVertSpeed) this.isFPSVertSpeedLock = false;
      this.fpsRotateRate = 0;
    }
    if (evt.key.toUpperCase() === 'J' || evt.key.toUpperCase() === 'L') {
      if (this.cameraType.current === this.cameraType.Astronomy) {
        this.fpsRotateRate = 0;
      } else {
        this.fpsYawRate = 0;
      }
    }
    if (evt.key.toUpperCase() === 'I' || evt.key.toUpperCase() === 'K') {
      this.fpsPitchRate = 0;
    }

    if (evt.key.toUpperCase() === 'SHIFT') {
      this.isShiftPressed = false;
      this.fpsRun = 1;
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
      this.speedModifier = 1;
      if (!this.isFPSForwardSpeedLock) this.fpsForwardSpeed = 0;
      if (!this.isFPSSideSpeedLock) this.fpsSideSpeed = 0;
      if (!this.isFPSVertSpeedLock) this.fpsVertSpeed = 0;
    }
    // Applies to _keyDownHandler as well
    if (evt.key === 'ShiftRight') {
      this.isShiftPressed = false;
      this.fpsRun = 1;
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
      this.speedModifier = 1;
    }
  }

  keyDownHandler(evt) {
    // Error Handling
    if (typeof evt.key == 'undefined') return;

    if (evt.key.toUpperCase() === 'SHIFT') {
      this.isShiftPressed = true;
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsRun = 0.05;
      }
      this.speedModifier = 8;
      settingsManager.cameraMovementSpeed = 0.003 / 8;
      settingsManager.cameraMovementSpeedMin = 0.005 / 8;
    }
    if (evt.key === 'ShiftRight') {
      this.isShiftPressed = true;
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsRun = 3;
      }
    }
    if (evt.key.toUpperCase() === 'W') {
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsForwardSpeed = settingsManager.fpsForwardSpeed;
        this.isFPSForwardSpeedLock = true;
      }
    }
    if (evt.key.toUpperCase() === 'A') {
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsSideSpeed = -settingsManager.fpsSideSpeed;
        this.isFPSSideSpeedLock = true;
      }
    }
    if (evt.key.toUpperCase() === 'S') {
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
        this.isFPSForwardSpeedLock = true;
      }
    }
    if (evt.key.toUpperCase() === 'D') {
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsSideSpeed = settingsManager.fpsSideSpeed;
        this.isFPSSideSpeedLock = true;
      }
    }
    if (evt.key.toUpperCase() === 'I') {
      if (this.cameraType.current === this.cameraType.Fps || this.cameraType.current === this.cameraType.Satellite || this.cameraType.current === this.cameraType.Astronomy) {
        this.fpsPitchRate = settingsManager.fpsPitchRate / this.speedModifier;
      }
    }
    if (evt.key.toUpperCase() === 'K') {
      if (this.cameraType.current === this.cameraType.Fps || this.cameraType.current === this.cameraType.Satellite || this.cameraType.current === this.cameraType.Astronomy) {
        this.fpsPitchRate = -settingsManager.fpsPitchRate / this.speedModifier;
      }
    }
    if (evt.key.toUpperCase() === 'J') {
      if (this.cameraType.current === this.cameraType.Fps || this.cameraType.current === this.cameraType.Satellite) {
        this.fpsYawRate = -settingsManager.fpsYawRate / this.speedModifier;
      }
      if (this.cameraType.current === this.cameraType.Astronomy) {
        this.fpsRotateRate = settingsManager.fpsRotateRate / this.speedModifier;
      }
    }
    if (evt.key.toUpperCase() === 'L') {
      if (this.cameraType.current === this.cameraType.Fps || this.cameraType.current === this.cameraType.Satellite) {
        this.fpsYawRate = settingsManager.fpsYawRate / this.speedModifier;
      }
      if (this.cameraType.current === this.cameraType.Astronomy) {
        this.fpsRotateRate = -settingsManager.fpsRotateRate / this.speedModifier;
      }
    }
    if (evt.key.toUpperCase() === 'Q') {
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsVertSpeed = -settingsManager.fpsVertSpeed;
        this.isFPSVertSpeedLock = true;
      }
      if (this.cameraType.current === this.cameraType.Satellite || this.cameraType.current === this.cameraType.Astronomy) {
        this.fpsRotateRate = settingsManager.fpsRotateRate / this.speedModifier;
      }
    }
    if (evt.key.toUpperCase() === 'E') {
      if (this.cameraType.current === this.cameraType.Fps) {
        this.fpsVertSpeed = settingsManager.fpsVertSpeed;
        this.isFPSVertSpeedLock = true;
      }
      if (this.cameraType.current === this.cameraType.Satellite || this.cameraType.current === this.cameraType.Astronomy) {
        this.fpsRotateRate = -settingsManager.fpsRotateRate / this.speedModifier;
      }
    }
  }

  calculate(dt: number, isSlowDown: boolean) {
    if (this.isScreenPan || this.isWorldPan || this.isPanReset) {
      // If user is actively moving
      if (this.isScreenPan || this.isWorldPan) {
        this.camPitchSpeed = 0;
        this.camYawSpeed = 0;
        this.panDif.x = this.screenDragPoint[0] - this.mouseX;
        this.panDif.y = this.screenDragPoint[1] - this.mouseY;
        this.panDif.z = this.screenDragPoint[1] - this.mouseY;

        // Slow down the panning if a satellite is selected
        if (isSlowDown) {
          this.panDif.x /= 30;
          this.panDif.y /= 30;
          this.panDif.z /= 30;
        }

        this.panTarget.x = this.panStartPosition.x + this.panDif.x * this.panMovementSpeed * this._zoomLevel;
        if (this.isWorldPan) {
          this.panTarget.y = this.panStartPosition.y + this.panDif.y * this.panMovementSpeed * this._zoomLevel;
        }
        if (this.isScreenPan) {
          this.panTarget.z = this.panStartPosition.z + this.panDif.z * this.panMovementSpeed;
        }
      }

      if (this.isPanReset) {
        this.panTarget.x = 0;
        this.panTarget.y = 0;
        this.panTarget.z = 0;
        this.panDif.x = -this.panCurrent.x;
        this.panDif.y = this.panCurrent.y;
        this.panDif.z = this.panCurrent.z;
      }

      const panResetModifier = this.isPanReset ? 0.5 : 1;

      // X is X no matter what
      this.panSpeed.x = (this.panCurrent.x - this.panTarget.x) * this.panMovementSpeed * this._zoomLevel;
      this.panSpeed.x -= this.panSpeed.x * dt * this.panMovementSpeed * this._zoomLevel;
      this.panCurrent.x += panResetModifier * this.panMovementSpeed * this.panDif.x;
      // If we are moving like an FPS then Y and Z are based on the angle of the camera
      if (this.isWorldPan) {
        this.fpsPos[1] -= Math.cos(this.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed * this.panDif.y;
        this.fpsPos[2] += Math.sin(this.localRotateCurrent.pitch) * panResetModifier * this.panMovementSpeed * this.panDif.y;
        this.fpsPos[1] -= Math.sin(-this.localRotateCurrent.yaw) * panResetModifier * this.panMovementSpeed * this.panDif.x;
      }
      // If we are moving the screen then Z is always up and Y is not relevant
      if (this.isScreenPan || this.isPanReset) {
        this.panSpeed.z = (this.panCurrent.z - this.panTarget.z) * this.panMovementSpeed * this._zoomLevel;
        this.panSpeed.z -= this.panSpeed.z * dt * this.panMovementSpeed * this._zoomLevel;
        this.panCurrent.z -= panResetModifier * this.panMovementSpeed * this.panDif.z;
      }

      if (this.isPanReset) {
        this.fpsPos[0] = this.fpsPos[0] - this.fpsPos[0] / 25;
        this.fpsPos[1] = this.fpsPos[1] - this.fpsPos[1] / 25;
        this.fpsPos[2] = this.fpsPos[2] - this.fpsPos[2] / 25;

        if (this.panCurrent.x > -0.5 && this.panCurrent.x < 0.5) this.panCurrent.x = 0;
        if (this.panCurrent.y > -0.5 && this.panCurrent.y < 0.5) this.panCurrent.y = 0;
        if (this.panCurrent.z > -0.5 && this.panCurrent.z < 0.5) this.panCurrent.z = 0;
        if (this.fpsPos[0] > -0.5 && this.fpsPos[0] < 0.5) this.fpsPos[0] = 0;
        if (this.fpsPos[1] > -0.5 && this.fpsPos[1] < 0.5) this.fpsPos[1] = 0;
        if (this.fpsPos[2] > -0.5 && this.fpsPos[2] < 0.5) this.fpsPos[2] = 0;

        if (this.panCurrent.x == 0 && this.panCurrent.y == 0 && this.panCurrent.z == 0 && this.fpsPos[0] == 0 && this.fpsPos[1] == 0 && this.fpsPos[2] == 0) {
          this.isPanReset = false;
        }
      }
    }
    if (this.isLocalRotateRoll || this.isLocalRotateYaw || this.isLocalRotateReset || this.isLocalRotateOverride) {
      this.localRotateTarget.pitch = Camera.normalizeAngle(this.localRotateTarget.pitch);
      this.localRotateTarget.yaw = Camera.normalizeAngle(this.localRotateTarget.yaw);
      this.localRotateTarget.roll = Camera.normalizeAngle(this.localRotateTarget.roll);
      this.localRotateCurrent.pitch = Camera.normalizeAngle(this.localRotateCurrent.pitch);
      this.localRotateCurrent.yaw = Camera.normalizeAngle(this.localRotateCurrent.yaw);
      this.localRotateCurrent.roll = Camera.normalizeAngle(this.localRotateCurrent.roll);

      // If user is actively moving
      if (this.isLocalRotateRoll || this.isLocalRotateYaw) {
        this.localRotateDif.pitch = this.screenDragPoint[1] - this.mouseY;
        this.localRotateTarget.pitch = this.localRotateStartPosition.pitch + this.localRotateDif.pitch * -settingsManager.cameraMovementSpeed;
        this.localRotateSpeed.pitch = Camera.normalizeAngle(this.localRotateCurrent.pitch - this.localRotateTarget.pitch) * -settingsManager.cameraMovementSpeed;

        if (this.isLocalRotateRoll) {
          this.localRotateDif.roll = this.screenDragPoint[0] - this.mouseX;
          this.localRotateTarget.roll = this.localRotateStartPosition.roll + this.localRotateDif.roll * settingsManager.cameraMovementSpeed;
          this.localRotateSpeed.roll = Camera.normalizeAngle(this.localRotateCurrent.roll - this.localRotateTarget.roll) * -settingsManager.cameraMovementSpeed;
        }
        if (this.isLocalRotateYaw) {
          this.localRotateDif.yaw = this.screenDragPoint[0] - this.mouseX;
          this.localRotateTarget.yaw = this.localRotateStartPosition.yaw + this.localRotateDif.yaw * settingsManager.cameraMovementSpeed;
          this.localRotateSpeed.yaw = Camera.normalizeAngle(this.localRotateCurrent.yaw - this.localRotateTarget.yaw) * -settingsManager.cameraMovementSpeed;
        }
      }

      if (this.isLocalRotateOverride) {
        this.localRotateTarget.pitch = this.localRotateStartPosition.pitch + this.localRotateDif.pitch * -settingsManager.cameraMovementSpeed;
        this.localRotateSpeed.pitch = Camera.normalizeAngle(this.localRotateCurrent.pitch - this.localRotateTarget.pitch) * -settingsManager.cameraMovementSpeed;
        this.localRotateTarget.yaw = this.localRotateStartPosition.yaw + this.localRotateDif.yaw * settingsManager.cameraMovementSpeed;
        this.localRotateSpeed.yaw = Camera.normalizeAngle(this.localRotateCurrent.yaw - this.localRotateTarget.yaw) * -settingsManager.cameraMovementSpeed;
      }

      if (this.isLocalRotateReset) {
        this.localRotateTarget.pitch = 0;
        this.localRotateTarget.roll = 0;
        this.localRotateTarget.yaw = 0;
        this.localRotateDif.pitch = -this.localRotateCurrent.pitch;
        this.localRotateDif.roll = -this.localRotateCurrent.roll;
        this.localRotateDif.yaw = -this.localRotateCurrent.yaw;
      }

      const resetModifier = this.isLocalRotateReset ? 750 : 1;

      this.localRotateSpeed.pitch -= this.localRotateSpeed.pitch * dt * this.localRotateMovementSpeed;
      this.localRotateCurrent.pitch += resetModifier * this.localRotateMovementSpeed * this.localRotateDif.pitch;

      if (this.isLocalRotateRoll || this.isLocalRotateReset) {
        this.localRotateSpeed.roll -= this.localRotateSpeed.roll * dt * this.localRotateMovementSpeed;
        this.localRotateCurrent.roll += resetModifier * this.localRotateMovementSpeed * this.localRotateDif.roll;
      }

      if (this.isLocalRotateYaw || this.isLocalRotateReset || this.isLocalRotateOverride) {
        this.localRotateSpeed.yaw -= this.localRotateSpeed.yaw * dt * this.localRotateMovementSpeed;
        this.localRotateCurrent.yaw += resetModifier * this.localRotateMovementSpeed * this.localRotateDif.yaw;
      }

      if (this.isLocalRotateReset) {
        if (this.localRotateCurrent.pitch > -0.001 && this.localRotateCurrent.pitch < 0.001) this.localRotateCurrent.pitch = 0;
        if (this.localRotateCurrent.roll > -0.001 && this.localRotateCurrent.roll < 0.001) this.localRotateCurrent.roll = 0;
        if (this.localRotateCurrent.yaw > -0.001 && this.localRotateCurrent.yaw < 0.001) this.localRotateCurrent.yaw = 0;
        if (this.localRotateCurrent.pitch == 0 && this.localRotateCurrent.roll == 0 && this.localRotateCurrent.yaw == 0) {
          this.isLocalRotateReset = false;
        }
      }
    }
    if ((this.isDragging && !settingsManager.isMobileModeEnabled) || (this.isDragging && settingsManager.isMobileModeEnabled && (this.mouseX !== 0 || this.mouseY !== 0))) {
      // Disable Raycasting for Performance
      // dragTarget = getEarthScreenPoint(mouseX, mouseY)
      // if (Number.isNaN(dragTarget[0]) || Number.isNaN(dragTarget[1]) || Number.isNaN(dragTarget[2]) ||
      // Number.isNaN(dragPoint[0]) || Number.isNaN(dragPoint[1]) || Number.isNaN(dragPoint[2]) ||
      if (!this.isRayCastingEarth || this.cameraType.current === this.cameraType.Fps || this.cameraType.current === this.cameraType.Satellite || this.cameraType.current === this.cameraType.Astronomy || settingsManager.isMobileModeEnabled) {
        // random screen drag
        const xDif = this.screenDragPoint[0] - this.mouseX;
        const yDif = this.screenDragPoint[1] - this.mouseY;
        const yawTarget = this.dragStartYaw + xDif * settingsManager.cameraMovementSpeed;
        const pitchTarget = this.dragStartPitch + yDif * -settingsManager.cameraMovementSpeed;
        this.camPitchSpeed = Camera.normalizeAngle(this.camPitch - pitchTarget) * -settingsManager.cameraMovementSpeed;
        this.camYawSpeed = Camera.normalizeAngle(this.camYaw - yawTarget) * -settingsManager.cameraMovementSpeed;
        // NOTE: This could be used for motion blur
        // this.camPitchAccel = this.camPitchSpeedLast - this.camPitchSpeed;
        // this.camYawAccel = this.camYawSpeedLast - this.camYawSpeed;
        // this.camPitchSpeedLast = this.camPitchSpeed * 1;
        // this.camYawSpeedLast = this.camYawSpeed * 1;
      } else {
        // This is how we handle a raycast that hit the earth to make it feel like you are grabbing onto the surface
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
          // yawDif = Camera.normalizeAngle(dragPointLon - dragTargetLon);
          // this.camPitchSpeed = pitchDif * settingsManager.cameraMovementSpeed;
          // this.camYawSpeed = yawDif * settingsManager.cameraMovementSpeed;
        */
      }
      this.isCamSnapMode = false;
    } else {
      // This block of code is what causes the momentum effect when moving the camera
      // Most applications like Goolge Earth or STK do not have this effect as pronounced
      // It makes KeepTrack feel more like a game and less like a toolkit
      this.camPitchSpeed -= this.camPitchSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor; // decay speeds when globe is "thrown"
      this.camYawSpeed -= this.camYawSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor;
      // NOTE: This could be used for motion blur
      // this.camPitchAccel *= 0.95;
      // this.camYawAccel *= 0.95;
    }

    if (this.ftsRotateReset) {
      if (this.cameraType.current !== this.cameraType.FixedToSat) {
        this.ftsRotateReset = false;
        this.ftsPitch = 0;
        this.camPitchSpeed = 0;
      }

      this.camPitchSpeed = settingsManager.cameraMovementSpeed * 0.2;
      this.camYawSpeed = settingsManager.cameraMovementSpeed * 0.2;

      if (this.camPitch >= this.ecPitch - 0.05 && this.camPitch <= this.ecPitch + 0.05) {
        this.camPitch = this.ecPitch;
        this.camPitchSpeed = 0;
      }
      if (this.camYaw >= this.ecYaw - 0.05 && this.camYaw <= this.ecYaw + 0.05) {
        this.camYaw = this.ecYaw;
        this.camYawSpeed = 0;
      }

      if (this.camYaw == this.ecYaw && this.camPitch == this.ecPitch) {
        this.ftsRotateReset = false;
      }

      if (this.camPitch > this.ecPitch) {
        this.camPitch -= this.camPitchSpeed * dt * settingsManager.cameraDecayFactor;
      } else if (this.camPitch < this.ecPitch) {
        this.camPitch += this.camPitchSpeed * dt * settingsManager.cameraDecayFactor;
      }

      console.log(`${this.camYaw} - ${this.ecYaw}`);

      if (this.camYaw > this.ecYaw) {
        this.camYaw -= this.camYawSpeed * dt * settingsManager.cameraDecayFactor;
      } else if (this.camYaw < this.ecYaw) {
        this.camYaw += this.camYawSpeed * dt * settingsManager.cameraDecayFactor;
      }
    }

    this.camRotateSpeed -= this.camRotateSpeed * dt * settingsManager.cameraMovementSpeed;

    if (this.cameraType.current === this.cameraType.Fps || this.cameraType.current === this.cameraType.Satellite || this.cameraType.current === this.cameraType.Astronomy) {
      this.fpsPitch -= 20 * this.camPitchSpeed * dt;
      this.fpsYaw -= 20 * this.camYawSpeed * dt;
      this.fpsRotate -= 20 * this.camRotateSpeed * dt;

      // Prevent Over Rotation
      if (this.fpsPitch > 90) this.fpsPitch = 90;
      if (this.fpsPitch < -90) this.fpsPitch = -90;
      if (this.fpsRotate > 360) this.fpsRotate -= 360;
      if (this.fpsRotate < 0) this.fpsRotate += 360;
      if (this.fpsYaw > 360) this.fpsYaw -= 360;
      if (this.fpsYaw < 0) this.fpsYaw += 360;
    } else {
      this.camPitch += this.camPitchSpeed * dt;
      this.camYaw += this.camYawSpeed * dt;
      this.fpsRotate += this.camRotateSpeed * dt;
    }

    if (this.isAutoRotate) {
      this.camYaw -= settingsManager.autoRotateSpeed * dt;
    }

    if (this.isAutoPan) {
      this.panCurrent.z -= settingsManager.autoPanSpeed.y * dt;
      this.panCurrent.x -= settingsManager.autoPanSpeed.x * dt;
    }

    // Zoom Changing
    // This code might be better if applied directly to the shader versus a multiplier effect
    if (this._zoomLevel !== this._zoomTarget) {
      if (this._zoomLevel > settingsManager.satShader.largeObjectMaxZoom) {
        settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 1.5;
      } else if (this._zoomLevel < settingsManager.satShader.largeObjectMinZoom) {
        settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize / 3;
      } else {
        settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize;
      }
    }

    if (this.isCamSnapMode) {
      this.camPitch += (this.camPitchTarget - this.camPitch) * this.chaseSpeed * dt;

      this.yawErr = Camera.normalizeAngle(this.camYawTarget - this.camYaw);
      this.camYaw += this.yawErr * this.chaseSpeed * dt;

      this._zoomLevel = this._zoomLevel + (this._zoomTarget - this._zoomLevel) * dt * 0.0025;
    } else {
      if (this.isZoomIn) {
        this._zoomLevel -= dt * settingsManager.zoomSpeed * Math.abs(this._zoomTarget - this._zoomLevel);
      } else {
        this._zoomLevel += dt * settingsManager.zoomSpeed * Math.abs(this._zoomTarget - this._zoomLevel);
      }

      if ((this._zoomLevel > this._zoomTarget && !this.isZoomIn) || (this._zoomLevel < this._zoomTarget && this.isZoomIn)) {
        this._zoomLevel = this._zoomTarget;
      }
    }

    // Clamp Zoom between 0 and 1
    this._zoomLevel = this._zoomLevel > 1 ? 1 : this._zoomLevel;
    this._zoomLevel = this._zoomLevel < 0 ? 0 : this._zoomLevel;

    if (this.cameraType.current == this.cameraType.FixedToSat) {
      this.camPitch = Camera.normalizeAngle(this.camPitch);
    } else {
      if (this.camPitch > TAU / 4) this.camPitch = TAU / 4;
      if (this.camPitch < -TAU / 4) this.camPitch = -TAU / 4;
    }
    if (this.camYaw > TAU) this.camYaw -= TAU;
    if (this.camYaw < 0) this.camYaw += TAU;

    if (this.cameraType.current == this.cameraType.Default || this.cameraType.current == this.cameraType.Offset) {
      this.ecPitch = this.camPitch;
      this.ecYaw = this.camYaw;
      if (this.ecYaw < 0) this.ecYaw += TAU;
    } else if (this.cameraType.current == this.cameraType.FixedToSat) {
      this.ftsPitch = this.camPitch;
      this.ftsYaw = this.camYaw;
    }

    if (this.cameraType.current === this.cameraType.Fps || this.cameraType.current === this.cameraType.Satellite || this.cameraType.current === this.cameraType.Astronomy) {
      this.fpsMovement();
    }
  }

  update(target, sensorPos) {
    this.camMatrix = this.camMatrixEmpty;
    let normUp = glm.vec3.create();
    let normForward = glm.vec3.create();
    let normLeft = glm.vec3.create();

    {
      /*
       * For FPS style movement rotate the camera and then translate it
       * for traditional view, move the camera and then rotate it
       */
      if (Number.isNaN(this.camPitch) || Number.isNaN(this.camYaw) || Number.isNaN(this.camPitchTarget) || Number.isNaN(this.camYawTarget) || Number.isNaN(this._zoomLevel) || Number.isNaN(this._zoomTarget)) {
        try {
          console.group('Camera Math Error');
          console.log(`camPitch: ${this.camPitch}`);
          console.log(`camYaw: ${this.camYaw}`);
          console.log(`camPitchTarget: ${this.camPitchTarget}`);
          console.log(`camYawTarget: ${this.camYawTarget}`);
          console.log(`zoomLevel: ${this._zoomLevel}`);
          console.log(`_zoomTarget: ${this._zoomTarget}`);
          console.log(`settingsManager.cameraMovementSpeed: ${settingsManager.cameraMovementSpeed}`);
          console.groupEnd();
        } catch (e) {
          console.debug('Camera Math Error');
        }
        this.camPitch = 0.5;
        this.camYaw = 0.5;
        this._zoomLevel = 0.5;
        this.camPitchTarget = 0;
        this.camYawTarget = 0;
        this._zoomTarget = 0.5;
      }

      if (typeof sensorPos == 'undefined' && (this.cameraType.current == this.cameraType.Planetarium || this.cameraType.current == this.cameraType.Astronomy)) {
        this.cameraType.current = this.cameraType.Default;
        console.debug('A sensor should be selected first if camera mode is allowed to be planetarium or astronmy.');
      }

      glm.mat4.identity(this.camMatrix);

      // Workaround for bug with selecting stars
      if (typeof target === 'undefined' && this.cameraType.current == this.cameraType.FixedToSat) {
        this.cameraType.current = this.cameraType.Default;
      }

      // Ensure we don't zoom in past our satellite
      if (this.cameraType.current == this.cameraType.FixedToSat) {
        if (target.id === -1) {
          this.cameraType.current = this.cameraType.Default;
        } else {
          if (typeof target.getAltitude !== 'undefined' && this.getCamDist() < target.getAltitude() + RADIUS_OF_EARTH + 30) {
            this._zoomTarget = this.alt2zoom(target.getAltitude());
            this._zoomLevel = this._zoomTarget;
          }
        }
      }      

      switch (this.cameraType.current) {
        case this.cameraType.Default: // pivot around the earth with earth in the center
          glm.mat4.rotateX(this.camMatrix, this.camMatrix, -this.localRotateCurrent.pitch);
          glm.mat4.rotateY(this.camMatrix, this.camMatrix, -this.localRotateCurrent.roll);
          glm.mat4.rotateZ(this.camMatrix, this.camMatrix, -this.localRotateCurrent.yaw);
          glm.mat4.translate(this.camMatrix, this.camMatrix, [this.panCurrent.x, this.panCurrent.y, this.panCurrent.z]);
          glm.mat4.translate(this.camMatrix, this.camMatrix, [this.fpsPos[0], this.fpsPos[1], -this.fpsPos[2]]);
          glm.mat4.translate(this.camMatrix, this.camMatrix, [0, this.getCamDist(), 0]);
          glm.mat4.rotateX(this.camMatrix, this.camMatrix, this.ecPitch);
          glm.mat4.rotateZ(this.camMatrix, this.camMatrix, -this.ecYaw);
          break;
        case this.cameraType.Offset: // pivot around the earth with earth offset to the bottom right
          glm.mat4.rotateX(this.camMatrix, this.camMatrix, -this.localRotateCurrent.pitch);
          glm.mat4.rotateY(this.camMatrix, this.camMatrix, -this.localRotateCurrent.roll);
          glm.mat4.rotateZ(this.camMatrix, this.camMatrix, -this.localRotateCurrent.yaw);

          glm.mat4.translate(this.camMatrix, this.camMatrix, [settingsManager.offsetCameraModeX, this.getCamDist(), settingsManager.offsetCameraModeZ]);
          glm.mat4.rotateX(this.camMatrix, this.camMatrix, this.ecPitch);
          glm.mat4.rotateZ(this.camMatrix, this.camMatrix, -this.ecYaw);
          break;
        case this.cameraType.FixedToSat: // Pivot around the satellite          
          glm.mat4.rotateX(this.camMatrix, this.camMatrix, -this.localRotateCurrent.pitch);
          glm.mat4.rotateY(this.camMatrix, this.camMatrix, -this.localRotateCurrent.roll);
          glm.mat4.rotateZ(this.camMatrix, this.camMatrix, -this.localRotateCurrent.yaw);

          glm.mat4.translate(this.camMatrix, this.camMatrix, [0, this.getCamDist() - RADIUS_OF_EARTH - target.getAltitude(), 0]);

          glm.mat4.rotateX(this.camMatrix, this.camMatrix, this.ftsPitch);
          glm.mat4.rotateZ(this.camMatrix, this.camMatrix, -this.ftsYaw);

          const targetPosition = glm.vec3.fromValues(-target.position.x, -target.position.y, -target.position.z);
          glm.mat4.translate(this.camMatrix, this.camMatrix, targetPosition);
          break;
        case this.cameraType.Fps: // FPS style movement
          glm.mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsPitch * DEG2RAD, [1, 0, 0]);
          glm.mat4.rotate(this.camMatrix, this.camMatrix, this.fpsYaw * DEG2RAD, [0, 0, 1]);
          glm.mat4.translate(this.camMatrix, this.camMatrix, [this.fpsPos[0], this.fpsPos[1], -this.fpsPos[2]]);
          break;
        case this.cameraType.Planetarium: {
          // Pitch is the opposite of the angle to the latitude
          // Yaw is 90 degrees to the left of the angle to the longitude
          this.fpsPitch = -1 * sensorPos.lat * DEG2RAD;
          this.fpsRotate = (90 - sensorPos.lon) * DEG2RAD - sensorPos.gmst;
          glm.mat4.rotate(this.camMatrix, this.camMatrix, this.fpsPitch, [1, 0, 0]);
          glm.mat4.rotate(this.camMatrix, this.camMatrix, this.fpsRotate, [0, 0, 1]);

          glm.mat4.translate(this.camMatrix, this.camMatrix, [-sensorPos.x, -sensorPos.y, -sensorPos.z]);
          break;
        }
        case this.cameraType.Satellite: {
          const targetPosition = glm.vec3.fromValues(-target.position.x, -target.position.y, -target.position.z);
          glm.mat4.translate(this.camMatrix, this.camMatrix, targetPosition);
          glm.vec3.normalize(normUp, targetPosition);
          glm.vec3.normalize(normForward, [target.velocity.x, target.velocity.y, target.velocity.z]);
          glm.vec3.transformQuat(normLeft, normUp, glm.quat.fromValues(normForward[0], normForward[1], normForward[2], 90 * DEG2RAD));
          const targetNextPosition = glm.vec3.fromValues(target.position.x + target.velocity.x, target.position.y + target.velocity.y, target.position.z + target.velocity.z);
          glm.mat4.lookAt(this.camMatrix, targetNextPosition, targetPosition, normUp);

          glm.mat4.translate(this.camMatrix, this.camMatrix, [target.position.x, target.position.y, target.position.z]);

          glm.mat4.rotate(this.camMatrix, this.camMatrix, this.fpsPitch * DEG2RAD, normLeft);
          glm.mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsYaw * DEG2RAD, normUp);

          glm.mat4.translate(this.camMatrix, this.camMatrix, targetPosition);
          break;
        }
        case this.cameraType.Astronomy: {
          // Pitch is the opposite of the angle to the latitude
          // Yaw is 90 degrees to the left of the angle to the longitude
          this.fpsPitch = -1 * sensorPos.lat * DEG2RAD;

          let sensorPosU = glm.vec3.fromValues(-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01);
          this.fpsPos[0] = sensorPos.x;
          this.fpsPos[1] = sensorPos.y;
          this.fpsPos[2] = sensorPos.z;

          glm.mat4.rotate(this.camMatrix, this.camMatrix, this.fpsPitch + -this.fpsPitch * DEG2RAD, [1, 0, 0]);
          glm.mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsRotate * DEG2RAD, [0, 1, 0]);
          glm.vec3.normalize(normUp, sensorPosU);
          glm.mat4.rotate(this.camMatrix, this.camMatrix, -this.fpsYaw * DEG2RAD, normUp);

          glm.mat4.translate(this.camMatrix, this.camMatrix, [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01]);
          break;
        }
      }

      // Try to stay out of the earth
      if (this.cameraType.current === this.cameraType.Default || this.cameraType.current === this.cameraType.Offset || this.cameraType.current === this.cameraType.FixedToSat) {
        if (this.getDistFromEarth() < RADIUS_OF_EARTH + 30) {
          this._zoomTarget = this._zoomLevel + 0.01;
        }
      }
    }
  }

  /* For RayCasting */
  getCamPos(): glm.vec3 {
    const position = glm.vec3.create();
    glm.vec3.transformMat4(position, position, this.camMatrix);

    return position;
  }

  getDistFromEarth(): number {
    const position = this.getCamPos();
    return Math.sqrt(position[0]**2 + position[1]**2 + position[2]**2);    
  }

  /**
   * This function is used to get the camera's forward vector in the world
   * coordinate system. It is returned in a format readable by shaders.
   *
   * @returns {vec3} The camera's forward vector - this is NOT normalized
   */
  getForwardVector(): glm.vec3 {
    const inverted = glm.mat4.create();
    const forward = glm.vec3.create();

    glm.mat4.invert(inverted, this.camMatrix);
    glm.vec3.transformMat4(forward, forward, inverted);

    return forward;
  }

  earthHitTest(gl, dotsManager, x: number, y: number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
    gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManager.pickReadPixelBuffer);
    this.isRayCastingEarth = dotsManager.pickReadPixelBuffer[0] === 0 && dotsManager.pickReadPixelBuffer[1] === 0 && dotsManager.pickReadPixelBuffer[2] === 0;
  }
}
