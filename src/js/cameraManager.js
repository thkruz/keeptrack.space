/**
// /////////////////////////////////////////////////////////////////////////////

Copyright (C) 2016-2020 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

// /////////////////////////////////////////////////////////////////////////////

@format
*/

/**
 * @todo cameraManager.js Testing Full Coverage
 * @body Complete 100% testing coverage and input validation for @app/test/cameraManager.test.js. Use cameraManager.setZoomLevel() as an example of a correct test/validation.
 */

import * as glm from '@app/js/lib/gl-matrix.js';
// import { satScreenPositionArray, satSet } from '@app/js/satSet.js';
// import { ColorScheme } from '@app/js/color-scheme.js';
import { mathValue } from '@app/js/helpers.js';
let settingsManager = window.settingsManager;

var cameraManager = {};

var pitchRotate;
var yawRotate;
var camMatrix = glm.mat4.create();
var camMatrixEmpty = glm.mat4.create();

var satPos, satNextPos;
var normUp = [0, 0, 0];
// var crossNormUp = [0,0,0];
var normLeft = [0, 0, 0];
var normForward = [0, 0, 0];

var isZoomIn = false;
cameraManager.setZoomIn = (val) => {
  if (typeof val !== 'boolean') throw new TypeError();
  isZoomIn = val;
};

var rotateEarth = true; // Set to False to disable initial rotation
cameraManager.rotateEarth = (val) => {
  if (typeof val == 'undefined') {
    rotateEarth = !rotateEarth;
  } else {
    if (typeof val !== 'boolean') throw new TypeError();
    rotateEarth = val;
  }
};

var mouseX = 0;
var mouseY = 0;
cameraManager.setMouseX = (val) => {
  if (typeof val !== 'number') throw new TypeError();
  mouseX = val;
};
cameraManager.setMouseY = (val) => {
  if (typeof val !== 'number') throw new TypeError();
  mouseY = val;
};

var screenDragPoint = [0, 0];
cameraManager.screenDragPoint = (val) => {
  if (typeof val !== 'object' || val.length !== 2) throw new TypeError();
  screenDragPoint = val;
};

var camYaw = 0;
var camPitch = 0;
var zoomLevel = 0.6925;
cameraManager.zoomLevel = zoomLevel;
cameraManager.setZoomLevel = (val) => {
  if (typeof val !== 'number') throw new TypeError();
  if (val > 1.0 || val < 0.0) throw new RangeError();
  zoomLevel = val;
};
var zoomTarget = 0.6925;
cameraManager.zoomTarget = zoomTarget;

cameraManager.isCtrlPressed = false;
cameraManager.setCtrlPressed = (val) => {
  if (typeof val !== 'boolean') throw new TypeError();
  cameraManager.isCtrlPressed = val;
};
cameraManager.isShiftPressed = false;
cameraManager.setShiftPressed = (val) => {
  if (typeof val !== 'boolean') throw new TypeError();
  cameraManager.isShiftPressed = val;
};

var yawErr = 0;
var camYawTarget = 0;
var camPitchTarget = 0;
let xDif, yDif, yawTarget, pitchTarget;
// var dragTarget, dragPointR, dragTargetR, dragPointLon, dragTargetLon, dragPointLat, dragTargetLat, pitchDif, yawDif;
var fpsPitch = 0;
var fpsPitchRate = 0;
var fpsRotate = 0;
var fpsRotateRate = 0;
var fpsYaw = 0;
var fpsYawRate = 0;
var fpsXPos = 0;
var fpsYPos = 0;
var fpsZPos = 0;
var fpsForwardSpeed = 0;
var fpsSideSpeed = 0;
var fpsVertSpeed = 0;
var isFPSForwardSpeedLock = false;
var isFPSSideSpeedLock = false;
var isFPSVertSpeedLock = false;
var fpsRun = 1;
var fpsLastTime = 1;
var fpsTimeNow, fpsElapsed;

cameraManager.cameraType = {
  current: 0,
  default: 0,
  fixedToSat: 1,
  offset: 2,
  fps: 3,
  planetarium: 4,
  satellite: 5,
  astronomy: 6,
  set: (val) => {
    if (typeof val !== 'number') throw new TypeError();
    if (val > 6 || val < 0) throw new RangeError();

    // Move out from the center of the Earth in FPS Mode
    if (val == 3) {
      fpsYPos = 25000;
    } else {
      fpsYPos = 0;
    }
    cameraManager.cameraType.current = val;
  },
};

{
  cameraManager.dragStartPitch = 0;
  cameraManager.setDragStartPitch = (val) => {
    cameraManager.dragStartPitch = val;
  };
  cameraManager.dragStartYaw = 0;
  cameraManager.setDragStartYaw = (val) => {
    cameraManager.dragStartYaw = val;
  };
  cameraManager.isDragging = false;
  cameraManager.setDragging = (val) => {
    cameraManager.isDragging = val;
  };
  cameraManager.chaseSpeed = 0.0035;
  cameraManager.speedModifier = 1;
  cameraManager.setSpeedModifier = (val) => {
    cameraManager.speedModifier = val;
  };
  // Panning Settings/Flags
  cameraManager.isPanning = false;
  cameraManager.isWorldPan = false;
  cameraManager.isScreenPan = false;
  cameraManager.panReset = false;
  cameraManager.setPanReset = (val) => {
    cameraManager.panReset = val;
  };
  cameraManager.panSpeed = { x: 0, y: 0, z: 0 };
  cameraManager.panMovementSpeed = 0.5;
  cameraManager.panTarget = { x: 0, y: 0, z: 0 };
  cameraManager.panCurrent = { x: 0, y: 0, z: 0 };
  cameraManager.panDif = { x: 0, y: 0, z: 0 };
  cameraManager.panStartPosition = { x: 0, y: 0, z: 0 };
  cameraManager.camPitchSpeed = 0;
  cameraManager.camYawSpeed = 0;

  cameraManager.camSnapMode = false;
  cameraManager.setCamSnapMode = (val) => {
    cameraManager.camSnapMode = val;
  };

  cameraManager.isRayCastingEarth = false;
  // Related to the currently disabled raycast
  cameraManager.earthHitTest = (gl, pickColorBuf, x, y) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickColorBuf);
    cameraManager.isRayCastingEarth = pickColorBuf[0] === 0 && pickColorBuf[1] === 0 && pickColorBuf[2] === 0;
  };

  // Local Rotate Settings/Flags
  cameraManager.isLocalRotate = false;
  cameraManager.setLocalRotate = (val) => {
    cameraManager.isLocalRotate = val;
  };
  cameraManager.localRotateReset = false;
  cameraManager.setLocalRotateReset = (val) => {
    cameraManager.localRotateReset = val;
  };
  cameraManager.localRotateSpeed = { pitch: 0, roll: 0, yaw: 0 };
  cameraManager.localRotateMovementSpeed = 0.00005;
  cameraManager.localRotateTarget = { pitch: 0, roll: 0, yaw: 0 };
  cameraManager.localRotateCurrent = { pitch: 0, roll: 0, yaw: 0 };
  cameraManager.localRotateDif = { pitch: 0, roll: 0, yaw: 0 };
  cameraManager.localRotateStartPosition = { pitch: 0, roll: 0, yaw: 0 };
  cameraManager.setLocalRotateStartPosition = (pos) => {
    cameraManager.localRotateStartPosition = pos;
  };
  cameraManager.setLocalRotateRoll = (val) => {
    cameraManager.isLocalRotateRoll = val;
  };
  cameraManager.setLocalRotateYaw = (val) => {
    cameraManager.isLocalRotateYaw = val;
  };

  // Fixed to Sat and Earth Centered Pitch/Yaw Settings
  // This allows switching between cameras smoothly
  cameraManager.ecPitch = 0;
  cameraManager.ecYaw = 0;
  cameraManager.ftsPitch = 0;
  cameraManager.ftsYaw = 0;

  cameraManager.ecLastZoom = 0.45;
  cameraManager.setEcLastZoom = (val) => {
    cameraManager.ecLastZoom = val;
  };
  cameraManager.camRotateSpeed = 0;
}

cameraManager.calculate = (id, dt) => {
  if (cameraManager.isPanning || cameraManager.panReset) {
    // If user is actively moving
    if (cameraManager.isPanning) {
      cameraManager.camPitchSpeed = 0;
      cameraManager.camYawSpeed = 0;
      cameraManager.panDif.x = screenDragPoint[0] - mouseX;
      cameraManager.panDif.y = screenDragPoint[1] - mouseY;
      cameraManager.panDif.z = screenDragPoint[1] - mouseY;

      // Slow down the panning if a satellite is selected
      if (id !== -1) {
        cameraManager.panDif.x /= 30;
        cameraManager.panDif.y /= 30;
        cameraManager.panDif.z /= 30;
      }

      cameraManager.panTarget.x = cameraManager.panStartPosition.x + cameraManager.panDif.x * cameraManager.panMovementSpeed * zoomLevel;
      if (cameraManager.isWorldPan) {
        cameraManager.panTarget.y = cameraManager.panStartPosition.y + cameraManager.panDif.y * cameraManager.panMovementSpeed * zoomLevel;
      }
      if (cameraManager.isScreenPan) {
        cameraManager.panTarget.z = cameraManager.panStartPosition.z + cameraManager.panDif.z * cameraManager.panMovementSpeed;
      }
    }

    if (cameraManager.panReset) {
      cameraManager.panTarget.x = 0;
      cameraManager.panTarget.y = 0;
      cameraManager.panTarget.z = 0;
      cameraManager.panDif.x = -cameraManager.panCurrent.x;
      cameraManager.panDif.y = cameraManager.panCurrent.y;
      cameraManager.panDif.z = cameraManager.panCurrent.z;
    }

    cameraManager.panResetModifier = cameraManager.panReset ? 0.5 : 1;

    // X is X no matter what
    cameraManager.panSpeed.x = (cameraManager.panCurrent.x - cameraManager.panTarget.x) * cameraManager.panMovementSpeed * zoomLevel;
    cameraManager.panSpeed.x -= cameraManager.panSpeed.x * dt * cameraManager.panMovementSpeed * zoomLevel;
    cameraManager.panCurrent.x += cameraManager.panResetModifier * cameraManager.panMovementSpeed * cameraManager.panDif.x;
    // If we are moving like an FPS then Y and Z are based on the angle of the camera
    if (cameraManager.isWorldPan) {
      fpsYPos -= Math.cos(cameraManager.localRotateCurrent.yaw) * cameraManager.panResetModifier * cameraManager.panMovementSpeed * cameraManager.panDif.y;
      fpsZPos += Math.sin(cameraManager.localRotateCurrent.pitch) * cameraManager.panResetModifier * cameraManager.panMovementSpeed * cameraManager.panDif.y;
      fpsYPos -= Math.sin(-cameraManager.localRotateCurrent.yaw) * cameraManager.panResetModifier * cameraManager.panMovementSpeed * cameraManager.panDif.x;
    }
    // If we are moving the screen then Z is always up and Y is not relevant
    if (cameraManager.isScreenPan || cameraManager.panReset) {
      cameraManager.panSpeed.z = (cameraManager.panCurrent.z - cameraManager.panTarget.z) * cameraManager.panMovementSpeed * zoomLevel;
      cameraManager.panSpeed.z -= cameraManager.panSpeed.z * dt * cameraManager.panMovementSpeed * zoomLevel;
      cameraManager.panCurrent.z -= cameraManager.panResetModifier * cameraManager.panMovementSpeed * cameraManager.panDif.z;
    }

    if (cameraManager.panReset) {
      fpsXPos = fpsXPos - fpsXPos / 25;
      fpsYPos = fpsYPos - fpsYPos / 25;
      fpsZPos = fpsZPos - fpsZPos / 25;

      if (cameraManager.panCurrent.x > -0.5 && cameraManager.panCurrent.x < 0.5) cameraManager.panCurrent.x = 0;
      if (cameraManager.panCurrent.y > -0.5 && cameraManager.panCurrent.y < 0.5) cameraManager.panCurrent.y = 0;
      if (cameraManager.panCurrent.z > -0.5 && cameraManager.panCurrent.z < 0.5) cameraManager.panCurrent.z = 0;
      if (fpsXPos > -0.5 && fpsXPos < 0.5) fpsXPos = 0;
      if (fpsYPos > -0.5 && fpsYPos < 0.5) fpsYPos = 0;
      if (fpsZPos > -0.5 && fpsZPos < 0.5) fpsZPos = 0;

      if (cameraManager.panCurrent.x == 0 && cameraManager.panCurrent.y == 0 && cameraManager.panCurrent.z == 0 && fpsXPos == 0 && fpsYPos == 0 && fpsZPos == 0) {
        cameraManager.panReset = false;
      }
    }
  }
  if (cameraManager.isLocalRotate || cameraManager.localRotateReset) {
    cameraManager.localRotateTarget.pitch = cameraManager.normalizeAngle(cameraManager.localRotateTarget.pitch);
    cameraManager.localRotateTarget.yaw = cameraManager.normalizeAngle(cameraManager.localRotateTarget.yaw);
    cameraManager.localRotateTarget.roll = cameraManager.normalizeAngle(cameraManager.localRotateTarget.roll);
    cameraManager.localRotateCurrent.pitch = cameraManager.normalizeAngle(cameraManager.localRotateCurrent.pitch);
    cameraManager.localRotateCurrent.yaw = cameraManager.normalizeAngle(cameraManager.localRotateCurrent.yaw);
    cameraManager.localRotateCurrent.roll = cameraManager.normalizeAngle(cameraManager.localRotateCurrent.roll);

    // If user is actively moving
    if (cameraManager.isLocalRotate) {
      cameraManager.localRotateDif.pitch = screenDragPoint[1] - mouseY;
      cameraManager.localRotateTarget.pitch = cameraManager.localRotateStartPosition.pitch + cameraManager.localRotateDif.pitch * -settingsManager.cameraMovementSpeed;
      cameraManager.localRotateSpeed.pitch = cameraManager.normalizeAngle(cameraManager.localRotateCurrent.pitch - cameraManager.localRotateTarget.pitch) * -settingsManager.cameraMovementSpeed;

      if (cameraManager.isLocalRotateRoll) {
        cameraManager.localRotateDif.roll = screenDragPoint[0] - mouseX;
        cameraManager.localRotateTarget.roll = cameraManager.localRotateStartPosition.roll + cameraManager.localRotateDif.roll * settingsManager.cameraMovementSpeed;
        cameraManager.localRotateSpeed.roll = cameraManager.normalizeAngle(cameraManager.localRotateCurrent.roll - cameraManager.localRotateTarget.roll) * -settingsManager.cameraMovementSpeed;
      }
      if (cameraManager.isLocalRotateYaw) {
        cameraManager.localRotateDif.yaw = screenDragPoint[0] - mouseX;
        cameraManager.localRotateTarget.yaw = cameraManager.localRotateStartPosition.yaw + cameraManager.localRotateDif.yaw * settingsManager.cameraMovementSpeed;
        cameraManager.localRotateSpeed.yaw = cameraManager.normalizeAngle(cameraManager.localRotateCurrent.yaw - cameraManager.localRotateTarget.yaw) * -settingsManager.cameraMovementSpeed;
      }
    }

    if (cameraManager.localRotateReset) {
      cameraManager.localRotateTarget.pitch = 0;
      cameraManager.localRotateTarget.roll = 0;
      cameraManager.localRotateTarget.yaw = 0;
      cameraManager.localRotateDif.pitch = -cameraManager.localRotateCurrent.pitch;
      cameraManager.localRotateDif.roll = -cameraManager.localRotateCurrent.roll;
      cameraManager.localRotateDif.yaw = -cameraManager.localRotateCurrent.yaw;
    }

    cameraManager.resetModifier = cameraManager.localRotateReset ? 750 : 1;

    cameraManager.localRotateSpeed.pitch -= cameraManager.localRotateSpeed.pitch * dt * cameraManager.localRotateMovementSpeed;
    cameraManager.localRotateCurrent.pitch += cameraManager.resetModifier * cameraManager.localRotateMovementSpeed * cameraManager.localRotateDif.pitch;

    if (cameraManager.isLocalRotateRoll || cameraManager.localRotateReset) {
      cameraManager.localRotateSpeed.roll -= cameraManager.localRotateSpeed.roll * dt * cameraManager.localRotateMovementSpeed;
      cameraManager.localRotateCurrent.roll += cameraManager.resetModifier * cameraManager.localRotateMovementSpeed * cameraManager.localRotateDif.roll;
    }

    if (cameraManager.isLocalRotateYaw || cameraManager.localRotateReset) {
      cameraManager.localRotateSpeed.yaw -= cameraManager.localRotateSpeed.yaw * dt * cameraManager.localRotateMovementSpeed;
      cameraManager.localRotateCurrent.yaw += cameraManager.resetModifier * cameraManager.localRotateMovementSpeed * cameraManager.localRotateDif.yaw;
    }

    if (cameraManager.localRotateReset) {
      if (cameraManager.localRotateCurrent.pitch > -0.001 && cameraManager.localRotateCurrent.pitch < 0.001) cameraManager.localRotateCurrent.pitch = 0;
      if (cameraManager.localRotateCurrent.roll > -0.001 && cameraManager.localRotateCurrent.roll < 0.001) cameraManager.localRotateCurrent.roll = 0;
      if (cameraManager.localRotateCurrent.yaw > -0.001 && cameraManager.localRotateCurrent.yaw < 0.001) cameraManager.localRotateCurrent.yaw = 0;
      if (cameraManager.localRotateCurrent.pitch == 0 && cameraManager.localRotateCurrent.roll == 0 && cameraManager.localRotateCurrent.yaw == 0) {
        cameraManager.localRotateReset = false;
      }
    }
  }
  if ((cameraManager.isDragging && !settingsManager.isMobileModeEnabled) || (cameraManager.isDragging && settingsManager.isMobileModeEnabled && (mouseX !== 0 || mouseY !== 0))) {
    // Disable Raycasting for Performance
    // dragTarget = getEarthScreenPoint(mouseX, mouseY)
    // if (isNaN(dragTarget[0]) || isNaN(dragTarget[1]) || isNaN(dragTarget[2]) ||
    // isNaN(dragPoint[0]) || isNaN(dragPoint[1]) || isNaN(dragPoint[2]) ||
    if (
      !cameraManager.isRayCastingEarth ||
      cameraManager.cameraType.current === cameraManager.cameraType.fps ||
      cameraManager.cameraType.current === cameraManager.cameraType.satellite ||
      cameraManager.cameraType.current === cameraManager.cameraType.astronomy ||
      settingsManager.isMobileModeEnabled
    ) {
      // random screen drag
      xDif = screenDragPoint[0] - mouseX;
      yDif = screenDragPoint[1] - mouseY;
      yawTarget = cameraManager.dragStartYaw + xDif * settingsManager.cameraMovementSpeed;
      pitchTarget = cameraManager.dragStartPitch + yDif * -settingsManager.cameraMovementSpeed;
      cameraManager.camPitchSpeed = cameraManager.normalizeAngle(camPitch - pitchTarget) * -settingsManager.cameraMovementSpeed;
      cameraManager.camYawSpeed = cameraManager.normalizeAngle(camYaw - yawTarget) * -settingsManager.cameraMovementSpeed;
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
        // yawDif = cameraManager.normalizeAngle(dragPointLon - dragTargetLon);
        // cameraManager.camPitchSpeed = pitchDif * settingsManager.cameraMovementSpeed;
        // cameraManager.camYawSpeed = yawDif * settingsManager.cameraMovementSpeed;
      */
    }
    cameraManager.camSnapMode = false;
  } else {
    // This block of code is what causes the moment effect when moving the camera
    // Most applications like Goolge Earth or STK do not have this effect as pronounced
    // It makes KeepTrack feel more like a game and less like a toolkit
    if (!settingsManager.isMobileModeEnabled) {
      // DESKTOP ONLY
      cameraManager.camPitchSpeed -= cameraManager.camPitchSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor; // decay speeds when globe is "thrown"
      cameraManager.camYawSpeed -= cameraManager.camYawSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor;
    } else if (settingsManager.isMobileModeEnabled) {
      // MOBILE
      cameraManager.camPitchSpeed -= cameraManager.camPitchSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor; // decay speeds when globe is "thrown"
      cameraManager.camYawSpeed -= cameraManager.camYawSpeed * dt * settingsManager.cameraMovementSpeed * settingsManager.cameraDecayFactor;
    }
  }
  if (cameraManager.ftsRotateReset) {
    if (cameraManager.cameraType.current !== cameraManager.cameraType.fixedToSat) {
      cameraManager.ftsRotateReset = false;
      cameraManager.ftsPitch = 0;
      cameraManager.camPitchSpeed = 0;
    }

    cameraManager.camPitchSpeed = settingsManager.cameraMovementSpeed * 0.2;
    cameraManager.camYawSpeed = settingsManager.cameraMovementSpeed * 0.2;

    if (camPitch >= cameraManager.ecPitch - 0.05 && camPitch <= cameraManager.ecPitch + 0.05) {
      camPitch = cameraManager.ecPitch;
      cameraManager.camPitchSpeed = 0;
    }
    if (camYaw >= cameraManager.ecYaw - 0.05 && camYaw <= cameraManager.ecYaw + 0.01) {
      camYaw = cameraManager.ecYaw;
      cameraManager.camYawSpeed = 0;
    }

    if (camYaw == cameraManager.ecYaw && camPitch == cameraManager.ecPitch) {
      cameraManager.ftsRotateReset = false;
    }

    if (camPitch > cameraManager.ecPitch) {
      camPitch -= cameraManager.camPitchSpeed * dt * settingsManager.cameraDecayFactor;
    } else if (camPitch < cameraManager.ecPitch) {
      camPitch += cameraManager.camPitchSpeed * dt * settingsManager.cameraDecayFactor;
    }

    if (camYaw > cameraManager.ecYaw) {
      camYaw -= cameraManager.camYawSpeed * dt * settingsManager.cameraDecayFactor;
    } else if (camYaw < cameraManager.ecYaw) {
      camYaw += cameraManager.camYawSpeed * dt * settingsManager.cameraDecayFactor;
    }
  }

  cameraManager.camRotateSpeed -= cameraManager.camRotateSpeed * dt * settingsManager.cameraMovementSpeed;

  if (cameraManager.cameraType.current === cameraManager.cameraType.fps || cameraManager.cameraType.current === cameraManager.cameraType.satellite || cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
    fpsPitch -= 20 * cameraManager.camPitchSpeed * dt;
    fpsYaw -= 20 * cameraManager.camYawSpeed * dt;
    fpsRotate -= 20 * cameraManager.camRotateSpeed * dt;

    // Prevent Over Rotation
    if (fpsPitch > 90) fpsPitch = 90;
    if (fpsPitch < -90) fpsPitch = -90;
    if (fpsRotate > 360) fpsRotate -= 360;
    if (fpsRotate < 0) fpsRotate += 360;
    if (fpsYaw > 360) fpsYaw -= 360;
    if (fpsYaw < 0) fpsYaw += 360;
  } else {
    camPitch += cameraManager.camPitchSpeed * dt;
    camYaw += cameraManager.camYawSpeed * dt;
    fpsRotate += cameraManager.camRotateSpeed * dt;
  }

  if (rotateEarth) {
    camYaw -= settingsManager.autoRotateSpeed * dt;
  }

  // Zoom Changing
  // This code might be better if applied directly to the shader versus a multiplier effect
  if (zoomLevel !== zoomTarget) {
    if (zoomLevel > settingsManager.satShader.largeObjectMaxZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 1.5;
    } else if (zoomLevel < settingsManager.satShader.largeObjectMinZoom) {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize / 3;
    } else {
      settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize;
    }
  }

  if (cameraManager.camSnapMode) {
    camPitch += (camPitchTarget - camPitch) * cameraManager.chaseSpeed * dt;

    yawErr = cameraManager.normalizeAngle(camYawTarget - camYaw);
    camYaw += yawErr * cameraManager.chaseSpeed * dt;

    zoomLevel = zoomLevel + (zoomTarget - zoomLevel) * dt * 0.0025;
  } else {
    if (isZoomIn) {
      zoomLevel -= ((zoomLevel * dt) / 100) * Math.abs(zoomTarget - zoomLevel);
    } else {
      zoomLevel += ((zoomLevel * dt) / 100) * Math.abs(zoomTarget - zoomLevel);
    }

    if ((zoomLevel >= zoomTarget && !isZoomIn) || (zoomLevel <= zoomTarget && isZoomIn)) {
      zoomLevel = zoomTarget;
    }
  }
  cameraManager.zoomLevel = zoomLevel;

  if (cameraManager.cameraType.current == cameraManager.cameraType.fixedToSat) {
    camPitch = cameraManager.normalizeAngle(camPitch);
  } else {
    if (camPitch > mathValue.TAU / 4) camPitch = mathValue.TAU / 4;
    if (camPitch < -mathValue.TAU / 4) camPitch = -mathValue.TAU / 4;
  }
  if (camYaw > mathValue.TAU) camYaw -= mathValue.TAU;
  if (camYaw < 0) camYaw += mathValue.TAU;

  if (cameraManager.cameraType.current == cameraManager.cameraType.default || cameraManager.cameraType.current == cameraManager.cameraType.offset) {
    cameraManager.ecPitch = camPitch;
    cameraManager.ecYaw = camYaw;
  } else if (cameraManager.cameraType.current == cameraManager.cameraType.fixedToSat) {
    cameraManager.ftsPitch = camPitch;
    cameraManager.ftsYaw = camYaw;
  }

  if (cameraManager.cameraType.current === cameraManager.cameraType.fps || cameraManager.cameraType.current === cameraManager.cameraType.satellite || cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
    _fpsMovement();
  }
};

cameraManager.update = (sat, sensorPos) => {
  camMatrix = camMatrixEmpty;
  {
    glm.mat4.identity(camMatrix);

    /**
     * For FPS style movement rotate the camera and then translate it
     * for traditional view, move the camera and then rotate it
     */

    if (isNaN(camPitch) || isNaN(camYaw) || isNaN(camPitchTarget) || isNaN(camYawTarget) || isNaN(zoomLevel) || isNaN(zoomTarget)) {
      try {
        console.group('Camera Math Error');
        console.log(`camPitch: ${camPitch}`);
        console.log(`camYaw: ${camYaw}`);
        console.log(`camPitchTarget: ${camPitchTarget}`);
        console.log(`camYawTarget: ${camYawTarget}`);
        console.log(`zoomLevel: ${zoomLevel}`);
        console.log(`zoomTarget: ${zoomTarget}`);
        console.log(`settingsManager.cameraMovementSpeed: ${settingsManager.cameraMovementSpeed}`);
        console.groupEnd();
      } catch (e) {
        console.warn('Camera Math Error');
      }
      camPitch = 0.5;
      camYaw = 0.5;
      zoomLevel = 0.5;
      cameraManager.zoomLevel = zoomLevel;
      camPitchTarget = 0;
      camYawTarget = 0;
      zoomTarget = 0.5;
    }

    switch (cameraManager.cameraType.current) {
      case cameraManager.cameraType.default: // pivot around the earth with earth in the center
        glm.mat4.translate(camMatrix, camMatrix, [cameraManager.panCurrent.x, cameraManager.panCurrent.y, cameraManager.panCurrent.z]);
        glm.mat4.rotateX(camMatrix, camMatrix, -cameraManager.localRotateCurrent.pitch);
        glm.mat4.rotateY(camMatrix, camMatrix, -cameraManager.localRotateCurrent.roll);
        glm.mat4.rotateZ(camMatrix, camMatrix, -cameraManager.localRotateCurrent.yaw);
        glm.mat4.translate(camMatrix, camMatrix, [fpsXPos, fpsYPos, -fpsZPos]);
        glm.mat4.translate(camMatrix, camMatrix, [0, _getCamDist(), 0]);
        glm.mat4.rotateX(camMatrix, camMatrix, cameraManager.ecPitch);
        glm.mat4.rotateZ(camMatrix, camMatrix, -cameraManager.ecYaw);
        break;
      case cameraManager.cameraType.offset: // pivot around the earth with earth offset to the bottom right
        glm.mat4.rotateX(camMatrix, camMatrix, -cameraManager.localRotateCurrent.pitch);
        glm.mat4.rotateY(camMatrix, camMatrix, -cameraManager.localRotateCurrent.roll);
        glm.mat4.rotateZ(camMatrix, camMatrix, -cameraManager.localRotateCurrent.yaw);

        glm.mat4.translate(camMatrix, camMatrix, [settingsManager.offsetCameraModeX, _getCamDist(), settingsManager.offsetCameraModeZ]);
        glm.mat4.rotateX(camMatrix, camMatrix, cameraManager.ecPitch);
        glm.mat4.rotateZ(camMatrix, camMatrix, -cameraManager.ecYaw);
        break;
      case cameraManager.cameraType.fixedToSat: // Pivot around the satellite
        glm.mat4.rotateX(camMatrix, camMatrix, -cameraManager.localRotateCurrent.pitch);
        glm.mat4.rotateY(camMatrix, camMatrix, -cameraManager.localRotateCurrent.roll);
        glm.mat4.rotateZ(camMatrix, camMatrix, -cameraManager.localRotateCurrent.yaw);

        glm.mat4.translate(camMatrix, camMatrix, [0, _getCamDist() - mathValue.RADIUS_OF_EARTH - sat.getAltitude(), 0]);

        glm.mat4.rotateX(camMatrix, camMatrix, cameraManager.ftsPitch);
        glm.mat4.rotateZ(camMatrix, camMatrix, -cameraManager.ftsYaw);

        satPos = [-sat.position.x, -sat.position.y, -sat.position.z];
        glm.mat4.translate(camMatrix, camMatrix, satPos);
        break;
      case cameraManager.cameraType.fps: // FPS style movement
        glm.mat4.rotate(camMatrix, camMatrix, -fpsPitch * mathValue.DEG2RAD, [1, 0, 0]);
        glm.mat4.rotate(camMatrix, camMatrix, fpsYaw * mathValue.DEG2RAD, [0, 0, 1]);
        glm.mat4.translate(camMatrix, camMatrix, [fpsXPos, fpsYPos, -fpsZPos]);
        break;
      case cameraManager.cameraType.planetarium: {
        // Pitch is the opposite of the angle to the latitude
        // Yaw is 90 degrees to the left of the angle to the longitude
        pitchRotate = -1 * sensorPos.lat * mathValue.DEG2RAD;
        yawRotate = (90 - sensorPos.long) * mathValue.DEG2RAD - sensorPos.gmst;
        glm.mat4.rotate(camMatrix, camMatrix, pitchRotate, [1, 0, 0]);
        glm.mat4.rotate(camMatrix, camMatrix, yawRotate, [0, 0, 1]);

        glm.mat4.translate(camMatrix, camMatrix, [-sensorPos.x, -sensorPos.y, -sensorPos.z]);
        break;
      }
      case cameraManager.cameraType.satellite: {
        satPos = [-sat.position.x, -sat.position.y, -sat.position.z];
        glm.mat4.translate(camMatrix, camMatrix, satPos);
        glm.vec3.normalize(normUp, satPos);
        glm.vec3.normalize(normForward, [sat.velocity.x, sat.velocity.y, sat.velocity.z]);
        glm.vec3.transformQuat(normLeft, normUp, glm.quat.fromValues(normForward[0], normForward[1], normForward[2], 90 * mathValue.DEG2RAD));
        satNextPos = [sat.position.x + sat.velocity.x, sat.position.y + sat.velocity.y, sat.position.z + sat.velocity.z];
        glm.mat4.lookAt(camMatrix, satNextPos, satPos, normUp);

        glm.mat4.translate(camMatrix, camMatrix, [sat.position.x, sat.position.y, sat.position.z]);

        glm.mat4.rotate(camMatrix, camMatrix, fpsPitch * mathValue.DEG2RAD, normLeft);
        glm.mat4.rotate(camMatrix, camMatrix, -fpsYaw * mathValue.DEG2RAD, normUp);

        glm.mat4.translate(camMatrix, camMatrix, satPos);
        break;
      }
      case cameraManager.cameraType.astronomy: {
        // Pitch is the opposite of the angle to the latitude
        // Yaw is 90 degrees to the left of the angle to the longitude
        pitchRotate = -1 * sensorPos.lat * mathValue.DEG2RAD;

        let sensorPosU = [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01];
        fpsXPos = sensorPos.x;
        fpsYPos = sensorPos.y;
        fpsZPos = sensorPos.z;

        glm.mat4.rotate(camMatrix, camMatrix, pitchRotate + -fpsPitch * mathValue.DEG2RAD, [1, 0, 0]);
        glm.mat4.rotate(camMatrix, camMatrix, -fpsRotate * mathValue.DEG2RAD, [0, 1, 0]);
        glm.vec3.normalize(normUp, sensorPosU);
        glm.mat4.rotate(camMatrix, camMatrix, -fpsYaw * mathValue.DEG2RAD, normUp);

        glm.mat4.translate(camMatrix, camMatrix, [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01]);
        break;
      }
    }
  }
  cameraManager.camMatrix = camMatrix;
};

cameraManager.resetFpsPos = () => {
  fpsPitch = 0;
  fpsYaw = 0;
  fpsXPos = 0;
  fpsYPos = 25000;
  fpsZPos = 0;
};

var _fpsMovement = () => {
  fpsTimeNow = Date.now();
  if (fpsLastTime !== 0) {
    fpsElapsed = fpsTimeNow - fpsLastTime;

    if (isFPSForwardSpeedLock && fpsForwardSpeed < 0) {
      fpsForwardSpeed = Math.max(fpsForwardSpeed + Math.min(fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsForwardSpeed);
    } else if (isFPSForwardSpeedLock && fpsForwardSpeed > 0) {
      fpsForwardSpeed = Math.min(fpsForwardSpeed + Math.max(fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsForwardSpeed);
    }

    if (isFPSSideSpeedLock && fpsSideSpeed < 0) {
      fpsSideSpeed = Math.max(fpsSideSpeed + Math.min(fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsSideSpeed);
    } else if (isFPSSideSpeedLock && fpsSideSpeed > 0) {
      fpsSideSpeed = Math.min(fpsSideSpeed + Math.max(fpsSideSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsSideSpeed);
    }

    if (isFPSVertSpeedLock && fpsVertSpeed < 0) {
      fpsVertSpeed = Math.max(fpsVertSpeed + Math.min(fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsVertSpeed);
    } else if (isFPSVertSpeedLock && fpsVertSpeed > 0) {
      fpsVertSpeed = Math.min(fpsVertSpeed + Math.max(fpsVertSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsVertSpeed);
    }

    // console.log('Front: ' + fpsForwardSpeed + ' - ' + 'Side: ' + fpsSideSpeed + ' - ' + 'Vert: ' + fpsVertSpeed)

    if (cameraManager.cameraType.fps) {
      if (fpsForwardSpeed !== 0) {
        fpsXPos -= Math.sin(fpsYaw * mathValue.DEG2RAD) * fpsForwardSpeed * fpsRun * fpsElapsed;
        fpsYPos -= Math.cos(fpsYaw * mathValue.DEG2RAD) * fpsForwardSpeed * fpsRun * fpsElapsed;
        fpsZPos += Math.sin(fpsPitch * mathValue.DEG2RAD) * fpsForwardSpeed * fpsRun * fpsElapsed;
      }
      if (fpsVertSpeed !== 0) {
        fpsZPos -= fpsVertSpeed * fpsRun * fpsElapsed;
      }
      if (fpsSideSpeed !== 0) {
        fpsXPos -= Math.cos(-fpsYaw * mathValue.DEG2RAD) * fpsSideSpeed * fpsRun * fpsElapsed;
        fpsYPos -= Math.sin(-fpsYaw * mathValue.DEG2RAD) * fpsSideSpeed * fpsRun * fpsElapsed;
      }
    }

    if (!isFPSForwardSpeedLock) fpsForwardSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
    if (!isFPSSideSpeedLock) fpsSideSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
    if (!isFPSVertSpeedLock) fpsVertSpeed *= Math.min(0.98 * fpsElapsed, 0.98);

    if (fpsForwardSpeed < 0.01 && fpsForwardSpeed > -0.01) fpsForwardSpeed = 0;
    if (fpsSideSpeed < 0.01 && fpsSideSpeed > -0.01) fpsSideSpeed = 0;
    if (fpsVertSpeed < 0.01 && fpsVertSpeed > -0.01) fpsVertSpeed = 0;

    fpsPitch += fpsPitchRate * fpsElapsed;
    fpsRotate += fpsRotateRate * fpsElapsed;
    fpsYaw += fpsYawRate * fpsElapsed;

    // console.log('Pitch: ' + fpsPitch + ' - ' + 'Rotate: ' + fpsRotate + ' - ' + 'Yaw: ' + fpsYaw)
  }
  fpsLastTime = fpsTimeNow;
};

var _getCamDist = () => Math.pow(zoomLevel, mathValue.ZOOM_EXP) * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance;

cameraManager.getCamPos = () => {
  let gCPr = _getCamDist();
  let gCPz = gCPr * Math.sin(camPitch);
  let gCPrYaw = gCPr * Math.cos(camPitch);
  let gCPx = gCPrYaw * Math.sin(camYaw);
  let gCPy = gCPrYaw * -Math.cos(camYaw);
  return [gCPx, gCPy, gCPz];
};

cameraManager.normalizeAngle = (angle) => {
  angle %= mathValue.TAU;
  if (angle > Math.PI) angle -= mathValue.TAU;
  if (angle < -Math.PI) angle += mathValue.TAU;
  return angle;
};

cameraManager.longToYaw = (long, selectedDate) => {
  var today = new Date();
  var angle = 0;

  // NOTE: This formula sometimes is incorrect, but has been stable for over a year
  // NOTE: Looks wrong again as of 8/29/2020 - time of year issue?
  today.setUTCHours(selectedDate.getUTCHours() + selectedDate.getUTCMonth() * 2 - 11); // Offset has to account for time of year. Add 2 Hours per month into the year starting at -12.

  today.setUTCMinutes(selectedDate.getUTCMinutes());
  today.setUTCSeconds(selectedDate.getUTCSeconds());
  selectedDate.setUTCHours(0);
  selectedDate.setUTCMinutes(0);
  selectedDate.setUTCSeconds(0);
  var longOffset = (today - selectedDate) / 60 / 60 / 1000; // In Hours
  if (longOffset > 24) longOffset = longOffset - 24;
  longOffset = longOffset * 15; // 15 Degress Per Hour longitude Offset

  angle = (long + longOffset) * mathValue.DEG2RAD;
  angle = cameraManager.normalizeAngle(angle);
  return angle;
};
cameraManager.latToPitch = (lat) => {
  var pitch = lat * mathValue.DEG2RAD;
  if (pitch > mathValue.TAU / 4) pitch = mathValue.TAU / 4; // Max 90 Degrees
  if (pitch < -mathValue.TAU / 4) pitch = -mathValue.TAU / 4; // Min -90 Degrees
  return pitch;
};
cameraManager.camSnap = (pitch, yaw) => {
  // cameraManager.panReset = true
  camPitchTarget = pitch;
  camYawTarget = cameraManager.normalizeAngle(yaw);
  cameraManager.ecPitch = pitch;
  cameraManager.ecYaw = yaw;
  cameraManager.camSnapMode = true;
};

let cSTS = {};
var camZoomSnappedOnSat = false;
cameraManager.camZoomSnappedOnSat = (val) => {
  camZoomSnappedOnSat = val;
};
var camAngleSnappedOnSat = false;
cameraManager.camAngleSnappedOnSat = (val) => {
  camAngleSnappedOnSat = val;
};
cameraManager.camSnapToSat = (sat) => {
  /* this function runs every frame that a satellite is selected.
  However, the user might have broken out of the zoom snap or angle snap.
  If so, don't change those targets. */

  if (camAngleSnappedOnSat) {
    cSTS.pos = sat.position;
    cSTS.r = Math.sqrt(cSTS.pos.x ** 2 + cSTS.pos.y ** 2);
    cSTS.yaw = Math.atan2(cSTS.pos.y, cSTS.pos.x) + mathValue.TAU / 4;
    cSTS.pitch = Math.atan2(cSTS.pos.z, cSTS.r);
    if (!cSTS.pitch) {
      console.warn('Pitch Calculation Error');
      cSTS.pitch = 0;
      camZoomSnappedOnSat = false;
      camAngleSnappedOnSat = false;
    }
    if (!cSTS.yaw) {
      console.warn('Yaw Calculation Error');
      cSTS.yaw = 0;
      camZoomSnappedOnSat = false;
      camAngleSnappedOnSat = false;
    }
    if (cameraManager.cameraType.current === cameraManager.cameraType.planetarium) {
      // camSnap(-pitch, -yaw)
    } else {
      cameraManager.camSnap(cSTS.pitch, cSTS.yaw);
    }
  }

  if (camZoomSnappedOnSat) {
    // cSTS.altitude;
    // cSTS.camDistTarget;
    if (!sat.missile && !sat.static && sat.active) {
      // if this is a satellite not a missile
      cSTS.altitude = sat.getAltitude();
    }
    if (sat.missile) {
      cSTS.altitude = sat.maxAlt + 1000; // if it is a missile use its altitude
    }
    if (cSTS.altitude) {
      cSTS.camDistTarget = cSTS.altitude + mathValue.RADIUS_OF_EARTH + settingsManager.camDistBuffer;
    } else {
      cSTS.camDistTarget = mathValue.RADIUS_OF_EARTH + settingsManager.camDistBuffer; // Stay out of the center of the earth. You will get stuck there.
      console.warn(`Zoom Calculation Error: ${cSTS.altitude} -- ${cSTS.camDistTarget}`);
      camZoomSnappedOnSat = false;
      camAngleSnappedOnSat = false;
    }

    cSTS.camDistTarget = cSTS.camDistTarget < settingsManager.minZoomDistance ? settingsManager.minZoomDistance + 10 : cSTS.camDistTarget;

    zoomTarget = Math.pow((cSTS.camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance), 1 / mathValue.ZOOM_EXP);
    cameraManager.ecLastZoom = zoomTarget + 0.1;

    // Only Zoom in Once on Mobile
    if (settingsManager.isMobileModeEnabled) camZoomSnappedOnSat = false;
  }

  if (cameraManager.cameraType.current === cameraManager.cameraType.planetarium) {
    zoomTarget = 0.01;
  }
};

cameraManager.setZoomTarget = (zoom) => {
  zoomTarget = zoom;
  cameraManager.zoomTarget = zoomTarget;
};

cameraManager.changeZoom = (zoom) => {
  if (zoom === 'geo') {
    zoomTarget = 0.82;
    return;
  }
  if (zoom === 'leo') {
    zoomTarget = 0.45;
    return;
  }
  zoomTarget = zoom;
  cameraManager.zoomTarget = zoomTarget;
};

cameraManager.fts2default = () => {
  cameraManager.cameraType.current = cameraManager.cameraType.current == cameraManager.cameraType.fixedToSat ? cameraManager.cameraType.default : cameraManager.cameraType.current;
  if (cameraManager.cameraType.current == cameraManager.cameraType.default || cameraManager.cameraType.current == cameraManager.cameraType.offset) {
    camPitch = cameraManager.ecPitch;
    camYaw = cameraManager.ecYaw;
    zoomTarget = cameraManager.ecLastZoom; // Reset Zoom
  }
};

cameraManager.keyUpHandler = (evt) => {
  // Error Handling
  if (typeof evt.key == 'undefined') return;

  if (evt.key.toUpperCase() === 'A' && fpsSideSpeed === -settingsManager.fpsSideSpeed) {
    isFPSSideSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'D' && fpsSideSpeed === settingsManager.fpsSideSpeed) {
    isFPSSideSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'S' && fpsForwardSpeed === -settingsManager.fpsForwardSpeed) {
    isFPSForwardSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'W' && fpsForwardSpeed === settingsManager.fpsForwardSpeed) {
    isFPSForwardSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'Q') {
    if (fpsVertSpeed === -settingsManager.fpsVertSpeed) isFPSVertSpeedLock = false;
    fpsRotateRate = 0;
  }
  if (evt.key.toUpperCase() === 'E') {
    if (fpsVertSpeed === settingsManager.fpsVertSpeed) isFPSVertSpeedLock = false;
    fpsRotateRate = 0;
  }
  if (evt.key.toUpperCase() === 'J' || evt.key.toUpperCase() === 'L') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
      fpsRotateRate = 0;
    } else {
      fpsYawRate = 0;
    }
  }
  if (evt.key.toUpperCase() === 'I' || evt.key.toUpperCase() === 'K') {
    fpsPitchRate = 0;
  }

  if (evt.key.toUpperCase() === 'SHIFT') {
    cameraManager.setShiftPressed(false);
    fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    cameraManager.setSpeedModifier(1);
    if (!isFPSForwardSpeedLock) fpsForwardSpeed = 0;
    if (!isFPSSideSpeedLock) fpsSideSpeed = 0;
    if (!isFPSVertSpeedLock) fpsVertSpeed = 0;
  }
  // Applies to _keyDownHandler as well
  if (evt.key === 'ShiftRight') {
    cameraManager.setShiftPressed(false);
    fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    cameraManager.setSpeedModifier(1);
  }
};

cameraManager.keyDownHandler = (evt) => {
  // Error Handling
  if (typeof evt.key == 'undefined') return;

  if (evt.key.toUpperCase() === 'SHIFT') {
    cameraManager.setShiftPressed(true);
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsRun = 0.05;
    }
    cameraManager.setSpeedModifier(8);
    settingsManager.cameraMovementSpeed = 0.003 / 8;
    settingsManager.cameraMovementSpeedMin = 0.005 / 8;
  }
  if (evt.key === 'ShiftRight') {
    cameraManager.setShiftPressed(true);
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsRun = 3;
    }
  }
  if (evt.key.toUpperCase() === 'W') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsForwardSpeed = settingsManager.fpsForwardSpeed;
      isFPSForwardSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'A') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsSideSpeed = -settingsManager.fpsSideSpeed;
      isFPSSideSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'S') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
      isFPSForwardSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'D') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsSideSpeed = settingsManager.fpsSideSpeed;
      isFPSSideSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'I') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps || cameraManager.cameraType.current === cameraManager.cameraType.satellite || cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
      fpsPitchRate = settingsManager.fpsPitchRate / cameraManager.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'K') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps || cameraManager.cameraType.current === cameraManager.cameraType.satellite || cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
      fpsPitchRate = -settingsManager.fpsPitchRate / cameraManager.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'J') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps || cameraManager.cameraType.current === cameraManager.cameraType.satellite) {
      fpsYawRate = -settingsManager.fpsYawRate / cameraManager.speedModifier;
    }
    if (cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
      fpsRotateRate = settingsManager.fpsRotateRate / cameraManager.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'L') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps || cameraManager.cameraType.current === cameraManager.cameraType.satellite) {
      fpsYawRate = settingsManager.fpsYawRate / cameraManager.speedModifier;
    }
    if (cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
      fpsRotateRate = -settingsManager.fpsRotateRate / cameraManager.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'Q') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsVertSpeed = -settingsManager.fpsVertSpeed;
      isFPSVertSpeedLock = true;
    }
    if (cameraManager.cameraType.current === cameraManager.cameraType.satellite || cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
      fpsRotateRate = settingsManager.fpsRotateRate / cameraManager.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'E') {
    if (cameraManager.cameraType.current === cameraManager.cameraType.fps) {
      fpsVertSpeed = settingsManager.fpsVertSpeed;
      isFPSVertSpeedLock = true;
    }
    if (cameraManager.cameraType.current === cameraManager.cameraType.satellite || cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
      fpsRotateRate = -settingsManager.fpsRotateRate / cameraManager.speedModifier;
    }
  }
};

export { cameraManager, camPitch, camYaw, mouseX, mouseY, screenDragPoint };
