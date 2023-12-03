import { BufferGeometry } from './buffer-geometry';
import { GlUtils } from './gl-utils';
import { GLSL1, GLSL3, Material } from './material';

export class Mesh {
  gl: WebGL2RenderingContext;
  geometry: BufferGeometry;
  material: Material;
  program: WebGLProgram;

  constructor(gl: WebGL2RenderingContext, geometry: BufferGeometry, material: Material) {
    this.gl = gl;
    this.geometry = geometry;
    this.material = material;

    if (this.material.glslVersion === GLSL3) {
      this.material.vertexShader = `#version 300 es\n${this.material.vertexShader}`;
      this.material.fragmentShader = `#version 300 es\n${this.material.fragmentShader}`;
    }
    if (this.material.glslVersion === GLSL1) {
      this.material.vertexShader = `#version 100\n${this.material.vertexShader}`;
      this.material.fragmentShader = `#version 100\n${this.material.fragmentShader}`;
    }

    if (this.material.glslVersion) this.program = GlUtils.createProgram(gl, material.vertexShader, material.fragmentShader, geometry.attributes, material.uniforms);
  }
}
