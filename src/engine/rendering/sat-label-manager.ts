import { mat4 } from 'gl-matrix';
import { CameraType } from '../camera/camera-type';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { RADIUS_OF_EARTH } from '../utils/constants';
import { glsl } from '../utils/development/formatter';
import { BufferAttribute } from './buffer-attribute';
import { DepthManager } from './depth-manager';
import { WebGlProgramHelper } from './webgl-program';

/* eslint-disable camelcase */
/**
 * Characters available in the glyph atlas.
 * Index 0-9 = digits '0'-'9', 10='J', 11='S', 12='C'
 */
const GLYPH_CHARS = '0123456789JSC';
const ATLAS_COLS = 4;
const ATLAS_CELL_SIZE = 64;
const ATLAS_SIZE = ATLAS_CELL_SIZE * ATLAS_COLS; // 256x256
const MAX_CHARS_PER_LABEL = 8; // JSC12345 = 8 chars max

/**
 * Renders satellite labels (catalog numbers) as GPU-rendered textured quads
 * using instanced drawing with a glyph atlas texture.
 */
export class SatLabelManager {
  private gl_: WebGL2RenderingContext;
  private program_: WebGLProgram;
  private vao_: WebGLVertexArrayObject;
  private glyphTexture_: WebGLTexture;
  private isReady_ = false;

  // Quad geometry buffer (shared across all instances)
  private quadBuffer_: WebGLBuffer;

  // Per-instance buffers
  private satPositionBuffer_: WebGLBuffer;
  private glyphIndexBuffer_: WebGLBuffer;
  private charOffsetBuffer_: WebGLBuffer;

  // CPU-side typed arrays (preallocated)
  private satPositionData_: Float32Array;
  private glyphIndexData_: Float32Array;
  private charOffsetData_: Float32Array;
  private instanceCount_ = 0;
  private maxInstances_: number;

  // Track which satellite IDs are currently labeled and how many glyphs each has
  private labeledSatIds_: number[] = [];
  private labelGlyphCounts_: number[] = [];

  private attribs_ = {
    a_quadVertex: new BufferAttribute({ location: 0, vertices: 2, offset: 0 }),
    a_satPosition: new BufferAttribute({ location: 1, vertices: 3, offset: 0 }),
    a_glyphIndex: new BufferAttribute({ location: 2, vertices: 1, offset: 0 }),
    a_charOffset: new BufferAttribute({ location: 3, vertices: 1, offset: 0 }),
  };

  private uniforms_ = {
    u_pMvCamMatrix: <WebGLUniformLocation><unknown>null,
    u_screenSize: <WebGLUniformLocation><unknown>null,
    u_glyphSize: <WebGLUniformLocation><unknown>null,
    u_glyphAtlas: <WebGLUniformLocation><unknown>null,
    worldOffset: <WebGLUniformLocation><unknown>null,
    u_flatMapMode: <WebGLUniformLocation><unknown>null,
    u_gmst: <WebGLUniformLocation><unknown>null,
    u_currentGmst: <WebGLUniformLocation><unknown>null,
    u_earthRadius: <WebGLUniformLocation><unknown>null,
    u_flatMapCenterX: <WebGLUniformLocation><unknown>null,
    u_logDepthBufFC: <WebGLUniformLocation><unknown>null,
  };

  init(gl: WebGL2RenderingContext, maxLabels: number): void {
    this.gl_ = gl;
    this.maxInstances_ = maxLabels * MAX_CHARS_PER_LABEL;

    this.glyphTexture_ = this.generateGlyphAtlas_();
    this.initShaderProgram_();
    this.initBuffers_();
    this.initVao_();

    this.isReady_ = true;
  }

  /**
   * Updates the set of visible labels. Called from orbitsAbove() when the
   * visible satellite list changes (rate-limited).
   */
  updateLabels(visibleSatIds: number[], labelTexts: string[]): void {
    if (!this.isReady_) {
      return;
    }

    const dotsManager = ServiceLocator.getDotsManager();
    const positionData = dotsManager.positionData;

    if (!positionData) {
      return;
    }

    this.labeledSatIds_ = [];
    this.labelGlyphCounts_ = [];
    let instanceIdx = 0;

    for (let s = 0; s < visibleSatIds.length && instanceIdx < this.maxInstances_; s++) {
      const satId = visibleSatIds[s];
      const text = labelTexts[s];
      const posBase = satId * 3;

      if (posBase + 2 >= positionData.length) {
        continue;
      }

      const px = positionData[posBase];
      const py = positionData[posBase + 1];
      const pz = positionData[posBase + 2];

      const startIdx = instanceIdx;

      for (let c = 0; c < text.length && instanceIdx < this.maxInstances_; c++) {
        const glyphIdx = GLYPH_CHARS.indexOf(text[c]);

        if (glyphIdx === -1) {
          continue;
        }

        const base = instanceIdx * 3;

        this.satPositionData_[base] = px;
        this.satPositionData_[base + 1] = py;
        this.satPositionData_[base + 2] = pz;
        this.glyphIndexData_[instanceIdx] = glyphIdx;
        this.charOffsetData_[instanceIdx] = c; // character index; pixel spacing computed in shader
        instanceIdx++;
      }

      this.labeledSatIds_.push(satId);
      this.labelGlyphCounts_.push(instanceIdx - startIdx);
    }

    this.instanceCount_ = instanceIdx;
  }

  /**
   * Updates satellite positions each frame (positions interpolate between cruncher updates).
   * This is cheap since we only copy position floats for labeled satellites.
   */
  updatePositions(): void {
    if (!this.isReady_ || this.instanceCount_ === 0) {
      return;
    }

    const dotsManager = ServiceLocator.getDotsManager();
    const positionData = dotsManager.positionData;

    if (!positionData) {
      return;
    }

    let instanceIdx = 0;

    for (let s = 0; s < this.labeledSatIds_.length; s++) {
      const satId = this.labeledSatIds_[s];
      const glyphCount = this.labelGlyphCounts_[s];
      const posBase = satId * 3;

      if (posBase + 2 >= positionData.length) {
        // Stale labeledSatIds_ from before a catalog swap; skip until updateLabels() refreshes
        instanceIdx += glyphCount;
        continue;
      }
      const px = positionData[posBase];
      const py = positionData[posBase + 1];
      const pz = positionData[posBase + 2];

      for (let g = 0; g < glyphCount; g++) {
        const base = instanceIdx * 3;

        this.satPositionData_[base] = px;
        this.satPositionData_[base + 1] = py;
        this.satPositionData_[base + 2] = pz;
        instanceIdx++;
      }
    }
  }

  /**
   * Renders all visible satellite labels in a single instanced draw call.
   */
  draw(projectionCameraMatrix: mat4, tgtBuffer: WebGLFramebuffer | null): void {
    if (!this.isReady_ || this.instanceCount_ === 0) {
      return;
    }

    const gl = this.gl_;

    gl.useProgram(this.program_);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set uniforms
    gl.uniformMatrix4fv(this.uniforms_.u_pMvCamMatrix, false, projectionCameraMatrix);
    gl.uniform3fv(this.uniforms_.worldOffset, Scene.getInstance().worldShift ?? [0, 0, 0]);

    const isFlatMapLabel = ServiceLocator.getMainCamera().cameraType === CameraType.FLAT_MAP;

    gl.uniform1i(this.uniforms_.u_flatMapMode, isFlatMapLabel ? 1 : 0);
    gl.uniform1f(this.uniforms_.u_gmst, ServiceLocator.getDotsManager().cruncherGmst);
    gl.uniform1f(this.uniforms_.u_currentGmst, ServiceLocator.getTimeManager().gmst);
    gl.uniform1f(this.uniforms_.u_earthRadius, RADIUS_OF_EARTH);
    if (isFlatMapLabel) {
      gl.uniform1f(this.uniforms_.u_flatMapCenterX, ServiceLocator.getMainCamera().flatMapPanX);
    }

    gl.uniform2f(this.uniforms_.u_screenSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.uniforms_.u_glyphSize, gl.drawingBufferWidth * 0.013);
    gl.uniform1f(this.uniforms_.u_logDepthBufFC, DepthManager.getConfig().logDepthBufFC);

    // Bind glyph atlas texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphTexture_);
    gl.uniform1i(this.uniforms_.u_glyphAtlas, 0);

    // Upload instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.satPositionBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.satPositionData_, 0, this.instanceCount_ * 3);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glyphIndexBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glyphIndexData_, 0, this.instanceCount_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.charOffsetBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.charOffsetData_, 0, this.instanceCount_);

    // Draw
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // In planetarium/fixed-to-earth mode, keep depth test enabled so labels are occluded by the Earth
    const cameraType = ServiceLocator.getMainCamera().cameraType;
    const useDepthTest = cameraType === CameraType.PLANETARIUM || cameraType === CameraType.FIXED_TO_EARTH;

    if (!useDepthTest) {
      gl.disable(gl.DEPTH_TEST);
    }

    gl.bindVertexArray(this.vao_);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount_);
    gl.bindVertexArray(null);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  /**
   * Generates the glyph atlas texture at runtime using an OffscreenCanvas.
   * Renders digits 0-9 plus J, S, C with black outline and white fill.
   */
  private generateGlyphAtlas_(): WebGLTexture {
    const gl = this.gl_;
    const canvas = new OffscreenCanvas(ATLAS_SIZE, ATLAS_SIZE);
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

    const fontSize = Math.floor(ATLAS_CELL_SIZE * 0.7);

    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < GLYPH_CHARS.length; i++) {
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);
      const cx = col * ATLAS_CELL_SIZE + ATLAS_CELL_SIZE / 2;
      const cy = row * ATLAS_CELL_SIZE + ATLAS_CELL_SIZE / 2;

      // Black outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeText(GLYPH_CHARS[i], cx, cy);

      // White fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(GLYPH_CHARS[i], cx, cy);
    }

    const texture = gl.createTexture()!;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
  }

  private initShaderProgram_(): void {
    const gl = this.gl_;

    const vertShader = glsl`#version 300 es
      precision highp float;

      // Per-vertex (unit quad: 2 triangles)
      in vec2 a_quadVertex;

      // Per-instance
      in vec3 a_satPosition;
      in float a_glyphIndex;
      in float a_charOffset;

      uniform mat4 u_pMvCamMatrix;
      uniform vec3 worldOffset;
      uniform vec2 u_screenSize;
      uniform float u_glyphSize;
      uniform bool u_flatMapMode;
      uniform float u_gmst;
      uniform float u_currentGmst;
      uniform float u_earthRadius;
      uniform float u_flatMapCenterX;
      uniform float u_logDepthBufFC;

      out vec2 vTexCoord;
      out float vClipW;

      void main() {
        // Project satellite 3D position to clip space
        vec3 eciPos = a_satPosition + worldOffset;
        vec4 clipPos;

        if (u_flatMapMode) {
            float PI = 3.14159265359;
            float eciDist = length(eciPos);
            if (eciDist > 1.0e7) {
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                return;
            }
            float lon = atan(eciPos.y, eciPos.x) - u_gmst;
            lon = mod(lon + PI, 2.0 * PI) - PI;
            float lat = atan(eciPos.z, length(eciPos.xy));
            float alt = eciDist - u_earthRadius;
            vec3 flatPos = vec3(lon * u_earthRadius, lat * u_earthRadius, alt * 0.001);

            // Wrap X to nearest copy of camera center for seamless scrolling
            float mapW = 2.0 * PI * u_earthRadius;
            flatPos.x = u_flatMapCenterX + mod(flatPos.x - u_flatMapCenterX + mapW * 0.5, mapW) - mapW * 0.5;

            clipPos = u_pMvCamMatrix * vec4(flatPos, 1.0);
        } else {
            // Rotate stale ground-object ECI positions to match current Earth rotation
            float groundDist = length(a_satPosition);
            if (groundDist < 6421.0) {
                float deltaGmst = u_currentGmst - u_gmst;
                float cosD = cos(deltaGmst);
                float sinD = sin(deltaGmst);
                eciPos = vec3(
                    a_satPosition.x * cosD - a_satPosition.y * sinD + worldOffset.x,
                    a_satPosition.x * sinD + a_satPosition.y * cosD + worldOffset.y,
                    a_satPosition.z + worldOffset.z
                );
            }
            clipPos = u_pMvCamMatrix * vec4(eciPos, 1.0);
        }

        // Discard labels behind the camera
        if (clipPos.w <= 0.0) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // Off-screen
          return;
        }

        // Perspective divide to get NDC
        vec2 ndc = clipPos.xy / clipPos.w;

        // Discard if outside visible area (with margin)
        if (abs(ndc.x) > 1.2 || abs(ndc.y) > 1.2) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }

        // Convert NDC to screen pixels
        vec2 screenPos = (ndc * 0.5 + 0.5) * u_screenSize;

        // Offset: right of dot, centered vertically
        // Character advance is proportional to glyph size so labels scale with screen
        float charAdvance = u_glyphSize * 0.55;
        screenPos.x += u_glyphSize * 0.8 + a_charOffset * charAdvance;
        screenPos.y -= u_glyphSize * 0.5;

        // Add quad vertex offset (in pixels)
        screenPos += a_quadVertex * u_glyphSize;

        // Convert back to NDC
        vec2 finalNdc = (screenPos / u_screenSize) * 2.0 - 1.0;

        // Use logarithmic depth to match the Earth's depth encoding
        float logZ = log2(1.0 + clipPos.w) * u_logDepthBufFC - 1.0;
        gl_Position = vec4(finalNdc, logZ, 1.0);

        // Compute texture coordinates into glyph atlas
        // Flip Y because canvas Y=0 is top but WebGL texture Y=0 is bottom
        float col = mod(a_glyphIndex, ${ATLAS_COLS}.0);
        float row = floor(a_glyphIndex / ${ATLAS_COLS}.0);
        vec2 texQuadVert = vec2(a_quadVertex.x, 1.0 - a_quadVertex.y);
        vTexCoord = (texQuadVert + vec2(col, row)) / ${ATLAS_COLS}.0;
        vClipW = clipPos.w;
      }
    `;

    const fragShader = glsl`#version 300 es
      precision highp float;

      uniform sampler2D u_glyphAtlas;

      in vec2 vTexCoord;
      in float vClipW;

      out vec4 fragColor;

      void main() {
        if (vClipW <= 0.0) discard;

        vec4 texel = texture(u_glyphAtlas, vTexCoord);
        if (texel.a < 0.1) discard;

        fragColor = texel;
      }
    `;

    const programHelper = new WebGlProgramHelper(
      gl,
      vertShader,
      fragShader,
      this.attribs_,
      this.uniforms_,
      { name: 'SatLabels' },
    );

    this.program_ = programHelper.program;
  }

  private initBuffers_(): void {
    const gl = this.gl_;

    // Unit quad: two triangles forming a [0,0]-[1,1] square
    // prettier-ignore
    const quadVertices = new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1,
    ]);

    this.quadBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Preallocate instance buffers
    this.satPositionData_ = new Float32Array(this.maxInstances_ * 3);
    this.satPositionBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.satPositionBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.satPositionData_.byteLength, gl.DYNAMIC_DRAW);

    this.glyphIndexData_ = new Float32Array(this.maxInstances_);
    this.glyphIndexBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glyphIndexBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.glyphIndexData_.byteLength, gl.DYNAMIC_DRAW);

    this.charOffsetData_ = new Float32Array(this.maxInstances_);
    this.charOffsetBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.charOffsetBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.charOffsetData_.byteLength, gl.DYNAMIC_DRAW);
  }

  private initVao_(): void {
    const gl = this.gl_;

    this.vao_ = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao_);

    // Per-vertex attribute: quad vertices (divisor 0 — advances per vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer_);
    gl.enableVertexAttribArray(this.attribs_.a_quadVertex.location);
    gl.vertexAttribPointer(this.attribs_.a_quadVertex.location, 2, gl.FLOAT, false, 0, 0);

    // Per-instance attribute: satellite position (divisor 1 — advances per instance)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.satPositionBuffer_);
    gl.enableVertexAttribArray(this.attribs_.a_satPosition.location);
    gl.vertexAttribPointer(this.attribs_.a_satPosition.location, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(this.attribs_.a_satPosition.location, 1);

    // Per-instance attribute: glyph index (divisor 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glyphIndexBuffer_);
    gl.enableVertexAttribArray(this.attribs_.a_glyphIndex.location);
    gl.vertexAttribPointer(this.attribs_.a_glyphIndex.location, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(this.attribs_.a_glyphIndex.location, 1);

    // Per-instance attribute: character offset (divisor 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.charOffsetBuffer_);
    gl.enableVertexAttribArray(this.attribs_.a_charOffset.location);
    gl.vertexAttribPointer(this.attribs_.a_charOffset.location, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(this.attribs_.a_charOffset.location, 1);

    gl.bindVertexArray(null);
  }
}
