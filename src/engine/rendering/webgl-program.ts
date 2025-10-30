import { BufferAttribute } from './buffer-attribute';
import { GlUtils } from './gl-utils';

export interface ProgramParams {
  name?: string;
  precision?: 'highp' | 'mediump' | 'lowp';
  disabledUniforms?: {
    modelMatrix?: boolean;
    modelViewMatrix?: boolean;
    projectionMatrix?: boolean;
    viewMatrix?: boolean;
    normalMatrix?: boolean;
    cameraPosition?: boolean;
    worldOffset?: boolean;
    logDepthBufFC?: boolean;
  };
  disabledAttributes?: {
    position?: boolean;
    normal?: boolean;
    uv?: boolean;
  };
}

export class WebGlProgramHelper {
  private gl_: WebGL2RenderingContext;
  name: string;
  vertexShader: WebGLShader;
  vertexShaderCode: string;
  fragmentShader: WebGLShader;
  fragmentShaderCode: string;
  program: WebGLProgram;

  constructor(gl: WebGL2RenderingContext, vertexShaderCode: string, fragmentShaderCode: string, attribs?: Record<string, BufferAttribute> | undefined,
    uniforms?: Record<string, WebGLUniformLocation | null> | undefined, params?: ProgramParams) {
    this.gl_ = gl;
    this.name = params?.name ?? 'WebGLProgram';
    this.vertexShaderCode = vertexShaderCode;
    this.fragmentShaderCode = fragmentShaderCode;

    if (this.gl_.isContextLost()) {
      throw new Error('WebGL context is lost. Cannot create program.');
    }

    this.vertexShader = WebGlProgramHelper.createVertexShader_(gl, vertexShaderCode);
    this.fragmentShader = WebGlProgramHelper.createFragmentShader_(gl, fragmentShaderCode);

    this.program = this.createProgram(gl, this.vertexShader, this.fragmentShader, attribs, uniforms);
  }

  /**
   * Creates a WebGL program from a vertex and fragment shader.
   */
  createProgram(gl: WebGL2RenderingContext, vertShader: WebGLShader, fragShader: WebGLShader, attribs?: Record<string, BufferAttribute> | undefined,
    uniforms?: Record<string, WebGLUniformLocation | null> | undefined): WebGLProgram {
    const program = gl.createProgram();

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);

      throw new Error(`Could not compile WebGL program. \n\n${info}`);
    }

    GlUtils.tagObject(gl, program, this.name);
    gl.useProgram(program);

    if (attribs) {
      GlUtils.assignAttributes(attribs, gl, program, Object.keys(attribs));
    }
    if (uniforms) {
      GlUtils.assignUniforms(uniforms, gl, program, Object.keys(uniforms));
    }

    return program;
  }

  /**
   * Creates a vertex shader from a string.
   */
  private static createVertexShader_(gl: WebGL2RenderingContext, source: string): WebGLShader {
    const vertShader = gl.createShader(gl.VERTEX_SHADER);

    if (!vertShader) {
      const error = gl.getError();

      throw new Error(`Failed to create vertex shader, WebGL error code: ${error}`);
    }

    gl.shaderSource(vertShader, source);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error(`Vertex shader compilation failed: ${gl.getShaderInfoLog(vertShader)}`);
    }

    return vertShader;
  }

  /**
   * Creates a fragment shader from a string.
   */
  private static createFragmentShader_(gl: WebGL2RenderingContext, source: string): WebGLShader {
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!fragShader) {
      const error = gl.getError();

      throw new Error(`Failed to create fragment shader, WebGL error code: ${error}`);
    }

    gl.shaderSource(fragShader, source);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error(`Fragment shader compilation failed: ${gl.getShaderInfoLog(fragShader)}`);
    }

    return fragShader;
  }

  /**
   * Switches the program to use.
   */
  use(): void {
    this.gl_.useProgram(this.program);
  }
}
