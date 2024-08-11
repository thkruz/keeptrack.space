/* eslint-disable camelcase */
import { SatMath } from '@app/static/sat-math';
import { mat4, vec3 } from 'gl-matrix';
import { BaseObject, DEG2RAD, eci2lla, Kilometers, RADIUS_OF_EARTH } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { CustomMesh } from './custom-mesh';

export class ConeMesh extends CustomMesh {
  uniforms_ = {
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_color: <WebGLUniformLocation>null,
  };
  private verticesTmp_: number[] = [];
  private indicesTmp_: number[] = [];
  /** The angle of the cone mesh. Tied to the object's FOV */
  angle: number;
  pos: vec3 = vec3.create();
  offsetDistance: number = RADIUS_OF_EARTH + 80 + 1;
  obj: BaseObject;


  constructor(obj: BaseObject, angle: number = 15) {
    super();
    this.obj = obj;
    this.angle = angle;

    this.updatePosition_();
  }

  private updatePosition_() {
    const positionData = keepTrackApi.getDotsManager()?.positionData;
    const id = this.obj.id;

    this.pos = vec3.fromValues(positionData[id * 3], positionData[id * 3 + 1], positionData[id * 3 + 2]);
  }

  update() {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    this.updatePosition_();

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    // Translate to halfway between this.pos and the center of the earth
    const h = vec3.distance([0, 0, 0], vec3.fromValues(this.pos[0], this.pos[1], this.pos[2])) - this.offsetDistance;
    const halfwayPosition = vec3.scale(vec3.create(), vec3.fromValues(h + this.offsetDistance * 2, 0, 0), 0.5);
    // Rotate to face the center of the earth

    const gmst = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;
    const { lat, lon } = eci2lla({ x: this.pos[0] as Kilometers, y: this.pos[1] as Kilometers, z: this.pos[2] as Kilometers }, gmst);

    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, lon * DEG2RAD);
    mat4.rotateY(this.mvMatrix_, this.mvMatrix_, lat * DEG2RAD);
    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, gmst);

    mat4.translate(this.mvMatrix_, this.mvMatrix_, halfwayPosition);

  }

  draw(pMatrix: mat4, camMatrix: mat4, color: [number, number, number, number], tgtBuffer?: WebGLFramebuffer) {
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
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform4fv(this.uniforms_.u_color, color);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false); // Disable depth writing

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-2.0, -2.0);

    gl.bindVertexArray(this.vao_);

    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.depthMask(true); // Re-enable depth writing
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  initGeometry_() {
    // height is the distance from the center of the earth ([0,0,0]) to the cone.pos
    const h = vec3.distance([0, 0, 0], vec3.fromValues(this.pos[0], this.pos[1], this.pos[2])) - this.offsetDistance;

    // Calculate the width of the cone based on the angle given and the height of the cone
    const r1 = h * Math.tan((this.angle * Math.PI) / 180);
    const r2 = 0.05;
    const nPhi = 100;

    let Phi = 0;
    const dPhi = (2 * Math.PI) / (nPhi - 1);

    Phi += dPhi;
    /*
     * let Nx = r1 - r2;
     * let Ny = h;
     * const N = Math.sqrt(Nx * Nx + Ny * Ny);
     */

    /*
     * Nx /= N;
     * Ny /= N;
     */

    for (let i = 0; i < nPhi + 1; i++) {
      const cosPhi = Math.cos(Phi);
      const sinPhi = Math.sin(Phi);
      const cosPhi2 = Math.cos(Phi + dPhi / 2);
      const sinPhi2 = Math.sin(Phi + dPhi / 2);

      if (i !== nPhi) {
        this.verticesTmp_.push(-h / 2, cosPhi * r1, sinPhi * r1);
        // vertNorm.push(Nx, Ny * cosPhi, Ny * sinPhi); // normals
        this.indicesTmp_.push(2 * i, 2 * i + 1, 2 * i + 2);
      }
      this.verticesTmp_.push(h / 2, cosPhi2 * r2, sinPhi2 * r2);
      // vertNorm.push(Nx, Ny * cosPhi2, Ny * sinPhi2); // normals
      this.indicesTmp_.push(2 * i + 1, 2 * i + 3, 2 * i + 2);
      Phi += dPhi;
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
        fragColor = vec4(u_color.rgb, 0.15);
      }
    `,
    vert: keepTrackApi.glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;

      in vec3 a_position;

      void main(void) {
        gl_Position = u_pMatrix * u_camMatrix * u_mvMatrix * vec4(a_position, 1.0);
      }
    `,
  };
}
