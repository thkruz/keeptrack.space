/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
(c) 2015-2016, James Yoder

main.js is the primary javascript file for keeptrack.space. It manages all user
interaction with the application.
http://keeptrack.space

Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt

All additions and modifications of original code is Copyright © 2016-2020 by
All additions and modifications of original code is Copyright © 2016-2020 by
Theodore Kruczek. All rights reserved. No part of this web site may be reproduced,
published, distributed, displayed, performed, copied or stored for public or private
use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */
var debugTimeArray = [];
var canvasDOM = $('#keeptrack-canvas');
var satHoverBoxNode1 = document.getElementById('sat-hoverbox1');
var satHoverBoxNode2 = document.getElementById('sat-hoverbox2');
var satHoverBoxNode3 = document.getElementById('sat-hoverbox3');
var satHoverBoxDOM = $('#sat-hoverbox');

var timeManager = window.timeManager;
var satCruncher = window.satCruncher;
var gl;

// Camera Variables
var camYaw = 0;
var camPitch = 0;
var camYawTarget = 0;
var camPitchTarget = 0;
var camSnapMode = false;
var camZoomSnappedOnSat = false;
var camAngleSnappedOnSat = false;
var zoomLevel = 0.6925;
var zoomTarget = 0.6925;
var isZoomIn = false;
var camPitchSpeed = 0;
var camYawSpeed = 0;
var camRotateSpeed = 0;

let cameraManager = {};
cameraManager.chaseSpeed = 0.001;

// Menu Variables
var isEditSatMenuOpen = false;
var isDOPMenuOpen = false;
var isLookanglesMenuOpen = false;
var isLookanglesMultiSiteMenuOpen = false;
var isNewLaunchMenuOpen = false;
var isBreakupMenuOpen = false;
var isMissileMenuOpen = false;
var isPlanetariumView = false;
var isAstronomyView = false;
var isSatView = false;
var isVideoRecording = false;
var isCustomSensorMenuOpen = false;

var pitchRotate;
var yawRotate;

var pickFb, pickTex;
var pMatrix = mat4.create();
var camMatrix = mat4.create();
var camMatrixEmpty = mat4.create();
var selectedSat = -1;
var lastSelectedSat = -1;

var drawLineList = [];

var updateHoverDelay = 0;
var updateHoverDelayLimit = 1;

var pickColorBuf;
var cameraType = {};
cameraType.current = 0;
cameraType.DEFAULT = 0;
cameraType.OFFSET = 1;
cameraType.FPS = 2;
cameraType.PLANETARIUM = 3;
cameraType.SATELLITE = 4;
cameraType.ASTRONOMY = 5;

var mouseX = 0;
var mouseY = 0;
var mouseTimeout = null;
var mouseSat = -1;
var isMouseMoving = false;
var dragPoint = [0, 0, 0];
var screenDragPoint = [0, 0];
var dragStartPitch = 0;
var dragStartYaw = 0;
var isDragging = false;
var dragHasMoved = false;

var isPinching = false;
var deltaPinchDistance = 0;
var startPinchDistance = 0;

var fpsEl;
var fpsAz;
var fpsPitch = 0;
var fpsPitchRate = 0;
var fpsRotate = 0;
var fpsRotateRate = 0;
var fpsYaw = 0;
var fpsYawRate = 0;
var fpsXPos = 0;
var fpsYPos = 25000;
var fpsZPos = 0;
var fpsForwardSpeed = 0;
var fpsSideSpeed = 0;
var fpsVertSpeed = 0;
var isFPSForwardSpeedLock = false;
var isFPSSideSpeedLock = false;
var isFPSVertSpeedLock = false;
var fpsRun = 1;
var fpsLastTime = 1;

var satScreenPositionArray = {};
var isShowNextPass = false;
var rotateTheEarth = true; // Set to False to disable initial rotation

var drawLoopCallback;
(function () {
  var time, drawNow, dt;

  // updateHover
  var updateHoverSatId, updateHoverSatPos;

  // _unProject variables
  var glScreenX, glScreenY, screenVec, comboPMat, invMat, worldVec, gCPr, gCPz,
      gCPrYaw, gCPx, gCPy, fpsTimeNow, fpsElapsed, satData, dragTarget;

  // drawLoop camera variables
  var xDif, yDif, yawTarget, pitchTarget, dragPointR, dragTargetR, dragPointLon,
      dragTargetLon, dragPointLat, dragTargetLat, pitchDif, yawDif;
  var isHoverBoxVisible = false;
  var isShowDistance = true;

  // getEarthScreenPoint
  var rayOrigin, ptThru, rayDir, toCenterVec, dParallel, longDir, dPerp, dSubSurf,
      dSurf, ptSurf;

  // Code Once index.htm is loaded
  $(document).ready(function () {
    // Set Default TLE
    if (typeof settingsManager.tleSource == 'undefined') {
      settingsManager.tleSource = 'tle/TLE.json';
    }
    webGlInit();
    atmosphere.init();
    sun.init();
    moon.init();
    earth.init();
    ColorScheme.init();
    $('#loader-text').text('Drawing Dots in Space...');
    satSet.init(function satSetInitCallBack (satData) {
      orbitManager.init();
      groups.init();
      if (!settingsManager.disableUI) {
        searchBox.init(satData);
      }
      (function _checkIfEarthFinished () {
        if (earth.loaded) return;
        $('#loader-text').text('Coloring Inside the Lines...');
        setTimeout(function () {
          _checkIfEarthFinished();
        }, 250);
      })();
      let isFinalLoadingComplete = false;
      (function _finalLoadingSequence () {
        if (!isFinalLoadingComplete && !earth.loaded) {
          setTimeout(function () {
            _finalLoadingSequence();
          }, 250);
          return;
        }
        if (isFinalLoadingComplete) return;
        // NOTE:: This is called right after all the objects load on the screen.

        // Version Info Updated
        $('#version-info').html(settingsManager.versionNumber);
        $('#version-info').tooltip({delay: 50, html: settingsManager.versionDate, position: 'top'});

        $('#canvas-holder').attr('style', 'display:block');

        mobile.checkMobileMode();

        if (settingsManager.isMobileModeEnabled) { // Start Button Displayed
          $('#mobile-start-button').show();
          $('#spinner').hide();
          $('#loader-text').html('');
        } else { // Loading Screen Resized and Hidden
          if (settingsManager.trusatMode) {
              setTimeout(function () {
                $('#loading-screen').removeClass('full-loader');
                $('#loading-screen').addClass('mini-loader-container');
                $('#logo-inner-container').addClass('mini-loader');
                $('#logo-text').html('');
                $('#logo-trusat').hide();
                $('#loading-screen').hide();
                $('#loader-text').html('Attempting to Math...');
              }, 5000);
          } else {
            $('#loading-screen').removeClass('full-loader');
            $('#loading-screen').addClass('mini-loader-container');
            $('#logo-inner-container').addClass('mini-loader');
            $('#logo-text').html('');
            $('#logo-trusat').hide();
            $('#loading-screen').hide();
            $('#loader-text').html('Attempting to Math...');
          }
        }

        satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
        satSet.onCruncherReady();

        // Add Short Delay To Make Sure Everything Else is ready
        // This shouldn't be necessary in the future
        setTimeout(function () {
          (function _reloadLastSensor () {
            let currentSensor = (!settingsManager.offline) ? JSON.parse(localStorage.getItem("currentSensor")) : null;
            if (currentSensor !== null) {
              try {
                // If there is a staticnum set use that
                if (typeof currentSensor[0] == 'undefined' || currentSensor[0] == null) {
                  sensorManager.setSensor(null, currentSensor[1]);
                } else {
                  // If the sensor is a string, load that collection of sensors
                  if (typeof currentSensor[0].shortName == 'undefined') {
                    sensorManager.setSensor(currentSensor[0], currentSensor[1]);
                  } else {
                    // Seems to be a single sensor without a staticnum, load that
                    sensorManager.setSensor(sensorManager.sensorList[currentSensor[0].shortName], currentSensor[1]);
                  }
                }
              }
              catch (e){
                console.warn('Saved Sensor Information Invalid');
              }
            }
          })();
          (function _watchlistInit () {
            var watchlistJSON = (!settingsManager.offline) ? localStorage.getItem("watchlistList") : null;
            if (watchlistJSON !== null) {
              var newWatchlist = JSON.parse(watchlistJSON);
              watchlistInViewList = [];
              for (var i = 0; i < newWatchlist.length; i++) {
                var sat = satSet.getSatExtraOnly(satSet.getIdFromObjNum(newWatchlist[i]));
                if (sat !== null) {
                  newWatchlist[i] = sat.id;
                  watchlistInViewList.push(false);
                } else {
                  console.error('Watchlist File Format Incorret');
                  return;
                }
              }
              uiManager.updateWatchlist(newWatchlist, watchlistInViewList);
            }
          })();
          (function _parseGetParameters () {
            // do querystring stuff
            var params = satSet.queryStr.split('&');

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
                urlSatId = satSet.getIdFromIntlDes(val.toUpperCase());
                if (urlSatId !== null) {
                  selectSat(urlSatId);
                }
                break;
                case 'sat':
                urlSatId = satSet.getIdFromObjNum(val.toUpperCase());
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
                $('#missile').trigger("submit");
                break;
                case 'date':
                timeManager.propOffset = Number(val) - Date.now();
                $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
                satCruncher.postMessage({
                  typ: 'offset',
                  dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString()
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
                  dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString()
                });
                break;
              }
            }
          })();
        }, 300);

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
      })();
    });
    drawLoop(); // kick off the animationFrame()s
  });

  var drawLoopCount = 0;

  function drawLoop () {
    // NOTE drawLoop has 7kb memory leak -- No Impact
    requestAnimationFrame(drawLoop);
    drawNow = Date.now();
    dt = drawNow - (time || drawNow);
    if (typeof drawLoopCount != 'undefined') {
      drawLoopCount++;
      if (drawLoopCount > 100) {
        drawLoopCount = null;
        return;
      }
      if (drawLoopCount > 50) {
        if (dt > 500 && !settingsManager.isSlowCPUModeEnabled) {
          // Method of determining if computer is slow
          // selectSat(-1);
          // M.toast({html: `Computer is slow!</br>Forcing Mobile Mode`});
          // settingsManager.isMobileModeEnabled = true;
          // settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
          // webGlInit();
          // settingsManager.isDisableSatHoverBox = true;
          // enableSlowCPUMode();
        }
      }
    }
    if (dt > 20) {
      updateHoverDelayLimit = 10;
    } else if (dt > 50) {
      updateHoverDelayLimit = 15;
    } else {
      if (updateHoverDelayLimit > 1)
        --updateHoverDelayLimit;
    }

    time = drawNow;
    timeManager.now = drawNow;

    if ((isDragging && !settingsManager.isMobileModeEnabled) ||
         isDragging && settingsManager.isMobileModeEnabled && (mouseX !== 0 || mouseY !== 0)) {
      // Disable Raycasting for Performance
      // dragTarget = getEarthScreenPoint(mouseX, mouseY);
      // if (isNaN(dragTarget[0]) || isNaN(dragTarget[1]) || isNaN(dragTarget[2]) ||
      // isNaN(dragPoint[0]) || isNaN(dragPoint[1]) || isNaN(dragPoint[2]) ||
      if (true ||
      cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE || cameraType.current=== cameraType.ASTRONOMY ||
      settingsManager.isMobileModeEnabled) { // random screen drag
        xDif = screenDragPoint[0] - mouseX;
        yDif = screenDragPoint[1] - mouseY;
        yawTarget = dragStartYaw + xDif * settingsManager.cameraMovementSpeed;
        pitchTarget = dragStartPitch + yDif * -settingsManager.cameraMovementSpeed;
        camPitchSpeed = _normalizeAngle(camPitch - pitchTarget) * -settingsManager.cameraMovementSpeed;
        camYawSpeed = _normalizeAngle(camYaw - yawTarget) * -settingsManager.cameraMovementSpeed;
      } else {  // earth surface point drag
        dragPointR = Math.sqrt(dragPoint[0] * dragPoint[0] + dragPoint[1] * dragPoint[1]);
        dragTargetR = Math.sqrt(dragTarget[0] * dragTarget[0] + dragTarget[1] * dragTarget[1]);

        dragPointLon = Math.atan2(dragPoint[1], dragPoint[0]);
        dragTargetLon = Math.atan2(dragTarget[1], dragTarget[0]);

        dragPointLat = Math.atan2(dragPoint[2], dragPointR);
        dragTargetLat = Math.atan2(dragTarget[2], dragTargetR);

        pitchDif = dragPointLat - dragTargetLat;
        yawDif = _normalizeAngle(dragPointLon - dragTargetLon);
        camPitchSpeed = pitchDif * settingsManager.cameraMovementSpeed;
        camYawSpeed = yawDif * settingsManager.cameraMovementSpeed;
      }
      camSnapMode = false;
    } else {
      // DESKTOP ONLY
      if (!settingsManager.isMobileModeEnabled) {
        camPitchSpeed -= (camPitchSpeed * dt * settingsManager.cameraMovementSpeed); // decay speeds when globe is "thrown"
        camYawSpeed -= (camYawSpeed * dt * settingsManager.cameraMovementSpeed);
      } else if (settingsManager.isMobileModeEnabled) { // MOBILE
        camPitchSpeed -= (camPitchSpeed * dt * settingsManager.cameraMovementSpeed * 5); // decay speeds when globe is "thrown"
        camYawSpeed -= (camYawSpeed * dt * settingsManager.cameraMovementSpeed  * 5);
      }
    }

    camRotateSpeed -= (camRotateSpeed * dt * settingsManager.cameraMovementSpeed);

    if (cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE || cameraType.current=== cameraType.ASTRONOMY) {

      fpsPitch -= 20 * camPitchSpeed * dt;
      fpsYaw -= 20 * camYawSpeed * dt;
      fpsRotate -= 20 * camRotateSpeed * dt;

      // Prevent Over Rotation
      if (fpsPitch > 90) fpsPitch = 90;
      if (fpsPitch < -90) fpsPitch = -90;
      // ASTRONOMY 180 FOV Bubble Looking out from Sensor
      if (cameraType.current=== cameraType.ASTRONOMY) {
        if (fpsRotate > 90) fpsRotate = 90;
        if (fpsRotate < -90) fpsRotate = -90;
      } else {
        if (fpsRotate > 360) fpsRotate -= 360;
        if (fpsRotate < 0) fpsRotate += 360;
      }
      if (fpsYaw > 360) fpsYaw -= 360;
      if (fpsYaw < 0) fpsYaw += 360;
    } else {
      camPitch += camPitchSpeed * dt;
      camYaw += camYawSpeed * dt;
      fpsRotate += camRotateSpeed * dt;
    }

    if (rotateTheEarth) { camYaw -= settingsManager.autoRotateSpeed * dt; }

    // Zoom Changing
    if (zoomLevel !== zoomTarget) {
      if (zoomLevel > settingsManager.satShader.largeObjectMaxZoom) {
        settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 2;
      } else if (zoomLevel < settingsManager.satShader.largeObjectMinZoom) {
        settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize / 2;
      } else {
        settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize;
      }
    }

    if (camSnapMode) {
      camPitch += (camPitchTarget - camPitch) * cameraManager.chaseSpeed * dt;

      let yawErr = _normalizeAngle(camYawTarget - camYaw);
      camYaw += yawErr * cameraManager.chaseSpeed * dt;

      zoomLevel = zoomLevel + (zoomTarget - zoomLevel) * dt * 0.0025;
    } else {
      if (isZoomIn) {
        zoomLevel -= zoomLevel * dt / 100 * Math.abs(zoomTarget - zoomLevel);
      } else {
        zoomLevel += zoomLevel * dt / 100 * Math.abs(zoomTarget - zoomLevel);
      }
      if ((zoomLevel >= zoomTarget && !isZoomIn) ||
          (zoomLevel <= zoomTarget && isZoomIn)) {
        zoomLevel = zoomTarget;
      }
    }

    if (camPitch > TAU / 4) camPitch = TAU / 4;
    if (camPitch < -TAU / 4) camPitch = -TAU / 4;
    camYaw = _normalizeAngle(camYaw);
    if (selectedSat !== -1) {
      let sat = satSet.getSat(selectedSat);
      if (!sat.static) {
        _camSnapToSat(sat);
      }
      if (sat.static && cameraType.current=== cameraType.PLANETARIUM) {
        // _camSnapToSat(selectedSat);
      }
      // var satposition = [sat.position.x, sat.position.y, sat.position.z];
      // debugLine.set(satposition, [0, 0, 0]);
    }

    if (typeof missileManager != 'undefined' && missileManager.missileArray.length > 0) {
      for (var i = 0; i < missileManager.missileArray.length; i++) {
        orbitManager.updateOrbitBuffer(missileManager.missileArray[i].id);
      }
    }

    if (cameraType.current=== cameraType.FPS || cameraType.current=== cameraType.SATELLITE || cameraType.current=== cameraType.ASTRONOMY) {
      _fpsMovement();
    }
    _drawScene();
    drawLines();
    _updateHover();
    _onDrawLoopComplete(drawLoopCallback);
    if (settingsManager.isDemoModeOn) _demoMode();

    // Hide satMiniBoxes When Not in Use
    if ((!settingsManager.isSatLabelModeOn || cameraType.current !== cameraType.PLANETARIUM)) {
      if (isSatMiniBoxInUse) {
        $('#sat-minibox').html('');
      }
      isSatMiniBoxInUse = false;
    }

    // var bubble = new FOVBubble();
    // bubble.set();
    // bubble.draw();

    if (settingsManager.screenshotMode) {
      webGlInit();
      if (settingsManager.queuedScreenshot) return;

      setTimeout(function () {
        let link = document.createElement('a');
        link.download = 'keeptrack.png';

        let d = new Date();
        let n = d.getFullYear();
        let copyrightStr;
        if (!settingsManager.copyrightOveride) {
          copyrightStr = `©${n} KEEPTRACK.SPACE`;
        } else {
          copyrightStr = '';
        }

        link.href = _watermarkedDataURL(canvasDOM[0],copyrightStr);
        settingsManager.screenshotMode = false;
        settingsManager.queuedScreenshot = false;
        setTimeout(function () {
          link.click();
        }, 10);
        webGlInit();
      }, 200);
      settingsManager.queuedScreenshot = true;
    }
  }

  function _watermarkedDataURL(canvas,text){
    var tempCanvas=document.createElement('canvas');
    var tempCtx=tempCanvas.getContext('2d');
    var cw,ch;
    cw=tempCanvas.width=canvas.width;
    ch=tempCanvas.height=canvas.height;
    tempCtx.drawImage(canvas,0,0);
    tempCtx.font = "24px nasalization";
    var textWidth = tempCtx.measureText(text).width;
    tempCtx.globalAlpha = 1.0;
    tempCtx.fillStyle ='white';
    tempCtx.fillText(text,cw-textWidth-30,ch-30);
    // tempCtx.fillStyle ='black';
    // tempCtx.fillText(text,cw-textWidth-10+2,ch-20+2);
    // just testing by adding tempCanvas to document
    document.body.appendChild(tempCanvas);
    let image = tempCanvas.toDataURL();
    tempCanvas.parentNode.removeChild(tempCanvas);
    return(image);
  }
  function _camSnapToSat (sat) {
    /* this function runs every frame that a satellite is selected.
    However, the user might have broken out of the zoom snap or angle snap.
    If so, don't change those targets. */

    if (camAngleSnappedOnSat) {
      var pos = sat.position;
      var r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      var yaw = Math.atan2(pos.y, pos.x) + TAU / 4;
      var pitch = Math.atan2(pos.z, r);
      if (!pitch) {
        console.warn('Pitch Calculation Error');
        pitch = 0;
        camZoomSnappedOnSat = false;
        camAngleSnappedOnSat = false;
      }
      if (!yaw) {
        console.warn('Yaw Calculation Error');
        yaw = 0;
        camZoomSnappedOnSat = false;
        camAngleSnappedOnSat = false;
      }
      if (cameraType.current=== cameraType.PLANETARIUM) {
        // camSnap(-pitch, -yaw);
      } else {
        camSnap(pitch, yaw);
      }
    }

    if (camZoomSnappedOnSat) {
      var altitude;
      var camDistTarget;
      if (!sat.missile && !sat.static && sat.active) { // if this is a satellite not a missile
        altitude = sat.getAltitude();
      } if (sat.missile) {
        altitude = sat.maxAlt + 1000;             // if it is a missile use its altitude
        orbitManager.setSelectOrbit(sat.satId);
      }
      if (altitude) {
        camDistTarget = altitude + RADIUS_OF_EARTH + settingsManager.camDistBuffer;
      } else {
        camDistTarget = RADIUS_OF_EARTH + settingsManager.camDistBuffer;  // Stay out of the center of the earth. You will get stuck there.
        console.warn('Zoom Calculation Error: ' + altitude + ' -- ' + camDistTarget);
        camZoomSnappedOnSat = false;
        camAngleSnappedOnSat = false;
      }
      if (Math.pow((camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance), 1 / ZOOM_EXP) < zoomTarget) {
        zoomTarget = Math.pow((camDistTarget - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance), 1 / ZOOM_EXP);
      }
    }

    if (cameraType.current=== cameraType.PLANETARIUM) {
      zoomTarget = 0.01;
    }
  }
  function _drawScene () {
    // Drawing ColorIds for Picking Satellites
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    camMatrix = _drawCamera();

    gl.useProgram(gl.pickShaderProgram);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(gl.pickShaderProgram.camMatrix, false, camMatrix);

    // Draw Scene
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    sun.draw(pMatrix, camMatrix);
    moon.draw(pMatrix, camMatrix);
    // if (typeof debugLine != 'undefined') debugLine.draw();
    atmosphere.draw(pMatrix, camMatrix);
    earth.draw(pMatrix, camMatrix);
    satSet.draw(pMatrix, camMatrix, drawNow);
    orbitManager.draw(pMatrix, camMatrix);

    /* DEBUG - show the pickbuffer on a canvas */
    // debugImageData.data = pickColorMap;
    /* debugImageData.data.set(pickColorMap);
    debugContext.putImageData(debugImageData, 0, 0); */
  }
  function _drawCamera () {
      camMatrix = camMatrixEmpty;
      mat4.identity(camMatrix);

      /**
      * For FPS style movement rotate the camera and then translate it
      * for traditional view, move the camera and then rotate it
      */

     if (isNaN(camPitch) || isNaN(camYaw) || isNaN(camPitchTarget) || isNaN(camYawTarget) || isNaN(zoomLevel) || isNaN(zoomTarget)) {
       try {
         console.group('Camera Math Error');
         console.log(`camPitch: ${camPitch}`);
         console.log(`camYaw: ${camYaw}`);
         console.log(`camPitchTarget: ${camPitchTarget}`);
         console.log(`camYawTarget: ${camYawTarget}`);
         console.log(`zoomLevel: ${zoomLevel}`);
         console.log(`zoomTarget: ${zoomTarget}`);
         console.log(`settingsManager.cameraMovementSpeed: ${settingsManager.cameraMovementSpeed}`);
         console.groupEnd();
       } catch (e) {
         console.warn('Camera Math Error');
       }
       camPitch = 0.5;
       camYaw = 0.5;
       zoomLevel  = 0.5;
       camPitchTarget = 0;
       camYawTarget = 0;
       zoomTarget = 0.5;
     }

      switch (cameraType.current) {
        case cameraType.DEFAULT: // pivot around the earth with earth in the center
          mat4.translate(camMatrix, camMatrix, [0, _getCamDist(), 0]);
          mat4.rotateX(camMatrix, camMatrix, camPitch);
          mat4.rotateZ(camMatrix, camMatrix, -camYaw);
          break;
        case cameraType.OFFSET: // pivot around the earth with earth offset to the bottom right
          mat4.translate(camMatrix, camMatrix, [15000, _getCamDist(), -6000]);
          mat4.rotateX(camMatrix, camMatrix, camPitch);
          mat4.rotateZ(camMatrix, camMatrix, -camYaw);
          break;
        case cameraType.FPS: // FPS style movement
          mat4.rotate(camMatrix, camMatrix, -fpsPitch * DEG2RAD, [1, 0, 0]);
          mat4.rotate(camMatrix, camMatrix, fpsYaw * DEG2RAD, [0, 0, 1]);
          mat4.translate(camMatrix, camMatrix, [fpsXPos, fpsYPos, -fpsZPos]);
          break;
        case cameraType.PLANETARIUM: // pivot around the earth looking away from the earth
          {
            let satPos = _calculateSensorPos({});

            // Pitch is the opposite of the angle to the latitude
            // Yaw is 90 degrees to the left of the angle to the longitude
            pitchRotate = ((-1 * sensorManager.currentSensor.lat) * DEG2RAD);
            yawRotate = ((90 - sensorManager.currentSensor.long) * DEG2RAD) - satPos.gmst;
            mat4.rotate(camMatrix, camMatrix, pitchRotate, [1, 0, 0]);
            mat4.rotate(camMatrix, camMatrix, yawRotate, [0, 0, 1]);

            mat4.translate(camMatrix, camMatrix, [-satPos.x, -satPos.y, -satPos.z]);

            _showOrbitsAbove();

            break;
          }
        case cameraType.SATELLITE:
          {
            // yawRotate = ((-90 - sensorManager.currentSensor.long) * DEG2RAD);
            if (selectedSat !== -1) lastSelectedSat = selectedSat;
            let sat = satSet.getSat(lastSelectedSat);
            // mat4.rotate(camMatrix, camMatrix, sat.inclination * DEG2RAD, [0, 1, 0]);
            mat4.rotate(camMatrix, camMatrix, -fpsPitch * DEG2RAD, [1, 0, 0]);
            mat4.rotate(camMatrix, camMatrix, fpsYaw * DEG2RAD, [0, 0, 1]);
            mat4.rotate(camMatrix, camMatrix, fpsRotate * DEG2RAD, [0, 1, 0]);

            orbitManager.updateOrbitBuffer(lastSelectedSat);
            let satPos = sat.position;
            mat4.translate(camMatrix, camMatrix, [-satPos.x, -satPos.y, -satPos.z]);
            break;
          }
        case cameraType.ASTRONOMY:
          {
            let satPos = _calculateSensorPos({});

            // Pitch is the opposite of the angle to the latitude
            // Yaw is 90 degrees to the left of the angle to the longitude
            pitchRotate = ((-1 * sensorManager.currentSensor.lat) * DEG2RAD);
            yawRotate = ((90 - sensorManager.currentSensor.long) * DEG2RAD) - satPos.gmst;

            // TODO: Calculate elevation for cameraType.ASTRONOMY
            // Idealy the astronomy view would feel more natural and tell you what
            // az/el you are currently looking at.

            // fpsEl = ((fpsPitch + 90) > 90) ? (-(fpsPitch) + 90) : (fpsPitch + 90);
            // $('#el-text').html(' EL: ' + fpsEl.toFixed(2) + ' deg');

            // yawRotate = ((-90 - sensorManager.currentSensor.long) * DEG2RAD);
            let sensor = null;
            if (typeof sensorManager.currentSensor.name == 'undefined') {
              sensor = satSet.getIdFromSensorName(sensorManager.currentSensor.name);
              if (sensor == null) return;
            } else {
              sensor = satSet.getSat(satSet.getIdFromSensorName(sensorManager.currentSensor.name));
            }
            // mat4.rotate(camMatrix, camMatrix, sat.inclination * DEG2RAD, [0, 1, 0]);
            mat4.rotate(camMatrix, camMatrix, (pitchRotate + (-fpsPitch * DEG2RAD)), [1, 0, 0]);
            mat4.rotate(camMatrix, camMatrix, (yawRotate + (fpsYaw * DEG2RAD)), [0, 0, 1]);
            mat4.rotate(camMatrix, camMatrix, fpsRotate * DEG2RAD, [0, 1, 0]);

            // orbitManager.updateOrbitBuffer(lastSelectedSat);
            let sensorPos = sensor.position;
            fpsXPos = sensorPos.x;
            fpsYPos = sensorPos.y;
            fpsZPos = sensorPos.z;
            mat4.translate(camMatrix, camMatrix, [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01]); // Scale to get away from Earth

            _showOrbitsAbove(); // Clears Orbit
            break;
          }
      }
      return camMatrix;
    }
  function _calculateSensorPos (pos) {
    var now = timeManager.propTime();
    var j = jday(now.getUTCFullYear(),
    now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds());
    j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    function jday (year, mon, day, hr, minute, sec) {
      return (367.0 * year -
        Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
        Math.floor(275 * mon / 9.0) +
        day + 1721013.5 +
        ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
      );
    }
    var gmst = satellite.gstime(j);

    var cosLat = Math.cos(sensorManager.currentSensor.lat * DEG2RAD);
    var sinLat = Math.sin(sensorManager.currentSensor.lat * DEG2RAD);
    var cosLon = Math.cos((sensorManager.currentSensor.long * DEG2RAD) + gmst);
    var sinLon = Math.sin((sensorManager.currentSensor.long * DEG2RAD) + gmst);

    pos.x = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon;
    pos.y = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon;
    pos.z = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat;
    pos.gmst = gmst;
    return pos;
  }
  function _fpsMovement () {
    fpsTimeNow = Date.now();
    if (fpsLastTime !== 0) {
      fpsElapsed = fpsTimeNow - fpsLastTime;

      if (isFPSForwardSpeedLock && fpsForwardSpeed < 0) {
        fpsForwardSpeed = Math.max(fpsForwardSpeed + Math.min(fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsForwardSpeed);
      } else if (isFPSForwardSpeedLock && fpsForwardSpeed > 0) {
        fpsForwardSpeed = Math.min(fpsForwardSpeed + Math.max(fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsForwardSpeed);
      }

      if (isFPSSideSpeedLock && fpsSideSpeed < 0) {
        fpsSideSpeed = Math.max(fpsSideSpeed + Math.min(fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsSideSpeed);
      } else if (isFPSSideSpeedLock && fpsSideSpeed < 0) {
        fpsSideSpeed = Math.min(fpsSideSpeed + Math.max(fpsSideSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsSideSpeed);
      }

      if (isFPSVertSpeedLock && fpsVertSpeed < 0) {
        fpsVertSpeed = Math.max(fpsVertSpeed + Math.min(fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsVertSpeed);
      } else if (isFPSVertSpeedLock && fpsVertSpeed < 0) {
        fpsVertSpeed = Math.min(fpsVertSpeed + Math.max(fpsVertSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsVertSpeed);
      }

      // console.log('Front: ' + fpsForwardSpeed + ' - ' + 'Side: ' + fpsSideSpeed + ' - ' + 'Vert: ' + fpsVertSpeed);

      if (cameraType.FPS) {
        if (fpsForwardSpeed !== 0) {
          fpsXPos -= Math.sin(fpsYaw * DEG2RAD) * fpsForwardSpeed * fpsRun * fpsElapsed;
          fpsYPos -= Math.cos(fpsYaw * DEG2RAD) * fpsForwardSpeed * fpsRun * fpsElapsed;
          fpsZPos += Math.sin(fpsPitch * DEG2RAD) * fpsForwardSpeed * fpsRun * fpsElapsed;
        }
        if (fpsVertSpeed !== 0) {
          fpsZPos -= fpsVertSpeed * fpsRun * fpsElapsed;
        }
        if (fpsSideSpeed !== 0) {
          fpsXPos -= Math.cos(-fpsYaw * DEG2RAD) * fpsSideSpeed * fpsRun * fpsElapsed;
          fpsYPos -= Math.sin(-fpsYaw * DEG2RAD) * fpsSideSpeed * fpsRun * fpsElapsed;
        }
      }

      if (!isFPSForwardSpeedLock) fpsForwardSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      if (!isFPSSideSpeedLock) fpsSideSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      if (!isFPSVertSpeedLock) fpsVertSpeed *= Math.min(0.98 * fpsElapsed, 0.98);

      if (fpsForwardSpeed < 0.01 && fpsForwardSpeed > -0.01) fpsForwardSpeed = 0;
      if (fpsSideSpeed < 0.01 && fpsSideSpeed > -0.01) fpsSideSpeed = 0;
      if (fpsVertSpeed < 0.01 && fpsVertSpeed > -0.01) fpsVertSpeed = 0;

      fpsPitch += fpsPitchRate * fpsElapsed;
      fpsRotate += fpsRotateRate * fpsElapsed;
      fpsYaw += fpsYawRate * fpsElapsed;

      // console.log('Pitch: ' + fpsPitch + ' - ' + 'Rotate: ' + fpsRotate + ' - ' + 'Yaw: ' + fpsYaw);
    }
    fpsLastTime = fpsTimeNow;
  }
  var currentSearchSats;
  function _updateHover () {
    if (!settingsManager.disableUI) {
      currentSearchSats = searchBox.getLastResultGroup();
    }
    if (!settingsManager.disableUI && searchBox.isHovering()) {
      updateHoverSatId = searchBox.getHoverSat();
      satSet.getScreenCoords(updateHoverSatId, pMatrix, camMatrix);
      // if (!_earthHitTest(satScreenPositionArray.x, satScreenPositionArray.y)) {
        try {
          _hoverBoxOnSat(updateHoverSatId, satScreenPositionArray.x, satScreenPositionArray.y);
        } catch (e) {
        }
      // } else {
      //   _hoverBoxOnSat(-1, 0, 0);
      // }
    } else {
      if (!isMouseMoving || isDragging || settingsManager.isMobileModeEnabled) { return; }

      // gl.readPixels in getSatIdFromCoord creates a lot of jank
      // Earlier in the loop we decided how much to throttle updateHover
      // if we skip it this loop, we want to still drawl the last thing
      // it was looking at

      if (++updateHoverDelay >= updateHoverDelayLimit) {
        updateHoverDelay = 0;
        mouseSat = getSatIdFromCoord(mouseX, mouseY);
      }

      if (settingsManager.enableHoverOrbits) {
        if (mouseSat !== -1) {
          orbitManager.setHoverOrbit(mouseSat);
        } else {
          orbitManager.clearHoverOrbit();
        }
        satSet.setHover(mouseSat);
      }
      if (settingsManager.enableHoverOverlay) {
        _hoverBoxOnSat(mouseSat, mouseX, mouseY);
      }
    }
    function _earthHitTest (x, y) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
      gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickColorBuf);

      return (pickColorBuf[0] === 0 &&
        pickColorBuf[1] === 0 &&
        pickColorBuf[2] === 0);
    }
  }
  var satLabelModeLastTime = 0;
  var isSatMiniBoxInUse = false;
  var labelCount;
  var hoverBoxOnSatMiniElements = [];
  var satHoverMiniDOM;
  function _showOrbitsAbove () {

    if ((!settingsManager.isSatLabelModeOn || cameraType.current !== cameraType.PLANETARIUM)) {
      if (isSatMiniBoxInUse) {
        $('#sat-minibox').html('');
      }
      isSatMiniBoxInUse = false;
      return;
    }

    if (!sensorManager.checkSensorSelected()) return;
    if (drawNow - satLabelModeLastTime < settingsManager.satLabelInterval) return;

    orbitManager.clearInViewOrbit();

    var sat;
    labelCount = 0;
    isHoverBoxVisible = true;

    hoverBoxOnSatMiniElements = document.getElementById('sat-minibox');
    hoverBoxOnSatMiniElements.innerHTML = '';
    for (var i = 0; i < (satSet.orbitalSats) && labelCount < settingsManager.maxLabels; i++) {
      sat = satSet.getSatPosOnly(i);

      if (sat.static) continue;
      if (sat.missile) continue;
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false) continue;
      if (sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false) continue;
      if (sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false) continue;
      if (sat.inview && ColorScheme.objectTypeFlags.inFOV === false) continue;

      satSet.getScreenCoords(i, pMatrix, camMatrix, sat.position);
      if (satScreenPositionArray.error) continue;
      if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
      if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;

      // Draw Orbits
      orbitManager.addInViewOrbit(i);

      // Draw Sat Labels
      // if (settingsManager.isDisableSatHoverBox) continue;
      satHoverMiniDOM = document.createElement("div");
      satHoverMiniDOM.id = 'sat-minibox-' + i;
      satHoverMiniDOM.textContent = sat.SCC_NUM;
      satHoverMiniDOM.setAttribute(
        'style',
        "display: block; position: absolute; left: " + satScreenPositionArray.x + 10 + "px; top: " + satScreenPositionArray.y + "px;"
      );
      hoverBoxOnSatMiniElements.appendChild(satHoverMiniDOM);
      labelCount++;
    }
    isSatMiniBoxInUse = true;
    satLabelModeLastTime = drawNow;
  }
  function _hoverBoxOnSat (satId, satX, satY) {
    if (cameraType.current === cameraType.PLANETARIUM && !settingsManager.isDemoModeOn) {
      satHoverBoxDOM.css({display: 'none'});
      if (satId === -1) {
        canvasDOM.css({cursor: 'default'});
      } else {
        canvasDOM.css({cursor: 'pointer'});
      }
      return;
    }
    if (satId === -1) {
      if (!isHoverBoxVisible || settingsManager.isDisableSatHoverBox) return;
      if (objectManager.isStarManagerLoaded) {
        if (starManager.isConstellationVisible === true && !starManager.isAllConstellationVisible) starManager.clearConstellations();
      }
      // satHoverBoxDOM.html('(none)');
      satHoverBoxDOM.css({display: 'none'});
      canvasDOM.css({cursor: 'default'});
      isHoverBoxVisible = false;
    } else if (!isDragging && !settingsManager.isDisableSatHoverBox) {
      var sat = satSet.getSatExtraOnly(satId);
      var selectedSatData = satSet.getSatExtraOnly(selectedSat);
      isHoverBoxVisible = true;
      if (sat.static) {
        if (sat.type === 'Launch Facility') {
          var launchSite = objectManager.extractLaunchSite(sat.name);
          satHoverBoxNode1.textContent = (launchSite.site + ', ' + launchSite.sitec);
          satHoverBoxNode2.innerHTML = (sat.type + satellite.distance(sat, selectedSatData) + '');
          satHoverBoxNode3.textContent = ('');
        } else if (sat.type === 'Control Facility') {
            satHoverBoxNode1.textContent = sat.name;
            satHoverBoxNode2.innerHTML = (sat.typeExt + satellite.distance(sat, selectedSatData) + '');
            satHoverBoxNode3.textContent = ('');
        } else if (sat.type === 'Star') {
          if (starManager.findStarsConstellation(sat.name) !== null) {
            satHoverBoxNode1.innerHTML = (sat.name + '</br>' + starManager.findStarsConstellation(sat.name));
          } else {
            satHoverBoxNode1.textContent = (sat.name);
          }
          satHoverBoxNode2.innerHTML = (sat.type);
          satHoverBoxNode3.innerHTML = ('RA: ' + sat.ra.toFixed(3) + ' deg </br> DEC: ' + sat.dec.toFixed(3) + ' deg');
          starManager.drawConstellations(starManager.findStarsConstellation(sat.name));
        } else {
          satHoverBoxNode1.textContent = (sat.name);
          satHoverBoxNode2.innerHTML = (sat.type + satellite.distance(sat, selectedSatData) + '');
          satHoverBoxNode3.textContent = ('');
        }
      } else if (sat.missile) {
        satHoverBoxNode1.innerHTML = (sat.ON + '<br \>' + sat.desc + '');
        satHoverBoxNode2.textContent = '';
        satHoverBoxNode3.textContent = '';
      } else {
        // Use this as a default if no UI
        if (settingsManager.disableUI) {
          satHoverBoxNode1.textContent = (sat.ON);
          satHoverBoxNode2.textContent = (sat.SCC_NUM);
          satHoverBoxNode3.textContent = (objectManager.extractCountry(sat.C));
        } else {
          if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected() && isShowNextPass && isShowDistance) {
            satHoverBoxNode1.textContent = (sat.ON);
            satHoverBoxNode2.textContent = (sat.SCC_NUM);
            satHoverBoxNode3.innerHTML = (satellite.nextpass(sat) + satellite.distance(sat, selectedSatData) + '');
          } else if (isShowDistance) {
            satHoverBoxNode1.textContent = (sat.ON);
            satHoverBoxNode2.innerHTML = (sat.SCC_NUM + satellite.distance(sat, selectedSatData) + '');
            satHoverBoxNode3.innerHTML = ('X: ' + sat.position.x.toFixed(2) + ' Y: ' + sat.position.y.toFixed(2) + ' Z: ' + sat.position.z.toFixed(2) + '</br>' +
                                            'X: ' + sat.velocityX.toFixed(2) + 'km/s Y: ' + sat.velocityY.toFixed(2) + 'km/s Z: ' + sat.velocityZ.toFixed(2)) + 'km/s';
          } else if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected() && isShowNextPass) {
            satHoverBoxNode1.textContent = (sat.ON);
            satHoverBoxNode2.textContent = (sat.SCC_NUM);
            satHoverBoxNode3.textContent = (satellite.nextpass(sat));
          } else {
            satHoverBoxNode1.textContent = (sat.ON);
            satHoverBoxNode2.textContent = (sat.SCC_NUM);
            satHoverBoxNode3.innerHTML = ('X: ' + sat.position.x.toFixed(2) + ' Y: ' + sat.position.y.toFixed(2) + ' Z: ' + sat.position.z.toFixed(2) + '</br>' +
                                            'X: ' + sat.velocityX.toFixed(2) + ' Y: ' + sat.velocityY.toFixed(2) + ' Z: ' + sat.velocityZ.toFixed(2));
          }
        }
      }
      satHoverBoxDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'fixed',
        left: satX + 20,
        top: satY - 10
      });
      canvasDOM.css({cursor: 'pointer'});
    }
  }
  function _onDrawLoopComplete (cb) {
    if (typeof cb == 'undefined') return;
    cb();
  }
  var demoModeSatellite = 0;
  var demoModeLastTime = 0;
  function _demoMode () {
    if (objectManager.isSensorManagerLoaded && !sensorManager.checkSensorSelected()) return;
    if (drawNow - demoModeLastTime < settingsManager.demoModeInterval) return;

    demoModeLastTime = drawNow;

    if (demoModeSatellite === satSet.getSatData().length) demoModeSatellite = 0;
    for (var i = demoModeSatellite; i < satSet.getSatData().length; i++) {
      var sat = satSet.getSat(i);
      if (sat.static) continue;
      if (sat.missile) continue;
      // if (!sat.inview) continue;
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false) continue;
      if (sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false) continue;
      if (sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false) continue;
      if (sat.inview && ColorScheme.objectTypeFlags.inFOV === false) continue;
      satSet.getScreenCoords(i, pMatrix, camMatrix);
      if (satScreenPositionArray.error) continue;
      if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
      if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;
      _hoverBoxOnSat(i, satScreenPositionArray.x, satScreenPositionArray.y);
      orbitManager.setSelectOrbit(i);
      demoModeSatellite = i + 1;
      return;
    }
  }
})();

function _fixDpi(canvas, dpi) {
//create a style object that returns width and height
  let style = {
    height() {
      return +getComputedStyle(canvas).getPropertyValue('height').slice(0,-2);
    },
    width() {
      return +getComputedStyle(canvas).getPropertyValue('width').slice(0,-2);
    }
  };
//set the correct attributes for a crystal clear image!
  canvas.setAttribute('width', style.width() * dpi);
  canvas.setAttribute('height', style.height() * dpi);
}

function webGlInit () {
  db.log('webGlInit');
  let can = canvasDOM[0];
  let dpi;
  if (typeof settingsManager.dpi != 'undefined') {
    dpi = settingsManager.dpi;
  } else {
    dpi = window.devicePixelRatio;
  }

  _fixDpi(can,dpi);

  if (settingsManager.screenshotMode) {
    can.width = settingsManager.hiResWidth;
    can.height = settingsManager.hiResHeight;
  } else {
    if (settingsManager.isFullscreenApplication) {
      can.width = document.body.clientWidth;
      can.height = window.innerHeight;
    }
  }

  // Desynchronized Fixed Jitter on Old Computer
  var gl = can.getContext('webgl', {alpha: false, desynchronized: true}) || can.getContext('experimental-webgl', {alpha: false, desynchronized: true});
  if (!gl) {
    browserUnsupported();
  }

  gl.viewport(0, 0, can.width, can.height);

  gl.enable(gl.DEPTH_TEST);

  var pFragShader = gl.createShader(gl.FRAGMENT_SHADER);
  var pFragCode = shaderLoader.getShaderCode('pick-fragment.glsl');
  gl.shaderSource(pFragShader, pFragCode);
  gl.compileShader(pFragShader);

  var pVertShader = gl.createShader(gl.VERTEX_SHADER);
  var pVertCode = shaderLoader.getShaderCode('pick-vertex.glsl');
  gl.shaderSource(pVertShader, pVertCode);
  gl.compileShader(pVertShader);

  var pickShaderProgram = gl.createProgram();
  gl.attachShader(pickShaderProgram, pVertShader);
  gl.attachShader(pickShaderProgram, pFragShader);
  gl.linkProgram(pickShaderProgram);

  pickShaderProgram.aPos = gl.getAttribLocation(pickShaderProgram, 'aPos');
  pickShaderProgram.aColor = gl.getAttribLocation(pickShaderProgram, 'aColor');
  pickShaderProgram.aPickable = gl.getAttribLocation(pickShaderProgram, 'aPickable');
  pickShaderProgram.uCamMatrix = gl.getUniformLocation(pickShaderProgram, 'uCamMatrix');
  pickShaderProgram.uMvMatrix = gl.getUniformLocation(pickShaderProgram, 'uMvMatrix');
  pickShaderProgram.uPMatrix = gl.getUniformLocation(pickShaderProgram, 'uPMatrix');

  gl.pickShaderProgram = pickShaderProgram;

  pickFb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb);

  pickTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, pickTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  var rb = gl.createRenderbuffer(); // create RB to store the depth buffer
  gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

  gl.pickFb = pickFb;

  pickColorBuf = new Uint8Array(4);

  pMatrix = mat4.create();
  mat4.perspective(pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);
  var eciToOpenGlMat = [
    1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
  ];
  mat4.mul(pMatrix, pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat

  window.gl = gl;
}
function _getCamDist () {
  db.log('_getCamDist', true);
  return Math.pow(zoomLevel, ZOOM_EXP) * (settingsManager.maxZoomDistance - settingsManager.minZoomDistance) + settingsManager.minZoomDistance;
}
function _unProject (mx, my) {
  glScreenX = (mx / gl.drawingBufferWidth * 2) - 1.0;
  glScreenY = 1.0 - (my / gl.drawingBufferHeight * 2);
  screenVec = [glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords

  comboPMat = mat4.create();
  mat4.mul(comboPMat, pMatrix, camMatrix);
  invMat = mat4.create();
  mat4.invert(invMat, comboPMat);
  worldVec = vec4.create();
  vec4.transformMat4(worldVec, screenVec, invMat);

  return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
}
function _normalizeAngle (angle) {
  angle %= TAU;
  if (angle > Math.PI) angle -= TAU;
  if (angle < -Math.PI) angle += TAU;
  return angle;
}
function getSatIdFromCoord (x, y) {
  // OPTIMIZE: Find a way to do this without using gl.readPixels!
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
  gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickColorBuf);
  return ((pickColorBuf[2] << 16) | (pickColorBuf[1] << 8) | (pickColorBuf[0])) - 1;
}
function getEarthScreenPoint (x, y) {
  rayOrigin = getCamPos();
  ptThru = _unProject(x, y);

  rayDir = vec3.create();
  vec3.subtract(rayDir, ptThru, rayOrigin); // rayDir = ptThru - rayOrigin
  vec3.normalize(rayDir, rayDir);

  toCenterVec = vec3.create();
  vec3.scale(toCenterVec, rayOrigin, -1); // toCenter is just -camera pos because center is at [0,0,0]
  dParallel = vec3.dot(rayDir, toCenterVec);

  longDir = vec3.create();
  vec3.scale(longDir, rayDir, dParallel); // longDir = rayDir * distParallel
  vec3.add(ptThru, rayOrigin, longDir); // ptThru is now on the plane going through the center of sphere
  dPerp = vec3.len(ptThru);

  dSubSurf = Math.sqrt(RADIUS_OF_EARTH * RADIUS_OF_EARTH - dPerp * dPerp);
  dSurf = dParallel - dSubSurf;

  ptSurf = vec3.create();
  vec3.scale(ptSurf, rayDir, dSurf);
  vec3.add(ptSurf, ptSurf, rayOrigin);

  return ptSurf;
}
function getCamPos () {
  gCPr = _getCamDist();
  gCPz = gCPr * Math.sin(camPitch);
  gCPrYaw = gCPr * Math.cos(camPitch);
  gCPx = gCPrYaw * Math.sin(camYaw);
  gCPy = gCPrYaw * -Math.cos(camYaw);
  return [gCPx, gCPy, gCPz];
}
function longToYaw (long) {
  var selectedDate = $('#datetime-text').text().substr(0, 19);
  var today = new Date();
  var angle = 0;

  selectedDate = selectedDate.split(' ');
  selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
  // NOTE: This formula sometimes is incorrect, but has been stable for over a year
  today.setUTCHours(selectedDate.getUTCHours() + ((selectedDate.getUTCMonth()) * 2) - 10);  // Offset has to account for time of year. Add 2 Hours per month into the year starting at -12.

  today.setUTCMinutes(selectedDate.getUTCMinutes());
  today.setUTCSeconds(selectedDate.getUTCSeconds());
  selectedDate.setUTCHours(0);
  selectedDate.setUTCMinutes(0);
  selectedDate.setUTCSeconds(0);
  var longOffset = (((today - selectedDate) / 60 / 60 / 1000)); // In Hours
  if (longOffset > 24) longOffset = longOffset - 24;
  longOffset = longOffset * 15; // 15 Degress Per Hour longitude Offset

  angle = (long + longOffset) * DEG2RAD;
  angle = _normalizeAngle(angle);
  return angle;
}
function latToPitch (lat) {
  var pitch = lat * DEG2RAD;
  if (pitch > TAU / 4) pitch = TAU / 4;     // Max 90 Degrees
  if (pitch < -TAU / 4) pitch = -TAU / 4;   // Min -90 Degrees
  return pitch;
}
function camSnap (pitch, yaw) {
  camPitchTarget = pitch;
  camYawTarget = _normalizeAngle(yaw);
  camSnapMode = true;
}
function changeZoom (zoom) {
  if (zoom === 'geo') {
    zoomTarget = 0.82;
    return;
  }
  if (zoom === 'leo') {
    zoomTarget = 0.45;
    return;
  }
  zoomTarget = zoom;
}

var isSelectedSatNegativeOne = false;
function selectSat (satId) {
  db.log('selectSat');
  db.log(`satId: ${satId}`, true);
  var sat;
  if (satId !== -1) {
    cameraManager.isChasing = false;
    sat = satSet.getSat(satId);
    if (sat.type == 'Star') return;
    if ((sat.active == false || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') return; // Non-Missile Non-Sensor Object
  }
  satSet.selectSat(satId);
  camSnapMode = false;
  rotateTheEarth = false;

  if (satId === -1) {
    if (settingsManager.currentColorScheme === ColorScheme.group || $('#search').val().length >= 3) { // If group selected
      $('#menu-sat-fov').removeClass('bmenu-item-disabled');
    } else {
      $('#menu-sat-fov').removeClass('bmenu-item-selected');
      $('#menu-sat-fov').addClass('bmenu-item-disabled');
      settingsManager.isSatOverflyModeOn = false;
      satCruncher.postMessage({
        isShowSatOverfly: 'reset'
      });
    }
  }

  if (satId === -1 && !isSelectedSatNegativeOne) {
    isSelectedSatNegativeOne = true;
    $('#sat-infobox').fadeOut();
    // $('#iss-stream').html('');
    // $('#iss-stream-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    orbitManager.clearSelectOrbit();
    // Remove Red Box
    $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
    $('#menu-lookangles').removeClass('bmenu-item-selected');
    $('#menu-editSat').removeClass('bmenu-item-selected');

    $('#menu-map').removeClass('bmenu-item-selected');
    $('#menu-newLaunch').removeClass('bmenu-item-selected');
    $('#menu-breakup').removeClass('bmenu-item-selected');
    $('#menu-customSensor').removeClass('bmenu-item-selected');
    // Add Grey Out
    $('#menu-lookanglesmultisite').addClass('bmenu-item-disabled');
    $('#menu-lookangles').addClass('bmenu-item-disabled');
    $('#menu-satview').addClass('bmenu-item-disabled');
    $('#menu-editSat').addClass('bmenu-item-disabled');
    $('#menu-map').addClass('bmenu-item-disabled');
    $('#menu-newLaunch').addClass('bmenu-item-disabled');
    $('#menu-breakup').addClass('bmenu-item-disabled');
    // Remove Side Menus
    // $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    // $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#breakup-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    // Toggle the side menus as closed
    isEditSatMenuOpen = false;
    isLookanglesMenuOpen = false;
    settingsManager.isMapMenuOpen = false;
    isLookanglesMultiSiteMenuOpen = false;
    isNewLaunchMenuOpen = false;
    isBreakupMenuOpen = false;
    isMissileMenuOpen = false;
    isCustomSensorMenuOpen = false;
  } else {
    cameraManager.isChasing = true;
    isSelectedSatNegativeOne = false;
    selectedSat = satId;
    sat = satSet.getSatExtraOnly(satId);
    if (!sat) return;
    if (sat.type == 'Star') { return; }
    if (sat.static) {
      if (typeof sat.staticNum == 'undefined') return;
      adviceList.sensor();
      sat = satSet.getSat(satId);
      if (objectManager.isSensorManagerLoaded) sensorManager.setSensor(null, sat.staticNum); // Pass staticNum to identify which sensor the user clicked
      if (objectManager.isSensorManagerLoaded) sensorManager.curSensorPositon = [sat.position.x, sat.position.y, sat.position.z];
      selectedSat = -1;
      $('#menu-sensor-info').removeClass('bmenu-item-disabled');
      $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
      $('#menu-surveillance').removeClass('bmenu-item-disabled');
      $('#menu-planetarium').removeClass('bmenu-item-disabled');
      $('#menu-astronomy').removeClass('bmenu-item-disabled');
      if (selectedSat !== -1) {
        $('#menu-lookangles').removeClass('bmenu-item-disabled');
      }
      return;
    }
    camZoomSnappedOnSat = true;
    camAngleSnappedOnSat = true;

    orbitManager.setSelectOrbit(satId);

    if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected()) {
      $('#menu-lookangles').removeClass('bmenu-item-disabled');
    }

    $('#menu-lookanglesmultisite').removeClass('bmenu-item-disabled');
    $('#menu-satview').removeClass('bmenu-item-disabled');
    $('#menu-editSat').removeClass('bmenu-item-disabled');
    $('#menu-sat-fov').removeClass('bmenu-item-disabled');
    $('#menu-map').removeClass('bmenu-item-disabled');
    $('#menu-newLaunch').removeClass('bmenu-item-disabled');

    if ($('#search-results').css('display') === 'block') {
      if (window.innerWidth <= 1000) {
      } else {
        $('#search-results').attr('style', 'display:block; max-height:27%');
        if (cameraType.current !== cameraType.PLANETARIUM) {
          // Unclear why this was needed...
          // uiManager.legendMenuChange('default');
        }
      }
    } else {
      if (window.innerWidth <= 1000) {
      } else {
        $('#search-results').attr('style', 'max-height:27%');
        if (cameraType.current !== cameraType.PLANETARIUM) {
          // Unclear why this was needed...
          // uiManager.legendMenuChange('default');
        }
      }
    }

    if (!sat.missile) {
      $('.sat-only-info').show();
    } else {
      $('.sat-only-info').hide();
    }

    $('#sat-infobox').fadeIn();
    $('#sat-info-title').html(sat.ON);

    if (sat.URL && sat.URL !== '') {
      $('#sat-info-title').html("<a class='iframe' href='" + sat.URL + "'>" + sat.ON + '</a>');
    }

    $('#edit-satinfo-link').html("<a class='iframe' href='editor.htm?scc=" + sat.SCC_NUM + "&popup=true'>Edit Satellite Info"+'</a>');

    $('#sat-intl-des').html(sat.intlDes);
    if (sat.OT === 'unknown') {
      $('#sat-objnum').html(1 + sat.TLE2.substr(2, 7).toString());
    } else {
      //      $('#sat-objnum').html(sat.TLE2.substr(2,7));
      $('#sat-objnum').html(sat.SCC_NUM);
      ga('send', 'event', 'Satellite', 'SCC: ' + sat.SCC_NUM, 'SCC Number');
    }

    var objtype;
    if (sat.OT === 0) { objtype = 'TBA'; }
    if (sat.OT === 1) { objtype = 'Payload'; }
    if (sat.OT === 2) { objtype = 'Rocket Body'; }
    if (sat.OT === 3) { objtype = 'Debris'; }
    if (sat.OT === 4) { objtype = 'Amateur Report'; }
    if (sat.missile) { objtype = 'Ballistic Missile'; }
    $('#sat-type').html(objtype);

    // /////////////////////////////////////////////////////////////////////////
    // Country Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    var country;
    country = objectManager.extractCountry(sat.C);
    $('#sat-country').html(country);

    // /////////////////////////////////////////////////////////////////////////
    // Launch Site Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    var site = [];
    var missileLV;
    var missileOrigin;
    if (sat.missile) {
      site = sat.desc.split('(');
      missileOrigin = site[0].substr(0, (site[0].length - 1));
      missileLV = sat.desc.split('(')[1].split(')')[0]; // Remove the () from the booster type

      site.site = missileOrigin;
      site.sitec = sat.C;
    } else {
      site = objectManager.extractLaunchSite(sat.LS);
    }

    $('#sat-site').html(site.site);
    $('#sat-sitec').html(site.sitec);

    ga('send', 'event', 'Satellite', 'Country: ' + country, 'Country');
    ga('send', 'event', 'Satellite', 'Site: ' + site, 'Site');

    // /////////////////////////////////////////////////////////////////////////
    // Launch Vehicle Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    if (sat.missile) {
      sat.LV = missileLV;
      $('#sat-vehicle').html(sat.LV);
    } else {
      $('#sat-vehicle').html(sat.LV); // Set to JSON record
      if (sat.LV === 'U') { $('#sat-vehicle').html('Unknown'); } // Replace with Unknown if necessary
      objectManager.extractLiftVehicle(sat.LV); // Replace with link if available
    }

    // /////////////////////////////////////////////////////////////////////////
    // RCS Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    if (sat.R === null || typeof sat.R == 'undefined') {
      $('#sat-rcs').html('Unknown');
    } else {
      var rcs;
      if (sat.R < 0.1) { rcs = 'Small'; }
      if (sat.R >= 0.1) { rcs = 'Medium'; }
      if (sat.R > 1) { rcs = 'Large'; }
      $('#sat-rcs').html(rcs);
      $('#sat-rcs').tooltip({delay: 50, html: sat.R, position: 'left'});
    }

    if (!sat.missile) {
      $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
      $('#sat-apogee').html(sat.apogee.toFixed(0) + ' km');
      $('#sat-perigee').html(sat.perigee.toFixed(0) + ' km');
      $('#sat-inclination').html((sat.inclination * RAD2DEG).toFixed(2) + '°');
      $('#sat-eccentricity').html((sat.eccentricity).toFixed(3));

      $('#sat-period').html(sat.period.toFixed(2) + ' min');
      $('#sat-period').tooltip({delay: 50, html: 'Mean Motion: ' + MINUTES_PER_DAY / sat.period.toFixed(2), position: 'left'});

      if (typeof sat.U != 'undefined' && sat.U != '') {
        $('#sat-user').html(sat.U);
      } else {
        $('#sat-user').html('Unknown');
      }
      if (typeof sat.P != 'undefined' && sat.P != '') {
        $('#sat-purpose').html(sat.P);
      } else {
        $('#sat-purpose').html('Unknown');
      }
      if (typeof sat.Con != 'undefined' && sat.Con != '') {
        $('#sat-contractor').html(sat.Con);
      } else {
        $('#sat-contractor').html('Unknown');
      }
      if (typeof sat.LM != 'undefined' && sat.LM != '') {
        $('#sat-lmass').html(sat.LM + ' kg');
      } else {
        $('#sat-lmass').html('Unknown');
      }
      if (typeof sat.DM != 'undefined' && sat.DM != '') {
        $('#sat-dmass').html(sat.DM + ' kg');
      } else {
        $('#sat-dmass').html('Unknown');
      }
      if (typeof sat.Li != 'undefined' && sat.Li != '') {
        $('#sat-life').html(sat.Li + ' yrs');
      } else {
        $('#sat-life').html('Unknown');
      }
      if (typeof sat.Pw != 'undefined' && sat.Pw != '') {
        $('#sat-power').html(sat.Pw + ' w');
      } else {
        $('#sat-power').html('Unknown');
      }
      if (typeof sat.vmag != 'undefined' && sat.vmag != '') {
        $('#sat-vmag').html(sat.vmag);
      } else {
        $('#sat-vmag').html('Unknown');
      }
      if (typeof sat.S1 != 'undefined' && sat.S1 != '') {
        $('#sat-source1').html(`<a class="iframe" href="${sat.S1}">${sat.S1.split('//').splice(1)}</a>`);
        $('#sat-source1w').show();
      } else {
        $('#sat-source1').html('Unknown');
        $('#sat-source1w').hide();
      }
      if (typeof sat.S2 != 'undefined' && sat.S2 != '') {
        $('#sat-source2').html(`<a class="iframe" href="${sat.S2}">${sat.S2.split('//').splice(1)}</a>`);
        $('#sat-source2w').show();
      } else {
        $('#sat-source2').html('Unknown');
        $('#sat-source2w').hide();
      }
      if (typeof sat.S3 != 'undefined' && sat.S3 != '') {
        $('#sat-source3').html(`<a class="iframe" href="${sat.S3}">${sat.S3.split('//').splice(1)}</a>`);
        $('#sat-source3w').show();
      } else {
        $('#sat-source3').html('Unknown');
        $('#sat-source3w').hide();
      }
      if (typeof sat.S4 != 'undefined' && sat.S4 != '') {
        $('#sat-source4').html(`<a class="iframe" href="${sat.S4}">${sat.S4.split('//').splice(1)}</a>`);
        $('#sat-source4w').show();
      } else {
        $('#sat-source4').html('Unknown');
        $('#sat-source4w').hide();
      }
      if (typeof sat.S5 != 'undefined' && sat.S5 != '') {
        $('#sat-source5').html(`<a class="iframe" href="${sat.S5}">${sat.S5.split('//').splice(1)}</a>`);
        $('#sat-source5w').show();
      } else {
        $('#sat-source5').html('Unknown');
        $('#sat-source5w').hide();
      }
      if (typeof sat.S6 != 'undefined' && sat.S6 != '') {
        $('#sat-source6').html(`<a class="iframe" href="${sat.S6}">${sat.S6.split('//').splice(1)}</a>`);
        $('#sat-source6w').show();
      } else {
        $('#sat-source6').html('Unknown');
        $('#sat-source6w').hide();
      }
      if (typeof sat.S7 != 'undefined' && sat.S7 != '') {
        $('#sat-source7').html(`<a class="iframe" href="${sat.S7}">${sat.S7.split('//').splice(1)}</a>`);
        $('#sat-source7w').show();
      } else {
        $('#sat-source7').html('Unknown');
        $('#sat-source7w').hide();
      }
      if (typeof sat.URL != 'undefined' && sat.URL != '') {
        $('#sat-sourceURL').html(`<a class="iframe" href="${sat.URL}">${sat.URL.split('//').splice(1)}</a>`);
        $('#sat-source8w').show();
      } else {
        $('#sat-source8').html('Unknown');
        $('#sat-source8w').hide();
      }
      $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});

      // TODO: Error checking on Iframe

      var now = new Date();
      var jday = timeManager.getDayOfYear(now);
      now = now.getFullYear();
      now = now.toString().substr(2, 2);
      var daysold;
      if (satSet.getSat(satId).TLE1.substr(18, 2) === now) {
        daysold = jday - satSet.getSat(satId).TLE1.substr(20, 3);
      } else {
        daysold = jday - satSet.getSat(satId).TLE1.substr(20, 3) + (satSet.getSat(satId).TLE1.substr(17, 2) * 365);
      }
      $('#sat-elset-age').html(daysold + ' Days');
      $('#sat-elset-age').tooltip({delay: 50, html: 'Epoch Year: ' + sat.TLE1.substr(18, 2).toString() + ' Day: ' + sat.TLE1.substr(20, 8).toString(), position: 'left'});

      if (!objectManager.isSensorManagerLoaded) {
        $('#sat-sun').parent().hide();
      } else {
        now = new Date(timeManager.propRealTime + timeManager.propOffset);
        var sunTime = SunCalc.getTimes(now, sensorManager.currentSensor.lat, sensorManager.currentSensor.long);
        var satInSun = sat.isInSun;
        // If No Sensor, then Ignore Sun Exclusion
        if (!sensorManager.checkSensorSelected()) {
          if (satInSun == 0) $('#sat-sun').html('No Sunlight');
          if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
          if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
        // If Radar Selected, then Say the Sun Doesn't Matter
        } else if ((sensorManager.currentSensor.type !== 'Optical') && (sensorManager.currentSensor.type !== 'Observer')) {
          $('#sat-sun').html('No Effect');
        // If Dawn Dusk Can be Calculated then show if the satellite is in the sun
        } else if (sunTime.dawn.getTime() - now > 0 || sunTime.dusk.getTime() - now < 0) {
          if (satInSun == 0) $('#sat-sun').html('No Sunlight');
          if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
          if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
        // If Optical Sesnor but Dawn Dusk Can't Be Calculated, then you are at a
        // high latitude and we need to figure that out
        } else if ((sunTime.night != 'Invalid Date') && (sunTime.dawn == 'Invalid Date' || sunTime.dusk == 'Invalid Date')) {
            if (satInSun == 0) $('#sat-sun').html('No Sunlight');
            if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
            if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
        } else {
        // Unless you are in sun exclusion
        $('#sat-sun').html('Sun Exclusion');
        }
      }
    }

    if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected() && isLookanglesMenuOpen) {
      satellite.getlookangles(sat);
    }
  }

  selectedSat = satId;

  if (satId !== -1) {
    if (typeof sat.TTP != 'undefined') {
      $('#sat-ttp-wrapper').show();
      $('#sat-ttp').html(sat.TTP);
    } else {
      $('#sat-ttp-wrapper').hide();
    }
    if (typeof sat.NOTES != 'undefined') {
      $('#sat-notes-wrapper').show();
      $('#sat-notes').html(sat.NOTES);
    } else {
      $('#sat-notes-wrapper').hide();
    }
    if (typeof sat.FMISSED != 'undefined') {
      $('#sat-fmissed-wrapper').show();
      $('#sat-fmissed').html(sat.FMISSED);
    } else {
      $('#sat-fmissed-wrapper').hide();
    }
    if (typeof sat.ORPO != 'undefined') {
      $('#sat-oRPO-wrapper').show();
      $('#sat-oRPO').html(sat.ORPO);
    } else {
      $('#sat-oRPO-wrapper').hide();
    }
    if (typeof sat.constellation != 'undefined') {
      $('#sat-constellation-wrapper').show();
      $('#sat-constellation').html(sat.constellation);
    } else {
      $('#sat-constellation-wrapper').hide();
    }
    if (typeof sat.maneuver != 'undefined') {
      $('#sat-maneuver-wrapper').show();
      $('#sat-maneuver').html(sat.maneuver);
    } else {
      $('#sat-maneuver-wrapper').hide();
    }
    if (typeof sat.associates != 'undefined') {
      $('#sat-associates-wrapper').show();
      $('#sat-associates').html(sat.associates);
    } else {
      $('#sat-associates-wrapper').hide();
    }
    uiManager.updateMap();

    // ISS Stream Slows Down a Lot Of Computers
    // if (sat.SCC_NUM === '25544') { // ISS is Selected
    //   $('#iss-stream-menu').show();
    //   $('#iss-stream').html('<iframe src="http://www.ustream.tv/embed/17074538?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><iframe src="http://www.ustream.tv/embed/9408562?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><br />' +
    //                         '<iframe src="http://www.ustream.tv/embed/6540154?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><iframe src="http://cdn.livestream.com/embed/spaceflightnow?layout=4&amp;height=340&amp;width=560&amp;autoplay=false" style="border:0;outline:0" frameborder="0" scrolling="no"></iframe>');
    // } else {
    //   $('#iss-stream').html('');
    //   $('#iss-stream-menu').hide();
    // }
  }
}
function enableSlowCPUMode () {
  db.log('enableSlowCPUMode');
  if (!settingsManager.cruncherReady) return;
  settingsManager.isSlowCPUModeEnabled = true;
  settingsManager.minimumSearchCharacters = 3;
  settingsManager.satLabelInterval = 500;

  satCruncher.postMessage({
    isSlowCPUModeEnabled: true
  });
}
function debugDrawLine (type, value, color) {
  if (typeof color == 'undefined') color = [1.0, 0, 1.0, 1.0];
  switch (color) {
    case 'r':
      color = [1,0,0,1];
      break;
    case 'o':
      color = [1,0.5,0,1];
      break;
    case 'y':
      color = [1,1,0,1];
      break;
    case 'g':
      color = [0,1,0,1];
      break;
    case 'b':
      color = [0,0,1,1];
      break;
    case 'c':
      color = [0,1,1,1];
      break;
    case 'p':
      color = [1,0,1,1];
      break;
  }
  if (type == 'sat') {
    let sat = satSet.getSat(value);
    drawLineList.push(
      {
        'line': new Line(),
        'sat': sat,
        'ref': [0,0,0],
        'ref2': [sat.position.x, sat.position.y, sat.position.z],
        'color': color
      }
    );
  }
  if (type == 'sat2') {
    let sat = satSet.getSat(value[0]);
    drawLineList.push(
      {
        'line': new Line(),
        'sat': sat,
        'ref': [value[1], value[2], value[3]],
        'ref2': [sat.position.x, sat.position.y, sat.position.z],
        'color': color
      }
    );
  }
  if (type == 'sat3') {
    let sat = satSet.getSat(value[0]);
    var sat2 = satSet.getSat(value[1]);
    drawLineList.push(
      {
        'line': new Line(),
        'sat': sat,
        'sat2': sat2,
        'ref': [sat.position.x, sat.position.y, sat.position.z],
        'ref2': [sat2.position.x, sat2.position.y, sat2.position.z],
        'color': color
      }
    );
  }
  if (type == 'ref') {
    drawLineList.push(
      {
        'line': new Line(),
        'ref': [0,0,0],
        'ref2': [value[0], value[1], value[2]],
        'color': color
      }
    );
  }
  if (type == 'ref2') {
    drawLineList.push(
      {
        'line': new Line(),
        'ref': [value[0], value[1], value[2]],
        'ref2': [value[3], value[4], value[5]],
        'color': color
      }
    );
  }
}

var drawLinesI = 0;
var tempStar1, tempStar2;
var satPos;
function drawLines () {
  if (drawLineList.length == 0) return;
  for (drawLinesI = 0; drawLinesI < drawLineList.length; drawLinesI++) {
    if (typeof drawLineList[drawLinesI].sat != 'undefined') {
      // At least One Satellite
      drawLineList[drawLinesI].sat =  satSet.getSatPosOnly(drawLineList[drawLinesI].sat.id);
      if (typeof drawLineList[drawLinesI].sat2 != 'undefined') {
        // Satellite and Static
        if (typeof drawLineList[drawLinesI].sat2.name != 'undefined'){
          if (typeof  drawLineList[drawLinesI].sat2.id == 'undefined') {
            drawLineList[drawLinesI].sat2.id = satSet.getIdFromSensorName(drawLineList[drawLinesI].sat2.name);
          }
          drawLineList[drawLinesI].sat2 =  satSet.getSatPosOnly(drawLineList[drawLinesI].sat2.id);
          drawLineList[drawLinesI].line.set([drawLineList[drawLinesI].sat.position.x,drawLineList[drawLinesI].sat.position.y,drawLineList[drawLinesI].sat.position.z], [drawLineList[drawLinesI].sat2.position.x,drawLineList[drawLinesI].sat2.position.y,drawLineList[drawLinesI].sat2.position.z]);
        } else {
          // Two Satellites
          drawLineList[drawLinesI].sat2 =  satSet.getSatPosOnly(drawLineList[drawLinesI].sat2.id);
          drawLineList[drawLinesI].line.set([drawLineList[drawLinesI].sat.position.x,drawLineList[drawLinesI].sat.position.y,drawLineList[drawLinesI].sat.position.z], [drawLineList[drawLinesI].sat2.position.x,drawLineList[drawLinesI].sat2.position.y,drawLineList[drawLinesI].sat2.position.z]);
        }
      } else {
        // Just One Satellite
        drawLineList[drawLinesI].line.set(drawLineList[drawLinesI].ref, [drawLineList[drawLinesI].sat.position.x,drawLineList[drawLinesI].sat.position.y,drawLineList[drawLinesI].sat.position.z]);
      }
    } else if ((typeof drawLineList[drawLinesI].star1 != 'undefined') && (typeof drawLineList[drawLinesI].star2 != 'undefined')) {
      // Constellation
      if (typeof drawLineList[drawLinesI].star1ID == 'undefined') { drawLineList[drawLinesI].star1ID = satSet.getIdFromStarName(drawLineList[drawLinesI].star1); }
      if (typeof drawLineList[drawLinesI].star2ID == 'undefined') { drawLineList[drawLinesI].star2ID = satSet.getIdFromStarName(drawLineList[drawLinesI].star2); }
      tempStar1 =  satSet.getSatPosOnly(drawLineList[drawLinesI].star1ID);
      tempStar2 =  satSet.getSatPosOnly(drawLineList[drawLinesI].star2ID);
      drawLineList[drawLinesI].line.set([tempStar1.position.x, tempStar1.position.y, tempStar1.position.z], [tempStar2.position.x, tempStar2.position.y,tempStar2.position.z]);
    } else {
      // Arbitrary Lines
      drawLineList[drawLinesI].line.set(drawLineList[drawLinesI].ref, drawLineList[drawLinesI].ref2);
    }

    drawLineList[drawLinesI].line.draw(drawLineList[drawLinesI].color);
  }
}

(function _canvasController () {
  db.log('_canvasController');
  var latLon;
  canvasDOM.on('touchmove', function (evt) {
    if (settingsManager.disableNormalEvents) { evt.preventDefault(); }
    if (isPinching) {
      var currentPinchDistance = Math.hypot(
        evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX,
        evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
      deltaPinchDistance = ((startPinchDistance - currentPinchDistance) / maxPinchSize);
      zoomTarget += deltaPinchDistance * (settingsManager.cameraMovementSpeed + 0.006);
      zoomTarget = Math.min(Math.max(zoomTarget, 0), 1); // Force between 0 and 1
    } else { // Dont Move While Zooming
      mouseX = evt.originalEvent.touches[0].clientX;
      mouseY = evt.originalEvent.touches[0].clientY;
      if (isDragging && screenDragPoint[0] !== mouseX && screenDragPoint[1] !== mouseY) {
        dragHasMoved = true;
        camAngleSnappedOnSat = false;
        camZoomSnappedOnSat = false;
      }
      isMouseMoving = true;
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(function () {
        isMouseMoving = false;
      }, 250);
    }
  });
  canvasDOM.on("mousemove", function (evt) {
    mouseX = evt.clientX;
    mouseY = evt.clientY;
    if (isDragging && screenDragPoint[0] !== mouseX && screenDragPoint[1] !== mouseY) {
      dragHasMoved = true;
      camAngleSnappedOnSat = false;
      camZoomSnappedOnSat = false;
    }
    isMouseMoving = true;
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(function () {
      isMouseMoving = false;
    }, 250);
  });

  if (settingsManager.disableUI) {
    canvasDOM.on('wheel', function (evt) {
      satHoverBoxDOM.css({
        display: 'none'});
    });
  }
  if (!settingsManager.disableUI) {
    canvasDOM.on('wheel', function (evt) {
      if (settingsManager.disableNormalEvents) { evt.preventDefault(); }

      var delta = evt.originalEvent.deltaY;
      if (evt.originalEvent.deltaMode === 1) {
        delta *= 33.3333333;
      }

      if (delta < 0) {
        isZoomIn = true;
      } else {
        isZoomIn = false;
      }

      zoomTarget += delta / 100 / 50 / speedModifier; // delta is +/- 100
      zoomTarget = Math.min(Math.max(zoomTarget, 0), 1); // Force between 0 and 1
      rotateTheEarth = false;
      camZoomSnappedOnSat = false;

      if (cameraType.current === cameraType.PLANETARIUM || cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE || cameraType.current === cameraType.ASTRONOMY) {
        settingsManager.fieldOfView += delta * 0.0002;
        $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
        if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
        if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) settingsManager.fieldOfView = settingsManager.fieldOfViewMin;
        webGlInit();
      }
    });
    canvasDOM.on("click", function (evt) {
      if (settingsManager.disableNormalEvents) { evt.preventDefault(); }
      rightBtnMenuDOM.hide();
      _clearRMBSubMenu();
      if ($('#colorbox').css('display') === 'block') {
        $.colorbox.close(); // Close colorbox if it was open
      }
    });
    canvasDOM.on("mousedown", function (evt) {
      if (settingsManager.disableNormalEvents) { evt.preventDefault(); }

      if (speedModifier === 1) {
        settingsManager.cameraMovementSpeed = 0.003;
        settingsManager.cameraMovementSpeedMin = 0.005;
      }

      if (evt.button === 2) {
        dragPoint = getEarthScreenPoint(mouseX, mouseY);
        latLon = satellite.eci2ll(dragPoint[0], dragPoint[1], dragPoint[2]);
      }
      screenDragPoint = [mouseX, mouseY];
      dragStartPitch = camPitch;
      dragStartYaw = camYaw;
      // debugLine.set(dragPoint, getCamPos());
      isDragging = true;
      camSnapMode = false;
      rotateTheEarth = false;
      rightBtnMenuDOM.hide();
      _clearRMBSubMenu();

      // TODO: Make uiManager.updateURL() a setting that is disabled by default
      uiManager.updateURL();
    });
    canvasDOM.on('touchstart', function (evt) {
      settingsManager.cameraMovementSpeed = 0.0001;
      settingsManager.cameraMovementSpeedMin = 0.0001;
      if (evt.originalEvent.touches.length > 1) { // Two Finger Touch
          isPinching = true;
          startPinchDistance = Math.hypot(
            evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX,
            evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
          // _pinchStart(evt);
      } else { // Single Finger Touch
        mouseX = evt.originalEvent.touches[0].clientX;
        mouseY = evt.originalEvent.touches[0].clientY;
        mouseSat = getSatIdFromCoord(mouseX, mouseY);
        settingsManager.cameraMovementSpeed = Math.max(0.005 * zoomLevel, settingsManager.cameraMovementSpeedMin);
        screenDragPoint = [mouseX, mouseY];
        // dragPoint = getEarthScreenPoint(x, y);
        dragPoint = screenDragPoint; // Ignore the earth on mobile
        dragStartPitch = camPitch;
        dragStartYaw = camYaw;
        // debugLine.set(dragPoint, getCamPos());
        isDragging = true;
        touchStartTime = Date.now();
        // if (window.innerWidth <= 1000) {
        //   isDragging = false;
        // }
        camSnapMode = false;
        rotateTheEarth = false;

        // TODO: Make updateUrl() a setting that is disabled by default
        uiManager.updateURL();
      }
    });
    canvasDOM.on("mouseup", function (evt) {
      if (settingsManager.disableNormalEvents) { evt.preventDefault(); }
      if (!dragHasMoved) {
        if (settingsManager.isMobileModeEnabled) {
          mouseSat = getSatIdFromCoord(mouseX, mouseY);
        }
        clickedSat = mouseSat;
        if (evt.button === 0) { // Left Mouse Button Clicked
          if (cameraType.current === cameraType.SATELLITE) {
            if (clickedSat !== -1 && !satSet.getSatExtraOnly(clickedSat).static) { selectSat(clickedSat); }
          } else {
            selectSat(clickedSat);
          }
        }
        if (evt.button === 2) { // Right Mouse Button Clicked
          _openRmbMenu();
        }
      }
      // Repaint the theme to ensure it is the right color
      settingsManager.themes.retheme();
      // Force the serach bar to get repainted because it gets overwrote a lot
      settingsManager.themes.redThemeSearch();
      dragHasMoved = false;
      isDragging = false;
      rotateTheEarth = false;
    });
  }

  function _openRmbMenu () {
    let numMenuItems = 0;
    $('#clear-lines-rmb').hide();

    // View
    $('#view-info-rmb').hide();
    $('#view-sensor-info-rmb').hide();
    $('#view-sat-info-rmb').hide();
    $('#view-related-sats-rmb').hide();
    $('#view-curdops-rmb').hide();
    $('#view-24dops-rmb').hide();

    // Edit
    $('#edit-sat-rmb').hide();

    // Create
    $('#create-observer-rmb ').hide();
    $('#create-sensor-rmb').hide();

    // Draw
    $('#line-eci-axis-rmb').hide();
    $('#line-sensor-sat-rmb').hide();
    $('#line-earth-sat-rmb').hide();
    $('#line-sat-sun-rmb').hide();

    // Earth
    $('#earth-low-rmb').hide();
    $('#earth-high-rmb').hide();
    $('#earth-vec-rmb').hide();

    // Colors Always Present

    var isViewDOM = false;
    var isEditDOM = false;
    var isCreateDOM = false;
    var isDrawDOM = false;
    var isEarthDOM = false;

    rightBtnSaveDOM.show();
    rightBtnViewDOM.hide();
    rightBtnEditDOM.hide();
    rightBtnCreateDOM.hide();
    rightBtnDrawDOM.hide();
    rightBtnEarthDOM.hide();

    if (drawLineList.length > 0) {
      $('#clear-lines-rmb').show();
    }


    if (mouseSat !== -1) {
      if (typeof clickedSat == 'undefined' || typeof satSet.getSat(clickedSat) == 'undefined') return;
      if (typeof satSet.getSat(clickedSat).type == 'undefined' || satSet.getSat(clickedSat).type !== 'Star') {
        rightBtnViewDOM.show();
        isViewDOM = true;
        numMenuItems++;
      }
      if (!satSet.getSat(clickedSat).static) {
        $('#edit-sat-rmb').show();
        rightBtnEditDOM.show();
        isEditDOM = true;
        numMenuItems++;

        $('#view-sat-info-rmb').show();
        $('#view-related-sats-rmb').show();

        if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected() && sensorManager.whichRadar !== 'CUSTOM') {
          $('#line-sensor-sat-rmb').show();
        }
        $('#line-earth-sat-rmb').show();
        $('#line-sat-sun-rmb').show();
        rightBtnDrawDOM.show();
        isDrawDOM = true;
        numMenuItems++;
      } else {
        if (satSet.getSat(clickedSat).type === 'Optical' ||
            satSet.getSat(clickedSat).type === 'Mechanical' ||
            satSet.getSat(clickedSat).type === 'Phased Array Radar') {

          $('#view-sensor-info-rmb').show();
        }
      }
    } else {
    }

    // Is this the Earth?
    //
    // This not the Earth

    if (typeof latLon == 'undefined' || isNaN(latLon.latitude) || isNaN(latLon.longitude)) {
    } else { // This is the Earth
      if (!isViewDOM) {
        rightBtnViewDOM.show();
        ++numMenuItems;
      }
      $('#view-info-rmb').show();
      $('#view-curdops-rmb').show();
      $('#view-24dops-rmb').show();

      if (!isCreateDOM) {
        rightBtnCreateDOM.show();
        ++numMenuItems;
      }
      $('#create-observer-rmb ').show();
      $('#create-sensor-rmb').show();

      if (!isDrawDOM) {
        rightBtnDrawDOM.show();
        ++numMenuItems;
      }
      $('#line-eci-axis-rmb').show();

      if (!isEarthDOM) {
        rightBtnEarthDOM.show();
        ++numMenuItems;
      }

      $('#earth-nasa-rmb').show();
      $('#earth-blue-rmb').show();
      $('#earth-low-rmb').show();
      $('#earth-high-no-clouds-rmb').show();
      $('#earth-vec-rmb').show();
      if (settingsManager.nasaImages == true) $('#earth-nasa-rmb').hide();
      if (settingsManager.trusatImages == true) $('#earth-trusat-rmb').hide();
      if (settingsManager.blueImages == true) $('#earth-blue-rmb').hide();
      if (settingsManager.lowresImages == true) $('#earth-low-rmb').hide();
      if (settingsManager.hiresNoCloudsImages == true) $('#earth-high-no-clouds-rmb').hide();
      if (settingsManager.vectorImages == true) $('#earth-vec-rmb').hide();
    }

    rightBtnMenuDOM.show();
    satHoverBoxDOM.hide();
    // Might need to be adjusted if number of menus change
    var offsetX = (mouseX < (canvasDOM.innerWidth() / 2)) ? 0 : -100;
    var offsetY = (mouseY < (canvasDOM.innerHeight() / 2)) ? 0 : (numMenuItems * -50);
    rightBtnMenuDOM.css({
      display: 'block',
      'text-align': 'center',
      position: 'absolute',
      left: mouseX + offsetX,
      top: mouseY + offsetY
    });
  }

  canvasDOM.on('touchend', function (evt) {
    let touchTime = (Date.now() - touchStartTime);

    if (touchTime > 250) {
      // TODO: Implement touchscreen rmb
      // _openRmbMenu();
      mouseSat = -1;
    }

    if (isPinching) {
        // pinchEnd(e);
        isPinching = false;
    }
    mouseY = 0;
    mouseX = 0;
    dragHasMoved = false;
    isDragging = false;
    rotateTheEarth = false;
  });

  $('#nav-wrapper *').on("click", function (evt) { _hidePopUps(); });
  $('#nav-wrapper').on("click", function (evt) { _hidePopUps(); });
  $('#nav-footer *').on("click", function (evt) { _hidePopUps(); });
  $('#nav-footer').on("click", function (evt) { _hidePopUps(); });
  $('#ui-wrapper *').on("click", function (evt) { _hidePopUps(); });
  function _hidePopUps () {
    rightBtnMenuDOM.hide();
    _clearRMBSubMenu();
    if ($('#colorbox').css('display') === 'block') {
      $.colorbox.close(); // Close colorbox if it was open
    }
  }

  if (settingsManager.startWithFocus) {
    canvasDOM.attr('tabIndex', 0);
    canvasDOM.trigger("focus");
  }

  if (!settingsManager.disableUI) {
    bodyDOM.on('keypress', _keyHandler); // On Key Press Event Run _keyHandler Function
    bodyDOM.on('keydown', _keyDownHandler); // On Key Press Event Run _keyHandler Function
    bodyDOM.on('keyup', _keyUpHandler); // On Key Press Event Run _keyHandler Function

    rightBtnMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });
    rightBtnSaveMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });
    rightBtnViewMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });
    rightBtnEditMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });
    rightBtnCreateMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });
    rightBtnDrawMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });
    rightBtnColorsMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });
    rightBtnEarthMenuDOM.on("click", function (e) {
      _rmbMenuActions(e);
    });

    rightBtnSaveDOM.hover(function () {
      _clearRMBSubMenu();
      var offsetX = (rightBtnSaveDOM.offset().left < (canvasDOM.innerWidth() / 2)) ? 165 : -165;
      rightBtnSaveMenuDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
        left: rightBtnSaveDOM.offset().left + offsetX,
        top: rightBtnSaveDOM.offset().top
      });
      if (rightBtnSaveDOM.offset().top !== 0) {
        rightBtnSaveMenuDOM.show();
      } else {
        rightBtnSaveMenuDOM.hide();
      }
    });
    rightBtnSaveMenuDOM.hover(null, function () { // Lost Focus
      rightBtnSaveMenuDOM.hide();
    });

    rightBtnViewDOM.hover(function () {
      _clearRMBSubMenu();
      var offsetX = (rightBtnViewDOM.offset().left < (canvasDOM.innerWidth() / 2)) ? 165 : -165;
      rightBtnViewMenuDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
        left: rightBtnViewDOM.offset().left + offsetX,
        top: rightBtnViewDOM.offset().top
      });
      if (rightBtnViewDOM.offset().top !== 0) {
        rightBtnViewMenuDOM.show();
      } else {
        rightBtnViewMenuDOM.hide();
      }
    });
    rightBtnViewMenuDOM.hover(null, function () { // Lost Focus
      rightBtnViewMenuDOM.hide();
    });

    rightBtnEditDOM.hover(function () {
      _clearRMBSubMenu();

      var offsetX = (rightBtnEditDOM.offset().left < (canvasDOM.innerWidth() / 2)) ? 165 : -165;
      rightBtnEditMenuDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
        left: rightBtnEditDOM.offset().left + offsetX,
        top: rightBtnEditDOM.offset().top
      });
      if (rightBtnEditMenuDOM.offset().top !== 0) {
        rightBtnEditMenuDOM.show();
      } else {
        rightBtnEditMenuDOM.hide();
      }
    });
    rightBtnEditMenuDOM.hover(null, function () { // Lost Focus
      rightBtnEditMenuDOM.hide();
    });

    rightBtnCreateDOM.hover(function () {
      _clearRMBSubMenu();

      var offsetX = (rightBtnCreateDOM.offset().left < (canvasDOM.innerWidth() / 2)) ? 165 : -165;
      rightBtnCreateMenuDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
        left: rightBtnCreateDOM.offset().left + offsetX,
        top: rightBtnCreateDOM.offset().top
      });
      if (rightBtnCreateMenuDOM.offset().top !== 0) {
        rightBtnCreateMenuDOM.show();
      } else {
        rightBtnCreateMenuDOM.hide();
      }
    });
    rightBtnCreateMenuDOM.hover(null, function () { // Lost Focus
      rightBtnCreateMenuDOM.hide();
    });

    rightBtnDrawDOM.hover(function () {
      _clearRMBSubMenu();
      var offsetX = (rightBtnDrawDOM.offset().left < (canvasDOM.innerWidth() / 2)) ? 165 : -165;
      rightBtnDrawMenuDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
        left: rightBtnDrawDOM.offset().left + offsetX,
        top: rightBtnDrawDOM.offset().top
      });
      if (rightBtnDrawDOM.offset().top !== 0) {
        rightBtnDrawMenuDOM.show();
      } else {
        rightBtnDrawMenuDOM.hide();
      }
    });
    rightBtnDrawMenuDOM.hover(null, function () { // Lost Focus
      rightBtnDrawMenuDOM.hide();
    });

    rightBtnColorsDOM.hover(function () {
      _clearRMBSubMenu();
      var offsetX = (rightBtnColorsDOM.offset().left < (canvasDOM.innerWidth() / 2)) ? 165 : -165;
      rightBtnColorsMenuDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
        left: rightBtnColorsDOM.offset().left + offsetX,
        top: rightBtnColorsDOM.offset().top
      });
      if (rightBtnColorsDOM.offset().top !== 0) {
        rightBtnColorsMenuDOM.show();
      } else {
        rightBtnColorsMenuDOM.hide();
      }
    });
    rightBtnEarthMenuDOM.hover(null, function () { // Lost Focus
      rightBtnEarthMenuDOM.hide();
    });

    rightBtnEarthDOM.hover(function () {
      _clearRMBSubMenu();
      var offsetX = (rightBtnEarthDOM.offset().left < (canvasDOM.innerWidth() / 2)) ? 165 : -165;
      rightBtnEarthMenuDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
        left: rightBtnEarthDOM.offset().left + offsetX,
        top: rightBtnEarthDOM.offset().top
      });
      if (rightBtnEarthDOM.offset().top !== 0) {
        rightBtnEarthMenuDOM.show();
      } else {
        rightBtnEarthMenuDOM.hide();
      }
    });
    rightBtnEarthMenuDOM.hover(null, function () { // Lost Focus
      rightBtnEarthMenuDOM.hide();
    });
  }
  function _rmbMenuActions (e) {
    // No Right Click Without UI
    if (settingsManager.disableUI) return;

    var targetId = e.target.id;
    if (e.target.tagName == 'A') {
      targetId = e.target.parentNode.id;
    }
    if (e.target.tagName == 'UL'){
      targetId = e.target.firstChild.id;
    }
    switch (targetId) {
      case 'save-hd-rmb':
        uiManager.saveHiResPhoto('hd');
      break;
      case 'save-4k-rmb':
        uiManager.saveHiResPhoto('4k');
      break;
      case 'save-8k-rmb':
        uiManager.saveHiResPhoto('8k');
      break;
      case 'view-info-rmb':
        M.toast({html: 'Lat: ' + latLon.latitude.toFixed(3) + '<br/>Lon: ' + latLon.longitude.toFixed(3)});
      break;
      case 'view-sat-info-rmb':
        selectSat(clickedSat);
        break;
      case 'view-sensor-info-rmb':
        selectSat(clickedSat);
        $('#menu-sensor-info').on("click", () => {});
        break;
      case 'view-related-sats-rmb':
        var intldes = satSet.getSatExtraOnly(clickedSat).intlDes;
        var searchStr = intldes.slice(0, 8);
        searchBox.doSearch(searchStr);
        break;
      case 'view-curdops-rmb':
        var gpsDOP = satellite.getDOPs(latLon.latitude, latLon.longitude, 0);
        M.toast({html: 'HDOP: ' + gpsDOP.HDOP + '<br/>' +
                       'VDOP: ' + gpsDOP.VDOP + '<br/>' +
                       'PDOP: ' + gpsDOP.PDOP + '<br/>' +
                       'GDOP: ' + gpsDOP.GDOP + '<br/>' +
                       'TDOP: ' + gpsDOP.TDOP});
      break;
      case 'view-24dops-rmb':
        if (!isDOPMenuOpen) {
          $('#dops-lat').val(latLon.latitude.toFixed(3));
          $('#dops-lon').val(latLon.longitude.toFixed(3));
          $('#dops-alt').val(0);
          $('#dops-el').val(settingsManager.gpsElevationMask);
          _bottomIconPress({currentTarget: {id: 'menu-dops'}});
        } else {
          uiManager.hideSideMenus();
          isDOPMenuOpen = true;
          $('#loading-screen').fadeIn('slow', function () {
            $('#dops-lat').val(latLon.latitude.toFixed(3));
            $('#dops-lon').val(latLon.longitude.toFixed(3));
            $('#dops-alt').val(0);
            $('#dops-el').val(settingsManager.gpsElevationMask);
            var lat = $('#dops-lat').val() * 1;
            var lon = $('#dops-lon').val() * 1;
            var alt = $('#dops-alt').val() * 1;
            var el = $('#dops-el').val() * 1;
            satellite.getDOPsTable(lat, lon, alt);
            $('#menu-dops').addClass('bmenu-item-selected');
            $('#loading-screen').fadeOut();
            $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          });
        }
      break;
      case 'edit-sat-rmb':
        selectSat(clickedSat);
        if (!isEditSatMenuOpen) {
          _bottomIconPress({currentTarget: {id: 'menu-editSat'}});
        }
      break;
      case 'create-sensor-rmb':
        $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        $('#menu-customSensor').addClass('bmenu-item-selected');
        isCustomSensorMenuOpen = true;
        $('#cs-telescope').on("click", () => {});
        $('#cs-lat').val(latLon.latitude);
        $('#cs-lon').val(latLon.longitude);
        $('#cs-hei').val(0);
        $('#cs-type').val('Optical');
        // $('#cs-telescope').prop('checked', false);
        $('#cs-minaz').val(0);
        $('#cs-maxaz').val(360);
        $('#cs-minel').val(10);
        $('#cs-maxel').val(90);
        $('#cs-minrange').val(0);
        $('#cs-maxrange').val(1000000);
        $('#customSensor').on("submit", () => {});
      break;
      case 'clear-lines-rmb':
        drawLineList = [];
        if (objectManager.isStarManagerLoaded) {
          starManager.isAllConstellationVisible = false;
        }
        break;
      case 'line-eci-axis-rmb':
        debugDrawLine('ref',[10000, 0, 0],'r');
        debugDrawLine('ref',[0, 10000, 0],'g');
        debugDrawLine('ref',[0, 0, 10000],'b');
        break;
      case 'line-earth-sat-rmb':
        debugDrawLine('sat', clickedSat,'p');
        break;
      case 'line-sensor-sat-rmb':
        // Sensor always has to be #2
        debugDrawLine('sat3', [clickedSat,satSet.getIdFromSensorName(sensorManager.currentSensor.name)],'p');
        break;
      case 'line-sat-sun-rmb':
        var sunPos = sun.getXYZ();
        debugDrawLine('sat2', [clickedSat, sunPos.x, sunPos.y, sunPos.z],'p');
        break;
      case 'create-observer-rmb':
        $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        $('#menu-customSensor').addClass('bmenu-item-selected');
        isCustomSensorMenuOpen = true;
        $('#cs-lat').val(latLon.latitude);
        $('#cs-lon').val(latLon.longitude);
        $('#cs-hei').val(0);
        $('#cs-type').val('Observer');
        $('#customSensor').on("submit", () => {});
        uiManager.legendMenuChange('sunlight');
        satSet.setColorScheme(ColorScheme.sunlight, true);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        settingsManager.isForceColorScheme = true;
        satCruncher.postMessage({
          isSunlightView: true,
        });
      break;
      case 'colors-default-rmb':
        if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected()) {
          uiManager.legendMenuChange('default');
        } else {
          uiManager.legendMenuChange('default');
        }
        satSet.setColorScheme(ColorScheme.default, true);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        ga('send', 'event', 'ColorScheme Menu', 'Default Color', 'Selected');
        break;
      case 'colors-sunlight-rmb':
        uiManager.legendMenuChange('sunlight');
        satSet.setColorScheme(ColorScheme.sunlight, true);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        settingsManager.isForceColorScheme = true;
        satCruncher.postMessage({
          isSunlightView: true,
        });
        ga('send', 'event', 'ColorScheme Menu', 'Sunlight', 'Selected');
        break;
      case 'colors-country-rmb':
        uiManager.legendMenuChange('countries');
        satSet.setColorScheme(ColorScheme.countries);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        ga('send', 'event', 'ColorScheme Menu', 'Countries', 'Selected');
        break;
      case 'colors-velocity-rmb':
        uiManager.legendMenuChange('velocity');
        satSet.setColorScheme(ColorScheme.velocity);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        ga('send', 'event', 'ColorScheme Menu', 'Velocity', 'Selected');
        break;
      case 'colors-ageOfElset-rmb':
        uiManager.legendMenuChange('ageOfElset');
        satSet.setColorScheme(ColorScheme.ageOfElset);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        ga('send', 'event', 'ColorScheme Menu', 'Age of Elset', 'Selected');
        break;
      case 'earth-blue-rmb':
        settingsManager.blueImages = true;
        settingsManager.nasaImages = false;
        settingsManager.trusatImages = false;
        settingsManager.lowresImages = false;
        settingsManager.hiresImages = false;
        settingsManager.hiresNoCloudsImages = false;
        settingsManager.vectorImages = false;
        localStorage.setItem("lastMap", 'nasa');
        earth.init();
        break;
      case 'earth-nasa-rmb':
        settingsManager.blueImages = false;
        settingsManager.nasaImages = true;
        settingsManager.trusatImages = false;
        settingsManager.lowresImages = false;
        settingsManager.hiresImages = false;
        settingsManager.hiresNoCloudsImages = false;
        settingsManager.vectorImages = false;
        localStorage.setItem("lastMap", 'nasa');
        earth.init();
        break;
      case 'earth-trusat-rmb':
        settingsManager.blueImages = false;
        settingsManager.nasaImages = false;
        settingsManager.trusatImages = true;
        settingsManager.lowresImages = false;
        settingsManager.hiresImages = false;
        settingsManager.hiresNoCloudsImages = false;
        settingsManager.vectorImages = false;
        localStorage.setItem("lastMap", 'trusat');
        earth.init();
        break;
      case 'earth-low-rmb':
        settingsManager.blueImages = false;
        settingsManager.nasaImages = false;
        settingsManager.trusatImages = false;
        settingsManager.lowresImages = true;
        settingsManager.hiresImages = false;
        settingsManager.hiresNoCloudsImages = false;
        settingsManager.vectorImages = false;
        localStorage.setItem("lastMap", 'low');
        earth.init();
        break;
      case 'earth-high-rmb':
        $('#loading-screen').fadeIn('slow', function () {
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = true;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem("lastMap", 'high');
          earth.init();
          $('#loading-screen').fadeOut();
        });
        break;
      case 'earth-high-no-clouds-rmb':
        $('#loading-screen').fadeIn('slow', function () {
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = true;
          settingsManager.vectorImages = false;
          localStorage.setItem("lastMap", 'high-nc');
          earth.init();
          $('#loading-screen').fadeOut();
        });
        break;
      case 'earth-vec-rmb':
        settingsManager.blueImages = false;
        settingsManager.nasaImages = false;
        settingsManager.trusatImages = false;
        settingsManager.lowresImages = false;
        settingsManager.hiresImages = false;
        settingsManager.hiresNoCloudsImages = false;
        settingsManager.vectorImages = true;
        localStorage.setItem("lastMap", 'vec');
        earth.init();
        break;
      case 'clear-screen-rmb':
        (function clearScreenRMB () {
          searchBox.hideResults();
          isMilSatSelected = false;
          $('#menu-space-stations').removeClass('bmenu-item-selected');

          if ((!objectManager.isSensorManagerLoaded || sensorManager.checkSensorSelected()) && cameraType.current !== cameraType.PLANETARIUM && cameraType.current !== cameraType.ASTRONOMY) {
            uiManager.legendMenuChange('default');
          }

          selectSat(-1);

        })();
        break;
      }
      rightBtnMenuDOM.hide();
      _clearRMBSubMenu();
  }
})();
