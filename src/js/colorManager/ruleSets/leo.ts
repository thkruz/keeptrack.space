import { SatObject } from '@app/js/api/keepTrack';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const leoRules = (sat: SatObject): ColorInformation => {
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

  var ap = sat.apogee;
  if (ap > 2000) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  } else {
    if (sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === true) {
      return {
        color: colorSchemeManager.colorTheme.inView,
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
