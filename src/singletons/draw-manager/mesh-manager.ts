import { EciArr3, GetSatType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { BaseObject, DEG2RAD, Degrees, DetailedSatellite, EciVec3, EpochUTC, Kilometers, Radians, SpaceObjectType, Sun, Vec3, Vector3D } from 'ootk';
import { DownloadModelsOptions, Layout, Mesh, MeshMap, OBJ } from 'webgl-obj-loader';
import { SplashScreen } from '../../static/splash-screen';
import { MissileObject } from '../catalog-manager/MissileObject';
import { errorManagerInstance } from '../errorManager';
import { OcclusionProgram } from './post-processing';

type KeepTrackMesh = Mesh & {
  vertexBuffer: WebGLBuffer & {
    numItems: number;
    layout: Layout;
  };
  indexBuffer: WebGLBuffer & {
    numItems: number;
  };
};

type MeshModel = {
  id: number;
  mesh: KeepTrackMesh
};

export interface MeshObject {
  rotation: Vec3<Degrees>;
  id: number;
  position: EciVec3<Kilometers>;
  sccNum: string;
  inSun: number;
  model: MeshModel;
  isRotationStable: boolean;
}

export class MeshManager {
  private attrIndices_ = {};
  private attribs_: {
    aVertexPosition: string;
    aVertexNormal: string;
    aTextureCoord: string;
    aAmbient: string;
    aDiffuse: string;
    aSpecular: string;
    aSpecularExponent: string;
  };

  private fileList_: DownloadModelsOptions[] = [];
  private gl_: WebGL2RenderingContext;
  isReady = false;
  private meshList_: string[] = [];
  private meshes_: KeepTrackMesh;
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

  private uniforms_ = {
    uPMatrix: <WebGLUniformLocation><unknown>null,
    uCamMatrix: <WebGLUniformLocation><unknown>null,
    uMvMatrix: <WebGLUniformLocation><unknown>null,
    uNormalMatrix: <WebGLUniformLocation><unknown>null,
    uLightDirection: <WebGLUniformLocation><unknown>null,
    uInSun: <WebGLUniformLocation><unknown>null,
  };

  calculateNadirYaw_: () => Radians;
  currentMeshObject: MeshObject = {
    id: -1,
    position: { x: 0, y: 0, z: 0 } as EciVec3<Kilometers>,
    sccNum: '',
    inSun: 0,
    model: null as unknown as MeshModel,
    isRotationStable: false,
    rotation: { x: 0, y: 0, z: 0 } as Vec3<Degrees>,
  };

  models = <Record<string, MeshModel>><unknown>{
    aehf: null,
    // beidou: null,
    debris0: null,
    debris1: null,
    debris2: null,
    dsp: null,
    flock: null,
    galileo: null,
    globalstar: null,
    glonass: null,
    gps: null,
    iridium: null,
    iss: null,
    lemur: null,
    misl: null,
    misl2: null,
    misl3: null,
    misl4: null,
    o3b: null,
    oneweb: null,
    orbcomm: null,
    // other: null,
    rocketbody: null,
    rv: null,
    s1u: null,
    s2u: null,
    s3u: null,
    s6u: null,
    s12u: null,
    sat2: null,
    sbirs: null,
    ses: null,
    spacebee1gen: null,
    spacebee2gen: null,
    spacebee3gen: null,
    starlink: null,
    sateliotsat: null,
    sateliotsat2: null,
  };

  private mvMatrix_: mat4;
  private nMatrix_: mat3;

  checkIfNameKnown(name: string): boolean {
    // TODO: Currently all named models aim at nadir - that isn't always true

    let newModel = null as unknown as MeshModel;

    if (name.startsWith('STARLINK')) {
      newModel = this.models.starlink;
    }
    if (name.startsWith('GLOBALSTAR')) {
      newModel = this.models.globalstar;
    }
    if (name.startsWith('IRIDIUM')) {
      newModel = this.models.iridium;
    }
    if (name.startsWith('ORBCOMM')) {
      newModel = this.models.orbcomm;
    }
    if (RegExp(/SES\s\d+/u, 'u').exec(name)) {
      newModel = this.models.ses;
    }
    if (name.startsWith('O3B')) {
      newModel = this.models.o3b;
    }
    if (name.startsWith('NAVSTAR')) {
      newModel = this.models.gps;
    }
    if (name.startsWith('GALILEO')) {
      newModel = this.models.galileo;
    }
    if (name.includes('GLONASS')) {
      newModel = this.models.glonass;
    }
    if (name.startsWith('SBIRS')) {
      newModel = this.models.sbirs;
    }
    if (name.startsWith('FLOCK')) {
      newModel = this.models.flock;
    }
    if (name.startsWith('LEMUR')) {
      newModel = this.models.lemur;
    }

    if (newModel !== null) {
      this.currentMeshObject.model = newModel;

      return true;
    }

    return false;
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer = null as WebGLFramebuffer | null) {
    // Meshes aren't finished loading
    if (settingsManager.disableUI || settingsManager.isDrawLess || settingsManager.noMeshManager) {
      return;
    }
    if (!this.isReady) {
      return;
    }
    // Don't draw meshes if the camera is too far away
    if (keepTrackApi.getMainCamera().camDistBuffer >= settingsManager.nearZoomLevel) {
      return;
    }
    if (typeof this.currentMeshObject.id === 'undefined' || typeof this.currentMeshObject.model === 'undefined' || this.currentMeshObject.id === -1) {
      return;
    }

    if (this.currentMeshObject.model === null) {
      errorManagerInstance.debug('Race Condition: Mesh Object Model is null');

      return;
    }

    const gl = this.gl_;

    gl.enable(gl.BLEND);
    gl.useProgram(this.program_);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.uniform3fv(this.uniforms_.uLightDirection, keepTrackApi.getScene().earth.lightDirection);
    gl.uniformMatrix3fv(this.uniforms_.uNormalMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uMvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.uCamMatrix, false, camMatrix);
    gl.uniform1f(this.uniforms_.uInSun, this.currentMeshObject.inSun);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.currentMeshObject.model.mesh.vertexBuffer);
    this.changeVertexAttribArrays(true);
    this.applyAttributePointers_(this.currentMeshObject.model);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.currentMeshObject.model.mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.currentMeshObject.model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    this.changeVertexAttribArrays(false);
    gl.disable(gl.BLEND);
  }

  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLBuffer) {
    if (settingsManager.disableUI || settingsManager.isDrawLess) {
      return;
    }

    if (!this.currentMeshObject) {
      return;
    }
    if (typeof this.currentMeshObject?.id === 'undefined' || this.currentMeshObject?.id === -1) {
      return;
    }

    const gl = this.gl_;

    try {
      // Change to the earth shader
      gl.useProgram(occlusionPrgm.program);
      // Change to the main drawing buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

      occlusionPrgm.attrSetup(this.currentMeshObject.model.mesh.vertexBuffer, 80);

      // Set the uniforms
      occlusionPrgm.uniformSetup(this.mvMatrix_, pMatrix, camMatrix);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.currentMeshObject.model.mesh.indexBuffer);
      gl.drawElements(gl.TRIANGLES, this.currentMeshObject.model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

      occlusionPrgm.attrOff();
    } catch {
      // Don't let meshManager break everything
    }
  }

  /*
   * This is intentionally complex to reduce object creation and GC
   * Splitting it into subfunctions would not be optimal
   */
  // eslint-disable-next-line complexity
  getSatelliteModel(sat: DetailedSatellite) {
    if (this.checkIfNameKnown(sat.name)) {
      this.currentMeshObject.isRotationStable = true;

      return;
    }

    if (sat.sccNum === this.sccNumIss_) {
      this.currentMeshObject.isRotationStable = true;
      this.currentMeshObject.model = this.models.iss;

      return;
    }

    /**
     * Temporary solution for Tianhe-1
     * TODO: Create a real model for Tianhe-1
     */
    if (sat.sccNum === this.sccNumTianhe_) {
      this.currentMeshObject.isRotationStable = true;
      this.currentMeshObject.model = this.models.iss;

      return;
    }

    if (this.sccNumAehf_.findIndex((num) => sat.sccNum === num) !== -1) {
      this.currentMeshObject.isRotationStable = true;
      this.currentMeshObject.model = this.models.aehf;

      return;
    }

    if (this.sccNumDsp_.findIndex((num) => sat.sccNum === num) !== -1) {
      this.currentMeshObject.isRotationStable = true;
      this.currentMeshObject.model = this.models.dsp;

      return;
    }

    switch (sat.payload) {
      case 'Platform-3':
      case 'Sateliot-1':
        this.currentMeshObject.model = this.models.sateliotsat;

        return;
      case 'Sateliot-2':
      case 'Sateliot-3':
      case 'Sateliot-4':
        this.currentMeshObject.model = this.models.sateliotsat2;

        return;
      default:
        // Do Nothing
        break;
    }

    switch (sat.bus) {
      case 'sateliotsat':
        this.currentMeshObject.model = this.models.sateliotsat;

        return;

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
      case 'Cubesat 6U':
        this.currentMeshObject.model = this.models.s6u;

        return;
      case 'Cubesat 12U':
        this.currentMeshObject.model = this.models.s12u;

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
        this.currentMeshObject.isRotationStable = true;

        return;
      case 'Cubesat 1.5U':
      case 'Cubesat 0.5U':
      case 'Cubesat 16U':
      case 'Cubesat 0.3U':
      default:
      // Do Nothing
    }

    switch (!isNaN(sat.rcs as number)) {
      case sat.rcs! < 0.1 && sat.rcs! > 0.04:
        this.currentMeshObject.model = this.models.s1u;

        return;
      case sat.rcs! < 0.22 && sat.rcs! >= 0.1:
        this.currentMeshObject.model = this.models.s2u;

        return;
      case sat.rcs! < 0.33 && sat.rcs! >= 0.22:
        this.currentMeshObject.model = this.models.s3u;

        return;
      default:
      // Generic Model
    }

    this.currentMeshObject.model = this.models.sat2;
  }

  init(gl: WebGL2RenderingContext): void {
    try {
      if (settingsManager.disableUI || settingsManager.isDrawLess || settingsManager.noMeshManager) {
        return;
      }
      this.gl_ = gl;

      this.meshList_ = settingsManager.meshListOverride.length > 0 ? settingsManager.meshListOverride : Object.keys(this.models).map((mesh) => mesh.toLowerCase());

      settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];

      this.fileList_ = [];

      // Don't Continue until you have populated the mesh list
      this.populateFileList();

      // Changes Loading Screen Text
      SplashScreen.loadStr(SplashScreen.msg.models);

      OBJ.downloadModels(this.fileList_).then((models: MeshMap) => {
        /*
         * DEBUG:
         * for (var [name, mesh] of Object.entries(models)) {
         *   console.debug('Name:', name);
         *   console.debug('Mesh:', mesh);
         * }
         */
        this.meshes_ = models as unknown as KeepTrackMesh;
        this.initShaders();
        this.initBuffers();
        this.isReady = true;
      });
    } catch {
      errorManagerInstance.warn('Meshes failed to load!');
    }
  }

  setCurrentModel(model: MeshModel) {
    this.currentMeshObject.id = model.id;
    this.currentMeshObject.model = model;
  }

  update(selectedDate: Date, sat: DetailedSatellite | MissileObject) {
    if (!sat.isSatellite() && !sat.isMissile()) {
      return;
    }

    this.updateModel_(selectedDate, sat);

    const posData = keepTrackApi.getDotsManager().positionData;
    const position = {
      x: posData[sat.id * 3],
      y: posData[sat.id * 3 + 1],
      z: posData[sat.id * 3 + 2],
    };
    const drawPosition = [position.x, position.y, position.z] as EciArr3;

    // Move the mesh to its location in world space
    this.mvMatrix_ = mat4.create();
    mat4.translate(this.mvMatrix_, this.mvMatrix_, drawPosition);

    // Rotate the Satellite to Face Nadir if needed
    if (this.currentMeshObject.isRotationStable !== null) {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const sat = catalogManagerInstance.getObject(this.currentMeshObject.id, GetSatType.POSITION_ONLY);

      if (sat === null) {
        return;
      }

      // Calculate a position to look at along the satellite's velocity vector
      const lookAtPos = [drawPosition[0] + sat.velocity.x, drawPosition[1] + sat.velocity.y, drawPosition[2] + sat.velocity.z];

      let up: vec3;

      if (sat.isSatellite()) {
        up = vec3.normalize(vec3.create(), drawPosition);
      } else {
        // Up is perpendicular to the velocity vector
        up = vec3.cross(vec3.create(), vec3.fromValues(0, 1, 0), vec3.fromValues(sat.velocity.x, sat.velocity.y, sat.velocity.z));
      }

      mat4.targetTo(this.mvMatrix_, drawPosition, lookAtPos, up);
    }

    if (this.currentMeshObject.rotation?.x) {
      mat4.rotateX(this.mvMatrix_, this.mvMatrix_, this.currentMeshObject.rotation.x * DEG2RAD);
    }
    if (this.currentMeshObject.rotation?.y) {
      mat4.rotateY(this.mvMatrix_, this.mvMatrix_, this.currentMeshObject.rotation.y * DEG2RAD);
    }
    if (this.currentMeshObject.rotation?.z) {
      mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, this.currentMeshObject.rotation.z * DEG2RAD);
    }

    // Allow Manual Rotation of Meshes
    mat4.rotateX(this.mvMatrix_, this.mvMatrix_, settingsManager.meshRotation.x * DEG2RAD);
    mat4.rotateY(this.mvMatrix_, this.mvMatrix_, settingsManager.meshRotation.y * DEG2RAD);
    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, settingsManager.meshRotation.z * DEG2RAD);

    // Assign the normal matrix the opposite of the this.mvMatrix_
    this.nMatrix_ = mat3.create();
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private updateModel_(selectedDate: Date, obj: BaseObject) {
    try {
      this.currentMeshObject.id = typeof obj?.id !== 'undefined' ? obj.id : -1;

      if (typeof this.currentMeshObject.id === 'undefined' || this.currentMeshObject.id === -1) {
        return;
      }
      if (settingsManager.modelsOnSatelliteViewOverride) {
        return;
      }

      this.updatePosition(obj.position);

      const pos = new Vector3D(obj.position.x, obj.position.y, obj.position.z);

      this.currentMeshObject.inSun = Sun.lightingRatio(pos, Sun.position(EpochUTC.fromDateTime(selectedDate)));
      this.currentMeshObject.isRotationStable = false;

      if (settingsManager.meshOverride) {
        if (typeof this.models[settingsManager.meshOverride] === 'undefined') {
          errorManagerInstance.debug(`Mesh override not found: ${settingsManager.meshOverride}`);
          settingsManager.meshOverride = null;
        } else {
          this.currentMeshObject.model = this.models[settingsManager.meshOverride];

          return;
        }
      }

      if (obj.isMissile()) {
        this.getMislModel_(obj as MissileObject);
      } else {
        const sat = obj as DetailedSatellite;

        switch (sat.type) {
          case SpaceObjectType.PAYLOAD:
            this.getSatelliteModel(sat);

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
      }
    } catch {
      // Don't Let meshManager break everything
    }
  }

  private getMislModel_(misl: MissileObject) {
    this.currentMeshObject.isRotationStable = true;

    // After max alt it looks like an RV
    if (!misl.isGoingUp() && misl.lastTime > 20) {
      this.currentMeshObject.model = this.models.rv;

      return;
    }

    /*
     * Otherwise pick a random missile model, but use the
     * name so that it stays consistent between draws
     */
    const lastNumberInName = RegExp(/\d+$/u, 'u').exec(misl.name);

    if (lastNumberInName) {
      const number = parseInt(lastNumberInName[0]);

      if (number <= 2) {
        this.currentMeshObject.model = this.models.misl;
      } else if (number <= 4) {
        this.currentMeshObject.model = this.models.misl2;
      } else if (number <= 6) {
        this.currentMeshObject.model = this.models.misl3;
      } else if (number <= 8) {
        this.currentMeshObject.model = this.models.misl4;
      } else {
        this.currentMeshObject.model = this.models.misl;
      }
    } else {
      this.currentMeshObject.model = this.models.misl;
    }
  }

  updatePosition(targetPosition: { x: Kilometers; y: Kilometers; z: Kilometers }) {
    this.currentMeshObject.position.x = targetPosition.x;
    this.currentMeshObject.position.y = targetPosition.y;
    this.currentMeshObject.position.z = targetPosition.z;

  }

  private applyAttributePointers_(model: MeshModel) {
    const gl = this.gl_;
    const layout = model.mesh.vertexBuffer.layout;

    for (const attrName in this.attribs_) {
      if (!Object.prototype.hasOwnProperty.call(this.attribs_, attrName) || this.attrIndices_[attrName] === -1) {
        continue;
      }
      const layoutKey = this.attribs_[attrName];

      if (typeof this.attrIndices_[attrName] !== 'undefined' && this.attrIndices_[attrName] !== -1) {
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
      if (this.attrIndices_[attrName] !== -1) {
        if (enable) {
          gl.enableVertexAttribArray(this.attrIndices_[attrName]);
        } else {
          gl.disableVertexAttribArray(this.attrIndices_[attrName]);
        }
      } else if (this.numOfWarnings_ < 10) {
        errorManagerInstance.warn(`Shader attribute "${attrName}" not found in shader. Is it undeclared or unused in the shader code?`);
        this.numOfWarnings_++;
      }
    }
  }

  private initBuffers() {
    const gl = this.gl_;
    const layout = new OBJ.Layout(OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.UV, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT);

    // initialize the mesh's buffers
    for (const mesh in this.meshes_) {
      if (!Object.prototype.hasOwnProperty.call(this.meshes_, mesh)) {
        continue;
      }
      try {
        // Create the vertex buffer for this mesh
        const vertexBuffer = gl.createBuffer() as WebGLBuffer & {
          numItems: number;
          layout: Layout;
        };

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

        // Get the original vertex data
        const vertexData = this.meshes_[mesh].makeBufferData(layout);

        /*
         * Scale positions to 1/20th (assuming positions are first in layout)
         * Find the position attribute in the layout
         */
        const positionAttr = layout.attributeMap[OBJ.Layout.POSITION.key];

        if (positionAttr) {
          /*
           * vertexData is a Float32Array
           * For each vertex, scale the position components
           */
          const vertexArray = new Float32Array(vertexData);

          for (let i = 0; i < vertexArray.length; i += layout.stride / 4) {
            // positionAttr.offset is in bytes, convert to floats
            const posOffset = positionAttr.offset / 4;

            vertexArray[i + posOffset + 0] *= 0.05;
            vertexArray[i + posOffset + 1] *= 0.05;
            vertexArray[i + posOffset + 2] *= 0.05;
          }
        }

        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
        vertexBuffer.numItems = vertexData.numItems as number;
        vertexBuffer.layout = layout;
        this.meshes_[mesh].vertexBuffer = vertexBuffer;

        // Create the index buffer for this mesh
        const indexBuffer = gl.createBuffer() as WebGLBuffer & {
          numItems: number;
        };

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const indexData = this.meshes_[mesh].makeIndexBufferDataForMaterials(...Object.values(this.meshes_[mesh].materialIndices));

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
        indexBuffer.numItems = indexData.numItems as number;
        this.meshes_[mesh].indexBuffer = indexBuffer;

        /*
         * this loops through the mesh names and creates new
         * model objects and setting their mesh to the current mesh
         */
        this.models[mesh] = {
          id: -1,
          mesh: this.meshes_[mesh],
        };
        /*
         * DEBUG:
         * this.models[mesh].size = this.sizeInfo[mesh];
         */
      } catch (error) {
        /*
         * DEBUG:
         * console.warn(error);
         */
      }
    }
  }

  private initShaders() {
    const gl = this.gl_;

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!fragShader) {
      throw new Error('Could not create fragment shader');
    }

    const fragCode = this.shader_.frag;

    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    const vertShader = gl.createShader(gl.VERTEX_SHADER);

    if (!vertShader) {
      throw new Error('Could not create vertex shader');
    }

    const vertCode = this.shader_.vert;

    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    this.program_ = gl.createProgram();
    gl.attachShader(this.program_, vertShader);
    gl.attachShader(this.program_, fragShader);
    gl.linkProgram(this.program_);

    if (!gl.getProgramParameter(this.program_, gl.LINK_STATUS)) {
      errorManagerInstance.warn('Could not initialise shaders');
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

    this.uniforms_.uPMatrix = gl.getUniformLocation(this.program_, 'uPMatrix') as WebGLUniformLocation;
    this.uniforms_.uCamMatrix = gl.getUniformLocation(this.program_, 'uCamMatrix') as WebGLUniformLocation;
    this.uniforms_.uMvMatrix = gl.getUniformLocation(this.program_, 'uMvMatrix') as WebGLUniformLocation;
    this.uniforms_.uNormalMatrix = gl.getUniformLocation(this.program_, 'uNormalMatrix') as WebGLUniformLocation;
    this.uniforms_.uLightDirection = gl.getUniformLocation(this.program_, 'uLightDirection') as WebGLUniformLocation;
    this.uniforms_.uInSun = gl.getUniformLocation(this.program_, 'uInSun') as WebGLUniformLocation;
  }

  private populateFileList(): void {
    this.fileList_ = this.meshList_.map((mesh) => ({
      obj: `${settingsManager.installDirectory}meshes/${mesh}.obj`,
      mtl: `${settingsManager.installDirectory}meshes/${mesh}.mtl`,
    }));
  }

  private shader_ = {
    frag: keepTrackApi.glsl`#version 300 es
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
      vec3 dirColor = vDiffuse * vAmbient * lightAmt * (min(vInSun,1.0) * 0.65);
      vec3 specColor = vSpecular * lightAmt * (min(vInSun,1.0) * 0.65);

      vec3 color = ambientColor + dirColor + specColor;

      fragColor = vec4(color, 1.0);
    }
  `,
    vert: keepTrackApi.glsl`#version 300 es
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
}
