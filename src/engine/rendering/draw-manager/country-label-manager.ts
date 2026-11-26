/* eslint-disable camelcase */
import { DEG2RAD, EcefVec3, Kilometers, llaRad2ecef, Radians } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import i18next from 'i18next';
import { glsl } from '../../utils/development/formatter';
import { BufferAttribute } from '../buffer-attribute';
import { DepthManager } from '../depth-manager';
import { WebGlProgramHelper } from '../webgl-program';
import { PoliticalCountry, PoliticalMap } from './political-map';

/** Atlas texture width; rows grow downward and height rounds up to a power of 2. */
const ATLAS_WIDTH = 2048;
const ATLAS_MAX_HEIGHT = 4096;
const ATLAS_ROW_HEIGHT = 44;
const ATLAS_FONT_PX = 30;
const ATLAS_PAD_X = 8;

const MAX_LABELS = 384;
/** Anchor altitude — floats labels just off the surface so they depth-test cleanly. */
const LABEL_ALT_KM = 20 as Kilometers;
/** View-space pull toward the camera (km) so near-side labels never z-fight the globe. */
const DEPTH_BIAS_KM = 150;
/** How often the visible-label set is re-evaluated. */
const REBUILD_INTERVAL_MS = 250;

/**
 * Maps camera distance from Earth's center (km) to a Natural Earth zoom level,
 * which MIN_LABEL values are calibrated against (~1.5 shows only the largest
 * countries, ~6.5 shows nearly all).
 */
export const neZoomFromCameraDistance = (distKm: number): number => {
  const zoom = 22.9 - 1.355 * Math.log2(Math.max(distKm, 1));

  return Math.min(Math.max(zoom, 0), 7);
};

interface AtlasEntry {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  aspect: number;
  ecf: [number, number, number];
  minLabel: number;
  labelRank: number;
}

interface AtlasPlacement {
  text: string;
  x: number;
  y: number;
  w: number;
  country: PoliticalCountry;
}

/**
 * Pack the label texts into ATLAS_WIDTH-wide rows (stopping at ATLAS_MAX_HEIGHT) and size the atlas to the next power
 * of two that holds them.
 * @param measure Text width in px at the atlas font
 */
export const packCountryAtlas = (countries: PoliticalCountry[], locale: string, measure: (text: string) => number): { placements: AtlasPlacement[]; height: number } => {
  const placements: AtlasPlacement[] = [];
  let x = 0;
  let y = 0;

  for (const country of countries) {
    const text = country.names?.[locale] ?? country.name;

    if (!text) {
      continue;
    }
    const w = Math.min(Math.ceil(measure(text)) + ATLAS_PAD_X * 2, ATLAS_WIDTH);

    if (x + w > ATLAS_WIDTH) {
      x = 0;
      y += ATLAS_ROW_HEIGHT;
    }
    if (y + ATLAS_ROW_HEIGHT > ATLAS_MAX_HEIGHT) {
      break;
    }
    placements.push({ text, x, y, w, country });
    x += w;
  }

  let height = 2;

  while (height < y + ATLAS_ROW_HEIGHT) {
    height *= 2;
  }

  return { placements, height };
};

/** Texture rectangle and WGS84 Earth-fixed anchor of one packed label. */
export const countryAtlasEntry = ({ x, y, w, country }: AtlasPlacement, height: number): AtlasEntry => {
  const ecf = countryLabelEcf(country.labelLat, country.labelLon);

  return {
    u0: x / ATLAS_WIDTH,
    v0: y / height,
    u1: (x + w) / ATLAS_WIDTH,
    v1: (y + ATLAS_ROW_HEIGHT) / height,
    aspect: w / ATLAS_ROW_HEIGHT,
    ecf: [ecf.x, ecf.y, ecf.z],
    minLabel: country.minLabel,
    labelRank: country.labelRank,
  };
};

/**
 * Earth-fixed anchor of a country label: the WGS84 geodetic point LABEL_ALT_KM above the ellipsoid
 * (the old `lla2eci(..., gmst 0)` put it on the 6371 km sphere, up to ~22 km off the globe).
 * @param latDeg - Geodetic latitude in degrees
 * @param lonDeg - Longitude in degrees
 */
export const countryLabelEcf = (latDeg: number, lonDeg: number): EcefVec3<Kilometers> =>
  llaRad2ecef({ lat: (latDeg * DEG2RAD) as Radians, lon: (lonDeg * DEG2RAD) as Radians, alt: LABEL_ALT_KM });

/**
 * Country name labels for the political map, rendered as GPU billboards.
 *
 * All names for the current dataset + locale are drawn once into a 2D-canvas
 * text atlas (full Unicode via system fonts — CJK/Cyrillic included), then the
 * visible subset is drawn as instanced screen-space quads anchored at each
 * country's Natural Earth label point. Anchors are stored in ECF and rotated by
 * GMST in the vertex shader, and depth-test against the globe (log depth) so
 * far-side labels are hidden. Visibility declutters by camera distance using
 * Natural Earth's MIN_LABEL ranking.
 */
export class CountryLabelManager {
  private gl_: WebGL2RenderingContext | null = null;
  private program_: WebGLProgram | null = null;
  private vao_: WebGLVertexArrayObject | null = null;
  private quadBuffer_: WebGLBuffer | null = null;
  private instanceBuffer_: WebGLBuffer | null = null;
  private atlasTexture_: WebGLTexture | null = null;
  private atlasEntries_: AtlasEntry[] = [];
  private atlasRevision_ = -1;
  private atlasLocale_ = '';
  private lastRebuildMs_ = 0;
  private instanceCount_ = 0;
  /** ecf(3) + uv rect(4) + aspect(1) per instance. */
  private readonly instanceData_ = new Float32Array(MAX_LABELS * 8);
  private isReady_ = false;

  private readonly attribs_ = {
    a_quadVertex: new BufferAttribute({ location: 0, vertices: 2, offset: 0 }),
    a_ecfPosition: new BufferAttribute({ location: 1, vertices: 3, offset: 0 }),
    a_uvRect: new BufferAttribute({ location: 2, vertices: 4, offset: 0 }),
    a_aspect: new BufferAttribute({ location: 3, vertices: 1, offset: 0 }),
  };

  private readonly uniforms_ = {
    u_pMvCamMatrix: null as unknown as WebGLUniformLocation,
    worldOffset: null as unknown as WebGLUniformLocation,
    u_gmst: null as unknown as WebGLUniformLocation,
    u_screenSize: null as unknown as WebGLUniformLocation,
    u_labelHeight: null as unknown as WebGLUniformLocation,
    u_depthBias: null as unknown as WebGLUniformLocation,
    u_logDepthBufFC: null as unknown as WebGLUniformLocation,
    u_atlas: null as unknown as WebGLUniformLocation,
  };

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;
    this.program_ = new WebGlProgramHelper(gl, this.shaders_.vert, this.shaders_.frag, this.attribs_, this.uniforms_, { name: 'CountryLabels' }).program;
    this.initBuffers_();
    this.initVao_();
    this.isReady_ = true;
  }

  /**
   * Rebuilds the atlas (dataset/locale change) and the visible instance set
   * (camera-distance declutter). Throttled internally; call once per frame.
   */
  update(cameraDistKm: number, nowMs: number): void {
    if (!this.isReady_) {
      return;
    }

    const politicalMap = PoliticalMap.getInstance();
    const countries = politicalMap.labelCountries;

    if (!countries) {
      this.instanceCount_ = 0;

      return;
    }

    const locale = (i18next.language ?? 'en').slice(0, 2);

    if (politicalMap.labelRevision !== this.atlasRevision_ || locale !== this.atlasLocale_) {
      this.buildAtlas_(countries, locale);
      this.atlasRevision_ = politicalMap.labelRevision;
      this.atlasLocale_ = locale;
      this.lastRebuildMs_ = 0;
    }

    if (nowMs - this.lastRebuildMs_ < REBUILD_INTERVAL_MS) {
      return;
    }
    this.lastRebuildMs_ = nowMs;

    const zoom = neZoomFromCameraDistance(cameraDistKm);
    let count = 0;

    for (const entry of this.atlasEntries_) {
      if (entry.minLabel > zoom || count >= MAX_LABELS) {
        continue;
      }
      const o = count * 8;

      this.instanceData_[o] = entry.ecf[0];
      this.instanceData_[o + 1] = entry.ecf[1];
      this.instanceData_[o + 2] = entry.ecf[2];
      this.instanceData_[o + 3] = entry.u0;
      this.instanceData_[o + 4] = entry.v0;
      this.instanceData_[o + 5] = entry.u1;
      this.instanceData_[o + 6] = entry.v1;
      this.instanceData_[o + 7] = entry.aspect;
      count++;
    }
    this.instanceCount_ = count;

    const gl = this.gl_!;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceData_, 0, count * 8);
  }

  draw(projectionCameraMatrix: mat4, worldShift: number[] | null, gmst: number, tgtBuffer: WebGLFramebuffer | null): void {
    if (!this.isReady_ || this.instanceCount_ === 0 || !this.atlasTexture_) {
      return;
    }

    const gl = this.gl_!;

    gl.useProgram(this.program_);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.uniformMatrix4fv(this.uniforms_.u_pMvCamMatrix, false, projectionCameraMatrix);
    gl.uniform3fv(this.uniforms_.worldOffset, (worldShift as [number, number, number] | null) ?? [0, 0, 0]);
    gl.uniform1f(this.uniforms_.u_gmst, gmst);
    gl.uniform2f(this.uniforms_.u_screenSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.uniforms_.u_labelHeight, Math.max(gl.drawingBufferWidth, gl.drawingBufferHeight) * 0.012);
    gl.uniform1f(this.uniforms_.u_depthBias, DEPTH_BIAS_KM);
    gl.uniform1f(this.uniforms_.u_logDepthBufFC, DepthManager.getConfig().logDepthBufFC);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture_);
    gl.uniform1i(this.uniforms_.u_atlas, 0);

    // Depth-tested (far-side labels hidden by the globe) but not depth-writing.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);

    gl.bindVertexArray(this.vao_);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount_);
    gl.bindVertexArray(null);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  private buildAtlas_(countries: PoliticalCountry[], locale: string): void {
    const gl = this.gl_!;

    if (typeof OffscreenCanvas === 'undefined') {
      return;
    }

    const measureCanvas = new OffscreenCanvas(1, 1);
    const measureCtx = measureCanvas.getContext('2d');

    if (!measureCtx) {
      return;
    }

    const font = `bold ${ATLAS_FONT_PX}px Arial, 'Noto Sans', sans-serif`;

    measureCtx.font = font;

    // First pass: measure and pack into rows.
    const { placements, height } = packCountryAtlas(countries, locale, (text) => measureCtx.measureText(text).width);
    const canvas = new OffscreenCanvas(ATLAS_WIDTH, height);
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, ATLAS_WIDTH, height);
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    this.atlasEntries_ = [];
    for (const placement of placements) {
      const { text, x: px, y: py, w } = placement;
      const cy = py + ATLAS_ROW_HEIGHT / 2;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText(text, px + ATLAS_PAD_X, cy, w - ATLAS_PAD_X * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, px + ATLAS_PAD_X, cy, w - ATLAS_PAD_X * 2);

      this.atlasEntries_.push(countryAtlasEntry(placement, height));
    }

    // Major countries first so the MAX_LABELS cap trims the least important.
    this.atlasEntries_.sort((a, b) => a.labelRank - b.labelRank || a.minLabel - b.minLabel);

    this.atlasTexture_ ??= gl.createTexture();
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture_);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas as unknown as TexImageSource);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private initBuffers_(): void {
    const gl = this.gl_!;
    const quadVertices = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    this.quadBuffer_ = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    this.instanceBuffer_ = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData_.byteLength, gl.DYNAMIC_DRAW);
  }

  private initVao_(): void {
    const gl = this.gl_!;
    const b = Float32Array.BYTES_PER_ELEMENT;
    const stride = 8 * b;

    this.vao_ = gl.createVertexArray();
    gl.bindVertexArray(this.vao_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer_);
    gl.enableVertexAttribArray(this.attribs_.a_quadVertex.location);
    gl.vertexAttribPointer(this.attribs_.a_quadVertex.location, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer_);
    gl.enableVertexAttribArray(this.attribs_.a_ecfPosition.location);
    gl.vertexAttribPointer(this.attribs_.a_ecfPosition.location, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(this.attribs_.a_ecfPosition.location, 1);

    gl.enableVertexAttribArray(this.attribs_.a_uvRect.location);
    gl.vertexAttribPointer(this.attribs_.a_uvRect.location, 4, gl.FLOAT, false, stride, 3 * b);
    gl.vertexAttribDivisor(this.attribs_.a_uvRect.location, 1);

    gl.enableVertexAttribArray(this.attribs_.a_aspect.location);
    gl.vertexAttribPointer(this.attribs_.a_aspect.location, 1, gl.FLOAT, false, stride, 7 * b);
    gl.vertexAttribDivisor(this.attribs_.a_aspect.location, 1);

    gl.bindVertexArray(null);
  }

  private readonly shaders_ = {
    vert: glsl`#version 300 es
      precision highp float;

      in vec2 a_quadVertex;
      in vec3 a_ecfPosition;
      in vec4 a_uvRect;
      in float a_aspect;

      uniform mat4 u_pMvCamMatrix;
      uniform vec3 worldOffset;
      uniform float u_gmst;
      uniform vec2 u_screenSize;
      uniform float u_labelHeight;
      uniform float u_depthBias;
      uniform float u_logDepthBufFC;

      out vec2 vTexCoord;

      void main() {
        // ECF -> ECI rotation by GMST keeps labels glued to the rotating Earth.
        float cosG = cos(u_gmst);
        float sinG = sin(u_gmst);
        vec3 eciPos = vec3(
          a_ecfPosition.x * cosG - a_ecfPosition.y * sinG,
          a_ecfPosition.x * sinG + a_ecfPosition.y * cosG,
          a_ecfPosition.z
        ) + worldOffset;

        vec4 clipPos = u_pMvCamMatrix * vec4(eciPos, 1.0);

        if (clipPos.w <= 0.0) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }

        vec2 ndc = clipPos.xy / clipPos.w;

        if (abs(ndc.x) > 1.2 || abs(ndc.y) > 1.2) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }

        // Expand the quad in screen space, centered on the anchor.
        vec2 screenPos = (ndc * 0.5 + 0.5) * u_screenSize;
        screenPos.x += (a_quadVertex.x - 0.5) * u_labelHeight * a_aspect;
        screenPos.y += (a_quadVertex.y - 0.5) * u_labelHeight;

        vec2 finalNdc = (screenPos / u_screenSize) * 2.0 - 1.0;

        // Log depth with a small camera-ward bias so the surface never clips the text.
        float wBiased = max(clipPos.w - u_depthBias, 0.01);
        float logZ = log2(1.0 + wBiased) * u_logDepthBufFC - 1.0;
        gl_Position = vec4(finalNdc, logZ, 1.0);

        // Canvas row 0 is the texture's top; flip the quad's v to match.
        vTexCoord = vec2(
          mix(a_uvRect.x, a_uvRect.z, a_quadVertex.x),
          mix(a_uvRect.w, a_uvRect.y, a_quadVertex.y)
        );
      }
    `,
    frag: glsl`#version 300 es
      precision highp float;

      uniform sampler2D u_atlas;

      in vec2 vTexCoord;
      out vec4 fragColor;

      void main() {
        vec4 texel = texture(u_atlas, vTexCoord);

        if (texel.a < 0.05) {
          discard;
        }
        fragColor = texel;
      }
    `,
  };
}
