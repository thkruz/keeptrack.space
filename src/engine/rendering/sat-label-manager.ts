import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4 } from 'gl-matrix';
import { CameraType } from '../camera/camera-type';
import { PluginRegistry } from '../core/plugin-registry';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import type { KeepTrackPlugin } from '../plugins/base-plugin';
import { RADIUS_OF_EARTH } from '../utils/constants';
import { glsl } from '../utils/development/formatter';
import { CounterStage, FrameProfiler } from '../utils/frame-profiler';
import { BufferAttribute } from './buffer-attribute';
import { DepthManager } from './depth-manager';
import { WebGlProgramHelper } from './webgl-program';

/* eslint-disable camelcase */
/**
 * Characters available in the glyph atlas.
 * Index 0-9 = digits '0'-'9', 10='J', 11='S', 12='C' (the catalog-number glyphs, indices unchanged), followed by the
 * rest of the uppercase letters, lowercase letters and common punctuation for host object and sensor names.
 */
export const GLYPH_CHARS = `0123456789JSCABDEFGHIKLMNOPQRTUVWXYZabcdefghijklmnopqrstuvwxyz-_.:/()+#&,'!?@%*=<>[]`;
const ATLAS_COLS = 10;
const ATLAS_CELL_SIZE = 64;
const ATLAS_SIZE = ATLAS_CELL_SIZE * ATLAS_COLS; // 640x640
const MAX_CHARS_PER_LABEL = 8; // JSC12345 = 8 chars max
/** Extra (host object, sensor, marker) labels: how many, and the longest text drawn. */
export const MAX_EXTRA_LABELS = 128;
export const MAX_EXTRA_LABEL_CHARS = 32;
/** Extra labels sit this far (km) in front of their anchor in depth so a ground-level anchor is not hidden by the Earth itself. */
const EXTRA_DEPTH_BIAS_KM = 150;

/** Glyph index for a character; space and unknown characters return -1 (unknown ones become '?' for extra labels). */
export const glyphIndexOf = (ch: string): number => GLYPH_CHARS.indexOf(ch);

/** Text to glyph indices for extra labels, one entry per character (-1 = blank advance). */
export const extraLabelGlyphs = (text: string): number[] => {
  const out: number[] = [];

  for (const ch of text.slice(0, MAX_EXTRA_LABEL_CHARS)) {
    const idx = glyphIndexOf(ch);

    if (ch === ' ') {
      out.push(-1);
    } else {
      out.push(idx !== -1 ? idx : glyphIndexOf('?'));
    }
  }

  return out;
};

/** A label anchored to a catalog object (`satId`) or to a fixed point on the ground (`ground`). */
export interface ExtraLabelSpec {
  /** Unique key; later specs with the same key are dropped. */
  key: string;
  text: string;
  satId?: number;
  ground?: { latDeg: number; lonDeg: number; altKm: number };
  /** RGB 0..1 tint of the glyph fill; default white. */
  color?: [number, number, number];
}

/** Merge label sources in order, dropping repeated keys and labels without an anchor. */
export const composeExtraLabels = (...sources: ExtraLabelSpec[][]): ExtraLabelSpec[] => {
  const seen = new Set<string>();
  const out: ExtraLabelSpec[] = [];

  for (const list of sources) {
    for (const spec of list) {
      if (!spec.text || seen.has(spec.key) || (spec.satId === undefined && !spec.ground)) {
        continue;
      }
      seen.add(spec.key);
      out.push(spec);
      if (out.length >= MAX_EXTRA_LABELS) {
        return out;
      }
    }
  }

  return out;
};

/** One object that gets a scene name label: its catalog id, name and role. */
export interface ObjectLabelEntry {
  satId: number;
  name: string;
  role: 'primary' | 'secondary' | 'watch';
}

/** Shape prefix per role so two chosen objects differ without relying on color: [1] primary, (2) secondary, * watchlist. */
export const OBJECT_LABEL_PREFIX: Record<ObjectLabelEntry['role'], string> = { primary: '[1] ', secondary: '(2) ', watch: '* ' };

/** Label specs for the selected, secondary and watchlist objects (primary and secondary win over a watchlist repeat). */
export const buildObjectLabelSpecs = (entries: ObjectLabelEntry[]): ExtraLabelSpec[] => {
  const colors: Record<ObjectLabelEntry['role'], [number, number, number]> = { primary: [1, 1, 1], secondary: [1, 0.85, 0.2], watch: [0.6, 0.9, 1] };

  return entries
    .filter((e) => e.satId > -1 && e.name)
    .map((e) => ({ key: `object:${e.satId}`, text: `${OBJECT_LABEL_PREFIX[e.role]}${e.name}`, satId: e.satId, color: colors[e.role] }));
};

/**
 * ECI position (km) of a ground point as the label shader expects it: Earth-fixed lon rotated by the GMST the
 * position buffer was crunched at (the shader subtracts that GMST again, or rotates by the delta on the globe).
 */
export const groundPointEci = (latDeg: number, lonDeg: number, altKm: number, gmst: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] => {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + gmst;
  const r = RADIUS_OF_EARTH + altKm;

  out[0] = r * Math.cos(lat) * Math.cos(lon);
  out[1] = r * Math.cos(lat) * Math.sin(lon);
  out[2] = r * Math.sin(lat);

  return out;
};

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

  // Extra labels (host objects, sensors, markers) live in their own region after the catalog-number glyphs
  private tintBuffer_: WebGLBuffer;
  private tintData_: Float32Array;
  private extraStart_ = 0;
  private totalInstances_ = 0;
  private extraCount_ = 0;
  private extraSpecs_: ExtraLabelSpec[] = [];
  private extraGlyphCounts_: number[] = [];
  private hostSpecs_: ExtraLabelSpec[] = [];
  private markerSpecs_: ExtraLabelSpec[] = [];
  private sensorSpecs_: ExtraLabelSpec[] = [];
  private sensorSig_ = '';
  private objectSig_ = '';
  private objectSpecs_: ExtraLabelSpec[] = [];

  private attribs_ = {
    a_quadVertex: new BufferAttribute({ location: 0, vertices: 2, offset: 0 }),
    a_satPosition: new BufferAttribute({ location: 1, vertices: 3, offset: 0 }),
    a_glyphIndex: new BufferAttribute({ location: 2, vertices: 1, offset: 0 }),
    a_charOffset: new BufferAttribute({ location: 3, vertices: 1, offset: 0 }),
    a_tint: new BufferAttribute({ location: 4, vertices: 3, offset: 0 }),
  };

  private uniforms_ = {
    u_pMvCamMatrix: <WebGLUniformLocation>(<unknown>null),
    u_screenSize: <WebGLUniformLocation>(<unknown>null),
    u_glyphSize: <WebGLUniformLocation>(<unknown>null),
    u_glyphAtlas: <WebGLUniformLocation>(<unknown>null),
    worldOffset: <WebGLUniformLocation>(<unknown>null),
    u_flatMapMode: <WebGLUniformLocation>(<unknown>null),
    u_gmst: <WebGLUniformLocation>(<unknown>null),
    u_currentGmst: <WebGLUniformLocation>(<unknown>null),
    u_earthRadius: <WebGLUniformLocation>(<unknown>null),
    u_flatMapCenterX: <WebGLUniformLocation>(<unknown>null),
    u_logDepthBufFC: <WebGLUniformLocation>(<unknown>null),
    u_depthBias: <WebGLUniformLocation>(<unknown>null),
  };

  init(gl: WebGL2RenderingContext, maxLabels: number): void {
    this.gl_ = gl;
    this.maxInstances_ = maxLabels * MAX_CHARS_PER_LABEL;
    this.extraStart_ = this.maxInstances_;
    this.totalInstances_ = this.maxInstances_ + MAX_EXTRA_LABELS * MAX_EXTRA_LABEL_CHARS;

    this.glyphTexture_ = this.generateGlyphAtlas_();
    this.initShaderProgram_();
    this.initBuffers_();
    this.initVao_();

    this.isReady_ = true;
    this.rebuildExtras_();
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
      // draw() and updatePositions() key off instanceCount_; without zeroing it,
      // the stale satPositionData_ from before the swap would keep rendering.
      this.labeledSatIds_ = [];
      this.labelGlyphCounts_ = [];
      this.instanceCount_ = 0;

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
    if (!this.isReady_) {
      return;
    }

    this.syncSensorLabels_();
    this.syncObjectLabels_();
    this.updateExtraPositions_();

    if (this.instanceCount_ === 0) {
      return;
    }

    const dotsManager = ServiceLocator.getDotsManager();
    const positionData = dotsManager.positionData;

    if (!positionData) {
      // Stop draw() from rendering stale satPositionData_ until updateLabels rebuilds.
      this.instanceCount_ = 0;

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

  /** Labels the embed host asks for (host objects and host sensors); replaces the previous set. */
  setHostLabels(specs: ExtraLabelSpec[]): void {
    this.hostSpecs_ = specs;
    this.rebuildExtras_();
  }

  /** Text on fixed ground points (embed marker overlays); replaces the previous set. */
  setMarkerLabels(specs: ExtraLabelSpec[]): void {
    this.markerSpecs_ = specs;
    this.rebuildExtras_();
  }

  /** Number of glyph quads in the extra-label region. */
  get extraGlyphCount(): number {
    return this.extraCount_;
  }

  /** The merged extra label specs currently drawn (test and debug hook). */
  get extraLabels(): readonly ExtraLabelSpec[] {
    return this.extraSpecs_;
  }

  /**
   * Name labels for the selected, secondary and watchlist objects. Cheap per frame: reads three ids and rebuilds the glyph
   * layout only when the set or the setting changes.
   */
  private syncObjectLabels_(): void {
    const entries: ObjectLabelEntry[] = [];

    if (settingsManager.isShowObjectLabels) {
      const select = PluginRegistry.getPlugin(SelectSatManager);
      const objectCache = ServiceLocator.getCatalogManager()?.objectCache ?? [];
      const nameOf = (id: number): string => (objectCache[id] as { name?: string } | undefined)?.name ?? '';
      const primary = Number(select?.selectedSat ?? -1);
      const secondary = Number(select?.secondarySat ?? -1);
      const watch = PluginRegistry.getPluginByName<KeepTrackPlugin & { watchlistList?: { id: number }[] }>('WatchlistPlugin')?.watchlistList ?? [];

      entries.push({ satId: primary, name: nameOf(primary), role: 'primary' });
      entries.push({ satId: secondary, name: nameOf(secondary), role: 'secondary' });
      for (const w of watch) {
        entries.push({ satId: w.id, name: nameOf(w.id), role: 'watch' });
      }
    }
    const sig = entries.map((e) => `${e.role}${e.satId}`).join(';');

    if (sig === this.objectSig_) {
      return;
    }
    this.objectSig_ = sig;
    this.objectSpecs_ = buildObjectLabelSpecs(entries);
    this.rebuildExtras_();
  }

  /** The sensors whose labels follow the global "sensor labels" setting. Rebuilt only when the sensor set or setting changes. */
  private syncSensorLabels_(): void {
    const sensors = settingsManager.isShowSensorLabels ? (ServiceLocator.getSensorManager()?.currentSensors ?? []) : [];
    const sig = sensors.map((sensor) => `${sensor.objName}|${sensor.lat}|${sensor.lon}|${sensor.alt}|${sensor.uiName}`).join(';');

    if (sig === this.sensorSig_) {
      return;
    }
    this.sensorSig_ = sig;
    this.sensorSpecs_ = [];
    for (const sensor of sensors) {
      if (typeof sensor.lat !== 'number' || typeof sensor.lon !== 'number' || !Number.isFinite(sensor.lat) || !Number.isFinite(sensor.lon)) {
        continue;
      }
      this.sensorSpecs_.push({
        key: `sensor:${sensor.objName}`,
        text: sensor.uiName || sensor.name || sensor.objName,
        ground: { latDeg: sensor.lat, lonDeg: sensor.lon, altKm: sensor.alt ?? 0 },
      });
    }
    this.rebuildExtras_();
  }

  /** Re-lay the glyph quads of the extra labels (text, tint, glyph indices). Positions are filled per frame. */
  private rebuildExtras_(): void {
    this.extraSpecs_ = composeExtraLabels(this.hostSpecs_, this.markerSpecs_, this.objectSpecs_, this.sensorSpecs_);
    this.extraGlyphCounts_ = [];
    if (!this.isReady_) {
      return;
    }

    let idx = this.extraStart_;
    const end = this.extraStart_ + MAX_EXTRA_LABELS * MAX_EXTRA_LABEL_CHARS;

    for (const spec of this.extraSpecs_) {
      const glyphs = extraLabelGlyphs(spec.text);
      const [r, g, b] = spec.color ?? [1, 1, 1];
      let count = 0;

      for (let c = 0; c < glyphs.length && idx < end; c++) {
        if (glyphs[c] === -1) {
          continue;
        }
        this.glyphIndexData_[idx] = glyphs[c];
        this.charOffsetData_[idx] = c;
        this.tintData_[idx * 3] = r;
        this.tintData_[idx * 3 + 1] = g;
        this.tintData_[idx * 3 + 2] = b;
        idx++;
        count++;
      }
      this.extraGlyphCounts_.push(count);
    }
    this.extraCount_ = idx - this.extraStart_;
  }

  /** Fill the anchor positions of the extra labels for this frame (same ECI frame the position buffer uses). */
  private updateExtraPositions_(): void {
    if (this.extraCount_ === 0) {
      return;
    }
    const dotsManager = ServiceLocator.getDotsManager();
    const positionData = dotsManager.positionData;
    const gmst = dotsManager.cruncherGmst;
    const tmp: [number, number, number] = [0, 0, 0];
    let idx = this.extraStart_;

    for (let s = 0; s < this.extraSpecs_.length; s++) {
      const count = this.extraGlyphCounts_[s];
      let px = 0;
      let py = 0;
      let pz = 0;
      let valid = false;
      const spec = this.extraSpecs_[s];

      if (spec.ground) {
        groundPointEci(spec.ground.latDeg, spec.ground.lonDeg, spec.ground.altKm, gmst, tmp);
        [px, py, pz] = tmp;
        valid = true;
      } else if (positionData && spec.satId !== undefined && spec.satId * 3 + 2 < positionData.length) {
        const base = spec.satId * 3;

        px = positionData[base];
        py = positionData[base + 1];
        pz = positionData[base + 2];
        valid = Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz);
      }
      for (let g = 0; g < count; g++) {
        const base = idx * 3;

        // Far outside the shader's flat-map range, so an unresolved anchor draws nothing
        this.satPositionData_[base] = valid ? px : 1e9;
        this.satPositionData_[base + 1] = valid ? py : 1e9;
        this.satPositionData_[base + 2] = valid ? pz : 1e9;
        idx++;
      }
    }
  }

  /** Point the per-instance attributes at the instance `first` (the VAO must be bound). */
  private bindInstanceRange_(first: number): void {
    const gl = this.gl_;
    const layout: [WebGLBuffer, number, number][] = [
      [this.satPositionBuffer_, this.attribs_.a_satPosition.location, 3],
      [this.glyphIndexBuffer_, this.attribs_.a_glyphIndex.location, 1],
      [this.charOffsetBuffer_, this.attribs_.a_charOffset.location, 1],
      [this.tintBuffer_, this.attribs_.a_tint.location, 3],
    ];

    for (const [buffer, location, size] of layout) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, first * size * 4);
    }
  }

  /**
   * Renders all visible satellite labels in a single instanced draw call.
   */
  draw(projectionCameraMatrix: mat4, tgtBuffer: WebGLFramebuffer | null): void {
    if (!this.isReady_ || (this.instanceCount_ === 0 && this.extraCount_ === 0)) {
      return;
    }

    FrameProfiler.getInstance().addCounter(CounterStage.labelGlyphs, this.instanceCount_ + this.extraCount_);

    const gl = this.gl_;

    gl.useProgram(this.program_);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set uniforms
    gl.uniformMatrix4fv(this.uniforms_.u_pMvCamMatrix, false, projectionCameraMatrix);

    const isFlatMapLabel = ServiceLocator.getMainCamera().cameraType === CameraType.FLAT_MAP;

    // 2D projections reproject raw ECI in-shader; zero the world offset for them
    gl.uniform3fv(this.uniforms_.worldOffset, isFlatMapLabel ? [0, 0, 0] : (Scene.getInstance().worldShift ?? [0, 0, 0]));

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

    gl.uniform1f(this.uniforms_.u_depthBias, 0);

    // Upload instance data (catalog-number region, then the extra-label region)
    this.uploadRange_(0, this.instanceCount_);
    this.uploadRange_(this.extraStart_, this.extraCount_);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // In planetarium/fixed-to-earth mode, keep depth test enabled so labels are occluded by the Earth
    const cameraType = ServiceLocator.getMainCamera().cameraType;
    const useDepthTest = cameraType === CameraType.PLANETARIUM || cameraType === CameraType.FIXED_TO_EARTH;

    gl.bindVertexArray(this.vao_);

    if (this.instanceCount_ > 0) {
      if (!useDepthTest) {
        gl.disable(gl.DEPTH_TEST);
      }
      this.bindInstanceRange_(0);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount_);
    }

    if (this.extraCount_ > 0) {
      // Host objects and sensors: hidden behind the Earth on the globe, never occluded on the flat map
      if (isFlatMapLabel) {
        gl.disable(gl.DEPTH_TEST);
      } else {
        gl.enable(gl.DEPTH_TEST);
      }
      gl.uniform1f(this.uniforms_.u_depthBias, isFlatMapLabel ? 0 : EXTRA_DEPTH_BIAS_KM);
      this.bindInstanceRange_(this.extraStart_);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.extraCount_);
    }

    this.bindInstanceRange_(0);
    gl.bindVertexArray(null);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  private uploadRange_(first: number, count: number): void {
    if (count === 0) {
      return;
    }
    const gl = this.gl_;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.satPositionBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, first * 12, this.satPositionData_, first * 3, count * 3);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glyphIndexBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, first * 4, this.glyphIndexData_, first, count);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.charOffsetBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, first * 4, this.charOffsetData_, first, count);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer_);
    gl.bufferSubData(gl.ARRAY_BUFFER, first * 12, this.tintData_, first * 3, count * 3);
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
      in vec3 a_tint;

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
      uniform float u_depthBias;

      out vec2 vTexCoord;
      out float vClipW;
      out vec3 vTint;

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
        float logZ = log2(1.0 + max(clipPos.w - u_depthBias, 0.01)) * u_logDepthBufFC - 1.0;
        gl_Position = vec4(finalNdc, logZ, 1.0);

        // Compute texture coordinates into glyph atlas
        // Flip Y because canvas Y=0 is top but WebGL texture Y=0 is bottom
        float col = mod(a_glyphIndex, ${ATLAS_COLS}.0);
        float row = floor(a_glyphIndex / ${ATLAS_COLS}.0);
        vec2 texQuadVert = vec2(a_quadVertex.x, 1.0 - a_quadVertex.y);
        vTexCoord = (texQuadVert + vec2(col, row)) / ${ATLAS_COLS}.0;
        vClipW = clipPos.w;
        vTint = a_tint;
      }
    `;

    const fragShader = glsl`#version 300 es
      precision highp float;

      uniform sampler2D u_glyphAtlas;

      in vec2 vTexCoord;
      in float vClipW;
      in vec3 vTint;

      out vec4 fragColor;

      void main() {
        if (vClipW <= 0.0) discard;

        vec4 texel = texture(u_glyphAtlas, vTexCoord);
        if (texel.a < 0.1) discard;

        fragColor = vec4(texel.rgb * vTint, texel.a);
      }
    `;

    const programHelper = new WebGlProgramHelper(gl, vertShader, fragShader, this.attribs_, this.uniforms_, { name: 'SatLabels' });

    this.program_ = programHelper.program;
  }

  private initBuffers_(): void {
    const gl = this.gl_;

    // Unit quad: two triangles forming a [0,0]-[1,1] square
    // prettier-ignore
    const quadVertices = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    this.quadBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Preallocate instance buffers
    this.satPositionData_ = new Float32Array(this.totalInstances_ * 3);
    this.satPositionBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.satPositionBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.satPositionData_.byteLength, gl.DYNAMIC_DRAW);

    this.glyphIndexData_ = new Float32Array(this.totalInstances_);
    this.glyphIndexBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glyphIndexBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.glyphIndexData_.byteLength, gl.DYNAMIC_DRAW);

    this.charOffsetData_ = new Float32Array(this.totalInstances_);
    this.charOffsetBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.charOffsetBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.charOffsetData_.byteLength, gl.DYNAMIC_DRAW);

    this.tintData_ = new Float32Array(this.satPositionData_.length).fill(1);
    this.tintBuffer_ = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer_);
    gl.bufferData(gl.ARRAY_BUFFER, this.tintData_, gl.DYNAMIC_DRAW);
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

    // Per-instance attribute: glyph tint (divisor 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer_);
    gl.enableVertexAttribArray(this.attribs_.a_tint.location);
    gl.vertexAttribPointer(this.attribs_.a_tint.location, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(this.attribs_.a_tint.location, 1);

    gl.bindVertexArray(null);
  }
}
