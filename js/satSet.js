/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
(c) 2015-2016, James Yoder

satSet.js is the primary interface between sat-cruncher and the main application.
It manages all interaction with the satellite catalogue.
http://keeptrack.space

Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt

All additions and modifications of original code is Copyright © 2016-2020 by
Theodore Kruczek. All rights reserved. No part of this web site may be reproduced,
published, distributed, displayed, performed, copied or stored for public or private
use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

var satSensorMarkerArray = [];
var emptyMat4 = mat4.create();
(function () {
    var TAU = 2 * Math.PI;
    var RAD2DEG = 360 / TAU;

    var satCruncher = {};
    var limitSats = settingsManager.limitSats;

    var satSet = {};
    var dotShader;
    var satPosBuf;
    var satColorBuf;
    var starBuf;

    // Removed to reduce garbage collection
    var buffers;
    var pickColorBuf;
    var pickableBuf;

    var uFOVi; // Update FOV function iteration i variable
    var uFOVs; // Update FOV function iteration S variable

    var satPos;
    var satVel;
    var satInView;
    var satInSun;
    var satData;
    var satExtraData;

    try {
        $('#loader-text').text('Locating ELSETs...');
        satCruncher = new Worker(
            settingsManager.installDirectory + 'js/satCruncher.js'
        );
    } catch (E) {
        console.log(E);
        browserUnsupported();
    }

    /**
     * These variables are here rather inside the function because as they
     * loop each iteration it was causing the jsHeap to grow. This isn't noticeable
     * on faster computers because the garbage collector takes care of it, but on
     * slower computers it would noticeably lag when the garbage collector ran.
     *
     * The arbitrary convention used is to put the name of the loop/function the
     * variable is part of at the front of what the name used to be
     * (ex: now --> drawNow) (ex: i --> satCrunchIndex)
     */
    // draw Loop
    var drawNow = 0;
    var lastDrawTime = 0;
    var drawDivisor;
    var drawDt;
    var drawI;

    var satCrunchIndex;
    var satCrunchNow = 0;

    var lastFOVUpdateTime = 0;
    var cruncherReadyCallback;
    var gotExtraData = false;

    satCruncher.onmessage = (m) => {
        if (!gotExtraData) {
            // store extra data that comes from crunching
            // Only do this once

            satExtraData = JSON.parse(m.data.extraData);

            for (
                satCrunchIndex = 0;
                satCrunchIndex < satSet.numSats;
                satCrunchIndex++
            ) {
                satData[satCrunchIndex].inclination =
                    satExtraData[satCrunchIndex].inclination;
                satData[satCrunchIndex].eccentricity =
                    satExtraData[satCrunchIndex].eccentricity;
                satData[satCrunchIndex].raan =
                    satExtraData[satCrunchIndex].raan;
                satData[satCrunchIndex].argPe =
                    satExtraData[satCrunchIndex].argPe;
                satData[satCrunchIndex].meanMotion =
                    satExtraData[satCrunchIndex].meanMotion;

                satData[satCrunchIndex].semiMajorAxis =
                    satExtraData[satCrunchIndex].semiMajorAxis;
                satData[satCrunchIndex].semiMinorAxis =
                    satExtraData[satCrunchIndex].semiMinorAxis;
                satData[satCrunchIndex].apogee =
                    satExtraData[satCrunchIndex].apogee;
                satData[satCrunchIndex].perigee =
                    satExtraData[satCrunchIndex].perigee;
                satData[satCrunchIndex].period =
                    satExtraData[satCrunchIndex].period;
            }

            gotExtraData = true;
            satExtraData = null;
            return;
        }

        if (m.data.extraUpdate) {
            satExtraData = JSON.parse(m.data.extraData);
            satCrunchIndex = m.data.satId;

            satData[satCrunchIndex].inclination = satExtraData[0].inclination;
            satData[satCrunchIndex].eccentricity = satExtraData[0].eccentricity;
            satData[satCrunchIndex].raan = satExtraData[0].raan;
            satData[satCrunchIndex].argPe = satExtraData[0].argPe;
            satData[satCrunchIndex].meanMotion = satExtraData[0].meanMotion;

            satData[satCrunchIndex].semiMajorAxis =
                satExtraData[0].semiMajorAxis;
            satData[satCrunchIndex].semiMinorAxis =
                satExtraData[0].semiMinorAxis;
            satData[satCrunchIndex].apogee = satExtraData[0].apogee;
            satData[satCrunchIndex].perigee = satExtraData[0].perigee;
            satData[satCrunchIndex].period = satExtraData[0].period;
            satData[satCrunchIndex].TLE1 = satExtraData[0].TLE1;
            satData[satCrunchIndex].TLE2 = satExtraData[0].TLE2;
            satExtraData = null;
            return;
        }

        satPos = new Float32Array(m.data.satPos);
        satVel = new Float32Array(m.data.satVel);

        if (typeof m.data.satInView != 'undefined') {
            satInView = new Int8Array(m.data.satInView);
        }
        if (typeof m.data.satInSun != 'undefined') {
            satInSun = new Int8Array(m.data.satInSun);
        }
        if (typeof m.data.sensorMarkerArray != 'undefined') {
            satSensorMarkerArray = m.data.sensorMarkerArray;
        }

        if (
            settingsManager.isMapMenuOpen ||
            settingsManager.isMapUpdateOverride
        ) {
            satCrunchNow = Date.now();
            if (satCrunchNow > settingsManager.lastMapUpdateTime + 30000) {
                uiManager.updateMap();
                settingsManager.lastMapUpdateTime = satCrunchNow;
                settingsManager.isMapUpdateOverride = false;
            } else if (settingsManager.isMapUpdateOverride) {
                uiManager.updateMap();
                settingsManager.lastMapUpdateTime = satCrunchNow;
                settingsManager.isMapUpdateOverride = false;
            }
        }

        if (settingsManager.socratesOnSatCruncher) {
            selectSat(settingsManager.socratesOnSatCruncher);
            settingsManager.socratesOnSatCruncher = null;
        }

        // Don't force color recalc if default colors and no sensor for inview color
        if (
            (objectManager.isSensorManagerLoaded &&
                sensorManager.checkSensorSelected()) ||
            settingsManager.isForceColorScheme
        ) {
            // Don't change colors while dragging
            if (!isDragging) {
                satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
            }
        }

        if (!settingsManager.cruncherReady) {
            /** Hide SOCRATES menu if not all the satellites are currently available to view */
            if (limitSats !== '') {
                $('#menu-satellite-collision').hide();
            }

            satSet.onCruncherReady();
            if (!settingsManager.disableUI) {
              (function _reloadLastSensor() {
                  let currentSensor = !settingsManager.offline
                      ? JSON.parse(localStorage.getItem('currentSensor'))
                      : null;
                  if (currentSensor !== null) {
                      try {
                          // If there is a staticnum set use that
                          if (
                              typeof currentSensor[0] == 'undefined' ||
                              currentSensor[0] == null
                          ) {
                              sensorManager.setSensor(null, currentSensor[1]);
                              uiManager.legendMenuChange('default');
                          } else {
                              // If the sensor is a string, load that collection of sensors
                              if (
                                  typeof currentSensor[0].shortName ==
                                  'undefined'
                              ) {
                                  sensorManager.setSensor(
                                      currentSensor[0],
                                      currentSensor[1]
                                  );
                                  uiManager.legendMenuChange('default');
                              } else {
                                  // Seems to be a single sensor without a staticnum, load that
                                  sensorManager.setSensor(
                                      sensorManager.sensorList[
                                          currentSensor[0].shortName
                                      ],
                                      currentSensor[1]
                                  );
                                  uiManager.legendMenuChange('default');
                              }
                          }
                      } catch (e) {
                          // Clear old settings because they seem corrupted
                          localStorage.setItem('currentSensor', null);
                          console.warn('Saved Sensor Information Invalid');
                      }
                  }
              })();
              (function _watchlistInit() {
                  let watchlistJSON = !settingsManager.offline
                      ? localStorage.getItem('watchlistList')
                      : null;
                  if (watchlistJSON !== null) {
                      let newWatchlist = JSON.parse(watchlistJSON);
                      watchlistInViewList = [];
                      for (let i = 0; i < newWatchlist.length; i++) {
                          let sat = satSet.getSatExtraOnly(
                              satSet.getIdFromObjNum(newWatchlist[i])
                          );
                          if (sat !== null) {
                              newWatchlist[i] = sat.id;
                              watchlistInViewList.push(false);
                          } else {
                              console.error('Watchlist File Format Incorret');
                              return;
                          }
                      }
                      uiManager.updateWatchlist(
                          newWatchlist,
                          watchlistInViewList
                      );
                  }
              })();
            }

            try {
              nextLaunchManager.init();
            } catch (e) {
              // Might not have this module
            }

            (function _parseGetParameters() {
                // do querystring stuff
                let params = satSet.queryStr.split('&');

                // Do Searches First
                for (let i = 0; i < params.length; i++) {
                    let key = params[i].split('=')[0];
                    let val = params[i].split('=')[1];
                    if (key == 'search') {
                        // console.log('preloading search to ' + val);
                        // Sensor Selection takes 1.5 seconds to update color Scheme
                        // TODO: SensorManager might be the problem here, but this works
                        // _doDelayedSearch(val);
                        if (!settingsManager.disableUI) {
                            searchBox.doSearch(val);
                        }
                    }
                }

                // Then Do Other Stuff
                for (let i = 0; i < params.length; i++) {
                    let key = params[i].split('=')[0];
                    let val = params[i].split('=')[1];
                    let urlSatId;
                    switch (key) {
                        case 'intldes':
                            urlSatId = satSet.getIdFromIntlDes(
                                val.toUpperCase()
                            );
                            if (urlSatId !== null) {
                                selectSat(urlSatId);
                            }
                            break;
                        case 'sat':
                            urlSatId = satSet.getIdFromObjNum(
                                val.toUpperCase()
                            );
                            if (urlSatId !== null) {
                                selectSat(urlSatId);
                            }
                            break;
                        case 'misl':
                            var subVal = val.split(',');
                            $('#ms-type').val(subVal[0].toString());
                            $('#ms-attacker').val(subVal[1].toString());
                            // $('#ms-lat-lau').val() * 1;
                            // ('#ms-lon-lau').val() * 1;
                            $('#ms-target').val(subVal[2].toString());
                            // $('#ms-lat').val() * 1;
                            // $('#ms-lon').val() * 1;
                            $('#missile').trigger('submit');
                            break;
                        case 'date':
                            timeManager.propOffset = Number(val) - Date.now();
                            $('#datetime-input-tb').datepicker(
                                'setDate',
                                new Date(
                                    timeManager.propRealTime +
                                        timeManager.propOffset
                                )
                            );
                            satCruncher.postMessage({
                                typ: 'offset',
                                dat:
                                    timeManager.propOffset.toString() +
                                    ' ' +
                                    timeManager.propRate.toString(),
                            });
                            break;
                        case 'rate':
                            val = Math.min(val, 1000);
                            // could run time backwards, but let's not!
                            val = Math.max(val, 0.0);
                            // console.log('propagating at rate ' + val + ' x real time ');
                            timeManager.propRate = Number(val);
                            satCruncher.postMessage({
                                typ: 'offset',
                                dat:
                                    timeManager.propOffset.toString() +
                                    ' ' +
                                    timeManager.propRate.toString(),
                            });
                            break;
                    }
                }
            })();
            if (settingsManager.startWithOrbitsDisplayed) {
                setTimeout(function () {
                    // Time Machine
                    // orbitManager.historyOfSatellitesPlay();

                    // All Orbits
                    groups.debris = new groups.SatGroup('all', '');
                    groups.selectGroup(groups.debris);
                    satSet.setColorScheme(
                        settingsManager.currentColorScheme,
                        true
                    ); // force color recalc
                    groups.debris.updateOrbits();
                    settingsManager.isOrbitOverlayVisible = true;
                }, 0);
            }

            // Load ALl The Images Now
            setTimeout(function () {
              $('img').each(function () {
                  $(this).attr('src', $(this).attr('delayedsrc'));
              });
            }, 0);

            settingsManager.cruncherReady = true;
        }
    };

    function _doDelayedSearch(val) {
        setTimeout(() => {
            searchBox.doSearch(val);
        }, 2000);
    }

    var vertShader;
    var fragShader;
    satSet.changeShaders = (newShaders) => {
        gl.detachShader(dotShader, vertShader);
        gl.detachShader(dotShader, fragShader);
        switch (newShaders) {
            case 'var':
                gl.shaderSource(
                    vertShader,
                    shaderLoader.getShaderCode('dot-vertex-var.glsl')
                );
                break;
            case 12:
                gl.shaderSource(
                    vertShader,
                    shaderLoader.getShaderCode('dot-vertex-12.glsl')
                );
                break;
            case 6:
                gl.shaderSource(
                    vertShader,
                    shaderLoader.getShaderCode('dot-vertex-6.glsl')
                );
                break;
            case 2:
                gl.shaderSource(
                    vertShader,
                    shaderLoader.getShaderCode('dot-vertex-2.glsl')
                );
                break;
        }
        gl.compileShader(vertShader);

        gl.shaderSource(
            fragShader,
            shaderLoader.getShaderCode('dot-fragment.glsl')
        );
        gl.compileShader(fragShader);

        gl.attachShader(dotShader, vertShader);
        gl.attachShader(dotShader, fragShader);
        gl.linkProgram(dotShader);
        dotShader.aPos = gl.getAttribLocation(dotShader, 'aPos');
        dotShader.aColor = gl.getAttribLocation(dotShader, 'aColor');
        dotShader.aStar = gl.getAttribLocation(dotShader, 'aStar');
        dotShader.minSize = gl.getUniformLocation(dotShader, 'minSize');
        dotShader.maxSize = gl.getUniformLocation(dotShader, 'maxSize');
        dotShader.uMvMatrix = gl.getUniformLocation(dotShader, 'uMvMatrix');
        dotShader.uCamMatrix = gl.getUniformLocation(dotShader, 'uCamMatrix');
        dotShader.uPMatrix = gl.getUniformLocation(dotShader, 'uPMatrix');
    };

    satSet.init = (satsReadyCallback) => {
        satSet.satsReadyCallback = satsReadyCallback;
        db.log('satSet.init');
        /** Parses GET variables for Possible sharperShaders */
        (function parseFromGETVariables() {
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

        // Make New Vertex Array Objects
        // satSet.vao = gl.createVertexArray();
        // gl.bindVertexArray(satSet.vao);

        dotShader = gl.createProgram();

        vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(
            vertShader,
            shaderLoader.getShaderCode('dot-vertex-var.glsl')
        );
        gl.compileShader(vertShader);

        fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(
            fragShader,
            shaderLoader.getShaderCode('dot-fragment.glsl')
        );
        gl.compileShader(fragShader);

        gl.attachShader(dotShader, vertShader);
        gl.attachShader(dotShader, fragShader);
        gl.linkProgram(dotShader);

        dotShader.aPos = gl.getAttribLocation(dotShader, 'aPos');
        dotShader.aColor = gl.getAttribLocation(dotShader, 'aColor');
        dotShader.aStar = gl.getAttribLocation(dotShader, 'aStar');
        dotShader.minSize = gl.getUniformLocation(dotShader, 'minSize');
        dotShader.maxSize = gl.getUniformLocation(dotShader, 'maxSize');
        dotShader.uMvMatrix = gl.getUniformLocation(dotShader, 'uMvMatrix');
        dotShader.uCamMatrix = gl.getUniformLocation(dotShader, 'uCamMatrix');
        dotShader.uPMatrix = gl.getUniformLocation(dotShader, 'uPMatrix');

        // Setup Catalog Now that SatSet is setup
        satSet.startCatalogLoad = () => {
          settingsManager.isCatalogPreloaded = true;
          if (typeof settingsManager.tleSource == 'undefined') {
            settingsManager.tleSource = 'tle/TLE.json';
          }
          if (settingsManager.offline) {
            satSet.loadTLEs(jsTLEfile);
            jsTLEfile = null;
          } else {
            try {
              var tleSource = settingsManager.tleSource;
              // $.get('' + tleSource + '?v=' + settingsManager.versionNumber)
              $.get({
                url: '' + tleSource,
                cache: false
              }).done(function (resp) {
                // if the .json loads then use it
                satSet.loadTLEs(resp);
              })
              .fail(function () {
                // Disable Caching
                // Try using a cached version - mainly for serviceWorker
                $.get({
                  url: '' + tleSource,
                  cache: true
                }).done(function (resp) {
                  // if the .json loads then use it
                  satSet.loadTLEs(resp);
                })
                .fail(function () {
                  // Try the js file without caching
                  $.getScript('offline/tle.js', function () {
                    satSet.loadTLEs(jsTLEfile);
                  }, true);
                });
              });
              jsTLEfile = null;
            } catch (e) {
              satSet.loadTLEs(jsTLEfile);
              jsTLEfile = null;
            }
          }
        };
        satSet.startCatalogLoad();
    };
    // Load the Catalog
    satSet.loadTLEs = (resp) => {
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

      // Get TruSat TLEs if in TruSat Mode
      if (
        typeof trusatList == 'undefined' &&
        settingsManager.trusatMode &&
        !settingsManager.trusatOnly
      ) {
        // console.log(`${Date.now()} - TruSat TLEs Loading...`);
        $.getScript('/tle/trusat.js', function (resp) {
          // console.log(`${Date.now()} - TruSat TLEs Loaded!`);
          satSet.loadTLEs(resp); // Try again when you have all TLEs
        });
        return; // Stop and Wait for the TruSat TLEs to Load
      }

      /** Parses GET variables for SatCruncher initialization */
      (function parseFromGETVariables() {
        var queryStr = window.location.search.substring(1);
        var params = queryStr.split('&');
        for (var i = 0; i < params.length; i++) {
          var key = params[i].split('=')[0];
          var val = params[i].split('=')[1];
          switch (key) {
            case 'limitSats':
            limitSats = val;
            $('#limitSats').val(val);
            // document.getElementById('settings-limitSats-enabled').checked = true;
            $('#limitSats-Label').addClass('active');
            limitSatsArray = val.split(',');
            break;
            case 'lat':
            if (val >= -90 && val <= 90) obslatitude = val;
            break;
            case 'long':
            if (val >= -180 && val <= 360) obslongitude = val;
            break;
            case 'hei':
            if (val >= -20 && val <= 20) obsheight = val;
            break;
            case 'minaz':
            if (val >= 0 && val <= 360) obsminaz = val;
            break;
            case 'maxaz':
            if (val >= 0 && val <= 360) obsmaxaz = val;
            break;
            case 'minel':
            if (val >= -10 && val <= 180) obsminel = val;
            break;
            case 'maxel':
            if (val >= -10 && val <= 180) obsmaxel = val;
            break;
            case 'minrange':
            if (val >= 0) obsminrange = val;
            break;
            case 'maxrange':
            if (val <= 10000000) obsmaxrange = val;
            break;
          }
        }
      })();

      /**
      * Filters out extra satellites if limitSats is set
      * @param  limitSats Array of satellites
      * @return Returns only requested satellites if limitSats is setobs
      */
      function filterTLEDatabase(limitSatsArray) {
        var tempSatData = [];
        if (limitSatsArray[0] == null) {
          // If there are no limits then just process like normal
          limitSats = '';
        }

        var year;
        var prefix;
        var rest;

        // if (settingsManager.offline) {
        //   resp = JSON.parse(resp);
        // }

        for (var i = 0; i < resp.length; i++) {
          resp[i].SCC_NUM = pad0(resp[i].TLE1.substr(2, 5).trim(), 5);
          if (limitSats === '') {
            // If there are no limits then just process like normal
            year = resp[i].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
            if (year === '') {
              resp[i].intlDes = 'none';
            } else {
              prefix = year > 50 ? '19' : '20';
              year = prefix + year;
              rest = resp[i].TLE1.substr(9, 8)
              .trim()
              .substring(2);
              resp[i].intlDes = year + '-' + rest;
            }
            resp[i].id = i;
            resp[i].active = true;
            tempSatData.push(resp[i]);
            continue;
          } else {
            // If there are limited satellites
            for (var x = 0; x < limitSatsArray.length; x++) {
              if (resp[i].SCC_NUM === limitSatsArray[x]) {
                year = resp[i].TLE1.substr(9, 8)
                .trim()
                .substring(0, 2); // clean up intl des for display
                if (year === '') {
                  resp[i].intlDes = 'none';
                } else {
                  prefix = year > 50 ? '19' : '20';
                  year = prefix + year;
                  rest = resp[i].TLE1.substr(9, 8)
                  .trim()
                  .substring(2);
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
        if (
          typeof satelliteList !== 'undefined' &&
          settingsManager.offline
        ) {
          // If extra catalogue
          for (s = 0; s < satelliteList.length; s++) {
            isMatchFound = false;
            for (i = 0; i < tempSatData.length; i++) {
              if (satelliteList[s].SCC == undefined) continue;
              if (satelliteList[s].TLE1 == undefined) continue; // Don't Process Bad Satellite Information
              if (satelliteList[s].TLE2 == undefined) continue; // Don't Process Bad Satellite Information
              if (
                tempSatData[i].SCC_NUM === satelliteList[s].SCC
              ) {
                tempSatData[i].ON = satelliteList[s].ON;
                tempSatData[i].OT =
                typeof satelliteList[s].OT != 'undefined'
                ? satelliteList[s].OT
                : null;
                tempSatData[i].TLE1 = satelliteList[s].TLE1;
                tempSatData[i].TLE2 = satelliteList[s].TLE2;
                isMatchFound = true;
                break;
              }
            }
            if (!isMatchFound) {
              if (satelliteList[s].TLE1 == undefined) continue; // Don't Process Bad Satellite Information
              if (satelliteList[s].TLE2 == undefined) continue; // Don't Process Bad Satellite Information
              if (typeof satelliteList[s].ON == 'undefined') {
                satelliteList[s].ON = 'Unknown';
              }
              if (typeof satelliteList[s].OT == 'undefined') {
                satelliteList[s].OT = null;
              }
              year = satelliteList[s].TLE1.substr(9, 8)
              .trim()
              .substring(0, 2); // clean up intl des for display
              prefix = year > 50 ? '19' : '20';
              year = prefix + year;
              rest = satelliteList[s].TLE1.substr(9, 8)
              .trim()
              .substring(2);
              extrasSatInfo = {
                static: false,
                missile: false,
                active: true,
                ON: satelliteList[s].ON,
                OT: satelliteList[s].OT,
                C: 'Unknown',
                LV: 'Unknown',
                LS: 'Unknown',
                SCC_NUM: satelliteList[s].SCC.toString(),
                TLE1: satelliteList[s].TLE1,
                TLE2: satelliteList[s].TLE2,
                intlDes: year + '-' + rest,
                type: 'sat',
                id: tempSatData.length,
                vmag: satelliteList[s].vmag,
              };
              tempSatData.push(extrasSatInfo);
            }
          }
          satelliteList = null;
        }
        if (
          typeof satInfoList !== 'undefined' &&
          settingsManager.offline
        ) {
          // If extra catalogue
          for (s = 0; s < satInfoList.length; s++) {
            isMatchFound = false;
            // NOTE i=s may need to be i=0, but this should be more effecient.
            // There should be some sorting done earlier
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
        // console.log(`${Date.now()} - Merging TruSat TLEs`);
        if (
          typeof trusatList !== 'undefined' &&
          settingsManager.trusatMode
        ) {
          // If extra catalogue
          for (s = 0; s < trusatList.length; s++) {
            if (trusatList[s].TLE1 == undefined) continue; // Don't Process Bad Satellite Information
            if (trusatList[s].TLE2 == undefined) continue; // Don't Process Bad Satellite Information
            if (typeof trusatList[s].ON == 'undefined') {
              trusatList[s].ON = 'Unknown';
            }
            if (typeof trusatList[s].OT == 'undefined') {
              trusatList[s].OT = null;
            }
            year = trusatList[s].TLE1.substr(9, 8)
            .trim()
            .substring(0, 2); // clean up intl des for display
            prefix = year > 50 ? '19' : '20';
            year = prefix + year;
            rest = trusatList[s].TLE1.substr(9, 8)
            .trim()
            .substring(2);
            scc = pad0(
              parseInt(
                trusatList[s].TLE1.substr(2, 5).trim()
              ).toString(),
              5
            );
            extrasSatInfo = {
              static: false,
              missile: false,
              active: true,
              trusat: true,
              ON: trusatList[s].ON,
              OT: 4, // Amateur Report
              C: 'Unknown',
              LV: 'Unknown',
              LS: 'Unknown',
              SCC_NUM: `T${scc.toString()}`,
              TLE1: trusatList[s].TLE1,
              TLE2: trusatList[s].TLE2,
              intlDes: year + '-' + rest,
              type: 'sat',
              id: tempSatData.length,
            };
            tempSatData.push(extrasSatInfo);
          }
          trusatList = null;
        }

        satSet.orbitalSats = tempSatData.length;
        objectManager.starIndex1 += satSet.orbitalSats;
        objectManager.starIndex2 += satSet.orbitalSats;

        loggerStop = Date.now();
        for (i = 0; i < objectManager.staticSet.length; i++) {
          tempSatData.push(objectManager.staticSet[i]);
        }
        for (i = 0; i < objectManager.analSatSet.length; i++) {
          objectManager.analSatSet[i].id = tempSatData.length;
          tempSatData.push(objectManager.analSatSet[i]);
        }

        radarDataManager.satDataStartIndex = tempSatData.length + 1;

        for (let i = 0; i < objectManager.radarDataSet.length; i++) {
          tempSatData.push(objectManager.radarDataSet[i]);
        }

        for (i = 0; i < objectManager.missileSet.length; i++) {
          tempSatData.push(objectManager.missileSet[i]);
        }

        satSet.missileSats = tempSatData.length;

        for (i = 0; i < objectManager.fieldOfViewSet.length; i++) {
          objectManager.fieldOfViewSet[i].id = tempSatData.length;
          tempSatData.push(objectManager.fieldOfViewSet[i]);
        }
        // console.log(tempSatData.length);
        return tempSatData;
      }

      satData = filterTLEDatabase(limitSatsArray);
      resp = null;
      satSet.satDataString = JSON.stringify(satData);

      timeManager.propRealTime = Date.now(); // assumed same as value in Worker, not passing

      /** If custom sensor set then send parameters to lookangles and satCruncher */
      if (
        obslatitude !== undefined &&
        obslongitude !== undefined &&
        obsheight !== undefined &&
        obsminaz !== undefined &&
        obsmaxaz !== undefined &&
        obsminel !== undefined &&
        obsmaxel !== undefined &&
        obsminrange !== undefined &&
        obsmaxrange !== undefined
      ) {
        satellite.setobs({
          lat: obslatitude,
          long: obslongitude,
          obshei: obsheight,
          obsminaz: obsminaz,
          obsmaxaz: obsmaxaz,
          obsminel: obsminel,
          obsmaxel: obsmaxel,
          obsminrange: obsminrange,
          obsmaxrange: obsmaxrange,
        });

        satCruncher.postMessage({
          typ: 'offset',
          dat:
          timeManager.propOffset.toString() +
          ' ' +
          timeManager.propRate.toString(),
          setlatlong: true,
          lat: obslatitude,
          long: obslongitude,
          obshei: obsheight,
          obsminaz: obsminaz,
          obsmaxaz: obsmaxaz,
          obsminel: obsminel,
          obsmaxel: obsmaxel,
          obsminrange: obsminrange,
          obsmaxrange: obsmaxrange,
        });
      }

      /** Send satDataString to satCruncher to begin propagation loop */
      satCruncher.postMessage({
        typ: 'satdata',
        dat: satSet.satDataString,
        fieldOfViewSetLength: objectManager.fieldOfViewSet.length,
        isLowPerf: settingsManager.lowPerf,
      });
      // multThreadCruncher1.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher2.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher3.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher4.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher5.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher6.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher7.postMessage({type: 'init', data: satSet.satDataString});
      // multThreadCruncher8.postMessage({type: 'init', data: satSet.satDataString});

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
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(pickColorData),
        gl.STATIC_DRAW
      );

      starBuf = gl.createBuffer();
      satSet.setupStarBuffer();

      satSet.numSats = satData.length;
      satSet.setColorScheme(ColorScheme.default, true);
      settingsManager.shadersReady = true;

      if (satSet.satsReadyCallback) {
        satSet.satsReadyCallback(satData);
        if (!settingsManager.trusatOnly) {
          // If No Visual Magnitudes, Add The VMag Database
          try {
            if (
              typeof satSet.getSat(satSet.getIdFromObjNum(44235))
              .vmag == 'undefined'
            ) {
              satVmagManager.init();
            }
          } catch (e) {
            console.debug('satVmagManager Not Loaded');
          }
        }
      }
    };

    satSet.getSatData = () => {
        db.log('satSet.getSatData');
        return satData;
    };

    satSet.getSatInView = () => {
        db.log('satSet.getSatInView');
        if (typeof satInView == 'undefined') return false;
        return satInView;
    };
    satSet.getSatInSun = () => {
        db.log('satSet.getSatInSun');
        if (typeof satInSun == 'undefined') return false;
        return satInSun;
    };
    satSet.getSatVel = () => {
        db.log('satSet.getSatVel');
        if (typeof satVel == 'undefined') return false;
        return satVel;
    };

    satSet.setColorScheme = (scheme, isForceRecolor) => {
        db.log('satSet.setColorScheme');
        settingsManager.currentColorScheme = scheme;
        try {
            buffers = scheme.calculateColorBuffers(isForceRecolor);
            satColorBuf = buffers.colorBuf;
            pickableBuf = buffers.pickableBuf;
        } catch (e) {
            console.log('satSet.setColorScheme not ready yet!');
        }
    };

    satSet.convertIdArrayToSatnumArray = (satIdArray) => {
      let satnumArray = [];
      for (let i = 0; i < satIdArray.length; i++) {
        satnumArray.push(parseInt(satSet.getSat(satIdArray[i]).SCC_NUM));
      }
      return satnumArray;
    };

    satSet.convertSatnumArrayToIdArray = (satnumArray) => {
      let satIdArray = [];
      for (let i = 0; i < satnumArray.length; i++) {
        try {
          satIdArray.push(satSet.getSatFromObjNum(satnumArray[i]).id);
        } catch (e) {
            // console.log(`Missing Sat: ${satnumArray[i]}`);
        }
      }
      return satIdArray;
    };

    satSet.searchCelestrak = (satNum, analsat) => {
      // If no Analyst Satellite specified find the first unused one
      if (typeof analsat == 'undefined') {
          for (var i = 15000; i < satData.length; i++) {
            if (satData[i].SCC_NUM >= 80000 && !satData[i].active) {
                analsat = i;
                break;
            }
          }
      } else {
        // Satnum to Id
        analsat = satSet.getIdFromObjNum(analsat);
      }

      let request = new XMLHttpRequest();
      request.open('GET', `php/get_data.php?type=c&sat=${satNum}`, true);

      request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
          // Success!
          let tles = JSON.parse(this.response).split('\n');
          let TLE1 = tles[1];
          let TLE2 = tles[2];
          satSet.insertNewAnalystSatellite(TLE1, TLE2, analsat);
        } else {
          // We reached our target server, but it returned an error
          console.warn('Celestrack request returned an error!');
        }
      };

      request.onerror = function() {
        console.warn('Celestrack request failed!');
      };

      request.send();

      // $.ajax({
      //     async:true,
      //     // dataType : 'jsonp',   //you may use jsonp for cross origin request
      //     crossDomain:true,
      //     url: `php/get_data.php?type=c&sat=${satNum}`,
      //     success: function(data) {
      //         let tles = data.split('\n');
      //         let TLE1 = tles[1];
      //         let TLE2 = tles[2];
      //         satSet.insertNewAnalystSatellite(TLE1, TLE2, analsat);
      //     }
      // });
    };

    satSet.searchN2yo = (satNum, analsat) => {
      // If no Analyst Satellite specified find the first unused one
      if (typeof analsat == 'undefined') {
          for (var i = 15000; i < satData.length; i++) {
            if (satData[i].SCC_NUM >= 80000 && !satData[i].active) {
                analsat = i;
                break;
            }
          }
      } else {
        // Satnum to Id
        analsat = satSet.getIdFromObjNum(analsat);
      }

      let request = new XMLHttpRequest();
      request.open('GET', `php/get_data.php?type=n&sat=${satNum}`, true);

      request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
          // Success!
          let tles = this.response.split('<div id="tle">')[1].split('<pre>')[1].split('\n')
          let TLE1 = tles[0];
          let TLE2 = tles[1];
          satSet.insertNewAnalystSatellite(TLE1, TLE2, analsat);
        } else {
          // We reached our target server, but it returned an error
          console.warn('N2YO request returned an error!');
        }
      };

      request.onerror = function() {
        console.warn('N2YO request failed!');
      };

      request.send();

      // $.ajax({
      //     async:true,
      //     // dataType : 'jsonp',   //you may use jsonp for cross origin request
      //     crossDomain:true,
      //     url: `php/get_data.php?type=n&sat=${satNum}`,
      //     success: function(data) {
      //         let tles = data.split('<div id="tle">')[1].split('\n');
      //         let TLE1 = tles[2];
      //         let TLE2 = tles[3];
      //         satSet.insertNewAnalystSatellite(TLE1, TLE2, analsat);
      //     }
      // });
    };

    satSet.insertNewAnalystSatellite = (TLE1, TLE2, analsat) => {
      if (
          satellite.altitudeCheck(
              TLE1,
              TLE2,
              timeManager.propOffset
          ) > 1
      ) {
          satCruncher.postMessage({
              typ: 'satEdit',
              id: analsat,
              active: true,
              TLE1: TLE1,
              TLE2: TLE2,
          });
          orbitManager.updateOrbitBuffer(analsat, true, TLE1, TLE2);
          let sat = satSet.getSat(analsat);
          sat.active = true;
          sat.OT = 1; // Default to Satellite
          searchBox.doSearch(sat.SCC_NUM.toString());
      } else {
          alert('Failed Altitude Check');
      }
    };

    satSet.setupStarBuffer = () => {
      let starBufData = satSet.setupStarData(satData);
      gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
      gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(starBufData),
          gl.STATIC_DRAW
      );
    };

    satSet.setupStarData = (satData) => {
        let starArray = [];
        for (var i = 0; i < satData.length; i++) {
            if (
                i >= objectManager.starIndex1 &&
                // true
                i <= objectManager.starIndex2
            ) {
                starArray.push(1.0);
            } else {
                starArray.push(0.0);
            }
        }
        // Pretend Satellites that are currently being searched are stars
        // The shaders will display these "stars" like close satellites
        // because the distance from the center of the earth is too close to
        // be a star. This method is so there are less buffers needed but as
        // computers get faster it should be replaced
        for (let i = 0; i < settingsManager.lastSearchResults.length; i++) {
          starArray[settingsManager.lastSearchResults[i]] = 1.0;
        }
        return starArray;
    };

    satSet.updateRadarData = () => {
      for (let i = 0; i < radarDataManager.radarData.length; i++) {
        try {
          satData[radarDataManager.satDataStartIndex + i].name = radarDataManager.radarData[i].name;
          satData[radarDataManager.satDataStartIndex + i].t = radarDataManager.radarData[i].t;
          satData[radarDataManager.satDataStartIndex + i].dataType = radarDataManager.radarData[i].dataType;
        } catch (e) {
          // console.log(radarDataManager.radarData[i]);
        }
      }
    };

    var screenLocation = [];
    let drawPropTime,isDidOnce;
    satSet.draw = (pMatrix, camMatrix, drawNow) => {
        // NOTE: 640 byte leak.
        if (!settingsManager.shadersReady || !settingsManager.cruncherReady)
            return;

        drawPropTime = timeManager.propTime() * 1;
        if (radarDataManager.radarData.length > 0) {
          if (radarDataManager.drawT1 == 0) radarDataManager.findFirstDataTime();

          isDidOnce = false;
          for (drawI = radarDataManager.drawT1; drawI < radarDataManager.radarData.length; drawI++) {
            // Don't Exceed Max Radar Data Allocation
            // if (drawI > settingsManager.maxRadarData) break;

            if (radarDataManager.radarData[drawI].t >= (drawPropTime - 3000) && radarDataManager.radarData[drawI].t <= (drawPropTime + 3000)) {
              if (!isDidOnce) {
                radarDataManager.drawT1 = drawI;
                isDidOnce = true;
              }
              // Skip if Already done
              if (satPos[(radarDataManager.satDataStartIndex + drawI) * 3] !== 0) continue;

              // Update Radar Marker Position
              satPos[(radarDataManager.satDataStartIndex + drawI) * 3] = radarDataManager.radarData[drawI].x;
              satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 1] = radarDataManager.radarData[drawI].y;
              satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 2] = radarDataManager.radarData[drawI].z;
              // NOTE: satVel could be added later
            } else {
              // Reset all positions outside time window
              satPos[(radarDataManager.satDataStartIndex + drawI) * 3] = 0;
              satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 1] = 0;
              satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 2] = 0;
            }

            if (radarDataManager.radarData[drawI].t > (drawPropTime + 3000)) {
              break;
            }
          }
        }

        // gl.bindVertexArray(satSet.vao);

        drawDivisor = Math.max(timeManager.propRate, 0.001);
        drawDt = Math.min((drawNow - lastDrawTime) / 1000.0, 1.0 / drawDivisor);
        drawDt *= timeManager.propRate; // Adjust drawDt correspond to the propagation rate
        satSet.satDataLenInDraw = satData.length;
        if (
            !settingsManager.lowPerf &&
            drawDt > settingsManager.minimumDrawDt
        ) {
            if (
                !settingsManager.isSatOverflyModeOn &&
                !settingsManager.isFOVBubbleModeOn
            ) {
                satSet.satDataLenInDraw -=
                    (settingsManager.maxFieldOfViewMarkers + settingsManager.maxRadarData);
                satSet.satDataLenInDraw3 = satSet.satDataLenInDraw * 3;
                for (drawI = 0; drawI < satSet.satDataLenInDraw3; drawI++) {
                    satPos[drawI] += satVel[drawI] * drawDt;
                }
            } else {
                satSet.satDataLenInDraw3 = satSet.satDataLenInDraw * 3;
                for (drawI = 0; drawI < satSet.satDataLenInDraw3; drawI++) {
                    satPos[drawI] += satVel[drawI] * drawDt;
                }
            }
            lastDrawTime = drawNow;
        }

        // console.log('interp dt=' + dt + ' ' + drawNow);

        gl.useProgram(dotShader);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);

        gl.uniformMatrix4fv(dotShader.uMvMatrix, false, emptyMat4);
        gl.uniformMatrix4fv(dotShader.uCamMatrix, false, camMatrix);
        gl.uniformMatrix4fv(dotShader.uPMatrix, false, pMatrix);
        gl.uniform1f(dotShader.minSize, settingsManager.satShader.minSize);
        gl.uniform1f(dotShader.maxSize, settingsManager.satShader.maxSize);

        gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
        gl.enableVertexAttribArray(dotShader.aStar);
        gl.vertexAttribPointer(dotShader.aStar, 1, gl.FLOAT, false, 0, 0);

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
        try {
            gl.useProgram(gl.pickShaderProgram);
            gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
            //  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.uniformMatrix4fv(
                gl.pickShaderProgram.uMvMatrix,
                false,
                emptyMat4
            );
            gl.uniformMatrix4fv(
                gl.pickShaderProgram.uCamMatrix,
                false,
                camMatrix
            );
            gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);

            gl.enableVertexAttribArray(gl.pickShaderProgram.aColor);
            gl.bindBuffer(gl.ARRAY_BUFFER, pickColorBuf);
            gl.vertexAttribPointer(
                gl.pickShaderProgram.aColor,
                3,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, pickableBuf);
            gl.enableVertexAttribArray(gl.pickShaderProgram.aPickable);
            gl.vertexAttribPointer(
                gl.pickShaderProgram.aPickable,
                1,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.drawArrays(gl.POINTS, 0, satData.length); // draw pick
        } catch (e) {
            db.log(`satData.length: ${satData.length}`);
            db.log(e);
        }
        // satSet.updateFOV(null, drawNow);

        // Done Drawing
        return true;
    };

    satSet.setSat = (i, satObject) => {
        if (!satData) return null;
        satData[i] = satObject;
    };
    satSet.mergeSat = (satObject) => {
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
    satSet.vmagUpdate = (vmagObject) => {
        if (!satData) return null;
        var i = satSet.getIdFromObjNum(vmagObject.satid);
        try {
            satData[i].vmag = vmagObject.vmag;
        } catch (e) {
            // console.warn('Old Satellite in vmagManager: ' + vmagObject.satid);
        }
    };

    satSet.getSat = (i) => {
        db.log('satSet.getSat', true);
        if (!satData) return null;
        if (!satData[i]) return null;
        if (gotExtraData) {
            satData[i].inViewChange = false;
            if (
                typeof satInView != 'undefined' &&
                typeof satInView[i] != 'undefined'
            ) {
                if (satData[i].inview !== satInView[i])
                    satData[i].inViewChange = true;
                satData[i].inview = satInView[i];
            } else {
                satData[i].inview = false;
                satData[i].inViewChange = false;
            }

            if (
                typeof satInSun != 'undefined' &&
                typeof satInSun[i] != 'undefined'
            ) {
                if (satData[i].inSun !== satInSun[i])
                    satData[i].inSunChange = true;
                satData[i].inSun = satInSun[i];
            }

            satData[i].velocity = Math.sqrt(
                satVel[i * 3] * satVel[i * 3] +
                    satVel[i * 3 + 1] * satVel[i * 3 + 1] +
                    satVel[i * 3 + 2] * satVel[i * 3 + 2]
            );
            satData[i].velocityX = satVel[i * 3];
            satData[i].velocityY = satVel[i * 3 + 1];
            satData[i].velocityZ = satVel[i * 3 + 2];
            satData[i].position = {
                x: satPos[i * 3],
                y: satPos[i * 3 + 1],
                z: satPos[i * 3 + 2],
            };
        }

        // Add Functions One Time
        if (typeof satData[i].isInSun == 'undefined') {
            satData[i].isInSun = () => {
                // Distances all in km
                let sunECI = sun.getXYZ();

                // NOTE: Code is mashed to save memory when used on the whole catalog

                // Position needs to be relative to satellite NOT ECI
                // var distSatEarthX = Math.pow(-satData[i].position.x, 2);
                // var distSatEarthY = Math.pow(-satData[i].position.y, 2);
                // var distSatEarthZ = Math.pow(-satData[i].position.z, 2);
                // var distSatEarth = Math.sqrt(distSatEarthX + distSatEarthY + distSatEarthZ);
                // var semiDiamEarth = Math.asin(RADIUS_OF_EARTH/distSatEarth) * RAD2DEG;
                let semiDiamEarth =
                    Math.asin(
                        RADIUS_OF_EARTH /
                            Math.sqrt(
                                Math.pow(-satData[i].position.x, 2) +
                                    Math.pow(-satData[i].position.y, 2) +
                                    Math.pow(-satData[i].position.z, 2)
                            )
                    ) * RAD2DEG;

                // Position needs to be relative to satellite NOT ECI
                // var distSatSunX = Math.pow(-satData[i].position.x + sunECI.x, 2);
                // var distSatSunY = Math.pow(-satData[i].position.y + sunECI.y, 2);
                // var distSatSunZ = Math.pow(-satData[i].position.z + sunECI.z, 2);
                // var distSatSun = Math.sqrt(distSatSunX + distSatSunY + distSatSunZ);
                // var semiDiamSun = Math.asin(RADIUS_OF_SUN/distSatSun) * RAD2DEG;
                let semiDiamSun =
                    Math.asin(
                        RADIUS_OF_SUN /
                            Math.sqrt(
                                Math.pow(-satData[i].position.x + sunECI.x, 2) +
                                    Math.pow(
                                        -satData[i].position.y + sunECI.y,
                                        2
                                    ) +
                                    Math.pow(
                                        -satData[i].position.z + sunECI.z,
                                        2
                                    )
                            )
                    ) * RAD2DEG;

                // Angle between earth and sun
                let theta =
                    Math.acos(
                        numeric.dot(
                            [
                                -satData[i].position.x,
                                -satData[i].position.y,
                                -satData[i].position.z,
                            ],
                            [
                                -satData[i].position.x + sunECI.x,
                                -satData[i].position.y + sunECI.y,
                                -satData[i].position.z + sunECI.z,
                            ]
                        ) /
                            (Math.sqrt(
                                Math.pow(-satData[i].position.x, 2) +
                                    Math.pow(-satData[i].position.y, 2) +
                                    Math.pow(-satData[i].position.z, 2)
                            ) *
                                Math.sqrt(
                                    Math.pow(
                                        -satData[i].position.x + sunECI.x,
                                        2
                                    ) +
                                        Math.pow(
                                            -satData[i].position.y + sunECI.y,
                                            2
                                        ) +
                                        Math.pow(
                                            -satData[i].position.z + sunECI.z,
                                            2
                                        )
                                ))
                    ) * RAD2DEG;

                // var isSun = false;

                // var isUmbral = false;
                if (
                    semiDiamEarth > semiDiamSun &&
                    theta < semiDiamEarth - semiDiamSun
                ) {
                    // isUmbral = true;
                    return 0;
                }

                // var isPenumbral = false;
                if (
                    Math.abs(semiDiamEarth - semiDiamSun) < theta &&
                    theta < semiDiamEarth + semiDiamSun
                ) {
                    // isPenumbral = true;
                    return 1;
                }

                if (semiDiamSun > semiDiamEarth) {
                    // isPenumbral = true;
                    return 1;
                }

                if (theta < semiDiamSun - semiDiamEarth) {
                    // isPenumbral = true;
                    return 1;
                }

                // if (!isUmbral && !isPenumbral) isSun = true;
                return 2;
            };
        }
        if (typeof satData[i].setRAE == 'undefined') {
            satData[i].setRAE = (rae) => {
                satData[i].rae = rae;
            };
        }
        if (typeof satData[i].getAltitude == 'undefined') {
            satData[i].getAltitude = () => {
                return satellite.altitudeCheck(
                    satData[i].TLE1,
                    satData[i].TLE2,
                    timeManager.getPropOffset()
                );
            };
        }
        if (
            objectManager.isSensorManagerLoaded &&
            typeof satData[i].getTEARR == 'undefined'
        ) {
            satData[i].getTEARR = (propTime, sensor) => {
                let currentTEARR = {}; // Most current TEARR data that is set in satellite object and returned.

                if (typeof sensor == 'undefined') {
                    sensor = sensorManager.currentSensor;
                }
                // If sensor's observerGd is not set try to set it using it parameters
                if (typeof sensor.observerGd == 'undefined') {
                    try {
                        sensor.observerGd = {
                            height: sensor.obshei,
                            latitude: sensor.lat,
                            longitude: sensor.long,
                        };
                    } catch (e) {
                        throw 'observerGd is not set and could not be guessed.';
                    }
                    // If it didn't work, try again
                    if (typeof sensor.observerGd.longitude == 'undefined') {
                        try {
                            sensor.observerGd = {
                                height: sensor.alt,
                                latitude: sensor.lat * DEG2RAD,
                                longitude: sensor.lon * DEG2RAD,
                            };
                        } catch (e) {
                            throw 'observerGd is not set and could not be guessed.';
                        }
                    }
                }

                // Set default timing settings. These will be changed to find look angles at different times in future.
                let satrec = satellite.twoline2satrec(
                    satData[i].TLE1,
                    satData[i].TLE2
                ); // perform and store sat init calcs
                let now;
                if (typeof propTime != 'undefined') {
                    now = propTime;
                } else {
                    now = timeManager.propTime();
                }
                let j = timeManager.jday(
                    now.getUTCFullYear(),
                    now.getUTCMonth() + 1, // NOTE:, satData[i] function requires months in range 1-12.
                    now.getUTCDate(),
                    now.getUTCHours(),
                    now.getUTCMinutes(),
                    now.getUTCSeconds()
                ); // Converts time to jday (TLEs use epoch year/day)
                j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
                let gmst = satellite.gstime(j);

                let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
                let positionEci = satellite.sgp4(satrec, m);

                try {
                    let gpos = satellite.eciToGeodetic(
                        positionEci.position,
                        gmst
                    );
                    currentTEARR.alt = gpos.height;
                    currentTEARR.lon = gpos.longitude;
                    currentTEARR.lat = gpos.latitude;
                    let positionEcf = satellite.eciToEcf(
                        positionEci.position,
                        gmst
                    );
                    let lookAngles = satellite.ecfToLookAngles(
                        sensor.observerGd,
                        positionEcf
                    );
                    currentTEARR.azimuth = lookAngles.azimuth * RAD2DEG;
                    currentTEARR.elevation = lookAngles.elevation * RAD2DEG;
                    currentTEARR.range = lookAngles.rangeSat;
                } catch (e) {
                    currentTEARR.alt = 0;
                    currentTEARR.lon = 0;
                    currentTEARR.lat = 0;
                    currentTEARR.azimuth = 0;
                    currentTEARR.elevation = 0;
                    currentTEARR.range = 0;
                }

                currentTEARR.inview = satellite.checkIsInFOV(sensor, {
                    az: currentTEARR.azimuth,
                    el: currentTEARR.elevation,
                    range: currentTEARR.range,
                });

                uiManager.currentTEARR = currentTEARR;
                return currentTEARR;
            };
        }
        if (typeof satData[i].getDirection == 'undefined') {
            satData[i].getDirection = () => {
                let nowLat = satData[i].getTEARR().lat * RAD2DEG;
                let futureTime = timeManager.propTimeCheck(
                    5000,
                    timeManager.propTime()
                );
                let futLat = satData[i].getTEARR(futureTime).lat * RAD2DEG;

                // TODO: Remove getTEARR References
                // let nowLat = satellite.eci2ll(satData[i].position.x,satData[i].position.y,satData[i].position.z).latitude;
                // let futureTime = timeManager.propTimeCheck(5000, timeManager.propTime());
                // let futureEci = satellite.getEci(satData[i], futureTime);
                // let futLat = satellite.eci2ll(futureEci.x,futureEci.y,futureEci.z).latitude;

                if (nowLat < futLat) return 'N';
                if (nowLat > futLat) return 'S';
                if (nowLat === futLat) {
                    futureTime = timeManager.propTimeCheck(
                        20000,
                        timeManager.propTime()
                    );
                    futureTEARR = satData[i].getTEARR(futureTime);
                    if (nowLat < futLat) return 'N';
                    if (nowLat > futLat) return 'S';
                }
                console.warn('Sat Direction Calculation Error - By Pole?');
                return 'Error';
            };
        }

        return satData[i];
    };
    satSet.getSatInViewOnly = (i) => {
        if (!satData) return null;
        if (!satData[i]) return null;

        satData[i].inview = satInView[i];
        return satData[i];
    };
    satSet.getSatPosOnly = (i) => {
        if (!satData) return null;
        if (!satData[i]) return null;

        if (gotExtraData) {
            satData[i].position = {
                x: satPos[i * 3],
                y: satPos[i * 3 + 1],
                z: satPos[i * 3 + 2],
            };
        }

        let sat = satData[i];
        return sat;
    };
    satSet.getSatExtraOnly = (i) => {
        if (!satData) return null;
        if (!satData[i]) return null;
        return satData[i];
    };
    satSet.getSatFromObjNum = (objNum) => {
        let satIndex = satSet.getIdFromObjNum(objNum);
        return satSet.getSat(satIndex);
    };

    satSet.getIdFromObjNum = (objNum) => {
        var scc;
        for (var i = 0; i < satData.length; i++) {
            if (satData[i].static || satData[i].missile) {
                continue;
            } else {
                scc = parseInt(satData[i].SCC_NUM);
                // scc = pad0(satData[i].TLE1.substr(2, 5).trim(), 5);
            }

            if (parseInt(objNum) === scc) {
                return i;
            }
        }
        return null;
    };
    satSet.getIdFromIntlDes = (intlDes) => {
        for (var i = 0; i < satData.length; i++) {
            if (satData[i].intlDes === intlDes) {
                return i;
            }
        }
        return null;
    };
    satSet.getIdFromStarName = (starName) => {
        for (var i = 0; i < satData.length; i++) {
            if (satData[i].type === 'Star') {
                if (satData[i].name === starName) {
                    return i;
                }
            }
        }
        return null;
    };
    satSet.getIdFromSensorName = (sensorName) => {
        if (typeof sensorName != 'undefined') {
            for (var i = 0; i < satData.length; i++) {
                if (
                    satData[i].static === true &&
                    satData[i].missile !== true &&
                    satData[i].type !== 'Star'
                ) {
                    if (satData[i].name === sensorName) {
                        return i;
                    }
                }
            }
        }
        try {
            var now = timeManager.propTime();

            var j = timeManager.jday(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            );
            j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond

            var gmst = satellite.gstime(j);
            cosLat = Math.cos(sensorManager.currentSensor.lat * DEG2RAD);
            sinLat = Math.sin(sensorManager.currentSensor.lat * DEG2RAD);
            cosLon = Math.cos(
                sensorManager.currentSensor.long * DEG2RAD + gmst
            );
            sinLon = Math.sin(
                sensorManager.currentSensor.long * DEG2RAD + gmst
            );
            var sensor = {};
            sensor.position = {};
            sensor.name = 'Custom Sensor';
            sensor.position.x =
                (6371 + 0.25 + sensorManager.currentSensor.obshei) *
                cosLat *
                cosLon; // 6371 is radius of earth
            sensor.position.y =
                (6371 + 0.25 + sensorManager.currentSensor.obshei) *
                cosLat *
                sinLon;
            sensor.position.z =
                (6371 + 0.25 + sensorManager.currentSensor.obshei) * sinLat;
            // console.log('No Sensor Found. Using Current Sensor');
            // console.log(sensor);
            return sensor;
        } catch (e) {
            console.log(e);
            return null;
        }
    };

    var posVec4;
    satSet.getScreenCoords = (i, pMatrix, camMatrix, pos) => {
        satScreenPositionArray.error = false;
        if (!pos) pos = satSet.getSatPosOnly(i).position;
        posVec4 = vec4.fromValues(pos.x, pos.y, pos.z, 1);
        // var transform = mat4.create();

        vec4.transformMat4(posVec4, posVec4, camMatrix);
        vec4.transformMat4(posVec4, posVec4, pMatrix);

        satScreenPositionArray.x = posVec4[0] / posVec4[3];
        satScreenPositionArray.y = posVec4[1] / posVec4[3];
        satScreenPositionArray.z = posVec4[2] / posVec4[3];

        satScreenPositionArray.x =
            (satScreenPositionArray.x + 1) * 0.5 * window.innerWidth;
        satScreenPositionArray.y =
            (-satScreenPositionArray.y + 1) * 0.5 * window.innerHeight;

        if (
            satScreenPositionArray.x >= 0 &&
            satScreenPositionArray.y >= 0 &&
            satScreenPositionArray.z >= 0 &&
            satScreenPositionArray.z <= 1
        ) {
            // Passed Test
        } else {
            satScreenPositionArray.error = true;
        }
    };

    satSet.searchYear = (year) => {
        var res = [];
        for (var i = 0; i < satData.length; i++) {
            if (typeof satData[i].TLE1 == 'undefined') continue;
            if (satData[i].TLE1.substring(9, 11) == year) {
                res.push(i);
            }
        }
        return res;
    };

    satSet.searchYearOrLess = (year) => {
        var res = [];
        for (var i = 0; i < satData.length; i++) {
            if (typeof satData[i].TLE1 == 'undefined') continue;
            if (year >= 59 && year < 100) {
                if (
                    satData[i].TLE1.substring(9, 11) <= year &&
                    satData[i].TLE1.substring(9, 11) >= 59
                ) {
                    res.push(i);
                }
            } else {
                if (
                    satData[i].TLE1.substring(9, 11) <= year ||
                    satData[i].TLE1.substring(9, 11) >= 59
                ) {
                    res.push(i);
                }
            }
        }
        return res;
    };

    satSet.searchNameRegex = (regex) => {
        var res = [];
        for (var i = 0; i < satData.length; i++) {
            if (regex.test(satData[i].ON)) {
                res.push(i);
            }
        }
        return res;
    };
    satSet.searchCountryRegex = (regex) => {
        var res = [];
        for (var i = 0; i < satData.length; i++) {
            if (regex.test(satData[i].C)) {
                res.push(i);
            }
        }
        return res;
    };
    satSet.searchAzElRange = (
        azimuth,
        elevation,
        range,
        inclination,
        azMarg,
        elMarg,
        rangeMarg,
        incMarg,
        period,
        periodMarg,
        rcs,
        rcsMarg,
        objtype
    ) => {
        var isCheckAz = !isNaN(parseFloat(azimuth)) && isFinite(azimuth);
        var isCheckEl = !isNaN(parseFloat(elevation)) && isFinite(elevation);
        var isCheckRange = !isNaN(parseFloat(range)) && isFinite(range);
        var isCheckInclination =
            !isNaN(parseFloat(inclination)) && isFinite(inclination);
        var isCheckPeriod = !isNaN(parseFloat(period)) && isFinite(period);
        var isCheckRcs = !isNaN(parseFloat(rcs)) && isFinite(rcs);
        var isCheckAzMarg = !isNaN(parseFloat(azMarg)) && isFinite(azMarg);
        var isCheckElMarg = !isNaN(parseFloat(elMarg)) && isFinite(elMarg);
        var isCheckRangeMarg =
            !isNaN(parseFloat(rangeMarg)) && isFinite(rangeMarg);
        var isCheckIncMarg = !isNaN(parseFloat(incMarg)) && isFinite(incMarg);
        var isCheckPeriodMarg =
            !isNaN(parseFloat(periodMarg)) && isFinite(periodMarg);
        var isCheckRcsMarg = !isNaN(parseFloat(rcsMarg)) && isFinite(rcsMarg);
        objtype *= 1; // String to Number

        if (
            !isCheckEl &&
            !isCheckRange &&
            !isCheckAz &&
            !isCheckInclination &&
            !isCheckPeriod &&
            !isCheckRcs
        )
            return; // Ensure there is a number typed.

        if (!isCheckAzMarg) {
            azMarg = 5;
        }
        if (!isCheckElMarg) {
            elMarg = 5;
        }
        if (!isCheckRangeMarg) {
            rangeMarg = 200;
        }
        if (!isCheckIncMarg) {
            incMarg = 1;
        }
        if (!isCheckPeriodMarg) {
            periodMarg = 0.5;
        }
        if (!isCheckRcsMarg) {
            rcsMarg = rcs / 10;
        }
        var res = [];

        var s = 0;
        for (var i = 0; i < satData.length; i++) {
            if (satData[i].static || satData[i].missile || !satData[i].active) {
                continue;
            }
            res.push(satData[i]);
            satellite.getTEARR(res[s]);
            res[s].azimuth = uiManager.currentTEARR.azimuth;
            res[s].elevation = uiManager.currentTEARR.elevation;
            res[s].range = uiManager.currentTEARR.range;
            res[s].inview = uiManager.currentTEARR.inview;
            s++;
        }

        if (!isCheckInclination && !isCheckPeriod) {
            res = checkInview(res);
        }

        if (objtype !== 0) {
            res = checkObjtype(res);
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

        if (isCheckRcs) {
            rcs = rcs * 1; // Convert period to int
            rcsMarg = rcsMarg * 1;
            var minRcs = rcs - rcsMarg;
            var maxRcs = rcs + rcsMarg;
            res = checkRcs(res, minRcs, maxRcs);
        }

        function checkInview(possibles) {
            var inviewRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (possibles[i].inview) {
                    inviewRes.push(possibles[i]);
                }
            }
            return inviewRes;
        }

        function checkObjtype(possibles) {
            var objtypeRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (possibles[i].OT === objtype) {
                    objtypeRes.push(possibles[i]);
                }
            }
            return objtypeRes;
        }

        function checkAz(possibles, minaz, maxaz) {
            var azRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (
                    possibles[i].azimuth < maxaz &&
                    possibles[i].azimuth > minaz
                ) {
                    azRes.push(possibles[i]);
                }
            }
            return azRes;
        }
        function checkEl(possibles, minel, maxel) {
            var elRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (
                    possibles[i].elevation < maxel &&
                    possibles[i].elevation > minel
                ) {
                    elRes.push(possibles[i]);
                }
            }
            return elRes;
        }
        function checkRange(possibles, minrange, maxrange) {
            var rangeRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (
                    possibles[i].range < maxrange &&
                    possibles[i].range > minrange
                ) {
                    rangeRes.push(possibles[i]);
                }
            }
            return rangeRes;
        }
        function checkInc(possibles, minInc, maxInc) {
            var incRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (
                    (possibles[i].inclination * RAD2DEG).toFixed(2) < maxInc &&
                    (possibles[i].inclination * RAD2DEG).toFixed(2) > minInc
                ) {
                    incRes.push(possibles[i]);
                }
            }
            return incRes;
        }
        function checkPeriod(possibles, minPeriod, maxPeriod) {
            var periodRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (
                    possibles[i].period < maxPeriod &&
                    possibles[i].period > minPeriod &&
                    periodRes.length <= 200
                ) {
                    // Don't display more than 200 results - this is because LEO and GEO belt have a lot of satellites
                    periodRes.push(possibles[i]);
                }
            }
            if (periodRes.length >= 200) {
                $('#findByLooks-results').text('Limited to 200 Results!');
            }
            return periodRes;
        }
        function checkRcs(possibles, minRcs, maxRcs) {
            console.log(minRcs);
            console.log(maxRcs);
            var rcsRes = [];
            for (var i = 0; i < possibles.length; i++) {
                if (
                    parseFloat(possibles[i].R) < maxRcs &&
                    parseFloat(possibles[i].R) > minRcs &&
                    rcsRes.length <= 200
                ) {
                    // Don't display more than 200 results - this is because LEO and GEO belt have a lot of satellites
                    console.log(possibles[i]);
                    rcsRes.push(possibles[i]);
                }
            }
            if (rcsRes.length >= 200) {
                $('#findByLooks-results').text('Limited to 200 Results!');
            }
            return rcsRes;
        }
        // $('#findByLooks-results').text('');
        // IDEA: Intentionally doesn't clear previous searches. Could be an option later.
        var sccList = [];
        for (i = 0; i < res.length; i++) {
            // $('#findByLooks-results').append(res[i].SCC_NUM + '<br />');
            if (i < res.length - 1) {
                $('#search').val($('#search').val() + res[i].SCC_NUM + ',');
            } else {
                $('#search').val($('#search').val() + res[i].SCC_NUM);
            }
            sccList.push(res[i].SCC_NUM);
        }
        searchBox.doSearch($('#search').val());
        // console.log(sccList);
        return res;
    };

    satSet.exportTle2Csv = () => {
        let catalogTLE2 = [];
        let satCat = satSet.getSatData();
        satCat.sort((a, b) => parseInt(a.SCC_NUM) - parseInt(b.SCC_NUM));
        for (let s = 0; s < satCat.length; s++) {
            let sat = satCat[s];
            if (
                typeof sat.TLE1 == 'undefined' ||
                typeof sat.TLE2 == 'undefined'
            ) {
                continue;
            }
            if (sat.C == 'ANALSAT') continue;
            catalogTLE2.push({
                satId: sat.SCC_NUM,
                TLE1: sat.TLE1,
                TLE2: sat.TLE2,
                inclination: sat.inclination * RAD2DEG,
                eccentricity: sat.eccentricity,
                period: sat.period,
                raan: sat.raan * RAD2DEG,
                apogee: sat.apogee,
                perigee: sat.perigee,
                site: sat.LS,
                country: sat.C,
                name: sat.ON,
                mission: sat.M,
                purpose: sat.P,
                user: sat.U,
                rocket: sat.LV,
                contractor: sat.Con,
                dryMass: sat.DM,
                liftMass: sat.LM,
                lifeExpected: sat.Li,
                power: sat.Pw,
                visualMagnitude: sat.vmag,
                source1: sat.S1,
                source2: sat.S2,
                source3: sat.S3,
                source4: sat.S4,
                source5: sat.S5,
                source6: sat.S6,
                source7: sat.S7,
                source8: sat.URL,
            });
        }
        saveCsv(catalogTLE2, 'catalogInfo');
    };
    satSet.exportTle2Txt = () => {
        let catalogTLE2 = [];
        let satCat = satSet.getSatData();
        satCat.sort((a, b) => parseInt(a.SCC_NUM) - parseInt(b.SCC_NUM));
        for (let s = 0; s < satCat.length; s++) {
            let sat = satCat[s];
            if (
                typeof sat.TLE1 == 'undefined' ||
                typeof sat.TLE2 == 'undefined'
            ) {
                continue;
            }
            if (sat.C == 'ANALSAT') continue;
            catalogTLE2.push(sat.TLE1);
            catalogTLE2.push(sat.TLE2);
        }
        catalogTLE2 = catalogTLE2.join('\n');
        var blob = new Blob([catalogTLE2], {
            type: 'text/plain;charset=utf-8',
        });
        saveAs(blob, 'TLE.txt');
    };

    satSet.setHover = (i) => {
        if (i === objectManager.hoveringSat) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
        // If Old Select Sat Picked Color it Correct Color
        if (
            objectManager.hoveringSat !== -1 &&
            objectManager.hoveringSat !== objectManager.selectedSat
        ) {
            try {
                gl.bufferSubData(
                    gl.ARRAY_BUFFER,
                    objectManager.hoveringSat * 4 * 4,
                    new Float32Array(
                        settingsManager.currentColorScheme.colorizer(
                            satSet.getSat(objectManager.hoveringSat)
                        ).color
                    )
                );
            } catch (e) {
                console.log(objectManager.hoveringSat);
                console.log(satSet.getSat(objectManager.hoveringSat));
                console.log(
                    settingsManager.currentColorScheme.colorizer(
                        satSet.getSat(objectManager.hoveringSat)
                    )
                );
            }
        }
        // If New Select Sat Picked Color it
        if (i !== -1 && i !== objectManager.selectedSat) {
            gl.bufferSubData(
                gl.ARRAY_BUFFER,
                i * 4 * 4,
                new Float32Array(settingsManager.hoverColor)
            );
        }
        objectManager.hoveringSat = i;
    };

    satSet.selectSat = (i) => {
        if (i === objectManager.selectedSat) return;
        if (isAnalysisMenuOpen && i != -1) {
            $('#anal-sat').val(satSet.getSat(i).SCC_NUM);
        }
        adviceList.satelliteSelected();
        satCruncher.postMessage({
            satelliteSelected: [i],
        });
        if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);

        if (typeof meshManager !== 'undefined') {
          gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
          // If Old Select Sat Picked Color it Correct Color
          if (objectManager.selectedSat !== -1) {
              gl.bufferSubData(
                  gl.ARRAY_BUFFER,
                  objectManager.selectedSat * 4 * 4,
                  new Float32Array(
                      settingsManager.currentColorScheme.colorizer(
                          satSet.getSat(objectManager.selectedSat)
                      ).color
                  )
              );
          }
          // If New Select Sat Picked Color it
          if (i !== -1) {
              isSatView = true;
              gl.bufferSubData(
                  gl.ARRAY_BUFFER,
                  i * 4 * 4,
                  new Float32Array(settingsManager.selectedColor)
              );
          }
        }

        objectManager.selectedSat = i;

        if (
            objectManager.isSensorManagerLoaded &&
            sensorManager.checkSensorSelected()
        ) {
            $('#menu-lookangles').removeClass('bmenu-item-disabled');
        }
        $('#menu-lookanglesmultisite').removeClass('bmenu-item-disabled');
        $('#menu-satview').removeClass('bmenu-item-disabled');
        $('#menu-map').removeClass('bmenu-item-disabled');
        $('#menu-editSat').removeClass('bmenu-item-disabled');
        $('#menu-sat-fov').removeClass('bmenu-item-disabled');
        $('#menu-newLaunch').removeClass('bmenu-item-disabled');
        $('#menu-breakup').removeClass('bmenu-item-disabled');
    };

    satSet.onCruncherReady = () => {
        db.log('satSet.onCruncherReady', true);
        satSet.queryStr = window.location.search.substring(1);
        // searchBox.init(satData);
        satSet.satDataString = null; // Clears stringified json file and clears 7MB of memory.
    };

    function pad0(str, max) {
        return str.length < max ? pad0('0' + str, max) : str;
    }

    window.satSet = satSet;
    window.satCruncher = satCruncher;
    window.satPos = satPos;
})();
