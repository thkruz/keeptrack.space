import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

export const keyHandler = (evt: KeyboardEvent) => { // NOSONAR
  // Error Handling
  if (typeof evt.key == 'undefined') return;
  const { mainCamera, timeManager, uiManager, drawManager, objectManager, orbitManager, sensorManager } = keepTrackApi.programs;

  if (uiManager.isCurrentlyTyping) return;
  switch (evt.key.toUpperCase()) {
    case 'R':
      mainCamera.autoRotate();
      break;
    case 'C':
      mainCamera.changeCameraType(orbitManager, drawManager, objectManager, sensorManager);

      switch (mainCamera.cameraType.current) {
        case mainCamera.cameraType.Default:
          uiManager.toast('Earth Centered Camera Mode', 'standby');
          mainCamera.zoomTarget(0.5);
          break;
        case mainCamera.cameraType.Offset:
          uiManager.toast('Offset Camera Mode', 'standby');
          break;
        case mainCamera.cameraType.Fps:
          uiManager.toast('Free Camera Mode', 'standby');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
        case mainCamera.cameraType.Planetarium:
          uiManager.toast('Planetarium Camera Mode', 'standby');
          uiManager.legendMenuChange('planetarium');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
        case mainCamera.cameraType.Satellite:
          uiManager.toast('Satellite Camera Mode', 'standby');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
        case mainCamera.cameraType.Astronomy:
          uiManager.toast('Astronomy Camera Mode', 'standby');
          uiManager.legendMenuChange('astronomy');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
      }
      break;
    // Open the search bar for faster searching
    // TODO: What if it isn't available?
    case 'F':
      if (mainCamera.isShiftPressed) {
        evt.preventDefault();
        uiManager.searchToggle(true);
        $('#search').trigger('focus');
        mainCamera.isShiftPressed = false;
      }
      break;
    // Hide the UI
    case 'H':
      if (mainCamera.isShiftPressed) {
        uiManager.hideUi();
        mainCamera.isShiftPressed = false;
      }
      break;
  }

  switch (evt.key) {
    case '!':
      timeManager.changeStaticOffset(0); // Reset to Current Time
      settingsManager.isPropRateChange = true;
      break;
    case ',':
      timeManager.calculateSimulationTime();
      timeManager.changeStaticOffset(timeManager.staticOffset - 1000 * 60); // Move back a Minute
      settingsManager.isPropRateChange = true;
      keepTrackApi.methods.updateDateTime(new Date(timeManager.dynamicOffsetEpoch + timeManager.staticOffset));
      break;
    case '.':
      timeManager.calculateSimulationTime();
      timeManager.changeStaticOffset(timeManager.staticOffset + 1000 * 60); // Move forward a Minute
      settingsManager.isPropRateChange = true;
      keepTrackApi.methods.updateDateTime(new Date(timeManager.dynamicOffsetEpoch + timeManager.staticOffset));
      break;
    case '<':
      timeManager.calculateSimulationTime();
      timeManager.changeStaticOffset(timeManager.staticOffset - 4000 * 60); // Move back 4 Minutes
      settingsManager.isPropRateChange = true;
      keepTrackApi.methods.updateDateTime(new Date(timeManager.dynamicOffsetEpoch + timeManager.staticOffset));
      break;
    case '>':
      timeManager.calculateSimulationTime();
      timeManager.changeStaticOffset(timeManager.staticOffset + 4000 * 60); // Move forward 4 Minutes
      settingsManager.isPropRateChange = true;
      keepTrackApi.methods.updateDateTime(new Date(timeManager.dynamicOffsetEpoch + timeManager.staticOffset));
      break;
    case '0':
      timeManager.calculateSimulationTime();
      timeManager.changePropRate(0);
      settingsManager.isPropRateChange = true;
      break;
    case '+':
    case '=':
      timeManager.calculateSimulationTime();
      if (timeManager.propRate < 0.001 && timeManager.propRate > -0.001) {
        timeManager.changePropRate(0.001);
      }

      if (timeManager.propRate > 1000) {
        timeManager.changePropRate(1000);
      }

      if (timeManager.propRate < 0) {
        timeManager.changePropRate((timeManager.propRate * 2) / 3);
      } else {
        timeManager.changePropRate(timeManager.propRate * 1.5);
      }
      settingsManager.isPropRateChange = true;
      break;
    case '-':
    case '_':
      timeManager.calculateSimulationTime();
      if (timeManager.propRate < 0.001 && timeManager.propRate > -0.001) {
        timeManager.changePropRate(-0.001);
      }

      if (timeManager.propRate < -1000) {
        timeManager.changePropRate(-1000);
      }

      if (timeManager.propRate < 0) {
        timeManager.changePropRate(timeManager.propRate * 1.5);
      } else {
        timeManager.changePropRate((timeManager.propRate * 2) / 3);
      }
      settingsManager.isPropRateChange = true;
      break;
    case '1':
      timeManager.calculateSimulationTime();
      timeManager.changePropRate(1.0);
      settingsManager.isPropRateChange = true;
      break;
  }

  if (settingsManager.isPropRateChange) {
    timeManager.calculateSimulationTime();
    timeManager.synchronize();
    if (settingsManager.isPropRateChange && !settingsManager.isAlwaysHidePropRate && timeManager.propRate0 !== timeManager.propRate) {
      if (timeManager.propRate > 1.01 || timeManager.propRate < 0.99) {
        if (timeManager.propRate < 10) uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'standby');
        if (timeManager.propRate >= 10 && timeManager.propRate < 60) uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'caution');
        if (timeManager.propRate >= 60) uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'serious');
      } else {
        uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'normal');
      }
    }

    if (!settingsManager.disableUI) {
      if (!uiManager.createClockDOMOnce) {
        document.getElementById('datetime-text').innerText = timeManager.timeTextStr;
        uiManager.createClockDOMOnce = true;
      } else {
        document.getElementById('datetime-text').childNodes[0].nodeValue = timeManager.timeTextStr;
      }
    }
  }
};
