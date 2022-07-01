import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { updateInterval } from './uiManager';

export const updateSelectBox = () => {
  const { objectManager, satSet, timeManager } = keepTrackApi.programs;

  // IDEA: Include updates when satellite edited regardless of time.
  // Don't update if no object is selected
  if (objectManager.selectedSat === -1) return;

  const sat = satSet.getSat(objectManager.selectedSat);

  // Don't bring up the update box for static dots
  if (typeof sat === 'undefined' || sat.static) return;

  if (timeManager.realTime * 1 > settingsManager.lastBoxUpdateTime * 1 + updateInterval) {
    keepTrackApi.methods.updateSelectBox(sat);
    settingsManager.lastBoxUpdateTime = timeManager.realTime;
  }
};
