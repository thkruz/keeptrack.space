// Shaders should NOT be modified
/* eslint-disable no-useless-escape */

import { WebGlProgramHelper } from '@app/engine/rendering/webgl-program';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { postProcessingShaderCode } from '../../utils/post-processing-shader-code';
import { DepthManager } from '../depth-manager';

enum ProgramType {
  OCCLUSION,
  SMAA_BLEND,
  SMAA_WEIGHTS,
  GODRAYS,
  BLUR,
  BLOOM,
}

export type OcclusionProgram = {
  program: WebGLProgram;
  type: ProgramType;
  attr: {
    position: number;
  };
  uniform: {
    uPMatrix: WebGLUniformLocation;
    uMvMatrix: WebGLUniformLocation;
    uCamMatrix: WebGLUniformLocation;
    uWorldOffset: WebGLUniformLocation;
    logDepthBufFC: WebGLUniformLocation;
  };
  attrSetup: (vertPosBuf: WebGLBuffer, stride?: number) => void;
  attrOff: () => void;
  uniformSetup: (mvMatrix: mat4, pMatrix: mat4, camMatrix: mat4, worldOffset?: vec3) => void;
};

export class PostProcessingManager {
  public curBuffer: WebGLFramebuffer | null;
  public secBuffer: WebGLFramebuffer | null;
  private gl_: WebGL2RenderingContext;
  private isReady_ = false;
  public programs = {
    occlusion: <OcclusionProgram>{
      program: <WebGLProgram><unknown>null,
      type: ProgramType.OCCLUSION,
      attr: {
        position: <number><unknown>null,
      },
      uniform: {
        uPMatrix: <WebGLUniformLocation><unknown>null,
        uMvMatrix: <WebGLUniformLocation><unknown>null,
        uCamMatrix: <WebGLUniformLocation><unknown>null,
        uWorldOffset: <WebGLUniformLocation><unknown>null,
        logDepthBufFC: <WebGLUniformLocation><unknown>null,
      },
      attrSetup: null as unknown as (combinedBuf: WebGLBuffer, stride: number) => void,
      attrOff: null as unknown as () => void,
      uniformSetup: null as unknown as (mvMatrix: vec4, pMatrix: vec4, camMatrix: vec4) => void,
    },
  };

  private frameBufferInfos = {
    one: {
      frameBuffer: <WebGLFramebuffer><unknown>null,
      texture: <WebGLTexture><unknown>null,
      depthBuffer: <WebGLRenderbuffer><unknown>null,
    },
    two: {
      frameBuffer: <WebGLFramebuffer><unknown>null,
      texture: <WebGLTexture><unknown>null,
      depthBuffer: <WebGLRenderbuffer><unknown>null,
    },
  };

  private shaderCode = postProcessingShaderCode;
  curFbi: {
    texture: WebGLTexture;
    frameBuffer?: WebGLFramebuffer;
    buffers?: {
      position: WebGLBuffer;
      texCoord: WebGLBuffer;
    };
  };

  secFbi: {
    texture: WebGLTexture;
    frameBuffer: WebGLFramebuffer;
    buffers: {
      position: WebGLBuffer;
      texCoord: WebGLBuffer;
    };
  };

  public init(gl: WebGL2RenderingContext): void {
    if (this.isReady_) {
      return;
    }
    this.gl_ = gl;
    this.programs.occlusion.program = new WebGlProgramHelper(this.gl_, this.shaderCode.occlusion.vert, this.shaderCode.occlusion.frag).program;
    this.gl_.useProgram(this.programs.occlusion.program);
    this.setupOcclusion();
    this.curBuffer = null;
    this.isReady_ = true;
  }

  public setupOcclusion() {
    const gl = this.gl_;

    this.programs.occlusion.attr = {
      position: gl.getAttribLocation(this.programs.occlusion.program, 'a_position'),
    };
    const uPMatrixLocation = gl.getUniformLocation(this.programs.occlusion.program, 'uPMatrix');
    const cameraMatrixLocation = gl.getUniformLocation(this.programs.occlusion.program, 'uCamMatrix');
    const mvMatrixLocation = gl.getUniformLocation(this.programs.occlusion.program, 'uMvMatrix');
    const uWorldOffsetLocation = gl.getUniformLocation(this.programs.occlusion.program, 'uWorldOffset');
    const logDepthBufFC = gl.getUniformLocation(this.programs.occlusion.program, 'logDepthBufFC');

    if (!uPMatrixLocation || !cameraMatrixLocation || !mvMatrixLocation || !uWorldOffsetLocation || !logDepthBufFC) {
      throw new Error('Failed to get uniform locations');
    }

    this.programs.occlusion.uniform = {
      uPMatrix: uPMatrixLocation,
      uCamMatrix: cameraMatrixLocation,
      uMvMatrix: mvMatrixLocation,
      uWorldOffset: uWorldOffsetLocation,
      logDepthBufFC,
    };
    this.programs.occlusion.attrSetup = (combinedBuf: WebGLBuffer, stride = Float32Array.BYTES_PER_ELEMENT * 8): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, combinedBuf);
      gl.enableVertexAttribArray(this.programs.occlusion.attr.position);
      gl.vertexAttribPointer(this.programs.occlusion.attr.position, 3, gl.FLOAT, false, stride, 0);
    };
    this.programs.occlusion.attrOff = (): void => {
      gl.disableVertexAttribArray(this.programs.occlusion.attr.position);
    };
    this.programs.occlusion.uniformSetup = (mvMatrix: mat4, pMatrix: mat4, camMatrix: mat4, worldOffset = [0, 0, 0]): void => {
      gl.uniformMatrix4fv(this.programs.occlusion.uniform.uMvMatrix, false, mvMatrix);
      gl.uniformMatrix4fv(this.programs.occlusion.uniform.uPMatrix, false, pMatrix);
      gl.uniformMatrix4fv(this.programs.occlusion.uniform.uCamMatrix, false, camMatrix);
      gl.uniform3fv(this.programs.occlusion.uniform.uWorldOffset, worldOffset);
      gl.uniform1f(this.programs.occlusion.uniform.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    };
  }

  public createFrameBufferInfo(width: number, height: number) {
    const gl = this.gl_;
    const frameBufferInfo = {
      width,
      height,
      buffers: {
        position: <WebGLBuffer><unknown>null,
        texCoord: <WebGLBuffer><unknown>null,
      },
      texture: <WebGLTexture><unknown>null,
      frameBuffer: <WebGLFramebuffer><unknown>null,
      renderBuffer: <WebGLRenderbuffer><unknown>null,
    };

    frameBufferInfo.buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, frameBufferInfo.buffers.position);
    const x1 = 0;
    const x2 = 0 + width;
    const y1 = 0;
    const y2 = 0 + height;

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);

    // provide texture coordinates for the rectangle.
    frameBufferInfo.buffers.texCoord = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, frameBufferInfo.buffers.texCoord);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);

    frameBufferInfo.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, frameBufferInfo.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    frameBufferInfo.frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBufferInfo.frameBuffer);

    frameBufferInfo.renderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, frameBufferInfo.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameBufferInfo.texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, frameBufferInfo.renderBuffer);

    return frameBufferInfo;
  }

  public switchFrameBuffer() {
    this.curBuffer = this.curBuffer === this.frameBufferInfos.one.frameBuffer ? this.frameBufferInfos.two.frameBuffer : this.frameBufferInfos.one.frameBuffer;
    this.secBuffer = this.curBuffer === this.frameBufferInfos.one.frameBuffer ? this.frameBufferInfos.two.frameBuffer : this.frameBufferInfos.one.frameBuffer;
  }

  public clearAll() {
    const gl = this.gl_;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBufferInfos.one.frameBuffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBufferInfos.two.frameBuffer);
    /*
     * DEBUG:
     * gl.clearColor(0.0, 0.0, 0.0, 0.0);
     */
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
}
