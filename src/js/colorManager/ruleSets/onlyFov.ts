import { SatObject } from '@app/js/api/keepTrack';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const onlyFovRules = (sat: SatObject): ColorInformation => {
  if (sat.inView === 1) {
    return {
      color: colorSchemeManager.colorTheme.inView,
      pickable: Pickable.Yes,
    };
  } else {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }
};
