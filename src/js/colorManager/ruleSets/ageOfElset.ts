import { SatObject } from '@app/js/api/keepTrack';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const ageOfElsetRules = (sat: SatObject): ColorInformation => {
  const { timeManager } = keepTrackApi.programs;

  // Objects beyond sensor coverage are hidden
  if (sat.static && sat.type === 'Star') {
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
    case 'Intergovernmental Organization':
    case 'Suborbital Payload Operator':
    case 'Payload Owner':
    case 'Meteorological Rocket Launch Agency or Manufacturer':
    case 'Payload Manufacturer':
    case 'Launch Agency':
    case 'Launch Site':
    case 'Launch Position':
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

  let now = new Date();
  const jday = timeManager.getDayOfYear(now);
  const year = now.getFullYear().toString().substr(2, 2);
  let daysold;
  if (sat.TLE1.substr(18, 2) === year) {
    daysold = jday - parseInt(sat.TLE1.substr(20, 3));
  } else {
    daysold = jday + parseInt(year) * 365 - (parseInt(sat.TLE1.substr(18, 2)) * 365 + parseInt(sat.TLE1.substr(20, 3)));
  }

  if (daysold < 3 && colorSchemeManager.objectTypeFlags.ageNew) {
    return {
      color: colorSchemeManager.colorTheme.ageNew,
      pickable: Pickable.Yes,
    };
  }

  if (daysold >= 3 && daysold < 14 && colorSchemeManager.objectTypeFlags.ageMed) {
    return {
      color: colorSchemeManager.colorTheme.ageMed,
      pickable: Pickable.Yes,
    };
  }
  if (daysold >= 14 && daysold < 60 && colorSchemeManager.objectTypeFlags.ageOld) {
    return {
      color: colorSchemeManager.colorTheme.ageOld,
      pickable: Pickable.Yes,
    };
  }
  if (daysold >= 60 && colorSchemeManager.objectTypeFlags.ageLost) {
    return {
      color: colorSchemeManager.colorTheme.ageLost,
      pickable: Pickable.Yes,
    };
  }

  // Deselected
  return {
    color: colorSchemeManager.colorTheme.deselected,
    pickable: Pickable.No,
  };
};
