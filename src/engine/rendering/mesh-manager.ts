import { OemSatellite } from '@app/app/objects/oem-satellite';
import { ModelResolver } from '@app/app/rendering/mesh/model-resolver';
import { EciArr3, GetSatType } from '@app/engine/core/interfaces';
import { BaseObject, DEG2RAD, Degrees, Kilometers, PayloadStatus, Radians, Satellite, SpaceObjectType, Sun, TemeVec3, Vec3, Vector3D } from '@ootk/src/main';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { Layout, Mesh } from 'webgl-obj-loader';
import { MissileObject } from '../../app/data/catalog-manager/MissileObject';
import { SplashScreen } from '../../app/ui/splash-screen';
import { Scene } from '../core/scene';
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
  useUint32Indices?: boolean;
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
  position: TemeVec3<Kilometers>;
  sccNum: string;
  inSun: number;
  model: MeshModel;
  isRotationStable: boolean;
}

export class MeshManager {
  calculateNadirYaw_: () => Radians;
  currentMeshObject: MeshObject = {
    id: -1,
    position: { x: 0, y: 0, z: 0 } as TemeVec3<Kilometers>,
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
    if (!this.isReady || !this.meshRenderer_) {
      return;
    }
    this.meshRenderer_.draw(pMatrix, camMatrix, tgtBuffer);
  }

  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLBuffer) {
    if (!this.isReady || !this.meshRenderer_) {
      return;
    }
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

  /**
   * Kick off a fire-and-forget mesh load. Callers gate this on
   * meshRegistry_.isLoadingOrFailed() so it dispatches exactly once per mesh:
   * not again while the load is in flight, and never again after it fails. That
   * single attempt's rejection MUST still be handled here, otherwise a failed
   * fetch (offline, 404, transient mobile blip) becomes an unhandled promise
   * rejection. Because the dispatch happens once, this also logs once.
   */
  private loadMesh_(meshName: string): void {
    this.meshRegistry_.load(meshName, `${settingsManager.installDirectory}meshes/${meshName}.obj`, this.gl_).catch(() => {
      errorManagerInstance.debug(`Failed to load mesh model: ${meshName}`);
    });
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

  /**
   * Update mesh for a non-catalog body (e.g., deep-space satellite) using position and model name.
   */
  updateForBody(position: EciArr3, modelName: string): void {
    if (!this.isReady) {
      return;
    }
    this.currentMeshObject.id = 0;
    this.currentMeshObject.inSun = 1;
    this.currentMeshObject.isRotationStable = false;

    const resolvedMesh = this.meshRegistry_.get(modelName) ?? { id: -1, name: modelName };

    this.setCurrentModel(resolvedMesh);

    if (!this.currentMeshObject.model?.mesh && this.currentMeshObject.model?.name && !this.meshRegistry_.isLoadingOrFailed(modelName)) {
      this.loadMesh_(modelName);
    }

    // Shifted-world location (exactly [0,0,0] when the frame shift centers on this body)
    const worldShift = Scene.getInstance().worldShift;

    this.mvMatrix_ = mat4.create();
    mat4.translate(this.mvMatrix_, this.mvMatrix_, [position[0] + worldShift[0], position[1] + worldShift[1], position[2] + worldShift[2]]);

    // Apply manual rotation
    mat4.rotateX(this.mvMatrix_, this.mvMatrix_, settingsManager.meshRotation.x * DEG2RAD);
    mat4.rotateY(this.mvMatrix_, this.mvMatrix_, settingsManager.meshRotation.y * DEG2RAD);
    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, settingsManager.meshRotation.z * DEG2RAD);

    this.nMatrix_ = mat3.create();
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  update(selectedDate: Date, sat: Satellite | OemSatellite | MissileObject) {
    if (!sat.isSatellite() && !sat.isMissile()) {
      return;
    }

    this.updateModel_(selectedDate, sat);

    const meshName = this.currentMeshObject.model?.name;

    if (!this.currentMeshObject.model?.mesh && meshName && !this.meshRegistry_.isLoadingOrFailed(meshName)) {
      this.loadMesh_(meshName);
    }

    // Use the RENDERED dot position (ground rotation applied) so the mesh sits on
    // the dot. For a low-altitude missile the shader rotates the dot by
    // (currentGmst - cruncherGmst) and the world shift is built from that same
    // rendered value; a raw-positionData mesh would drift off the dot during boost.
    // No-op above the ground-rotation radius, so satellites are unaffected.
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const renderedPos = dotsManagerInstance.getRenderedPositionArray(Number(sat.id));
    const position = {
      x: renderedPos[0],
      y: renderedPos[1],
      z: renderedPos[2],
    };
    let drawPosition = [position.x, position.y, position.z] as EciArr3;

    // We need to avoid zero values. They break mat4.targetTo
    drawPosition = drawPosition.map((coord) => coord / 1e11) as EciArr3;

    // Move the mesh to its shifted-world location. When the frame shift is the
    // classic satellite-centered one this is exactly [0,0,0]; when a 2D main
    // camera resolves the shift to zero (multi-view), the mesh must sit at its
    // true ECI position or it renders at the Earth's center in other panes.
    const worldShift = Scene.getInstance().worldShift;

    this.mvMatrix_ = mat4.create();
    mat4.translate(this.mvMatrix_, this.mvMatrix_, [position.x + worldShift[0], position.y + worldShift[1], position.z + worldShift[2]]);

    if (sat.isMissile()) {
      // A missile is not tumbling debris: point the model's nose along its
      // trajectory so it reads as a vehicle flying its arc.
      this.updateRotationAlongTrajectory_(drawPosition, sat as MissileObject);
    } else if (
      this.currentMeshObject.isRotationStable ||
      (sat.type === SpaceObjectType.PAYLOAD && (sat as Satellite).status === PayloadStatus.OPERATIONAL) ||
      (sat as OemSatellite).isStable
    ) {
      // Rotate the Satellite to Face Nadir if needed
      this.updateRotationToNadir_(drawPosition);
    } else {
      // If unstable then add some tumbling rotation
      const dt = ServiceLocator.getRenderer().dtAdjusted;

      this.currentMeshObject.rotation.z = ((this.currentMeshObject.rotation.z + dt * 10) % 360) as Degrees;
      this.currentMeshObject.rotation.y = (sat as Satellite).inclination;
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

    const satWithVel = sat as unknown as { velocity: TemeVec3 };

    // Calculate a position to look at along the satellite's velocity vector
    const lookAtPos = [drawPosition[0] + satWithVel.velocity.x, drawPosition[1] + satWithVel.velocity.y, drawPosition[2] + satWithVel.velocity.z];

    let up: vec3;

    if (sat.isSatellite()) {
      up = vec3.normalize(vec3.create(), drawPosition);
    } else {
      // Up is perpendicular to the velocity vector
      up = vec3.cross(vec3.create(), vec3.fromValues(0, 1, 0), vec3.fromValues(satWithVel.velocity.x, satWithVel.velocity.y, satWithVel.velocity.z));
    }

    mat4.targetTo(this.mvMatrix_, drawPosition, lookAtPos, up);
  }

  /**
   * Orient a missile mesh so its nose points along the trajectory. The direction
   * comes from the trajectory samples (not the worker velocity, which is not
   * synced to the main-thread object), so it stays correct when the sim clock is
   * scrubbed either way.
   *
   * The missile meshes (misl*.obj, rv.obj) are authored nose-up along the model
   * +Y axis. `mat4.targetTo` aligns the model's -Z with the travel direction and
   * +Y with the `up` vector, which would leave the nose (+Y) perpendicular to the
   * trajectory. So after building the look-at basis we roll the model -90deg about
   * X, mapping its +Y axis onto the basis -Z (travel) direction so the nose points
   * forward. The radial (away-from-Earth) direction is used as the roll reference.
   */
  private updateRotationAlongTrajectory_(drawPosition: EciArr3, misl: MissileObject) {
    const dir = misl.getVelocityDirection();

    if (!dir) {
      return; // No usable direction: keep the translation-only matrix (no tumble).
    }

    const dirVec = vec3.normalize(vec3.create(), vec3.fromValues(dir.x, dir.y, dir.z));
    const lookAtPos = [drawPosition[0] + dir.x, drawPosition[1] + dir.y, drawPosition[2] + dir.z] as EciArr3;

    // Roll reference: radial (zenith). If travel is (near) parallel to the radial
    // (a straight-up/down leg), fall back to world Y so the basis stays valid.
    let up = vec3.normalize(vec3.create(), drawPosition);

    if (Math.abs(vec3.dot(up, dirVec)) > 0.9999) {
      up = vec3.fromValues(0, 1, 0);
    }

    mat4.targetTo(this.mvMatrix_, drawPosition, lookAtPos, up);

    // Rotate the nose (+Y) forward onto the travel (-Z) direction.
    mat4.rotateX(this.mvMatrix_, this.mvMatrix_, -Math.PI / 2);
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

      const objWithPos = obj as unknown as { position: TemeVec3 };

      this.updatePosition(objWithPos.position);

      const pos = new Vector3D(objWithPos.position.x, objWithPos.position.y, objWithPos.position.z);

      this.currentMeshObject.inSun = Sun.lightingRatio(pos, Sun.eci(selectedDate));
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
