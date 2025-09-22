import { vec3 } from 'gl-matrix';
import { v4 as uuidv4 } from 'uuid';

export const GLSL1 = '100';
export const GLSL3 = '300 es';
export type GLSLVersion = typeof GLSL1 | typeof GLSL3;

export interface MaterialParameters {
  type?: string;
  glslVersion?: GLSLVersion;
  ambient?: vec3;
  diffuse?: vec3;
  specular?: vec3;
  specularExponent?: number;
}

export class Material {
  id: number;
  uuid: string;
  type: string;
  uniforms: Record<string, WebGLUniformLocation> = {};
  vertexShader: string;
  fragmentShader: string;
  gl: WebGL2RenderingContext;
  glslVersion?: GLSLVersion;
  map: WebGLTexture | null = null;
  alphaMap: WebGLTexture | null = null;
  static id = -1;
  ambient?: vec3;
  diffuse?: vec3;
  specular?: vec3;
  specularExponent?: number;

  constructor(parameters: MaterialParameters) {
    this.id = Material.id++;
    this.uuid = uuidv4();
    this.type = parameters?.type || 'Material';
    this.glslVersion = parameters?.glslVersion;
    this.ambient = parameters?.ambient;
    this.diffuse = parameters?.diffuse;
    this.specular = parameters?.specular;
    this.specularExponent = parameters?.specularExponent;
    this.vertexShader = '';
    this.fragmentShader = '';
  }
}
