import { BufferGeometry } from './buffer-geometry';
import { GlUtils } from './gl-utils';
import { GLSL1, GLSL3, Material } from './material';

export class Mesh {
  name: string;
  gl: WebGL2RenderingContext;
  geometry: BufferGeometry;
  material: Material;
  program: WebGLProgram;

  constructor(gl: WebGL2RenderingContext, geometry: BufferGeometry, material: Material, name?: string) {
    const precision = 'highp'; // 'mediump' 'lowp'

    this.gl = gl;
    this.geometry = geometry;
    this.material = material;
    this.name = name;

    let vertexShaderHeader = '';
    let fragmentShaderHeader = '';

    if (this.material.glslVersion === GLSL3) {
      vertexShaderHeader = `#version 300 es\n`;
      fragmentShaderHeader = `#version 300 es\n`;
    }
    if (this.material.glslVersion === GLSL1) {
      vertexShaderHeader = `#version 100\n`;
      fragmentShaderHeader = `#version 100\n`;
    }

    vertexShaderHeader += `precision ${precision} float;\n\n`;
    fragmentShaderHeader += `precision ${precision} float;\n\n`;

    vertexShaderHeader += `uniform mat4 modelMatrix;\n`;
    vertexShaderHeader += `uniform mat4 modelViewMatrix;\n`;
    vertexShaderHeader += `uniform mat4 projectionMatrix;\n`;
    vertexShaderHeader += `uniform mat4 viewMatrix;\n`;
    vertexShaderHeader += `uniform mat3 normalMatrix;\n`;
    vertexShaderHeader += `uniform vec3 cameraPosition;\n`;

    if (this.material.glslVersion === GLSL3) {
      vertexShaderHeader += `
      in vec3 position;
      in vec3 normal;
      in vec2 uv;`;
    }

    if (this.material.glslVersion === GLSL1) {
      vertexShaderHeader += `
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;`;
    }

    fragmentShaderHeader += `
    uniform mat4 viewMatrix;
    uniform vec3 cameraPosition;`;

    this.material.vertexShader = `${vertexShaderHeader}${this.material.vertexShader}`;
    this.material.fragmentShader = `${fragmentShaderHeader}${this.material.fragmentShader}`;

    this.program = GlUtils.createProgram(gl, material.vertexShader, material.fragmentShader, geometry.attributes, material.uniforms, name);
    material.uniforms = Object.fromEntries(Object.entries(material.uniforms).filter(([_, v]) => v !== null));
    geometry.attributes = Object.fromEntries(Object.entries(geometry.attributes).filter(([_, v]) => v.location !== -1));
  }
}
