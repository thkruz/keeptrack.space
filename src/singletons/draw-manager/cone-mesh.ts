/* eslint-disable camelcase */
import { mat4, quat, vec3 } from 'gl-matrix';
import { BaseObject, Degrees, Kilometers, RADIUS_OF_EARTH } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { CustomMesh } from './custom-mesh';

export interface ConeSettings {
  /** The field of view of the cone in degrees, default is 3 */
  fieldOfView: Degrees;
  /** The target point of the cone, default is [0, 0, 0] */
  target: vec3;
  /**
   * The Id of the target if it exists, default is -1
   * Each update cycle the target position will be updated
   * to match the target object's position.
   */
  targetId?: number;
  /** The color of the cone, default is [0.2, 1.0, 1.0, 1.0] */
  color?: [number, number, number, number];
}

export class ConeMesh extends CustomMesh {
  uniforms_ = {
    u_pMatrix: null as unknown as WebGLUniformLocation,
    u_viewMatrix: null as unknown as WebGLUniformLocation,
    u_mvMatrix: null as unknown as WebGLUniformLocation,
    u_color: null as unknown as WebGLUniformLocation,
  };
  private verticesTmp_: number[] = [];
  private indicesTmp_: number[] = [];
  /** The angle of the cone mesh. Tied to the object's FOV */
  fieldOfView: number;
  targetId: number = -1;
  target: vec3 = vec3.fromValues(0, 0, 0);
  color: [number, number, number, number] = [0.2, 1.0, 1.0, 1.0];
  pos: vec3 = vec3.create();
  offsetDistance: number = (RADIUS_OF_EARTH + settingsManager.coneDistanceFromEarth) as Kilometers;
  obj: BaseObject;


  constructor(obj: BaseObject, settings: ConeSettings) {
    super();
    this.obj = obj;
    this.fieldOfView = settings.fieldOfView;
    this.targetId = settings.targetId ?? -1;
    this.target = settings.target ?? this.target;
    this.color = settings.color ?? this.color;

    this.updatePosition_();
  }

  editSettings(settings: ConeSettings) {
    if (this.fieldOfView !== settings.fieldOfView) {
      this.fieldOfView = settings.fieldOfView;
      this.init(this.gl_);
    }

    this.color = settings.color ?? this.color;
    this.target = settings.target ?? this.target;
    this.targetId = settings.targetId ?? this.targetId;
  }

  private updatePosition_() {
    const positionData = keepTrackApi.getDotsManager()?.positionData;
    const id = this.obj.id;

    this.pos = vec3.fromValues(positionData[id * 3], positionData[id * 3 + 1], positionData[id * 3 + 2]);

    if (this.targetId !== -1) {
      this.target = vec3.fromValues(positionData[this.targetId * 3], positionData[this.targetId * 3 + 1], positionData[this.targetId * 3 + 2]);
    }
  }

  update() {
    this.updatePosition_();

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    // Compute direction vector from target to satellite position
    const direction = vec3.subtract(vec3.create(), this.pos, this.target);
    const coneHeight = vec3.length(direction);

    // Normalize direction for rotation calculation
    const directionNorm = vec3.normalize(vec3.create(), direction);

    // Translate to the target position
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.target);

    // Create a rotation matrix to align the cone with the direction vector
    const rotationQuat = quat.rotationTo(quat.create(), [0, 0, 1], directionNorm);
    const rotationMatrix = mat4.fromQuat(mat4.create(), rotationQuat);

    // Apply the rotation
    mat4.multiply(this.mvMatrix_, this.mvMatrix_, rotationMatrix);

    // Scale the cone to the correct height
    mat4.scale(this.mvMatrix_, this.mvMatrix_, [coneHeight, coneHeight, coneHeight]);
  }

  render(pMatrix: mat4, viewMatrix: mat4, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_) {
      return;
    }

    const { gl } = keepTrackApi.getRenderer();

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    // Set the uniforms
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_viewMatrix, false, viewMatrix);
    gl.uniform4fv(this.uniforms_.u_color, this.color);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false); // Disable depth writing

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1.0, -1.0);

    gl.bindVertexArray(this.vao_);

    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.depthMask(true); // Re-enable depth writing
    gl.disable(gl.BLEND);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  initGeometry_() {
    // Clear the arrays
    this.verticesTmp_ = [];
    this.indicesTmp_ = [];

    const height = 1; // Use a unit height, scale in update method
    const radius = Math.tan((this.fieldOfView * Math.PI) / 180);
    const nPhi = 100;

    const dPhi = (2 * Math.PI) / nPhi;


    // Apex of the cone
    this.verticesTmp_.push(0, 0, height);

    // Base vertices
    for (let i = 0; i <= nPhi; i++) {
      const phi = i * dPhi;
      const x = radius * Math.cos(phi);
      const y = radius * Math.sin(phi);

      this.verticesTmp_.push(x, y, 0);
    }

    // Triangles
    for (let i = 0; i < nPhi; i++) {
      // Triangle from apex to base
      this.indicesTmp_.push(0, i + 1, i + 2);
    }

    this.vertices_ = new Float32Array(this.verticesTmp_);
    this.indices_ = new Uint16Array(this.indicesTmp_);
  }

  shaders_ = {
    frag: keepTrackApi.glsl`#version 300 es
      precision highp float;

      uniform vec4 u_color;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(u_color.rgba);
      }
    `,
    vert: keepTrackApi.glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_viewMatrix;
      uniform mat4 u_mvMatrix;

      in vec3 a_position;

      void main(void) {
        gl_Position = u_pMatrix * u_viewMatrix * u_mvMatrix * vec4(a_position, 1.0);
      }
    `,
  };
}
