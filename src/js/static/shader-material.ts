import { GlUtils } from '@app/js/static/gl-utils';
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
  map?: WebGLTexture;
  image?: HTMLImageElement;
  textureType?: 'flat' | 'image';
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
    this.uniforms = {
      ...this.uniforms,
      ...{
        modelMatrix: null,
        modelViewMatrix: null,
        projectionMatrix: null,
        viewMatrix: null,
        normalMatrix: null,
        cameraPosition: null,
      },
    };

    this.vertexShader = parameters?.vertexShader || '';
    this.fragmentShader = parameters?.fragmentShader || '';
    this.map = parameters?.map || null;

    if (this.map) {
      if (parameters.textureType === 'flat') {
        this.initFlatTexture();
      }
      if (parameters.textureType === 'image') {
        GlUtils.bindImageToTexture(this.gl, this.map, parameters.image);
      }
    }
  }

  initFlatTexture() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.map);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
}
