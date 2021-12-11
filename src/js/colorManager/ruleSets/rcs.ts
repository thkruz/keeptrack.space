import { SatObject } from '@app/js/api/keepTrack';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const rcsRules = (sat: SatObject): ColorInformation => {
  const rcs: number = parseFloat(sat.R);
  if (rcs < 0.1 && colorSchemeManager.objectTypeFlags.rcsSmall === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (rcs >= 0.1 && rcs <= 1 && colorSchemeManager.objectTypeFlags.rcsMed === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (rcs > 1 && colorSchemeManager.objectTypeFlags.rcsLarge === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if ((typeof rcs === 'undefined' || rcs === null || typeof sat.R === 'undefined' || sat.R === 'N/A') && colorSchemeManager.objectTypeFlags.rcsUnknown === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (rcs < 0.1) {
    return {
      color: colorSchemeManager.colorTheme.rcsSmall,
      pickable: Pickable.Yes,
    };
  }
  if (rcs >= 0.1 && rcs <= 1) {
    return {
      color: colorSchemeManager.colorTheme.rcsMed,
      pickable: Pickable.Yes,
    };
  }
  if (rcs > 1) {
    return {
      color: colorSchemeManager.colorTheme.rcsLarge,
      pickable: Pickable.Yes,
    };
  }
  // Unknowns
  return {
    color: colorSchemeManager.colorTheme.rcsUnknown,
    pickable: Pickable.Yes,
  };
};
