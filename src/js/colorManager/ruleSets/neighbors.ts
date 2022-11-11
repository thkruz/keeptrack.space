import { ColorInformation, Pickable, colorSchemeManager } from '../colorSchemeManager';

import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const neighborsRules = (sat: SatObject, params: any): ColorInformation => { // NOSONAR
  // Hover and Select code might not pass params, so we will handle that here
  // TODO: Hover and select code should be refactored to pass params
  if (!params) {
    const {satSet} = keepTrackApi.programs;    
    params = {
      orbitDensity: satSet.orbitDensity,
      orbitDensityMax: satSet.orbitDensityMax,
    };
  }  
  
  // Objects beyond sensor coverage are hidden
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
  if (sat.missile) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }

  if (sat.type === SpaceObjectType.PAYLOAD) {
    if (colorSchemeManager.objectTypeFlags.densityPayload) {
      return {
        color: settingsManager.colors.densityPayload,
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

  const orbitDensity = params.orbitDensity[Math.round(sat.inclination)][Math.round(sat.period)];
  const density = (orbitDensity / params.orbitDensityMax);

  if (colorSchemeManager.objectTypeFlags.densityHi && density > 0.9) {
    return {
      color: settingsManager.colors.densityHi,
      pickable: Pickable.Yes,
    };  
  } else if (colorSchemeManager.objectTypeFlags.densityMed && density > 0.55) {
    return {
      color: settingsManager.colors.densityMed,
      pickable: Pickable.Yes,
    };  
  } else if (colorSchemeManager.objectTypeFlags.densityLow && density > 0.35) {
    return {
      color: settingsManager.colors.densityLow,
      pickable: Pickable.Yes,
    };  
  } else if (colorSchemeManager.objectTypeFlags.densityOther) {
    return {
      color: settingsManager.colors.densityOther,
      pickable: Pickable.Yes,
    };  
  }

  // Deselected
  return {
    color: colorSchemeManager.colorTheme.deselected,
    pickable: Pickable.No,
  };
};
