import { SatObject } from '@app/js/api/keepTrack';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const smallsatsRules = (sat: SatObject): ColorInformation => {
  if (sat.OT === 1 && colorSchemeManager.objectTypeFlags.satSmall === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (parseFloat(sat.R) < 0.1 && sat.OT === 1) {
    return {
      color: colorSchemeManager.colorTheme.satSmall,
      pickable: Pickable.Yes,
    };
  } else {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }
};
