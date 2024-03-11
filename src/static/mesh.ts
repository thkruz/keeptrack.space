import { BufferGeometry } from './buffer-geometry';
import { GLSL1, GLSL3, Material } from './material';
import { ProgramParams, WebGlProgramHelper } from './webgl-program';

export class Mesh {
  name: string;
  gl: WebGL2RenderingContext;
  geometry: BufferGeometry;
  material: Material;
  program: WebGlProgramHelper;
  precision: 'highp' | 'mediump' | 'lowp';

  constructor(gl: WebGL2RenderingContext, geometry: BufferGeometry, material: Material, params?: ProgramParams) {
    this.gl = gl;
    this.geometry = geometry;
    if (params?.disabledAttributes?.position) delete this.geometry.attributes.position;
    if (params?.disabledAttributes?.normal) delete this.geometry.attributes.normal;
    if (params?.disabledAttributes?.uv) delete this.geometry.attributes.uv;

    this.material = material;
    if (params?.disabledUniforms?.modelMatrix) delete this.material.uniforms.modelMatrix;
    if (params?.disabledUniforms?.modelViewMatrix) delete this.material.uniforms.modelViewMatrix;
    if (params?.disabledUniforms?.projectionMatrix) delete this.material.uniforms.projectionMatrix;
    if (params?.disabledUniforms?.viewMatrix) delete this.material.uniforms.viewMatrix;
    if (params?.disabledUniforms?.normalMatrix) delete this.material.uniforms.normalMatrix;
    if (params?.disabledUniforms?.cameraPosition) delete this.material.uniforms.cameraPosition;

    this.name = params?.name;
    this.precision = params?.precision || 'highp';

    let { vertexShaderHeader, fragmentShaderHeader } = this.createShaderHeaders_(params);

    this.material.vertexShader = `${vertexShaderHeader}${this.material.vertexShader}`;
    this.material.fragmentShader = `${fragmentShaderHeader}${this.material.fragmentShader}`;

    this.program = new WebGlProgramHelper(gl, material.vertexShader, material.fragmentShader, geometry.attributes, material.uniforms, params);
    material.uniforms = Object.fromEntries(Object.entries(material.uniforms).filter(([_, v]) => v !== null));
    geometry.attributes = Object.fromEntries(Object.entries(geometry.attributes).filter(([_, v]) => v.location !== -1));
  }

  private createShaderHeaders_(params: ProgramParams) {
    let vertexShaderHeader = this.createShaderHeadersVert_(params);
    let fragmentShaderHeader = this.createShaderHeadersFrag_(params);
    return { vertexShaderHeader, fragmentShaderHeader };
  }

  private createShaderHeadersVert_(params: ProgramParams) {
    let vertexShaderHeader = '';

    if (this.material.glslVersion === GLSL3) vertexShaderHeader = `#version 300 es\n`;
    if (this.material.glslVersion === GLSL1) vertexShaderHeader = `#version 100\n`;

    vertexShaderHeader += `precision ${this.precision} float;\n\n`;

    if (!params.disabledUniforms?.modelMatrix) vertexShaderHeader += `uniform mat4 modelMatrix;\n`;
    if (!params.disabledUniforms?.modelViewMatrix) vertexShaderHeader += `uniform mat4 modelViewMatrix;\n`;
    if (!params.disabledUniforms?.projectionMatrix) vertexShaderHeader += `uniform mat4 projectionMatrix;\n`;
    if (!params.disabledUniforms?.viewMatrix) vertexShaderHeader += `uniform mat4 viewMatrix;\n`;
    if (!params.disabledUniforms?.normalMatrix) vertexShaderHeader += `uniform mat3 normalMatrix;\n`;
    if (!params.disabledUniforms?.cameraPosition) vertexShaderHeader += `uniform vec3 cameraPosition;\n`;

    if (this.material.glslVersion === GLSL3) {
      if (!params.disabledAttributes?.position) vertexShaderHeader += `in vec3 position;\n`;
      if (!params.disabledAttributes?.normal) vertexShaderHeader += `in vec3 normal;\n`;
      if (!params.disabledAttributes?.uv) vertexShaderHeader += `in vec2 uv;\n`;
    }

    if (this.material.glslVersion === GLSL1) {
      if (!params.disabledAttributes?.position) vertexShaderHeader += `attribute vec3 position;\n`;
      if (!params.disabledAttributes?.normal) vertexShaderHeader += `attribute vec3 normal;\n`;
      if (!params.disabledAttributes?.uv) vertexShaderHeader += `attribute vec2 uv;\n`;
    }
    return vertexShaderHeader;
  }

  private createShaderHeadersFrag_(params: ProgramParams) {
    let fragmentShaderHeader = '';
    if (this.material.glslVersion === GLSL3) fragmentShaderHeader = `#version 300 es\n`;
    if (this.material.glslVersion === GLSL1) fragmentShaderHeader = `#version 100\n`;
    fragmentShaderHeader += `precision ${this.precision} float;\n\n`;

    if (!params.disabledUniforms?.viewMatrix) fragmentShaderHeader += `uniform mat4 viewMatrix;\n`;
    if (!params.disabledUniforms?.cameraPosition) fragmentShaderHeader += `uniform vec3 cameraPosition;\n`;
    return fragmentShaderHeader;
  }
}
