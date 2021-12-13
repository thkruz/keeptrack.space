/* */

import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants';
import * as glm from '@app/js/lib/external/gl-matrix.js';
// @ts-ignore - using OBJ prevents ponicode from breaking
import { OBJ } from '@app/js/lib/external/webgl-obj-loader.js';
import { mat4 } from 'gl-matrix';
import { keepTrackApi } from '../api/keepTrackApi';
import { Camera, SatObject, TimeManager } from '../api/keepTrackTypes';

const meshList = ['sat2', 's1u', 's2u', 's3u', 'starlink', 'iss', 'gps', 'aehf', 'dsp', 'galileo', 'o3b', 'orbcomm', 'iridium', 'globalstar', 'debris0', 'debris1', 'debris2', 'rocketbody', 'sbirs', 'misl', 'misl2', 'misl3', 'misl4', 'rv'];

let mvMatrix;
let nMatrix;

export const init: any = async () => {
  try {
    if (settingsManager.disableUI || settingsManager.isDrawLess) return;

    settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];

    meshManager.fileList = [];

    // Don't Continue until you have populated the mesh list
    await meshManager.populateFileList();

    let p = OBJ.downloadModels(meshManager.fileList);

    p.then((models: any[]) => {
      // for (var [name, mesh] of Object.entries(models)) {
      //   console.debug('Name:', name);
      //   console.debug('Mesh:', mesh);
      // }
      meshManager.meshes = models;
      meshManager.initShaders();
      meshManager.initBuffers();
      meshManager.isReady = true;
      // eslint-disable-next-line no-unused-vars
    }).catch(() => {
      // console.warn(error);
    });
  } catch {
    // console.debug(error);
  }
};

export const populateFileList = () => {
  try {
    for (var i = 0; i < meshList.length; i++) {
      let meshFiles = {
        obj: `${settingsManager.installDirectory}meshes/${meshList[i]}.obj`,
        mtl: `${settingsManager.installDirectory}meshes/${meshList[i]}.mtl`,
      };
      meshManager.fileList.push(meshFiles);
    }
  } catch (error) {
    // console.debug(error);
  }
};

export const initShaders = () => {
  const { gl } = keepTrackApi.programs.drawManager;

  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  let fragCode = meshManager.fragShaderCode;
  gl.shaderSource(fragShader, fragCode);
  gl.compileShader(fragShader);

  let vertShader = gl.createShader(gl.VERTEX_SHADER);
  let vertCode = meshManager.vertShaderCode;
  gl.shaderSource(vertShader, vertCode);
  gl.compileShader(vertShader);

  meshManager.shaderProgram = gl.createProgram();
  gl.attachShader(meshManager.shaderProgram, vertShader);
  gl.attachShader(meshManager.shaderProgram, fragShader);
  gl.linkProgram(meshManager.shaderProgram);

  if (!gl.getProgramParameter(meshManager.shaderProgram, gl.LINK_STATUS)) {
    console.log('Could not initialise shaders');
  }
  gl.useProgram(meshManager.shaderProgram);

  meshManager.attrs = {
    aVertexPosition: OBJ.Layout.POSITION.key,
    aVertexNormal: OBJ.Layout.NORMAL.key,
    aTextureCoord: OBJ.Layout.UV.key,
    aAmbient: OBJ.Layout.AMBIENT.key,
    aDiffuse: OBJ.Layout.DIFFUSE.key,
    aSpecular: OBJ.Layout.SPECULAR.key,
    aSpecularExponent: OBJ.Layout.SPECULAR_EXPONENT.key,
  };

  meshManager.shaderProgram.attrIndices = {};

  meshManager.shaderProgram.uPMatrix = gl.getUniformLocation(meshManager.shaderProgram, 'uPMatrix');
  meshManager.shaderProgram.uCamMatrix = gl.getUniformLocation(meshManager.shaderProgram, 'uCamMatrix');
  meshManager.shaderProgram.uMvMatrix = gl.getUniformLocation(meshManager.shaderProgram, 'uMvMatrix');
  meshManager.shaderProgram.uNormalMatrix = gl.getUniformLocation(meshManager.shaderProgram, 'uNormalMatrix');
  meshManager.shaderProgram.uLightDirection = gl.getUniformLocation(meshManager.shaderProgram, 'uLightDirection');
  meshManager.shaderProgram.uInSun = gl.getUniformLocation(meshManager.shaderProgram, 'uInSun');

  meshManager.shaderProgram.applyAttributePointers = applyAttributePointers;
  meshManager.shaderProgram.enableVertexAttribArrays = enableVertexAttribArrays;
  meshManager.shaderProgram.disableVertexAttribArrays = disableVertexAttribArrays;
};

export const enableVertexAttribArrays = (attrs: string[]) => {
  const { gl } = keepTrackApi.programs.drawManager;
  for (const attrName in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, attrName)) {
      continue;
    }
    meshManager.shaderProgram.attrIndices[attrName] = gl.getAttribLocation(meshManager.shaderProgram, attrName);
    if (meshManager.shaderProgram.attrIndices[attrName] != -1) {
      gl.enableVertexAttribArray(meshManager.shaderProgram.attrIndices[attrName]);
    } else {
      console.warn('Shader attribute "' + attrName + '" not found in shader. Is it undeclared or unused in the shader code?');
    }
  }
};

export const disableVertexAttribArrays = (attrs: string[]) => {
  const { gl } = keepTrackApi.programs.drawManager;
  for (const attrName in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, attrName)) {
      continue;
    }
    meshManager.shaderProgram.attrIndices[attrName] = gl.getAttribLocation(meshManager.shaderProgram, attrName);
    if (meshManager.shaderProgram.attrIndices[attrName] != -1) {
      gl.disableVertexAttribArray(meshManager.shaderProgram.attrIndices[attrName]);
    } else {
      console.warn('Shader attribute "' + attrName + '" not found in shader. Is it undeclared or unused in the shader code?');
    }
  }
};

export const applyAttributePointers = (model: any, attrs: string[]) => {
  const { gl } = keepTrackApi.programs.drawManager;
  const layout = model.mesh.vertexBuffer.layout;
  for (const attrName in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, attrName) || meshManager.shaderProgram.attrIndices[attrName] == -1) {
      continue;
    }
    const layoutKey = attrs[attrName];
    if (typeof meshManager.shaderProgram.attrIndices[attrName] !== 'undefined' && meshManager.shaderProgram.attrIndices[attrName] != -1) {
      const attr = layout.attributeMap[layoutKey];
      gl.vertexAttribPointer(meshManager.shaderProgram.attrIndices[attrName], attr.size, gl[attr.type], attr.normalized, attr.stride, attr.offset);
    }
  }
};

export const initBuffers = (meshes?: any) => {
  const { gl } = keepTrackApi.programs.drawManager;
  var layout = new OBJ.Layout(OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.UV, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT);

  if (meshManager.meshes.length === 0) meshManager.meshes = meshes;

  // initialize the mesh's buffers
  for (var mesh in meshManager.meshes) {
    try {
      // Create the vertex buffer for this mesh
      var vertexBuffer = <any>gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      var vertexData = meshManager.meshes[mesh].makeBufferData(layout);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
      vertexBuffer.numItems = vertexData.numItems;
      vertexBuffer.layout = layout;
      meshManager.meshes[mesh].vertexBuffer = vertexBuffer;

      // Create the index buffer for this mesh
      var indexBuffer = <any>gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      var indexData = meshManager.meshes[mesh].makeIndexBufferDataForMaterials(...Object.values(meshManager.meshes[mesh].materialIndices));
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
      indexBuffer.numItems = indexData.numItems;
      meshManager.meshes[mesh].indexBuffer = indexBuffer;

      // this loops through the mesh names and creates new
      // model objects and setting their mesh to the current mesh
      meshManager.models[mesh] = {};
      meshManager.models[mesh].mesh = meshManager.meshes[mesh];
      // meshManager.models[mesh].size = meshManager.sizeInfo[mesh];
    } catch (error) {
      // console.warn(error);
    }
  }
  meshManager.loaded = true;
};

export const lerpPosition = (pos: { x: number; y: number; z: number }, dt: number) => {
  meshManager.currentModel.position.x = pos.x + (meshManager.currentModel.position.x - pos.x) * dt;
  meshManager.currentModel.position.y = pos.y + (meshManager.currentModel.position.y - pos.y) * dt;
  meshManager.currentModel.position.z = pos.z + (meshManager.currentModel.position.z - pos.z) * dt;
};

export const updatePosition = (pos: { x: number; y: number; z: number }) => {
  meshManager.currentModel.position = pos;
};

export const setCurrentModel = (model: any) => {
  meshManager.currentModel.id = model.id;
  meshManager.currentModel.model = model;
};

export const draw = (pMatrix: mat4, camMatrix: mat4, tgtBuffer: WebGLBuffer) => {
  // Meshes aren't finished loading
  if (settingsManager.disableUI || settingsManager.isDrawLess) return;
  if (!meshManager.loaded) return;
  if (typeof meshManager.currentModel.id == 'undefined' || meshManager.currentModel.id == -1 || meshManager.currentModel.static) return;

  const { gl } = keepTrackApi.programs.drawManager;
  const { earth } = keepTrackApi.programs.drawManager.sceneManager;

  // Move the mesh to its location in world space
  mvMatrix = glm.mat4.create();
  glm.mat4.identity(mvMatrix);
  glm.mat4.translate(mvMatrix, mvMatrix, glm.vec3.fromValues(meshManager.currentModel.position.x, meshManager.currentModel.position.y, meshManager.currentModel.position.z));

  // Rotate the Satellite to Face Nadir if needed
  if (meshManager.currentModel.nadirYaw !== null) {
    glm.mat4.rotateZ(mvMatrix, mvMatrix, meshManager.currentModel.nadirYaw);
  }

  // Allow Manual Rotation of Meshes
  glm.mat4.rotateX(mvMatrix, mvMatrix, settingsManager.meshRotation.x * DEG2RAD);
  glm.mat4.rotateY(mvMatrix, mvMatrix, settingsManager.meshRotation.y * DEG2RAD);
  glm.mat4.rotateZ(mvMatrix, mvMatrix, settingsManager.meshRotation.z * DEG2RAD);

  // Assign the normal matrix the opposite of the mvMatrix
  nMatrix = glm.mat3.create();
  glm.mat3.normalFromMat4(nMatrix, mvMatrix);

  gl.enable(gl.BLEND);

  // Use the mesh shader program
  gl.useProgram(meshManager.shaderProgram);

  // Determine where we are drawing
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  // Assign uniforms
  gl.uniform3fv(meshManager.shaderProgram.uLightDirection, earth.lightDirection);
  gl.uniformMatrix3fv(meshManager.shaderProgram.uNormalMatrix, false, <Float32Array>(<unknown>nMatrix));
  gl.uniformMatrix4fv(meshManager.shaderProgram.uMvMatrix, false, <Float32Array>(<unknown>mvMatrix));
  gl.uniformMatrix4fv(meshManager.shaderProgram.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(meshManager.shaderProgram.uCamMatrix, false, camMatrix);
  gl.uniform1f(meshManager.shaderProgram.uInSun, meshManager.currentModel.inSun);

  // Assign vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, meshManager.currentModel.model.mesh.vertexBuffer);
  meshManager.shaderProgram.enableVertexAttribArrays(meshManager.attrs);
  meshManager.shaderProgram.applyAttributePointers(meshManager.currentModel.model, meshManager.attrs);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshManager.currentModel.model.mesh.indexBuffer);
  gl.drawElements(gl.TRIANGLES, meshManager.currentModel.model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

  // disable attributes
  meshManager.shaderProgram.disableVertexAttribArrays(meshManager.attrs);
  gl.disable(gl.BLEND);
};

export const updateNadirYaw = (mainCamera: Camera, sat: SatObject, timeManager: TimeManager) => {
  meshManager.currentModel.nadirYaw = mainCamera.longToYaw(sat.getTEARR().lon * RAD2DEG, timeManager.selectedDate) + 180 * DEG2RAD;
};

export const update = (mainCamera: Camera, timeManager: TimeManager, sat: any) => {
  meshManager.currentModel.id = sat?.id || -1;
  meshManager.currentModel.static = sat?.static || false;

  if (typeof meshManager.currentModel.id == 'undefined' || meshManager.currentModel.id == -1 || meshManager.currentModel.static) return;
  if (settingsManager.modelsOnSatelliteViewOverride) return;

  // Try to reduce some jitter
  if (
    typeof meshManager.currentModel.position !== 'undefined' &&
    meshManager.currentModel.position.x > sat.position.x - 1.0 &&
    meshManager.currentModel.position.x < sat.position.x + 1.0 &&
    meshManager.currentModel.position.y > sat.position.y - 1.0 &&
    meshManager.currentModel.position.y < sat.position.y + 1.0 &&
    meshManager.currentModel.position.z > sat.position.z - 1.0 &&
    meshManager.currentModel.position.z < sat.position.z + 1.0
  ) {
    // Lerp to smooth difference between SGP4 and position+velocity
    meshManager.lerpPosition(sat.position, timeManager.drawDt);
  } else {
    meshManager.updatePosition(sat.position);
  }

  meshManager.currentModel.inSun = sat.isInSun();
  meshManager.currentModel.nadirYaw = null;

  if (settingsManager.meshOverride) {
    if (typeof meshManager.models[settingsManager.meshOverride] === 'undefined') {
      console.debug(`Mesh override not found: ${settingsManager.meshOverride}`);
      settingsManager.meshOverride = null;
    } else {
      meshManager.currentModel.model = meshManager.models[settingsManager.meshOverride];
      return;
    }
  }

  if (sat.sccNum == '25544') {
    meshManager.updateNadirYaw(mainCamera, sat, timeManager);
    meshManager.currentModel.model = meshManager.models.iss;
    return;
  }

  if (sat.OT == 1) {
    // Default Satellite
    if (sat.ON.slice(0, 5) == 'FLOCK' || sat.ON.slice(0, 5) == 'LEMUR') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.s3u;
      return;
    }
    if (sat.ON.slice(0, 8) == 'STARLINK') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.starlink;
      return;
    }

    if (sat.ON.slice(0, 10) == 'GLOBALSTAR') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.globalstar;
      return;
    }

    if (sat.ON.slice(0, 7) == 'IRIDIUM') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.iridium;
      return;
    }

    if (sat.ON.slice(0, 7) == 'ORBCOMM') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.orbcomm;
      return;
    }

    if (sat.ON.slice(0, 3) == 'O3B') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.o3b;
      return;
    }

    // Is this a GPS Satellite (Called NAVSTAR)
    if (sat.ON.slice(0, 7) == 'NAVSTAR' || sat.ON.slice(10, 17) == 'NAVSTAR') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.gps;
      return;
    }

    // Is this a Galileo Satellite
    if (sat.ON.slice(0, 7) == 'GALILEO') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.galileo;
      return;
    }

    // Is this a SBIRS Satellite
    if (sat.ON.slice(0, 5) == 'SBIRS') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.sbirs;
      return;
    }

    // Is this a DSP Satellite?
    if (
      sat.sccNum == '04630' ||
      sat.sccNum == '05204' ||
      sat.sccNum == '05851' ||
      sat.sccNum == '06691' ||
      sat.sccNum == '08482' ||
      sat.sccNum == '08916' ||
      sat.sccNum == '09803' ||
      sat.sccNum == '11397' ||
      sat.sccNum == '12339' ||
      sat.sccNum == '13086' ||
      sat.sccNum == '14930' ||
      sat.sccNum == '15453' ||
      sat.sccNum == '18583' ||
      sat.sccNum == '20066' ||
      sat.sccNum == '20929' ||
      sat.sccNum == '21805' ||
      sat.sccNum == '23435' ||
      sat.sccNum == '24737' ||
      sat.sccNum == '26356' ||
      sat.sccNum == '26880' ||
      sat.sccNum == '28158'
    ) {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.dsp;
      return;
    }

    // Is this an AEHF Satellite?
    if (sat.sccNum == '36868' || sat.sccNum == '38254' || sat.sccNum == '39256' || sat.sccNum == '43651' || sat.sccNum == '44481' || sat.sccNum == '45465') {
      meshManager.updateNadirYaw(mainCamera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.aehf;
      return;
    }

    // Is this a 1U Cubesat?
    if (parseFloat(sat.R) < 0.1 && parseFloat(sat.R) > 0.04) {
      meshManager.currentModel.model = meshManager.models.s1u;
      return;
    }
    if (parseFloat(sat.R) < 0.22 && parseFloat(sat.R) >= 0.1) {
      meshManager.currentModel.model = meshManager.models.s2u;
      return;
    }
    if (parseFloat(sat.R) < 0.33 && parseFloat(sat.R) >= 0.22) {
      meshManager.currentModel.model = meshManager.models.s3u;
      return;
    }
    // Generic Model
    meshManager.currentModel.model = meshManager.models.sat2;
    return;
  }

  if (sat.OT == 2) {
    // Rocket Body
    meshManager.currentModel.model = meshManager.models.rocketbody;
    return;
  }

  if (sat.OT == 3) {
    if (parseInt(sat.sccNum) <= 20000) {
      // Debris
      meshManager.currentModel.model = meshManager.models.debris0;
      return;
    } else if (parseInt(sat.sccNum) <= 35000) {
      // Debris
      meshManager.currentModel.model = meshManager.models.debris1;
      return;
    } else if (parseInt(sat.sccNum) > 35000) {
      // Debris
      meshManager.currentModel.model = meshManager.models.debris2;
      return;
    }
  }

  // Catch All for Special Satellites
  // Generic Model
  meshManager.currentModel.model = meshManager.models.sat2;
  return;
};

export const drawOcclusion = (pMatrix: mat4, camMatrix: mat4, occlusionPrgm: any, tgtBuffer: WebGLBuffer) => {
  if (settingsManager.disableUI || settingsManager.isDrawLess) return;
  if (typeof meshManager.currentModel.id == 'undefined' || meshManager.currentModel.id == -1 || meshManager.currentModel.static) return;

  const { gl } = keepTrackApi.programs.drawManager;

  try {
    // Move the mesh to its location in world space
    mvMatrix = glm.mat4.create();
    glm.mat4.identity(mvMatrix);
    glm.mat4.translate(mvMatrix, mvMatrix, glm.vec3.fromValues(meshManager.currentModel.position.x, meshManager.currentModel.position.y, meshManager.currentModel.position.z));

    // Rotate the Satellite to Face Nadir if needed
    if (meshManager.currentModel.nadirYaw !== null) {
      glm.mat4.rotateZ(mvMatrix, mvMatrix, meshManager.currentModel.nadirYaw);
    }

    // Allow Manual Rotation of Meshes
    glm.mat4.rotateX(mvMatrix, mvMatrix, settingsManager.meshRotation.x * DEG2RAD);
    glm.mat4.rotateY(mvMatrix, mvMatrix, settingsManager.meshRotation.y * DEG2RAD);
    glm.mat4.rotateZ(mvMatrix, mvMatrix, settingsManager.meshRotation.z * DEG2RAD);

    // Change to the earth shader
    gl.useProgram(occlusionPrgm);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    occlusionPrgm.attrSetup(occlusionPrgm, meshManager.currentModel.model.mesh.vertexBuffer, 80);

    // Set the uniforms
    occlusionPrgm.uniformSetup(occlusionPrgm, mvMatrix, pMatrix, camMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshManager.currentModel.model.mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, meshManager.currentModel.model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    occlusionPrgm.attrOff(occlusionPrgm);
  } catch {
    return;
  }
};

export const meshManager = {
  isReady: false,
  init: init,
  populateFileList: populateFileList,
  initShaders: initShaders,
  initBuffers: initBuffers,
  lerpPosition: lerpPosition,
  updatePosition: updatePosition,
  // main shader program
  fragShaderCode: `#version 300 es
      precision mediump float;
  
      in vec3 vLightDirection;
      in float vInSun;
      in vec3 vTransformedNormal;
      in vec2 vTextureCoord;
      in vec4 vPosition;
      in vec3 vAmbient;
      in vec3 vDiffuse;
      in vec3 vSpecular;
      in float vSpecularExponent;
  
      out vec4 fragColor;
  
      void main(void) {
        float lightAmt = max(dot(vTransformedNormal, vLightDirection), 0.0);
  
        vec3 ambientColor = vDiffuse * 0.1;
        vec3 dirColor = vDiffuse * vAmbient * lightAmt * min(vInSun,1.0);
        vec3 specColor = vSpecular * lightAmt * min(vInSun,1.0);
  
        vec3 color = ambientColor + dirColor + specColor;
  
        fragColor = vec4(color, 1.0);
      }
    `,
  vertShaderCode: `#version 300 es    
      in vec3 aVertexPosition;
      in vec3 aVertexNormal;
      in vec3 aSpecular;
      in float aSpecularExponent;
      in vec3 aAmbient;
      in vec3 aDiffuse;
      in vec2 aTextureCoord;
  
      uniform mat4 uPMatrix;
      uniform mat4 uCamMatrix;
      uniform mat4 uMvMatrix;
      uniform mat3 uNormalMatrix;
      uniform vec3 uLightDirection;
      uniform float uInSun;
  
      out vec2 vTextureCoord;
      out vec3 vTransformedNormal;
      out vec4 vPosition;
      out vec3 vLightDirection;
      out float vInSun;
  
      out vec3 vAmbient;
      out vec3 vDiffuse;
      out vec3 vSpecular;
      out float vSpecularExponent;
  
      void main(void) {
        vLightDirection = uLightDirection;
        vAmbient = aAmbient;
        vDiffuse = aDiffuse;
        vSpecular = aSpecular;
        vSpecularExponent = aSpecularExponent;
        vInSun = uInSun;
  
        vPosition = uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
        gl_Position = uPMatrix * vPosition;
        vTextureCoord = aTextureCoord;
        vTransformedNormal  = uNormalMatrix * aVertexNormal;
      }
    `,
  // main app object
  meshes: [],
  models: <any>[],
  currentModel: {
    position: { x: 0, y: 0, z: 0 },
    inSun: null,
    model: null,
    nadirYaw: null,
    static: false,
    id: -1,
  },
  attrs: null,
  mvMatrix: glm.mat4.create(),
  mvMatrixStack: [],
  pMatrix: glm.mat4.create(),
  draw: draw,
  updateNadirYaw: updateNadirYaw,
  update: update,
  drawOcclusion: drawOcclusion,
  shaderProgram: null,
  fileList: null,
  loaded: false,
};
