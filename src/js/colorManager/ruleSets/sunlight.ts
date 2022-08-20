import { ColorInformation, Pickable, colorSchemeManager } from '../colorSchemeManager';

import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const sunlightRules = (sat: SatObject): ColorInformation => { // NOSONAR
  const { satSet, dotsManager } = keepTrackApi.programs;

  if (sat.static && (sat.type === SpaceObjectType.LAUNCH_FACILITY || sat.type === SpaceObjectType.CONTROL_FACILITY) && colorSchemeManager.objectTypeFlags.facility === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
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
      // If the facility flag is off then we don't want to show this
      if (colorSchemeManager.objectTypeFlags.facility === false || !settingsManager.isShowAgencies) {
        return {
          color: colorSchemeManager.colorTheme.deselected,
          pickable: Pickable.No,
        };
        // Otherwise we want to show it
      } else {
        return {
          color: colorSchemeManager.colorTheme.facility,
          pickable: Pickable.Yes,
        };
      }
    default: // Since it wasn't one of those continue on
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

  if (sat.marker) {
    if (typeof colorSchemeManager.iSensor !== 'undefined' && typeof satSet.satSensorMarkerArray !== 'undefined') {
      if (sat.id === satSet.satSensorMarkerArray[colorSchemeManager.iSensor + 1]) {
        colorSchemeManager.iSensor++;
      }
    }
    if (colorSchemeManager.iSensor >= 0) {
      return {
        color: colorSchemeManager.colorTheme.marker[colorSchemeManager.iSensor],
        marker: true,
        pickable: Pickable.No,
      };
    } else {
      return {
        // Failsafe
        color: colorSchemeManager.colorTheme.marker[0],
        marker: true,
        pickable: Pickable.No,
      };
    }
  }

  if (sat.static && colorSchemeManager.objectTypeFlags.sensor === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: Pickable.Yes,
    };
  }
  if (sat.missile && dotsManager.inViewData[sat.id] === 0) {
    return {
      color: colorSchemeManager.colorTheme.missile,
      pickable: Pickable.Yes,
    };
  }
  if (sat.missile && dotsManager.inViewData[sat.id] === 1) {
    return {
      color: colorSchemeManager.colorTheme.missileInview,
      pickable: Pickable.Yes,
    };
  }

  if (dotsManager.inViewData[sat.id] === 1 && dotsManager.inSunData[sat.id] > 0 && colorSchemeManager.objectTypeFlags.inFOV === true) {
    if (typeof sat.vmag == 'undefined') {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    return {
      color: colorSchemeManager.colorTheme.sunlightInview,
      pickable: Pickable.Yes,
    };
  }

  if (dotsManager.inViewData[sat.id] === 0 && typeof sat.vmag !== 'undefined') {
    if (dotsManager.inSunData[sat.id] == 2 && colorSchemeManager.objectTypeFlags.satHi === true) {
      // If vmag is undefined color it like a star
      if (sat.vmag < 3) {
        return {
          color: colorSchemeManager.colorTheme.starHi,
          pickable: Pickable.Yes,
        };
      }
      if (sat.vmag <= 4.5) {
        return {
          color: colorSchemeManager.colorTheme.starMed,
          pickable: Pickable.Yes,
        };
      }
      if (sat.vmag > 4.5) {
        return {
          color: colorSchemeManager.colorTheme.starLow,
          pickable: Pickable.Yes,
        };
      }
    }

    if (dotsManager.inSunData[sat.id] == 1 && colorSchemeManager.objectTypeFlags.satMed === true) {
      return {
        color: colorSchemeManager.colorTheme.penumbral,
        pickable: Pickable.Yes,
      };
    }

    if (dotsManager.inSunData[sat.id] == 0 && colorSchemeManager.objectTypeFlags.satLow === true) {
      return {
        color: colorSchemeManager.colorTheme.umbral,
        pickable: Pickable.Yes,
      };
    }
    // Not in the vmag database
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  return {
    color: colorSchemeManager.colorTheme.deselected,
    pickable: Pickable.No,
  };
};
