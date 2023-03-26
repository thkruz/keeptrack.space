import { ColorInformation, Pickable, colorSchemeManager } from '../colorSchemeManager';

import { SatObject } from '@app/js/api/keepTrackTypes';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const rcsRules = (sat: SatObject): ColorInformation => { // NOSONAR
  const rcs: number = parseFloat(sat.rcs);
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
  if ((typeof rcs === 'undefined' || isNaN(rcs) || rcs === null || typeof sat.rcs === 'undefined' || sat.rcs === 'N/A') && colorSchemeManager.objectTypeFlags.rcsUnknown === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (rcs < 0.01) {
    return {
      color: colorSchemeManager.colorTheme.rcsXXSmall,
      pickable: Pickable.Yes,
    };
  }
  if (rcs >= 0.01 && rcs <= 0.05) {
    return {
      color: colorSchemeManager.colorTheme.rcsXSmall,
      pickable: Pickable.Yes,
    };
  }
  if (rcs >= 0.05 && rcs <= 0.1) {
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
