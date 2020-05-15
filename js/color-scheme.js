/* global
  $
  gl

  satSet
  lookangles
  timeManager
  settingsManager
  groups
*/
(function () {
  var colorTheme = settingsManager.colors;
  var iSensorMarkerArray = -1;

  var ColorScheme = function (colorizer) {
    this.colorizer = colorizer;
    this.colorBuf = gl.createBuffer();
    this.pickableBuf = gl.createBuffer();
  };

  ColorScheme.objectTypeFlags = {};
  ColorScheme.objectTypeFlags.payload = true;
  ColorScheme.objectTypeFlags.rocketBody = true;
  ColorScheme.objectTypeFlags.debris = true;
  ColorScheme.objectTypeFlags.facility = true;
  ColorScheme.objectTypeFlags.sensor = true;
  ColorScheme.objectTypeFlags.missile = true;
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

  // Removed from function to reduce memory leak
  ColorScheme.prototype.calculateColorBuffers = function (isForceRecolor, isCalculateMarkers) {
    var numSats, colorData, pickableData, colors, i;
    var lastCalculation = 0;
    var now = Date.now();
    if (!pickableData || !colorData) {
      this.lastCalculation = now;
      numSats = satSet.numSats;
      colorData = new Float32Array(numSats * 4);
      pickableData = new Float32Array(numSats); // Broke as an Int8
    }

    if (!isForceRecolor && now - lastCalculation < settingsManager.reColorMinimumTime && lastCalculation !== 0) {
      return {
        colorBuf: this.colorBuf,
        pickableBuf: this.pickableBuf
      };
    }
    lastCalculation = now;

    var isFirstMarkerChecked = false;
    var satData = satSet.getSatData();
    var satInView = satSet.getSatInView();
    var satInSun;
    if (this.isVelocityColorScheme) {
      satVel = satSet.getSatVel();
    }
    iSensorMarkerArray = -1; // Start at -1 so the first use is 0

    // Don't Calculate the Colors of things you can't see
    if (!settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence && !settingsManager.isSatOverflyModeOn) numSats -= settingsManager.maxFieldOfViewMarkers;

    if (this.isSunlightColorScheme) {
      satInSun = satSet.getSatInSun();
    }

    for (i = 0; i < numSats; i++) {
      sat = satData[i];
      if (satInView) sat.inView = satInView[i];
      if (satInSun) sat.inSun = satInSun[i];

      if (this.isVelocityColorScheme) {
        sat.velocity = Math.sqrt(
          satVel[i * 3] * satVel[i * 3] +
          satVel[i * 3 + 1] * satVel[i * 3 + 1] +
          satVel[i * 3 + 2] * satVel[i * 3 + 2]
        );
      }

      // if (!isFirstMarkerChecked) { // Markers Color Can't Change so Don't Keep Checking
        colors = this.colorizer(sat); // Run the colorscheme below
      // }
      // isFirstMarkerChecked = colors.marker; // First Marker Checked Returns True
      if (typeof colors == 'undefined') continue;
      try {
        colorData[i * 4] = colors.color[0];  // R
        colorData[i * 4 + 1] = colors.color[1]; // G
        colorData[i * 4 + 2] = colors.color[2]; // B
        colorData[i * 4 + 3] = colors.color[3]; // A
        pickableData[i] = colors.pickable ? 1 : 0;
      } catch (e) {
        if (db.enabled) db.log(satSet.getSat(i));
        continue;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickableBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pickableData, gl.STATIC_DRAW);
    return {
      colorBuf: this.colorBuf,
      pickableBuf: this.pickableBuf
    };
  };

  ColorScheme.reloadColors = function () {
    colorTheme = settingsManager.colors;
  };

  var sat, color;
  ColorScheme.init = function () {
    ColorScheme.default = new ColorScheme(function (sat) {
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility') && ColorScheme.objectTypeFlags.facility === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }

      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: colorTheme.facility,
          pickable: true
        };
      }

      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: colorTheme.starLow,
            pickable: true
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: colorTheme.starMed,
            pickable: true
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: colorTheme.starHi,
            pickable: true
          };
        } else {
          // Deselected
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        }
      }

      if (sat.marker) {
        if (sat.id === satSensorMarkerArray[iSensorMarkerArray + 1]) {
          iSensorMarkerArray++;
        }
        if (iSensorMarkerArray >= 0) {
          return {
            color: colorTheme.marker[iSensorMarkerArray],
            marker: true,
            pickable: false
          };
        } else {
          return { // Failsafe
            color: colorTheme.marker[0],
            marker: true,
            pickable: false
          };
        }
      }

      if (sat.static && ColorScheme.objectTypeFlags.sensor === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (sat.static) {
        return {
          color: colorTheme.sensor,
          pickable: true
        };
      }
      if (sat.missile && !sat.inView) {
        return {
          color: colorTheme.missile,
          pickable: true
        };
      }
      if (sat.missile && sat.inView) {
        return {
          color: colorTheme.missileInview,
          pickable: true
        };
      }

      // NOTE: ColorScheme.objectTypeFlags code

      if (!sat.inView && sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false ||
          cameraType.current === cameraType.PLANETARIUM && sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false ||
          (satellite.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false)) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (!sat.inView && sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false ||
          cameraType.current === cameraType.PLANETARIUM && sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false ||
          (satellite.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false)) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (!sat.inView && sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false ||
          cameraType.current === cameraType.PLANETARIUM && sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false ||
          (satellite.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false)) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (!sat.inView && sat.OT === 4 && ColorScheme.objectTypeFlags.trusat === false ||
          cameraType.current === cameraType.PLANETARIUM && sat.OT === 4 && ColorScheme.objectTypeFlags.trusat === false ||
          (satellite.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined' && sat.OT === 4 && ColorScheme.objectTypeFlags.trusat === false)) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }

      if (cameraType.current === cameraType.ASTRONOMY) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      } else {

        if (sat.inView && ColorScheme.objectTypeFlags.inFOV === false && cameraType.current !== cameraType.PLANETARIUM) {
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        }

        if (sat.inView && cameraType.current !== cameraType.PLANETARIUM) {
          if (satellite.currentSensor.type == 'Observer' && typeof sat.vmag == 'undefined') {
          } else {
            return {
              color: colorTheme.inview,
              pickable: true
            };
          }
        }

        if (sat.C === 'ANALSAT') {
          color = colorTheme.analyst;
        } else if (sat.OT === 1) { // Payload
          color = colorTheme.payload;
        } else if (sat.OT === 2) { // Rocket Body
          color = colorTheme.rocketBody;
        } else if (sat.OT === 3) { // Debris
          color = colorTheme.debris;
        } else if (sat.OT === 4) { // TruSat Object
          color = colorTheme.trusat;
        } else {
          color = colorTheme.unknown;
        }

        if ((sat.perigee > satellite.obsmaxrange || sat.apogee < satellite.obsminrange)) {
          return {
            color: colorTheme.transparent,
            pickable: false
          };
        }
      }

      if (typeof color == 'undefined') console.warn(sat.id);
      return {
        color: color,
        pickable: true
      };
    });
    ColorScheme.onlyFOV = new ColorScheme(function (sat) {
      if (sat.inView) {
        return {
          color: colorTheme.inview,
          pickable: true
        };
      } else {
        return {
          color: colorTheme.transparent,
          pickable: false
        };
      }
    });
    ColorScheme.sunlight = new ColorScheme(function (sat) {
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility') && ColorScheme.objectTypeFlags.facility === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }

      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: colorTheme.facility,
          pickable: true
        };
      }

      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: colorTheme.starLow,
            pickable: true
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: colorTheme.starMed,
            pickable: true
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: colorTheme.starHi,
            pickable: true
          };
        } else {
          // Deselected
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        }
      }

      if (sat.marker) {
        if (sat.id === satSensorMarkerArray[iSensorMarkerArray + 1]) {
          iSensorMarkerArray++;
        }
        if (iSensorMarkerArray >= 0) {
          return {
            color: colorTheme.marker[iSensorMarkerArray],
            marker: true,
            pickable: false
          };
        } else {
          return { // Failsafe
            color: colorTheme.marker[0],
            marker: true,
            pickable: false
          };
        }
      }

      if (sat.static && ColorScheme.objectTypeFlags.sensor === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (sat.static) {
        return {
          color: colorTheme.sensor,
          pickable: true
        };
      }
      if (sat.missile && !sat.inView) {
        return {
          color: colorTheme.missile,
          pickable: true
        };
      }
      if (sat.missile && sat.inView) {
        return {
          color: colorTheme.missileInview,
          pickable: true
        };
      }

      if ((sat.inView) && (sat.inSun > 0) && (ColorScheme.objectTypeFlags.inFOV === true)) {
        if (typeof sat.vmag == 'undefined') {
          return {
            color: colorTheme.umbral,
            pickable: false
          };
        }
        return {
          color: colorTheme.sunlightInview,
          pickable: true
        };
      }

      if (!sat.inView && typeof sat.vmag !== 'undefined') {
        if ((sat.inSun == 2) && (ColorScheme.objectTypeFlags.satHi === true)) {
          if (sat.vmag < 3) {
            return {
              color: colorTheme.starHi,
              pickable: true
            };
          }
          if (sat.vmag <= 4.5) {
            return {
              color: colorTheme.starMed,
              pickable: true
            };
          }
          if (sat.vmag > 4.5) {
            return {
              color: colorTheme.starLow,
              pickable: true
            };
          }
        }

        if ((sat.inSun == 0)  && (ColorScheme.objectTypeFlags.satLow === true)) {
          return {
            color: colorTheme.umbral,
            pickable: false
          };
        }

        if ((sat.inSun == 1) && (ColorScheme.objectTypeFlags.satMed === true)) {
          return {
            color: colorTheme.penumbral,
            pickable: true
          };
        }
        // Not in the vmag database
        return {
          color: colorTheme.umbral,
          pickable: false
        };
      }


      return {
        color: colorTheme.deselected,
        pickable: false
      };
    });
    ColorScheme.sunlight.isSunlightColorScheme = true;
    /// //////////////////////////////
    // NOTE: Doesn't appear to be used
    // ///////////////////////////////
    ColorScheme.apogee = new ColorScheme(function (sat) {
      var ap = sat.apogee;
      colorTheme.gradientAmt = Math.min(ap / 45000, 1.0);
      colorTheme.apogeeGradient = [1.0 - colorTheme.gradientAmt, colorTheme.gradientAmt, 0.0, 1.0];
      return {
        color: colorTheme.apogeeGradient,
        pickable: true
      };
    });
    // ///////////////////////////////

    ColorScheme.smallsats = new ColorScheme(function (sat) {
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.satSmall === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (sat.R < 0.1 && sat.OT === 1) {
        return {
          color: colorTheme.satSmall,
          pickable: true
        };
      } else {
        return {
          color: colorTheme.transparent,
          pickable: false
        };
      }
    });
    ColorScheme.rcs = new ColorScheme(function (sat) {
      var rcs = sat.R;
      if (rcs < 0.1 && ColorScheme.objectTypeFlags.rcsSmall === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if ((rcs >= 0.1 && rcs <= 1) && ColorScheme.objectTypeFlags.rcsMed === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (rcs > 1 && ColorScheme.objectTypeFlags.rcsLarge === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if ((typeof rcs == 'undefined' || typeof rcs == null || rcs == 'N/A') && ColorScheme.objectTypeFlags.rcsUnknown === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (rcs < 0.1) {
        return {
          color: colorTheme.rcsSmall,
          pickable: true
        };
      }
      if (rcs >= 0.1 && rcs <= 1) {
        return {
          color: colorTheme.rcsMed,
          pickable: true
        };
      }
      if (rcs > 1) {
        return {
          color: colorTheme.rcsLarge,
          pickable: true
        };
      }
      // Unknowns
      return {
        color: colorTheme.rcsUnknown,
        pickable: true
      };
    });
    ColorScheme.countries = new ColorScheme(function (sat) {
      var country = sat.C;
      if (country === 'US' && ColorScheme.objectTypeFlags.countryUS === false ||
          cameraType.current === cameraType.PLANETARIUM && country === 'US' && ColorScheme.objectTypeFlags.countryUS === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (country === 'PRC' && ColorScheme.objectTypeFlags.countryPRC === false ||
          cameraType.current === cameraType.PLANETARIUM && country === 'PRC' && ColorScheme.objectTypeFlags.countryPRC === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (country === 'CIS' && ColorScheme.objectTypeFlags.countryCIS === false ||
          cameraType.current === cameraType.PLANETARIUM && country === 'CIS' && ColorScheme.objectTypeFlags.countryCIS === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (country === 'US') {
        return {
          color: colorTheme.countryUS,
          pickable: true
        };
      }
      if (country === 'PRC') {
        return {
          color: colorTheme.countryPRC,
          pickable: true
        };
      }
      if (country === 'CIS') {
        return {
          color: colorTheme.countryCIS,
          pickable: true
        };
      }
      // Other Countries
      if (ColorScheme.objectTypeFlags.countryOther === false ||
          cameraType.current === cameraType.PLANETARIUM && ColorScheme.objectTypeFlags.countryOther === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      return {
        color: colorTheme.countryOther,
        pickable: true
      };
      console.log(sat);
    });
    ColorScheme.lostobjects = new ColorScheme(function (sat) {
      // Objects beyond sensor coverage are hidden
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: colorTheme.starLow,
            pickable: true
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: colorTheme.starMed,
            pickable: true
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: colorTheme.starHi,
            pickable: true
          };
        } else {
          // Deselected
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        }
      }
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: colorTheme.facility,
          pickable: true
        };
      }
      if (sat.static) {
        return {
          color: colorTheme.sensor,
          pickable: true
        };
      }
      if (sat.missile) {
        return {
          color: colorTheme.transparent,
          pickable: false
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
        daysold = jday - sat.TLE1.substr(20, 3) + (sat.TLE1.substr(17, 2) * 365);
      }
      if (pe > satellite.obsmaxrange || daysold < settingsManager.daysUntilObjectLost) {
        return {
          color: colorTheme.transparent,
          pickable: false
        };
      } else {
        if ($('#search').val() === '') {
          $('#search').val($('#search').val() + sat.SCC_NUM);
        } else {
          $('#search').val($('#search').val() + ',' + sat.SCC_NUM);
        }
        return {
          color: colorTheme.lostobjects,
          pickable: true
        };
      }
      return {
        color: colorTheme.transparent,
        pickable: false
      };
    });
    ColorScheme.leo = new ColorScheme(function (sat) {
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: colorTheme.starLow,
            pickable: true
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: colorTheme.starMed,
            pickable: true
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: colorTheme.starHi,
            pickable: true
          };
        } else {
          // Deselected
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        }
      }
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: colorTheme.facility,
          pickable: true
        };
      }
      if (sat.static) {
        return {
          color: colorTheme.sensor,
          pickable: true
        };
      }

      var ap = sat.apogee;
      if (ap > 2000) {
        return {
          color: colorTheme.transparent,
          pickable: false
        };
      } else {
        if ((sat.inView) && (ColorScheme.objectTypeFlags.inFOV === true)) {
          return {
            color: colorTheme.inview,
            pickable: true
          };
        }
        else {
          return {
            color: colorTheme.satLEO,
            pickable: true
          };
        }
      }
    });
    ColorScheme.geo = new ColorScheme(function (sat) {
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: colorTheme.starLow,
            pickable: true
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: colorTheme.starMed,
            pickable: true
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: colorTheme.starHi,
            pickable: true
          };
        } else {
          // Deselected
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        }
      }
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: colorTheme.facility,
          pickable: true
        };
      }
      if (sat.static) {
        return {
          color: colorTheme.sensor,
          pickable: true
        };
      }

      var pe = sat.perigee;
      if (pe < 35000) {
        return {
          color: colorTheme.transparent,
          pickable: false
        };
      } else {
        if ((sat.inView) && (ColorScheme.objectTypeFlags.inFOV === true)) {
          return {
            color: colorTheme.inview,
            pickable: true
          };
        }
        else {
          return {
            color: colorTheme.satGEO,
            pickable: true
          };
        }
      }
    });
    ColorScheme.velocity = new ColorScheme(function (sat) {
      // Stars
      if (sat.static && sat.type === 'Star') {
        if (sat.vmag >= 4.7 && ColorScheme.objectTypeFlags.starLow) {
          return {
            color: colorTheme.starLow,
            pickable: true
          };
        } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && ColorScheme.objectTypeFlags.starMed) {
          return {
            color: colorTheme.starMed,
            pickable: true
          };
        } else if (sat.vmag < 3.5 && ColorScheme.objectTypeFlags.starHi) {
          return {
            color: colorTheme.starHi,
            pickable: true
          };
        } else {
          // Deselected
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        }
      }
      // Facilities
      if (sat.static && (sat.type === 'Launch Facility' || sat.type === 'Control Facility')) {
        return {
          color: colorTheme.facility,
          pickable: true
        };
      }
      // Sensors
      if (sat.static) {
        return {
          color: colorTheme.sensor,
          pickable: true
        };
      }
      var vel = sat.velocity;
      if (sat.inView){
        if (ColorScheme.objectTypeFlags.inviewAlt === false) {
          return {
            color: colorTheme.deselected,
            pickable: false
          };
        } else {
          return {
            color: colorTheme.inviewAlt,
            pickable: true
          };
        }
      }
      if (vel > 5.5 && ColorScheme.objectTypeFlags.velocityFast === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if ((vel >= 2.5 && vel <= 5.5) && ColorScheme.objectTypeFlags.velocityMed === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      if (vel < 2.5 && ColorScheme.objectTypeFlags.velocitySlow === false) {
        return {
          color: colorTheme.deselected,
          pickable: false
        };
      }
      colorTheme.gradientAmt = Math.min(vel / 15, 1.0);
      colorTheme.velGradient = [1.0 - colorTheme.gradientAmt, colorTheme.gradientAmt, 0.0, 1.0];

      return {
        color: colorTheme.velGradient,
        pickable: true
      };
    });
    ColorScheme.velocity.isVelocityColorScheme = true;
    // Used When Displaying a Group/Search of Objects
    ColorScheme.group = new ColorScheme(function (sat) {
      // Glitch in the Matrix
      if (groups.selectedGroup === null) return;
      // Show Things in the Group
      if (sat.isInGroup) {
        return {
          color: colorTheme.inGroup,
          pickable: true
        };
      }
      // Show Markers But Don't Allow Them To Be Selected
      if (sat.marker) {
        return {
          color: colorTheme.marker[0],
          marker: true,
          pickable: false
        };
      }
      // Hide Everything Else
      return {
        color: colorTheme.transparent,
        pickable: false
      };
    });
  };

  window.ColorScheme = ColorScheme;
})();
