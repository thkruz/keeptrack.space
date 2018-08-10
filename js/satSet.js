/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2018, Theodore Kruczek
(c) 2015-2017, James Yoder

satSet.js is the primary interface between sat-cruncher and the main application.
It manages all interaction with the satellite catalogue.
http://keeptrack.space

Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt

All additions and modifications of original code is Copyright © 2016-2018 by
Theodore Kruczek. All rights reserved. No part of this web site may be reproduced,
published, distributed, displayed, performed, copied or stored for public or private
use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

/* global

  $
  Worker
  gl
  vec4
  mat4
  shaderLoader
  ColorScheme

  browserUnsupported
  selectedSat
  selectSat
  updateMap

  tleManager
  timeManager
  settingsManager
  lookangles
  searchBox

*/

// var multThreadCruncher1 = {};
// var multThreadCruncher2 = {};
// var multThreadCruncher3 = {};
// var multThreadCruncher4 = {};
// var multThreadCruncher5 = {};
// var multThreadCruncher6 = {};
// var multThreadCruncher7 = {};
// var multThreadCruncher8 = {};

(function () {
  var TAU = 2 * Math.PI;
  var RAD2DEG = 360 / TAU;

  var satCruncher = {};
  var limitSats = settingsManager.limitSats;

  var DOMcurObjsHTML = document.getElementById('bottom-menu');
  var curObjsHTMLText = '';

  var satSet = {};
  var dotShader;
  var satPosBuf;
  var satColorBuf;

  // Removed to reduce garbage collection
  var buffers;
  var pickColorBuf;
  var pickableBuf;

  var uFOVi;  // Update FOV function iteration i variable
  var uFOVs;  // Update FOV function iteration S variable

  var satPos;
  var satVel;
  var satInView;
  var satAbove;
  var satData;
  var satExtraData;
  var hoveringSat = -1;
  // var selectedSat = -1;

  try {
    $('#loader-text').text('Locating ELSETs...');
    satCruncher = new Worker('js/sat-cruncher.js');
    // multThreadCruncher1 = new Worker('js/mSat.js');
    // multThreadCruncher2 = new Worker('js/mSat.js');
    // multThreadCruncher3 = new Worker('js/mSat.js');
    // multThreadCruncher4 = new Worker('js/mSat.js');
    // multThreadCruncher5 = new Worker('js/mSat.js');
    // multThreadCruncher6 = new Worker('js/mSat.js');
    // multThreadCruncher7 = new Worker('js/mSat.js');
    // multThreadCruncher8 = new Worker('js/mSat.js');
  } catch (E) {
    browserUnsupported();
  }

  /**
   * NOTE: These variables are here rather inside the function because as they
   * loop each iteration it was causing the jsHeap to grow. This isn't noticeable
   * on faster computers because the garbage collector takes care of it, but on
   * slower computers it would noticeably lag when the garbage collector ran.
   *
   * The arbitrary convention used is to put the name of the loop/function the
   * variable is part of at the front of what the name used to be
   * (ex: now --> drawNow) (ex: i --> SCi)
  */

  // draw Loop
  var drawNow = 0;
  var lastDrawTime = 0;
  var drawDivisor;
  var drawDt;
  var drawI;

  var SCi; // Sat Cruncher i loop
  var SCnow = 0;

  var lastFOVUpdateTime = 0;
  var cruncherReadyCallback;
  var gotExtraData = false;

  satCruncher.onmessage = function (m) {
    if (!gotExtraData) { // store extra data that comes from crunching
      // Only do this once

      satExtraData = JSON.parse(m.data.extraData);

      for (SCi = 0; SCi < satSet.numSats; SCi++) {
        satData[SCi].inclination = satExtraData[SCi].inclination;
        satData[SCi].eccentricity = satExtraData[SCi].eccentricity;
        satData[SCi].raan = satExtraData[SCi].raan;
        satData[SCi].argPe = satExtraData[SCi].argPe;
        satData[SCi].meanMotion = satExtraData[SCi].meanMotion;

        satData[SCi].semiMajorAxis = satExtraData[SCi].semiMajorAxis;
        satData[SCi].semiMinorAxis = satExtraData[SCi].semiMinorAxis;
        satData[SCi].apogee = satExtraData[SCi].apogee;
        satData[SCi].perigee = satExtraData[SCi].perigee;
        satData[SCi].period = satExtraData[SCi].period;
      }

      gotExtraData = true;
      satExtraData = null;
      return;
    }

    if (m.data.extraUpdate) {
      satExtraData = JSON.parse(m.data.extraData);
      SCi = m.data.satId;

      satData[SCi].inclination = satExtraData[0].inclination;
      satData[SCi].eccentricity = satExtraData[0].eccentricity;
      satData[SCi].raan = satExtraData[0].raan;
      satData[SCi].argPe = satExtraData[0].argPe;
      satData[SCi].meanMotion = satExtraData[0].meanMotion;

      satData[SCi].semiMajorAxis = satExtraData[0].semiMajorAxis;
      satData[SCi].semiMinorAxis = satExtraData[0].semiMinorAxis;
      satData[SCi].apogee = satExtraData[0].apogee;
      satData[SCi].perigee = satExtraData[0].perigee;
      satData[SCi].period = satExtraData[0].period;
      satData[SCi].TLE1 = satExtraData[0].TLE1;
      satData[SCi].TLE2 = satExtraData[0].TLE2;
      satExtraData = null;
      return;
    }

    satPos = new Float32Array(m.data.satPos);
    satVel = new Float32Array(m.data.satVel);
    satInView = new Float32Array(m.data.satInView);
    satAbove = new Float32Array(m.data.satAbove);
    satSet.satAbove = satAbove;

    if (settingsManager.isMapMenuOpen || settingsManager.isMapUpdateOverride) {
      SCnow = Date.now();
      if (SCnow > settingsManager.lastMapUpdateTime + 30000) {
        updateMap();
        settingsManager.lastMapUpdateTime = SCnow;
        settingsManager.isMapUpdateOverride = false;
      } else if (settingsManager.isMapUpdateOverride) {
        updateMap();
        settingsManager.lastMapUpdateTime = SCnow;
        settingsManager.isMapUpdateOverride = false;
      }
    }

    if (settingsManager.socratesOnSatCruncher) {
      selectSat(settingsManager.socratesOnSatCruncher);
      settingsManager.socratesOnSatCruncher = null;
    }

    if (settingsManager.currentColorScheme === ColorScheme.default && !satellite.sensorSelected() && !settingsManager.isForceColorScheme) {
      // Don't force color recalc if default colors and no sensor for inview color
    } else {
      satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
    }

    if (!settingsManager.cruncherReady) {
      // NOTE:: This is called right after all the objects load on the screen.

      // Version Info Updated
      $('#version-info').html(settingsManager.versionNumber);
      $('#version-info').tooltip({delay: 50, tooltip: settingsManager.versionDate, position: 'top'});

      // Loading Screen Resized
        $('#loading-screen').removeClass('full-loader');
        $('#loading-screen').addClass('mini-loader-container');
        $('#logo-inner-container').addClass('mini-loader');
        $('#logo-text').html('');
        $('#loader-text').html('Attempting to Math...');

      // Hide Menus on Small Screens
      if ($(document).width() <= 1000) {
        // TODO FullScreen Option
        // document.documentElement.webkitRequestFullScreen();
        $('#menu-sensor-info img').hide();
        $('#menu-in-coverage img').hide();
        // $('#menu-lookangles img').removeClass('bmenu-item-disabled');
        // $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
        $('#zoom-in').show();
        $('#zoom-out').show();
        $('#zoom-in img').removeClass('bmenu-item-disabled');
        $('#zoom-out img').removeClass('bmenu-item-disabled');
        $('#menu-find-sat img').removeClass('bmenu-item-disabled');
        $('#menu-twitter img').hide();
        $('#menu-weather img').hide();
        // $('#menu-map img').removeClass('bmenu-item-disabled');
        $('#menu-launches img').hide();
        $('#menu-about img').removeClass('bmenu-item-disabled');
        $('#menu-about img').attr('style', 'border-right:0px;');
        $('#menu-space-stations img').hide();
        $('#menu-satellite-collision img').removeClass('bmenu-item-disabled');
        $('#menu-customSensor img').removeClass('bmenu-item-disabled');
        $('#menu-settings').hide();
        $('#menu-editSat img').show();
        $('#menu-newLaunch img').hide();
        $('#menu-missile img').show();
        $('#social').hide();
        $('#version-info').hide();
        $('#legend-menu').hide();
        $('#mobile-warning').show();
        $('#changelog-row').addClass('center-align');
        $('#fastCompSettings').hide();
        $('#social-alt').show();
        $('.side-menu').attr('style', 'width:100%;height:auto;');
        $('#canvas-holder').attr('style', 'overflow:auto;');
        $('#datetime').attr('style', 'position:fixed;left:130px;top:10px;width:141px;height:32px');
        $('#datetime-text').attr('style', 'padding:6px;height:100%;');
        $('#datetime-input').attr('style', 'bottom:0px;');
        $('#bottom-icons').attr('style', 'position:inherit;');
        $('#mobile-controls').show();
        $('#search').attr('style', 'width:55px;');
        if ($(document).height() >= 600) {
          $('#sat-infobox').attr('style', 'width:100%;top:60%;');
        } else {
          $('#sat-infobox').attr('style', 'width:100%;top:50%;');
        }
      }

      /** Hide SOCRATES menu if not all the satellites are currently available to view */
      if (limitSats !== '') {
        $('#menu-satellite-collision img').hide();
      }

      // Hide More Stuff on Little Screens
      if ($(document).width() <= 400) {
        $('#menu-satellite-collision img').hide();
        $('#reddit-share').hide();
        $('#menu-find-sat').hide();
        $('#sat-infobox').attr('style', 'width:100%;top:60%;');
        $('#datetime').attr('style', 'position:fixed;left:85px;top:10px;width:141px;height:32px');
      }

      // $('#load-cover').fadeOut();
      $('#loading-screen').fadeOut();
      $('body').attr('style', 'background:black');
      $('#canvas-holder').attr('style', 'display:block');
      // $('#menu-info-overlay img').removeClass('bmenu-item-disabled');
      // $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
      // $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
      // $('#menu-lookangles img').removeClass('bmenu-item-disabled');
      // $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
      $('#menu-watchlist img').removeClass('bmenu-item-disabled');
      $('#menu-find-sat img').removeClass('bmenu-item-disabled');
      $('#menu-twitter img').removeClass('bmenu-item-disabled');
      // $('#menu-weather img').removeClass('bmenu-item-disabled');
      // $('#menu-map img').removeClass('bmenu-item-disabled');
      // $('#menu-space-weather img').removeClass('bmenu-item-disabled');
      $('#menu-launches img').removeClass('bmenu-item-disabled');
      $('#menu-about img').removeClass('bmenu-item-disabled');
      $('#menu-space-stations img').removeClass('bmenu-item-disabled');
      $('#menu-satellite-collision img').removeClass('bmenu-item-disabled');
      $('#menu-customSensor img').removeClass('bmenu-item-disabled');
      $('#menu-missile img').removeClass('bmenu-item-disabled');
      $('#menu-settings img').removeClass('bmenu-item-disabled');
      $('#menu-planetarium img').removeClass('bmenu-item-disabled');
      settingsManager.isBottomIconsEnabled = true;
      satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
      settingsManager.cruncherReady = true;
      if (cruncherReadyCallback) {
        cruncherReadyCallback(satData);
      }

      if ($(window).width() > $(window).height()) {
        settingsManager.mapHeight = $(window).width(); // Subtract 12 px for the scroll
        $('#map-image').width(settingsManager.mapHeight);
        settingsManager.mapHeight = settingsManager.mapHeight * 3 / 4;
        $('#map-image').height(settingsManager.mapHeight);
        $('#map-menu').width($(window).width());
      } else {
        settingsManager.mapHeight = $(window).height() - 100; // Subtract 12 px for the scroll
        $('#map-image').height(settingsManager.mapHeight);
        settingsManager.mapHeight = settingsManager.mapHeight * 4 / 3;
        $('#map-image').width(settingsManager.mapHeight);
        $('#map-menu').width($(window).width());
      }
    }
  };

  satSet.changeShaders = function (newShaders) {
    gl.detachShader(dotShader, vertShader);
    gl.detachShader(dotShader, fragShader);
    switch (newShaders) {
      case 12:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-12.glsl'));
        break;
      case 6:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-6.glsl'));
        break;
      case 2:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-2.glsl'));
        break;
    }
    gl.compileShader(vertShader);

    gl.shaderSource(fragShader, shaderLoader.getShaderCode('dot-fragment.glsl'));
    gl.compileShader(fragShader);

    gl.attachShader(dotShader, vertShader);
    gl.attachShader(dotShader, fragShader);
    gl.linkProgram(dotShader);
    dotShader.aPos = gl.getAttribLocation(dotShader, 'aPos');
    dotShader.aColor = gl.getAttribLocation(dotShader, 'aColor');
    dotShader.uMvMatrix = gl.getUniformLocation(dotShader, 'uMvMatrix');
    dotShader.uCamMatrix = gl.getUniformLocation(dotShader, 'uCamMatrix');
    dotShader.uPMatrix = gl.getUniformLocation(dotShader, 'uPMatrix');
  };

  var vertShader;
  var fragShader;

  satSet.init = function (satsReadyCallback) {
    /** Parses GET variables for Possible sharperShaders */
    (function parseFromGETVariables () {
      var queryStr = window.location.search.substring(1);
      var params = queryStr.split('&');
      for (var i = 0; i < params.length; i++) {
        var key = params[i].split('=')[0];
        if (key === 'vertShadersSize') {
          settingsManager.vertShadersSize = 6;
          document.getElementById('settings-shaders').checked = true;
        }
      }
    })();

    dotShader = gl.createProgram();

    vertShader = gl.createShader(gl.VERTEX_SHADER);
    switch (settingsManager.vertShadersSize) {
      case 12:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-12.glsl'));
        break;
      case 6:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-6.glsl'));
        break;
      case 2:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-2.glsl'));
        break;
      default:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-12.glsl'));
        break;
    }
    gl.compileShader(vertShader);

    fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, shaderLoader.getShaderCode('dot-fragment.glsl'));
    gl.compileShader(fragShader);

    gl.attachShader(dotShader, vertShader);
    gl.attachShader(dotShader, fragShader);
    gl.linkProgram(dotShader);

    dotShader.aPos = gl.getAttribLocation(dotShader, 'aPos');
    dotShader.aColor = gl.getAttribLocation(dotShader, 'aColor');
    dotShader.uMvMatrix = gl.getUniformLocation(dotShader, 'uMvMatrix');
    dotShader.uCamMatrix = gl.getUniformLocation(dotShader, 'uCamMatrix');
    dotShader.uPMatrix = gl.getUniformLocation(dotShader, 'uPMatrix');

    if (!settingsManager.offline) {
      var tleSource = settingsManager.tleSource;
      $.get('' + tleSource, function (resp) {
        loadTLEs(resp);
      });
      jsTLEfile = null;
    } else {
      loadTLEs(jsTLEfile);
      jsTLEfile = null;
    }

    function loadTLEs (resp) { // + '?fakeparameter=to_avoid_browser_cache'
      var obslatitude;
      var obslongitude;
      var obsheight;
      var obsminaz;
      var obsmaxaz;
      var obsminel;
      var obsmaxel;
      var obsminrange;
      var obsmaxrange;
      var limitSatsArray = [];

      /** Parses GET variables for SatCruncher initialization */
      (function parseFromGETVariables () {
        var queryStr = window.location.search.substring(1);
        var params = queryStr.split('&');
        for (var i = 0; i < params.length; i++) {
          var key = params[i].split('=')[0];
          var val = params[i].split('=')[1];
          switch (key) {
            case 'limitSats':
              limitSats = val;
              $('#limitSats').val(val);
              document.getElementById('settings-limitSats-enabled').checked = true;
              $('#limitSats-Label').addClass('active');
              limitSatsArray = val.split(',');
              break;
            case 'lat':
              obslatitude = val;
              break;
            case 'long':
              obslongitude = val;
              break;
            case 'hei':
              obsheight = val;
              break;
            case 'minaz':
              obsminaz = val;
              break;
            case 'maxaz':
              obsmaxaz = val;
              break;
            case 'minel':
              obsminel = val;
              break;
            case 'maxel':
              obsmaxel = val;
              break;
            case 'minrange':
              obsminrange = val;
              break;
            case 'maxrange':
              obsmaxrange = val;
              break;
          }
        }
        // TODO: Create logical checks to prevent 'bad' sesnors from being generated
      })();

      /**
       * Filters out extra satellites if limitSats is set
       * @param  limitSats Array of satellites
       * @return Returns only requested satellites if limitSats is setobs
       */
      function filterTLEDatabase (limitSatsArray) {
        var tempSatData = [];
        if (limitSatsArray[0] == null) { // If there are no limits then just process like normal
          limitSats = '';
        }

        var year;
        var prefix;
        var rest;

        for (var i = 0; i < resp.length; i++) {
          resp[i].SCC_NUM = pad0(resp[i].TLE1.substr(2, 5).trim(), 5);
          if (limitSats === '') { // If there are no limits then just process like normal
            year = resp[i].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
            if (year === '') {
              resp[i].intlDes = 'none';
            } else {
              prefix = (year > 50) ? '19' : '20';
              year = prefix + year;
              rest = resp[i].TLE1.substr(9, 8).trim().substring(2);
              resp[i].intlDes = year + '-' + rest;
            }
            resp[i].id = i;
            resp[i].active = true;
            tempSatData.push(resp[i]);
            continue;
          } else { // If there are limited satellites
            for (var x = 0; x < limitSatsArray.length; x++) {
              if (resp[i].SCC_NUM === limitSatsArray[x]) {
                year = resp[i].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
                if (year === '') {
                  resp[i].intlDes = 'none';
                } else {
                  prefix = (year > 50) ? '19' : '20';
                  year = prefix + year;
                  rest = resp[i].TLE1.substr(9, 8).trim().substring(2);
                  resp[i].intlDes = year + '-' + rest;
                }
                resp[i].id = i;
                resp[i].active = true;
                tempSatData.push(resp[i]);
              }
            }
          }
        }
        var isMatchFound = false;
        if (typeof satelliteList !== 'undefined') { // If extra catalogue
          for (s = 0; s < satelliteList.length; s++) {
            isMatchFound = false;
            for (i = 0; i < tempSatData.length; i++) {
              if (satelliteList[s].SCC == undefined) continue;
              if (satelliteList[s].TLE1 == undefined) continue; // Don't Process Bad Satellite Information
              if (satelliteList[s].TLE2 == undefined) continue; // Don't Process Bad Satellite Information
              if (tempSatData[i].SCC_NUM === satelliteList[s].SCC) {
                tempSatData[i].TLE1 = satelliteList[s].TLE1;
                tempSatData[i].TLE2 = satelliteList[s].TLE2;
                isMatchFound = true;
                break;
              }
            }
            if (!isMatchFound) {
              if (satelliteList[s].TLE1 == undefined) continue; // Don't Process Bad Satellite Information
              if (satelliteList[s].TLE2 == undefined) continue; // Don't Process Bad Satellite Information
              year = satelliteList[s].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
              prefix = (year > 50) ? '19' : '20';
              year = prefix + year;
              rest = satelliteList[s].TLE1.substr(9, 8).trim().substring(2);
              extrasSatInfo = {
                static: false,
                missile: false,
                active: false,
                ON: 'Unknown',
                C: 'Unknown',
                LV: 'Unknown',
                LS: 'Unknown',
                SCC_NUM: satelliteList[s].SCC.toString(),
                TLE1: satelliteList[s].TLE1,
                TLE2: satelliteList[s].TLE2,
                intlDes: year + '-' + rest,
                type: 'sat',
                id: tempSatData.length
              };
              tempSatData.push(extrasSatInfo);
            }
          }
          satelliteList = null;
        }
        if (typeof satInfoList !== 'undefined') { // If extra catalogue
          for (s = 0; s < satInfoList.length; s++) {
            isMatchFound = false;
            // NOTE i=s may need to be i=0, but this should be more effecient
            for (i = s; i < tempSatData.length; i++) {
              if (satInfoList[s].SCC === tempSatData[i].SCC_NUM) {
                tempSatData[i].ON = satInfoList[s].ON;
                tempSatData[i].C = satInfoList[s].C;
                tempSatData[i].LV = satInfoList[s].LV;
                tempSatData[i].LS = satInfoList[s].LS;
                tempSatData[i].URL = satInfoList[s].URL;
                isMatchFound = true;
                break;
              }
            }
          }
          satInfoList = null;
        }

        loggerStop = Date.now();
        for (i = 0; i < tleManager.staticSet.length; i++) {
          tempSatData.push(tleManager.staticSet[i]);
        }
        for (i = 0; i < tleManager.analSatSet.length; i++) {
          tleManager.analSatSet[i].id = tempSatData.length;
          tempSatData.push(tleManager.analSatSet[i]);
        }
        for (i = 0; i < tleManager.missileSet.length; i++) {
          tempSatData.push(tleManager.missileSet[i]);
        }
        // console.log(tempSatData.length);
        return tempSatData;
      }

      satData = filterTLEDatabase(limitSatsArray);
      resp = null;
      satSet.satDataString = JSON.stringify(satData);

      timeManager.propRealTime = Date.now(); // assumed same as value in Worker, not passing

      /** If custom sensor set then send parameters to lookangles and satCruncher */
      if (obslatitude !== undefined && obslongitude !== undefined && obsheight !== undefined && obsminaz !== undefined && obsmaxaz !== undefined && obsminel !== undefined &&
          obsmaxel !== undefined && obsminrange !== undefined && obsmaxrange !== undefined) {
        satellite.setobs({
          lat: obslatitude,
          long: obslongitude,
          obshei: obsheight,
          obsminaz: obsminaz,
          obsmaxaz: obsmaxaz,
          obsminel: obsminel,
          obsmaxel: obsmaxel,
          obsminrange: obsminrange,
          obsmaxrange: obsmaxrange
        });

        satCruncher.postMessage({
          typ: 'offset',
          dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
          setlatlong: true,
          lat: obslatitude,
          long: obslongitude,
          obshei: obsheight,
          obsminaz: obsminaz,
          obsmaxaz: obsmaxaz,
          obsminel: obsminel,
          obsmaxel: obsmaxel,
          obsminrange: obsminrange,
          obsmaxrange: obsmaxrange
        });

        $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
      }

      /** Send satDataString to satCruncher to begin propagation loop */
      satCruncher.postMessage({
        typ: 'satdata',
        dat: satSet.satDataString
      });
      // multThreadCruncher1.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher2.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher3.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher4.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher5.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher6.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher7.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher8.postMessage({type: 'init', data: satSet.satDataString});
      $('#loader-text').text('Drawing Satellites...');

      // populate GPU mem buffers, now that we know how many sats there are
      satPosBuf = gl.createBuffer();
      satPos = new Float32Array(satData.length * 3);

      var pickColorData = [];
      pickColorBuf = gl.createBuffer();
      for (var i = 0; i < satData.length; i++) {
        var byteR = (i + 1) & 0xff;
        var byteG = ((i + 1) & 0xff00) >> 8;
        var byteB = ((i + 1) & 0xff0000) >> 16;
        pickColorData.push(byteR / 255.0);
        pickColorData.push(byteG / 255.0);
        pickColorData.push(byteB / 255.0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, pickColorBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pickColorData), gl.STATIC_DRAW);

      satSet.numSats = satData.length;

      satSet.setColorScheme(ColorScheme.default, true);

      settingsManager.shadersReady = true;
      if (satsReadyCallback) {
        satsReadyCallback(satData);
      }
    }
  };

  satSet.getSatData = function () {
    return satData;
  };

  satSet.setColorScheme = function (scheme, isInViewChange) {
    settingsManager.currentColorScheme = scheme;
    buffers = scheme.calculateColorBuffers(isInViewChange);
    satColorBuf = buffers.colorBuf;
    pickableBuf = buffers.pickableBuf;
  };

  var screenLocation = [];

  satSet.draw = function (pMatrix, camMatrix, drawNow) {
    // NOTE: 640 byte leak.

    if (!settingsManager.shadersReady || !settingsManager.cruncherReady) return;

    drawDivisor = Math.max(timeManager.propRate, 0.001);
    drawDt = Math.min((drawNow - lastDrawTime) / 1000.0, 1.0 / drawDivisor);
    for (drawI = 0; drawI < (satData.length * 3); drawI++) {
      satPos[drawI] += satVel[drawI] * drawDt * timeManager.propRate;
    }
    // console.log('interp dt=' + dt + ' ' + drawNow);

    gl.useProgram(dotShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);

    gl.uniformMatrix4fv(dotShader.uMvMatrix, false, mat4.create());
    gl.uniformMatrix4fv(dotShader.uCamMatrix, false, camMatrix);
    gl.uniformMatrix4fv(dotShader.uPMatrix, false, pMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, satPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, satPos, gl.STREAM_DRAW);
    gl.vertexAttribPointer(dotShader.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
    gl.enableVertexAttribArray(dotShader.aColor);
    gl.vertexAttribPointer(dotShader.aColor, 4, gl.FLOAT, false, 0, 0);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.depthMask(false);

    gl.drawArrays(gl.POINTS, 0, satData.length);

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // now pickbuffer stuff......

    gl.useProgram(gl.pickShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    //  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, mat4.create());
    gl.uniformMatrix4fv(gl.pickShaderProgram.uCamMatrix, false, camMatrix);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, satPosBuf);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPos);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(gl.pickShaderProgram.aColor);
    gl.bindBuffer(gl.ARRAY_BUFFER, pickColorBuf);
    gl.vertexAttribPointer(gl.pickShaderProgram.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, pickableBuf);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPickable);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPickable, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, satData.length); // draw pick

    lastDrawTime = drawNow;
    satSet.updateFOV(null, drawNow);
  };

  var uFOVSearchItems;
  var inViewObs = [];
  satSet.updateFOV = function (curSCC, now) {
    if (now - lastFOVUpdateTime > 1 * 1000 / timeManager.propRate && settingsManager.isBottomMenuOpen === true) { // If it has been 1 seconds since last update that the menu is open
      inViewObs = [];
      DOMcurObjsHTML.innerHTML = '';
      for (uFOVi = 0; uFOVi < (satData.length); uFOVi++) {
        if ($('#search').val() === '') {
          if (satData[uFOVi].inview) {
            inViewObs.push(satData[uFOVi].SCC_NUM);
          }
        } else {
          uFOVSearchItems = $('#search').val().split(',');
          for (uFOVs = 0; uFOVs < ($('#datetime-text').length); uFOVs++) {
            if (satData[uFOVi].inview && satData[uFOVi].SCC_NUM === uFOVSearchItems[uFOVs]) {
              inViewObs.push(satData[uFOVi].SCC_NUM);
            }
          }
        }
      }
      curObjsHTMLText = '';
      for (uFOVi = 0; uFOVi < inViewObs.length; uFOVi++) {
        curObjsHTMLText += "<span class='FOV-object link'>" + inViewObs[uFOVi] + '</span>\n';
      }
      DOMcurObjsHTML.innerHTML = curObjsHTMLText;
      lastFOVUpdateTime = now;
    }
  };

  satSet.mergeSat = function (satObject) {
    if (!satData) return null;
    var i = satSet.getIdFromObjNum(satObject.SCC);
    satData[i].ON = satObject.ON;
    satData[i].C = satObject.C;
    satData[i].LV = satObject.LV;
    satData[i].LS = satObject.LS;
    satData[i].R = satObject.R;
    satData[i].URL = satObject.URL;
    satData[i].NOTES = satObject.NOTES;
    satData[i].TTP = satObject.TTP;
    satData[i].FMISSED = satObject.FMISSED;
    satData[i].ORPO = satObject.ORPO;
    satData[i].constellation = satObject.constellation;
    satData[i].associates = satObject.associates;
    satData[i].maneuver = satObject.maneuver;

  };

  satSet.setSat = function (i, satObject) {
    if (!satData) return null;
    satData[i] = satObject;
  };

  satSet.getSat = function (i) {
    if (!satData) return null;

    if (!satData[i]) return null;
    if (gotExtraData) {
      satData[i].inViewChange = false;
      if (satData[i].inview !== satInView[i]) satData[i].inViewChange = true;
      satData[i].inview = satInView[i];
      satData[i].velocity = Math.sqrt(
        satVel[i * 3] * satVel[i * 3] +
        satVel[i * 3 + 1] * satVel[i * 3 + 1] +
        satVel[i * 3 + 2] * satVel[i * 3 + 2]
      );
      satData[i].position = {
        x: satPos[i * 3],
        y: satPos[i * 3 + 1],
        z: satPos[i * 3 + 2]
      };
    }

    return satData[i];
  };

  satSet.getIdFromIntlDes = function (intlDes) {
    for (var i = 0; i < satData.length; i++) {
      if (satData[i].intlDes === intlDes) {
        return i;
      }
    }
    return null;
  };

  function pad0 (str, max) {
    return str.length < max ? pad0('0' + str, max) : str;
  }

  satSet.getSatFromObjNum = function (objNum) {
      var satID = satSet.getIdFromObjNum (objNum);
      return satSet.getSat(satID);
  };

  satSet.getIdFromObjNum = function (objNum) {
    var scc;
    for (var i = 0; i < satData.length; i++) {
      if (satData[i].static || satData[i].missile) {
        continue;
      } else {
        scc = pad0(satData[i].TLE1.substr(2, 5).trim(), 5);
      }

      if (scc.indexOf(objNum) === 0) { // && satData[i].OBJECT_TYPE !== 'unknown') { // OPTIMIZATION: Determine if this code can be removed.
        return i;
      }
    }
    return null;
  };

  satSet.getScreenCoords = function (i, pMatrix, camMatrix) {
    var pos = satSet.getSat(i).position;
    var posVec4 = vec4.fromValues(pos.x, pos.y, pos.z, 1);
    // var transform = mat4.create();

    vec4.transformMat4(posVec4, posVec4, camMatrix);
    vec4.transformMat4(posVec4, posVec4, pMatrix);

    var glScreenPos = {
      x: (posVec4[0] / posVec4[3]),
      y: (posVec4[1] / posVec4[3]),
      z: (posVec4[2] / posVec4[3])
    };

    var x = (glScreenPos.x + 1) * 0.5 * window.innerWidth;
    var y = (-glScreenPos.y + 1) * 0.5 * window.innerHeight;

    if (x >= 0 && y >= 0 && glScreenPos.z >= 0 && glScreenPos.z <= 1) {
      return {
        x: x,
        y: y,
        z: glScreenPos.z
      };
    } else {
      return 1; // Return 1 for failure
    }
  };

  satSet.searchNameRegex = function (regex) {
    var res = [];
    for (var i = 0; i < satData.length; i++) {
      if (regex.test(satData[i].ON)) {
        res.push(i);
      }
    }
    return res;
  };

  satSet.searchCountryRegex = function (regex) {
    var res = [];
    for (var i = 0; i < satData.length; i++) {
      if (regex.test(satData[i].C)) {
        res.push(i);
      }
    }
    return res;
  };

  satSet.searchAzElRange = function (azimuth, elevation, range, inclination, azMarg, elMarg, rangeMarg, incMarg, period, periodMarg) {
    var isCheckAz = !isNaN(parseFloat(azimuth)) && isFinite(azimuth);
    var isCheckEl = !isNaN(parseFloat(elevation)) && isFinite(elevation);
    var isCheckRange = !isNaN(parseFloat(range)) && isFinite(range);
    var isCheckInclination = !isNaN(parseFloat(inclination)) && isFinite(inclination);
    var isCheckPeriod = !isNaN(parseFloat(period)) && isFinite(period);
    var isCheckAzMarg = !isNaN(parseFloat(azMarg)) && isFinite(azMarg);
    var isCheckElMarg = !isNaN(parseFloat(elMarg)) && isFinite(elMarg);
    var isCheckRangeMarg = !isNaN(parseFloat(rangeMarg)) && isFinite(rangeMarg);
    var isCheckIncMarg = !isNaN(parseFloat(incMarg)) && isFinite(incMarg);
    var isCheckPeriodMarg = !isNaN(parseFloat(periodMarg)) && isFinite(periodMarg);
    if (!isCheckEl && !isCheckRange && !isCheckAz && !isCheckInclination && !isCheckPeriod) return; // Ensure there is a number typed.

    if (!isCheckAzMarg) { azMarg = 5; }
    if (!isCheckElMarg) { elMarg = 5; }
    if (!isCheckRangeMarg) { rangeMarg = 200; }
    if (!isCheckIncMarg) { incMarg = 1; }
    if (!isCheckPeriodMarg) { periodMarg = 0.5; }
    var res = [];

    var s = 0;
    for (var i = 0; i < satData.length; i++) {
      if (satData[i].static || satData[i].missile || !satData[i].active) { continue; }
      res.push(satData[i]);
      satellite.getTEARR(res[s]);
      res[s].azimuth = satellite.currentTEARR.azimuth;
      res[s].elevation = satellite.currentTEARR.elevation;
      res[s].range = satellite.currentTEARR.range;
      res[s].inview = satellite.currentTEARR.inview;
      s++;
    }

    if (!isCheckInclination && !isCheckPeriod) {
      res = checkInview(res);
    }

    if (isCheckAz) {
      azimuth = azimuth * 1; // Convert azimuth to int
      azMarg = azMarg * 1;
      var minaz = azimuth - azMarg;
      var maxaz = azimuth + azMarg;
      res = checkAz(res, minaz, maxaz);
    }

    if (isCheckEl) {
      elevation = elevation * 1; // Convert elevation to int
      elMarg = elMarg * 1;
      var minel = elevation - elMarg;
      var maxel = elevation + elMarg;
      res = checkEl(res, minel, maxel);
    }

    if (isCheckRange) {
      range = range * 1; // Convert range to int
      rangeMarg = rangeMarg * 1;
      var minrange = range - rangeMarg;
      var maxrange = range + rangeMarg;
      res = checkRange(res, minrange, maxrange);
    }

    if (isCheckInclination) {
      inclination = inclination * 1; // Convert inclination to int
      incMarg = incMarg * 1;
      var minInc = inclination - incMarg;
      var maxInc = inclination + incMarg;
      res = checkInc(res, minInc, maxInc);
    }

    if (isCheckPeriod) {
      period = period * 1; // Convert period to int
      periodMarg = periodMarg * 1;
      var minPeriod = period - periodMarg;
      var maxPeriod = period + periodMarg;
      res = checkPeriod(res, minPeriod, maxPeriod);
    }

    function checkInview (possibles) {
      var inviewRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].inview) {
          inviewRes.push(possibles[i]);
        }
      }
      return inviewRes;
    }

    function checkAz (possibles, minaz, maxaz) {
      var azRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].azimuth < maxaz && possibles[i].azimuth > minaz) {
          azRes.push(possibles[i]);
        }
      }
      return azRes;
    }
    function checkEl (possibles, minel, maxel) {
      var elRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].elevation < maxel && possibles[i].elevation > minel) {
          elRes.push(possibles[i]);
        }
      }
      return elRes;
    }
    function checkRange (possibles, minrange, maxrange) {
      var rangeRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].range < maxrange && possibles[i].range > minrange) {
          rangeRes.push(possibles[i]);
        }
      }
      return rangeRes;
    }
    function checkInc (possibles, minInc, maxInc) {
      var IncRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if ((possibles[i].inclination * RAD2DEG).toFixed(2) < maxInc && (possibles[i].inclination * RAD2DEG).toFixed(2) > minInc) {
          IncRes.push(possibles[i]);
        }
      }
      return IncRes;
    }
    function checkPeriod (possibles, minPeriod, maxPeriod) {
      var PeriodRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].period < maxPeriod && possibles[i].period > minPeriod && PeriodRes.length <= 200) { // Don't display more than 200 results - this is because LEO and GEO belt have a lot of satellites
          PeriodRes.push(possibles[i]);
        }
      }
      if (PeriodRes.length >= 200) {
        $('#findByLooks-results').text('Limited to 200 Results!');
      }
      return PeriodRes;
    }
    // $('#findByLooks-results').text('');
    // TODO: Intentionally doesn't clear previous searches. Could be an option later.
    var SCCs = [];
    for (i = 0; i < res.length; i++) {
      // $('#findByLooks-results').append(res[i].SCC_NUM + '<br />');
      if (i < res.length - 1) {
        $('#search').val($('#search').val() + res[i].SCC_NUM + ',');
      } else {
        $('#search').val($('#search').val() + res[i].SCC_NUM);
      }
      SCCs.push(res[i].SCC_NUM);
    }
    searchBox.doSearch($('#search').val());
    // console.log(SCCs);
    return res;
  };

  satSet.setHover = function (i) {
    if (i === hoveringSat) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
    if (hoveringSat !== -1 && hoveringSat !== selectedSat) {
      gl.bufferSubData(gl.ARRAY_BUFFER, hoveringSat * 4 * 4, new Float32Array(settingsManager.currentColorScheme.colorizer(satSet.getSat(hoveringSat)).color));
    }
    if (i !== -1) {
      gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(settingsManager.hoverColor));
    }
    hoveringSat = i;
  };

  satSet.selectSat = function (i) {
    if (i === selectedSat) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
    if (selectedSat !== -1) {
      gl.bufferSubData(gl.ARRAY_BUFFER, selectedSat * 4 * 4, new Float32Array(settingsManager.currentColorScheme.colorizer(satSet.getSat(selectedSat)).color));
    }
    if (i !== -1) {
      gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(settingsManager.selectedColor));
    }
    selectedSat = i;
    if (satellite.sensorSelected()) {
      $('#menu-lookangles img').removeClass('bmenu-item-disabled');
    }
    $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
    $('#menu-map img').removeClass('bmenu-item-disabled');
    $('#menu-editSat img').removeClass('bmenu-item-disabled');
    $('#menu-newLaunch img').removeClass('bmenu-item-disabled');
  };

  satSet.onCruncherReady = function (cruncherReadyCallback) {
    if (settingsManager.cruncherReady) cruncherReadyCallback(); // Prevent cruncher callbacks until cruncher ready.
  };

  window.satSet = satSet;
  window.satCruncher = satCruncher;
})();
