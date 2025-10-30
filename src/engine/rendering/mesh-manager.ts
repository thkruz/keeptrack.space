import { OemSatellite } from '@app/app/objects/oem-satellite';
import { ModelResolver } from '@app/app/rendering/mesh/model-resolver';
import { EciArr3, GetSatType } from '@app/engine/core/interfaces';
import { BaseObject, DEG2RAD, Degrees, DetailedSatellite, EciVec3, EpochUTC, Kilometers, PayloadStatus, Radians, SpaceObjectType, Sun, Vec3, Vector3D } from '@ootk/src/main';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { Layout, Mesh } from 'webgl-obj-loader';
import { MissileObject } from '../../app/data/catalog-manager/MissileObject';
import { SplashScreen } from '../../app/ui/splash-screen';
import { ServiceLocator } from '../core/service-locator';
import { errorManagerInstance } from '../utils/errorManager';
import { BufferAttribute } from './buffer-attribute';
import { OcclusionProgram } from './draw-manager/post-processing';
import { Material } from './material';
import { OBJLoader } from './mesh/loaders/webgl-obj-loader';
import { MeshRegistry } from './mesh/mesh-registry';
import { MeshRenderer } from './mesh/mesh-renderer';

export interface Geometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs?: Float32Array;
  indices: Uint16Array;
  boundingBox?: { min: Vec3; max: Vec3 };
  boundingSphere?: { center: Vec3; radius: number };
  attributes: Record<string, BufferAttribute>;
}

export interface MeshInstance {
  mesh: Mesh;
  modelMatrix: mat4;
  normalMatrix: mat3;
  worldPosition: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface MeshFileOptions {
  obj: string;
  mtl?: string;
  gltf?: string;
  glb?: string;
}
export interface KeepTrackMeshBuffer {
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  vertexCount: number;
  indexCount: number;
}
export type MeshModel = {
  id: number;
  name: string;
  mesh?: Mesh;
  buffers?: KeepTrackMeshBuffer;
  geometry?: Geometry;
  material?: Material;
  layout?: Layout;
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

  mvMatrix_: mat4;
  nMatrix_: mat3;
  private modelResolver_: ModelResolver;
  private meshRegistry_: MeshRegistry;
  private meshRenderer_: MeshRenderer;
  private gl_: WebGL2RenderingContext;
  isReady: boolean;

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer = null as WebGLFramebuffer | null) {
    this.meshRenderer_.draw(pMatrix, camMatrix, tgtBuffer);
  }

  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLBuffer) {
    this.meshRenderer_.drawOcclusion(pMatrix, camMatrix, occlusionPrgm, tgtBuffer);
  }

  init(gl: WebGL2RenderingContext): void {
    try {
      if (settingsManager.disableUI || settingsManager.isDrawLess || settingsManager.noMeshManager) {
        return;
      }
      this.gl_ = gl;
      this.modelResolver_ = new ModelResolver();
      this.meshRegistry_ = new MeshRegistry();
      this.meshRenderer_ = new MeshRenderer(this, gl);
      this.meshRegistry_.registerLoader(new OBJLoader(), ['.obj']);

      settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];

      // Changes Loading Screen Text
      SplashScreen.loadStr(SplashScreen.msg.models);

      this.isReady = true;

    } catch {
      errorManagerInstance.warn('Meshes failed to load!');
    }
  }

  setCurrentModel(model: MeshModel) {
    if (this.currentMeshObject.model?.name !== model.name) {
      this.currentMeshObject.rotation = {
        x: 0 as Degrees,
        y: 0 as Degrees,
        z: 0 as Degrees,
      };
    }
    this.currentMeshObject.model = model;
  }

  update(selectedDate: Date, sat: DetailedSatellite | OemSatellite | MissileObject) {
    if (!sat.isSatellite() && !sat.isMissile()) {
      return;
    }

    this.updateModel_(selectedDate, sat);

    if (!this.currentMeshObject.model?.mesh && this.currentMeshObject.model?.name) {
      const meshName = this.currentMeshObject.model.name;

      this.meshRegistry_.load(meshName, `${settingsManager.installDirectory}meshes/${meshName}.obj`, this.gl_);
    }

    const posData = ServiceLocator.getDotsManager().positionData;
    const position = {
      x: posData[sat.id * 3],
      y: posData[sat.id * 3 + 1],
      z: posData[sat.id * 3 + 2],
    };
    let drawPosition = [position.x, position.y, position.z] as EciArr3;

    // We need to avoid zero values. They break mat4.targetTo
    drawPosition = drawPosition.map((coord) => coord / 1e11) as EciArr3;

    // Move the mesh to its location in world space
    this.mvMatrix_ = mat4.create();
    mat4.translate(this.mvMatrix_, this.mvMatrix_, drawPosition);

    if (
      this.currentMeshObject.isRotationStable ||
      (sat.type === SpaceObjectType.PAYLOAD && (sat as DetailedSatellite).status === PayloadStatus.OPERATIONAL) ||
      (sat as OemSatellite).isStable
    ) {
      // Rotate the Satellite to Face Nadir if needed
      this.updateRotationToNadir_(drawPosition);
    } else {
      // If unstable then add some tumbling rotation
      const dt = ServiceLocator.getRenderer().dtAdjusted;

      this.currentMeshObject.rotation.z = (this.currentMeshObject.rotation.z + (dt * 10)) % 360 as Degrees;
      this.currentMeshObject.rotation.y = (sat as DetailedSatellite).inclination;
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

  private updateRotationToNadir_(drawPosition: EciArr3) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
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
        if (typeof this.modelResolver_.modelMap[settingsManager.meshOverride] === 'undefined') {
          errorManagerInstance.debug(`Mesh override not found: ${settingsManager.meshOverride}`);
          settingsManager.meshOverride = null;
        } else {
          this.currentMeshObject.model = this.meshRegistry_.get(settingsManager.meshOverride) ?? {
            id: -1,
            name: settingsManager.meshOverride,
          };

          return;
        }
      }

      const modelName = this.modelResolver_.resolve(obj);
      const resolvedMesh = this.meshRegistry_.get(modelName) ?? {
        id: -1,
        name: modelName,
      };

      this.setCurrentModel(resolvedMesh);
    } catch {
      // Don't Let meshManager break everything
    }
  }

  updatePosition(targetPosition: { x: Kilometers; y: Kilometers; z: Kilometers }) {
    this.currentMeshObject.position.x = targetPosition.x;
    this.currentMeshObject.position.y = targetPosition.y;
    this.currentMeshObject.position.z = targetPosition.z;

  }
}
