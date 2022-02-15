import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
export const groupRules = (sat: SatObject): ColorInformation => { // NOSONAR
  // Glitch in the Matrix
  // if (groupsManager.selectedGroup === null) return;
  // Show Things in the Group
  if (sat.isInGroup) {
    return {
      color: colorSchemeManager.colorTheme.inGroup,
      pickable: Pickable.Yes,
    };
  }
  // Show Markers But Don't Allow Them To Be Selected
  if (sat.marker) {
    return {
      color: colorSchemeManager.colorTheme.marker[0],
      marker: true,
      pickable: Pickable.No,
    };
  }

  if (sat.static && sat.type === SpaceObjectType.STAR) {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: Pickable.Yes,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: Pickable.Yes,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: Pickable.Yes,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
  }

  // Hide Everything Else
  return {
    color: colorSchemeManager.colorTheme.transparent,
    pickable: Pickable.No,
  };
};
