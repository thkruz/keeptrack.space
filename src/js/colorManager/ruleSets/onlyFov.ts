import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const onlyFovRules = (sat: SatObject): ColorInformation => {
  if (keepTrackApi.programs.dotsManager.inViewData[sat.id] === 1) {
    return {
      color: colorSchemeManager.colorTheme.inFOV,
      pickable: Pickable.Yes,
    };
  } else {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }
};
