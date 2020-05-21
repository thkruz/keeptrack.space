/* global
  gl
  mat4
  Worker
  shaderLoader

  satSet
  timeManager
  groups
*/
(function () {
  var NUM_SEGS = 255;

  var glBuffers = [];
  var inProgress = [];

  var orbitDisplay = {};

  var pathShader;

  var selectOrbitBuf;
  var hoverOrbitBuf;

  var selectColor = settingsManager.orbitSelectColor;
  var hoverColor = settingsManager.orbitHoverColor;
  var inViewColor = settingsManager.orbitInViewColor;
  var groupColor = settingsManager.orbitGroupColor;

  var currentHoverId = -1;
  var currentSelectId = -1;
  var currentInView = [];

  var orbitMvMat = mat4.create();

  var orbitWorker = new Worker('js/orbit-calculation-worker.js');

  var initialized = false;

  orbitDisplay.init = function () {
    // var startTime = performance.now();

    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, shaderLoader.getShaderCode('path-vertex.glsl'));
    gl.compileShader(vs);

    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, shaderLoader.getShaderCode('path-fragment.glsl'));
    gl.compileShader(fs);

    pathShader = gl.createProgram();
    gl.attachShader(pathShader, vs);
    gl.attachShader(pathShader, fs);
    gl.linkProgram(pathShader);

    pathShader.aPos = gl.getAttribLocation(pathShader, 'aPos');
    pathShader.uMvMatrix = gl.getUniformLocation(pathShader, 'uMvMatrix');
    pathShader.uCamMatrix = gl.getUniformLocation(pathShader, 'uCamMatrix');
    pathShader.uPMatrix = gl.getUniformLocation(pathShader, 'uPMatrix');
    pathShader.uColor = gl.getUniformLocation(pathShader, 'uColor');

    selectOrbitBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, selectOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.STATIC_DRAW);

    hoverOrbitBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, hoverOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.STATIC_DRAW);

    for (var i = 0; i < satSet.missileSats; i++) {
      glBuffers.push(allocateBuffer());
    }
    orbitWorker.postMessage({
      isInit: true,
      satData: satSet.satDataString,
      numSegs: NUM_SEGS
    });
    initialized = true;

    // Discard now that we are loaded
    satSet.satDataString = null;
    objectManager.fieldOfViewSet = null;

    // var time = performance.now() - startTime;
    // console.log('orbitDisplay init: ' + time + ' ms');
  };

  orbitDisplay.updateOrbitBuffer = function (satId, force, TLE1, TLE2, missile, latList, lonList, altList) {
    if (!inProgress[satId] && !satSet.getSat(satId).static) {
      if (force) {
        orbitWorker.postMessage({
          isInit: false,
          isUpdate: true,
          satId: satId,
          realTime: timeManager.propRealTime,
          offset: timeManager.propOffset,
          rate: timeManager.propRate,
          TLE1: TLE1,
          TLE2: TLE2
        });
      } else if (missile) {
        orbitWorker.postMessage({
          isInit: false,
          isUpdate: true,
          missile: true,
          satId: satId,
          latList: latList,
          lonList: lonList,
          altList: altList
        });
      } else {
        orbitWorker.postMessage({
          isInit: false,
          satId: satId,
          realTime: timeManager.propRealTime,
          offset: timeManager.propOffset,
          rate: timeManager.propRate
        });
        inProgress[satId] = true;
      }
    } else {
    }
  };

  orbitWorker.onmessage = function (m) {
    var satId = m.data.satId;
    var pointsOut = new Float32Array(m.data.pointsOut);
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[satId]);
    gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);
    inProgress[satId] = false;
  };

  /* orbitDisplay.setOrbit = function (satId) {
    var sat = satSet.getSat(satId);
    mat4.identity(orbitMvMat);
    //apply steps in reverse order because matrix multiplication
    // (last multiplied in is first applied to vertex)

    //step 5. rotate to RAAN
    mat4.rotateZ(orbitMvMat, orbitMvMat, sat.raan + Math.PI/2);
    //step 4. incline the plane
    mat4.rotateY(orbitMvMat, orbitMvMat, -sat.inclination);
    //step 3. rotate to argument of periapsis
    mat4.rotateZ(orbitMvMat, orbitMvMat, sat.argPe - Math.PI/2);
    //step 2. put earth at the focus
    mat4.translate(orbitMvMat, orbitMvMat, [sat.semiMajorAxis - sat.apogee - RADIUS_OF_EARTH, 0, 0]);
    //step 1. stretch to ellipse
    mat4.scale(orbitMvMat, orbitMvMat, [sat.semiMajorAxis, sat.semiMinorAxis, 0]);

  };

  orbitDisplay.clearOrbit = function () {
    mat4.identity(orbitMvMat);
  } */

  orbitDisplay.setSelectOrbit = function (satId) {
   // var start = performance.now();
    currentSelectId = satId;
    orbitDisplay.updateOrbitBuffer(satId);
   // console.log('setOrbit(): ' + (performance.now() - start) + ' ms');
  };

  orbitDisplay.clearSelectOrbit = function () {
    currentSelectId = -1;
    gl.bindBuffer(gl.ARRAY_BUFFER, selectOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.DYNAMIC_DRAW);
  };

  orbitDisplay.addInViewOrbit = function (satId) {
    for (var i = 0; i < currentInView.length; i++) {
      if (satId === currentInView[i]) return;
    }
    currentInView.push(satId);
    orbitDisplay.updateOrbitBuffer(satId);
  };

  orbitDisplay.removeInViewOrbit = function (satId) {
    var r = null;
    for (var i = 0; i < currentInView.length; i++) {
      if (satId === currentInView[i]) {
        r = i;
      }
    }
    if (r === null) return;
    currentInView.splice(r, 1);
    orbitDisplay.updateOrbitBuffer(satId);
  };

  orbitDisplay.clearInViewOrbit = function (satId) {
    if (currentInView === []) return;
    currentInView = [];
  };

  orbitDisplay.setHoverOrbit = function (satId) {
    if (satId === currentHoverId) return;
    currentHoverId = satId;
    orbitDisplay.updateOrbitBuffer(satId);
  };

  orbitDisplay.clearHoverOrbit = function (satId) {
    if (currentHoverId === -1) return;
    currentHoverId = -1;

    gl.bindBuffer(gl.ARRAY_BUFFER, hoverOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.DYNAMIC_DRAW);
  };

  orbitDisplay.draw = function (pMatrix, camMatrix) { // lol what do I do here
    if (!initialized) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(pathShader);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
   // gl.depthMask(false);

    gl.uniformMatrix4fv(pathShader.uMvMatrix, false, orbitMvMat);
    gl.uniformMatrix4fv(pathShader.uCamMatrix, false, camMatrix);
    gl.uniformMatrix4fv(pathShader.uPMatrix, false, pMatrix);

    if (currentSelectId !== -1 && !satSet.getSatExtraOnly(currentSelectId).static) {
      gl.uniform4fv(pathShader.uColor, selectColor);
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[currentSelectId]);
      gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
    }

    if (currentHoverId !== -1 && currentHoverId !== currentSelectId && !satSet.getSatExtraOnly(currentHoverId).static) { // avoid z-fighting
      gl.uniform4fv(pathShader.uColor, hoverColor);
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[currentHoverId]);
      gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
    }

    if (currentInView.length >= 1) { // There might be some z-fighting
      gl.uniform4fv(pathShader.uColor, inViewColor);
      currentInView.forEach(function (id) {
        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[id]);
        gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
      });
    }

    if (groups.selectedGroup !== null) {
      gl.uniform4fv(pathShader.uColor, groupColor);
      groups.selectedGroup.forEach(function (id) {
        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[id]);
        gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
      });
    }

    //  gl.depthMask(true);
    gl.disable(gl.BLEND);

    // Done drawing
    return true;
  };

  function allocateBuffer () {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.STATIC_DRAW);
    return buf;
  }

  orbitDisplay.getPathShader = function () {
    return pathShader;
  };

  window.orbitDisplay = orbitDisplay;
})();
