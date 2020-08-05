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

ATMOSPHERE_MAX = 108;
ATMOSPHERE_MOD = RADIUS_OF_EARTH + 300;
ATMOSPHERE_DIST = 4000;
ATMOSPHERE_DIST_MOD = 5000;
ATMOSPHERE_DIST_MIN = 200;

// Earth
(function () {
  var earth = {};
  var NUM_LAT_SEGS = 64;
  var NUM_LON_SEGS = 64;
  var createClockDOMOnce = false;

  var isPropRateVisible = false;

  var vertPosBuf, vertNormBuf, texCoordBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
  var vertCount;
  var earthNow;
  var mvMatrix;
  var mvMatrixEmpty = mat4.create();
  var nMatrix;
  var nMatrixEmpty = mat3.create();
  earth.earthJ = 0;
  earth.earthEra = 0;
  earth.timeTextStr = '';
  earth.timeTextStrEmpty = '';
  earth.lightDirection = [];
  earth.propRateDOM = $('#propRate-status-box');
  var earthShader;

  earth.pos = [0, 0, 0];

  var texture, nightTexture;

  var texLoaded = false;
  var nightLoaded = false;
  var loaded = false;
  earth.loaded = false;

  function onImageLoaded () {
    console.log(texLoaded);
    console.log(nightLoaded);
    if (texLoaded && nightLoaded) {
      loaded = true;
      earth.loaded = true;      
    }
  }

  earth.init = function () {
    // var startTime = new Date().getTime();

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    var fragCode = shaderLoader.getShaderCode('earth-fragment.glsl');
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    var vertCode = shaderLoader.getShaderCode('earth-vertex.glsl');
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    earthShader = gl.createProgram();
    gl.attachShader(earthShader, vertShader);
    gl.attachShader(earthShader, fragShader);
    gl.linkProgram(earthShader);

    earthShader.aVertexPosition = gl.getAttribLocation(earthShader, 'aVertexPosition');
    earthShader.aTexCoord = gl.getAttribLocation(earthShader, 'aTexCoord');
    earthShader.aVertexNormal = gl.getAttribLocation(earthShader, 'aVertexNormal');
    earthShader.uPMatrix = gl.getUniformLocation(earthShader, 'uPMatrix');
    earthShader.uCamMatrix = gl.getUniformLocation(earthShader, 'uCamMatrix');
    earthShader.uMvMatrix = gl.getUniformLocation(earthShader, 'uMvMatrix');
    earthShader.uNormalMatrix = gl.getUniformLocation(earthShader, 'uNormalMatrix');
    earthShader.uLightDirection = gl.getUniformLocation(earthShader, 'uLightDirection');
    earthShader.uAmbientLightColor = gl.getUniformLocation(earthShader, 'uAmbientLightColor');
    earthShader.uDirectionalLightColor = gl.getUniformLocation(earthShader, 'uDirectionalLightColor');
    earthShader.uSampler = gl.getUniformLocation(earthShader, 'uSampler');
    earthShader.uNightSampler = gl.getUniformLocation(earthShader, 'uNightSampler');

    texture = gl.createTexture();
    var img = new Image();
    var imgHiRes = new Image();
    img.onload = function () {
      $('#loader-text').text('Painting the Earth...');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // console.log('earth.js loaded texture');
      texLoaded = true;
      onImageLoaded();
    };
    if (settingsManager.nasaImages) img.src = settingsManager.installDirectory + 'images/dayearth-4096.jpg';
    if (settingsManager.trusatImages) img.src = settingsManager.installDirectory + 'images/trusatvector-4096.jpg';
    if (settingsManager.blueImages) img.src = settingsManager.installDirectory + 'images/world_blue-2048.png';
    if (settingsManager.lowresImages) img.src = settingsManager.installDirectory + 'images/no_clouds_4096.jpg';
    if (settingsManager.vectorImages) img.src = settingsManager.installDirectory + 'images/dayearthvector-4096.jpg';
    if (settingsManager.hiresImages || settingsManager.hiresNoCloudsImages) {
      if (settingsManager.hiresImages) imgHiRes.src = settingsManager.installDirectory + 'images/2_earth_16k.jpg';
      if (settingsManager.hiresNoCloudsImages) imgHiRes.src = settingsManager.installDirectory + 'images/no_clouds_8k.jpg';
      imgHiRes.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgHiRes);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        texLoaded = true;
        onImageLoaded();
      };
    } else {
      imgHiRes = null;
    }

    nightTexture = gl.createTexture();
    var nightImg = new Image();
    var nightImgHiRes = new Image();
    nightImg.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, nightTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nightImg);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // console.log('earth.js loaded nightearth');
      nightLoaded = true;
      onImageLoaded();
    };
    if (settingsManager.nasaImages) nightImg.src = settingsManager.installDirectory + 'images/nightearth-4096.png';
    if (settingsManager.trusatImages) nightImg.src = settingsManager.installDirectory + 'images/nightearth-4096.png';
    if (settingsManager.lowresImages) nightImg.src = settingsManager.installDirectory + 'images/nightearth-4096.png';
    if (settingsManager.blueImages) nightImg.src = settingsManager.installDirectory + 'images/nightearth-4096.png';
    if (settingsManager.vectorImages) nightImg.src = settingsManager.installDirectory + 'images/dayearthvector-4096.jpg';

    if (settingsManager.hiresImages || settingsManager.hiresNoCloudsImages) {
      nightImgHiRes.src = settingsManager.installDirectory + 'images/6_night_16k.jpg';
      nightImgHiRes.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, nightTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nightImgHiRes);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        nightLoaded = true;
        onImageLoaded();
      };
    } else {
      nightImgHiRes = null;
    }

    // generate a uvsphere bottom up, CCW order
    var vertPos = [];
    var vertNorm = [];
    var texCoord = [];
    for (let lat = 0; lat <= NUM_LAT_SEGS; lat++) {
      var latAngle = (Math.PI / NUM_LAT_SEGS) * lat - (Math.PI / 2);
      var diskRadius = Math.cos(Math.abs(latAngle));
      var z = Math.sin(latAngle);
      // console.log('LAT: ' + latAngle * RAD2DEG + ' , Z: ' + z);
      // var i = 0;
      for (let lon = 0; lon <= NUM_LON_SEGS; lon++) { // add an extra vertex for texture funness
        var lonAngle = (Math.PI * 2 / NUM_LON_SEGS) * lon;
        var x = Math.cos(lonAngle) * diskRadius;
        var y = Math.sin(lonAngle) * diskRadius;
        // console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)

        // mercator cylindrical projection (simple angle interpolation)
        var v = 1 - (lat / NUM_LAT_SEGS);
        var u = 0.5 + (lon / NUM_LON_SEGS); // may need to change to move map
        // console.log('u: ' + u + ' v: ' + v);
        // normals: should just be a vector from center to point (aka the point itself!

        vertPos.push(x * RADIUS_OF_EARTH);
        vertPos.push(y * RADIUS_OF_EARTH);
        vertPos.push(z * RADIUS_OF_EARTH);
        texCoord.push(u);
        texCoord.push(v);
        vertNorm.push(x);
        vertNorm.push(y);
        vertNorm.push(z);

        // i++;
      }
    }

    // ok let's calculate vertex draw orders.... indiv triangles
    var vertIndex = [];
    for (let lat = 0; lat < NUM_LAT_SEGS; lat++) { // this is for each QUAD, not each vertex, so <
      for (let lon = 0; lon < NUM_LON_SEGS; lon++) {
        var blVert = lat * (NUM_LON_SEGS + 1) + lon; // there's NUM_LON_SEGS + 1 verts in each horizontal band
        var brVert = blVert + 1;
        var tlVert = (lat + 1) * (NUM_LON_SEGS + 1) + lon;
        var trVert = tlVert + 1;
        // console.log('bl: ' + blVert + ' br: ' + brVert +  ' tl: ' + tlVert + ' tr: ' + trVert);
        vertIndex.push(blVert);
        vertIndex.push(brVert);
        vertIndex.push(tlVert);

        vertIndex.push(tlVert);
        vertIndex.push(trVert);
        vertIndex.push(brVert);
      }
    }
    vertCount = vertIndex.length;

    vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    vertNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

    texCoordBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

    vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);

    // var end = new Date().getTime() - startTime;
    // console.log('earth init: ' + end + ' ms');
  };

  earth.draw = function (pMatrix, camMatrix) {
    if (!loaded) return;

    // var now = new Date();
    earth.lastTime = earthNow;
    earthNow = timeManager.propTime();

    // wall time is not propagation time, so better print it
    // TODO substring causes 12kb memory leak every frame.
    if (earth.lastTime - earthNow < 300) {
      earth.tDS = earthNow.toJSON();
      earth.timeTextStr = earth.timeTextStrEmpty;
      for (earth.iText = 0; earth.iText < 20; earth.iText++) {
        if (earth.iText < 10) earth.timeTextStr += earth.tDS[earth.iText];
        if (earth.iText === 10) earth.timeTextStr += ' ';
        if (earth.iText > 11) earth.timeTextStr += earth.tDS[earth.iText-1];
      }
      if (settingsManager.isPropRateChange && !settingsManager.isAlwaysHidePropRate) {
        if (timeManager.propRate > 1.01 || timeManager.propRate < 0.99) {
          if (timeManager.propRate < 10) earth.propRateDOM.html('Propagation Speed: ' + timeManager.propRate.toFixed(1) + 'x');
          if (timeManager.propRate >= 10) earth.propRateDOM.html('Propagation Speed: ' + timeManager.propRate.toFixed(2) + 'x');
          earth.propRateDOM.show();
          isPropRateVisible = true;
        } else {
          if (isPropRateVisible) {
            earth.propRateDOM.hide();
            isPropRateVisible = false;
          }
        }
        settingsManager.isPropRateChange = false;
      }

      if (!createClockDOMOnce) {
        document.getElementById('datetime-text').innerText = `${earth.timeTextStr} UTC`;
        // document.getElementById('datetime-text-local').innerText = `${timeManager.dateToISOLikeButLocal(earthNow)}`;
        createClockDOMOnce = true;
      } else {
        document.getElementById('datetime-text').childNodes[0].nodeValue = `${earth.timeTextStr} UTC`;
        // document.getElementById('datetime-text-local').childNodes[0].nodeValue = `${timeManager.dateToISOLikeButLocal(earthNow)}`;
      }
    }

    // Don't update the time input unless it is currently being viewed.
    if (settingsManager.isEditTime || !settingsManager.cruncherReady) {
      $('#datetime-input-tb').val(earth.timeTextStr);
    }

    earth.earthJ = timeManager.jday(earthNow.getUTCFullYear(),
                 earthNow.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 earthNow.getUTCDate(),
                 earthNow.getUTCHours(),
                 earthNow.getUTCMinutes(),
                 earthNow.getUTCSeconds());
    earth.earthJ += earthNow.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

    earth.earthEra = satellite.gstime(earth.earthJ);

    // Sets earth.lightDirection [x, y , z]
    if (!isDayNightToggle) {
      sun.currentDirection();
      vec3.normalize(earth.lightDirection, earth.lightDirection);
    }

    mvMatrix = mvMatrixEmpty;
    mat4.identity(mvMatrix);
    mat4.rotateZ(mvMatrix, mvMatrix, earth.earthEra);
    mat4.translate(mvMatrix, mvMatrix, earth.pos);
    // mat4.scale(mvMatrix, mvMatrix, [2,2,2]);
    nMatrix = nMatrixEmpty;
    mat3.normalFromMat4(nMatrix, mvMatrix);

    gl.useProgram(earthShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.uniformMatrix3fv(earthShader.uNormalMatrix, false, nMatrix);
    gl.uniformMatrix4fv(earthShader.uMvMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(earthShader.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(earthShader.uCamMatrix, false, camMatrix);
    if (!isDayNightToggle) {
      gl.uniform3fv(earthShader.uLightDirection, earth.lightDirection);
    }
    gl.uniform3fv(earthShader.uAmbientLightColor, [0.03, 0.03, 0.03]); // RGB ambient light
    // No reason to reduce blue light since this is a real image of earth
    gl.uniform3fv(earthShader.uDirectionalLightColor, [1, 1, 1]); // RGB directional light


    gl.uniform1i(earthShader.uSampler, 0); // point sampler to TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture to TEXTURE0

    if (!isDayNightToggle) {
      gl.uniform1i(earthShader.uNightSampler, 1);  // point sampler to TEXTURE1
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, nightTexture); // bind tex to TEXTURE1
    } else {
      gl.uniform1i(earthShader.uNightSampler, 1);  // point sampler to TEXTURE1
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texture); // bind tex to TEXTURE1
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(earthShader.aTexCoord);
    gl.vertexAttribPointer(earthShader.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.enableVertexAttribArray(earthShader.aVertexPosition);
    gl.vertexAttribPointer(earthShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.enableVertexAttribArray(earthShader.aVertexNormal);
    gl.vertexAttribPointer(earthShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    gl.useProgram(gl.pickShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, mvMatrix); // set up picking
    gl.disableVertexAttribArray(gl.pickShaderProgram.aColor);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPos);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    // Done Drawing
    return true;
  };

  window.earth = earth;
})();

// Atmosphere
(function () {
  var atmosphere = {};
  var NUM_LAT_SEGS = 64;
  var NUM_LON_SEGS = 64;

  var vertPosBuf, vertNormBuf, texCoordBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
  var vertCount;
  var mvMatrix;
  var mvMatrixEmpty = mat4.create();
  var nMatrix;
  var nMatrixEmpty = mat3.create();
  var atmosphereShader;

  atmosphere.lightDirection = [];

  atmosphere.pos = [100, 0, 0];

  var texture, nightTexture;

  var texLoaded = false;
  var nightLoaded = false;
  var loaded = false;

  function onImageLoaded () {
    if (texLoaded && nightLoaded) {
      loaded = true;
      $('#loader-text').text('Drawing Dots in Space...');
    }
  }

  atmosphere.init = function () {
    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    var fragCode = shaderLoader.getShaderCode('atmosphere-fragment.glsl');
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    var vertCode = shaderLoader.getShaderCode('atmosphere-vertex.glsl');
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    atmosphereShader = gl.createProgram();
    gl.attachShader(atmosphereShader, vertShader);
    gl.attachShader(atmosphereShader, fragShader);
    gl.linkProgram(atmosphereShader);

    atmosphereShader.aVertexPosition = gl.getAttribLocation(atmosphereShader, 'aVertexPosition');
    atmosphereShader.aTexCoord = gl.getAttribLocation(atmosphereShader, 'aTexCoord');
    atmosphereShader.aVertexNormal = gl.getAttribLocation(atmosphereShader, 'aVertexNormal');
    atmosphereShader.uPMatrix = gl.getUniformLocation(atmosphereShader, 'uPMatrix');
    atmosphereShader.uCamMatrix = gl.getUniformLocation(atmosphereShader, 'uCamMatrix');
    atmosphereShader.uMvMatrix = gl.getUniformLocation(atmosphereShader, 'uMvMatrix');
    atmosphereShader.uNormalMatrix = gl.getUniformLocation(atmosphereShader, 'uNormalMatrix');
    atmosphereShader.uLightDirection = gl.getUniformLocation(atmosphereShader, 'uLightDirection');
    atmosphereShader.uAmbientLightColor = gl.getUniformLocation(atmosphereShader, 'uAmbientLightColor');
    atmosphereShader.uDirectionalLightColor = gl.getUniformLocation(atmosphereShader, 'uDirectionalLightColor');
    atmosphereShader.uSampler = gl.getUniformLocation(atmosphereShader, 'uSampler');
    atmosphereShader.uNightSampler = gl.getUniformLocation(atmosphereShader, 'uNightSampler');

    texture = gl.createTexture();
    var img = new Image();
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      texLoaded = true;
      onImageLoaded();
    };
    img.src = settingsManager.installDirectory + 'images/atmosphere-day.png';

    nightTexture = gl.createTexture();
    var nightImg = new Image();
    var nightImgHiRes = new Image();
    nightImg.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, nightTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nightImg);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // console.log('earth.js loaded nightearth');
      nightLoaded = true;
      onImageLoaded();
    };
      nightImg.src = settingsManager.installDirectory + 'images/atmosphere-night.png';

    // generate a uvsphere bottom up, CCW order
    var vertPos = [];
    var vertNorm = [];
    var texCoord = [];
    for (let lat = 0; lat <= NUM_LAT_SEGS; lat++) {
      var latAngle = (Math.PI / NUM_LAT_SEGS) * lat - (Math.PI / 2);
      var diskRadius = Math.cos(Math.abs(latAngle));
      var z = Math.sin(latAngle);
      // console.log('LAT: ' + latAngle * RAD2DEG + ' , Z: ' + z);
      // var i = 0;
      for (let lon = 0; lon <= NUM_LON_SEGS; lon++) { // add an extra vertex for texture funness
        var lonAngle = (Math.PI * 2 / NUM_LON_SEGS) * lon;
        var x = Math.cos(lonAngle) * diskRadius;
        var y = Math.sin(lonAngle) * diskRadius;
        // console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)

        // mercator cylindrical projection (simple angle interpolation)
        var v = 1 - (lat / NUM_LAT_SEGS);
        var u = 0.5 + (lon / NUM_LON_SEGS); // may need to change to move map
        // console.log('u: ' + u + ' v: ' + v);
        // normals: should just be a vector from center to point (aka the point itself!

        vertPos.push(x * (1));
        vertPos.push(y * ATMOSPHERE_MOD);
        vertPos.push(z * ATMOSPHERE_MOD);
        texCoord.push(u);
        texCoord.push(v);
        vertNorm.push(x);
        vertNorm.push(y);
        vertNorm.push(z);

        // i++;
      }
    }

    // ok let's calculate vertex draw orders.... indiv triangles
    var vertIndex = [];
    for (let lat = 0; lat < NUM_LAT_SEGS; lat++) { // this is for each QUAD, not each vertex, so <
      for (let lon = 0; lon < NUM_LON_SEGS; lon++) {
        var blVert = lat * (NUM_LON_SEGS + 1) + lon; // there's NUM_LON_SEGS + 1 verts in each horizontal band
        var brVert = blVert + 1;
        var tlVert = (lat + 1) * (NUM_LON_SEGS + 1) + lon;
        var trVert = tlVert + 1;
        // console.log('bl: ' + blVert + ' br: ' + brVert +  ' tl: ' + tlVert + ' tr: ' + trVert);
        vertIndex.push(blVert);
        vertIndex.push(brVert);
        vertIndex.push(tlVert);

        vertIndex.push(tlVert);
        vertIndex.push(trVert);
        vertIndex.push(brVert);
      }
    }
    vertCount = vertIndex.length;

    vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    vertNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

    texCoordBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

    vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);

    // var end = new Date().getTime() - startTime;
    // console.log('atmosphere init: ' + end + ' ms');
  };

  atmosphere.resize = function () {
    atmosphere.pos[0] = Math.min(zoomTarget**3 * (ATMOSPHERE_DIST) + ATMOSPHERE_DIST_MOD,ATMOSPHERE_DIST_MIN);
    ATMOSPHERE_MOD = RADIUS_OF_EARTH + (ATMOSPHERE_MAX / (zoomLevel**2))

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    var fragCode = shaderLoader.getShaderCode('atmosphere-fragment.glsl');
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    var vertCode = shaderLoader.getShaderCode('atmosphere-vertex.glsl');
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    atmosphereShader = gl.createProgram();
    gl.attachShader(atmosphereShader, vertShader);
    gl.attachShader(atmosphereShader, fragShader);
    gl.linkProgram(atmosphereShader);

    atmosphereShader.aVertexPosition = gl.getAttribLocation(atmosphereShader, 'aVertexPosition');
    atmosphereShader.aTexCoord = gl.getAttribLocation(atmosphereShader, 'aTexCoord');
    atmosphereShader.aVertexNormal = gl.getAttribLocation(atmosphereShader, 'aVertexNormal');
    atmosphereShader.uPMatrix = gl.getUniformLocation(atmosphereShader, 'uPMatrix');
    atmosphereShader.uCamMatrix = gl.getUniformLocation(atmosphereShader, 'uCamMatrix');
    atmosphereShader.uMvMatrix = gl.getUniformLocation(atmosphereShader, 'uMvMatrix');
    atmosphereShader.uNormalMatrix = gl.getUniformLocation(atmosphereShader, 'uNormalMatrix');
    atmosphereShader.uLightDirection = gl.getUniformLocation(atmosphereShader, 'uLightDirection');
    atmosphereShader.uAmbientLightColor = gl.getUniformLocation(atmosphereShader, 'uAmbientLightColor');
    atmosphereShader.uDirectionalLightColor = gl.getUniformLocation(atmosphereShader, 'uDirectionalLightColor');
    atmosphereShader.uSampler = gl.getUniformLocation(atmosphereShader, 'uSampler');
    atmosphereShader.uNightSampler = gl.getUniformLocation(atmosphereShader, 'uNightSampler');

    // generate a uvsphere bottom up, CCW order
    var vertPos = [];
    var vertNorm = [];
    var texCoord = [];

    for (let lat = 0; lat <= NUM_LAT_SEGS; lat++) {
      var latAngle = (Math.PI / NUM_LAT_SEGS) * lat - (Math.PI / 2);
      var diskRadius = Math.cos(Math.abs(latAngle));
      var z = Math.sin(latAngle);
      // console.log('LAT: ' + latAngle * RAD2DEG + ' , Z: ' + z);
      // var i = 0;
      for (let lon = 0; lon <= NUM_LON_SEGS; lon++) { // add an extra vertex for texture funness
        var lonAngle = (Math.PI * 2 / NUM_LON_SEGS) * lon;
        var x = Math.cos(lonAngle) * diskRadius;
        var y = Math.sin(lonAngle) * diskRadius;
        // console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)

        // mercator cylindrical projection (simple angle interpolation)
        var v = 1 - (lat / NUM_LAT_SEGS);
        var u = 0.5 + (lon / NUM_LON_SEGS); // may need to change to move map
        // console.log('u: ' + u + ' v: ' + v);
        // normals: should just be a vector from center to point (aka the point itself!

        vertPos.push(x * (1));
        vertPos.push(y * ATMOSPHERE_MOD);
        vertPos.push(z * ATMOSPHERE_MOD);
        texCoord.push(u);
        texCoord.push(v);
        vertNorm.push(x);
        vertNorm.push(y);
        vertNorm.push(z);

        // i++;
      }
    }

    // ok let's calculate vertex draw orders.... indiv triangles
    var vertIndex = [];
    for (let lat = 0; lat < NUM_LAT_SEGS; lat++) { // this is for each QUAD, not each vertex, so <
      for (let lon = 0; lon < NUM_LON_SEGS; lon++) {
        var blVert = lat * (NUM_LON_SEGS + 1) + lon; // there's NUM_LON_SEGS + 1 verts in each horizontal band
        var brVert = blVert + 1;
        var tlVert = (lat + 1) * (NUM_LON_SEGS + 1) + lon;
        var trVert = tlVert + 1;
        // console.log('bl: ' + blVert + ' br: ' + brVert +  ' tl: ' + tlVert + ' tr: ' + trVert);
        vertIndex.push(blVert);
        vertIndex.push(brVert);
        vertIndex.push(tlVert);

        vertIndex.push(tlVert);
        vertIndex.push(trVert);
        vertIndex.push(brVert);
      }
    }
    vertCount = vertIndex.length;

    vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    vertNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

    texCoordBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

    vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);
  };

  atmosphere.draw = function (pMatrix, camMatrix) {
    if (!texLoaded || !earth.loaded) return;
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // gl.cullFace(gl.BACK)
    // vec3.normalize(earth.lightDirection, atmosphere.lightDirection);
    // vec3.inverse(atmosphere.lightDirection, atmosphere.lightDirection);

    mvMatrix = mvMatrixEmpty;
    mat4.identity(mvMatrix);
    // console.log(pMatrix);
    mat4.rotateZ(mvMatrix, mvMatrix, (camYaw + (DEG2RAD * 90)));
    mat4.rotateY(mvMatrix, mvMatrix, camPitch);
    mat4.translate(mvMatrix, mvMatrix, atmosphere.pos);
    nMatrix = nMatrixEmpty;
    mat3.normalFromMat4(nMatrix, mvMatrix);

    gl.useProgram(atmosphereShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.uniformMatrix3fv(atmosphereShader.uNormalMatrix, false, nMatrix);
    gl.uniformMatrix4fv(atmosphereShader.uMvMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(atmosphereShader.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(atmosphereShader.uCamMatrix, false, camMatrix);
    // gl.uniform3fv(atmosphereShader.uLightDirection, earth.lightDirection);
    gl.uniform3fv(atmosphereShader.uAmbientLightColor, [0.5, 0.5, 0.5]); // RGB ambient light
    // No reason to reduce blue light since this is a real image of atmosphere
    // gl.uniform3fv(atmosphereShader.uDirectionalLightColor, [1, 1, 1]); // RGB directional light


    gl.uniform1i(atmosphereShader.uSampler, 0); // point sampler to TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture to TEXTURE0

    gl.uniform1i(atmosphereShader.uNightSampler, 1);  // point sampler to TEXTURE1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, nightTexture); // bind tex to TEXTURE1

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(atmosphereShader.aTexCoord);
    gl.vertexAttribPointer(atmosphereShader.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.enableVertexAttribArray(atmosphereShader.aVertexPosition);
    gl.vertexAttribPointer(atmosphereShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.enableVertexAttribArray(atmosphereShader.aVertexNormal);
    gl.vertexAttribPointer(atmosphereShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    gl.useProgram(gl.pickShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, mvMatrix); // set up picking
    gl.disableVertexAttribArray(gl.pickShaderProgram.aColor);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPos);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    // Done Drawing
    return true;
  };

  window.atmosphere = atmosphere;
})();
