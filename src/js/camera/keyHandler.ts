import { camera } from './camera';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const keyUpHandler = (evt: KeyboardEvent) => { // NOSONAR
  // Error Handling
  if (typeof evt.key == 'undefined') return;
  const KEY_PRESSED = evt.key.toUpperCase();

  if (KEY_PRESSED === 'A' && camera.fpsSideSpeed === -settingsManager.fpsSideSpeed) {
    camera.isFPSSideSpeedLock = false;
  }
  if (KEY_PRESSED === 'D' && camera.fpsSideSpeed === settingsManager.fpsSideSpeed) {
    camera.isFPSSideSpeedLock = false;
  }
  if (KEY_PRESSED === 'S' && camera.fpsForwardSpeed === -settingsManager.fpsForwardSpeed) {
    camera.isFPSForwardSpeedLock = false;
  }
  if (KEY_PRESSED === 'W' && camera.fpsForwardSpeed === settingsManager.fpsForwardSpeed) {
    camera.isFPSForwardSpeedLock = false;
  }
  if (KEY_PRESSED === 'Q') {
    if (camera.fpsVertSpeed === -settingsManager.fpsVertSpeed) camera.isFPSVertSpeedLock = false;
    camera.fpsRotateRate = 0;
  }
  if (KEY_PRESSED === 'E') {
    if (camera.fpsVertSpeed === settingsManager.fpsVertSpeed) camera.isFPSVertSpeedLock = false;
    camera.fpsRotateRate = 0;
  }
  if (KEY_PRESSED === 'J' || KEY_PRESSED === 'L') {
    if (camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = 0;
    } else {
      camera.fpsYawRate = 0;
    }
  }
  if (KEY_PRESSED === 'I' || KEY_PRESSED === 'K') {
    camera.fpsPitchRate = 0;
  }

  if (KEY_PRESSED === 'SHIFT') {
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
  if (KEY_PRESSED === 'SHIFTRIGHT') {
    camera.isShiftPressed = false;
    camera.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    camera.speedModifier = 1;
  }
};

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const keyDownHandler = (evt: KeyboardEvent) => { // NOSONAR
  // Error Handling
  if (typeof evt.key == 'undefined') return;
  const KEY_PRESSED = evt.key.toUpperCase();

  if (KEY_PRESSED === 'SHIFT') {
    camera.isShiftPressed = true;
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsRun = 0.05;
    }
    camera.speedModifier = 8;
    settingsManager.cameraMovementSpeed = 0.003 / 8;
    settingsManager.cameraMovementSpeedMin = 0.005 / 8;
  }
  if (KEY_PRESSED === 'SHIFTRIGHT') {
    camera.isShiftPressed = true;
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsRun = 3;
    }
  }
  if (KEY_PRESSED === 'W') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsForwardSpeed = settingsManager.fpsForwardSpeed;
      camera.isFPSForwardSpeedLock = true;
    }
  }
  if (KEY_PRESSED === 'A') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsSideSpeed = -settingsManager.fpsSideSpeed;
      camera.isFPSSideSpeedLock = true;
    }
  }
  if (KEY_PRESSED === 'S') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
      camera.isFPSForwardSpeedLock = true;
    }
  }
  if (KEY_PRESSED === 'D') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsSideSpeed = settingsManager.fpsSideSpeed;
      camera.isFPSSideSpeedLock = true;
    }
  }
  if (KEY_PRESSED === 'I') {
    if (
      camera.cameraType.current === camera.cameraType.Fps ||
      camera.cameraType.current === camera.cameraType.Satellite ||
      camera.cameraType.current === camera.cameraType.Astronomy
    ) {
      camera.fpsPitchRate = settingsManager.fpsPitchRate / camera.speedModifier;
    }
  }
  if (KEY_PRESSED === 'K') {
    if (
      camera.cameraType.current === camera.cameraType.Fps ||
      camera.cameraType.current === camera.cameraType.Satellite ||
      camera.cameraType.current === camera.cameraType.Astronomy
    ) {
      camera.fpsPitchRate = -settingsManager.fpsPitchRate / camera.speedModifier;
    }
  }
  if (KEY_PRESSED === 'J') {
    if (camera.cameraType.current === camera.cameraType.Fps || camera.cameraType.current === camera.cameraType.Satellite) {
      camera.fpsYawRate = -settingsManager.fpsYawRate / camera.speedModifier;
    }
    if (camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
  if (KEY_PRESSED === 'L') {
    if (camera.cameraType.current === camera.cameraType.Fps || camera.cameraType.current === camera.cameraType.Satellite) {
      camera.fpsYawRate = settingsManager.fpsYawRate / camera.speedModifier;
    }
    if (camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = -settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
  if (KEY_PRESSED === 'Q') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsVertSpeed = -settingsManager.fpsVertSpeed;
      camera.isFPSVertSpeedLock = true;
    }
    if (camera.cameraType.current === camera.cameraType.Satellite || camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
  if (KEY_PRESSED === 'E') {
    if (camera.cameraType.current === camera.cameraType.Fps) {
      camera.fpsVertSpeed = settingsManager.fpsVertSpeed;
      camera.isFPSVertSpeedLock = true;
    }
    if (camera.cameraType.current === camera.cameraType.Satellite || camera.cameraType.current === camera.cameraType.Astronomy) {
      camera.fpsRotateRate = -settingsManager.fpsRotateRate / camera.speedModifier;
    }
  }
};
