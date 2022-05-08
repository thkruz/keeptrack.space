import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { Camera, DotsManager, EarthObject } from '@app/js/api/keepTrackTypes';
import { DEG2RAD, MILLISECONDS_PER_DAY, RADIUS_OF_EARTH } from '@app/js/lib/constants';
import { satellite } from '@app/js/satMath/satMath';
import { jday } from '@app/js/timeManager/transforms';
import * as glm from 'gl-matrix';

// TODO: #316 Implement VAO for earth

let vertPosBuf: WebGLBuffer;
let vertNormBuf: WebGLBuffer;
let texCoordBuf: WebGLBuffer;
let vertIndexBuf: WebGLBuffer;
let vertCount: number;
let earthNow: Date;
let mvMatrix: glm.mat4;
let nMatrix: glm.mat3;
let texture: WebGLTexture;
let nightTexture: WebGLTexture;
let texLoaded = false;
let nightLoaded = false;

/* ***************************************************************************
 * Initialization Code
 * ***************************************************************************/
export const onImageLoaded = (isForce?: boolean): void => {
  if (isForce || (texLoaded && nightLoaded && earth.bumpMap.isReady && earth.specularMap.isReady)) {
    earth.loaded = true;
  }
};
export const init = async (): Promise<void> => {
  try {
    const { gl } = keepTrackApi.programs.drawManager;
    initProgram(gl);
    initTextures(gl);
    initBuffers(gl);

    earth.loaded = true;
  } catch (error) {
    console.debug(error);
  }
};
export const initProgram = (gl: WebGL2RenderingContext): void => {
  // Make Fragment Shader
  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, earth.shader.frag);
  gl.compileShader(fragShader);

  // Make Vertex Shader
  let vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, earth.shader.vert);
  gl.compileShader(vertShader);

  // Create Program with Two Shaders
  earth.program = gl.createProgram();
  gl.attachShader(earth.program, vertShader);
  gl.attachShader(earth.program, fragShader);
  gl.linkProgram(earth.program);

  // Assign Attributes
  earth.program.aVertexPosition = gl.getAttribLocation(earth.program, 'aVertexPosition');
  earth.program.aTexCoord = gl.getAttribLocation(earth.program, 'aTexCoord');
  earth.program.aVertexNormal = gl.getAttribLocation(earth.program, 'aVertexNormal');
  earth.program.uZoomModifier = gl.getUniformLocation(earth.program, 'uZoomModifier');
  earth.program.uCamPos = gl.getUniformLocation(earth.program, 'uCamPos');
  earth.program.uPMatrix = gl.getUniformLocation(earth.program, 'uPMatrix');
  earth.program.uCamMatrix = gl.getUniformLocation(earth.program, 'uCamMatrix');
  earth.program.uMvMatrix = gl.getUniformLocation(earth.program, 'uMvMatrix');
  earth.program.uNormalMatrix = gl.getUniformLocation(earth.program, 'uNormalMatrix');
  earth.program.uLightDirection = gl.getUniformLocation(earth.program, 'uLightDirection');
  earth.program.uAmbientLightColor = gl.getUniformLocation(earth.program, 'uAmbientLightColor');
  earth.program.uDirectionalLightColor = gl.getUniformLocation(earth.program, 'uDirectionalLightColor');
  earth.program.uSampler = gl.getUniformLocation(earth.program, 'uSampler');
  earth.program.uNightSampler = gl.getUniformLocation(earth.program, 'uNightSampler');
  earth.program.uBumpMap = gl.getUniformLocation(earth.program, 'uBumpMap');
  earth.program.uSpecMap = gl.getUniformLocation(earth.program, 'uSpecMap');
};
export const initTextures = (gl: WebGL2RenderingContext): void => {
  initDayTexture(gl);
  initNightTexture(gl);
  initBumpTexture(gl);
  initSpecularTexture(gl);
};
export const initBumpTexture = (gl: WebGL2RenderingContext): void => {
  earth.bumpMap = {};
  earth.bumpMap.isReady = false;
  earth.bumpMap.texture = gl.createTexture();
  earth.bumpMap.img = new Image();
  earth.bumpMap.img.onload = () => {
    bumpImgOnLoad(gl);
  };
  earth.bumpMap.img.src = `${settingsManager.installDirectory}textures/earthbump8k.jpg`;
  if (settingsManager.smallImages) earth.bumpMap.img.src = `${settingsManager.installDirectory}textures/earthbump256.jpg`;
  if (settingsManager.isMobileModeEnabled) earth.bumpMap.img.src = `${settingsManager.installDirectory}textures/earthbump4k.jpg`;

  // DEBUG:
  // `${settingsManager.installDirectory}textures/earthbump1k.jpg`;
};
export const initNightTexture = (gl: WebGL2RenderingContext): void => {
  nightTexture = gl.createTexture();
  earth.nightImg = new Image();
  earth.nightImg.onload = () => {
    nightImgOnLoad(gl);
  };
  earth.nightImg.src = `${settingsManager.installDirectory}textures/earthlights512.jpg`;

  earth.loadHiResNight = async () => {
    try {
      earth.nightImgHiRes = new Image();
      if (!settingsManager.smallImages) earth.nightImgHiRes.src = `${settingsManager.installDirectory}textures/earthlights4k.jpg`;
      if (settingsManager.vectorImages) earth.nightImgHiRes.src = `${settingsManager.installDirectory}textures/dayearthvector-4096.jpg`;
      if (settingsManager.politicalImages) earth.nightImgHiRes.src = `${settingsManager.installDirectory}textures/political8k.jpg`;
      if (settingsManager.hiresImages || settingsManager.hiresNoCloudsImages) earth.nightImgHiRes.src = `${settingsManager.installDirectory}textures/earthlights16k.jpg`;
      earth.nightImgHiRes.onload = () => {
        nightImgHiOnLoad(gl);
      };
    } catch (e) {
      console.debug(e);
    }
  };
};
export const initDayTexture = (gl: WebGL2RenderingContext): void => {
  const uiManager = keepTrackApi.programs.uiManager;
  uiManager.loadStr('painting');
  texture = gl.createTexture();
  let img = new Image();
  img.onload = () => {
    dayImgOnLoad(gl, img);
  };
  img.src = `${settingsManager.installDirectory}textures/earthmap512.jpg`;

  earth.loadHiRes = async () => {
    try {
      earth.imgHiRes = new Image();
      earth.imgHiRes.src = `${settingsManager.installDirectory}textures/earthmap4k.jpg`;
      if (settingsManager.smallImages) earth.imgHiRes.src = `${settingsManager.installDirectory}textures/earthmap512.jpg`;
      if (settingsManager.nasaImages) earth.imgHiRes.src = `${settingsManager.installDirectory}textures/mercator-tex.jpg`;
      if (settingsManager.trusatImages) img.src = `${settingsManager.installDirectory}textures/trusatvector-4096.jpg`;
      if (settingsManager.blueImages) earth.imgHiRes.src = `${settingsManager.installDirectory}textures/world_blue-2048.png`;
      if (settingsManager.vectorImages) earth.imgHiRes.src = `${settingsManager.installDirectory}textures/dayearthvector-4096.jpg`;
      if (settingsManager.politicalImages) earth.imgHiRes.src = `${settingsManager.installDirectory}textures/political8k.jpg`;
      if (settingsManager.hiresImages) earth.imgHiRes.src = `${settingsManager.installDirectory}textures/earthmapclouds16k.jpg`;
      if (settingsManager.hiresNoCloudsImages) earth.imgHiRes.src = `${settingsManager.installDirectory}textures/earthmap16k.jpg`;
      earth.isUseHiRes = true;
      earth.imgHiRes.onload = () => {
        dayImgHiOnLoad(gl);
      };
    } catch (e) {
      console.debug(e);
    }
  };
};
export const initSpecularTexture = (gl: WebGL2RenderingContext): void => {
  earth.specularMap = {};
  earth.specularMap.isReady = false;
  earth.specularMap.texture = gl.createTexture();
  earth.specularMap.img = new Image();
  earth.specularMap.img.onload = () => {
    specularImgOnLoad(gl);
  };
  earth.specularMap.img.src = `${settingsManager.installDirectory}textures/earthspec8k.jpg`;
  if (settingsManager.smallImages) earth.specularMap.img.src = `${settingsManager.installDirectory}textures/earthspec256.jpg`;
  if (settingsManager.isMobileModeEnabled) earth.specularMap.img.src = `${settingsManager.installDirectory}textures/earthspec4k.jpg`;

  // DEBUG:
  // `${settingsManager.installDirectory}textures/earthspec1k.jpg`;
};
export const initBuffers = (gl: WebGL2RenderingContext): void => {
  // generate a uvsphere bottom up, CCW order
  let vertPos = [];
  let vertNorm = [];
  let texCoord = [];
  for (let lat = 0; lat <= settingsManager.earthNumLatSegs; lat++) {
    let latAngle = (Math.PI / settingsManager.earthNumLatSegs) * lat - Math.PI / 2;
    let diskRadius = Math.cos(Math.abs(latAngle));
    let z = Math.sin(latAngle);
    for (let lon = 0; lon <= settingsManager.earthNumLonSegs; lon++) {
      // add an extra vertex for texture funness
      let lonAngle = ((Math.PI * 2) / settingsManager.earthNumLonSegs) * lon;
      let x = Math.cos(lonAngle) * diskRadius;
      let y = Math.sin(lonAngle) * diskRadius;
      // console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)
      // mercator cylindrical projection (simple angle interpolation)
      let v = 1 - lat / settingsManager.earthNumLatSegs;
      let u = 0.5 + lon / settingsManager.earthNumLonSegs; // may need to change to move map

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
    }
  }

  // ok let's calculate vertex draw orders.... indiv triangles
  let vertIndex = [];
  for (let lat = 0; lat < settingsManager.earthNumLatSegs; lat++) {
    // this is for each QUAD, not each vertex, so <
    for (let lon = 0; lon < settingsManager.earthNumLonSegs; lon++) {
      let blVert = lat * (settingsManager.earthNumLonSegs + 1) + lon; // there's settingsManager.earthNumLonSegs + 1 verts in each horizontal band
      let brVert = blVert + 1;
      let tlVert = (lat + 1) * (settingsManager.earthNumLonSegs + 1) + lon;
      let trVert = tlVert + 1;
      // DEBUG:
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
export const specularImgOnLoad = (gl: WebGL2RenderingContext): void => {
  if (!settingsManager.isBlackEarth) {
    gl.bindTexture(gl.TEXTURE_2D, earth.specularMap.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, earth.specularMap.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }

  earth.specularMap.isReady = true;
  onImageLoaded();
};

export const dayImgHiOnLoad = (gl: WebGL2RenderingContext): void => {
  if (!settingsManager.isBlackEarth) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, earth.imgHiRes);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }

  texLoaded = true;
  earth.isHiResReady = true;
  onImageLoaded();
};

export const dayImgOnLoad = (gl: WebGL2RenderingContext, img: HTMLImageElement): void => {
  if (!settingsManager.isBlackEarth) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }

  texLoaded = true;
  onImageLoaded();
};

export const nightImgHiOnLoad = (gl: WebGL2RenderingContext): void => {
  if (!settingsManager.isBlackEarth) {
    gl.bindTexture(gl.TEXTURE_2D, nightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, earth.nightImgHiRes);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }

  nightLoaded = true;
  onImageLoaded();
};

export const nightImgOnLoad = (gl: WebGL2RenderingContext): void => {
  if (!settingsManager.isBlackEarth) {
    gl.bindTexture(gl.TEXTURE_2D, nightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, earth.nightImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }

  // DEBUG:
  // console.log('earth.ts loaded nightearth');
  nightLoaded = true;
  onImageLoaded();
};

export const bumpImgOnLoad = (gl: WebGL2RenderingContext): void => {
  if (!settingsManager.isBlackEarth) {
    gl.bindTexture(gl.TEXTURE_2D, earth.bumpMap.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, earth.bumpMap.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }

  earth.bumpMap.isReady = true;
  onImageLoaded();
};
/* ***************************************************************************
 * Render Loop Code
 * ***************************************************************************/
export const draw = (pMatrix: glm.mat4, mainCamera: Camera, dotsManager: DotsManager, tgtBuffer: WebGLFramebuffer): boolean => {
  if (!earth.loaded) return false;
  const { gl } = keepTrackApi.programs.drawManager;
  // //////////////////////////////////////////////////////////////////////
  // Draw Colored Earth First
  // //////////////////////////////////////////////////////////////////////

  // Change to the earth shader
  gl.useProgram(earth.program);
  // Change to the main drawing buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  // Set the uniforms
  const uZoomModifier =
    mainCamera.cameraType.current === mainCamera.cameraType.FixedToSat || mainCamera.panCurrent.x !== 0 || mainCamera.panCurrent.y !== 0 || mainCamera.panCurrent.z
      ? mainCamera.zoomLevel()
      : 1.0;

  gl.uniform1f(earth.program.uZoomModifier, uZoomModifier);
  gl.uniform3fv(earth.program.uCamPos, mainCamera.getForwardVector());
  gl.uniformMatrix3fv(earth.program.uNormalMatrix, false, nMatrix);
  gl.uniformMatrix4fv(earth.program.uMvMatrix, false, mvMatrix);
  gl.uniformMatrix4fv(earth.program.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(earth.program.uCamMatrix, false, mainCamera.camMatrix);
  gl.uniform3fv(earth.program.uLightDirection, earth.lightDirection);
  gl.uniform3fv(earth.program.uAmbientLightColor, [0.1, 0.1, 0.1]); // RGB ambient light
  gl.uniform3fv(earth.program.uDirectionalLightColor, [1.0, 1.0, 1.0]); // RGB directional light

  // Set the textures
  {
    // Day Map
    gl.uniform1i(earth.program.uSampler, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Night Map
    gl.uniform1i(earth.program.uNightSampler, 1);
    gl.activeTexture(gl.TEXTURE1);
    if (keepTrackApi.callbacks.nightToggle.length === 0) {
      gl.bindTexture(gl.TEXTURE_2D, nightTexture);
    } else {
      keepTrackApi.methods.nightToggle(gl, nightTexture, texture);
    }

    // Bump Map
    gl.uniform1i(earth.program.uBumpMap, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, earth.bumpMap.texture);

    // Specular Map
    gl.uniform1i(earth.program.uSpecMap, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, earth.specularMap.texture);
  }

  // Select, Enable, and Set Attributes
  {
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(earth.program.aTexCoord);
    gl.vertexAttribPointer(earth.program.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.enableVertexAttribArray(earth.program.aVertexPosition);
    gl.vertexAttribPointer(earth.program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    // This needs to be up here not down with the GPU Picking
    gl.vertexAttribPointer(dotsManager.pickingProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.enableVertexAttribArray(earth.program.aVertexNormal);
    gl.vertexAttribPointer(earth.program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
  }

  // Select Vertex Indicies and then Draw Earth
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

  // Disable attributes to avoid conflict with other shaders
  gl.disableVertexAttribArray(earth.program.aTexCoord);
  gl.disableVertexAttribArray(earth.program.aVertexPosition);
  gl.disableVertexAttribArray(earth.program.aVertexNormal);

  // //////////////////////////////////////////////////////////////////////
  // Draw Black GPU Picking Earth Mask Second
  // //////////////////////////////////////////////////////////////////////

  // Switch to GPU Picking Shader
  gl.useProgram(dotsManager.pickingProgram);
  // Switch to the GPU Picking Frame Buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);

  // Set Uniforms
  // gl.uniformMatrix4fv(dotsManager.pickingProgram.uMvMatrix, false, mvMatrix);

  // Disable color vertex so that the earth is drawn black
  gl.disableVertexAttribArray(dotsManager.pickingProgram.aColor); // IMPORTANT!
  // Only Enable Position Attribute
  gl.enableVertexAttribArray(dotsManager.pickingProgram.aPos);

  // no reason to render 100000s of pixels when
  // we're only going to read one
  if (!settingsManager.isMobileModeEnabled) {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(mainCamera.mouseX, gl.drawingBufferHeight - mainCamera.mouseY, 1, 1);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

  if (!settingsManager.isMobileModeEnabled) {
    gl.disable(gl.SCISSOR_TEST);
  }

  // Disable attributes to avoid conflict with other shaders
  // NOTE: This breaks satellite gpu picking.
  // gl.disableVertexAttribArray(dotsManager.pickingProgram.aPos);

  return true;
};
export const drawOcclusion = (pMatrix: glm.mat4, camMatrix: glm.mat4, occlusionPrgm: any, tgtBuffer: WebGLFramebuffer): void => {
  const gl = keepTrackApi.programs.drawManager.gl;
  // Change to the earth shader
  gl.useProgram(occlusionPrgm);
  // Change to the main drawing buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  occlusionPrgm.attrSetup(occlusionPrgm, vertPosBuf);

  // Set the uniforms
  occlusionPrgm.uniformSetup(occlusionPrgm, mvMatrix, pMatrix, camMatrix);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

  // DEBUG:
  // occlusionPrgm.attrOff(occlusionPrgm);
};
export const update = (): void => {
  const { timeManager } = keepTrackApi.programs;
  earthNow = timeManager.simulationTimeObj;

  earth.earthJ = jday(
    earthNow.getUTCFullYear(),
    earthNow.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    earthNow.getUTCDate(),
    earthNow.getUTCHours(),
    earthNow.getUTCMinutes(),
    earthNow.getUTCSeconds()
  );
  earth.earthJ += earthNow.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

  earth.earthEra = satellite.gstime(earth.earthJ);

  updateSunCurrentDirection();
  glm.vec3.normalize(earth.lightDirection, earth.lightDirection);

  mvMatrix = glm.mat4.create();
  glm.mat4.identity(mvMatrix);
  glm.mat4.rotateZ(mvMatrix, mvMatrix, earth.earthEra);
  glm.mat4.translate(mvMatrix, mvMatrix, earth.pos);
  // DEBUG:
  // glm.mat4.scale(mvMatrix, mvMatrix, [2,2,2]);
  nMatrix = glm.mat3.create();
  glm.mat3.normalFromMat4(nMatrix, mvMatrix);
};
export const updateSunCurrentDirection = (): void => {
  const { timeManager } = keepTrackApi.programs;
  earth.sunvar.now = timeManager.simulationTimeObj;
  earth.sunvar.jd = jday(
    earth.sunvar.now.getUTCFullYear(),
    earth.sunvar.now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    earth.sunvar.now.getUTCDate(),
    earth.sunvar.now.getUTCHours(),
    earth.sunvar.now.getUTCMinutes(),
    earth.sunvar.now.getUTCSeconds()
  );
  earth.sunvar.jd += earth.sunvar.now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

  earth.sunvar.n = earth.sunvar.jd - 2451545;
  earth.sunvar.L = 280.46 + 0.9856474 * earth.sunvar.n; // mean longitude of sun
  earth.sunvar.g = 357.528 + 0.9856003 * earth.sunvar.n; // mean anomaly
  earth.sunvar.L = earth.sunvar.L % 360.0;
  earth.sunvar.g = earth.sunvar.g % 360.0;

  earth.sunvar.ecLon = earth.sunvar.L + 1.915 * Math.sin(earth.sunvar.g * DEG2RAD) + 0.02 * Math.sin(2 * earth.sunvar.g * DEG2RAD);

  earth.sunvar.t = (earth.sunvar.jd - 2451545) / 3652500;

  earth.sunvar.obliq =
    84381.448 -
    4680.93 * earth.sunvar.t -
    1.55 * Math.pow(earth.sunvar.t, 2) +
    1999.25 * Math.pow(earth.sunvar.t, 3) -
    51.38 * Math.pow(earth.sunvar.t, 4) -
    249.67 * Math.pow(earth.sunvar.t, 5) -
    39.05 * Math.pow(earth.sunvar.t, 6) +
    7.12 * Math.pow(earth.sunvar.t, 7) +
    27.87 * Math.pow(earth.sunvar.t, 8) +
    5.79 * Math.pow(earth.sunvar.t, 9) +
    2.45 * Math.pow(earth.sunvar.t, 10);

  earth.sunvar.ob = earth.sunvar.obliq / 3600.0;

  earth.lightDirection[0] = Math.cos(earth.sunvar.ecLon * DEG2RAD);
  earth.lightDirection[1] = Math.cos(earth.sunvar.ob * DEG2RAD) * Math.sin(earth.sunvar.ecLon * DEG2RAD);
  earth.lightDirection[2] = Math.sin(earth.sunvar.ob * DEG2RAD) * Math.sin(earth.sunvar.ecLon * DEG2RAD);
};
/* ***************************************************************************
 * Export Code
 * ***************************************************************************/
export const earth: EarthObject = {
  init: init,
  draw: draw,
  program: null,
  update: update,
  drawOcclusion: drawOcclusion,
  earthJ: 0,
  earthEra: 0,
  lightDirection: [0, 0, 0],
  pos: [0, 0, 0],
  loaded: false,
  sunvar: {
    now: <any>null,
    jd: 0,
    n: 0,
    L: 0,
    g: 0,
    ecLon: 0,
    t: 0,
    obliq: 0,
    ob: 0,
  },
  shader: {
    frag: `#version 300 es
    precision mediump float;

    uniform float uZoomModifier;
    uniform vec3 uAmbientLightColor;
    uniform vec3 uDirectionalLightColor;
    uniform vec3 uLightDirection;

    in vec2 vUv;
    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vVertToCamera;

    out vec4 fragColor;

    uniform sampler2D uSampler;
    uniform sampler2D uNightSampler;
    uniform sampler2D uBumpMap;
    uniform sampler2D uSpecMap;

    void main(void) {
      float fragToLightAngle = dot( vNormal, uLightDirection ) * 0.5 + 0.5; //Remake -1 > 1 to 0 > 1
      vec3 fragToCamera = normalize(vVertToCamera);

      // .................................................
      // Diffuse lighting
        float diffuse = max(dot(vNormal, uLightDirection), 0.0);

      //.................................................
      // Bump mapping
        vec3 bumpTexColor = texture(uBumpMap, vUv).rgb * diffuse * 0.4;

        //................................................
        // Specular lighting
        vec3 specLightColor = texture(uSpecMap, vUv).rgb * diffuse * 0.1;

        //................................................
        // Final color
        vec3 dayColor = (uAmbientLightColor + uDirectionalLightColor) * diffuse;
        vec3 dayTexColor = texture(uSampler, vUv).rgb * dayColor;
        vec3 nightColor = 0.5 * texture(uNightSampler, vUv).rgb * pow(1.0 - diffuse, 2.0);

        fragColor = vec4(dayTexColor + nightColor + bumpTexColor + specLightColor, 1.0);

        // ...............................................
        // Atmosphere

        float sunAmount = max(dot(vNormal, uLightDirection), 0.1);
        float darkAmount = max(dot(vNormal, -uLightDirection), 0.0);
        float r = 1.0 - sunAmount;
        float g = max(1.0 - sunAmount, 0.85) - darkAmount;
        float b = max(sunAmount, 0.9) - darkAmount;        
        vec3 atmosphereColor = vec3(r,g,b);

        float fragToCameraAngle = (1.0 - dot(fragToCamera, vNormal));
        fragToCameraAngle = pow(fragToCameraAngle, 3.8); //Curve the change, Make the fresnel thinner

        fragColor.rgb += (atmosphereColor * fragToCameraAngle * smoothstep(0.25, 0.5, fragToLightAngle));

    }
    `,
    vert: `#version 300 es
    in vec3 aVertexPosition;

    in vec2 aTexCoord;
    in vec3 aVertexNormal;
    uniform vec3 uCamPos;
    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;

    out vec2 vUv;
    out vec3 vNormal;
    out vec3 vWorldPos;
    out vec3 vVertToCamera;

    void main(void) {
        vec4 worldPosition = uMvMatrix * vec4(aVertexPosition, 1.0);
        vWorldPos = worldPosition.xyz;
        vNormal = uNormalMatrix * aVertexNormal;
        vUv = aTexCoord;
        vVertToCamera = normalize(vec3(uCamPos) - worldPosition.xyz);

        gl_Position = uPMatrix * uCamMatrix * worldPosition;
    }
    `,
  },
  specularMap: null,
  imgHiRes: null,
  isHiResReady: false,
  nightImgHiRes: null,
  nightImg: null,
  bumpMap: null,
  loadHiResNight: null,
  loadHiRes: null,
  isUseHiRes: false,
};
