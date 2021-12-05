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

import { keepTrackApi } from '@app/js/api/externalApi';
import { SatObject } from '../api/keepTrack';
import { ColorScheme } from './color-scheme';

// TODO: #319 Replace class with an object
export class ColorSchemeFactory {
  static ageOfElset: any;
  static apogee: any;
  static colorBufferOneTime: boolean;
  public colorBuffer: any;
  public pickableBuffer: any;
  static colors: any;
  static colorTheme: any;
  static countries: any;
  static default: any;
  static geo: any;
  static group: any;
  static leo: any;
  static lostobjects: any;
  static objectTypeFlagsinViewAlt: boolean;
  static onlyFOV: any;
  static rcs: any;
  static smallsats: any;
  static sunlight: any;
  static velocity: any;

  static objectTypeFlags = {
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
  };

  static init() {
    const { objectManager, satSet } = keepTrackApi.programs;
    const gl = keepTrackApi.programs.drawManager.gl;

    ColorSchemeFactory.colorTheme = settingsManager.colors;
    ColorSchemeFactory.resetObjectTypeFlags();

    ColorSchemeFactory.default = new ColorScheme(gl, satSet, objectManager, defaultRules);
    ColorSchemeFactory.default.default = true;
    ColorSchemeFactory.onlyFOV = new ColorScheme(gl, satSet, objectManager, onlyFovRules);
    ColorSchemeFactory.sunlight = new ColorScheme(gl, satSet, objectManager, sunlightRules);
    ColorSchemeFactory.sunlight.isSunlightColorScheme = true;
    ColorSchemeFactory.apogee = new ColorScheme(gl, satSet, objectManager, apogeeRules);
    ColorSchemeFactory.smallsats = new ColorScheme(gl, satSet, objectManager, smallsatsRules);
    ColorSchemeFactory.rcs = new ColorScheme(gl, satSet, objectManager, rcsRules);
    ColorSchemeFactory.countries = new ColorScheme(gl, satSet, objectManager, countriesRules);
    ColorSchemeFactory.ageOfElset = new ColorScheme(gl, satSet, objectManager, ageOfElsetRules);
    ColorSchemeFactory.lostobjects = new ColorScheme(gl, satSet, objectManager, lostobjectsRules);
    ColorSchemeFactory.leo = new ColorScheme(gl, satSet, objectManager, leoRules);
    ColorSchemeFactory.geo = new ColorScheme(gl, satSet, objectManager, geoRules);
    ColorSchemeFactory.velocity = new ColorScheme(gl, satSet, objectManager, velocityRules);
    ColorSchemeFactory.velocity.isVelocityColorScheme = true;
    // Used When Displaying a Group/Search of Objects
    ColorSchemeFactory.group = new ColorScheme(gl, satSet, objectManager, groupRules);
  }

  static resetObjectTypeFlags() {
    ColorSchemeFactory.objectTypeFlags.payload = true;
    ColorSchemeFactory.objectTypeFlags.radarData = true;
    ColorSchemeFactory.objectTypeFlags.rocketBody = true;
    ColorSchemeFactory.objectTypeFlags.debris = true;
    ColorSchemeFactory.objectTypeFlags.facility = true;
    ColorSchemeFactory.objectTypeFlags.sensor = true;
    ColorSchemeFactory.objectTypeFlags.missile = true;
    ColorSchemeFactory.objectTypeFlags.missileInview = true;
    ColorSchemeFactory.objectTypeFlags.trusat = true;
    ColorSchemeFactory.objectTypeFlags.inFOV = true;
    ColorSchemeFactory.objectTypeFlags.inViewAlt = true;
    ColorSchemeFactory.objectTypeFlags.starLow = true;
    ColorSchemeFactory.objectTypeFlags.starMed = true;
    ColorSchemeFactory.objectTypeFlags.starHi = true;
    ColorSchemeFactory.objectTypeFlags.satLEO = true;
    ColorSchemeFactory.objectTypeFlags.satGEO = true;
    ColorSchemeFactory.objectTypeFlags.satLow = true;
    ColorSchemeFactory.objectTypeFlags.satMed = true;
    ColorSchemeFactory.objectTypeFlags.satHi = true;
    ColorSchemeFactory.objectTypeFlags.satSmall = true;
    ColorSchemeFactory.objectTypeFlags.rcsSmall = true;
    ColorSchemeFactory.objectTypeFlags.rcsMed = true;
    ColorSchemeFactory.objectTypeFlags.rcsLarge = true;
    ColorSchemeFactory.objectTypeFlags.rcsUnknown = true;
    ColorSchemeFactory.objectTypeFlags.velocitySlow = true;
    ColorSchemeFactory.objectTypeFlags.velocityMed = true;
    ColorSchemeFactory.objectTypeFlags.velocityFast = true;
    ColorSchemeFactory.objectTypeFlags.ageNew = true;
    ColorSchemeFactory.objectTypeFlags.ageMed = true;
    ColorSchemeFactory.objectTypeFlags.ageOld = true;
    ColorSchemeFactory.objectTypeFlags.ageLost = true;
  }

  static reloadColors() {
    ColorSchemeFactory.colorTheme = settingsManager.colors;
  }
}

export const defaultRules = (sat: SatObject) => {
  const { mainCamera, sensorManager, objectManager, satSet, satellite } = keepTrackApi.programs;
  let color;

  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }

  if (mainCamera.cameraType.current === mainCamera.cameraType.Astronomy) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility') && (ColorSchemeFactory.objectTypeFlags.facility === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium)) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: ColorSchemeFactory.colorTheme.facility,
      pickable: true,
    };
  }

  if (sat.marker) {
    // This doesn't apply to sat overfly mode
    if (!settingsManager.isSatOverflyModeOn) {
      // But it doesn't work if we don't have marker info from the sensor
      if (typeof ColorSchemeFactory.default.iSensor !== 'undefined' && typeof satSet.satSensorMarkerArray !== 'undefined') {
        // if we have sensor markers enabled then we need to rotate colors as the marker numbers increase
        if (sat.id === satSet.satSensorMarkerArray[ColorSchemeFactory.default.iSensor + 1]) {
          ColorSchemeFactory.default.iSensor++;
        }
      }
    }
    if (ColorSchemeFactory.default.iSensor >= 0) {
      return {
        color: ColorSchemeFactory.colorTheme.marker[ColorSchemeFactory.default.iSensor],
        marker: true,
        pickable: false,
      };
    } else {
      return {
        // Failsafe
        color: ColorSchemeFactory.colorTheme.marker[0],
        marker: true,
        pickable: false,
      };
    }
  }

  if (sat.isRadarData && !ColorSchemeFactory.objectTypeFlags.radarData) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.isRadarData) {
    if (sat.missileComplex >= 0) {
      // || sat.missileObject >= 0
      return {
        color: ColorSchemeFactory.colorTheme.radarDataMissile,
        pickable: true,
      };
    }
    if (sat.satId >= 0) {
      return {
        color: ColorSchemeFactory.colorTheme.radarDataSatellite,
        pickable: true,
      };
    }
    return {
      color: ColorSchemeFactory.colorTheme.radarData,
      pickable: true,
    };
  }

  if (sat.static && (ColorSchemeFactory.objectTypeFlags.sensor === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium)) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.static) {
    return {
      color: ColorSchemeFactory.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile && !sat.inView) {
    if (sat.missile && ColorSchemeFactory.objectTypeFlags.missile === false) {
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    } else {
      return {
        color: ColorSchemeFactory.colorTheme.missile,
        pickable: true,
      };
    }
  }
  if (sat.missile && sat.inView) {
    if (sat.missile && ColorSchemeFactory.objectTypeFlags.missileInview === false) {
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    } else {
      return {
        color: ColorSchemeFactory.colorTheme.missileInview,
        pickable: true,
      };
    }
  }

  if (
    (!sat.inView && sat.OT === 1 && ColorSchemeFactory.objectTypeFlags.payload === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 1 && ColorSchemeFactory.objectTypeFlags.payload === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 1 && ColorSchemeFactory.objectTypeFlags.payload === false)
  ) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (
    (!sat.inView && sat.OT === 2 && ColorSchemeFactory.objectTypeFlags.rocketBody === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 2 && ColorSchemeFactory.objectTypeFlags.rocketBody === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 2 && ColorSchemeFactory.objectTypeFlags.rocketBody === false)
  ) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (
    (!sat.inView && sat.OT === 3 && ColorSchemeFactory.objectTypeFlags.debris === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 3 && ColorSchemeFactory.objectTypeFlags.debris === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 3 && ColorSchemeFactory.objectTypeFlags.debris === false)
  ) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (
    (!sat.inView && sat.OT === 4 && ColorSchemeFactory.objectTypeFlags.trusat === false) ||
    (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && sat.OT === 4 && ColorSchemeFactory.objectTypeFlags.trusat === false) ||
    (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 4 && ColorSchemeFactory.objectTypeFlags.trusat === false)
  ) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.inView && ColorSchemeFactory.objectTypeFlags.inFOV === false && mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.inView && mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
    if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].type == 'Observer' && typeof sat.vmag == 'undefined') {
      // Intentional
    } else {
      return {
        color: ColorSchemeFactory.colorTheme.inView,
        pickable: true,
      };
    }
  }

  if (sat.C === 'ANALSAT') {
    color = ColorSchemeFactory.colorTheme.analyst;
  } else if (sat.OT === 1) {
    // Payload
    color = ColorSchemeFactory.colorTheme.payload;
  } else if (sat.OT === 2) {
    // Rocket Body
    color = ColorSchemeFactory.colorTheme.rocketBody;
  } else if (sat.OT === 3) {
    // Debris
    color = ColorSchemeFactory.colorTheme.debris;
  } else if (sat.OT === 4) {
    // TruSat Object
    color = ColorSchemeFactory.colorTheme.trusat;
  } else {
    color = ColorSchemeFactory.colorTheme.unknown;
  }

  if (sat.perigee > satellite.obsmaxrange || sat.apogee < satellite.obsminrange) {
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
      pickable: false,
    };
  }

  // Shouldn't be getting here
  if (typeof color == 'undefined') {
    console.warn(sat.id);
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
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

  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility') && ColorSchemeFactory.objectTypeFlags.facility === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }

  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: ColorSchemeFactory.colorTheme.facility,
      pickable: true,
    };
  }

  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }

  if (sat.marker) {
    if (typeof ColorSchemeFactory.default.iSensor !== 'undefined' && typeof satSet.satSensorMarkerArray !== 'undefined') {
      if (sat.id === satSet.satSensorMarkerArray[ColorSchemeFactory.sunlight.iSensor + 1]) {
        ColorSchemeFactory.sunlight.iSensor++;
      }
    }
    if (ColorSchemeFactory.sunlight.iSensor >= 0) {
      return {
        color: ColorSchemeFactory.colorTheme.marker[ColorSchemeFactory.sunlight.iSensor],
        marker: true,
        pickable: false,
      };
    } else {
      return {
        // Failsafe
        color: ColorSchemeFactory.colorTheme.marker[0],
        marker: true,
        pickable: false,
      };
    }
  }

  if (sat.static && ColorSchemeFactory.objectTypeFlags.sensor === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.static) {
    return {
      color: ColorSchemeFactory.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile && !sat.inView) {
    return {
      color: ColorSchemeFactory.colorTheme.missile,
      pickable: true,
    };
  }
  if (sat.missile && sat.inView) {
    return {
      color: ColorSchemeFactory.colorTheme.missileInview,
      pickable: true,
    };
  }

  if (sat.inView && sat.inSun > 0 && ColorSchemeFactory.objectTypeFlags.inFOV === true) {
    if (typeof sat.vmag == 'undefined') {
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
    return {
      color: ColorSchemeFactory.colorTheme.sunlightInview,
      pickable: true,
    };
  }

  if (!sat.inView && typeof sat.vmag !== 'undefined') {
    if (sat.inSun == 2 && ColorSchemeFactory.objectTypeFlags.satHi === true) {
      // If vmag is undefined color it like a star
      if (sat.vmag < 3) {
        return {
          color: ColorSchemeFactory.colorTheme.starHi,
          pickable: true,
        };
      }
      if (sat.vmag <= 4.5) {
        return {
          color: ColorSchemeFactory.colorTheme.starMed,
          pickable: true,
        };
      }
      if (sat.vmag > 4.5) {
        return {
          color: ColorSchemeFactory.colorTheme.starLow,
          pickable: true,
        };
      }
    }

    if (sat.inSun == 1 && ColorSchemeFactory.objectTypeFlags.satMed === true) {
      return {
        color: ColorSchemeFactory.colorTheme.penumbral,
        pickable: true,
      };
    }

    if (sat.inSun == 0 && ColorSchemeFactory.objectTypeFlags.satLow === true) {
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
    // Not in the vmag database
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }

  return {
    color: ColorSchemeFactory.colorTheme.deselected,
    pickable: false,
  };
};
export const onlyFovRules = (sat: SatObject) => {
  if (sat.inView) {
    return {
      color: ColorSchemeFactory.colorTheme.inView,
      pickable: true,
    };
  } else {
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
      pickable: false,
    };
  }
};
export const apogeeRules = (sat: SatObject) => {
  var ap = sat.apogee;
  ColorSchemeFactory.colorTheme.gradientAmt = Math.min(ap / 45000, 1.0);
  ColorSchemeFactory.colorTheme.apogeeGradient = [1.0 - ColorSchemeFactory.colorTheme.gradientAmt, ColorSchemeFactory.colorTheme.gradientAmt, 0.0, 1.0];
  return {
    color: ColorSchemeFactory.colorTheme.apogeeGradient,
    pickable: true,
  };
};
export const smallsatsRules = (sat: SatObject) => {
  if (sat.OT === 1 && ColorSchemeFactory.objectTypeFlags.satSmall === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (parseFloat(sat.R) < 0.1 && sat.OT === 1) {
    return {
      color: ColorSchemeFactory.colorTheme.satSmall,
      pickable: true,
    };
  } else {
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
      pickable: false,
    };
  }
};
export const rcsRules = (sat: SatObject) => {
  const rcs: number = parseFloat(sat.R);
  if (rcs < 0.1 && ColorSchemeFactory.objectTypeFlags.rcsSmall === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (rcs >= 0.1 && rcs <= 1 && ColorSchemeFactory.objectTypeFlags.rcsMed === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (rcs > 1 && ColorSchemeFactory.objectTypeFlags.rcsLarge === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if ((typeof rcs === 'undefined' || rcs === null || typeof sat.R === 'undefined' || sat.R === 'N/A') && ColorSchemeFactory.objectTypeFlags.rcsUnknown === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (rcs < 0.1) {
    return {
      color: ColorSchemeFactory.colorTheme.rcsSmall,
      pickable: true,
    };
  }
  if (rcs >= 0.1 && rcs <= 1) {
    return {
      color: ColorSchemeFactory.colorTheme.rcsMed,
      pickable: true,
    };
  }
  if (rcs > 1) {
    return {
      color: ColorSchemeFactory.colorTheme.rcsLarge,
      pickable: true,
    };
  }
  // Unknowns
  return {
    color: ColorSchemeFactory.colorTheme.rcsUnknown,
    pickable: true,
  };
};
export const countriesRules = (sat: SatObject) => {
  const { mainCamera } = keepTrackApi.programs;
  const country = sat.C;

  if ((country === 'US' && ColorSchemeFactory.objectTypeFlags.countryUS === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if ((country === 'PRC' && ColorSchemeFactory.objectTypeFlags.countryPRC === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if ((country === 'CIS' && ColorSchemeFactory.objectTypeFlags.countryCIS === false) || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (country === 'US') {
    return {
      color: ColorSchemeFactory.colorTheme.countryUS,
      pickable: true,
    };
  }
  if (country === 'PRC') {
    return {
      color: ColorSchemeFactory.colorTheme.countryPRC,
      pickable: true,
    };
  }
  if (country === 'CIS') {
    return {
      color: ColorSchemeFactory.colorTheme.countryCIS,
      pickable: true,
    };
  }
  // Other Countries
  if (ColorSchemeFactory.objectTypeFlags.countryOther === false || mainCamera.cameraType.current === mainCamera.cameraType.Planetarium) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  return {
    color: ColorSchemeFactory.colorTheme.countryOther,
    pickable: true,
  };
};
export const ageOfElsetRules = (sat: SatObject) => {
  const { timeManager } = keepTrackApi.programs;

  // Objects beyond sensor coverage are hidden
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: ColorSchemeFactory.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: ColorSchemeFactory.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile) {
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
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

  if (daysold < 3 && ColorSchemeFactory.objectTypeFlags.ageNew) {
    return {
      color: ColorSchemeFactory.colorTheme.ageNew,
      pickable: true,
    };
  }

  if (daysold >= 3 && daysold < 14 && ColorSchemeFactory.objectTypeFlags.ageMed) {
    return {
      color: ColorSchemeFactory.colorTheme.ageMed,
      pickable: true,
    };
  }
  if (daysold >= 14 && daysold < 60 && ColorSchemeFactory.objectTypeFlags.ageOld) {
    return {
      color: ColorSchemeFactory.colorTheme.ageOld,
      pickable: true,
    };
  }
  if (daysold >= 60 && ColorSchemeFactory.objectTypeFlags.ageLost) {
    return {
      color: ColorSchemeFactory.colorTheme.ageLost,
      pickable: true,
    };
  }

  // Deselected
  return {
    color: ColorSchemeFactory.colorTheme.deselected,
    pickable: false,
  };
};
export const lostobjectsRules = (sat: SatObject) => {
  const { timeManager, satellite } = keepTrackApi.programs;

  // Objects beyond sensor coverage are hidden
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: ColorSchemeFactory.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: ColorSchemeFactory.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.missile) {
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
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
      color: ColorSchemeFactory.colorTheme.transparent,
      pickable: false,
    };
  } else {
    settingsManager.lostSatStr += settingsManager.lostSatStr === '' ? sat.SCC_NUM : `,${sat.SCC_NUM}`;
    return {
      color: ColorSchemeFactory.colorTheme.lostobjects,
      pickable: true,
    };
  }
};
export const leoRules = (sat: SatObject) => {
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: ColorSchemeFactory.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: ColorSchemeFactory.colorTheme.sensor,
      pickable: true,
    };
  }

  var ap = sat.apogee;
  if (ap > 2000) {
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
      pickable: false,
    };
  } else {
    if (sat.inView && ColorSchemeFactory.objectTypeFlags.inFOV === true) {
      return {
        color: ColorSchemeFactory.colorTheme.inView,
        pickable: true,
      };
    } else {
      return {
        color: ColorSchemeFactory.colorTheme.satLEO,
        pickable: true,
      };
    }
  }
};
export const geoRules = (sat: SatObject) => {
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: ColorSchemeFactory.colorTheme.facility,
      pickable: true,
    };
  }
  if (sat.static) {
    return {
      color: ColorSchemeFactory.colorTheme.sensor,
      pickable: true,
    };
  }

  var pe = sat.perigee;
  if (pe < 35000) {
    return {
      color: ColorSchemeFactory.colorTheme.transparent,
      pickable: false,
    };
  } else {
    if (sat.inView && ColorSchemeFactory.objectTypeFlags.inFOV === true) {
      return {
        color: ColorSchemeFactory.colorTheme.inView,
        pickable: true,
      };
    } else {
      return {
        color: ColorSchemeFactory.colorTheme.satGEO,
        pickable: true,
      };
    }
  }
};
export const velocityRules = (sat: SatObject) => {
  // Stars
  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }
  // Facilities
  if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
    return {
      color: ColorSchemeFactory.colorTheme.facility,
      pickable: true,
    };
  }
  // Sensors
  if (sat.static) {
    return {
      color: ColorSchemeFactory.colorTheme.sensor,
      pickable: true,
    };
  }
  if (sat.inView) {
    if (ColorSchemeFactory.objectTypeFlagsinViewAlt === false) {
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    } else {
      return {
        color: ColorSchemeFactory.colorTheme.inViewAlt,
        pickable: true,
      };
    }
  }
  if (sat.velocity.total > 5.5 && ColorSchemeFactory.objectTypeFlags.velocityFast === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.velocity.total >= 2.5 && sat.velocity.total <= 5.5 && ColorSchemeFactory.objectTypeFlags.velocityMed === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  if (sat.velocity.total < 2.5 && ColorSchemeFactory.objectTypeFlags.velocitySlow === false) {
    return {
      color: ColorSchemeFactory.colorTheme.deselected,
      pickable: false,
    };
  }
  ColorSchemeFactory.colorTheme.gradientAmt = Math.min(sat.velocity.total / 15, 1.0);
  ColorSchemeFactory.colorTheme.velGradient = [1.0 - ColorSchemeFactory.colorTheme.gradientAmt, ColorSchemeFactory.colorTheme.gradientAmt, 0.0, 1.0];

  return {
    color: ColorSchemeFactory.colorTheme.velGradient,
    pickable: true,
  };
};
export const groupRules = (sat: SatObject) => {
  // Glitch in the Matrix
  // if (groupsManager.selectedGroup === null) return;
  // Show Things in the Group
  if (sat.isInGroup) {
    return {
      color: ColorSchemeFactory.colorTheme.inGroup,
      pickable: true,
    };
  }
  // Show Markers But Don't Allow Them To Be Selected
  if (sat.marker) {
    return {
      color: ColorSchemeFactory.colorTheme.marker[0],
      marker: true,
      pickable: false,
    };
  }

  if (sat.static && sat.type === 'Star') {
    if (sat.vmag >= 4.7 && ColorSchemeFactory.objectTypeFlags.starLow) {
      return {
        color: ColorSchemeFactory.colorTheme.starLow,
        pickable: true,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorSchemeFactory.objectTypeFlags.starMed) {
      return {
        color: ColorSchemeFactory.colorTheme.starMed,
        pickable: true,
      };
    } else if (sat.vmag < 3.5 && ColorSchemeFactory.objectTypeFlags.starHi) {
      return {
        color: ColorSchemeFactory.colorTheme.starHi,
        pickable: true,
      };
    } else {
      // Deselected
      return {
        color: ColorSchemeFactory.colorTheme.deselected,
        pickable: false,
      };
    }
  }

  // Hide Everything Else
  return {
    color: ColorSchemeFactory.colorTheme.transparent,
    pickable: false,
  };
};

// ColorSchemeFactory.default = undefined;
