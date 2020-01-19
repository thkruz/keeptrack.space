/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
(c) 2015-2016, James Yoder

main.js is the primary javascript file for keeptrack.space. It manages all user
interaction with the application.
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

/* global
    satSet
    searchBox
    $
    satellite
    ColorScheme
    orbitDisplay
    shaderLoader
    SunCalc
    earth
    groups
    mat4
    vec3
    vec4
    requestAnimationFrame
    ga
    mapManager
    sensorManager
    objectManager
    missileManager.MassRaidPre
    saveAs
    Blob
    FileReader
    missileManager.UsaICBM
    missileManager.RussianICBM
    missileManager.NorthKoreanBM
    Missile
    missileManager.missilesInUse
    missileManager.lastMissileError
    settingsManager
*/

// Constants
var ZOOM_EXP = 3;
var DIST_MIN = 6800;
var DIST_MAX = 200000;
var TAU = 2 * Math.PI;
var DEG2RAD = TAU / 360;
var RAD2DEG = 360 / TAU;
var RADIUS_OF_EARTH = 6371.0;
var RADIUS_OF_SUN = 695700;
var MINUTES_PER_DAY = 1440;
var PLANETARIUM_DIST = 3;
var MILLISECONDS_PER_DAY = 1.15741e-8;

var debugTimeArray = [];

var timeManager = window.timeManager;
var satCruncher = window.satCruncher;
var gl;

// Camera Variables
var camYaw = 0;
var camPitch = 0.5;
var camYawTarget = 0;
var camPitchTarget = 0;
var camSnapMode = false;
var camZoomSnappedOnSat = false;
var camAngleSnappedOnSat = false;
var zoomLevel = 0.5;
var zoomTarget = 0.5;
var isZoomIn = false;
var camPitchSpeed = 0;
var camYawSpeed = 0;
var camRotateSpeed = 0;

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

var fpsEl;
var fpsAz;

var pickFb, pickTex;
var pMatrix = mat4.create();
var camMatrix = mat4.create();
var camMatrixEmpty = mat4.create();
var selectedSat = -1;
var lastSelectedSat = -1;

// getEarthScreenPoint;
// var rayOrigin;
// var curRadarTrackNum = 0;
// var lastRadarTrackTime = 0;
// var debugLine;
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

var FPSPitch = 0;
var FPSPitchRate = 0;
var FPSRotate = 0;
var FPSRotateRate = 0;
var FPSYaw = 0;
var FPSYawRate = 0;
var FPSxPos = 0;
var FPSyPos = 25000;
var FPSzPos = 0;
var FPSForwardSpeed = 0;
var FPSSideSpeed = 0;
var FPSVertSpeed = 0;
var isFPSForwardSpeedLock = false;
var isFPSSideSpeedLock = false;
var isFPSVertSpeedLock = false;
var FPSRun = 1;
var FPSLastTime = 1;

var satScreenPositionArray = {};

var isShowNextPass = false;
var isShowDistance = true;
var isHoverBoxVisible = false;

var rotateTheEarth = true; // Set to False to disable initial rotation
var rotateTheEarthSpeed = 0.000075; // Adjust to change camera speed when rotating around earth

var drawLoopCallback;
(function () {
  var time, drawNow, dt;

  // updateHover
  var updateHoverSatId, updateHoverSatPos;

  // _unProject variables
  var glScreenX, glScreenY, screenVec, comboPMat, invMat, worldVec, gCPr, gCPz,
      gCPrYaw, gCPx, gCPy, FPStimeNow, FPSelapsed, satData, dragTarget;

  // drawLoop camera variables
  var xDif, yDif, yawTarget, pitchTarget, dragPointR, dragTargetR, dragPointLon,
      dragTargetLon, dragPointLat, dragTargetLat, pitchDif, yawDif;

  // getEarthScreenPoint
  var rayOrigin, ptThru, rayDir, toCenterVec, dParallel, longDir, dPerp, dSubSurf,
      dSurf, ptSurf;

  $(document).ready(function () { // Code Once index.htm is loaded

    // Set Default TLE
    settingsManager.tleSource = 'TLE.json';
    webGlInit();
    earth.init();
    ColorScheme.init();
    satSet.init(function satSetInitCallBack (satData) {
      $('#loader-text').text('Coloring Inside the Lines...');
      orbitDisplay.init();
      groups.init();
      searchBox.init(satData);

      // debugLine = new Line();
      // debugLine2 = new Line();
      // debugLine3 = new Line();
    });
    satSet.onCruncherReady(function (satData) {
      // do querystring stuff
      var queryStr = window.location.search.substring(1);
      var params = queryStr.split('&');
      for (var i = 0; i < params.length; i++) {
        var key = params[i].split('=')[0];
        var val = params[i].split('=')[1];
        switch (key) {
          case 'intldes':
            var urlSatId = satSet.getIdFromIntlDes(val.toUpperCase());
            if (urlSatId !== null) {
              selectSat(urlSatId);
            }
            break;
          case 'search':
            // console.log('preloading search to ' + val);
            searchBox.doSearch(val);
            $('#search').val(val);
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
          case 'hrs':
            // console.log('propagating at offset ' + val + ' hrs');
            // offset is in msec
            timeManager.propOffset = Number(val) * 3600 * 1000;
            satCruncher.postMessage({
              typ: 'offset',
              dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString()
            });
            break;
        }
      }

      searchBox.init(satData);
      satSet.satDataString = null; // Clears stringified json file and clears 7MB of memory.
    });
    drawLoop(); // kick off the animationFrame()s
  });

  var drawLoopCount = 0;

  function drawLoop () {
    // NOTE 7kb memory leak -- No Impact
    requestAnimationFrame(drawLoop);
    drawNow = Date.now();
    dt = drawNow - (time || drawNow);
    if (typeof drawLoopCount != 'undefined') {
      drawLoopCount++;
      if (drawLoopCount > 100) {
        drawLoopCount = null;
        return;
      }
      if (drawLoopCount > 10) {
        if (dt > 500 && !settingsManager.isSlowCPUModeEnabled) enableSlowCPUMode();
      }
    }
    if (dt > 20) {
      updateHoverDelayLimit = 6;
    } else if (dt > 50) {
      updateHoverDelayLimit = 10;
    } else {
      if (updateHoverDelayLimit > 1)
        --updateHoverDelayLimit;
    }

    time = drawNow;
    timeManager.now = drawNow;

    if ((isDragging && !settingsManager.isMobileModeEnabled) ||
         isDragging && settingsManager.isMobileModeEnabled && (mouseX !== 0 || mouseY !== 0)) {
      dragTarget = getEarthScreenPoint(mouseX, mouseY);
      if (isNaN(dragTarget[0]) || isNaN(dragTarget[1]) || isNaN(dragTarget[2]) ||
      isNaN(dragPoint[0]) || isNaN(dragPoint[1]) || isNaN(dragPoint[2]) ||
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

      FPSPitch -= 20 * camPitchSpeed * dt;
      FPSYaw -= 20 * camYawSpeed * dt;
      FPSRotate -= 20 * camRotateSpeed * dt;

      // Prevent Over Rotation
      if (FPSPitch > 90) FPSPitch = 90;
      if (FPSPitch < -90) FPSPitch = -90;
      // ASTRONOMY 180 FOV Bubble Looking out from Sensor
      if (cameraType.current=== cameraType.ASTRONOMY) {
        if (FPSRotate > 90) FPSRotate = 90;
        if (FPSRotate < -90) FPSRotate = -90;
      } else {
        if (FPSRotate > 360) FPSRotate -= 360;
        if (FPSRotate < 0) FPSRotate += 360;
      }
      if (FPSYaw > 360) FPSYaw -= 360;
      if (FPSYaw < 0) FPSYaw += 360;
    } else {
      camPitch += camPitchSpeed * dt;
      camYaw += camYawSpeed * dt;
      FPSRotate += camRotateSpeed * dt;
    }

    if (rotateTheEarth) { camYaw -= rotateTheEarthSpeed * dt; }

    if (camSnapMode) {
      camPitch += (camPitchTarget - camPitch) * 0.003 * dt;

      let yawErr = _normalizeAngle(camYawTarget - camYaw);
      camYaw += yawErr * 0.003 * dt;

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

    _drawScene();
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

    drawLines();
    // var bubble = new FOVBubble();
    // bubble.set();
    // bubble.draw();
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
        satellite.getTEARR(sat);       // do lookangles on the satellite
        altitude = satellite.currentTEARR.alt; // and set the altitude
      } if (sat.missile) {
        altitude = sat.maxAlt + 1000;             // if it is a missile use its altitude
        orbitDisplay.setSelectOrbit(sat.satId);
      }
      if (altitude) {
        camDistTarget = altitude + RADIUS_OF_EARTH + settingsManager.camDistBuffer;
      } else {
        camDistTarget = RADIUS_OF_EARTH + settingsManager.camDistBuffer;  // Stay out of the center of the earth. You will get stuck there.
        console.warn('Zoom Calculation Error: ' + altitude + ' -- ' + camDistTarget);
        camZoomSnappedOnSat = false;
        camAngleSnappedOnSat = false;
      }
      if (Math.pow((camDistTarget - DIST_MIN) / (DIST_MAX - DIST_MIN), 1 / ZOOM_EXP) < zoomTarget) {
        zoomTarget = Math.pow((camDistTarget - DIST_MIN) / (DIST_MAX - DIST_MIN), 1 / ZOOM_EXP);
      }
    }

    if (cameraType.current=== cameraType.PLANETARIUM) {
      zoomTarget = 0.01;
    }
  }

  // var pitchRotate;
  // var yawRotate;
  function _drawScene () {
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (cameraType.current=== cameraType.FPS || cameraType.current=== cameraType.SATELLITE || cameraType.current=== cameraType.ASTRONOMY) {
      _FPSMovement();
    }
    camMatrix = _drawCamera();

    gl.useProgram(gl.pickShaderProgram);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(gl.pickShaderProgram.camMatrix, false, camMatrix);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // if (typeof debugLine != 'undefined') debugLine.draw();
    earth.draw(pMatrix, camMatrix);
    satSet.draw(pMatrix, camMatrix, drawNow);
    orbitDisplay.draw(pMatrix, camMatrix);

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
       camPitch = 0.5;
       camYaw = 0.5;
       zoomLevel  = 0.5;
       camPitchTarget = 0;
       camYawTarget = 0;
       zoomTarget = 0.5;
       console.error('Camera Math Error - Camera Reset');
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
          mat4.rotate(camMatrix, camMatrix, -FPSPitch * DEG2RAD, [1, 0, 0]);
          mat4.rotate(camMatrix, camMatrix, FPSYaw * DEG2RAD, [0, 0, 1]);
          mat4.translate(camMatrix, camMatrix, [FPSxPos, FPSyPos, -FPSzPos]);
          break;
        case cameraType.PLANETARIUM: // pivot around the earth looking away from the earth
          {
            let satPos = _calculateSensorPos({});

            // Pitch is the opposite of the angle to the latitude
            // Yaw is 90 degrees to the left of the angle to the longitude
            pitchRotate = ((-1 * satellite.currentSensor.lat) * DEG2RAD);
            yawRotate = ((90 - satellite.currentSensor.long) * DEG2RAD) - satPos.gmst;
            mat4.rotate(camMatrix, camMatrix, pitchRotate, [1, 0, 0]);
            mat4.rotate(camMatrix, camMatrix, yawRotate, [0, 0, 1]);

            mat4.translate(camMatrix, camMatrix, [-satPos.x, -satPos.y, -satPos.z]);

            _showOrbitsAbove();

            break;
          }
        case cameraType.SATELLITE:
          {
            // yawRotate = ((-90 - satellite.currentSensor.long) * DEG2RAD);
            if (selectedSat !== -1) lastSelectedSat = selectedSat;
            let sat = satSet.getSat(lastSelectedSat);
            // mat4.rotate(camMatrix, camMatrix, sat.inclination * DEG2RAD, [0, 1, 0]);
            mat4.rotate(camMatrix, camMatrix, -FPSPitch * DEG2RAD, [1, 0, 0]);
            mat4.rotate(camMatrix, camMatrix, FPSYaw * DEG2RAD, [0, 0, 1]);
            mat4.rotate(camMatrix, camMatrix, FPSRotate * DEG2RAD, [0, 1, 0]);

            orbitDisplay.updateOrbitBuffer(lastSelectedSat);
            let satPos = sat.position;
            mat4.translate(camMatrix, camMatrix, [-satPos.x, -satPos.y, -satPos.z]);
            break;
          }
        case cameraType.ASTRONOMY:
          {
            let satPos = _calculateSensorPos({});

            // Pitch is the opposite of the angle to the latitude
            // Yaw is 90 degrees to the left of the angle to the longitude
            pitchRotate = ((-1 * satellite.currentSensor.lat) * DEG2RAD);
            yawRotate = ((90 - satellite.currentSensor.long) * DEG2RAD) - satPos.gmst;

            // TODO: Calculate Elevation
            // fpsEl = ((FPSPitch + 90) > 90) ? (-(FPSPitch) + 90) : (FPSPitch + 90);
            // $('#el-text').html(' EL: ' + fpsEl.toFixed(2) + ' deg');

            // yawRotate = ((-90 - satellite.currentSensor.long) * DEG2RAD);
            let sensor = null;
            if (typeof satellite.currentSensor.name == 'undefined') {
              sensor = satSet.getIdFromSensorName(satellite.currentSensor.name);
              if (sensor == null) return;
            } else {
              sensor = satSet.getSat(satSet.getIdFromSensorName(satellite.currentSensor.name));
            }
            // mat4.rotate(camMatrix, camMatrix, sat.inclination * DEG2RAD, [0, 1, 0]);
            mat4.rotate(camMatrix, camMatrix, (pitchRotate + (-FPSPitch * DEG2RAD)), [1, 0, 0]);
            mat4.rotate(camMatrix, camMatrix, (yawRotate + (FPSYaw * DEG2RAD)), [0, 0, 1]);
            mat4.rotate(camMatrix, camMatrix, FPSRotate * DEG2RAD, [0, 1, 0]);

            // orbitDisplay.updateOrbitBuffer(lastSelectedSat);
            let sensorPos = sensor.position;
            FPSxPos = sensorPos.x;
            FPSyPos = sensorPos.y;
            FPSzPos = sensorPos.z;
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

    var cosLat = Math.cos(satellite.currentSensor.lat * DEG2RAD);
    var sinLat = Math.sin(satellite.currentSensor.lat * DEG2RAD);
    var cosLon = Math.cos((satellite.currentSensor.long * DEG2RAD) + gmst);
    var sinLon = Math.sin((satellite.currentSensor.long * DEG2RAD) + gmst);

    pos.x = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon;
    pos.y = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon;
    pos.z = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat;
    pos.gmst = gmst;
    return pos;
  }
  function _FPSMovement () {
    FPStimeNow = Date.now();
    if (FPSLastTime !== 0) {
      FPSelapsed = FPStimeNow - FPSLastTime;

      if (isFPSForwardSpeedLock && FPSForwardSpeed < 0) {
        FPSForwardSpeed = Math.max(FPSForwardSpeed + Math.min(FPSForwardSpeed * -1.02 * FPSelapsed, -0.2), -settingsManager.FPSForwardSpeed);
      } else if (isFPSForwardSpeedLock && FPSForwardSpeed > 0) {
        FPSForwardSpeed = Math.min(FPSForwardSpeed + Math.max(FPSForwardSpeed * 1.02 * FPSelapsed, 0.2), settingsManager.FPSForwardSpeed);
      }

      if (isFPSSideSpeedLock && FPSSideSpeed < 0) {
        FPSSideSpeed = Math.max(FPSSideSpeed + Math.min(FPSSideSpeed * -1.02 * FPSelapsed, -0.2), -settingsManager.FPSSideSpeed);
      } else if (isFPSSideSpeedLock && FPSSideSpeed < 0) {
        FPSSideSpeed = Math.min(FPSSideSpeed + Math.max(FPSSideSpeed * 1.02 * FPSelapsed, 0.2), settingsManager.FPSSideSpeed);
      }

      if (isFPSVertSpeedLock && FPSVertSpeed < 0) {
        FPSVertSpeed = Math.max(FPSVertSpeed + Math.min(FPSVertSpeed * -1.02 * FPSelapsed, -0.2), -settingsManager.FPSVertSpeed);
      } else if (isFPSVertSpeedLock && FPSVertSpeed < 0) {
        FPSVertSpeed = Math.min(FPSVertSpeed + Math.max(FPSVertSpeed * 1.02 * FPSelapsed, 0.2), settingsManager.FPSVertSpeed);
      }

      // console.log('Front: ' + FPSForwardSpeed + ' - ' + 'Side: ' + FPSSideSpeed + ' - ' + 'Vert: ' + FPSVertSpeed);

      if (cameraType.FPS) {
        if (FPSForwardSpeed !== 0) {
          FPSxPos -= Math.sin(FPSYaw * DEG2RAD) * FPSForwardSpeed * FPSRun * FPSelapsed;
          FPSyPos -= Math.cos(FPSYaw * DEG2RAD) * FPSForwardSpeed * FPSRun * FPSelapsed;
          FPSzPos += Math.sin(FPSPitch * DEG2RAD) * FPSForwardSpeed * FPSRun * FPSelapsed;
        }
        if (FPSVertSpeed !== 0) {
          FPSzPos -= FPSVertSpeed * FPSRun * FPSelapsed;
        }
        if (FPSSideSpeed !== 0) {
          FPSxPos -= Math.cos(-FPSYaw * DEG2RAD) * FPSSideSpeed * FPSRun * FPSelapsed;
          FPSyPos -= Math.sin(-FPSYaw * DEG2RAD) * FPSSideSpeed * FPSRun * FPSelapsed;
        }
      }

      if (!isFPSForwardSpeedLock) FPSForwardSpeed *= Math.min(0.98 * FPSelapsed, 0.98);
      if (!isFPSSideSpeedLock) FPSSideSpeed *= Math.min(0.98 * FPSelapsed, 0.98);
      if (!isFPSVertSpeedLock) FPSVertSpeed *= Math.min(0.98 * FPSelapsed, 0.98);

      if (FPSForwardSpeed < 0.01 && FPSForwardSpeed > -0.01) FPSForwardSpeed = 0;
      if (FPSSideSpeed < 0.01 && FPSSideSpeed > -0.01) FPSSideSpeed = 0;
      if (FPSVertSpeed < 0.01 && FPSVertSpeed > -0.01) FPSVertSpeed = 0;

      FPSPitch += FPSPitchRate * FPSelapsed;
      FPSRotate += FPSRotateRate * FPSelapsed;
      FPSYaw += FPSYawRate * FPSelapsed;

      // console.log('Pitch: ' + FPSPitch + ' - ' + 'Rotate: ' + FPSRotate + ' - ' + 'Yaw: ' + FPSYaw);
    }
    FPSLastTime = FPStimeNow;
  }

  function _updateHover () {
    if (searchBox.isHovering()) {
      updateHoverSatId = searchBox.getHoverSat();
      satSet.getScreenCoords(updateHoverSatId, pMatrix, camMatrix);
      if (!_earthHitTest(satScreenPositionArray.x, satScreenPositionArray.y)) {
        _hoverBoxOnSat(updateHoverSatId, satScreenPositionArray.x, satScreenPositionArray.y);
      } else {
        _hoverBoxOnSat(-1, 0, 0);
      }
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

      if (mouseSat !== -1) {
        orbitDisplay.setHoverOrbit(mouseSat);
      } else {
        orbitDisplay.clearHoverOrbit();
      }
      satSet.setHover(mouseSat);
      _hoverBoxOnSat(mouseSat, mouseX, mouseY);
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

    if (!satellite.sensorSelected()) return;
    if (drawNow - satLabelModeLastTime < settingsManager.satLabelInterval) return;

    orbitDisplay.clearInViewOrbit();

    var sat;
    labelCount = 0;
    isHoverBoxVisible = true;

    hoverBoxOnSatMiniElements = document.getElementById('sat-minibox');
    hoverBoxOnSatMiniElements.innerHTML = '';
    for (var i = 0; i < (satSet.orbitalSats) && labelCount < settingsManager.maxLabels; i++) {
      sat = satSet.getSatPosOnly(i);

      if (sat.static) continue;
      if (sat.missile) continue;
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.green === false) continue;
      if (sat.OT === 2 && ColorScheme.objectTypeFlags.blue === false) continue;
      if (sat.OT === 3 && ColorScheme.objectTypeFlags.gray === false) continue;
      if (sat.inview && ColorScheme.objectTypeFlags.orange === false) continue;

      satSet.getScreenCoords(i, pMatrix, camMatrix, sat.position);
      if (satScreenPositionArray.error) continue;
      if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
      if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;

      // Draw Orbits
      orbitDisplay.addInViewOrbit(i);

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


  // TODO: Hover Box should have two sub DOMs whose text is replaced so that <br> is not made and removed
  // OPTIMIZE: Less DOM creation

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
      if (starManager.isConstellationVisible === true && !starManager.isAllConstellationVisible) starManager.clearConstellations();
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
        if (satellite.sensorSelected() && isShowNextPass && isShowDistance) {
          satHoverBoxNode1.textContent = (sat.ON);
          satHoverBoxNode2.textContent = (sat.SCC_NUM);
          satHoverBoxNode3.innerHTML = (satellite.nextpass(sat) + satellite.distance(sat, selectedSatData) + '');
        } else if (isShowDistance) {
          satHoverBoxNode1.textContent = (sat.ON);
          satHoverBoxNode2.innerHTML = (sat.SCC_NUM + satellite.distance(sat, selectedSatData) + '');
          satHoverBoxNode3.innerHTML = ('X: ' + sat.position.x.toFixed(2) + ' Y: ' + sat.position.y.toFixed(2) + ' Z: ' + sat.position.z.toFixed(2) + '</br>' +
                                          'X: ' + sat.velocityX.toFixed(2) + 'km/s Y: ' + sat.velocityY.toFixed(2) + 'km/s Z: ' + sat.velocityZ.toFixed(2)) + 'km/s';
        } else if (satellite.sensorSelected() && isShowNextPass) {
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
      satHoverBoxDOM.css({
        display: 'block',
        'text-align': 'center',
        position: 'absolute',
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
    if (!satellite.sensorSelected()) return;
    if (drawNow - demoModeLastTime < settingsManager.demoModeInterval) return;

    demoModeLastTime = drawNow;

    if (demoModeSatellite === satSet.getSatData().length) demoModeSatellite = 0;
    for (var i = demoModeSatellite; i < satSet.getSatData().length; i++) {
      var sat = satSet.getSat(i);
      if (sat.static) continue;
      if (sat.missile) continue;
      // if (!sat.inview) continue;
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.green === false) continue;
      if (sat.OT === 2 && ColorScheme.objectTypeFlags.blue === false) continue;
      if (sat.OT === 3 && ColorScheme.objectTypeFlags.gray === false) continue;
      if (sat.inview && ColorScheme.objectTypeFlags.orange === false) continue;
      satSet.getScreenCoords(i, pMatrix, camMatrix);
      if (satScreenPositionArray.error) continue;
      if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
      if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;
      _hoverBoxOnSat(i, satScreenPositionArray.x, satScreenPositionArray.y);
      orbitDisplay.setSelectOrbit(i);
      demoModeSatellite = i + 1;
      return;
    }
  }
})();

function webGlInit () {
  var can = $('#canvas')[0];

  can.width = window.innerWidth;
  can.height = window.innerHeight;

  var gl = can.getContext('webgl', {alpha: false}) || can.getContext('experimental-webgl', {alpha: false});
  if (!gl) {
    browserUnsupported();
  }

  gl.viewport(0, 0, can.width, can.height);

  gl.enable(gl.DEPTH_TEST);

  // gl.enable(0x8642);
  /* enable point sprites(?!) This might get browsers with
  underlying OpenGL to behave
  although it's not technically a part of the WebGL standard
  */

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
  mat4.perspective(pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, 20.0, 600000.0);
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
  return Math.pow(zoomLevel, ZOOM_EXP) * (DIST_MAX - DIST_MIN) + DIST_MIN;
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
  // TODO: Find a formula using the date variable for this.
  // TODO: This formula is still a pain
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
function updateUrl () { // URL Updater
  var arr = window.location.href.split('?');
  var url = arr[0];
  var paramSlices = [];

  if (selectedSat !== -1 && satSet.getSatExtraOnly(selectedSat).intlDes !== 'none') {
    paramSlices.push('intldes=' + satSet.getSatExtraOnly(selectedSat).intlDes);
  }

  var currentSearch = searchBox.getCurrentSearch();
  if (currentSearch != null) {
    paramSlices.push('search=' + currentSearch);
  }
  if (timeManager.propRate < 0.99 || timeManager.propRate > 1.01) {
    paramSlices.push('rate=' + timeManager.propRate);
  }

  if (timeManager.propOffset < -1000 || timeManager.propOffset > 1000) {
    paramSlices.push('hrs=' + (timeManager.propOffset / 1000.0 / 3600.0).toString());
  }

  if (paramSlices.length > 0) {
    url += '?' + paramSlices.join('&');
  }

  window.history.replaceState(null, 'Keeptrack', url);
}

var isSelectedSatNegativeOne = false;
function selectSat (satId) {
  if (satId !== -1 && satSet.getSat(satId).type == 'Star') { return; } // TODO: Optimize
  satSet.selectSat(satId);
  var sat;
  camSnapMode = false;

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
    orbitDisplay.clearSelectOrbit();
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
    isSelectedSatNegativeOne = false;
    selectedSat = satId;
    sat = satSet.getSatExtraOnly(satId);
    if (!sat) return;
    if (sat.type == 'Star') { return; }
    if (sat.static) {
      adviceList.sensor();
      sat = satSet.getSat(satId);
      sensorManager.setSensor(null, sat.staticNum); // Pass staticNum to identify which sensor the user clicked
      sensorManager.curSensorPositon = [sat.position.x, sat.position.y, sat.position.z];
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

    orbitDisplay.setSelectOrbit(satId);

    if (satellite.sensorSelected()) {
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
          uiController.legendMenuChange('default');
        }
      }
    } else {
      if (window.innerWidth <= 1000) {
      } else {
        $('#search-results').attr('style', 'max-height:27%');
        if (cameraType.current !== cameraType.PLANETARIUM) {
          uiController.legendMenuChange('default');
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
      objectManager.extractLiftVehicle(sat.LV); // Replace with link if available FIXME this should be a separate file
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

      now = new Date(timeManager.propRealTime + timeManager.propOffset);
      var sunTime = SunCalc.getTimes(now, satellite.currentSensor.lat, satellite.currentSensor.long);
      var satInSun = satellite.isInSun(sat);
      // If No Sensor, then Ignore Sun Exclusion
      if (!satellite.sensorSelected()) {
        if (satInSun == 0) $('#sat-sun').html('No Sunlight');
        if (satInSun == 1) $('#sat-sun').html('Limited Sunlight');
        if (satInSun == 2) $('#sat-sun').html('Direct Sunlight');
      // If Radar Selected, then Say the Sun Doesn't Matter
      } else if ((satellite.currentSensor.type !== 'Optical') && (satellite.currentSensor.type !== 'Observer')) {
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

    if (satellite.sensorSelected()) {
      satellite.getlookangles(sat, isLookanglesMenuOpen);
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
    uiController.updateMap();

    // NOTE: ISS Stream Slows Down a Lot Of Computers

    // if (sat.SCC_NUM === '25544') { // ISS is Selected
    //   $('#iss-stream-menu').show();
    //   $('#iss-stream').html('<iframe src="http://www.ustream.tv/embed/17074538?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><iframe src="http://www.ustream.tv/embed/9408562?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><br />' +
    //                         '<iframe src="http://www.ustream.tv/embed/6540154?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><iframe src="http://cdn.livestream.com/embed/spaceflightnow?layout=4&amp;height=340&amp;width=560&amp;autoplay=false" style="border:0;outline:0" frameborder="0" scrolling="no"></iframe>');
    // } else {
    //   $('#iss-stream').html('');
    //   $('#iss-stream-menu').hide();
    // }
  }

  // settingsManager.themes.retheme();
  // TODO: Make this a setting that is disabled by default
  updateUrl();
}

function enableSlowCPUMode () {
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
    var sat = satSet.getSat(value);
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
    var sat = satSet.getSat(value[0]);
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
    var sat = satSet.getSat(value[0]);
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
function drawLines () {
  if (drawLineList.length == 0) return;
  for (drawLinesI = 0; drawLinesI < drawLineList.length; drawLinesI++) {
    if (typeof drawLineList[drawLinesI].sat != 'undefined') {
      // At least One Satellite
      drawLineList[drawLinesI].sat = satSet.getSat(drawLineList[drawLinesI].sat.id);
      if (typeof drawLineList[drawLinesI].sat2 != 'undefined') {
        // Satellite and Static
        if (typeof drawLineList[drawLinesI].sat2.name != 'undefined'){
          drawLineList[drawLinesI].sat2 = satSet.getSat(satSet.getIdFromSensorName(drawLineList[drawLinesI].sat2.name));
          drawLineList[drawLinesI].line.set([drawLineList[drawLinesI].sat.position.x,drawLineList[drawLinesI].sat.position.y,drawLineList[drawLinesI].sat.position.z], [drawLineList[drawLinesI].sat2.position.x,drawLineList[drawLinesI].sat2.position.y,drawLineList[drawLinesI].sat2.position.z]);
        } else {
          // Two Satellites
          drawLineList[drawLinesI].sat2 = satSet.getSat(drawLineList[drawLinesI].sat2.id);
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
      tempStar1 = satSet.getSat(drawLineList[drawLinesI].star1ID).position;
      tempStar2 = satSet.getSat(drawLineList[drawLinesI].star2ID).position;
      drawLineList[drawLinesI].line.set([tempStar1.x, tempStar1.y, tempStar1.z], [tempStar2.x, tempStar2.y,tempStar2.z]);
    } else {
      // Arbitrary Lines
      drawLineList[drawLinesI].line.set(drawLineList[drawLinesI].ref, drawLineList[drawLinesI].ref2);
    }

    drawLineList[drawLinesI].line.draw(drawLineList[drawLinesI].color);
  }
}
// var lastRadarTrackTime = 0;
// var curRadarTrackNum = 0;
// function drawLines () {
//   var satData = satSet.getSatData();
//   var propTime = timeManager.propTime();
//   if (satData && satellite.sensorSelected()) {
//     if (propTime - lastRadarTrackTime > 54) {
//       lastRadarTrackTime = 0;
//       curRadarTrackNum++;
//     }
//     if (curRadarTrackNum < satData.length) {
//       if (satData[curRadarTrackNum]) {
//         if (satData[curRadarTrackNum].inview) {
//           var debugLine = new Line();
//           var sat = satData[curRadarTrackNum];
//           var satposition = [sat.position.x, sat.position.y, sat.position.z];
//           debugLine.set(satposition, sensorManager.curSensorPositon);
//           debugLine.draw();
//           if (lastRadarTrackTime === 0) { lastRadarTrackTime = propTime; }
//         } else { curRadarTrackNum++; }
//       } else { curRadarTrackNum++; }
//     } else { curRadarTrackNum = 0; }
//   }
// }
