import { SatObject } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
export const velocityRules = (sat: SatObject): ColorInformation => { // NOSONAR
  // Stars
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

  // Sensors
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: Pickable.Yes,
    };
  }
  if (sat.inView === 1) {
    if (colorSchemeManager.objectTypeFlags.inViewAlt === false) {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: Pickable.No,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.inFOVAlt,
        pickable: Pickable.Yes,
      };
    }
  }
  if (sat.velocity.total > 5.5 && colorSchemeManager.objectTypeFlags.velocityFast === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (sat.velocity.total >= 2.5 && sat.velocity.total <= 5.5 && colorSchemeManager.objectTypeFlags.velocityMed === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (sat.velocity.total < 2.5 && colorSchemeManager.objectTypeFlags.velocitySlow === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  /*
  NOTE: Removed variable declaration to reduce garbage collection
 
  const gradientAmt = Math.min(sat.velocity.total / 15, 1.0);
  const velGradient = [1.0 - gradientAmt, gradientAmt, 0.0, 1.0];
  return {
    color: velGradient
    pickable: Pickable.Yes,
  };
  */
  return {
    color: [1.0 - Math.min(sat.velocity.total / 15, 1.0), Math.min(sat.velocity.total / 15, 1.0), 0.0, 1.0],
    pickable: Pickable.Yes,
  };
};
