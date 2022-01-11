import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { isDebrisOff, isInViewOff, isPayloadOff, isRocketBodyOff } from '../colorManager/colorSchemeManager';

let demoModeLastTime = 0;
export const demoMode = () => {
  const { drawManager, mainCamera, objectManager, sensorManager, timeManager, orbitManager, satSet } = keepTrackApi.programs;

  if (objectManager?.isSensorManagerLoaded && sensorManager?.currentSensor[0]?.lat === null) return;
  if (timeManager.realTime - demoModeLastTime < settingsManager.demoModeInterval) return;

  drawManager.demoModeLast = timeManager.realTime;
  drawManager.demoModeSatellite = drawManager.demoModeSatellite === satSet.satData.length ? 0 : drawManager.demoModeSatellite;

  let satData = satSet.satData;
  for (let i = drawManager.demoModeSatellite; i < satData.length; i++) {
    const sat = satData[i];
    if (isPayloadOff(sat) || isRocketBodyOff(sat) || isDebrisOff(sat) || isInViewOff(sat) || sat.static || sat.missile) continue;

    const satScreenPositionArray = satSet.getScreenCoords(i, drawManager.pMatrix, mainCamera.camMatrix);
    if (
      satScreenPositionArray.error ||
      typeof satScreenPositionArray.x == 'undefined' ||
      typeof satScreenPositionArray.y == 'undefined' ||
      satScreenPositionArray.x > window.innerWidth ||
      satScreenPositionArray.y > window.innerHeight
    ) {
      continue;
    }

    drawManager.hoverBoxOnSat(i, satScreenPositionArray.x, satScreenPositionArray.y);
    orbitManager.setSelectOrbit(i);
    drawManager.demoModeSatellite = i + 1;
    return;
  }
};
