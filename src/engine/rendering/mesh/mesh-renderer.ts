import { ServiceLocator } from '@app/engine/core/service-locator';
import { glsl } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { mat4 } from 'gl-matrix';
import { OBJ } from 'webgl-obj-loader';
import { DepthManager } from '../depth-manager';
import { OcclusionProgram } from '../draw-manager/post-processing';
import type { MeshManager, MeshModel } from '../mesh-manager';

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
    uPMatrix: <WebGLUniformLocation>(<unknown>null),
    uCamMatrix: <WebGLUniformLocation>(<unknown>null),
    uMvMatrix: <WebGLUniformLocation>(<unknown>null),
    uNormalMatrix: <WebGLUniformLocation>(<unknown>null),
    uLightDirection: <WebGLUniformLocation>(<unknown>null),
    uInSun: <WebGLUniformLocation>(<unknown>null),
    logDepthBufFC: <WebGLUniformLocation>(<unknown>null),
    uFlagEnabled: <WebGLUniformLocation>(<unknown>null),
    uFlagAtlas: <WebGLUniformLocation>(<unknown>null),
    uFlagCell: <WebGLUniformLocation>(<unknown>null),
    uDecalCenter: <WebGLUniformLocation>(<unknown>null),
    uDecalDir: <WebGLUniformLocation>(<unknown>null),
    uDecalU: <WebGLUniformLocation>(<unknown>null),
    uDecalV: <WebGLUniformLocation>(<unknown>null),
    uDecalHalfSize: <WebGLUniformLocation>(<unknown>null),
    uFlagAlpha: <WebGLUniformLocation>(<unknown>null),
  };

  /** Texture unit the flag atlas sampler reads (unit 0 is left to the rest of the engine). */
  static readonly FLAG_ATLAS_UNIT = 1;
  /**
   * 1x1 texture kept on the atlas unit while the flag is off, so the sampler never points at
   * whatever another pass left there (which could be the framebuffer being drawn into).
   */
  private flagPlaceholder_: WebGLTexture | null = null;

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

    // Don't draw meshes if the camera is too far away. camDistBuffer is the
    // satellite-snap standoff and never updates while a deep-space probe is the
    // centered body (nothing is selected), so use the camera's real distance
    // from the center body there - same 25 km reveal as any other satellite.
    const camera = ServiceLocator.getMainCamera();
    const isDeepSpaceSatCentered = Boolean(ServiceLocator.getScene().deepSpaceSatellites?.[settingsManager.centerBody]);
    const distToMesh = isDeepSpaceSatCentered ? camera.calcDistanceBasedOnZoom() : camera.state.camDistBuffer;

    if (distToMesh >= settingsManager.nearZoomLevel) {
      return;
    }
    if (
      typeof this.meshManager_.currentMeshObject.id === 'undefined' ||
      typeof this.meshManager_.currentMeshObject.model === 'undefined' ||
      this.meshManager_.currentMeshObject.id === -1
    ) {
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

    gl.uniform3fv(this.uniforms_.uLightDirection, this.meshManager_.lightDirection ?? ServiceLocator.getScene().earth.lightDirection);
    gl.uniformMatrix3fv(this.uniforms_.uNormalMatrix, false, this.meshManager_.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uMvMatrix, false, this.meshManager_.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.uCamMatrix, false, camMatrix);
    gl.uniform1f(this.uniforms_.uInSun, this.meshManager_.currentMeshObject.inSun);
    gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    this.setFlagUniforms_(camMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.meshManager_.currentMeshObject.model.buffers.vertexBuffer);
    this.changeVertexAttribArrays(true);
    this.applyAttributePointers_(this.meshManager_.currentMeshObject.model);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshManager_.currentMeshObject.model.buffers.indexBuffer);
    const indexType = this.meshManager_.currentMeshObject.model.buffers.useUint32Indices ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    gl.drawElements(gl.TRIANGLES, this.meshManager_.currentMeshObject.model.buffers.indexCount, indexType, 0);

    this.changeVertexAttribArrays(false);
    gl.disable(gl.BLEND);
  }

  /**
   * Flag decal uniforms. When the decal is off only uFlagEnabled = 0 is written (plus the
   * placeholder bind); the shader's single `uFlagEnabled > 0.5` branch then skips all decal work.
   */
  private setFlagUniforms_(camMatrix: mat4): void {
    const gl = this.gl_;
    const atlas = this.meshManager_.prepareFlagDecal(camMatrix);

    gl.activeTexture(gl.TEXTURE0 + MeshRenderer.FLAG_ATLAS_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, atlas ?? this.flagPlaceholder_);
    gl.activeTexture(gl.TEXTURE0);

    if (!atlas) {
      gl.uniform1f(this.uniforms_.uFlagEnabled, 0);

      return;
    }

    const meshObject = this.meshManager_.currentMeshObject;
    const bounds = meshObject.model.bounds!;
    const basis = this.meshManager_.decalBasis;

    gl.uniform1f(this.uniforms_.uFlagEnabled, 1);
    gl.uniform4fv(this.uniforms_.uFlagCell, meshObject.flag!.cell);
    gl.uniform3fv(this.uniforms_.uDecalCenter, bounds.center);
    gl.uniform3fv(this.uniforms_.uDecalDir, basis.dir);
    gl.uniform3fv(this.uniforms_.uDecalU, basis.u);
    gl.uniform3fv(this.uniforms_.uDecalV, basis.v);
    gl.uniform1f(this.uniforms_.uDecalHalfSize, bounds.radius * settingsManager.flagDecalScale);
    gl.uniform1f(this.uniforms_.uFlagAlpha, settingsManager.flagDecalAlpha);
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
      const occIndexType = this.meshManager_.currentMeshObject.model.buffers!.useUint32Indices ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

      gl.drawElements(gl.TRIANGLES, this.meshManager_.currentMeshObject.model.buffers!.indexCount, occIndexType, 0);

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
      errorManagerInstance.warn(t7e('errorMsgs.Rendering.shaderInitFailed'));
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
    this.uniforms_.uFlagEnabled = gl.getUniformLocation(this.program_, 'uFlagEnabled') as WebGLUniformLocation;
    this.uniforms_.uFlagAtlas = gl.getUniformLocation(this.program_, 'uFlagAtlas') as WebGLUniformLocation;
    this.uniforms_.uFlagCell = gl.getUniformLocation(this.program_, 'uFlagCell') as WebGLUniformLocation;
    this.uniforms_.uDecalCenter = gl.getUniformLocation(this.program_, 'uDecalCenter') as WebGLUniformLocation;
    this.uniforms_.uDecalDir = gl.getUniformLocation(this.program_, 'uDecalDir') as WebGLUniformLocation;
    this.uniforms_.uDecalU = gl.getUniformLocation(this.program_, 'uDecalU') as WebGLUniformLocation;
    this.uniforms_.uDecalV = gl.getUniformLocation(this.program_, 'uDecalV') as WebGLUniformLocation;
    this.uniforms_.uDecalHalfSize = gl.getUniformLocation(this.program_, 'uDecalHalfSize') as WebGLUniformLocation;
    this.uniforms_.uFlagAlpha = gl.getUniformLocation(this.program_, 'uFlagAlpha') as WebGLUniformLocation;
    // The sampler unit never changes, so set it once here.
    gl.uniform1i(this.uniforms_.uFlagAtlas, MeshRenderer.FLAG_ATLAS_UNIT);

    this.flagPlaceholder_ = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.flagPlaceholder_);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private applyAttributePointers_(model: MeshModel) {
    if (!model.mesh || !model.layout) {
      errorManagerInstance.warn(t7e('errorMsgs.Rendering.meshModelUndefined'));

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
        errorManagerInstance.warn(t7e('errorMsgs.Rendering.shaderAttributeMissing').replace('{attr}', attrName));
        this.numOfWarnings_++;
      }
    }
  }

  private readonly shader_ = {
    frag: glsl`#version 300 es
    precision highp float;

    in vec3 vLightDirection;
    in float vInSun;
    in vec3 vTransformedNormal;
    in vec2 vTextureCoord;
    in vec4 vPosition;
    in vec3 vAmbient;
    in vec3 vDiffuse;
    in vec3 vSpecular;
    in float vSpecularExponent;
    in vec3 vModelPos;
    in vec3 vModelNormal;

    uniform float logDepthBufFC;

    // Flag decal, projected along uDecalDir (model space) onto the camera-facing side.
    uniform float uFlagEnabled;
    uniform sampler2D uFlagAtlas;
    uniform vec4 uFlagCell;
    uniform vec3 uDecalCenter;
    uniform vec3 uDecalDir;
    uniform vec3 uDecalU;
    uniform vec3 uDecalV;
    uniform float uDecalHalfSize;
    uniform float uFlagAlpha;

    out vec4 fragColor;

    void main(void) {
      float lightAmt = max(dot(vTransformedNormal, vLightDirection), 0.0);

      vec3 baseColor = vDiffuse;
      vec3 ambientTint = vAmbient;

      if (uFlagEnabled > 0.5) {
        vec3 p = vModelPos - uDecalCenter;
        float du = dot(p, uDecalU) / uDecalHalfSize;
        // Flags are 3:2, so the decal is 2/3 as tall as it is wide.
        float dv = 1.5 * dot(p, uDecalV) / uDecalHalfSize;
        vec2 flagUv = uFlagCell.xy + clamp(vec2(du, -dv) * 0.5 + 0.5, 0.0, 1.0) * uFlagCell.zw;
        // Sampled before the per-fragment test so the lookup stays in uniform control flow.
        vec3 flagColor = texture(uFlagAtlas, flagUv).rgb;
        float inside = step(abs(du), 1.0) * step(abs(dv), 1.0) * step(0.25, dot(normalize(vModelNormal), uDecalDir));
        float a = uFlagAlpha * inside;

        // Mixed in before lighting so the flag shades with the model.
        baseColor = mix(baseColor, flagColor, a);
        ambientTint = mix(ambientTint, vec3(1.0), a);
      }

      vec3 ambientColor = baseColor * 0.1;
      vec3 dirColor = baseColor * ambientTint * lightAmt * (min(vInSun,1.0) * 0.65);
      vec3 specColor = vSpecular * lightAmt * (min(vInSun,1.0) * 0.65);

      vec3 color = ambientColor + dirColor + specColor;

      fragColor = vec4(color, 1.0);

      ${DepthManager.getLogDepthFragCode()}
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
    out vec3 vModelPos;
    out vec3 vModelNormal;

    void main(void) {
      vModelPos = aVertexPosition;
      vModelNormal = aVertexNormal;
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
