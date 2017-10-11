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
  var ColorScheme = function (colorizer) {
    this.colorizer = colorizer;
    this.colorBuf = gl.createBuffer();
    this.pickableBuf = gl.createBuffer();
  };

  ColorScheme.prototype.calculateColorBuffers = function () {
    var numSats = satSet.numSats;
    var colorData = new Float32Array(numSats * 4);
    var pickableData = new Float32Array(numSats);
    for (var i = 0; i < numSats; i++) {
      var colors = this.colorizer(i);
      colorData[i * 4] = colors.color[0];  // R
      colorData[i * 4 + 1] = colors.color[1]; // G
      colorData[i * 4 + 2] = colors.color[2]; // B
      colorData[i * 4 + 3] = colors.color[3]; // A
      pickableData[i] = colors.pickable ? 1 : 0;
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

  ColorScheme.init = function () {
    ColorScheme.default = new ColorScheme(function (satId) {
      var sat = satSet.getSat(satId);
      if (sat.static && sat.type === 'Launch Facility') {
        return {
          color: [0.54, 0.0, 0.54, 1.0],
          pickable: true
        };
      }
      if (sat.static) {
        return {
          color: [1.0, 0.0, 0.0, 1.0],
          pickable: true
        };
      }
      if (sat.missile && !sat.inview) {
        return {
          color: [1.0, 1.0, 0.0, 1.0],
          pickable: true
        };
      }
      if (sat.missile && sat.inview) {
        return {
          color: [1.0, 0.0, 0.0, 1.0],
          pickable: true
        };
      }
      var ap = sat.apogee;
      var pe = sat.perigee;
      var color;
      if (sat.inview) {
        color = [0.85, 0.5, 0.0, 1.0];
      } else if (sat.OT === 1) { // Payload
        color = [0.2, 1.0, 0.0, 0.5];
      } else if (sat.OT === 2) { // Rocket Body
        color = [0.2, 0.5, 1.0, 0.85];
        //  return [0.6, 0.6, 0.6];
      } else if (sat.OT === 3) { // Debris
        color = [0.5, 0.5, 0.5, 0.85];
      } else {
        color = [0.5, 0.5, 0.5, 0.85];
      }

      if ((pe > lookangles.obsmaxrange || ap < lookangles.obsminrange)) {
        return {
          color: [1.0, 1.0, 1.0, settingsManager.otherSatelliteTransparency],
          pickable: false
        };
      }

      return {
        color: color,
        pickable: true
      };
    });
    ColorScheme.onlyFOV = new ColorScheme(function (satId) {
      var sat = satSet.getSat(satId);
      if (sat.inview) {
        return {
          color: [0.85, 0.5, 0.0, 1.0],
          pickable: true
        };
      } else {
        return {
          color: [1.0, 1.0, 1.0, settingsManager.otherSatelliteTransparency],
          pickable: false
        };
      }
    });
    ColorScheme.apogee = new ColorScheme(function (satId) {
      var ap = satSet.getSat(satId).apogee;
      var gradientAmt = Math.min(ap / 45000, 1.0);
      return {
        color: [1.0 - gradientAmt, gradientAmt, 0.0, 1.0],
        pickable: true
      };
    });
    ColorScheme.smallsats = new ColorScheme(function (satId) {
      if (satSet.getSat(satId).R < 0.1 && satSet.getSat(satId).OT === 1) {
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      } else {
        return {
          color: [1.0, 1.0, 1.0, settingsManager.otherSatelliteTransparency],
          pickable: false
        };
      }
    });
    ColorScheme.rcs = new ColorScheme(function (satId) {
      var rcs = satSet.getSat(satId).R;
      if (rcs < 0.1) {
        return {
          color: [1.0, 0, 0, 0.6],
          pickable: true
        };
      }
      if (rcs >= 0.1 && rcs <= 1) {
        return {
          color: [1.0, 1.0, 0, 0.6],
          pickable: true
        };
      }
      if (rcs > 1) {
        return {
          color: [0, 1.0, 0, 0.6],
          pickable: true
        };
      }
      return {
        color: [0, 0, 1.0, 0.6],
        pickable: true
      };
    });
    ColorScheme.lostobjects = new ColorScheme(function (satId) {
      var sat = satSet.getSat(satId);
      if (sat.static && sat.type === 'Launch Facility') {
        return {
          color: [0.54, 0.0, 0.54, 1.0],
          pickable: true
        };
      }
      if (sat.static) {
        return {
          color: [1.0, 0.0, 0.0, 1.0],
          pickable: true
        };
      }
      if (sat.missile && !sat.inview) {
        return {
          color: [1.0, 1.0, 0.0, 1.0],
          pickable: true
        };
      }
      if (sat.missile && sat.inview) {
        return {
          color: [1.0, 0.0, 0.0, 1.0],
          pickable: true
        };
      }
      var pe = sat.perigee;
      var now = new Date();
      var jday = timeManager.getDOY(now);
      now = now.getFullYear();
      now = now.toString().substr(2, 2);
      var daysold;
      if (sat.TLE1.substr(18, 2) === now) {
        daysold = jday - sat.TLE1.substr(20, 3);
      } else {
        daysold = jday - sat.TLE1.substr(20, 3) + (sat.TLE1.substr(17, 2) * 365);
      }
      if (pe > lookangles.obsmaxrange || daysold < 31) {
        return {
          color: [1.0, 1.0, 1.0, settingsManager.otherSatelliteTransparency],
          pickable: false
        };
      } else {
        if ($('#search').val() === '') {
          $('#search').val($('#search').val() + sat.SCC_NUM);
        } else {
          $('#search').val($('#search').val() + ',' + sat.SCC_NUM);
        }
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      }
    });
    ColorScheme.leo = new ColorScheme(function (satId) {
      var ap = satSet.getSat(satId).apogee;
      if (ap > 2000) {
        return {
          color: [1.0, 1.0, 1.0, settingsManager.otherSatelliteTransparency],
          pickable: false
        };
      } else {
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      }
    });
    ColorScheme.geo = new ColorScheme(function (satId) {
      var pe = satSet.getSat(satId).perigee;
      if (pe < 35000) {
        return {
          color: [1.0, 1.0, 1.0, settingsManager.otherSatelliteTransparency],
          pickable: false
        };
      } else {
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      }
    });
    ColorScheme.velocity = new ColorScheme(function (satId) {
      var vel = satSet.getSat(satId).velocity;
      var gradientAmt = Math.min(vel / 15, 1.0);
      return {
        color: [1.0 - gradientAmt, gradientAmt, 0.0, 1.0],
        pickable: true
      };
    });
    ColorScheme.group = new ColorScheme(function (satId) {
      if (groups.selectedGroup.hasSat(satId)) {
        return {
          color: [0.2, 1.0, 0.0, 0.5],
          pickable: true
        };
      } else {
        return {
          color: [1.0, 1.0, 1.0, settingsManager.otherSatelliteTransparency],
          pickable: false
        };
      }
    });

    $('#color-schemes-submenu').mouseover(function () {
    });
  };

  window.ColorScheme = ColorScheme;
})();
