import { glsl } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { mat4 } from 'gl-matrix';
import { OBJ } from 'webgl-obj-loader';
import { DepthManager } from '../depth-manager';
import { OcclusionProgram } from '../draw-manager/post-processing';
import type { MeshManager, MeshModel } from '../mesh-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class MeshRenderer {
  private readonly gl_: WebGL2RenderingContext;
  private readonly meshManager_: MeshManager;
  private program_: WebGLProgram;

  private attrIndices_ = {};
  private attribs_: {
    aVertexPosition: string;
    aVertexNormal: string;
    aTextureCoord: string;
    aAmbient: string;
    aDiffuse: string;
    aSpecular: string;
    aSpecularExponent: string;
  };

  private numOfWarnings_: number;

  private readonly uniforms_ = {
    uPMatrix: <WebGLUniformLocation><unknown>null,
    uCamMatrix: <WebGLUniformLocation><unknown>null,
    uMvMatrix: <WebGLUniformLocation><unknown>null,
    uNormalMatrix: <WebGLUniformLocation><unknown>null,
    uLightDirection: <WebGLUniformLocation><unknown>null,
    uInSun: <WebGLUniformLocation><unknown>null,
    logDepthBufFC: <WebGLUniformLocation><unknown>null,
  };

  constructor(meshManager: MeshManager, gl: WebGL2RenderingContext) {
    this.gl_ = gl;
    this.meshManager_ = meshManager;
    this.initShaders();
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer = null as WebGLFramebuffer | null) {
    // Meshes aren't finished loading
    if (settingsManager.disableUI || settingsManager.isDrawLess || settingsManager.noMeshManager) {
      return;
    }
    if (!this.meshManager_.isReady) {
      return;
    }

    // Check for this.currentMeshObject.model.mesh.vertexBuffer
    if (!this.meshManager_.currentMeshObject.model?.buffers?.vertexBuffer) {
      // Our mesh is probably still downloading. Skip drawing
      return;
    }

    // Don't draw meshes if the camera is too far away
    if (ServiceLocator.getMainCamera().state.camDistBuffer >= settingsManager.nearZoomLevel) {
      return;
    }
    if (
      typeof this.meshManager_.currentMeshObject.id === 'undefined' || typeof this.meshManager_.currentMeshObject.model === 'undefined' ||
      this.meshManager_.currentMeshObject.id === -1) {
      return;
    }

    if (this.meshManager_.currentMeshObject.model === null) {
      errorManagerInstance.debug('Race Condition: Mesh Object Model is null');

      return;
    }

    const gl = this.gl_;

    gl.enable(gl.BLEND);
    gl.useProgram(this.program_);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.uniform3fv(this.uniforms_.uLightDirection, ServiceLocator.getScene().earth.lightDirection);
    gl.uniformMatrix3fv(this.uniforms_.uNormalMatrix, false, this.meshManager_.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uMvMatrix, false, this.meshManager_.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.uCamMatrix, false, camMatrix);
    gl.uniform1f(this.uniforms_.uInSun, this.meshManager_.currentMeshObject.inSun);
    gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.meshManager_.currentMeshObject.model.buffers.vertexBuffer);
    this.changeVertexAttribArrays(true);
    this.applyAttributePointers_(this.meshManager_.currentMeshObject.model);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshManager_.currentMeshObject.model.buffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.meshManager_.currentMeshObject.model.buffers.indexCount, gl.UNSIGNED_SHORT, 0);

    this.changeVertexAttribArrays(false);
    gl.disable(gl.BLEND);
  }

  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLBuffer) {
    if (settingsManager.disableUI || settingsManager.isDrawLess) {
      return;
    }

    if (!this.meshManager_.currentMeshObject?.model?.mesh) {
      return;
    }
    if (typeof this.meshManager_.currentMeshObject?.id === 'undefined' || this.meshManager_.currentMeshObject?.id === -1) {
      return;
    }

    const gl = this.gl_;

    try {
      gl.useProgram(occlusionPrgm.program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

      occlusionPrgm.attrSetup(this.meshManager_.currentMeshObject.model.buffers!.vertexBuffer, 80);

      // Set the uniforms
      occlusionPrgm.uniformSetup(this.meshManager_.mvMatrix_, pMatrix, camMatrix);
      gl.uniform3fv(occlusionPrgm.uniform.uWorldOffset, [0, 0, 0]);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshManager_.currentMeshObject.model.buffers!.indexBuffer);
      gl.drawElements(gl.TRIANGLES, this.meshManager_.currentMeshObject.model.buffers!.indexCount, gl.UNSIGNED_SHORT, 0);

      occlusionPrgm.attrOff();
    } catch {
      // Don't let meshManager break everything
    }
  }

  private initShaders() {
    const gl = this.gl_;

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!fragShader) {
      throw new Error('Could not create fragment shader');
    }

    const fragCode = this.shader_.frag;

    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    const vertShader = gl.createShader(gl.VERTEX_SHADER);

    if (!vertShader) {
      throw new Error('Could not create vertex shader');
    }

    const vertCode = this.shader_.vert;

    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    this.program_ = gl.createProgram();
    gl.attachShader(this.program_, vertShader);
    gl.attachShader(this.program_, fragShader);
    gl.linkProgram(this.program_);

    if (!gl.getProgramParameter(this.program_, gl.LINK_STATUS)) {
      errorManagerInstance.warn('Could not initialise shaders');
    }
    gl.useProgram(this.program_);

    this.attribs_ = {
      aVertexPosition: OBJ.Layout.POSITION.key,
      aVertexNormal: OBJ.Layout.NORMAL.key,
      aTextureCoord: OBJ.Layout.UV.key,
      aAmbient: OBJ.Layout.AMBIENT.key,
      aDiffuse: OBJ.Layout.DIFFUSE.key,
      aSpecular: OBJ.Layout.SPECULAR.key,
      aSpecularExponent: OBJ.Layout.SPECULAR_EXPONENT.key,
    };

    this.uniforms_.uPMatrix = gl.getUniformLocation(this.program_, 'uPMatrix') as WebGLUniformLocation;
    this.uniforms_.uCamMatrix = gl.getUniformLocation(this.program_, 'uCamMatrix') as WebGLUniformLocation;
    this.uniforms_.uMvMatrix = gl.getUniformLocation(this.program_, 'uMvMatrix') as WebGLUniformLocation;
    this.uniforms_.uNormalMatrix = gl.getUniformLocation(this.program_, 'uNormalMatrix') as WebGLUniformLocation;
    this.uniforms_.uLightDirection = gl.getUniformLocation(this.program_, 'uLightDirection') as WebGLUniformLocation;
    this.uniforms_.uInSun = gl.getUniformLocation(this.program_, 'uInSun') as WebGLUniformLocation;
    this.uniforms_.logDepthBufFC = gl.getUniformLocation(this.program_, 'logDepthBufFC') as WebGLUniformLocation;
  }

  private applyAttributePointers_(model: MeshModel) {
    if (!model.mesh || !model.layout) {
      errorManagerInstance.warn('Mesh model is not defined. Cannot apply attribute pointers.');

      return;
    }

    const gl = this.gl_;

    for (const attrName in this.attribs_) {
      if (!Object.hasOwn(this.attribs_, attrName) || this.attrIndices_[attrName] === -1) {
        continue;
      }
      const layoutKey = this.attribs_[attrName];

      if (typeof this.attrIndices_[attrName] !== 'undefined' && this.attrIndices_[attrName] !== -1) {
        const attr = model.layout.attributeMap[layoutKey];

        gl.vertexAttribPointer(this.attrIndices_[attrName], attr.size, gl[attr.type], attr.normalized, attr.stride, attr.offset);
      }
    }
  }

  private changeVertexAttribArrays(enable: boolean) {
    const gl = this.gl_;

    for (const attrName in this.attribs_) {
      if (!Object.hasOwn(this.attribs_, attrName)) {
        continue;
      }
      this.attrIndices_[attrName] = gl.getAttribLocation(this.program_, attrName);
      if (this.attrIndices_[attrName] !== -1) {
        if (enable) {
          gl.enableVertexAttribArray(this.attrIndices_[attrName]);
        } else {
          gl.disableVertexAttribArray(this.attrIndices_[attrName]);
        }
      } else if (this.numOfWarnings_ < 10) {
        errorManagerInstance.warn(`Shader attribute "${attrName}" not found in shader. Is it undeclared or unused in the shader code?`);
        this.numOfWarnings_++;
      }
    }
  }

  private readonly shader_ = {
    frag: glsl`#version 300 es
    precision mediump float;

    in vec3 vLightDirection;
    in float vInSun;
    in vec3 vTransformedNormal;
    in vec2 vTextureCoord;
    in vec4 vPosition;
    in vec3 vAmbient;
    in vec3 vDiffuse;
    in vec3 vSpecular;
    in float vSpecularExponent;

    out vec4 fragColor;

    void main(void) {
      float lightAmt = max(dot(vTransformedNormal, vLightDirection), 0.0);

      vec3 ambientColor = vDiffuse * 0.1;
      vec3 dirColor = vDiffuse * vAmbient * lightAmt * (min(vInSun,1.0) * 0.65);
      vec3 specColor = vSpecular * lightAmt * (min(vInSun,1.0) * 0.65);

      vec3 color = ambientColor + dirColor + specColor;

      fragColor = vec4(color, 1.0);
    }
  `,
    vert: glsl`#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec3 aSpecular;
    in float aSpecularExponent;
    in vec3 aAmbient;
    in vec3 aDiffuse;
    in vec2 aTextureCoord;

    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;
    uniform vec3 uLightDirection;
    uniform float uInSun;
    uniform float logDepthBufFC;

    out vec2 vTextureCoord;
    out vec3 vTransformedNormal;
    out vec4 vPosition;
    out vec3 vLightDirection;
    out float vInSun;

    out vec3 vAmbient;
    out vec3 vDiffuse;
    out vec3 vSpecular;
    out float vSpecularExponent;

    void main(void) {
      vLightDirection = uLightDirection;
      vAmbient = aAmbient;
      vDiffuse = aDiffuse;
      vSpecular = aSpecular;
      vSpecularExponent = aSpecularExponent;
      vInSun = uInSun;

      vPosition = uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
      gl_Position = uPMatrix * vPosition;
      vTextureCoord = aTextureCoord;
      vTransformedNormal  = uNormalMatrix * aVertexNormal;

      ${DepthManager.getLogDepthVertCode()}
    }
  `,
  };
}
