// Copyright (C) 2016-2021 Theodore Kruczek
// Copyright (C) 2020 Heather Kruczek
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

import { Colors, SatObject } from '../api/keepTrack';
import { keepTrackApi } from '../api/keepTrackApi';
import { ColorScheme } from './color-scheme';

export interface ColorSchemeManager {
  pickableBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  init: () => void;
  colorTheme: Colors;
  resetObjectTypeFlags: () => void;
  reloadColors: () => void;
  default: ColorScheme;
  onlyFOV: ColorScheme;
  sunlight: ColorScheme;
  apogee: ColorScheme;
  smallsats: ColorScheme;
  rcs: ColorScheme;
  countries: ColorScheme;
  ageOfElset: ColorScheme;
  lostobjects: ColorScheme;
  leo: ColorScheme;
  geo: ColorScheme;
  velocity: ColorScheme;
  group: ColorScheme;
  objectTypeFlags: any;
  objectTypeFlagsinViewAlt: boolean;
}

export const colorSchemeManager: ColorSchemeManager = {
  objectTypeFlags: {
    payload: true,
    radarData: true,
    rocketBody: true,
    debris: true,
    facility: true,
    sensor: true,
    missile: true,
    missileInview: true,
    trusat: true,
    inFOV: true,
    inViewAlt: true,
    starLow: true,
    starMed: true,
    starHi: true,
    satLEO: true,
    satGEO: true,
    satLow: true,
    satMed: true,
    satHi: true,
    satSmall: true,
    rcsSmall: true,
    rcsMed: true,
    rcsLarge: true,
    rcsUnknown: true,
    velocitySlow: true,
    velocityMed: true,
    velocityFast: true,
    ageNew: true,
    ageMed: true,
    ageOld: true,
    ageLost: true,
    countryUS: true,
    countryPRC: true,
    countryCIS: true,
    countryOther: true,
  },
  init: () => {
    const { objectManager, satSet } = keepTrackApi.programs;
    const gl = keepTrackApi.programs.drawManager.gl;

    colorSchemeManager.colorTheme = settingsManager.colors;
    colorSchemeManager.resetObjectTypeFlags();

    colorSchemeManager.default = new ColorScheme(gl, satSet, objectManager, defaultRules);
    colorSchemeManager.onlyFOV = new ColorScheme(gl, satSet, objectManager, onlyFovRules);
    colorSchemeManager.sunlight = new ColorScheme(gl, satSet, objectManager, sunlightRules);
    colorSchemeManager.sunlight.isSunlightColorScheme = true;
    colorSchemeManager.apogee = new ColorScheme(gl, satSet, objectManager, apogeeRules);
    colorSchemeManager.smallsats = new ColorScheme(gl, satSet, objectManager, smallsatsRules);
    colorSchemeManager.rcs = new ColorScheme(gl, satSet, objectManager, rcsRules);
    colorSchemeManager.countries = new ColorScheme(gl, satSet, objectManager, countriesRules);
    colorSchemeManager.ageOfElset = new ColorScheme(gl, satSet, objectManager, ageOfElsetRules);
    colorSchemeManager.lostobjects = new ColorScheme(gl, satSet, objectManager, lostobjectsRules);
    colorSchemeManager.leo = new ColorScheme(gl, satSet, objectManager, leoRules);
    colorSchemeManager.geo = new ColorScheme(gl, satSet, objectManager, geoRules);
    colorSchemeManager.velocity = new ColorScheme(gl, satSet, objectManager, velocityRules);
    // Used When Displaying a Group/Search of Objects
    colorSchemeManager.group = new ColorScheme(gl, satSet, objectManager, groupRules);
  },
  resetObjectTypeFlags: () => {
    colorSchemeManager.objectTypeFlags.payload = true;
    colorSchemeManager.objectTypeFlags.radarData = true;
    colorSchemeManager.objectTypeFlags.rocketBody = true;
    colorSchemeManager.objectTypeFlags.debris = true;
    colorSchemeManager.objectTypeFlags.facility = true;
    colorSchemeManager.objectTypeFlags.sensor = true;
    colorSchemeManager.objectTypeFlags.missile = true;
    colorSchemeManager.objectTypeFlags.missileInview = true;
    colorSchemeManager.objectTypeFlags.trusat = true;
    colorSchemeManager.objectTypeFlags.inFOV = true;
    colorSchemeManager.objectTypeFlags.inViewAlt = true;
    colorSchemeManager.objectTypeFlags.starLow = true;
    colorSchemeManager.objectTypeFlags.starMed = true;
    colorSchemeManager.objectTypeFlags.starHi = true;
    colorSchemeManager.objectTypeFlags.satLEO = true;
    colorSchemeManager.objectTypeFlags.satGEO = true;
    colorSchemeManager.objectTypeFlags.satLow = true;
    colorSchemeManager.objectTypeFlags.satMed = true;
    colorSchemeManager.objectTypeFlags.satHi = true;
    colorSchemeManager.objectTypeFlags.satSmall = true;
    colorSchemeManager.objectTypeFlags.rcsSmall = true;
    colorSchemeManager.objectTypeFlags.rcsMed = true;
    colorSchemeManager.objectTypeFlags.rcsLarge = true;
    colorSchemeManager.objectTypeFlags.rcsUnknown = true;
    colorSchemeManager.objectTypeFlags.velocitySlow = true;
    colorSchemeManager.objectTypeFlags.velocityMed = true;
    colorSchemeManager.objectTypeFlags.velocityFast = true;
    colorSchemeManager.objectTypeFlags.ageNew = true;
    colorSchemeManager.objectTypeFlags.ageMed = true;
    colorSchemeManager.objectTypeFlags.ageOld = true;
    colorSchemeManager.objectTypeFlags.ageLost = true;
  },
  reloadColors: () => {
    colorSchemeManager.colorTheme = settingsManager.colors;
  },
  colorTheme: null,
  default: null,
  onlyFOV: null,
  sunlight: null,
  apogee: null,
  smallsats: null,
  rcs: null,
  countries: null,
  ageOfElset: null,
  lostobjects: null,
  leo: null,
  geo: null,
  velocity: null,
  group: null,
  objectTypeFlagsinViewAlt: false,
  pickableBuffer: null,
  colorBuffer: null,
};

export const defaultRules = (sat: SatObject) => {
  // NOTE: The order of these checks is important

  // Grab reference to outside managers for their functions
  const { mainCamera, sensorManager, objectManager, satSet } = keepTrackApi.programs;
  let color;

  // Always show stars unless they are disabled
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }

  // If we are in astronomy mode, hide everything that isn't a star (above)
  if (mainCamera.cameraType.current === mainCamera.cameraType.Astronomy) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }

  // Let's see if we can determine color based on the object type
  switch (sat.type) {
    case 'Intergovernmental Organization':
    case 'Suborbital Payload Operator':
    case 'Payload Owner':
    case 'Meteorological Rocket Launch Agency or Manufacturer':
    case 'Payload Manufacturer':
      // If the facility flag is off then we don't want to show this
      if (colorSchemeManager.objectTypeFlags.facility === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
        return {
          color: colorSchemeManager.colorTheme.deselected,
          pickable: false,
        };
        // Otherwise we want to show it
      } else {
        return {
          color: colorSchemeManager.colorTheme.starHi,
          pickable: true,
        };
      }
    case 'Launch Agency':
    case 'Launch Site':
    case 'Launch Position':
      // If the facility flag is off then we don't want to show this
      if (colorSchemeManager.objectTypeFlags.facility === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
        return {
          color: colorSchemeManager.colorTheme.deselected,
          pickable: false,
        };
        // Otherwise we want to show it
      } else {
        return {
          color: colorSchemeManager.colorTheme.facility,
          pickable: true,
        };
      }
    default: // Since it wasn't one of those continue on
  }

  if (sat.marker) {
    // This doesn't apply to sat overfly mode
    if (!settingsManager.isSatOverflyModeOn) {
      // But it doesn't work if we don't have marker info from the sensor
      if (typeof colorSchemeManager.default.iSensor !== 'undefined' && typeof satSet.satSensorMarkerArray !== 'undefined') {
        // if we have sensor markers enabled then we need to rotate colors as the marker numbers increase
        if (sat.id === satSet.satSensorMarkerArray[colorSchemeManager.default.iSensor + 1]) {
          colorSchemeManager.default.iSensor++;
        }
      }
    }
    if (colorSchemeManager.default.iSensor >= 0) {
      return {
        color: colorSchemeManager.colorTheme.marker[colorSchemeManager.default.iSensor],
        marker: true,
        pickable: false,
      };
    } else {
      return {
        // Failsafe
        color: colorSchemeManager.colorTheme.marker[0],
        marker: true,
        pickable: false,
      };
    }
  }

  if (sat.isRadarData && !colorSchemeManager.objectTypeFlags.radarData) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.isRadarData) {
    if (sat.missileComplex >= 0) {
      // || sat.missileObject >= 0
      return {
        color: colorSchemeManager.colorTheme.radarDataMissile,
        pickable: true,
      };
    }
    if (sat.satId >= 0) {
      return {
        color: colorSchemeManager.colorTheme.radarDataSatellite,
        pickable: true,
      };
    }
    return {
      color: colorSchemeManager.colorTheme.radarData,
      pickable: true,
    };
  }

  if (sat.static && (colorSchemeManager.objectTypeFlags.sensor === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium)) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile && sat.inView === 0) {
    if (sat.missile && colorSchemeManager.objectTypeFlags.missile === false) {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.missile,
        pickable: true,
      };
    }
  }
  if (sat.missile && sat.inView === 1) {
    if (sat.missile && colorSchemeManager.objectTypeFlags.missileInview === false) {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.missileInview,
        pickable: true,
      };
    }
  }

  if (
    (sat.inView === 0 && sat.OT === 1 && colorSchemeManager.objectTypeFlags.payload === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 1 && colorSchemeManager.objectTypeFlags.payload === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 1 && colorSchemeManager.objectTypeFlags.payload === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (
    (sat.inView === 0 && sat.OT === 2 && colorSchemeManager.objectTypeFlags.rocketBody === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 2 && colorSchemeManager.objectTypeFlags.rocketBody === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 2 && colorSchemeManager.objectTypeFlags.rocketBody === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (
    (sat.inView === 0 && sat.OT === 3 && colorSchemeManager.objectTypeFlags.debris === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 3 && colorSchemeManager.objectTypeFlags.debris === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 3 && colorSchemeManager.objectTypeFlags.debris === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (
    (sat.inView === 0 && sat.OT === 4 && colorSchemeManager.objectTypeFlags.trusat === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 4 && colorSchemeManager.objectTypeFlags.trusat === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 4 && colorSchemeManager.objectTypeFlags.trusat === false)
  ) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === false && mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.inView === 1 && mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
    if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined') {
      // Intentional
    } else {
      return {
        color: colorSchemeManager.colorTheme.inView,
        pickable: true,
      };
    }
  }

  if (sat.C === 'ANALSAT') {
    color = colorSchemeManager.colorTheme.analyst;
  } else if (sat.OT === 1) {
    // Payload
    color = colorSchemeManager.colorTheme.payload;
  } else if (sat.OT === 2) {
    // Rocket Body
    color = colorSchemeManager.colorTheme.rocketBody;
  } else if (sat.OT === 3) {
    // Debris
    color = colorSchemeManager.colorTheme.debris;
  } else if (sat.OT === 4) {
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
      pickable: false,
    };
  }
  return {
    color: color,
    pickable: true,
  };
};
export const sunlightRules = (sat: SatObject) => {
  const { satSet } = keepTrackApi.programs;

  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility') && colorSchemeManager.objectTypeFlags.facility === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: colorSchemeManager.colorTheme.facility,
      pickable: true,
    };
  }

  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }

  if (sat.marker) {
    if (typeof colorSchemeManager.default.iSensor !== 'undefined' && typeof satSet.satSensorMarkerArray !== 'undefined') {
      if (sat.id === satSet.satSensorMarkerArray[colorSchemeManager.sunlight.iSensor + 1]) {
        colorSchemeManager.sunlight.iSensor++;
      }
    }
    if (colorSchemeManager.sunlight.iSensor >= 0) {
      return {
        color: colorSchemeManager.colorTheme.marker[colorSchemeManager.sunlight.iSensor],
        marker: true,
        pickable: false,
      };
    } else {
      return {
        // Failsafe
        color: colorSchemeManager.colorTheme.marker[0],
        marker: true,
        pickable: false,
      };
    }
  }

  if (sat.static && colorSchemeManager.objectTypeFlags.sensor === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile && sat.inView === 0) {
    return {
      color: colorSchemeManager.colorTheme.missile,
      pickable: true,
    };
  }
  if (sat.missile && sat.inView === 1) {
    return {
      color: colorSchemeManager.colorTheme.missileInview,
      pickable: true,
    };
  }

  if (sat.inView === 1 && sat.inSun > 0 && colorSchemeManager.objectTypeFlags.inFOV === true) {
    if (typeof sat.vmag == 'undefined') {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
    return {
      color: colorSchemeManager.colorTheme.sunlightInview,
      pickable: true,
    };
  }

  if (sat.inView === 0 && typeof sat.vmag !== 'undefined') {
    if (sat.inSun == 2 && colorSchemeManager.objectTypeFlags.satHi === true) {
      // If vmag is undefined color it like a star
      if (sat.vmag < 3) {
        return {
          color: colorSchemeManager.colorTheme.starHi,
          pickable: true,
        };
      }
      if (sat.vmag <= 4.5) {
        return {
          color: colorSchemeManager.colorTheme.starMed,
          pickable: true,
        };
      }
      if (sat.vmag > 4.5) {
        return {
          color: colorSchemeManager.colorTheme.starLow,
          pickable: true,
        };
      }
    }

    if (sat.inSun == 1 && colorSchemeManager.objectTypeFlags.satMed === true) {
      return {
        color: colorSchemeManager.colorTheme.penumbral,
        pickable: true,
      };
    }

    if (sat.inSun == 0 && colorSchemeManager.objectTypeFlags.satLow === true) {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
    // Not in the vmag database
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }

  return {
    color: colorSchemeManager.colorTheme.deselected,
    pickable: false,
  };
};
export const onlyFovRules = (sat: SatObject) => {
  if (sat.inView === 1) {
    return {
      color: colorSchemeManager.colorTheme.inView,
      pickable: true,
    };
  } else {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: false,
    };
  }
};
/*
NOTE: Removed variable declaration to reduce garbage collection

const ap = sat.apogee;
const gradientAmt = Math.min(ap / 45000, 1.0);
const apogeeGradient = [1.0 - gradientAmt, gradientAmt, 0.0, 1.0];
return {
  color: apogeeGradient,
  pickable: true,
};
*/
export const apogeeRules = (sat: SatObject) => ({
  color: [1.0 - Math.min(sat.apogee / 45000, 1.0), Math.min(sat.apogee / 45000, 1.0), 0.0, 1.0],
  pickable: true,
});
export const smallsatsRules = (sat: SatObject) => {
  if (sat.OT === 1 && colorSchemeManager.objectTypeFlags.satSmall === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (parseFloat(sat.R) < 0.1 && sat.OT === 1) {
    return {
      color: colorSchemeManager.colorTheme.satSmall,
      pickable: true,
    };
  } else {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: false,
    };
  }
};
export const rcsRules = (sat: SatObject) => {
  const rcs: number = parseFloat(sat.R);
  if (rcs < 0.1 && colorSchemeManager.objectTypeFlags.rcsSmall === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (rcs >= 0.1 && rcs <= 1 && colorSchemeManager.objectTypeFlags.rcsMed === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (rcs > 1 && colorSchemeManager.objectTypeFlags.rcsLarge === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if ((typeof rcs === 'undefined' || rcs === null || typeof sat.R === 'undefined' || sat.R === 'N/A') && colorSchemeManager.objectTypeFlags.rcsUnknown === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (rcs < 0.1) {
    return {
      color: colorSchemeManager.colorTheme.rcsSmall,
      pickable: true,
    };
  }
  if (rcs >= 0.1 && rcs <= 1) {
    return {
      color: colorSchemeManager.colorTheme.rcsMed,
      pickable: true,
    };
  }
  if (rcs > 1) {
    return {
      color: colorSchemeManager.colorTheme.rcsLarge,
      pickable: true,
    };
  }
  // Unknowns
  return {
    color: colorSchemeManager.colorTheme.rcsUnknown,
    pickable: true,
  };
};
export const countriesRules = (sat: SatObject) => {
  const { mainCamera } = keepTrackApi.programs;
  const country = sat.C;

  if ((country === 'US' && colorSchemeManager.objectTypeFlags.countryUS === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if ((country === 'PRC' && colorSchemeManager.objectTypeFlags.countryPRC === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if ((country === 'CIS' && colorSchemeManager.objectTypeFlags.countryCIS === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (country === 'US') {
    return {
      color: colorSchemeManager.colorTheme.countryUS,
      pickable: true,
    };
  }
  if (country === 'PRC') {
    return {
      color: colorSchemeManager.colorTheme.countryPRC,
      pickable: true,
    };
  }
  if (country === 'CIS') {
    return {
      color: colorSchemeManager.colorTheme.countryCIS,
      pickable: true,
    };
  }
  // Other Countries
  if (colorSchemeManager.objectTypeFlags.countryOther === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  return {
    color: colorSchemeManager.colorTheme.countryOther,
    pickable: true,
  };
};
export const ageOfElsetRules = (sat: SatObject) => {
  const { timeManager } = keepTrackApi.programs;

  // Objects beyond sensor coverage are hidden
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: colorSchemeManager.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: false,
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
      pickable: true,
    };
  }

  if (daysold >= 3 && daysold < 14 && colorSchemeManager.objectTypeFlags.ageMed) {
    return {
      color: colorSchemeManager.colorTheme.ageMed,
      pickable: true,
    };
  }
  if (daysold >= 14 && daysold < 60 && colorSchemeManager.objectTypeFlags.ageOld) {
    return {
      color: colorSchemeManager.colorTheme.ageOld,
      pickable: true,
    };
  }
  if (daysold >= 60 && colorSchemeManager.objectTypeFlags.ageLost) {
    return {
      color: colorSchemeManager.colorTheme.ageLost,
      pickable: true,
    };
  }

  // Deselected
  return {
    color: colorSchemeManager.colorTheme.deselected,
    pickable: false,
  };
};
export const lostobjectsRules = (sat: SatObject) => {
  const { timeManager, satellite } = keepTrackApi.programs;

  // Objects beyond sensor coverage are hidden
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: colorSchemeManager.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: false,
    };
  }

  var pe = sat.perigee;
  var now = new Date();
  var jday = timeManager.getDayOfYear(now);
  const year = now.getFullYear().toString().substr(2, 2);
  var daysold;
  if (sat.TLE1.substr(18, 2) === year) {
    daysold = jday - parseInt(sat.TLE1.substr(20, 3));
  } else {
    daysold = jday - parseInt(sat.TLE1.substr(20, 3)) + parseInt(sat.TLE1.substr(17, 2)) * 365;
  }
  if (pe > satellite.obsmaxrange || daysold < settingsManager.daysUntilObjectLost) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: false,
    };
  } else {
    settingsManager.lostSatStr += settingsManager.lostSatStr === '' ? sat.SCC_NUM : `,${sat.SCC_NUM}`;
    return {
      color: colorSchemeManager.colorTheme.lostobjects,
      pickable: true,
    };
  }
};
export const leoRules = (sat: SatObject) => {
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: colorSchemeManager.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: true,
    };
  }

  var ap = sat.apogee;
  if (ap > 2000) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: false,
    };
  } else {
    if (sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === true) {
      return {
        color: colorSchemeManager.colorTheme.inView,
        pickable: true,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.satLEO,
        pickable: true,
      };
    }
  }
};
export const geoRules = (sat: SatObject) => {
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: colorSchemeManager.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: true,
    };
  }

  var pe = sat.perigee;
  if (pe < 35000) {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: false,
    };
  } else {
    if (sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === true) {
      return {
        color: colorSchemeManager.colorTheme.inView,
        pickable: true,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.satGEO,
        pickable: true,
      };
    }
  }
};
export const velocityRules = (sat: SatObject) => {
  // Stars
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  // Facilities
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: colorSchemeManager.colorTheme.facility,
      pickable: true,
    };
  }
  // Sensors
  if (sat.static) {
    return {
      color: colorSchemeManager.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.inView === 1) {
    if (colorSchemeManager.objectTypeFlagsinViewAlt === false) {
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    } else {
      return {
        color: colorSchemeManager.colorTheme.inViewAlt,
        pickable: true,
      };
    }
  }
  if (sat.velocity.total > 5.5 && colorSchemeManager.objectTypeFlags.velocityFast === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.velocity.total >= 2.5 && sat.velocity.total <= 5.5 && colorSchemeManager.objectTypeFlags.velocityMed === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.velocity.total < 2.5 && colorSchemeManager.objectTypeFlags.velocitySlow === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: false,
    };
  }
  /*
  NOTE: Removed variable declaration to reduce garbage collection

  const gradientAmt = Math.min(sat.velocity.total / 15, 1.0);
  const velGradient = [1.0 - gradientAmt, gradientAmt, 0.0, 1.0];
  return {
    color: velGradient
    pickable: true,
  };
  */
  return {
    color: [1.0 - Math.min(sat.velocity.total / 15, 1.0), Math.min(sat.velocity.total / 15, 1.0), 0.0, 1.0],
    pickable: true,
  };
};
export const groupRules = (sat: SatObject) => {
  // Glitch in the Matrix
  // if (groupsManager.selectedGroup === null) return;
  // Show Things in the Group
  if (sat.isInGroup) {
    return {
      color: colorSchemeManager.colorTheme.inGroup,
      pickable: true,
    };
  }
  // Show Markers But Don't Allow Them To Be Selected
  if (sat.marker) {
    return {
      color: colorSchemeManager.colorTheme.marker[0],
      marker: true,
      pickable: false,
    };
  }

  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && colorSchemeManager.objectTypeFlags.starLow) {
      return {
        color: colorSchemeManager.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && colorSchemeManager.objectTypeFlags.starMed) {
      return {
        color: colorSchemeManager.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && colorSchemeManager.objectTypeFlags.starHi) {
      return {
        color: colorSchemeManager.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: colorSchemeManager.colorTheme.deselected,
        pickable: false,
      };
    }
  }

  // Hide Everything Else
  return {
    color: colorSchemeManager.colorTheme.transparent,
    pickable: false,
  };
};
