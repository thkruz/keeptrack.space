import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
export const lostobjectsRules = (sat: SatObject): ColorInformation => { // NOSONAR
  const { timeManager, satellite } = keepTrackApi.programs;

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
      return {
        color: colorSchemeManager.colorTheme.facility,
        pickable: Pickable.Yes,
      };
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

  const now = new Date();
  const jday = timeManager.getDayOfYear(now);
  const year = now.getUTCFullYear().toString().substr(2, 2);
  let daysold;
  if (sat.TLE1.substr(18, 2) === year) {
    daysold = jday - parseInt(sat.TLE1.substr(20, 3));
  } else {
    daysold = jday - parseInt(sat.TLE1.substr(20, 3)) + parseInt(sat.TLE1.substr(17, 2)) * 365;
  }
  if (sat.perigee > satellite.obsmaxrange || daysold < settingsManager.daysUntilObjectLost) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  } else {
    settingsManager.lostSatStr += settingsManager.lostSatStr === '' ? sat.sccNum : `,${sat.sccNum}`;
    return {
      color: colorSchemeManager.colorTheme.lostobjects,
      pickable: Pickable.Yes,
    };
  }
};
