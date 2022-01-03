import { camera } from './camera';

export const keyUpHandler = (evt: KeyboardEvent) => {
  // Error Handling
  if (typeof evt.key == 'undefined') return;

  if (evt.key.toUpperCase() === 'A' && camera.fpsSideSpeed === -settingsManager.fpsSideSpeed) {
    camera.isFPSSideSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'D' && camera.fpsSideSpeed === settingsManager.fpsSideSpeed) {
    camera.isFPSSideSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'S' && camera.fpsForwardSpeed === -settingsManager.fpsForwardSpeed) {
    camera.isFPSForwardSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'W' && camera.fpsForwardSpeed === settingsManager.fpsForwardSpeed) {
    camera.isFPSForwardSpeedLock = false;
  }
  if (evt.key.toUpperCase() === 'Q') {
    if (camera.fpsVertSpeed === -settingsManager.fpsVertSpeed) camera.isFPSVertSpeedLock = false;
    camera.fpsRotateRate = 0;
  }
  if (evt.key.toUpperCase() === 'E') {
    if (camera.fpsVertSpeed === settingsManager.fpsVertSpeed) camera.isFPSVertSpeedLock = false;
    camera.fpsRotateRate = 0;
  }
  if (evt.key.toUpperCase() === 'J' || evt.key.toUpperCase() === 'L') {
    if (camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = 0;
    } else {
      camera.fpsYawRate = 0;
    }
  }
  if (evt.key.toUpperCase() === 'I' || evt.key.toUpperCase() === 'K') {
    camera.fpsPitchRate = 0;
  }

  if (evt.key.toUpperCase() === 'SHIFT') {
    camera.isShiftPressed = false;
    camera.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    camera.speedModifier = 1;
    if (!camera.isFPSForwardSpeedLock) camera.fpsForwardSpeed = 0;
    if (!camera.isFPSSideSpeedLock) camera.fpsSideSpeed = 0;
    if (!camera.isFPSVertSpeedLock) camera.fpsVertSpeed = 0;
  }
  // Applies to _keyDownHandler as well
  if (evt.key === 'ShiftRight') {
    camera.isShiftPressed = false;
    camera.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    camera.speedModifier = 1;
  }
};

export const keyDownHandler = (evt: KeyboardEvent) => {
  // Error Handling
  if (typeof evt.key == 'undefined') return;

  if (evt.key.toUpperCase() === 'SHIFT') {
    camera.isShiftPressed = true;
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsRun = 0.05;
    }
    camera.speedModifier = 8;
    settingsManager.cameraMovementSpeed = 0.003 / 8;
    settingsManager.cameraMovementSpeedMin = 0.005 / 8;
  }
  if (evt.key === 'ShiftRight') {
    camera.isShiftPressed = true;
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsRun = 3;
    }
  }
  if (evt.key.toUpperCase() === 'W') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsForwardSpeed = settingsManager.fpsForwardSpeed;
      camera.isFPSForwardSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'A') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsSideSpeed = -settingsManager.fpsSideSpeed;
      camera.isFPSSideSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'S') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
      camera.isFPSForwardSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'D') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsSideSpeed = settingsManager.fpsSideSpeed;
      camera.isFPSSideSpeedLock = true;
    }
  }
  if (evt.key.toUpperCase() === 'I') {
    if (
      camera.cameraType.current === camera.cameraType.Fps ||
      camera.cameraType.current === camera.cameraType.Satellite ||
      camera.cameraType.current === camera.cameraType.Astronomy
    ) {
      camera.fpsPitchRate = settingsManager.fpsPitchRate / camera.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'K') {
    if (
      camera.cameraType.current === camera.cameraType.Fps ||
      camera.cameraType.current === camera.cameraType.Satellite ||
      camera.cameraType.current === camera.cameraType.Astronomy
    ) {
      camera.fpsPitchRate = -settingsManager.fpsPitchRate / camera.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'J') {
    if (camera.cameraType.current === camera.cameraType.Fps || camera.cameraType.current === camera.cameraType.Satellite) {
      camera.fpsYawRate = -settingsManager.fpsYawRate / camera.speedModifier;
    }
    if (camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'L') {
    if (camera.cameraType.current === camera.cameraType.Fps || camera.cameraType.current === camera.cameraType.Satellite) {
      camera.fpsYawRate = settingsManager.fpsYawRate / camera.speedModifier;
    }
    if (camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = -settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'Q') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsVertSpeed = -settingsManager.fpsVertSpeed;
      camera.isFPSVertSpeedLock = true;
    }
    if (camera.cameraType.current === camera.cameraType.Satellite || camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
  if (evt.key.toUpperCase() === 'E') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsVertSpeed = settingsManager.fpsVertSpeed;
      camera.isFPSVertSpeedLock = true;
    }
    if (camera.cameraType.current === camera.cameraType.Satellite || camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = -settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
};
