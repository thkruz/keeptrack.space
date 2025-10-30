/* eslint-disable camelcase */
import { Scene } from '@app/engine/core/scene';
import { glsl } from '@app/engine/utils/development/formatter';
import { BaseObject, Degrees, Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';
import { mat4, quat, vec3 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { CustomMesh } from './custom-mesh';
import { ServiceLocator } from '@app/engine/core/service-locator';

export interface ConeSettings {
  /** The field of view of the cone in degrees, default is 3 */
  fieldOfView: Degrees;
  /** The color of the cone, default is [0.2, 1.0, 1.0, 1.0] */
  color?: [number, number, number, number];
  /**
   * @deprecated
   * The range of the cone in kilometers, default is the distance to Earth from the attachmentPoint
   * This is not implemented yet
   */
  range?: Kilometers;
}

export class ConeMesh extends CustomMesh {
  uniforms_ = {
    u_pMatrix: null as unknown as WebGLUniformLocation,
    u_camMatrix: null as unknown as WebGLUniformLocation,
    u_mvMatrix: null as unknown as WebGLUniformLocation,
    u_color: null as unknown as WebGLUniformLocation,
    u_worldOffset: null as unknown as WebGLUniformLocation,
    logDepthBufFC: null as unknown as WebGLUniformLocation,
  };
  private verticesTmp_: number[] = [];
  private indicesTmp_: number[] = [];
  /** The angle of the cone mesh. Tied to the object's FOV */
  fieldOfView: number;
  color: [number, number, number, number] = [0.2, 1.0, 1.0, 1.0];
  range: Kilometers = 0 as Kilometers;
  pos: vec3 = vec3.create();
  offsetDistance: number = (RADIUS_OF_EARTH + settingsManager.coneDistanceFromEarth) as Kilometers;
  obj: BaseObject;


  constructor(obj: BaseObject, settings: ConeSettings) {
    super();
    this.obj = obj;
    this.fieldOfView = settings.fieldOfView;
    this.color = settings.color || this.color;
    this.range = settings.range || this.range;

    this.updatePosition_();
  }

  editSettings(settings: ConeSettings) {
    if (this.fieldOfView !== settings.fieldOfView) {
      this.fieldOfView = settings.fieldOfView;
      this.init(this.gl_);
    }

    this.color = settings.color || this.color;
    this.range = settings.range || this.range;
  }

  private updatePosition_() {
    const positionData = ServiceLocator.getDotsManager()?.positionData;
    const id = this.obj.id;

    this.pos = vec3.fromValues(positionData[id * 3], positionData[id * 3 + 1], positionData[id * 3 + 2]);
  }

  update() {
    this.updatePosition_();

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    // Calculate the height of the cone
    const satDistance = vec3.length(this.pos);
    const coneHeight = satDistance - this.offsetDistance;

    // Translate RADIUS_OF_EARTH units along the satellite's position vector
    const normalizedPositionScaled = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), this.pos), this.offsetDistance);

    mat4.translate(this.mvMatrix_, this.mvMatrix_, normalizedPositionScaled);

    // Create a rotation matrix to align the cone with the satellite's position
    const rotationMatrix = mat4.create();

    mat4.fromQuat(rotationMatrix, quat.rotationTo(quat.create(), [0, 0, 1], vec3.normalize(vec3.create(), this.pos)));

    // Apply the rotation
    mat4.multiply(this.mvMatrix_, this.mvMatrix_, rotationMatrix);

    // Scale the cone to the correct height
    mat4.scale(this.mvMatrix_, this.mvMatrix_, [coneHeight, coneHeight, coneHeight]);
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_) {
      return;
    }

    const { gl } = ServiceLocator.getRenderer();

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    // Set the uniforms
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform3fv(this.uniforms_.u_worldOffset, Scene.getInstance().worldShift);
    gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
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
    gl.disable(gl.DEPTH_TEST);
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
    frag: glsl`#version 300 es
      precision highp float;

      uniform vec4 u_color;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(u_color.rgba);
      }
    `,
    vert: glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform vec3 u_worldOffset;
      uniform float logDepthBufFC;

      in vec3 a_position;

      void main(void) {
        vec4 worldPosition = u_mvMatrix * vec4(a_position, 1.0);
        worldPosition.xyz += u_worldOffset;
        gl_Position = u_pMatrix * u_camMatrix * worldPosition;

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}
