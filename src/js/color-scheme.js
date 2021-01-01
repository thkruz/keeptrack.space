// Copyright (C) 2016-2020 Theodore Kruczek
// Copyright (C) 2020 Heather Kruczek
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

// eslint-disable-next-line max-classes-per-file
import * as $ from 'jquery';
import { Schematic } from './colorManager/schematic.js';

class ColorScheme {
  static objectTypeFlags = {};

  static init(gl, cameraManagerRef, timeManagerRef, sensorManagerRef, objectManagerRef, satSetRef, satelliteRef, settingsManagerRef) {
    let cameraManager = cameraManagerRef;
    let timeManager = timeManagerRef;
    let sensorManager = sensorManagerRef;
    let objectManager = objectManagerRef;
    let satSet = satSetRef;
    let satellite = satelliteRef;
    let settingsManager = settingsManagerRef;
    let color;
    ColorScheme.colorTheme = settingsManager.colors;
    let iSensor = -1;
    ColorScheme.resetObjectTypeFlags();

    ColorScheme.default = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: ColorScheme.colorTheme.starLow,
            pickable: true,
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: ColorScheme.colorTheme.starMed,
            pickable: true,
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: ColorScheme.colorTheme.starHi,
            pickable: true,
          };
        } else {
          // Deselected
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
      }

      if (cameraManager.cameraType.current === cameraManager.cameraType.astronomy) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }

      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility') && (ColorScheme.objectTypeFlags.facility === false || cameraManager.cameraType.current === cameraManager.cameraType.planetarium)) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }

      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: ColorScheme.colorTheme.facility,
          pickable: true,
        };
      }

      if (sat.marker) {
        if (sat.id === satSet.satSensorMarkerArray[iSensor + 1]) {
          iSensor++;
        }
        if (iSensor >= 0) {
          return {
            color: ColorScheme.colorTheme.marker[iSensor],
            marker: true,
            pickable: false,
          };
        } else {
          return {
            // Failsafe
            color: ColorScheme.colorTheme.marker[0],
            marker: true,
            pickable: false,
          };
        }
      }

      if (sat.isRadarData && !ColorScheme.objectTypeFlags.radarData) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (sat.isRadarData) {
        if (sat.missileComplex >= 0) {
          // || sat.missileObject >= 0
          return {
            color: ColorScheme.colorTheme.radarDataMissile,
            pickable: true,
          };
        }
        if (sat.satId >= 0) {
          return {
            color: ColorScheme.colorTheme.radarDataSatellite,
            pickable: true,
          };
        }
        return {
          color: ColorScheme.colorTheme.radarData,
          pickable: true,
        };
      }

      if (sat.static && (ColorScheme.objectTypeFlags.sensor === false || cameraManager.cameraType.current === cameraManager.cameraType.planetarium)) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (sat.static) {
        return {
          color: ColorScheme.colorTheme.sensor,
          pickable: true,
        };
      }
      if (sat.missile && !sat.inView) {
        if (sat.missile && ColorScheme.objectTypeFlags.missile === false) {
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        } else {
          return {
            color: ColorScheme.colorTheme.missile,
            pickable: true,
          };
        }
      }
      if (sat.missile && sat.inView) {
        if (sat.missile && ColorScheme.objectTypeFlags.missileInview === false) {
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        } else {
          return {
            color: ColorScheme.colorTheme.missileInview,
            pickable: true,
          };
        }
      }

      if (
        (!sat.inView && sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false) ||
        (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false) ||
        (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false)
      ) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (
        (!sat.inView && sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false) ||
        (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false) ||
        (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false)
      ) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (
        (!sat.inView && sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false) ||
        (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false) ||
        (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false)
      ) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (
        (!sat.inView && sat.OT === 4 && ColorScheme.objectTypeFlags.trusat === false) ||
        (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && sat.OT === 4 && ColorScheme.objectTypeFlags.trusat === false) ||
        (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 4 && ColorScheme.objectTypeFlags.trusat === false)
      ) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }

      if (sat.inView && ColorScheme.objectTypeFlags.inFOV === false && cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }

      if (sat.inView && cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
        if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined') {
          // Intentional
        } else {
          return {
            color: ColorScheme.colorTheme.inview,
            pickable: true,
          };
        }
      }

      if (sat.C === 'ANALSAT') {
        color = ColorScheme.colorTheme.analyst;
      } else if (sat.OT === 1) {
        // Payload
        color = ColorScheme.colorTheme.payload;
      } else if (sat.OT === 2) {
        // Rocket Body
        color = ColorScheme.colorTheme.rocketBody;
      } else if (sat.OT === 3) {
        // Debris
        color = ColorScheme.colorTheme.debris;
      } else if (sat.OT === 4) {
        // TruSat Object
        color = ColorScheme.colorTheme.trusat;
      } else {
        color = ColorScheme.colorTheme.unknown;
      }

      if (sat.perigee > satellite.obsmaxrange || sat.apogee < satellite.obsminrange) {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      }

      // Shouldn't be getting here
      if (typeof color == 'undefined') {
        console.warn(sat.id);
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      }
      return {
        color: color,
        pickable: true,
      };
    });
    ColorScheme.default.default = true;
    ColorScheme.onlyFOV = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      if (sat.inView) {
        return {
          color: ColorScheme.colorTheme.inview,
          pickable: true,
        };
      } else {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      }
    });
    ColorScheme.sunlight = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility') && ColorScheme.objectTypeFlags.facility === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }

      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: ColorScheme.colorTheme.facility,
          pickable: true,
        };
      }

      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: ColorScheme.colorTheme.starLow,
            pickable: true,
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: ColorScheme.colorTheme.starMed,
            pickable: true,
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: ColorScheme.colorTheme.starHi,
            pickable: true,
          };
        } else {
          // Deselected
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
      }

      if (sat.marker) {
        if (sat.id === satSet.satSensorMarkerArray[iSensor + 1]) {
          iSensor++;
        }
        if (iSensor >= 0) {
          return {
            color: ColorScheme.colorTheme.marker[iSensor],
            marker: true,
            pickable: false,
          };
        } else {
          return {
            // Failsafe
            color: ColorScheme.colorTheme.marker[0],
            marker: true,
            pickable: false,
          };
        }
      }

      if (sat.static && ColorScheme.objectTypeFlags.sensor === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (sat.static) {
        return {
          color: ColorScheme.colorTheme.sensor,
          pickable: true,
        };
      }
      if (sat.missile && !sat.inView) {
        return {
          color: ColorScheme.colorTheme.missile,
          pickable: true,
        };
      }
      if (sat.missile && sat.inView) {
        return {
          color: ColorScheme.colorTheme.missileInview,
          pickable: true,
        };
      }

      if (sat.inView && sat.inSun > 0 && ColorScheme.objectTypeFlags.inFOV === true) {
        if (typeof sat.vmag == 'undefined') {
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
        return {
          color: ColorScheme.colorTheme.sunlightInview,
          pickable: true,
        };
      }

      if (!sat.inView && typeof sat.vmag !== 'undefined') {
        if (sat.inSun == 2 && ColorScheme.objectTypeFlags.satHi === true) {
          // If vmag is undefined color it like a star
          // TODO: Better way of doing this
          if (sat.vmag < 3) {
            return {
              color: ColorScheme.colorTheme.starHi,
              pickable: true,
            };
          }
          if (sat.vmag <= 4.5) {
            return {
              color: ColorScheme.colorTheme.starMed,
              pickable: true,
            };
          }
          if (sat.vmag > 4.5) {
            return {
              color: ColorScheme.colorTheme.starLow,
              pickable: true,
            };
          }
        }

        if (sat.inSun == 1 && ColorScheme.objectTypeFlags.satMed === true) {
          return {
            color: ColorScheme.colorTheme.penumbral,
            pickable: true,
          };
        }

        if (sat.inSun == 0 && ColorScheme.objectTypeFlags.satLow === true) {
          return {
            color: ColorScheme.colorTheme.umbral,
            pickable: true,
          };
        }
        // Not in the vmag database
        return {
          color: ColorScheme.colorTheme.umbral,
          pickable: true,
        };
      }

      return {
        color: ColorScheme.colorTheme.deselected,
        pickable: false,
      };
    });
    ColorScheme.sunlight.isSunlightColorScheme = true;
    /// //////////////////////////////
    // NOTE: ColorScheme.apogee doesn't appear to be used
    // ///////////////////////////////
    ColorScheme.apogee = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      var ap = sat.apogee;
      ColorScheme.colorTheme.gradientAmt = Math.min(ap / 45000, 1.0);
      ColorScheme.colorTheme.apogeeGradient = [1.0 - ColorScheme.colorTheme.gradientAmt, ColorScheme.colorTheme.gradientAmt, 0.0, 1.0];
      return {
        color: ColorScheme.colorTheme.apogeeGradient,
        pickable: true,
      };
    });
    // ///////////////////////////////
    ColorScheme.smallsats = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.satSmall === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (sat.R < 0.1 && sat.OT === 1) {
        return {
          color: ColorScheme.colorTheme.satSmall,
          pickable: true,
        };
      } else {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      }
    });
    ColorScheme.rcs = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      var rcs = sat.R;
      if (rcs < 0.1 && ColorScheme.objectTypeFlags.rcsSmall === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (rcs >= 0.1 && rcs <= 1 && ColorScheme.objectTypeFlags.rcsMed === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (rcs > 1 && ColorScheme.objectTypeFlags.rcsLarge === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if ((typeof rcs == 'undefined' || rcs == null || rcs == 'N/A') && ColorScheme.objectTypeFlags.rcsUnknown === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (rcs < 0.1) {
        return {
          color: ColorScheme.colorTheme.rcsSmall,
          pickable: true,
        };
      }
      if (rcs >= 0.1 && rcs <= 1) {
        return {
          color: ColorScheme.colorTheme.rcsMed,
          pickable: true,
        };
      }
      if (rcs > 1) {
        return {
          color: ColorScheme.colorTheme.rcsLarge,
          pickable: true,
        };
      }
      // Unknowns
      return {
        color: ColorScheme.colorTheme.rcsUnknown,
        pickable: true,
      };
    });
    ColorScheme.countries = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      var country = sat.C;
      if ((country === 'US' && ColorScheme.objectTypeFlags.countryUS === false) || (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && country === 'US' && ColorScheme.objectTypeFlags.countryUS === false)) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if ((country === 'PRC' && ColorScheme.objectTypeFlags.countryPRC === false) || (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && country === 'PRC' && ColorScheme.objectTypeFlags.countryPRC === false)) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if ((country === 'CIS' && ColorScheme.objectTypeFlags.countryCIS === false) || (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && country === 'CIS' && ColorScheme.objectTypeFlags.countryCIS === false)) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (country === 'US') {
        return {
          color: ColorScheme.colorTheme.countryUS,
          pickable: true,
        };
      }
      if (country === 'PRC') {
        return {
          color: ColorScheme.colorTheme.countryPRC,
          pickable: true,
        };
      }
      if (country === 'CIS') {
        return {
          color: ColorScheme.colorTheme.countryCIS,
          pickable: true,
        };
      }
      // Other Countries
      if (ColorScheme.objectTypeFlags.countryOther === false || (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && ColorScheme.objectTypeFlags.countryOther === false)) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      return {
        color: ColorScheme.colorTheme.countryOther,
        pickable: true,
      };
    });
    ColorScheme.ageOfElset = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      // Objects beyond sensor coverage are hidden
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: ColorScheme.colorTheme.starLow,
            pickable: true,
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: ColorScheme.colorTheme.starMed,
            pickable: true,
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: ColorScheme.colorTheme.starHi,
            pickable: true,
          };
        } else {
          // Deselected
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
      }
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: ColorScheme.colorTheme.facility,
          pickable: true,
        };
      }
      if (sat.static) {
        return {
          color: ColorScheme.colorTheme.sensor,
          pickable: true,
        };
      }
      if (sat.missile) {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      }

      var now = new Date();
      var jday = timeManager.getDayOfYear(now);
      now = now.getFullYear();
      now = now.toString().substr(2, 2);
      var daysold;
      if (sat.TLE1.substr(18, 2) === now) {
        daysold = jday - sat.TLE1.substr(20, 3);
      } else {
        daysold = jday - sat.TLE1.substr(20, 3) + sat.TLE1.substr(17, 2) * 365;
      }

      if (daysold < 3 && ColorScheme.objectTypeFlags.ageNew) {
        return {
          color: ColorScheme.colorTheme.ageNew,
          pickable: true,
        };
      }
      if (daysold >= 3 && daysold < 14 && ColorScheme.objectTypeFlags.ageMed) {
        return {
          color: ColorScheme.colorTheme.ageMed,
          pickable: true,
        };
      }
      if (daysold >= 14 && daysold < 60 && ColorScheme.objectTypeFlags.ageOld) {
        return {
          color: ColorScheme.colorTheme.ageOld,
          pickable: true,
        };
      }
      if (daysold >= 60 && ColorScheme.objectTypeFlags.ageLost) {
        return {
          color: ColorScheme.colorTheme.ageLost,
          pickable: true,
        };
      }

      // Deselected
      return {
        color: ColorScheme.colorTheme.deselected,
        pickable: false,
      };
    });
    ColorScheme.lostobjects = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      // TODO: Constantly adjusting the search bar makes this really slow
      // The objects should be appended to an array and the DOM modified once at
      // the end of the color initialization.
      //
      // Objects beyond sensor coverage are hidden
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: ColorScheme.colorTheme.starLow,
            pickable: true,
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: ColorScheme.colorTheme.starMed,
            pickable: true,
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: ColorScheme.colorTheme.starHi,
            pickable: true,
          };
        } else {
          // Deselected
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
      }
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: ColorScheme.colorTheme.facility,
          pickable: true,
        };
      }
      if (sat.static) {
        return {
          color: ColorScheme.colorTheme.sensor,
          pickable: true,
        };
      }
      if (sat.missile) {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      }

      var pe = sat.perigee;
      var now = new Date();
      var jday = timeManager.getDayOfYear(now);
      now = now.getFullYear();
      now = now.toString().substr(2, 2);
      var daysold;
      if (sat.TLE1.substr(18, 2) === now) {
        daysold = jday - sat.TLE1.substr(20, 3);
      } else {
        daysold = jday - sat.TLE1.substr(20, 3) + sat.TLE1.substr(17, 2) * 365;
      }
      if (pe > satellite.obsmaxrange || daysold < settingsManager.daysUntilObjectLost) {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      } else {
        if ($('#search').val() === '') {
          $('#search').val($('#search').val() + sat.SCC_NUM);
        } else {
          $('#search').val($('#search').val() + ',' + sat.SCC_NUM);
        }
        return {
          color: ColorScheme.colorTheme.lostobjects,
          pickable: true,
        };
      }
    });
    ColorScheme.leo = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: ColorScheme.colorTheme.starLow,
            pickable: true,
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: ColorScheme.colorTheme.starMed,
            pickable: true,
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: ColorScheme.colorTheme.starHi,
            pickable: true,
          };
        } else {
          // Deselected
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
      }
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: ColorScheme.colorTheme.facility,
          pickable: true,
        };
      }
      if (sat.static) {
        return {
          color: ColorScheme.colorTheme.sensor,
          pickable: true,
        };
      }

      var ap = sat.apogee;
      if (ap > 2000) {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      } else {
        if (sat.inView && ColorScheme.objectTypeFlags.inFOV === true) {
          return {
            color: ColorScheme.colorTheme.inview,
            pickable: true,
          };
        } else {
          return {
            color: ColorScheme.colorTheme.satLEO,
            pickable: true,
          };
        }
      }
    });
    ColorScheme.geo = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: ColorScheme.colorTheme.starLow,
            pickable: true,
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: ColorScheme.colorTheme.starMed,
            pickable: true,
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: ColorScheme.colorTheme.starHi,
            pickable: true,
          };
        } else {
          // Deselected
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
      }
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: ColorScheme.colorTheme.facility,
          pickable: true,
        };
      }
      if (sat.static) {
        return {
          color: ColorScheme.colorTheme.sensor,
          pickable: true,
        };
      }

      var pe = sat.perigee;
      if (pe < 35000) {
        return {
          color: ColorScheme.colorTheme.transparent,
          pickable: false,
        };
      } else {
        if (sat.inView && ColorScheme.objectTypeFlags.inFOV === true) {
          return {
            color: ColorScheme.colorTheme.inview,
            pickable: true,
          };
        } else {
          return {
            color: ColorScheme.colorTheme.satGEO,
            pickable: true,
          };
        }
      }
    });
    ColorScheme.velocity = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      // Stars
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: ColorScheme.colorTheme.starLow,
            pickable: true,
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: ColorScheme.colorTheme.starMed,
            pickable: true,
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: ColorScheme.colorTheme.starHi,
            pickable: true,
          };
        } else {
          // Deselected
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        }
      }
      // Facilities
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: ColorScheme.colorTheme.facility,
          pickable: true,
        };
      }
      // Sensors
      if (sat.static) {
        return {
          color: ColorScheme.colorTheme.sensor,
          pickable: true,
        };
      }
      if (sat.inView) {
        if (ColorScheme.objectTypeFlags.inviewAlt === false) {
          return {
            color: ColorScheme.colorTheme.deselected,
            pickable: false,
          };
        } else {
          return {
            color: ColorScheme.colorTheme.inviewAlt,
            pickable: true,
          };
        }
      }
      if (sat.velocity.total > 5.5 && ColorScheme.objectTypeFlags.velocityFast === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (sat.velocity.total >= 2.5 && sat.velocity.total <= 5.5 && ColorScheme.objectTypeFlags.velocityMed === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      if (sat.velocity.total < 2.5 && ColorScheme.objectTypeFlags.velocitySlow === false) {
        return {
          color: ColorScheme.colorTheme.deselected,
          pickable: false,
        };
      }
      ColorScheme.colorTheme.gradientAmt = Math.min(sat.velocity.total / 15, 1.0);
      ColorScheme.colorTheme.velGradient = [1.0 - ColorScheme.colorTheme.gradientAmt, ColorScheme.colorTheme.gradientAmt, 0.0, 1.0];

      return {
        color: ColorScheme.colorTheme.velGradient,
        pickable: true,
      };
    });
    ColorScheme.velocity.isVelocityColorScheme = true;
    // Used When Displaying a Group/Search of Objects
    ColorScheme.group = new Schematic(gl, satSet, iSensor, objectManager, function (sat) {
      // Glitch in the Matrix
      // if (groupsManager.selectedGroup === null) return;
      // Show Things in the Group
      if (sat.isInGroup) {
        return {
          color: ColorScheme.colorTheme.inGroup,
          pickable: true,
        };
      }
      // Show Markers But Don't Allow Them To Be Selected
      if (sat.marker) {
        return {
          color: ColorScheme.colorTheme.marker[0],
          marker: true,
          pickable: false,
        };
      }
      // Hide Everything Else
      return {
        color: ColorScheme.colorTheme.transparent,
        pickable: false,
      };
    });
  }

  static resetObjectTypeFlags() {
    ColorScheme.objectTypeFlags.payload = true;
    ColorScheme.objectTypeFlags.radarData = true;
    ColorScheme.objectTypeFlags.rocketBody = true;
    ColorScheme.objectTypeFlags.debris = true;
    ColorScheme.objectTypeFlags.facility = true;
    ColorScheme.objectTypeFlags.sensor = true;
    ColorScheme.objectTypeFlags.missile = true;
    ColorScheme.objectTypeFlags.missileInview = true;
    ColorScheme.objectTypeFlags.trusat = true;
    ColorScheme.objectTypeFlags.inFOV = true;
    ColorScheme.objectTypeFlags.inviewAlt = true;
    ColorScheme.objectTypeFlags.starLow = true;
    ColorScheme.objectTypeFlags.starMed = true;
    ColorScheme.objectTypeFlags.starHi = true;
    ColorScheme.objectTypeFlags.satLEO = true;
    ColorScheme.objectTypeFlags.satGEO = true;
    ColorScheme.objectTypeFlags.satLow = true;
    ColorScheme.objectTypeFlags.satMed = true;
    ColorScheme.objectTypeFlags.satHi = true;
    ColorScheme.objectTypeFlags.satSmall = true;
    ColorScheme.objectTypeFlags.rcsSmall = true;
    ColorScheme.objectTypeFlags.rcsMed = true;
    ColorScheme.objectTypeFlags.rcsLarge = true;
    ColorScheme.objectTypeFlags.rcsUnknown = true;
    ColorScheme.objectTypeFlags.velocitySlow = true;
    ColorScheme.objectTypeFlags.velocityMed = true;
    ColorScheme.objectTypeFlags.velocityFast = true;
    ColorScheme.objectTypeFlags.ageNew = true;
    ColorScheme.objectTypeFlags.ageMed = true;
    ColorScheme.objectTypeFlags.ageOld = true;
    ColorScheme.objectTypeFlags.ageLost = true;
  }

  static reloadColors() {
    ColorScheme.colorTheme = settingsManager.colors;
  }
}

export { ColorScheme };
