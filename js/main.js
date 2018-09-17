/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2018, Theodore Kruczek
(c) 2015-2017, James Yoder

main.js is the primary javascript file for keeptrack.space. It manages all user
interaction with the application.
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
    tleManager
    MassRaidPre
    saveAs
    Blob
    FileReader
    UsaICBM
    RussianICBM
    NorthKoreanBM
    ChinaICBM
    Missile
    missilesInUse
    lastMissileError
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
var MINUTES_PER_DAY = 1440;
var PLANETARIUM_DIST = 3;

// Frequently Used Manager Variables
var timeManager = window.timeManager;
var satCruncher = window.satCruncher;
var limitSats = settingsManager.limitSats;
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
var camPitchSpeed = 0;
var camYawSpeed = 0;
var camRotateSpeed = 0;

// Menu Variables
var isEditSatMenuOpen = false;
var isLookanglesMenuOpen = false;
var isLookanglesMultiSiteMenuOpen = false;
var isNewLaunchMenuOpen = false;
var isMissileMenuOpen = false;
var isPlanetariumView = false;
var isCustomSensorMenuOpen = false;

var pickFb, pickTex;
var pMatrix = mat4.create();
var camMatrix = mat4.create();
var selectedSat = -1;
var lastSelectedSat = -1;

// getEarthScreenPoint;
// var rayOrigin;
// var curRadarTrackNum = 0;
// var lastRadarTrackTime = 0;
// var debugLine;

var updateHoverDelay = 0;

var pickColorBuf;
var cameraType = {};
cameraType.current = 0;
cameraType.DEFAULT = 0;
cameraType.OFFSET = 1;
cameraType.FPS = 2;
cameraType.PLANETARIUM = 3;
cameraType.SATELLITE = 4;

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
var FPSRun = 1;
var FPSLastTime = 1;

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

    (function initParseFromGETVariables () {
      // This is an initial parse of the GET variables
      // A satSet focused one happens later.
      var queryStr = window.location.search.substring(1);
      var params = queryStr.split('&');
      for (var i = 0; i < params.length; i++) {
        var key = params[i].split('=')[0];
        var val = params[i].split('=')[1];
        switch (key) {
          case 'hires':
            settingsManager.hiresImages = true;
            break;
          case 'vec':
            settingsManager.vectorImages = true;
            break;
          case 'retro':
            settingsManager.retro = true;
            settingsManager.tleSource = 'tle/retro.json';
            break;
          case 'offline':
            settingsManager.offline = true;
            break;
          case 'mw':
            settingsManager.tleSource = 'tle/mw.json';
            break;
          case 'logo':
            $('#demo-logo').removeClass('start-hidden');
            break;
          case 'noPropRate':
            settingsManager.isAlwaysHidePropRate = true;
            break;
          }
        }
      })();
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
    time = drawNow;
    timeManager.now = drawNow;

    if ((isDragging && !settingsManager.isMobileModeEnabled) ||
         isDragging && settingsManager.isMobileModeEnabled && (mouseX !== 0 || mouseY !== 0)) {
      dragTarget = getEarthScreenPoint(mouseX, mouseY);
      if (isNaN(dragTarget[0]) || isNaN(dragTarget[1]) || isNaN(dragTarget[2]) ||
      isNaN(dragPoint[0]) || isNaN(dragPoint[1]) || isNaN(dragPoint[2]) ||
      cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE ||
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

    if (cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE) {
      FPSPitch -= 20 * camPitchSpeed * dt;
      FPSYaw -= 20 * camYawSpeed * dt;
      FPSRotate -= 20 * camRotateSpeed * dt;
    } else {
      camPitch += camPitchSpeed * dt;
      camYaw += camYawSpeed * dt;
      FPSRotate += camRotateSpeed * dt;
    }

    if (rotateTheEarth) { camYaw -= rotateTheEarthSpeed * dt; }

    if (camSnapMode) {
      camPitch += (camPitchTarget - camPitch) * 0.003 * dt;

      var yawErr = _normalizeAngle(camYawTarget - camYaw);
      camYaw += yawErr * 0.003 * dt;

      /*   if(Math.abs(camPitchTarget - camPitch) < 0.002 && Math.abs(camYawTarget - camYaw) < 0.002 && Math.abs(zoomTarget - zoomLevel) < 0.002) {
      camSnapMode = false; Stay in camSnapMode forever. Is this a good idea? dunno....
    } */
      zoomLevel = zoomLevel + (zoomTarget - zoomLevel) * dt * 0.0025;
    } else {
      zoomLevel = zoomLevel + (zoomTarget - zoomLevel) * dt * 0.0075;
      if (zoomLevel >= zoomTarget - settingsManager.cameraMovementSpeed && zoomLevel <= zoomTarget + settingsManager.cameraMovementSpeed) {
        zoomLevel = zoomTarget;
      }
    }

    if (camPitch > TAU / 4) camPitch = TAU / 4;
    if (camPitch < -TAU / 4) camPitch = -TAU / 4;
    camYaw = _normalizeAngle(camYaw);
    if (selectedSat !== -1) {
      var sat = satSet.getSat(selectedSat);
      if (!sat.static) {
        _camSnapToSat(selectedSat);
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
    _demoMode(settingsManager.isDemoModeOn);
    _satLabelMode(settingsManager.isSatLabelModeOn);

    // drawLines();
    // var bubble = new FOVBubble();
    // bubble.set();
    // bubble.draw();
  }

  function _camSnapToSat (satId) {
    /* this function runs every frame that a satellite is selected.
    However, the user might have broken out of the zoom snap or angle snap.
    If so, don't change those targets. */

    var sat = satSet.getSat(satId);

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
        orbitDisplay.setSelectOrbit(satId);
      }
      if (altitude) {
        camDistTarget = altitude + RADIUS_OF_EARTH + settingsManager.camDistBuffer;
      } else {
        camDistTarget = RADIUS_OF_EARTH + settingsManager.camDistBuffer;  // Stay out of the center of the earth. You will get stuck there.
        console.warn('Zoom Calculation Error: ' + altitude + ' -- ' + camDistTarget);
        camZoomSnappedOnSat = false;
        camAngleSnappedOnSat = false;
      }
      zoomTarget = Math.pow((camDistTarget - DIST_MIN) / (DIST_MAX - DIST_MIN), 1 / ZOOM_EXP);
    }

    if (cameraType.current=== cameraType.PLANETARIUM) {
      zoomTarget = 0.01;
    }
  }
  function _drawScene () {
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (cameraType.current=== cameraType.FPS || cameraType.current=== cameraType.SATELLITE) {
      _FPSMovement();
    }
    camMatrix = _drawCamera();

    gl.useProgram(gl.pickShaderProgram);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(gl.pickShaderProgram.camMatrix, false, camMatrix);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // if (debugLine) debugLine.draw();
    earth.draw(pMatrix, camMatrix);
    satSet.draw(pMatrix, camMatrix, drawNow);
    orbitDisplay.draw(pMatrix, camMatrix);

    /* DEBUG - show the pickbuffer on a canvas */
    // debugImageData.data = pickColorMap;
    /* debugImageData.data.set(pickColorMap);
    debugContext.putImageData(debugImageData, 0, 0); */
    var pitchRotate;
    var yawRotate;
    function _drawCamera () {
      camMatrix = mat4.create();
      mat4.identity(camMatrix);
      var pos = {};

      /**
      * For FPS style movement rotate the camera and then translate it
      * for traditional view, move the camera and then rotate it
      */
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
          pos = _calculateSensorPos(pos);

          // Pitch is the opposite of the angle to the latitude
          // Yaw is 90 degrees to the left of the angle to the longitude
          pitchRotate = ((-1 * satellite.currentSensor.lat) * DEG2RAD);
          yawRotate = ((90 - satellite.currentSensor.long) * DEG2RAD) - pos.gmst;
          mat4.rotate(camMatrix, camMatrix, pitchRotate, [1, 0, 0]);
          mat4.rotate(camMatrix, camMatrix, yawRotate, [0, 0, 1]);

          mat4.translate(camMatrix, camMatrix, [-pos.x, -pos.y, -pos.z]);

          _showOrbitsAbove();

          break;
        case cameraType.SATELLITE:
          // yawRotate = ((-90 - satellite.currentSensor.long) * DEG2RAD);
          if (selectedSat !== -1) lastSelectedSat = selectedSat;
          var sat = satSet.getSat(lastSelectedSat);
          // mat4.rotate(camMatrix, camMatrix, sat.inclination * DEG2RAD, [0, 1, 0]);
          mat4.rotate(camMatrix, camMatrix, -FPSPitch * DEG2RAD, [1, 0, 0]);
          mat4.rotate(camMatrix, camMatrix, FPSYaw * DEG2RAD, [0, 0, 1]);
          mat4.rotate(camMatrix, camMatrix, FPSRotate * DEG2RAD, [0, 1, 0]);

          orbitDisplay.updateOrbitBuffer(lastSelectedSat);
          pos = sat.position;
          mat4.translate(camMatrix, camMatrix, [-pos.x, -pos.y, -pos.z]);
          break;
      }
      return camMatrix;
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
    }
    function _FPSMovement () {
      FPStimeNow = Date.now();
      if (FPSLastTime !== 0) {
        FPSelapsed = FPStimeNow - FPSLastTime;
        if (cameraType.FPS) {
          if (FPSForwardSpeed !== 0) {
            FPSxPos -= Math.sin(FPSYaw * DEG2RAD) * FPSForwardSpeed * FPSRun * FPSelapsed;
            FPSyPos -= Math.cos(FPSYaw * DEG2RAD) * FPSForwardSpeed * FPSRun * FPSelapsed;
            FPSzPos += Math.sin(FPSPitch * DEG2RAD) * FPSForwardSpeed * FPSRun * FPSelapsed;
          }
          if (FPSSideSpeed !== 0) {
            FPSxPos -= Math.cos(-FPSYaw * DEG2RAD) * FPSSideSpeed * FPSRun * FPSelapsed;
            FPSyPos -= Math.sin(-FPSYaw * DEG2RAD) * FPSSideSpeed * FPSRun * FPSelapsed;
          }
        }
        FPSPitch += FPSPitchRate * FPSelapsed;
        FPSRotate += FPSRotateRate * FPSelapsed;
        FPSYaw += FPSYawRate * FPSelapsed;
      }
      FPSLastTime = FPStimeNow;
    }
  }

  function _updateHover () {
    if (searchBox.isHovering()) {
      updateHoverSatId = searchBox.getHoverSat();
      updateHoverSatPos = satSet.getScreenCoords(updateHoverSatId, pMatrix, camMatrix);
      if (!_earthHitTest(updateHoverSatPos.x, updateHoverSatPos.y)) {
        _hoverBoxOnSat(updateHoverSatId, updateHoverSatPos.x, updateHoverSatPos.y);
      } else {
        _hoverBoxOnSat(-1, 0, 0);
      }
    } else {
      if (!isMouseMoving || isDragging) { return; }
      updateHoverDelay++;
      if (updateHoverDelay === 8) updateHoverDelay = 0;
      if (updateHoverDelay > 0) return;
      mouseSat = getSatIdFromCoord(mouseX, mouseY);
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
  function _hoverBoxOnSatMini (satId, satX, satY) {
    var satHoverMini = document.createElement("div");
    document.body.appendChild(satHoverMini);
    satHoverMini.setAttribute('id', 'sat-minibox-' + satId);
    var satHoverMiniDOM = $('#sat-minibox-' + satId);
    $('#sat-minibox').append(satHoverMiniDOM);
    if (satId === -1) {
      if (!isHoverBoxVisible || settingsManager.isDisableSatHoverBox) return;
      satHoverMiniDOM.html('(none)');
      satHoverMiniDOM.css({display: 'none'});
      canvasDOM.css({cursor: 'default'});
      isHoverBoxVisible = false;
    } else if (!isDragging && !settingsManager.isDisableSatHoverBox) {
      try {
        var sat = satSet.getSat(satId);
        var selectedSatData = satSet.getSat(selectedSat);
        isHoverBoxVisible = true;
        if (!sat.static && !sat.missile) {
          satHoverMiniDOM.html('<center>' + sat.SCC_NUM + '</center>');
        }
        satHoverMiniDOM.css({
          display: 'block',
          position: 'absolute',
          left: satX + 10,
          top: satY
        });
      } catch (e) {}
    }
  }

  function _showOrbitsAbove () {
    // Display Orbits of Satellites In View
      orbitDisplay.clearInViewOrbit();
      var orbitCount = 0;
      for (var i = 0; i < satSet.getSatData().length; i++) {
        if (orbitCount > settingsManager.maxOrbits) return;
        var sat = satSet.getSat(i);
        // if (sat.inview && ColorScheme.objectTypeFlags.orange === true) {
          if (sat.static) continue;
          if (sat.missile) continue;
          if (sat.OT === 1 && ColorScheme.objectTypeFlags.green === false) continue;
          if (sat.OT === 2 && ColorScheme.objectTypeFlags.blue === false) continue;
          if (sat.OT === 3 && ColorScheme.objectTypeFlags.gray === false) continue;
          if (sat.inview && ColorScheme.objectTypeFlags.orange === false) continue;
          var satPos = satSet.getScreenCoords(i, pMatrix, camMatrix);
          if (typeof satPos.x == 'undefined' || typeof satPos.y == 'undefined') continue;
          if (satPos.x > window.innerWidth || satPos.y > window.innerHeight) continue;
          orbitDisplay.addInViewOrbit(i);
          orbitCount++;
        // }
      }
  }

  function _hoverBoxOnSat (satId, satX, satY) {
    if (cameraType.current === cameraType.PLANETARIUM && !settingsManager.isDemoModeOn) {
      if (satId === -1) {
        satHoverBoxDOM.html('(none)');
        satHoverBoxDOM.css({display: 'none'});
        canvasDOM.css({cursor: 'default'});
      } else {
        satHoverBoxDOM.html('(none)');
        satHoverBoxDOM.css({display: 'none'});
        canvasDOM.css({cursor: 'pointer'});
      }
      return;
    }
    if (satId === -1) {
      if (!isHoverBoxVisible || settingsManager.isDisableSatHoverBox) return;
      satHoverBoxDOM.html('(none)');
      satHoverBoxDOM.css({display: 'none'});
      canvasDOM.css({cursor: 'default'});
      isHoverBoxVisible = false;
    } else if (!isDragging && !settingsManager.isDisableSatHoverBox) {
      try {
        var sat = satSet.getSat(satId);
        var selectedSatData = satSet.getSat(selectedSat);
        isHoverBoxVisible = true;
        if (sat.static) {
          if (sat.type === 'Launch Facility') {
            var launchSite = tleManager.extractLaunchSite(sat.name);
            satHoverBoxDOM.html(launchSite.site + ', ' + launchSite.sitec + '<br /><center>' + sat.type + satellite.distance(sat, selectedSatData) + '</center>');
          } else {
            satHoverBoxDOM.html(sat.name + '<br /><center>' + sat.type + satellite.distance(sat, selectedSatData) + '</center>');
          }
        } else if (sat.missile) {
          satHoverBoxDOM.html(sat.ON + '<br /><center>' + sat.desc + '</center>');
        } else {
          if (satellite.sensorSelected() && isShowNextPass && isShowDistance) {
            satHoverBoxDOM.html(sat.ON + '<br /><center>' + sat.SCC_NUM + '<br />' + satellite.nextpass(sat) + satellite.distance(sat, selectedSatData) + '</center>');
          } else if (isShowDistance) {
            satHoverBoxDOM.html(sat.ON + '<br /><center>' + sat.SCC_NUM + satellite.distance(sat, selectedSatData) + '</center>');
          } else if (satellite.sensorSelected() && isShowNextPass) {
            satHoverBoxDOM.html(sat.ON + '<br /><center>' + sat.SCC_NUM + '<br />' + satellite.nextpass(sat) + '</center>');
          } else {
            satHoverBoxDOM.html(sat.ON + '<br /><center>' + sat.SCC_NUM + '</center>');
          }
        }
        satHoverBoxDOM.css({
          display: 'block',
          position: 'absolute',
          left: satX + 20,
          top: satY - 10
        });
        canvasDOM.css({cursor: 'pointer'});
      } catch (e) {}
    }
  }
  function _onDrawLoopComplete (cb) {
    if (typeof cb == 'undefined') return;
    cb();
  }

  var satLabelModeLastTime = 0;
  function _satLabelMode (isSatLabelModeOn) {
    if (!isSatLabelModeOn || cameraType.current !== cameraType.PLANETARIUM) {
      $('#sat-minibox').html('');
      return;
    }
    if (!satellite.sensorSelected()) return;
    if (drawNow - satLabelModeLastTime < settingsManager.satLabelInterval) return;

    satLabelModeLastTime = drawNow;
    $('#sat-minibox').html('');

    var labelCount = 0;
    for (var i = 0; i < satSet.getSatData().length; i++) {
      if (labelCount > settingsManager.maxLabels) return;
      var sat = satSet.getSat(i);
      if (sat.static) continue;
      if (sat.missile) continue;
      // if (!sat.inview) continue;
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.green === false) continue;
      if (sat.OT === 2 && ColorScheme.objectTypeFlags.blue === false) continue;
      if (sat.OT === 3 && ColorScheme.objectTypeFlags.gray === false) continue;
      if (sat.inview && ColorScheme.objectTypeFlags.orange === false) continue;
      updateHoverSatPos = satSet.getScreenCoords(i, pMatrix, camMatrix);
      if (typeof updateHoverSatPos.x == 'undefined' || typeof updateHoverSatPos.y == 'undefined') continue;
      if (updateHoverSatPos.x > window.innerWidth || updateHoverSatPos.y > window.innerHeight) continue;
      _hoverBoxOnSatMini(i, updateHoverSatPos.x, updateHoverSatPos.y);
      labelCount++;
    }
  }

  var demoModeSatellite = 0;
  var demoModeLastTime = 0;
  function _demoMode (isDemoModeOn) {
    if (!isDemoModeOn) return;
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
      updateHoverSatPos = satSet.getScreenCoords(i, pMatrix, camMatrix);
      if (typeof updateHoverSatPos.x == 'undefined' || typeof updateHoverSatPos.y == 'undefined') continue;
      if (updateHoverSatPos.x > window.innerWidth || updateHoverSatPos.y > window.innerHeight) continue;
      _hoverBoxOnSat(i, updateHoverSatPos.x, updateHoverSatPos.y);
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

  if (selectedSat !== -1 && satSet.getSat(selectedSat).intlDes !== 'none') {
    paramSlices.push('intldes=' + satSet.getSat(selectedSat).intlDes);
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
function selectSat (satId) {
  satSet.selectSat(satId);
  selectedSat = satId;
  var sat;
  if (satId === -1) {
    $('#sat-infobox').fadeOut();
    $('#iss-stream').html('');
    $('#iss-stream-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    orbitDisplay.clearSelectOrbit();
    // Remove Red Box
    $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
    $('#menu-lookangles').removeClass('bmenu-item-selected');
    $('#menu-editSat').removeClass('bmenu-item-selected');
    $('#menu-map').removeClass('bmenu-item-selected');
    $('#menu-newLaunch').removeClass('bmenu-item-selected');
    // Add Grey Out
    $('#menu-lookanglesmultisite').addClass('bmenu-item-disabled');
    $('#menu-lookangles').addClass('bmenu-item-disabled');
    $('#menu-editSat').addClass('bmenu-item-disabled');
    $('#menu-map').addClass('bmenu-item-disabled');
    $('#menu-newLaunch').addClass('bmenu-item-disabled');
    // Remove Side Menus
    $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    // Toggle the side menus as closed
    isEditSatMenuOpen = false;
    isLookanglesMenuOpen = false;
    settingsManager.isMapMenuOpen = false;
    isLookanglesMultiSiteMenuOpen = false;
    isNewLaunchMenuOpen = false;
    isMissileMenuOpen = false;
    isCustomSensorMenuOpen = false;
  } else {
    sat = satSet.getSat(satId);
    if (!sat) return;
    if (sat.static) {
      sensorManager.setSensor(null, sat.staticNum); // Pass staticNum to identify which sensor the user clicked
      sensorManager.curSensorPositon = [sat.position.x, sat.position.y, sat.position.z];
      selectedSat = -1;
      $('#menu-sensor-info').removeClass('bmenu-item-disabled');
      $('#menu-planetarium').removeClass('bmenu-item-disabled');
      if (selectedSat !== -1) {
        $('#menu-lookangles').removeClass('bmenu-item-disabled');
      }
      $('#menu-in-coverage').removeClass('bmenu-item-disabled');
      return;
    }
    camZoomSnappedOnSat = true;
    camAngleSnappedOnSat = true;

    orbitDisplay.setSelectOrbit(satId);

    if (satellite.sensorSelected()) {
      $('#menu-lookangles').removeClass('bmenu-item-disabled');
    }

    $('#menu-lookanglesmultisite').removeClass('bmenu-item-disabled');
    $('#menu-editSat').removeClass('bmenu-item-disabled');
    $('#menu-map').removeClass('bmenu-item-disabled');
    $('#menu-newLaunch').removeClass('bmenu-item-disabled');

    if ($('#search-results').css('display') === 'block') {
      if ($(document).width() <= 1000) {
      } else {
        $('#search-results').attr('style', 'display:block; max-height:27%');
        uiController.legendMenuChange('default');
      }
    } else {
      if ($(document).width() <= 1000) {
      } else {
        $('#search-results').attr('style', 'max-height:27%');
        uiController.legendMenuChange('default');
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
    if (sat.missile) { objtype = 'Ballistic Missile'; }
    $('#sat-type').html(objtype);

    // /////////////////////////////////////////////////////////////////////////
    // Country Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    var country;
    country = tleManager.extractCountry(sat.C);
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
      site = tleManager.extractLaunchSite(sat.LS);
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
      tleManager.extractLiftVehicle(sat.LV); // Replace with link if available FIXME this should be a separate file
    }

    // /////////////////////////////////////////////////////////////////////////
    // RCS Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    if (sat.R === null) {
      $('#sat-rcs').html('Unknown');
    } else {
      var rcs;
      if (sat.R < 0.1) { rcs = 'Small'; }
      if (sat.R >= 0.1) { rcs = 'Medium'; }
      if (sat.R > 1) { rcs = 'Large'; }
      $('#sat-rcs').html(rcs);
      $('#sat-rcs').tooltip({delay: 50, tooltip: sat.R, position: 'left'});
    }

    if (!sat.missile) {
      $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
      $('#sat-apogee').html(sat.apogee.toFixed(0) + ' km');
      $('#sat-perigee').html(sat.perigee.toFixed(0) + ' km');
      $('#sat-inclination').html((sat.inclination * RAD2DEG).toFixed(2) + '°');
      $('#sat-eccentricity').html((sat.eccentricity).toFixed(3));

      $('#sat-period').html(sat.period.toFixed(2) + ' min');
      $('#sat-period').tooltip({delay: 50, tooltip: 'Mean Motion: ' + MINUTES_PER_DAY / sat.period.toFixed(2), position: 'left'});

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
      $('#sat-elset-age').tooltip({delay: 50, tooltip: 'Epoch Year: ' + sat.TLE1.substr(18, 2).toString() + ' Day: ' + sat.TLE1.substr(20, 8).toString(), position: 'left'});

      now = new Date(timeManager.propRealTime + timeManager.propOffset);
      var sunTime = SunCalc.getTimes(now, satellite.currentSensor.lat, satellite.currentSensor.long);
      if (!satellite.sensorSelected()) {
        $('#sat-sun').html('Unknown');
      } else if (satellite.currentSensor.type !== 'Optical') {
        $('#sat-sun').html('Unaffected by Sun');
      } else if (sunTime.dawn.getTime() - now > 0 || sunTime.dusk.getTime() - now < 0) {
        $('#sat-sun').html('No Impact from Sun');
      } else {
        $('#sat-sun').html('Sun Exclusion');
      }
    }

    if (satellite.sensorSelected()) {
      satellite.getlookangles(sat, isLookanglesMenuOpen);
    }
  }

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

  settingsManager.themes.retheme();
  updateUrl();
}

function enableSlowCPUMode () {
  if (!settingsManager.cruncherReady) return;
  settingsManager.isSlowCPUModeEnabled = true;
  settingsManager.minimumSearchCharacters = 3;
  
  satCruncher.postMessage({
    isSlowCPUModeEnabled: true
  });
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
