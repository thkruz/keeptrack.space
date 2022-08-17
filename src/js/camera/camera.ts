/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
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

import { DEG2RAD, RADIUS_OF_EARTH, TAU, ZOOM_EXP } from '@app/js/lib/constants';
import * as glm from 'gl-matrix';
import { keepTrackApi } from '../api/keepTrackApi';
import { Camera, CameraType, DotsManager, DrawManager, ObjectManager, OrbitManager, SatObject, SensorManager, ZoomValue } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { keyDownHandler, keyUpHandler } from './keyHandler';
import { alt2zoom, lat2pitch, lon2yaw, normalizeAngle } from './transforms';

/* Private Methods */
export const resetFpsPos = (): void => {
  camera.fpsPitch = 0;
  camera.fpsYaw = 0;
  camera.fpsPos[0] = 0;

  // Move out from the center of the Earth in FPS Mode
  if (camera.cameraType.current == 3) {
    camera.fpsPos[1] = 25000;
  } else {
    camera.fpsPos[1] = 0;
  }
  camera.fpsPos[2] = 0;
};

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const fpsMovement = (): void => { // NOSONAR
  const fpsTimeNow = Date.now();
  if (camera.fpsLastTime !== 0) {
    const fpsElapsed = fpsTimeNow - camera.fpsLastTime;

    if (camera.isFPSForwardSpeedLock && camera.fpsForwardSpeed < 0) {
      camera.fpsForwardSpeed = Math.max(camera.fpsForwardSpeed + Math.min(camera.fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsForwardSpeed);
    } else if (camera.isFPSForwardSpeedLock && camera.fpsForwardSpeed > 0) {
      camera.fpsForwardSpeed = Math.min(camera.fpsForwardSpeed + Math.max(camera.fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsForwardSpeed);
    }

    if (camera.isFPSSideSpeedLock && camera.fpsSideSpeed < 0) {
      camera.fpsSideSpeed = Math.max(camera.fpsSideSpeed + Math.min(camera.fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsSideSpeed);
    } else if (camera.isFPSSideSpeedLock && camera.fpsSideSpeed > 0) {
      camera.fpsSideSpeed = Math.min(camera.fpsSideSpeed + Math.max(camera.fpsSideSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsSideSpeed);
    }

    if (camera.isFPSVertSpeedLock && camera.fpsVertSpeed < 0) {
      camera.fpsVertSpeed = Math.max(camera.fpsVertSpeed + Math.min(camera.fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsVertSpeed);
    } else if (camera.isFPSVertSpeedLock && camera.fpsVertSpeed > 0) {
      camera.fpsVertSpeed = Math.min(camera.fpsVertSpeed + Math.max(camera.fpsVertSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsVertSpeed);
    }

    if (camera.cameraType.Fps) {
      if (camera.fpsForwardSpeed !== 0) {
        camera.fpsPos[0] -= Math.sin(camera.fpsYaw * DEG2RAD) * camera.fpsForwardSpeed * camera.fpsRun * fpsElapsed;
        camera.fpsPos[1] -= Math.cos(camera.fpsYaw * DEG2RAD) * camera.fpsForwardSpeed * camera.fpsRun * fpsElapsed;
        camera.fpsPos[2] += Math.sin(camera.fpsPitch * DEG2RAD) * camera.fpsForwardSpeed * camera.fpsRun * fpsElapsed;
      }
      if (camera.fpsVertSpeed !== 0) {
        camera.fpsPos[2] -= camera.fpsVertSpeed * camera.fpsRun * fpsElapsed;
      }
      if (camera.fpsSideSpeed !== 0) {
        camera.fpsPos[0] -= Math.cos(-camera.fpsYaw * DEG2RAD) * camera.fpsSideSpeed * camera.fpsRun * fpsElapsed;
        camera.fpsPos[1] -= Math.sin(-camera.fpsYaw * DEG2RAD) * camera.fpsSideSpeed * camera.fpsRun * fpsElapsed;
      }
    }

    if (!camera.isFPSForwardSpeedLock) camera.fpsForwardSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
    if (!camera.isFPSSideSpeedLock) camera.fpsSideSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
    if (!camera.isFPSVertSpeedLock) camera.fpsVertSpeed *= Math.min(0.98 * fpsElapsed, 0.98);

    if (camera.fpsForwardSpeed < 0.01 && camera.fpsForwardSpeed > -0.01) camera.fpsForwardSpeed = 0;
    if (camera.fpsSideSpeed < 0.01 && camera.fpsSideSpeed > -0.01) camera.fpsSideSpeed = 0;
    if (camera.fpsVertSpeed < 0.01 && camera.fpsVertSpeed > -0.01) camera.fpsVertSpeed = 0;

    camera.fpsPitch += camera.fpsPitchRate * fpsElapsed;
    camera.fpsRotate += camera.fpsRotateRate * fpsElapsed;
    camera.fpsYaw += camera.fpsYawRate * fpsElapsed;
  }
  camera.fpsLastTime = fpsTimeNow;
};

export const getCamDist = (): number =>
  Math.pow(camera._zoomLevel, ZOOM_EXP) * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance;

export const autoRotate = (val?: boolean): void => {
  if (settingsManager.autoRotateSpeed === 0) settingsManager.autoRotateSpeed = 0.0075;

  if (typeof val == 'undefined') {
    camera.isAutoRotate = !camera.isAutoRotate;
    return;
  }
  camera.isAutoRotate = val;
};

export const autoPan = (val?: boolean): void => {
  if (settingsManager.autoPanSpeed.x === 0) {
    settingsManager.autoPanSpeed.x = 1; // Can't autopan if speed is 0
  }
  if (typeof val == 'undefined') {
    camera.isAutoPan = !camera.isAutoPan;
    return;
  }
  camera.isAutoPan = val;
};

export const changeZoom = (zoom: ZoomValue | number): void => {
  if (zoom === 'geo') {
    camera._zoomTarget = 0.82;
    return;
  }
  if (zoom === 'leo') {
    camera._zoomTarget = 0.45;
    return;
  }
  if (typeof zoom !== 'number') throw new Error('Invalid Zoom Value');
  if (zoom > 1 || zoom < 0) throw new Error('Invalid Zoom Value');
  camera._zoomTarget = zoom;
};

export const changeCameraType = (orbitManager: OrbitManager, drawManager: DrawManager, objectManager: ObjectManager, sensorManager: SensorManager) => {
  let curCam = camera.cameraType.current;
  if (curCam === camera.cameraType.Planetarium) {
    orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
  }

  curCam++;

  if (curCam == camera.cameraType.FixedToSat && objectManager.selectedSat == -1) {
    curCam++;
  }

  if (curCam === camera.cameraType.Planetarium && (!objectManager.isSensorManagerLoaded || !sensorManager.checkSensorSelected())) {
    curCam++;
  }

  if (curCam === camera.cameraType.Satellite && objectManager.selectedSat === -1) {
    curCam++;
  }

  if (curCam === camera.cameraType.Astronomy && (!objectManager.isSensorManagerLoaded || !sensorManager.checkSensorSelected())) {
    curCam++;
  }

  if (curCam === 7) {
    // 7 is a placeholder to reset camera type
    camera.isLocalRotateReset = true;
    settingsManager.fieldOfView = 0.6;
    drawManager.glInit();
    if (objectManager.selectedSat !== -1) {
      camera.camZoomSnappedOnSat = true;
      curCam = camera.cameraType.FixedToSat;
    } else {
      curCam = camera.cameraType.Default;
    }
  }

  camera.cameraType.set(curCam);
};

export const lookAtLatLon = (lat: number, long: number, zoom?: ZoomValue | number, date?: Date): void => {
  // Setup some defaults if they aren't passed in
  zoom ??= <ZoomValue>'leo';
  date ??= new Date();

  // Convert the lat/long to a position on the globe and then set the camera to look at that position
  changeZoom(zoom);
  camSnap(lat2pitch(lat), lon2yaw(long, date));
};

export const lookAtObject = (sat: SatObject, isFaceEarth: boolean): void => {
  const { timeManager, satellite } = keepTrackApi.programs;
  const lla = satellite.eci2ll(sat.position.x, sat.position.y, sat.position.z);
  const latModifier = isFaceEarth ? 1 : -1;
  const lonModifier = isFaceEarth ? 0 : 180;
  camSnap(lat2pitch(lla.lat * latModifier), lon2yaw(lla.lon + lonModifier, timeManager.selectedDate));
};

export const camSnap = (pitch: number, yaw: number): void => {
  // camera.isPanReset = true
  camera.camPitchTarget = pitch;
  camera.camYawTarget = normalizeAngle(yaw);
  camera.ecPitch = pitch;
  camera.ecYaw = yaw;
  if (camera.ecYaw < 0) camera.ecYaw += TAU;
  camera.isCamSnapMode = true;
};

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const snapToSat = (sat: SatObject) => { // NOSONAR
  /* camera function runs every frame that a satellite is selected.
  However, the user might have broken out of the zoom snap or angle snap.
  If so, don't change those targets. */

  if (typeof sat === 'undefined' || sat === null || sat.static) return;

  if (camera.camAngleSnappedOnSat) {
    camera.camSnapToSat.pos = sat.position;
    camera.camSnapToSat.radius = Math.sqrt(camera.camSnapToSat.pos.x ** 2 + camera.camSnapToSat.pos.y ** 2);
    camera.camSnapToSat.yaw = Math.atan2(camera.camSnapToSat.pos.y, camera.camSnapToSat.pos.x) + TAU / 4;
    camera.camSnapToSat.pitch = Math.atan2(camera.camSnapToSat.pos.z, camera.camSnapToSat.radius);
    if (!camera.camSnapToSat.pitch) {
      console.warn('Pitch Calculation Error');
      camera.camSnapToSat.pitch = 0;
      camera.camZoomSnappedOnSat = false;
      camera.camAngleSnappedOnSat = false;
    }
    if (!camera.camSnapToSat.yaw) {
      console.warn('Yaw Calculation Error');
      camera.camSnapToSat.yaw = 0;
      camera.camZoomSnappedOnSat = false;
      camera.camAngleSnappedOnSat = false;
    }
    if (camera.cameraType.current === camera.cameraType.Planetarium) {
      // camSnap(-pitch, -yaw)
    } else {
      camSnap(camera.camSnapToSat.pitch, camera.camSnapToSat.yaw);
    }
  }

  if (camera.camZoomSnappedOnSat) {
    if (!sat.static && sat.active) {
      // if camera is a satellite not a missile
      camera.camSnapToSat.altitude = sat.getAltitude();
    }
    if (camera.camSnapToSat.altitude) {
      camera.camSnapToSat.camDistTarget = camera.camSnapToSat.altitude + RADIUS_OF_EARTH + settingsManager.camDistBuffer;
    } else {
      camera.camSnapToSat.camDistTarget = RADIUS_OF_EARTH + settingsManager.camDistBuffer; // Stay out of the center of the earth. You will get stuck there.
      console.warn(`Zoom Calculation Error: ${camera.camSnapToSat.altitude} -- ${camera.camSnapToSat.camDistTarget}`);
      camera.camZoomSnappedOnSat = false;
      camera.camAngleSnappedOnSat = false;
    }

    camera.camSnapToSat.camDistTarget =
      camera.camSnapToSat.camDistTarget < settingsManager.minZoomDistance ? settingsManager.minZoomDistance + 10 : camera.camSnapToSat.camDistTarget;

    camera._zoomTarget = Math.pow(
      (camera.camSnapToSat.camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance),
      1 / ZOOM_EXP
    );
    camera.ecLastZoom = camera._zoomTarget + 0.1;

    // Only Zoom in Once on Mobile
    if (settingsManager.isMobileModeEnabled) camera.camZoomSnappedOnSat = false;
  }

  if (camera.cameraType.current === camera.cameraType.Planetarium) {
    camera._zoomTarget = 0.01;
  }
};

export const fts2default = (): void => {
  camera.cameraType.current = camera.cameraType.current == camera.cameraType.FixedToSat ? camera.cameraType.Default : camera.cameraType.current;
  if (camera.cameraType.current == camera.cameraType.Default || camera.cameraType.current == camera.cameraType.Offset) {
    camera.camPitch = camera.ecPitch;
    camera.camYaw = camera.ecYaw;
    camera._zoomTarget = camera.ecLastZoom; // Reset Zoom
  }
};

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const calculate = (dt: number, isSlowDown: boolean) => { // NOSONAR
  if (camera.isScreenPan || camera.isWorldPan || camera.isPanReset) {
    // If user is actively moving
    if (camera.isScreenPan || camera.isWorldPan) {
      camera.camPitchSpeed = 0;
      camera.camYawSpeed = 0;
      camera.panDif.x = camera.screenDragPoint[0] - camera.mouseX;
      camera.panDif.y = camera.screenDragPoint[1] - camera.mouseY;
      camera.panDif.z = camera.screenDragPoint[1] - camera.mouseY;

      // Slow down the panning if a satellite is selected
      if (isSlowDown) {
        camera.panDif.x /= 30;
        camera.panDif.y /= 30;
        camera.panDif.z /= 30;
      }

      camera.panTarget.x = camera.panStartPosition.x + camera.panDif.x * camera.panMovementSpeed * camera._zoomLevel;
      if (camera.isWorldPan) {
        camera.panTarget.y = camera.panStartPosition.y + camera.panDif.y * camera.panMovementSpeed * camera._zoomLevel;
      }
      if (camera.isScreenPan) {
        camera.panTarget.z = camera.panStartPosition.z + camera.panDif.z * camera.panMovementSpeed;
      }
    }

    if (camera.isPanReset) {
      camera.panTarget.x = 0;
      camera.panTarget.y = 0;
      camera.panTarget.z = 0;
      camera.panDif.x = -camera.panCurrent.x;
      camera.panDif.y = camera.panCurrent.y;
      camera.panDif.z = camera.panCurrent.z;
    }

    const panResetModifier = camera.isPanReset ? 0.5 : 1;

    // X is X no matter what
    camera.panSpeed.x = (camera.panCurrent.x - camera.panTarget.x) * camera.panMovementSpeed * camera._zoomLevel;
    camera.panSpeed.x -= camera.panSpeed.x * dt * camera.panMovementSpeed * camera._zoomLevel;
    camera.panCurrent.x += panResetModifier * camera.panMovementSpeed * camera.panDif.x;
    // If we are moving like an FPS then Y and Z are based on the angle of the camera
    if (camera.isWorldPan) {
      camera.fpsPos[1] -= Math.cos(camera.localRotateCurrent.yaw) * panResetModifier * camera.panMovementSpeed * camera.panDif.y;
      camera.fpsPos[2] += Math.sin(camera.localRotateCurrent.pitch) * panResetModifier * camera.panMovementSpeed * camera.panDif.y;
      camera.fpsPos[1] -= Math.sin(-camera.localRotateCurrent.yaw) * panResetModifier * camera.panMovementSpeed * camera.panDif.x;
    }
    // If we are moving the screen then Z is always up and Y is not relevant
    if (camera.isScreenPan || camera.isPanReset) {
      camera.panSpeed.z = (camera.panCurrent.z - camera.panTarget.z) * camera.panMovementSpeed * camera._zoomLevel;
      camera.panSpeed.z -= camera.panSpeed.z * dt * camera.panMovementSpeed * camera._zoomLevel;
      camera.panCurrent.z -= panResetModifier * camera.panMovementSpeed * camera.panDif.z;
    }

    if (camera.isPanReset) {
      camera.fpsPos[0] = camera.fpsPos[0] - camera.fpsPos[0] / 25;
      camera.fpsPos[1] = camera.fpsPos[1] - camera.fpsPos[1] / 25;
      camera.fpsPos[2] = camera.fpsPos[2] - camera.fpsPos[2] / 25;

      if (camera.panCurrent.x > -0.5 && camera.panCurrent.x < 0.5) camera.panCurrent.x = 0;
      if (camera.panCurrent.y > -0.5 && camera.panCurrent.y < 0.5) camera.panCurrent.y = 0;
      if (camera.panCurrent.z > -0.5 && camera.panCurrent.z < 0.5) camera.panCurrent.z = 0;
      if (camera.fpsPos[0] > -0.5 && camera.fpsPos[0] < 0.5) camera.fpsPos[0] = 0;
      if (camera.fpsPos[1] > -0.5 && camera.fpsPos[1] < 0.5) camera.fpsPos[1] = 0;
      if (camera.fpsPos[2] > -0.5 && camera.fpsPos[2] < 0.5) camera.fpsPos[2] = 0;

      if (camera.panCurrent.x == 0 && camera.panCurrent.y == 0 && camera.panCurrent.z == 0 && camera.fpsPos[0] == 0 && camera.fpsPos[1] == 0 && camera.fpsPos[2] == 0) {
        camera.isPanReset = false;
      }
    }
  }
  if (camera.isLocalRotateRoll || camera.isLocalRotateYaw || camera.isLocalRotateReset || camera.isLocalRotateOverride) {
    camera.localRotateTarget.pitch = normalizeAngle(camera.localRotateTarget.pitch);
    camera.localRotateTarget.yaw = normalizeAngle(camera.localRotateTarget.yaw);
    camera.localRotateTarget.roll = normalizeAngle(camera.localRotateTarget.roll);
    camera.localRotateCurrent.pitch = normalizeAngle(camera.localRotateCurrent.pitch);
    camera.localRotateCurrent.yaw = normalizeAngle(camera.localRotateCurrent.yaw);
    camera.localRotateCurrent.roll = normalizeAngle(camera.localRotateCurrent.roll);

    // If user is actively moving
    if (camera.isLocalRotateRoll || camera.isLocalRotateYaw) {
      camera.localRotateDif.pitch = camera.screenDragPoint[1] - camera.mouseY;
      camera.localRotateTarget.pitch = camera.localRotateStartPosition.pitch + camera.localRotateDif.pitch * -settingsManager.cameraMovementSpeed;
      camera.localRotateSpeed.pitch = normalizeAngle(camera.localRotateCurrent.pitch - camera.localRotateTarget.pitch) * -settingsManager.cameraMovementSpeed;

      if (camera.isLocalRotateRoll) {
        camera.localRotateDif.roll = camera.screenDragPoint[0] - camera.mouseX;
        camera.localRotateTarget.roll = camera.localRotateStartPosition.roll + camera.localRotateDif.roll * settingsManager.cameraMovementSpeed;
        camera.localRotateSpeed.roll = normalizeAngle(camera.localRotateCurrent.roll - camera.localRotateTarget.roll) * -settingsManager.cameraMovementSpeed;
      }
      if (camera.isLocalRotateYaw) {
        camera.localRotateDif.yaw = camera.screenDragPoint[0] - camera.mouseX;
        camera.localRotateTarget.yaw = camera.localRotateStartPosition.yaw + camera.localRotateDif.yaw * settingsManager.cameraMovementSpeed;
        camera.localRotateSpeed.yaw = normalizeAngle(camera.localRotateCurrent.yaw - camera.localRotateTarget.yaw) * -settingsManager.cameraMovementSpeed;
      }
    }

    if (camera.isLocalRotateOverride) {
      camera.localRotateTarget.pitch = camera.localRotateStartPosition.pitch + camera.localRotateDif.pitch * -settingsManager.cameraMovementSpeed;
      camera.localRotateSpeed.pitch = normalizeAngle(camera.localRotateCurrent.pitch - camera.localRotateTarget.pitch) * -settingsManager.cameraMovementSpeed;
      camera.localRotateTarget.yaw = camera.localRotateStartPosition.yaw + camera.localRotateDif.yaw * settingsManager.cameraMovementSpeed;
      camera.localRotateSpeed.yaw = normalizeAngle(camera.localRotateCurrent.yaw - camera.localRotateTarget.yaw) * -settingsManager.cameraMovementSpeed;
    }

    if (camera.isLocalRotateReset) {
      camera.localRotateTarget.pitch = 0;
      camera.localRotateTarget.roll = 0;
      camera.localRotateTarget.yaw = 0;
      camera.localRotateDif.pitch = -camera.localRotateCurrent.pitch;
      camera.localRotateDif.roll = -camera.localRotateCurrent.roll;
      camera.localRotateDif.yaw = -camera.localRotateCurrent.yaw;
    }

    const resetModifier = camera.isLocalRotateReset ? 750 : 1;

    camera.localRotateSpeed.pitch -= camera.localRotateSpeed.pitch * dt * camera.localRotateMovementSpeed;
    camera.localRotateCurrent.pitch += resetModifier * camera.localRotateMovementSpeed * camera.localRotateDif.pitch;

    if (camera.isLocalRotateRoll || camera.isLocalRotateReset) {
      camera.localRotateSpeed.roll -= camera.localRotateSpeed.roll * dt * camera.localRotateMovementSpeed;
      camera.localRotateCurrent.roll += resetModifier * camera.localRotateMovementSpeed * camera.localRotateDif.roll;
    }

    if (camera.isLocalRotateYaw || camera.isLocalRotateReset || camera.isLocalRotateOverride) {
      camera.localRotateSpeed.yaw -= camera.localRotateSpeed.yaw * dt * camera.localRotateMovementSpeed;
      camera.localRotateCurrent.yaw += resetModifier * camera.localRotateMovementSpeed * camera.localRotateDif.yaw;
    }

    if (camera.isLocalRotateReset) {
      if (camera.localRotateCurrent.pitch > -0.001 && camera.localRotateCurrent.pitch < 0.001) camera.localRotateCurrent.pitch = 0;
      if (camera.localRotateCurrent.roll > -0.001 && camera.localRotateCurrent.roll < 0.001) camera.localRotateCurrent.roll = 0;
      if (camera.localRotateCurrent.yaw > -0.001 && camera.localRotateCurrent.yaw < 0.001) camera.localRotateCurrent.yaw = 0;
      if (camera.localRotateCurrent.pitch == 0 && camera.localRotateCurrent.roll == 0 && camera.localRotateCurrent.yaw == 0) {
        camera.isLocalRotateReset = false;
      }
    }
  }
  if ((camera.isDragging && !settingsManager.isMobileModeEnabled) || (camera.isDragging && settingsManager.isMobileModeEnabled && (camera.mouseX !== 0 || camera.mouseY !== 0))) {
    // Disable Raycasting for Performance
    // dragTarget = getEarthScreenPoint(mouseX, mouseY)
    // if (Number.isNaN(dragTarget[0]) || Number.isNaN(dragTarget[1]) || Number.isNaN(dragTarget[2]) ||
    // Number.isNaN(dragPoint[0]) || Number.isNaN(dragPoint[1]) || Number.isNaN(dragPoint[2]) ||
    if (
      !camera.isRayCastingEarth ||
      camera.cameraType.current === camera.cameraType.Fps ||
      camera.cameraType.current === camera.cameraType.Satellite ||
      camera.cameraType.current === camera.cameraType.Astronomy ||
      settingsManager.isMobileModeEnabled
    ) {
      // random screen drag
      const xDif = camera.screenDragPoint[0] - camera.mouseX;
      const yDif = camera.screenDragPoint[1] - camera.mouseY;
      const yawTarget = camera.dragStartYaw + xDif * settingsManager.cameraMovementSpeed;
      const pitchTarget = camera.dragStartPitch + yDif * -settingsManager.cameraMovementSpeed;
      camera.camPitchSpeed = normalizeAngle(camera.camPitch - pitchTarget) * -settingsManager.cameraMovementSpeed;
      camera.camYawSpeed = normalizeAngle(camera.camYaw - yawTarget) * -settingsManager.cameraMovementSpeed;
      // NOTE: camera could be used for motion blur
      // camera.camPitchAccel = camera.camPitchSpeedLast - camera.camPitchSpeed;
      // camera.camYawAccel = camera.camYawSpeedLast - camera.camYawSpeed;
      // camera.camPitchSpeedLast = camera.camPitchSpeed * 1;
      // camera.camYawSpeedLast = camera.camYawSpeed * 1;
    } else {
      // camera is how we handle a raycast that hit the earth to make it feel like you are grabbing onto the surface
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
        // camera.camPitchSpeed = pitchDif * settingsManager.cameraMovementSpeed;
        // camera.camYawSpeed = yawDif * settingsManager.cameraMovementSpeed;
      */
    }
    camera.isCamSnapMode = false;
  } else {
    // camera block of code is what causes the momentum effect when moving the camera
    // Most applications like Goolge Earth or STK do not have camera effect as pronounced
    // It makes KeepTrack feel more like a game and less like a toolkit
    camera.camPitchSpeed -= camera.camPitchSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor; // decay speeds when globe is "thrown"
    camera.camYawSpeed -= camera.camYawSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor;
    // NOTE: camera could be used for motion blur
    // camera.camPitchAccel *= 0.95;
    // camera.camYawAccel *= 0.95;
  }

  if (camera.ftsRotateReset) {
    if (camera.cameraType.current !== camera.cameraType.FixedToSat) {
      camera.ftsRotateReset = false;
      camera.ftsPitch = 0;
      camera.camPitchSpeed = 0;
    }

    camera.camPitchSpeed = settingsManager.cameraMovementSpeed * 0.2;
    camera.camYawSpeed = settingsManager.cameraMovementSpeed * 0.2;

    if (camera.camPitch >= camera.ecPitch - 0.05 && camera.camPitch <= camera.ecPitch + 0.05) {
      camera.camPitch = camera.ecPitch;
      camera.camPitchSpeed = 0;
    }
    if (camera.camYaw >= camera.ecYaw - 0.05 && camera.camYaw <= camera.ecYaw + 0.05) {
      camera.camYaw = camera.ecYaw;
      camera.camYawSpeed = 0;
    }

    if (camera.camYaw == camera.ecYaw && camera.camPitch == camera.ecPitch) {
      camera.ftsRotateReset = false;
    }

    if (camera.camPitch > camera.ecPitch) {
      camera.camPitch -= camera.camPitchSpeed * dt * settingsManager.cameraDecayFactor;
    } else if (camera.camPitch < camera.ecPitch) {
      camera.camPitch += camera.camPitchSpeed * dt * settingsManager.cameraDecayFactor;
    }

    if (camera.camYaw > camera.ecYaw) {
      camera.camYaw -= camera.camYawSpeed * dt * settingsManager.cameraDecayFactor;
    } else if (camera.camYaw < camera.ecYaw) {
      camera.camYaw += camera.camYawSpeed * dt * settingsManager.cameraDecayFactor;
    }
  }

  camera.camRotateSpeed -= camera.camRotateSpeed * dt * settingsManager.cameraMovementSpeed;

  if (
    camera.cameraType.current === camera.cameraType.Fps ||
    camera.cameraType.current === camera.cameraType.Satellite ||
    camera.cameraType.current === camera.cameraType.Astronomy
  ) {
    camera.fpsPitch -= 20 * camera.camPitchSpeed * dt;
    camera.fpsYaw -= 20 * camera.camYawSpeed * dt;
    camera.fpsRotate -= 20 * camera.camRotateSpeed * dt;

    // Prevent Over Rotation
    if (camera.fpsPitch > 90) camera.fpsPitch = 90;
    if (camera.fpsPitch < -90) camera.fpsPitch = -90;
    if (camera.fpsRotate > 360) camera.fpsRotate -= 360;
    if (camera.fpsRotate < 0) camera.fpsRotate += 360;
    if (camera.fpsYaw > 360) camera.fpsYaw -= 360;
    if (camera.fpsYaw < 0) camera.fpsYaw += 360;
  } else {
    camera.camPitch += camera.camPitchSpeed * dt;
    camera.camYaw += camera.camYawSpeed * dt;
    camera.fpsRotate += camera.camRotateSpeed * dt;
  }

  if (camera.isAutoRotate) {
    camera.camYaw -= settingsManager.autoRotateSpeed * dt;
  }

  if (camera.isAutoPan) {
    camera.panCurrent.z -= settingsManager.autoPanSpeed.y * dt;
    camera.panCurrent.x -= settingsManager.autoPanSpeed.x * dt;
  }

  // Zoom Changing
  // camera code might be better if applied directly to the shader versus a multiplier effect
  if (camera._zoomLevel !== camera._zoomTarget) {
    if (camera._zoomLevel > settingsManager.satShader.largeObjectMaxZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 1.5;
    } else if (camera._zoomLevel < settingsManager.satShader.largeObjectMinZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize / 3;
    } else {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize;
    }
  }

  if (camera.isCamSnapMode) {
    camera.camPitch += (camera.camPitchTarget - camera.camPitch) * camera.chaseSpeed * dt;

    camera.yawErr = normalizeAngle(camera.camYawTarget - camera.camYaw);
    camera.camYaw += camera.yawErr * camera.chaseSpeed * dt;

    camera._zoomLevel = camera._zoomLevel + (camera._zoomTarget - camera._zoomLevel) * dt * 0.0025;
  } else {
    if (camera.isZoomIn) {
      camera._zoomLevel -= dt * settingsManager.zoomSpeed * Math.abs(camera._zoomTarget - camera._zoomLevel);
    } else {
      camera._zoomLevel += dt * settingsManager.zoomSpeed * Math.abs(camera._zoomTarget - camera._zoomLevel);
    }

    if ((camera._zoomLevel > camera._zoomTarget && !camera.isZoomIn) || (camera._zoomLevel < camera._zoomTarget && camera.isZoomIn)) {
      camera._zoomLevel = camera._zoomTarget;
    }
  }

  // Clamp Zoom between 0 and 1
  camera._zoomLevel = camera._zoomLevel > 1 ? 1 : camera._zoomLevel;
  camera._zoomLevel = camera._zoomLevel < 0 ? 0 : camera._zoomLevel;

  if (camera.cameraType.current == camera.cameraType.FixedToSat) {
    camera.camPitch = normalizeAngle(camera.camPitch);
  } else {
    if (camera.camPitch > TAU / 4) camera.camPitch = TAU / 4;
    if (camera.camPitch < -TAU / 4) camera.camPitch = -TAU / 4;
  }
  if (camera.camYaw > TAU) camera.camYaw -= TAU;
  if (camera.camYaw < 0) camera.camYaw += TAU;

  if (camera.cameraType.current == camera.cameraType.Default || camera.cameraType.current == camera.cameraType.Offset) {
    camera.ecPitch = camera.camPitch;
    camera.ecYaw = camera.camYaw;
    if (camera.ecYaw < 0) camera.ecYaw += TAU;
  } else if (camera.cameraType.current == camera.cameraType.FixedToSat) {
    camera.ftsPitch = camera.camPitch;
    camera.ftsYaw = camera.camYaw;
  }

  if (
    camera.cameraType.current === camera.cameraType.Fps ||
    camera.cameraType.current === camera.cameraType.Satellite ||
    camera.cameraType.current === camera.cameraType.Astronomy
  ) {
    fpsMovement();
  }
};

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const update = (
  target: { id: number; getAltitude: () => number; position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number }; type: SpaceObjectType },
  sensorPos: { lat: number; lon: number; gmst: number; x: number; y: number; z: number }
) => { // NOSONAR
  camera.camMatrix = camera.camMatrixEmpty;
  const normUp = glm.vec3.create();
  const normForward = glm.vec3.create();
  const normLeft = glm.vec3.create();

  {
    /*
     * For FPS style movement rotate the camera and then translate it
     * for traditional view, move the camera and then rotate it
     */
    /* istanbul ignore next */
    if (
      Number.isNaN(camera.camPitch) ||
      Number.isNaN(camera.camYaw) ||
      Number.isNaN(camera.camPitchTarget) ||
      Number.isNaN(camera.camYawTarget) ||
      Number.isNaN(camera._zoomLevel) ||
      Number.isNaN(camera._zoomTarget)
    ) {
      try {
        console.group('Camera Math Error');
        console.log(`camPitch: ${camera.camPitch}`);
        console.log(`camYaw: ${camera.camYaw}`);
        console.log(`camPitchTarget: ${camera.camPitchTarget}`);
        console.log(`camYawTarget: ${camera.camYawTarget}`);
        console.log(`zoomLevel: ${camera._zoomLevel}`);
        console.log(`_zoomTarget: ${camera._zoomTarget}`);
        console.log(`settingsManager.cameraMovementSpeed: ${settingsManager.cameraMovementSpeed}`);
        console.groupEnd();
      } catch (e) {
        console.debug('Camera Math Error');
      }
      camera.camPitch = 0.5;
      camera.camYaw = 0.5;
      camera._zoomLevel = 0.5;
      camera.camPitchTarget = 0;
      camera.camYawTarget = 0;
      camera._zoomTarget = 0.5;
    }

    if (typeof sensorPos == 'undefined' && (camera.cameraType.current == camera.cameraType.Planetarium || camera.cameraType.current == camera.cameraType.Astronomy)) {
      camera.cameraType.current = camera.cameraType.Default;
      console.debug('A sensor should be selected first if camera mode is allowed to be planetarium or astronmy.');
    }

    glm.mat4.identity(camera.camMatrix);

    // Workaround for bug with selecting stars
    if (typeof target === 'undefined' && camera.cameraType.current == camera.cameraType.FixedToSat) {
      camera.cameraType.current = camera.cameraType.Default;
    }

    // Ensure we don't zoom in past our satellite
    if (camera.cameraType.current == camera.cameraType.FixedToSat) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        camera.cameraType.current = camera.cameraType.Default;
      } else {
        if (typeof target.getAltitude !== 'undefined' && getCamDist() < target.getAltitude() + RADIUS_OF_EARTH + 30) {
          camera._zoomTarget = alt2zoom(target.getAltitude());
          camera._zoomLevel = camera._zoomTarget;
        }
      }
    }

    if (camera.cameraType.current == camera.cameraType.Satellite) {
      if (target.id === -1 || target.type === SpaceObjectType.STAR) {
        camera.cameraType.current = camera.cameraType.Default;
      }
    }

    const targetPosition = target.id !== -1 ? glm.vec3.fromValues(-target.position?.x, -target.position?.y, -target.position?.z) : glm.vec3.fromValues(0, 0, 0);
    switch (camera.cameraType.current) {
      case camera.cameraType.Default: // pivot around the earth with earth in the center
        glm.mat4.rotateX(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.pitch);
        glm.mat4.rotateY(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.roll);
        glm.mat4.rotateZ(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.yaw);
        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [camera.panCurrent.x, camera.panCurrent.y, camera.panCurrent.z]);
        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [camera.fpsPos[0], camera.fpsPos[1], -camera.fpsPos[2]]);
        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [0, getCamDist(), 0]);
        glm.mat4.rotateX(camera.camMatrix, camera.camMatrix, camera.ecPitch);
        glm.mat4.rotateZ(camera.camMatrix, camera.camMatrix, -camera.ecYaw);
        break;
      case camera.cameraType.Offset: // pivot around the earth with earth offset to the bottom right
        glm.mat4.rotateX(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.pitch);
        glm.mat4.rotateY(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.roll);
        glm.mat4.rotateZ(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.yaw);

        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [settingsManager.offsetCameraModeX, getCamDist(), settingsManager.offsetCameraModeZ]);
        glm.mat4.rotateX(camera.camMatrix, camera.camMatrix, camera.ecPitch);
        glm.mat4.rotateZ(camera.camMatrix, camera.camMatrix, -camera.ecYaw);
        break;
      case camera.cameraType.FixedToSat: // Pivot around the satellite
        glm.mat4.rotateX(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.pitch);
        glm.mat4.rotateY(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.roll);
        glm.mat4.rotateZ(camera.camMatrix, camera.camMatrix, -camera.localRotateCurrent.yaw);

        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [0, getCamDist() - RADIUS_OF_EARTH - target.getAltitude(), 0]);

        glm.mat4.rotateX(camera.camMatrix, camera.camMatrix, camera.ftsPitch);
        glm.mat4.rotateZ(camera.camMatrix, camera.camMatrix, -camera.ftsYaw);

        glm.mat4.translate(camera.camMatrix, camera.camMatrix, targetPosition);
        break;
      case camera.cameraType.Fps: // FPS style movement
        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, -camera.fpsPitch * DEG2RAD, [1, 0, 0]);
        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, camera.fpsYaw * DEG2RAD, [0, 0, 1]);
        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [camera.fpsPos[0], camera.fpsPos[1], -camera.fpsPos[2]]);
        break;
      case camera.cameraType.Planetarium: {
        // Pitch is the opposite of the angle to the latitude
        // Yaw is 90 degrees to the left of the angle to the longitude
        camera.fpsPitch = -1 * sensorPos.lat * DEG2RAD;
        camera.fpsRotate = (90 - sensorPos.lon) * DEG2RAD - sensorPos.gmst;
        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, camera.fpsPitch, [1, 0, 0]);
        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, camera.fpsRotate, [0, 0, 1]);

        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [-sensorPos.x, -sensorPos.y, -sensorPos.z]);
        break;
      }
      case camera.cameraType.Satellite: {
        const targetPositionTemp = glm.vec3.fromValues(-target.position.x, -target.position.y, -target.position.z);
        glm.mat4.translate(camera.camMatrix, camera.camMatrix, targetPositionTemp);
        glm.vec3.normalize(normUp, targetPositionTemp);
        glm.vec3.normalize(normForward, [target.velocity.x, target.velocity.y, target.velocity.z]);
        glm.vec3.transformQuat(normLeft, normUp, glm.quat.fromValues(normForward[0], normForward[1], normForward[2], 90 * DEG2RAD));
        const targetNextPosition = glm.vec3.fromValues(target.position.x + target.velocity.x, target.position.y + target.velocity.y, target.position.z + target.velocity.z);
        glm.mat4.lookAt(camera.camMatrix, targetNextPosition, targetPositionTemp, normUp);

        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [target.position.x, target.position.y, target.position.z]);

        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, camera.fpsPitch * DEG2RAD, normLeft);
        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, -camera.fpsYaw * DEG2RAD, normUp);

        glm.mat4.translate(camera.camMatrix, camera.camMatrix, targetPositionTemp);
        break;
      }
      case camera.cameraType.Astronomy: {
        // Pitch is the opposite of the angle to the latitude
        // Yaw is 90 degrees to the left of the angle to the longitude
        camera.fpsPitch = -1 * sensorPos.lat * DEG2RAD;

        const sensorPosU = glm.vec3.fromValues(-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01);
        camera.fpsPos[0] = sensorPos.x;
        camera.fpsPos[1] = sensorPos.y;
        camera.fpsPos[2] = sensorPos.z;

        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, camera.fpsPitch + -camera.fpsPitch * DEG2RAD, [1, 0, 0]);
        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, -camera.fpsRotate * DEG2RAD, [0, 1, 0]);
        glm.vec3.normalize(normUp, sensorPosU);
        glm.mat4.rotate(camera.camMatrix, camera.camMatrix, -camera.fpsYaw * DEG2RAD, normUp);

        glm.mat4.translate(camera.camMatrix, camera.camMatrix, [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01]);
        break;
      }
    }

    // Try to stay out of the earth
    if (
      camera.cameraType.current === camera.cameraType.Default ||
      camera.cameraType.current === camera.cameraType.Offset ||
      camera.cameraType.current === camera.cameraType.FixedToSat
    ) {
      if (getDistFromEarth() < RADIUS_OF_EARTH + 30) {
        camera._zoomTarget = camera._zoomLevel + 0.01;
      }
    }
  }
};

/* For RayCasting */
export const getCamPos = (): glm.vec3 => {
  const position = glm.vec3.create();
  glm.vec3.transformMat4(position, position, camera.camMatrix);

  return position;
};

export const getDistFromEarth = (): number => {
  const position = getCamPos();
  return Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
};

export const getForwardVector = (): glm.vec3 => {
  const inverted = glm.mat4.create();
  const forward = glm.vec3.create();

  glm.mat4.invert(inverted, camera.camMatrix);
  glm.vec3.transformMat4(forward, forward, inverted);

  return forward;
};

export const earthHitTest = (gl: WebGL2RenderingContext, dotsManager: DotsManager, x: number, y: number) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
  gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManager.pickReadPixelBuffer);
  camera.isRayCastingEarth = dotsManager.pickReadPixelBuffer[0] === 0 && dotsManager.pickReadPixelBuffer[1] === 0 && dotsManager.pickReadPixelBuffer[2] === 0;
};

export const setCameraType = (val: CameraType) => {
  if (typeof val !== 'number') throw new TypeError();
  if (val > 6 || val < 0) throw new RangeError();

  camera.cameraType.current = val;
  resetFpsPos();
};

export const camera: Camera = {
  _zoomLevel: 0.6925,
  _zoomTarget: 0.6925,
  alt2zoom: alt2zoom,
  autoPan: autoPan,
  autoRotate: autoRotate,
  calculate: calculate,
  camAngleSnappedOnSat: false,
  camMatrix: glm.mat4.create(),
  camMatrixEmpty: glm.mat4.create(),
  camPitch: 0,
  camPitchSpeed: 0,
  camPitchTarget: 0,
  camRotateSpeed: 0,
  camSnap: camSnap,
  camSnapToSat: {
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
  },
  camYaw: 0,
  camYawSpeed: 0,
  camYawTarget: 0,
  camZoomSnappedOnSat: false,
  cameraType: {
    current: 0 as CameraType,
    Default: 0,
    FixedToSat: 1,
    Offset: 2,
    Fps: 3,
    Planetarium: 4,
    Satellite: 5,
    Astronomy: 6,
    set: setCameraType,
  },
  changeCameraType: changeCameraType,
  changeZoom: changeZoom,
  chaseSpeed: 0.0035,
  dragStartPitch: 0,
  dragStartYaw: 0,
  earthHitTest: earthHitTest,
  ecLastZoom: 0.45,
  ecPitch: 0,
  ecYaw: 0,
  fpsForwardSpeed: 0,
  fpsLastTime: 1,
  fpsMovement: fpsMovement,
  fpsPitch: 0,
  fpsPitchRate: 0,
  fpsPos: [0, 0, 0],
  fpsRotate: 0,
  fpsRotateRate: 0,
  fpsRun: 1,
  fpsSideSpeed: 0,
  fpsVertSpeed: 0,
  fpsYaw: 0,
  fpsYawRate: 0,
  fts2default: fts2default,
  ftsPitch: 0,
  ftsRotateReset: false,
  ftsYaw: 0,
  getCamDist: getCamDist,
  getCamPos: getCamPos,
  getDistFromEarth: getDistFromEarth,
  getForwardVector: getForwardVector,
  isAutoPan: false,
  isAutoRotate: true,
  isCamSnapMode: false,
  isDragging: false,
  isFPSForwardSpeedLock: false,
  isFPSSideSpeedLock: false,
  isFPSVertSpeedLock: false,
  isLocalRotateOverride: false,
  isLocalRotateReset: false,
  isLocalRotateRoll: false,
  isLocalRotateYaw: false,
  isPanReset: false,
  isRayCastingEarth: false,
  isScreenPan: false,
  isShiftPressed: false,
  isWorldPan: false,
  isZoomIn: false,
  keyDownHandler: keyDownHandler,
  keyUpHandler: keyUpHandler,
  lat2pitch: lat2pitch,
  lookAtLatLon: lookAtLatLon,
  lookAtObject: lookAtObject,
  localRotateCurrent: { pitch: 0, roll: 0, yaw: 0 },
  localRotateDif: { pitch: 0, roll: 0, yaw: 0 },
  localRotateMovementSpeed: 0.00005,
  localRotateSpeed: { pitch: 0, roll: 0, yaw: 0 },
  localRotateStartPosition: { pitch: 0, roll: 0, yaw: 0 },
  localRotateTarget: { pitch: 0, roll: 0, yaw: 0 },
  lon2yaw: lon2yaw,
  mouseX: 0,
  mouseY: 0,
  normalizeAngle: normalizeAngle,
  panCurrent: { x: 0, y: 0, z: 0 },
  panDif: { x: 0, y: 0, z: 0 },
  panMovementSpeed: 0.5,
  panSpeed: { x: 0, y: 0, z: 0 },
  panStartPosition: { x: 0, y: 0, z: 0 },
  panTarget: { x: 0, y: 0, z: 0 },
  resetFpsPos: resetFpsPos,
  screenDragPoint: [0, 0],
  snapToSat: snapToSat,
  speedModifier: 1,
  update: update,
  yawErr: 0,
  zoomLevel: (val?: number) => {
    if (typeof val !== 'undefined') {
      val = val > 1 ? 1 : val;
      val = val < 0 ? 0 : val;
      camera._zoomLevel = val;
    }
    return camera._zoomLevel;
  },
  zoomTarget: (val: number) => {
    if (typeof val !== 'undefined') {
      val = val > 1 ? 1 : val;
      val = val < 0 ? 0 : val;
      camera._zoomTarget = val;
    }
    return camera._zoomTarget;
  },
  startMouseY: 0,
  startMouseX: 0,
  isCtrlPressed: false,
};
