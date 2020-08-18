/* global

  timeManager

  DEG2RAD
  MILLISECONDS_PER_DAY

*/

var RADIUS_OF_DRAW_SUN = 2200;
var SUN_SCALAR_DISTANCE = 250000;

var RADIUS_OF_DRAW_MOON = 4000;
var MOON_SCALAR_DISTANCE = 250000;

(function () {
  var sun = {};
  sun.sunvar = {};

  sun.currentDirection = function () {
    sun.sunvar.now = timeManager.propTime();
    sun.sunvar.j = timeManager.jday(sun.sunvar.now.getUTCFullYear(),
                 sun.sunvar.now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 sun.sunvar.now.getUTCDate(),
                 sun.sunvar.now.getUTCHours(),
                 sun.sunvar.now.getUTCMinutes(),
                 sun.sunvar.now.getUTCSeconds());
    sun.sunvar.j += sun.sunvar.now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

    return sun.getDirection(sun.sunvar.j);
  };
  sun.getDirection = function (jd) {
    sun.sunvar.n = jd - 2451545;
    sun.sunvar.L = (280.460) + (0.9856474 * sun.sunvar.n); // mean longitude of sun
    sun.sunvar.g = (357.528) + (0.9856003 * sun.sunvar.n); // mean anomaly
    sun.sunvar.L = sun.sunvar.L % 360.0;
    sun.sunvar.g = sun.sunvar.g % 360.0;

    sun.sunvar.ecLon = sun.sunvar.L + 1.915 * Math.sin(sun.sunvar.g * DEG2RAD) + 0.020 * Math.sin(2 * sun.sunvar.g * DEG2RAD);
    sun.sunvar.ob = _getObliquity(jd);

    earth.lightDirection[0] = Math.cos(sun.sunvar.ecLon * DEG2RAD);
    earth.lightDirection[1] = Math.cos(sun.sunvar.ob * DEG2RAD) * Math.sin(sun.sunvar.ecLon * DEG2RAD);
    earth.lightDirection[2] = Math.sin(sun.sunvar.ob * DEG2RAD) * Math.sin(sun.sunvar.ecLon * DEG2RAD);

    // return [sun.sunvar.x, sun.sunvar.y, sun.sunvar.z];
  };

  sun.getXYZ = function () {
    var now = timeManager.propTime();
    j = timeManager.jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds());
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);
    var jdo = new A.JulianDay(j); // now

    //var observerGd = sensorManager.currentSensor.observerGd;
    //var coord = A.EclCoord.fromWgs84(observerGd.latitude * RAD2DEG, observerGd.longitude * RAD2DEG, observerGd.height);

    var coord = A.EclCoord.fromWgs84(0,0,0);

    // AZ / EL Calculation
    var tp = A.Solar.topocentricPosition(jdo, coord, false);
    azimuth = tp.hz.az * RAD2DEG + 180 % 360;
    elevation = tp.hz.alt * RAD2DEG % 360;

    // Range Calculation
    var T = (new A.JulianDay(A.JulianDay.dateToJD(timeManager.propTime()))).jdJ2000Century();
	  sun.sunvar.g = A.Solar.meanAnomaly(T)*180/Math.PI;
    sun.sunvar.g = sun.sunvar.g % 360.0;
    sun.sunvar.R = 1.00014 - (0.01671 * Math.cos(sun.sunvar.g)) - (0.00014 * Math.cos(2 * sun.sunvar.g));
    range = sun.sunvar.R * 149597870700 / 1000; // au to km conversion

    // RAE to ECI
    sun.eci = satellite.ecfToEci(lookAnglesToEcf(azimuth, elevation, range, 0,0,0), gmst);

    return {'x': sun.eci.x, 'y': sun.eci.y, 'z': sun.eci.z};
  };

  function _getObliquity (jd) {
    sun.sunvar.t = (jd - 2451545) / 3652500;

    sun.sunvar.obliq = 84381.448 - 4680.93 * sun.sunvar.t - 1.55 * Math.pow(sun.sunvar.t, 2) + 1999.25 *
    Math.pow(sun.sunvar.t, 3) - 51.38 * Math.pow(sun.sunvar.t, 4) - 249.67 * Math.pow(sun.sunvar.t, 5) -
    39.05 * Math.pow(sun.sunvar.t, 6) + 7.12 * Math.pow(sun.sunvar.t, 7) + 27.87 * Math.pow(sun.sunvar.t, 8) +
    5.79 * Math.pow(sun.sunvar.t, 9) + 2.45 * Math.pow(sun.sunvar.t, 10);

    /* Human Readable Version
    var ob =  // arcseconds
      84381.448
     - 4680.93  * t
     -    1.55  * Math.pow(t, 2)
     + 1999.25  * Math.pow(t, 3)
     -   51.38  * Math.pow(t, 4)
     -  249.67  * Math.pow(t, 5)
     -   39.05  * Math.pow(t, 6)
     +    7.12  * Math.pow(t, 7)
     +   27.87  * Math.pow(t, 8)
     +    5.79  * Math.pow(t, 9)
     +    2.45  * Math.pow(t, 10);
     */

    return sun.sunvar.obliq / 3600.0;
  }

  // Draw Sun
  let NUM_LAT_SEGS = 64;
  let NUM_LON_SEGS = 64;

  let vertPosBuf, vertNormBuf, texCoordBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
  let vertCount;
  let mvMatrix;
  let mvMatrixEmpty = mat4.create();
  let nMatrix;
  let nMatrixEmpty = mat3.create();
  let sunShader;

  sun.pos = [0,0,0];

  var texture, nightTexture;

  var texLoaded = false;
  var nightLoaded = false;
  var loaded = false;
  sun.loaded = false;

  function onImageLoaded () {
    if (texLoaded) {
      loaded = true;
      sun.loaded = true;
    }
  }

  sun.init = function () {
    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    let fragCode = shaderLoader.getShaderCode('sun-fragment.glsl');
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    let vertShader = gl.createShader(gl.VERTEX_SHADER);
    let vertCode = shaderLoader.getShaderCode('sun-vertex.glsl');
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    sunShader = gl.createProgram();
    gl.attachShader(sunShader, vertShader);
    gl.attachShader(sunShader, fragShader);
    gl.linkProgram(sunShader);

    sunShader.aVertexPosition = gl.getAttribLocation(sunShader, 'aVertexPosition');
    sunShader.aTexCoord = gl.getAttribLocation(sunShader, 'aTexCoord');
    sunShader.aVertexNormal = gl.getAttribLocation(sunShader, 'aVertexNormal');
    sunShader.uPMatrix = gl.getUniformLocation(sunShader, 'uPMatrix');
    sunShader.uCamMatrix = gl.getUniformLocation(sunShader, 'uCamMatrix');
    sunShader.uMvMatrix = gl.getUniformLocation(sunShader, 'uMvMatrix');
    sunShader.uNormalMatrix = gl.getUniformLocation(sunShader, 'uNormalMatrix');
    sunShader.uAmbientLightColor = gl.getUniformLocation(sunShader, 'uAmbientLightColor');
    sunShader.uSampler = gl.getUniformLocation(sunShader, 'uSampler');

    texture = gl.createTexture();
    var img = new Image();
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // console.log('sun.js loaded texture');
      texLoaded = true;
      onImageLoaded();
    };
    img.src = settingsManager.installDirectory + 'images/sun-1024.jpg';

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

        vertPos.push(x * RADIUS_OF_DRAW_SUN);
        vertPos.push(y * RADIUS_OF_DRAW_SUN);
        vertPos.push(z * RADIUS_OF_DRAW_SUN);
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
    // console.log('sun init: ' + end + ' ms');
  };

  sun.draw = function (pMatrix, camMatrix) {
    if (!loaded) return;

    let sunXYZ = sun.getXYZ();
    let sunMaxDist = Math.max(Math.max(Math.abs(sunXYZ.x),Math.abs(sunXYZ.y)),Math.abs(sunXYZ.z));
    sun.pos[0] = sunXYZ.x / sunMaxDist * SUN_SCALAR_DISTANCE;
    sun.pos[1] = sunXYZ.y / sunMaxDist * SUN_SCALAR_DISTANCE;
    sun.pos[2] = sunXYZ.z / sunMaxDist * SUN_SCALAR_DISTANCE;

    mvMatrix = mvMatrixEmpty;
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, mvMatrix, sun.pos);
    nMatrix = nMatrixEmpty;
    mat3.normalFromMat4(nMatrix, mvMatrix);

    gl.useProgram(sunShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.uniformMatrix3fv(sunShader.uNormalMatrix, false, nMatrix);
    gl.uniformMatrix4fv(sunShader.uMvMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(sunShader.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(sunShader.uCamMatrix, false, camMatrix);
    gl.uniform3fv(sunShader.uAmbientLightColor, [1, 1, 1]); // RGB ambient light

    gl.uniform1i(sunShader.uSampler, 0); // point sampler to TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture to TEXTURE0

    // Todo: Write new sun shader code
    gl.uniform1i(sunShader.uNightSampler, 1);  // point sampler to TEXTURE1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture); // bind tex to TEXTURE1

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(sunShader.aTexCoord);
    gl.vertexAttribPointer(sunShader.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.enableVertexAttribArray(sunShader.aVertexPosition);
    gl.vertexAttribPointer(sunShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.enableVertexAttribArray(sunShader.aVertexNormal);
    gl.vertexAttribPointer(sunShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    gl.useProgram(gl.pickShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);

    gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, mvMatrix); // set up picking
    gl.disableVertexAttribArray(gl.pickShaderProgram.aColor);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPos);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    // Done Drawing
    return true;
  };

  window.sun = sun;
})();

function lookAnglesToEcf(azimuthDeg, elevationDeg, slantRange, obs_lat, obs_long, obs_alt) {

    // site ecef in meters
    var geodeticCoords = {};
    geodeticCoords.latitude = obs_lat;
    geodeticCoords.longitude = obs_long;
    geodeticCoords.height = obs_alt;

    var siteXYZ = satellite.geodeticToEcf(geodeticCoords);
    var sitex, sitey, sitez;
    sitex = siteXYZ.x;
    sitey = siteXYZ.y;
    sitez = siteXYZ.z;

    // some needed calculations
    var slat = Math.sin(obs_lat);
    var slon = Math.sin(obs_long);
    var clat = Math.cos(obs_lat);
    var clon = Math.cos(obs_long);

    var azRad = DEG2RAD * azimuthDeg;
    var elRad = DEG2RAD * elevationDeg;

    // az,el,range to sez convertion
    var south  = -slantRange * Math.cos(elRad) * Math.cos(azRad);
    var east   =  slantRange * Math.cos(elRad) * Math.sin(azRad);
    var zenith =  slantRange * Math.sin(elRad);

    var x = ( slat * clon * south) + (-slon * east) + (clat * clon * zenith) + sitex;
    var y = ( slat * slon * south) + ( clon * east) + (clat * slon * zenith) + sitey;
    var z = (-clat *        south) + ( slat * zenith) + sitez;

  return {'x': x, 'y': y, 'z': z};
}

(function () {
  // Draw Sun
  let NUM_LAT_SEGS = 64;
  let NUM_LON_SEGS = 64;

  let vertPosBuf, vertNormBuf, texCoordBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
  let vertCount;
  let mvMatrix;
  let mvMatrixEmpty = mat4.create();
  let nMatrix;
  let nMatrixEmpty = mat3.create();
  let moonShader;
  moon = {};
  moon.pos = [0,0,0];

  var texture;

  var texLoaded = false;
  moon.loaded = false;

  function onImageLoaded () {
    if (texLoaded) {
      moon.loaded = true;
    }
  }

  moon.getXYZ = () => {
    var now = timeManager.propTime();
    j = timeManager.jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds());
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    let moonPos = SunCalc.getMoonPosition(timeManager.propTime(),0,0);
    moon.position = satellite.ecfToEci(lookAnglesToEcf(moonPos.azimuth * RAD2DEG, moonPos.altitude * RAD2DEG, moonPos.distance, 0,0,0), gmst);

    return {'x': moon.position.x, 'y': moon.position.y, 'z': moon.position.z};
  };

  moon.init = function () {
    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    let fragCode = shaderLoader.getShaderCode('moon-fragment.glsl');
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    let vertShader = gl.createShader(gl.VERTEX_SHADER);
    let vertCode = shaderLoader.getShaderCode('moon-vertex.glsl');
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    moonShader = gl.createProgram();
    gl.attachShader(moonShader, vertShader);
    gl.attachShader(moonShader, fragShader);
    gl.linkProgram(moonShader);

    moonShader.aVertexPosition = gl.getAttribLocation(moonShader, 'aVertexPosition');
    moonShader.aTexCoord = gl.getAttribLocation(moonShader, 'aTexCoord');
    moonShader.aVertexNormal = gl.getAttribLocation(moonShader, 'aVertexNormal');
    moonShader.uPMatrix = gl.getUniformLocation(moonShader, 'uPMatrix');
    moonShader.uCamMatrix = gl.getUniformLocation(moonShader, 'uCamMatrix');
    moonShader.uMvMatrix = gl.getUniformLocation(moonShader, 'uMvMatrix');
    moonShader.uNormalMatrix = gl.getUniformLocation(moonShader, 'uNormalMatrix');
    moonShader.uAmbientLightColor = gl.getUniformLocation(moonShader, 'uAmbientLightColor');
    moonShader.uSampler = gl.getUniformLocation(moonShader, 'uSampler');

    texture = gl.createTexture();
    var img = new Image();
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // console.log('moon.js loaded texture');

      let moonXYZ = moon.getXYZ();
      let moonMaxDist = Math.max(Math.max(Math.abs(moonXYZ.x),Math.abs(moonXYZ.y)),Math.abs(moonXYZ.z));
      moon.pos[0] = moonXYZ.x / moonMaxDist * MOON_SCALAR_DISTANCE;
      moon.pos[1] = moonXYZ.y / moonMaxDist * MOON_SCALAR_DISTANCE;
      moon.pos[2] = moonXYZ.z / moonMaxDist * MOON_SCALAR_DISTANCE;

      texLoaded = true;
      onImageLoaded();
    };
    img.src = settingsManager.installDirectory + 'images/moon-1024.jpg';

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

        vertPos.push(x * RADIUS_OF_DRAW_MOON);
        vertPos.push(y * RADIUS_OF_DRAW_MOON);
        vertPos.push(z * RADIUS_OF_DRAW_MOON);
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
    // console.log('moon init: ' + end + ' ms');
  };

  moon.draw = function (pMatrix, camMatrix) {
    if (!moon.loaded) return;

    mvMatrix = mvMatrixEmpty;
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, mvMatrix, moon.pos);
    nMatrix = nMatrixEmpty;
    mat3.normalFromMat4(nMatrix, mvMatrix);

    gl.useProgram(moonShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.uniformMatrix3fv(moonShader.uNormalMatrix, false, nMatrix);
    gl.uniformMatrix4fv(moonShader.uMvMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(moonShader.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(moonShader.uCamMatrix, false, camMatrix);
    gl.uniform3fv(moonShader.uAmbientLightColor, [1, 1, 1]); // RGB ambient light

    gl.uniform1i(moonShader.uSampler, 0); // point sampler to TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture to TEXTURE0

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(moonShader.aTexCoord);
    gl.vertexAttribPointer(moonShader.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.enableVertexAttribArray(moonShader.aVertexPosition);
    gl.vertexAttribPointer(moonShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.enableVertexAttribArray(moonShader.aVertexNormal);
    gl.vertexAttribPointer(moonShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    gl.useProgram(gl.pickShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);

    gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, mvMatrix); // set up picking
    gl.disableVertexAttribArray(gl.pickShaderProgram.aColor);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPos);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    // Done Drawing
    return true;
  };
  window.moon = moon;
})();
