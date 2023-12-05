import { v4 as uuidv4 } from 'uuid';

export const GLSL1 = '100';
export const GLSL3 = '300 es';
export type GLSLVersion = typeof GLSL1 | typeof GLSL3;

export interface MaterialParameters {
  type?: string;
  glslVersion?: GLSLVersion;
}

export class Material {
  id: number;
  uuid: string;
  type: string;
  uniforms: any;
  vertexShader: string;
  fragmentShader: string;
  gl: WebGL2RenderingContext;
  glslVersion?: GLSLVersion;
  static id = -1;

  constructor(parameters: MaterialParameters) {
    this.id = Material.id++;
    this.uuid = uuidv4();
    this.type = parameters?.type || 'Material';
    this.glslVersion = parameters?.glslVersion;
  }
}
