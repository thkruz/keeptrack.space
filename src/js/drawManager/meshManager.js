/* */

import * as glm from '@app/js/lib/external/gl-matrix.js';
import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants.js';
import { OBJ } from '@app/js/lib/external/webgl-obj-loader.js';
const meshManager = {};
let gl, earth;

const meshList = ['sat2', 's1u', 's2u', 's3u', 'starlink', 'iss', 'gps', 'aehf', 'dsp', 'galileo', 'o3b', 'orbcomm', 'iridium', 'globalstar', 'debris0', 'debris1', 'debris2', 'rocketbody'];

let mvMatrix;
let nMatrix;

meshManager.isReady = false;
meshManager.init = async (glRef, earthRef) => {
  try {
    if (settingsManager.disableUI || settingsManager.isDrawLess) return;

    gl = glRef;
    earth = earthRef;

    settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];

    meshManager.fileList = [];

    // Don't Continue until you have populated the mesh list
    await meshManager.populateFileList();

    let p = OBJ.downloadModels(meshManager.fileList);

    p.then((models) => {
      // eslint-disable-next-line no-unused-vars
      for (var [name, mesh] of Object.entries(models)) {
        // console.log("Name:", name);
        // console.log("Mesh:", mesh);
      }
      meshManager.meshes = models;
      meshManager.initShaders();
      meshManager.initBuffers();
      meshManager.isReady = true;
    });
  } catch (error) {
    console.error(error);
  }
};

meshManager.populateFileList = () => {
  try {
    for (var i = 0; i < meshList.length; i++) {
      let meshFiles = {
        obj: `${settingsManager.installDirectory}meshes/${meshList[i]}.obj`,
        mtl: `${settingsManager.installDirectory}meshes/${meshList[i]}.mtl`,
      };
      meshManager.fileList.push(meshFiles);
    }
  } catch (error) {
    console.error(error);
  }
};

meshManager.initShaders = () => {
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

  const attrs = {
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

  meshManager.shaderProgram.applyAttributePointers = function (model) {
    const layout = model.mesh.vertexBuffer.layout;
    for (const attrName in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, attrName) || meshManager.shaderProgram.attrIndices[attrName] == -1) {
        continue;
      }
      const layoutKey = attrs[attrName];
      if (meshManager.shaderProgram.attrIndices[attrName] != -1) {
        const attr = layout.attributeMap[layoutKey];
        gl.vertexAttribPointer(meshManager.shaderProgram.attrIndices[attrName], attr.size, gl[attr.type], attr.normalized, attr.stride, attr.offset);
      }
    }
  };
  // eslint-disable-next-line no-unused-vars
  meshManager.shaderProgram.enableVertexAttribArrays = function (model) {
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
  // eslint-disable-next-line no-unused-vars
  meshManager.shaderProgram.disableVertexAttribArrays = function (model) {
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
};
meshManager.initBuffers = () => {
  var layout = new OBJ.Layout(OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.UV, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT);

  // initialize the mesh's buffers
  for (var mesh in meshManager.meshes) {
    try {
      // Create the vertex buffer for this mesh
      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      var vertexData = meshManager.meshes[mesh].makeBufferData(layout);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
      vertexBuffer.numItems = vertexData.numItems;
      vertexBuffer.layout = layout;
      meshManager.meshes[mesh].vertexBuffer = vertexBuffer;

      // Create the index buffer for this mesh
      var indexBuffer = gl.createBuffer();
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

meshManager.lerpPosition = (pos, dt) => {
  meshManager.currentModel.position.x = pos.x + (meshManager.currentModel.position.x - pos.x) * dt;
  meshManager.currentModel.position.y = pos.y + (meshManager.currentModel.position.y - pos.y) * dt;
  meshManager.currentModel.position.z = pos.z + (meshManager.currentModel.position.z - pos.z) * dt;
};

meshManager.updatePosition = (pos) => {
  meshManager.currentModel.position = pos;
};

// main shader program
meshManager.fragShaderCode = `#version 300 es
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
  `;
meshManager.vertShaderCode = `#version 300 es    
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
  `;
// main app object
meshManager.meshes = {};
meshManager.models = {};
meshManager.currentModel = {
  position: { x: 0, y: 0, z: 0 },
};
meshManager.mvMatrix = glm.mat4.create();
meshManager.mvMatrixStack = [];
meshManager.pMatrix = glm.mat4.create();
meshManager.draw = (pMatrix, camMatrix, tgtBuffer) => {
  // Meshes aren't finished loading
  if (settingsManager.disableUI || settingsManager.isDrawLess) return;
  if (!meshManager.loaded) return;
  if (typeof meshManager.currentModel.id == 'undefined' || meshManager.currentModel.id == -1 || meshManager.currentModel.static) return;

  // Move the mesh to its location in world space
  mvMatrix = glm.mat4.create();
  glm.mat4.identity(mvMatrix);
  glm.mat4.translate(mvMatrix, mvMatrix, glm.vec3.fromValues(meshManager.currentModel.position.x, meshManager.currentModel.position.y, meshManager.currentModel.position.z));

  // Rotate the Satellite to Face Nadir if needed
  if (meshManager.currentModel.nadirYaw !== null) {
    glm.mat4.rotateZ(mvMatrix, mvMatrix, meshManager.currentModel.nadirYaw);
  }

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
  gl.uniformMatrix3fv(meshManager.shaderProgram.uNormalMatrix, false, nMatrix);
  gl.uniformMatrix4fv(meshManager.shaderProgram.uMvMatrix, false, mvMatrix);
  gl.uniformMatrix4fv(meshManager.shaderProgram.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(meshManager.shaderProgram.uCamMatrix, false, camMatrix);
  gl.uniform1f(meshManager.shaderProgram.uInSun, meshManager.currentModel.inSun);

  // Assign vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, meshManager.currentModel.model.mesh.vertexBuffer);
  meshManager.shaderProgram.enableVertexAttribArrays(meshManager.currentModel.model);
  meshManager.shaderProgram.applyAttributePointers(meshManager.currentModel.model);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshManager.currentModel.model.mesh.indexBuffer);
  gl.drawElements(gl.TRIANGLES, meshManager.currentModel.model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

  // disable attributes
  meshManager.shaderProgram.disableVertexAttribArrays(meshManager.currentModel.model);
  gl.disable(gl.BLEND);
};

meshManager.updateNadirYaw = (Camera, sat, timeManager) => {
  meshManager.currentModel.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * RAD2DEG, timeManager.selectedDate) + 180 * DEG2RAD;
};

meshManager.update = (Camera, cameraManager, timeManager, sat = { id: -1, static: false }) => {
  meshManager.currentModel.id = sat.id;
  meshManager.currentModel.static = sat.static;

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

  if (sat.SCC_NUM == 25544) {
    meshManager.updateNadirYaw(Camera, sat, timeManager);
    meshManager.currentModel.model = meshManager.models.iss;
    return;
  }

  if (sat.OT == 1) {
    // Default Satellite
    if (sat.ON.slice(0, 5) == 'FLOCK' || sat.ON.slice(0, 5) == 'LEMUR') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.s3u;
      return;
    }
    if (sat.ON.slice(0, 8) == 'STARLINK') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.starlink;
      return;
    }

    if (sat.ON.slice(0, 10) == 'GLOBALSTAR') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.globalstar;
      return;
    }

    if (sat.ON.slice(0, 7) == 'IRIDIUM') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.iridium;
      return;
    }

    if (sat.ON.slice(0, 7) == 'ORBCOMM') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.orbcomm;
      return;
    }

    if (sat.ON.slice(0, 3) == 'O3B') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.o3b;
      return;
    }

    // Is this a GPS Satellite (Called NAVSTAR)
    if (sat.ON.slice(0, 7) == 'NAVSTAR' || sat.ON.slice(10, 17) == 'NAVSTAR') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.gps;
      return;
    }

    // Is this a Galileo Satellite
    if (sat.ON.slice(0, 7) == 'GALILEO') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.galileo;
      return;
    }

    // Is this a DSP Satellite?
    if (
      sat.SCC_NUM == '04630' ||
      sat.SCC_NUM == '05204' ||
      sat.SCC_NUM == '05851' ||
      sat.SCC_NUM == '06691' ||
      sat.SCC_NUM == '08482' ||
      sat.SCC_NUM == '08916' ||
      sat.SCC_NUM == '09803' ||
      sat.SCC_NUM == '11397' ||
      sat.SCC_NUM == '12339' ||
      sat.SCC_NUM == '13086' ||
      sat.SCC_NUM == '14930' ||
      sat.SCC_NUM == '15453' ||
      sat.SCC_NUM == '18583' ||
      sat.SCC_NUM == '20066' ||
      sat.SCC_NUM == '20929' ||
      sat.SCC_NUM == '21805' ||
      sat.SCC_NUM == '23435' ||
      sat.SCC_NUM == '24737' ||
      sat.SCC_NUM == '26356' ||
      sat.SCC_NUM == '26880' ||
      sat.SCC_NUM == '28158'
    ) {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
      meshManager.currentModel.model = meshManager.models.dsp;
      return;
    }

    // Is this an AEHF Satellite?
    if (sat.SCC_NUM == '36868' || sat.SCC_NUM == '38254' || sat.SCC_NUM == '39256' || sat.SCC_NUM == '43651' || sat.SCC_NUM == '44481' || sat.SCC_NUM == '45465') {
      meshManager.updateNadirYaw(Camera, sat, timeManager);
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
    if (sat.SCC_NUM <= 20000) {
      // Debris
      meshManager.currentModel.model = meshManager.models.debris0;
      return;
    } else if (sat.SCC_NUM <= 35000) {
      // Debris
      meshManager.currentModel.model = meshManager.models.debris1;
      return;
    } else if (sat.SCC_NUM > 35000) {
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

meshManager.drawOcclusion = function (pMatrix, camMatrix, occlusionPrgm, tgtBuffer) {
  if (settingsManager.disableUI || settingsManager.isDrawLess) return;
  if (typeof meshManager.currentModel.id == 'undefined' || meshManager.currentModel.id == -1 || meshManager.currentModel.static) return;

  try {
    // Move the mesh to its location in world space
    mvMatrix = glm.mat4.create();
    glm.mat4.identity(mvMatrix);
    glm.mat4.translate(mvMatrix, mvMatrix, glm.vec3.fromValues(meshManager.currentModel.position.x, meshManager.currentModel.position.y, meshManager.currentModel.position.z));

    // Rotate the Satellite to Face Nadir if needed
    if (meshManager.currentModel.nadirYaw !== null) {
      glm.mat4.rotateZ(mvMatrix, mvMatrix, meshManager.currentModel.nadirYaw);
    }

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

export { meshManager };
