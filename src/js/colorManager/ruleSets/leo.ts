import { ColorInformation, Pickable, colorSchemeManager } from '../colorSchemeManager';

import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const leoRules = (sat: SatObject): ColorInformation => { // NOSONAR
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
  // Let's see if we can determine color based on the object type
  switch (sat.type) {
    case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
    case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
    case SpaceObjectType.PAYLOAD_OWNER:
    case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
    case SpaceObjectType.PAYLOAD_MANUFACTURER:
    case SpaceObjectType.LAUNCH_AGENCY:
    case SpaceObjectType.LAUNCH_SITE:
    case SpaceObjectType.LAUNCH_POSITION:
      if (!settingsManager.isShowAgencies) {        
        return {
          color: colorSchemeManager.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }else{
        return {
          color: colorSchemeManager.colorTheme.facility,
          pickable: Pickable.Yes,
        };
      }
    default: // Since it wasn't one of those continue on
  }

  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: Pickable.Yes,
    };
  }

  var ap = sat.apogee;
  if (ap > 2000) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  } else {
    if (keepTrackApi.programs.dotsManager.inViewData[sat.id] === 1 && colorSchemeManager.objectTypeFlags.inFOV === true) {
      return {
        color: colorSchemeManager.colorTheme.inFOV,
        pickable: Pickable.Yes,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.satLEO,
        pickable: Pickable.Yes,
      };
    }
  }
};
