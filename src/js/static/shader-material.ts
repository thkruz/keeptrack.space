import { Material, MaterialParameters } from './material';

export interface ShaderMaterialParameters extends MaterialParameters {
  uniforms?: any;
  vertexShader?: string;
  fragmentShader?: string;
  linewidth?: number;
  wireframe?: boolean;
  wireframeLinewidth?: number;
  lights?: boolean;
  clipping?: boolean;
  fog?: boolean;
  extensions?: {
    derivatives?: boolean;
    fragDepth?: boolean;
    drawBuffers?: boolean;
    shaderTextureLOD?: boolean;
  };
}

export class ShaderMaterial extends Material {
  constructor(gl: WebGL2RenderingContext, parameters?: ShaderMaterialParameters) {
    super({ ...parameters, type: 'ShaderMaterial' });

    this.gl = gl;
    this.uniforms = parameters?.uniforms || {};
    this.vertexShader = parameters?.vertexShader || '';
    this.fragmentShader = parameters?.fragmentShader || '';
  }
}
