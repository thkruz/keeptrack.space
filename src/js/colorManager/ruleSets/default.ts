import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
export const defaultRules = (sat: SatObject): ColorInformation => { // NOSONAR
  // NOTE: The order of these checks is important
  // Grab reference to outside managers for their functions
  const { mainCamera, sensorManager, objectManager, satSet } = keepTrackApi.programs;
  let color;

  // Always show stars unless they are disabled
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
        // color: colorSchemeManager.colorTheme.deselected,
        color: [1, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
  }

  // If we are in astronomy mode, hide everything that isn't a star (above)
  if (mainCamera.cameraType.current === mainCamera.cameraType.Astronomy) {
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
      // If the facility flag is off then we don't want to show this
      if (colorSchemeManager.objectTypeFlags.facility === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
        return {
          color: colorSchemeManager.colorTheme.deselected,
          pickable: Pickable.No,
        };
        // Otherwise we want to show it
      } else {
        return {
          color: colorSchemeManager.colorTheme.starHi,
          pickable: Pickable.Yes,
        };
      }
    case SpaceObjectType.LAUNCH_AGENCY:
    case SpaceObjectType.LAUNCH_SITE:
    case SpaceObjectType.LAUNCH_POSITION:
      // If the facility flag is off then we don't want to show this
      if (colorSchemeManager.objectTypeFlags.facility === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
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

  if (sat.marker) {
    // This doesn't apply to sat overfly mode
    if (!settingsManager.isSatOverflyModeOn) {
      // But it doesn't work if we don't have marker info from the sensor
      if (typeof colorSchemeManager.iSensor !== 'undefined' && typeof satSet.satSensorMarkerArray !== 'undefined') {
        // if we have sensor markers enabled then we need to rotate colors as the marker numbers increase
        if (sat.id === satSet.satSensorMarkerArray[colorSchemeManager.iSensor + 1]) {
          colorSchemeManager.iSensor++;
        }
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

  if (sat.isRadarData && !colorSchemeManager.objectTypeFlags.radarData) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (sat.isRadarData) {
    if (sat.missileComplex >= 0) {
      // || sat.missileObject >= 0
      return {
        color: colorSchemeManager.colorTheme.radarDataMissile,
        pickable: Pickable.Yes,
      };
    }
    if (parseInt(sat.sccNum) >= 0) {
      return {
        color: colorSchemeManager.colorTheme.radarDataSatellite,
        pickable: Pickable.Yes,
      };
    }
    return {
      color: colorSchemeManager.colorTheme.radarData,
      pickable: Pickable.Yes,
    };
  }

  if (sat.static && (colorSchemeManager.objectTypeFlags.sensor === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium)) {
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
  if (sat.missile && sat.inView === 0) {
    if (sat.missile && colorSchemeManager.objectTypeFlags.missile === false) {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: Pickable.No,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.missile,
        pickable: Pickable.Yes,
      };
    }
  }
  if (sat.missile && sat.inView === 1) {
    if (sat.missile && colorSchemeManager.objectTypeFlags.missileInview === false) {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: Pickable.No,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.missileInview,
        pickable: Pickable.Yes,
      };
    }
  }

  if (
    (sat.inView === 0 && sat.type === SpaceObjectType.PAYLOAD && colorSchemeManager.objectTypeFlags.payload === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.type === SpaceObjectType.PAYLOAD && colorSchemeManager.objectTypeFlags.payload === false) ||
    (objectManager.isSensorManagerLoaded &&
      sensorManager.currentSensor[0].type == SpaceObjectType.OBSERVER &&
      typeof sat.vmag == 'undefined' &&
      sat.type === SpaceObjectType.PAYLOAD &&
      colorSchemeManager.objectTypeFlags.payload === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (
    (sat.inView === 0 && sat.type === SpaceObjectType.ROCKET_BODY && colorSchemeManager.objectTypeFlags.rocketBody === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.type === SpaceObjectType.ROCKET_BODY && colorSchemeManager.objectTypeFlags.rocketBody === false) ||
    (objectManager.isSensorManagerLoaded &&
      sensorManager.currentSensor[0].type == SpaceObjectType.OBSERVER &&
      typeof sat.vmag == 'undefined' &&
      sat.type === SpaceObjectType.ROCKET_BODY &&
      colorSchemeManager.objectTypeFlags.rocketBody === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (
    (sat.inView === 0 && sat.type === SpaceObjectType.DEBRIS && colorSchemeManager.objectTypeFlags.debris === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.type === SpaceObjectType.DEBRIS && colorSchemeManager.objectTypeFlags.debris === false) ||
    (objectManager.isSensorManagerLoaded &&
      sensorManager.currentSensor[0].type == SpaceObjectType.OBSERVER &&
      typeof sat.vmag == 'undefined' &&
      sat.type === SpaceObjectType.DEBRIS &&
      colorSchemeManager.objectTypeFlags.debris === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  // NOTE: Treat TBA Satellites as SPECIAL if SCC NUM is less than 70000 (ie a real satellite)
  if (
    (sat.inView === 0 && (sat.type === SpaceObjectType.SPECIAL || (parseInt(sat.sccNum) < 70000 && sat.type === SpaceObjectType.UNKNOWN)) && colorSchemeManager.objectTypeFlags.trusat === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && (sat.type === SpaceObjectType.SPECIAL || (parseInt(sat.sccNum) < 70000 && sat.type === SpaceObjectType.UNKNOWN)) && colorSchemeManager.objectTypeFlags.trusat === false) ||
    (objectManager.isSensorManagerLoaded &&
      sensorManager.currentSensor[0].type == SpaceObjectType.OBSERVER &&
      typeof sat.vmag == 'undefined' &&
      sat.type === SpaceObjectType.SPECIAL &&
      colorSchemeManager.objectTypeFlags.trusat === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  if (sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === false && mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  if (sat.inView === 1 && mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
    if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == SpaceObjectType.OBSERVER && typeof sat.vmag == 'undefined') {
      // Intentional
    } else {
      return {
        color: colorSchemeManager.colorTheme.inFOV,
        pickable: Pickable.Yes,
      };
    }
  }

  if (sat.country === 'ANALSAT') {
    color = colorSchemeManager.colorTheme.analyst;
  } else if (sat.type === SpaceObjectType.PAYLOAD) {
    // Payload
    color = colorSchemeManager.colorTheme.payload;
  } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
    // Rocket Body
    color = colorSchemeManager.colorTheme.rocketBody;
  } else if (sat.type === SpaceObjectType.DEBRIS) {
    // Debris
    color = colorSchemeManager.colorTheme.debris;
  } else if ((sat.type === SpaceObjectType.SPECIAL || (parseInt(sat.sccNum) < 70000 && sat.type === SpaceObjectType.UNKNOWN))) {
    // TruSat Object
    color = colorSchemeManager.colorTheme.trusat;
  } else {
    color = colorSchemeManager.colorTheme.unknown;
  }

  if (typeof color == 'undefined') {
    // Shouldn't be getting here
    console.warn(sat.id);
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }
  return {
    color: color,
    pickable: Pickable.Yes,
  };
};
