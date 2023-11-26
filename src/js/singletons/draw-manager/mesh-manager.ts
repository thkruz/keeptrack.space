/* */

import { keepTrackApi } from '@app/js/keepTrackApi';
import { DEG2RAD } from '@app/js/lib/constants';
import { OBJ } from '@app/js/lib/external/webgl-obj-loader.js';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { Kilometers, Radians, TleLine1, TleLine2 } from 'ootk';
import { SatObject } from '../../interfaces';
import { SpaceObjectType } from '../../lib/space-object-type';
import { SatMath } from '../../static/sat-math';
import { SplashScreen } from '../../static/splash-screen';
import { errorManagerInstance } from '../errorManager';
import { OcclusionProgram } from './post-processing';

type MeshModel = {
  id: number;
  mesh: {
    vertices: number[];
    vertexBuffer: WebGLBuffer;
    indexBuffer: {
      numItems: number;
    };
  };
};

export interface MeshObject extends SatObject {
  inSun: number;
  model: MeshModel;
  nadirYaw: Radians;
}

export class MeshManager {
  private attrIndices_ = {};
  private attribs_: {
    aVertexPosition: number;
    aVertexNormal: number;
    aTextureCoord: number;
    aAmbient: number;
    aDiffuse: number;
    aSpecular: number;
    aSpecularExponent: number;
  };

  private earthLightDirection_: vec3;
  private fileList_: { obj: string; mtl: string }[] = [];
  private gl_: WebGL2RenderingContext;
  private isReady_ = false;
  private meshList_: string[] = [];
  private meshes_ = {};
  private numOfWarnings_: number;
  private program_: WebGLProgram;
  private sccNumAehf_ = ['36868', '38254', '39256', '43651', '44481', '45465'];
  private sccNumDsp_ = [
    '04630',
    '05204',
    '05851',
    '06691',
    '08482',
    '08916',
    '09803',
    '11397',
    '12339',
    '13086',
    '14930',
    '15453',
    '18583',
    '20066',
    '20929',
    '21805',
    '23435',
    '24737',
    '26356',
    '26880',
    '28158',
  ];

  private sccNumIss_ = '25544';
  private sccNumTianhe_ = '48274';
  private shader_ = {
    frag: `#version 300 es
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
      vec3 dirColor = vDiffuse * vAmbient * lightAmt * (min(vInSun,1.0) * 0.2);
      vec3 specColor = vSpecular * lightAmt * (min(vInSun,1.0) * 0.2);

      vec3 color = ambientColor + dirColor + specColor;

      fragColor = vec4(color, 1.0);
    }
  `,
    vert: `#version 300 es
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
  };

  private uniforms_ = {
    uPMatrix: <WebGLUniformLocation>null,
    uCamMatrix: <WebGLUniformLocation>null,
    uMvMatrix: <WebGLUniformLocation>null,
    uNormalMatrix: <WebGLUniformLocation>null,
    uLightDirection: <WebGLUniformLocation>null,
    uInSun: <WebGLUniformLocation>null,
  };

  public calculateNadirYaw_: () => Radians;
  public currentMeshObject: MeshObject = {
    static: false,
    inSun: 0,
    nadirYaw: <Radians>0,
    model: null,
    position: {
      x: <Kilometers>0,
      y: <Kilometers>0,
      z: <Kilometers>0,
    },
    id: 0,
    source: '',
    altId: '',
    active: false,
    apogee: 0,
    argPe: 0,
    az: 0,
    dec: 0,
    eccentricity: 0,
    el: 0,
    inclination: 0,
    lon: 0,
    meanMotion: 0,
    perigee: 0,
    period: 0,
    ra: 0,
    raan: 0,
    rae: null,
    satrec: null,
    semiMajorAxis: 0,
    semiMinorAxis: 0,
    setRAE: null,
    staticNum: 0,
    TLE1: '' as TleLine1,
    TLE2: '' as TleLine2,
    type: SpaceObjectType.UNKNOWN,
    velocity: {
      total: 0,
      x: 0,
      y: 0,
      z: 0,
    },
  };

  public models = {
    starlink: null,
    globalstar: null,
    iridium: null,
    orbcomm: null,
    o3b: null,
    gps: null,
    galileo: null,
    glonass: null,
    beidou: null,
    iss: null,
    aehf: null,
    dsp: null,
    other: null,
    sbirs: null,
    flock: null,
    lemur: null,
    spacebee1gen: null,
    spacebee2gen: null,
    spacebee3gen: null,
    s1u: null,
    s2u: null,
    s3u: null,
    oneweb: null,
    sat2: null,
    rocketbody: null,
    debris0: null,
    debris1: null,
    debris2: null,
  };

  public checkIfNameKnown(name: string): boolean {
    // TODO: Currently all named models aim at nadir - that isn't always true

    let newModel = null;
    if (name.startsWith('STARLINK')) newModel = this.models.starlink;
    if (name.startsWith('GLOBALSTAR')) newModel = this.models.globalstar;
    if (name.startsWith('IRIDIUM')) newModel = this.models.iridium;
    if (name.startsWith('ORBCOMM')) newModel = this.models.orbcomm;
    if (name.startsWith('O3B')) newModel = this.models.o3b;
    if (name.startsWith('NAVSTAR')) newModel = this.models.gps;
    if (name.startsWith('GALILEO')) newModel = this.models.galileo;
    if (name.startsWith('SBIRS')) newModel = this.models.sbirs;
    if (name.startsWith('FLOCK')) newModel = this.models.flock;
    if (name.startsWith('LEMUR')) newModel = this.models.lemur;

    if (newModel !== null) {
      this.currentMeshObject.model = newModel;
      return true;
    }

    return false;
  }

  public draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer: WebGLBuffer) {
    // Meshes aren't finished loading
    if (settingsManager.disableUI || settingsManager.isDrawLess) return;
    if (!this.isReady_) return;
    if (typeof this.currentMeshObject.id == 'undefined' || typeof this.currentMeshObject.model == 'undefined' || this.currentMeshObject.id == -1 || this.currentMeshObject.static)
      return;

    if (this.currentMeshObject.model === null) {
      errorManagerInstance.debug('Race Condition: Mesh Object Model is null');
      return;
    }

    const gl = this.gl_;

    // Move the mesh to its location in world space
    const mvMatrix = mat4.create();
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(this.currentMeshObject.position.x, this.currentMeshObject.position.y, this.currentMeshObject.position.z));

    // Rotate the Satellite to Face Nadir if needed
    if (this.currentMeshObject.nadirYaw !== null) {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const sat = catalogManagerInstance.getSat(this.currentMeshObject.id);
      const drawPosition = vec3.fromValues(sat.position.x, sat.position.y, sat.position.z);

      // Calculate a position to look at along the satellite's velocity vector
      const lookAtPos = [sat.position.x + sat.velocity.x, sat.position.y + sat.velocity.y, sat.position.z + sat.velocity.z];

      const up = vec3.normalize(vec3.create(), drawPosition);

      mat4.targetTo(mvMatrix, drawPosition, lookAtPos, up);

      // TODO: Remove this code and the nadirYaw property from MeshObject
      // Rotate the mesh to face nadir
      // mat4.rotateZ(mvMatrix, mvMatrix, this.currentMeshObject.nadirYaw);
    }

    // Scale the mvMatrix to 1/5 (models are too big)
    if (this.currentMeshObject.sccNum !== '25544') {
      mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(0.2, 0.2, 0.2));
    } else {
      mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(0.05, 0.05, 0.05));
    }

    // Allow Manual Rotation of Meshes
    mat4.rotateX(mvMatrix, mvMatrix, settingsManager.meshRotation.x * DEG2RAD);
    mat4.rotateY(mvMatrix, mvMatrix, settingsManager.meshRotation.y * DEG2RAD);
    mat4.rotateZ(mvMatrix, mvMatrix, settingsManager.meshRotation.z * DEG2RAD);

    // Assign the normal matrix the opposite of the mvMatrix
    const nMatrix = mat3.create();
    mat3.normalFromMat4(nMatrix, mvMatrix);

    gl.enable(gl.BLEND);

    // Use the mesh shader program
    gl.useProgram(this.program_);

    // Determine where we are drawing
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Assign uniforms
    gl.uniform3fv(this.uniforms_.uLightDirection, this.earthLightDirection_);
    gl.uniformMatrix3fv(this.uniforms_.uNormalMatrix, false, <Float32Array>(<unknown>nMatrix));
    gl.uniformMatrix4fv(this.uniforms_.uMvMatrix, false, <Float32Array>(<unknown>mvMatrix));
    gl.uniformMatrix4fv(this.uniforms_.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.uCamMatrix, false, camMatrix);
    gl.uniform1f(this.uniforms_.uInSun, this.currentMeshObject.inSun);

    // Assign vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.currentMeshObject.model.mesh.vertexBuffer);
    this.changeVertexAttribArrays(true);
    this.applyAttributePointers_(this.currentMeshObject.model);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.currentMeshObject.model.mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.currentMeshObject.model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    // disable attributes
    this.changeVertexAttribArrays(false);
    gl.disable(gl.BLEND);
  }

  public drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLBuffer) {
    if (settingsManager.disableUI || settingsManager.isDrawLess) return;
    if (typeof this.currentMeshObject?.id == 'undefined' || this.currentMeshObject?.id == -1 || this.currentMeshObject.static) return;

    const gl = this.gl_;

    try {
      // Move the mesh to its location in world space
      const mvMatrix = mat4.create();
      mat4.identity(mvMatrix);
      mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(this.currentMeshObject.position.x, this.currentMeshObject.position.y, this.currentMeshObject.position.z));

      // Rotate the Satellite to Face Nadir if needed
      if (this.currentMeshObject.nadirYaw !== null) {
        mat4.rotateZ(mvMatrix, mvMatrix, this.currentMeshObject.nadirYaw);
      }

      // Scale the mvMatrix to 1/5 (models are too big)
      if (this.currentMeshObject.sccNum !== '25544') {
        mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(0.2, 0.2, 0.2));
      } else {
        mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(0.05, 0.05, 0.05));
      }

      // Allow Manual Rotation of Meshes
      mat4.rotateX(mvMatrix, mvMatrix, settingsManager.meshRotation.x * DEG2RAD);
      mat4.rotateY(mvMatrix, mvMatrix, settingsManager.meshRotation.y * DEG2RAD);
      mat4.rotateZ(mvMatrix, mvMatrix, settingsManager.meshRotation.z * DEG2RAD);

      // Change to the earth shader
      gl.useProgram(occlusionPrgm.program);
      // Change to the main drawing buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

      occlusionPrgm.attrSetup(this.currentMeshObject.model.mesh.vertexBuffer, 80);

      // Set the uniforms
      occlusionPrgm.uniformSetup(mvMatrix, pMatrix, camMatrix);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.currentMeshObject.model.mesh.indexBuffer);
      gl.drawElements(gl.TRIANGLES, this.currentMeshObject.model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

      occlusionPrgm.attrOff();
    } catch {
      return;
    }
  }

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  // prettier-ignore
  public getSatelliteModel(sat: SatObject, selectedDate: Date) { // NOSONAR
    if (this.checkIfNameKnown(sat.name)) {
      this.updateNadirYaw(SatMath.calculateNadirYaw(sat.position, selectedDate));
      return;
    }

    if (sat.sccNum === this.sccNumIss_) {
      this.updateNadirYaw(SatMath.calculateNadirYaw(sat.position, selectedDate));
      this.currentMeshObject.model = this.models.iss;
      return;
    }

    /**
     * Temporary solution for Tianhe-1
     * TODO: Create a real model for Tianhe-1
     */
    if (sat.sccNum === this.sccNumTianhe_) {
      this.updateNadirYaw(SatMath.calculateNadirYaw(sat.position, selectedDate));
      this.currentMeshObject.model = this.models.iss;
      return;
    }

    if (this.sccNumAehf_.findIndex((num) => sat.sccNum == num) !== -1) {
      this.updateNadirYaw(SatMath.calculateNadirYaw(sat.position, selectedDate));
      this.currentMeshObject.model = this.models.aehf;
      return;
    }

    if (this.sccNumDsp_.findIndex((num) => sat.sccNum == num) !== -1) {
      this.updateNadirYaw(SatMath.calculateNadirYaw(sat.position, selectedDate));
      this.currentMeshObject.model = this.models.dsp;
      return;
    }

    switch (sat.bus) {
      case 'Cubesat 0.25U':
        if (sat.intlDes.startsWith('2018')) {
          this.currentMeshObject.model = this.models.spacebee1gen;
        } else if (sat.name.startsWith('SPACEBEE')) {
          this.currentMeshObject.model = this.models.spacebee3gen;
        } else {
          this.currentMeshObject.model = this.models.spacebee1gen;
        }
        return;
      case 'Cubesat':
      case 'Cubesat 1U':
        if (sat.name.startsWith('SPACEBEE')) {
          this.currentMeshObject.model = this.models.spacebee2gen;
        } else {
          this.currentMeshObject.model = this.models.s1u;
        }
        return;
      case 'Cubesat 2U':
        this.currentMeshObject.model = this.models.s2u;
        return;
      case 'Cubesat 3U':
      case 'Cubesat 3U+':
        this.currentMeshObject.model = this.models.s3u;
        return;
      case 'DSP':
      case 'DSP B14':
      case 'DSP B18':
      case 'DSP MOS/PIM':
      case 'DSP P2U':
      case 'DSP P2':
        this.currentMeshObject.model = this.models.dsp;
        return;
      case 'GPS':
      case 'GPS II':
      case 'GPS IIA':
      case 'GPS IIF':
      case 'GPS IIR':
        this.currentMeshObject.model = this.models.gps;
        return;
      case 'Iridium':
        this.currentMeshObject.model = this.models.iridium;
        return;
      case 'ARROW':
        this.currentMeshObject.model = this.models.oneweb;
        this.updateNadirYaw(SatMath.calculateNadirYaw(sat.position, selectedDate));
        return;
      case 'Cubesat 1.5U':
      case 'Cubesat 6U':
      case 'Cubesat 0.5U':
      case 'Cubesat 16U':
      case 'Cubesat 12U':
      case 'Cubesat 0.3U':
      default:
      // Do Nothing
    }

    const rcs = parseFloat(sat.rcs);
    switch (true) {
      case rcs < 0.1 && rcs > 0.04:
        this.currentMeshObject.model = this.models.s1u;
        return;
      case rcs < 0.22 && rcs >= 0.1:
        this.currentMeshObject.model = this.models.s2u;
        return;
      case rcs < 0.33 && rcs >= 0.22:
        this.currentMeshObject.model = this.models.s3u;
        return;
      default:
      // Generic Model
    }

    this.currentMeshObject.model = this.models.sat2;
  }

  public async init(gl: WebGL2RenderingContext, earthLightDirection: vec3): Promise<void> {
    try {
      if (settingsManager.disableUI || settingsManager.isDrawLess) return;

      this.gl_ = gl;
      this.earthLightDirection_ = earthLightDirection;

      this.meshList_ =
        settingsManager.meshListOverride.length > 0
          ? settingsManager.meshListOverride
          : [
              'sat2',
              's1u',
              's2u',
              's3u',
              'starlink',
              'iss',
              'gps',
              'aehf',
              'dsp',
              'flock',
              'lemur',
              'galileo',
              'o3b',
              'oneweb',
              'orbcomm',
              'spacebee1gen',
              'spacebee2gen',
              'spacebee3gen',
              'iridium',
              'globalstar',
              'debris0',
              'debris1',
              'debris2',
              'rocketbody',
              'sbirs',
              'misl',
              'misl2',
              'misl3',
              'misl4',
              'rv',
            ];

      settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];

      this.fileList_ = [];

      // Don't Continue until you have populated the mesh list
      this.populateFileList();

      // Changes Loading Screen Text
      SplashScreen.loadStr(SplashScreen.msg.models);

      let p = OBJ.downloadModels(this.fileList_);

      p.then((models: any[]) => {
        // DEBUG:
        // for (var [name, mesh] of Object.entries(models)) {
        //   console.debug('Name:', name);
        //   console.debug('Mesh:', mesh);
        // }
        this.meshes_ = models;
        this.initShaders();
        this.initBuffers();
        this.isReady_ = true;
        // eslint-disable-next-line no-unused-vars
      }).catch(() => {
        // DEBUG:
        // console.warn(error);
      });
    } catch {
      // DEBUG:
      // console.debug(error);
    }
  }

  public setCurrentModel(model: MeshModel) {
    this.currentMeshObject.id = model.id;
    this.currentMeshObject.model = model;
  }

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  // prettier-ignore
  public update(selectedDate: Date, sat: SatObject) { // NOSONAR
    try {
      this.currentMeshObject.id = (typeof sat?.id !== 'undefined') ? sat.id : -1;
      this.currentMeshObject.static = sat?.static || false;

      if (typeof this.currentMeshObject.id == 'undefined' || this.currentMeshObject.id == -1 || this.currentMeshObject.static) return;
      if (settingsManager.modelsOnSatelliteViewOverride) return;

      this.updatePosition(sat.position);

      const drawManagerInstance = keepTrackApi.getDrawManager();

      this.currentMeshObject.inSun = SatMath.calculateIsInSun(sat, drawManagerInstance.sceneManager.sun.eci);
      this.currentMeshObject.nadirYaw = null;

      if (settingsManager.meshOverride) {
        if (typeof this.models[settingsManager.meshOverride] === 'undefined') {
          console.debug(`Mesh override not found: ${settingsManager.meshOverride}`);
          settingsManager.meshOverride = null;
        } else {
          this.currentMeshObject.model = this.models[settingsManager.meshOverride];
          return;
        }
      }

      switch (sat.type) {
        case SpaceObjectType.PAYLOAD:
          this.getSatelliteModel(sat, selectedDate);
          return;
        case SpaceObjectType.ROCKET_BODY:
          // TODO: Add more rocket body models
          this.currentMeshObject.model = this.models.rocketbody;
          return;
        case SpaceObjectType.DEBRIS:
          // TODO: Add more debris models
          if (parseInt(sat.sccNum) <= 20000) {
            this.currentMeshObject.model = this.models.debris0;
          } else if (parseInt(sat.sccNum) <= 35000) {
            this.currentMeshObject.model = this.models.debris1;
          } else if (parseInt(sat.sccNum) > 35000) {
            this.currentMeshObject.model = this.models.debris2;
          } else {
            this.currentMeshObject.model = this.models.debris0;
          }
          return;
        default:
          // Generic Model
          this.currentMeshObject.model = this.models.sat2;
      }
    } catch {
      // Don't Let meshManager break everything
    }
  }

  public updateNadirYaw(yaw: Radians) {
    this.currentMeshObject.nadirYaw = yaw;
  }

  public updatePosition(pos: { x: Kilometers; y: Kilometers; z: Kilometers }) {
    this.currentMeshObject.position = pos;
  }

  private applyAttributePointers_(model: any) {
    const gl = this.gl_;
    const layout = model.mesh.vertexBuffer.layout;
    for (const attrName in this.attribs_) {
      if (!Object.prototype.hasOwnProperty.call(this.attribs_, attrName) || this.attrIndices_[attrName] == -1) {
        continue;
      }
      const layoutKey = this.attribs_[attrName];
      if (typeof this.attrIndices_[attrName] !== 'undefined' && this.attrIndices_[attrName] != -1) {
        const attr = layout.attributeMap[layoutKey];
        gl.vertexAttribPointer(this.attrIndices_[attrName], attr.size, gl[attr.type], attr.normalized, attr.stride, attr.offset);
      }
    }
  }

  private changeVertexAttribArrays(enable: boolean) {
    const gl = this.gl_;
    for (const attrName in this.attribs_) {
      if (!Object.prototype.hasOwnProperty.call(this.attribs_, attrName)) {
        continue;
      }
      this.attrIndices_[attrName] = gl.getAttribLocation(this.program_, attrName);
      if (this.attrIndices_[attrName] != -1) {
        if (enable) {
          gl.enableVertexAttribArray(this.attrIndices_[attrName]);
        } else {
          gl.disableVertexAttribArray(this.attrIndices_[attrName]);
        }
      } else if (this.numOfWarnings_ < 10) {
        console.warn('Shader attribute "' + attrName + '" not found in shader. Is it undeclared or unused in the shader code?');
        this.numOfWarnings_++;
      }
    }
  }

  private initBuffers() {
    const gl = this.gl_;
    const layout = new OBJ.Layout(OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.UV, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT);

    // initialize the mesh's buffers
    for (const mesh in this.meshes_) {
      try {
        // Create the vertex buffer for this mesh
        const vertexBuffer = <any>gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        const vertexData = this.meshes_[mesh].makeBufferData(layout);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
        vertexBuffer.numItems = vertexData.numItems;
        vertexBuffer.layout = layout;
        this.meshes_[mesh].vertexBuffer = vertexBuffer;

        // Create the index buffer for this mesh
        const indexBuffer = <any>gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const indexData = this.meshes_[mesh].makeIndexBufferDataForMaterials(...Object.values(this.meshes_[mesh].materialIndices));
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
        indexBuffer.numItems = indexData.numItems;
        this.meshes_[mesh].indexBuffer = indexBuffer;

        // this loops through the mesh names and creates new
        // model objects and setting their mesh to the current mesh
        this.models[mesh] = {};
        this.models[mesh].mesh = this.meshes_[mesh];
        // DEBUG:
        // this.models[mesh].size = this.sizeInfo[mesh];
      } catch (error) {
        // DEBUG:
        // console.warn(error);
      }
    }
  }

  private initShaders() {
    const gl = this.gl_;

    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    let fragCode = this.shader_.frag;
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    let vertShader = gl.createShader(gl.VERTEX_SHADER);
    let vertCode = this.shader_.vert;
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    this.program_ = gl.createProgram();
    gl.attachShader(this.program_, vertShader);
    gl.attachShader(this.program_, fragShader);
    gl.linkProgram(this.program_);

    if (!gl.getProgramParameter(this.program_, gl.LINK_STATUS)) {
      console.log('Could not initialise shaders');
    }
    gl.useProgram(this.program_);

    this.attribs_ = {
      aVertexPosition: OBJ.Layout.POSITION.key,
      aVertexNormal: OBJ.Layout.NORMAL.key,
      aTextureCoord: OBJ.Layout.UV.key,
      aAmbient: OBJ.Layout.AMBIENT.key,
      aDiffuse: OBJ.Layout.DIFFUSE.key,
      aSpecular: OBJ.Layout.SPECULAR.key,
      aSpecularExponent: OBJ.Layout.SPECULAR_EXPONENT.key,
    };

    this.uniforms_.uPMatrix = gl.getUniformLocation(this.program_, 'uPMatrix');
    this.uniforms_.uCamMatrix = gl.getUniformLocation(this.program_, 'uCamMatrix');
    this.uniforms_.uMvMatrix = gl.getUniformLocation(this.program_, 'uMvMatrix');
    this.uniforms_.uNormalMatrix = gl.getUniformLocation(this.program_, 'uNormalMatrix');
    this.uniforms_.uLightDirection = gl.getUniformLocation(this.program_, 'uLightDirection');
    this.uniforms_.uInSun = gl.getUniformLocation(this.program_, 'uInSun');
  }

  private populateFileList(): void {
    try {
      for (let i = 0; i < this.meshList_.length; i++) {
        let meshFiles = {
          obj: `${settingsManager.installDirectory}meshes/${this.meshList_[i]}.obj`,
          mtl: `${settingsManager.installDirectory}meshes/${this.meshList_[i]}.mtl`,
        };
        this.fileList_.push(meshFiles);
      }
    } catch (error) {
      // DEBUG:
      // console.debug(error);
    }
  }
}
