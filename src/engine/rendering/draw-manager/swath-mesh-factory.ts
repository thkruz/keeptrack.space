import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { crossTrackEdgesInto, DEG2RAD, geodeticLatitudeRad, Sgp4, Sun, splitRuns, WGS84_A_KM } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { CustomMeshFactory } from './custom-mesh-factory';
import { SwathFanMesh } from './swath-fan-mesh';
import { liftSurfacePoint, SwathColors, SwathDrawRange, SwathMesh, SwathStripKind } from './swath-mesh';

/** Imaging geometry the swath layer draws. Angles in degrees. */
export interface SwathParams {
  /** Full nadir field of view. */
  fovDeg: number;
  /** Maximum off-nadir tilt; 0 disables the field of regard (also gated by settingsManager.isDrawSwathFieldOfRegard). */
  maxOffNadirDeg: number;
  /** Minimum Sun elevation at the sub-point for a sample to count as lit. */
  minSunElevDeg: number;
  /** Hide unlit runs instead of dimming them. */
  isDaylightOnly: boolean;
}

export const DEFAULT_SWATH_COLORS: SwathColors = {
  nadir: [0.25, 0.85, 1.0, 0.6],
  regard: [0.25, 0.85, 1.0, 0.18],
  fan: [0.25, 0.85, 1.0, 0.22],
};

/** Positions closer than this to Earth's centre are invalid samples (the cruncher writes 0,0,0). */
const MIN_SAMPLE_RADIUS_KM_ = 6000;
const UNIX_EPOCH_JD_ = 2440587.5;
const MS_PER_DAY_ = 86400000;

/** One strip before packing: interleaved left/right lifted ECEF positions, 2 per sample. */
interface PendingStrip {
  kind: SwathStripKind;
  lit: boolean;
  data: Float64Array;
  pairs: number;
}

/**
 * Builds and draws the ground-swath ribbon for one satellite.
 *
 * The ribbon is rebuilt only when the orbit cruncher delivers a new sample set for the target
 * (its quantised start time or step changed) or the parameters change; every frame only the
 * fan triangle is recomputed.
 */
export class SwathMeshFactory extends CustomMeshFactory<SwathMesh> {
  /** Catalog id of the satellite being drawn, or -1. */
  targetId = -1;
  params: SwathParams | null = null;
  colors: SwathColors = DEFAULT_SWATH_COLORS;
  fan: SwathFanMesh | null = null;
  /** Mean altitude (km) of the last sample set, NaN before the first build. */
  meanAltKm = Number.NaN;
  /** Number of ribbon rebuilds performed (diagnostics and tests). */
  rebuildCount = 0;

  /** Earth-fixed sample positions of the last sample set (3 per sample). */
  private samplesEcef_ = new Float64Array(0);
  /** Earth-fixed unit Sun vector at each sample's time. */
  private sunEcef_ = new Float64Array(0);
  private valid_ = new Uint8Array(0);
  private sampleCount_ = 0;
  private lastJd0_ = Number.NaN;
  private lastStepMin_ = Number.NaN;
  private lastIsEcf_ = false;
  private isListening_ = false;
  private readonly edgeScratch_ = new Float64Array(6);

  /** Start (or move) the layer to a satellite, or stop it with id -1 / null params. */
  setTarget(objId: number, params: SwathParams | null): void {
    this.listen_();
    const isNewTarget = objId !== this.targetId;

    this.targetId = objId;
    this.params = params;
    if (objId < 0 || !params) {
      this.clearGeometry_();

      return;
    }
    if (isNewTarget) {
      this.clearGeometry_();
      // The selected orbit may already be cached; ask for a fresh one so the ribbon builds now.
      ServiceLocator.getOrbitManager()?.updateOrbitBuffer?.(objId);
    } else {
      this.rebuild_();
    }
    this.syncFan_();
  }

  /** Change the drawing parameters for the current target and rebuild once. */
  setParams(params: SwathParams): void {
    this.params = params;
    if (this.targetId < 0) {
      return;
    }
    this.rebuild_();
    this.syncFan_();
  }

  /** Rebuild from the cached samples after a global flag (e.g. the field-of-regard fill) changed. */
  refresh(): void {
    if (this.targetId >= 0 && this.params) {
      this.rebuild_();
      this.syncFan_();
    }
  }

  clear(): void {
    this.targetId = -1;
    this.params = null;
    this.clearGeometry_();
  }

  /** Orbit cruncher hook: rebuild when the target's sample set actually changed. */
  onOrbitPath(satId: number, points: Float32Array, anchor: [number, number, number], jd0: number | undefined, stepMin: number | undefined, isEcf: boolean): void {
    if (satId !== this.targetId || !this.params || typeof jd0 !== 'number' || typeof stepMin !== 'number') {
      return;
    }
    if (jd0 === this.lastJd0_ && stepMin === this.lastStepMin_ && isEcf === this.lastIsEcf_ && this.sampleCount_ > 0) {
      return;
    }
    this.lastJd0_ = jd0;
    this.lastStepMin_ = stepMin;
    this.lastIsEcf_ = isEcf;
    this.ingestSamples_(points, anchor, jd0, stepMin, isEcf);
    this.rebuild_();
  }

  /**
   * Load an Earth-fixed sample set directly (tests and callers without the cruncher).
   * `sunEcefUnit` holds one unit Sun vector per sample.
   */
  loadSamples(samplesEcefKm: Float64Array, sunEcefUnit: Float64Array, count: number): void {
    this.ensureSampleCapacity_(count);
    this.samplesEcef_.set(samplesEcefKm.subarray(0, count * 3));
    this.sunEcef_.set(sunEcefUnit.subarray(0, count * 3));
    for (let i = 0; i < count; i++) {
      const x = samplesEcefKm[i * 3];
      const y = samplesEcefKm[i * 3 + 1];
      const z = samplesEcefKm[i * 3 + 2];

      this.valid_[i] = Math.sqrt(x * x + y * y + z * z) > MIN_SAMPLE_RADIUS_KM_ ? 1 : 0;
    }
    this.sampleCount_ = count;
    this.rebuild_();
  }

  updateAll(): void {
    if (this.fan && this.targetId >= 0 && settingsManager.isDrawSwath) {
      this.fan.update();
    }
  }

  drawAll(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer): void {
    if (!settingsManager.isDrawSwath || this.targetId < 0) {
      return;
    }
    for (const mesh of this.meshes) {
      mesh.draw(pMatrix, camMatrix, tgtBuffer);
    }
    this.fan?.draw(pMatrix, camMatrix, tgtBuffer);
  }

  checkCacheForMesh_(): SwathMesh | undefined {
    return this.meshes[0];
  }

  protected create_(): void {
    this.add(new SwathMesh(this.colors));
  }

  private listen_(): void {
    if (this.isListening_) {
      return;
    }
    this.isListening_ = true;
    EventBus.getInstance().on(EventBusEvent.orbitPathUpdated, this.onOrbitPath.bind(this));
  }

  private clearGeometry_(): void {
    for (const mesh of this.meshes) {
      mesh.vertexCount = 0;
      mesh.ranges = [];
    }
    this.sampleCount_ = 0;
    this.lastJd0_ = Number.NaN;
    this.lastStepMin_ = Number.NaN;
    this.meanAltKm = Number.NaN;
    if (this.fan) {
      this.fan.isValid = false;
    }
  }

  private syncFan_(): void {
    if (!this.params || this.targetId < 0) {
      return;
    }
    const half = (this.params.fovDeg / 2) * DEG2RAD;

    if (!this.fan) {
      this.fan = new SwathFanMesh(this.targetId, half, settingsManager.swathLiftKm, this.colors.fan);
      this.fan.init(ServiceLocator.getRenderer().gl);
    }
    this.fan.objId = this.targetId;
    this.fan.halfAngleRad = half;
    this.fan.liftKm = settingsManager.swathLiftKm;
  }

  private ensureSampleCapacity_(count: number): void {
    if (this.valid_.length < count) {
      this.samplesEcef_ = new Float64Array(count * 3);
      this.sunEcef_ = new Float64Array(count * 3);
      this.valid_ = new Uint8Array(count);
    }
  }

  /** Converts the cruncher's anchor-relative points to Earth-fixed samples and Sun vectors. */
  private ingestSamples_(points: Float32Array, anchor: [number, number, number], jd0: number, stepMin: number, isEcf: boolean): void {
    const count = Math.floor(points.length / 4);

    this.ensureSampleCapacity_(count);
    const midJd = jd0 + ((count - 1) * stepMin) / 2 / 1440;
    let sun: { x: number; y: number; z: number };

    try {
      sun = Sun.eci(new Date((midJd - UNIX_EPOCH_JD_) * MS_PER_DAY_));
    } catch {
      sun = { x: 1, y: 0, z: 0 };
    }
    const sunMag = Math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z) || 1;
    const sx = sun.x / sunMag;
    const sy = sun.y / sunMag;
    const sz = sun.z / sunMag;

    for (let i = 0; i < count; i++) {
      const x = anchor[0] + points[i * 4];
      const y = anchor[1] + points[i * 4 + 1];
      const z = anchor[2] + points[i * 4 + 2];
      const gmst = Sgp4.gstime(jd0 + (i * stepMin) / 1440);
      const c = Math.cos(gmst);
      const s = Math.sin(gmst);
      const o = i * 3;

      if (isEcf) {
        this.samplesEcef_[o] = x;
        this.samplesEcef_[o + 1] = y;
      } else {
        // ECI -> ECEF: rotate by -gmst about z.
        this.samplesEcef_[o] = x * c + y * s;
        this.samplesEcef_[o + 1] = -x * s + y * c;
      }
      this.samplesEcef_[o + 2] = z;
      this.sunEcef_[o] = sx * c + sy * s;
      this.sunEcef_[o + 1] = -sx * s + sy * c;
      this.sunEcef_[o + 2] = sz;
      this.valid_[i] = Math.sqrt(x * x + y * y + z * z) > MIN_SAMPLE_RADIUS_KM_ ? 1 : 0;
    }
    this.sampleCount_ = count;
  }

  /** Rebuilds every strip from the cached samples and packs them into meshes. */
  private rebuild_(): void {
    const params = this.params;
    const n = this.sampleCount_;

    if (!params || n < 2) {
      return;
    }
    this.rebuildCount++;
    this.meanAltKm = this.computeMeanAlt_();

    const strips: PendingStrip[] = [];
    const nadirHalf = (params.fovDeg / 2) * DEG2RAD;
    const isShowRegard = params.maxOffNadirDeg > 0 && settingsManager.isDrawSwathFieldOfRegard;

    // Field of regard first so the nadir strip draws on top of it.
    if (isShowRegard) {
      this.buildStrips_('regard', (params.maxOffNadirDeg + params.fovDeg / 2) * DEG2RAD, params, strips);
    }
    this.buildStrips_('nadir', nadirHalf, params, strips);
    this.pack_(strips);
  }

  private computeMeanAlt_(): number {
    let sum = 0;
    let k = 0;

    for (let i = 0; i < this.sampleCount_; i++) {
      if (this.valid_[i]) {
        const o = i * 3;

        sum += Math.hypot(this.samplesEcef_[o], this.samplesEcef_[o + 1], this.samplesEcef_[o + 2]) - WGS84_A_KM;
        k++;
      }
    }

    return k > 0 ? sum / k : Number.NaN;
  }

  /** Edge points for every sample at one half-angle, split into lit/unlit runs. */
  private buildStrips_(kind: SwathStripKind, halfAngleRad: number, params: SwathParams, out: PendingStrip[]): void {
    const n = this.sampleCount_;
    const edges = new Float64Array(n * 6);
    const flags: (boolean | null)[] = new Array(n);
    const sinMinSun = Math.sin(params.minSunElevDeg * DEG2RAD);
    const r = this.samplesEcef_;
    const scratch = this.edgeScratch_;

    for (let i = 0; i < n; i++) {
      flags[i] = null;
      if (!this.valid_[i]) {
        continue;
      }
      // Central difference of neighbouring valid samples (one-sided at the ends).
      const prev = i > 0 && this.valid_[i - 1] ? i - 1 : i;
      const next = i < n - 1 && this.valid_[i + 1] ? i + 1 : i;

      if (prev === next) {
        continue;
      }
      const o = i * 3;
      const vx = r[next * 3] - r[prev * 3];
      const vy = r[next * 3 + 1] - r[prev * 3 + 1];
      const vz = r[next * 3 + 2] - r[prev * 3 + 2];

      if (crossTrackEdgesInto(r[o], r[o + 1], r[o + 2], vx, vy, vz, halfAngleRad, scratch) === -1) {
        continue;
      }
      liftSurfacePoint(scratch[0], scratch[1], scratch[2], settingsManager.swathLiftKm, edges, i * 6);
      liftSurfacePoint(scratch[3], scratch[4], scratch[5], settingsManager.swathLiftKm, edges, i * 6 + 3);

      // Daylight at the sub-point: geodetic up . sun >= sin(minSunElev).
      const lat = geodeticLatitudeRad(r[o], r[o + 1], r[o + 2]);
      const lon = Math.atan2(r[o + 1], r[o]);
      const cosLat = Math.cos(lat);
      const dot = cosLat * Math.cos(lon) * this.sunEcef_[o] + cosLat * Math.sin(lon) * this.sunEcef_[o + 1] + Math.sin(lat) * this.sunEcef_[o + 2];

      flags[i] = dot >= sinMinSun;
    }

    for (const run of splitRuns(flags)) {
      if (!run.lit && params.isDaylightOnly) {
        continue;
      }
      const pairs = run.i1 - run.i0 + 1;

      out.push({ kind, lit: run.lit, data: edges.subarray(run.i0 * 6, (run.i1 + 1) * 6), pairs });
    }
  }

  /** Packs strips into meshes of at most SwathMesh.MAX_VERTICES vertices, splitting long strips. */
  private pack_(strips: PendingStrip[]): void {
    const maxVerts = SwathMesh.MAX_VERTICES;
    let totalVerts = 0;

    for (const strip of strips) {
      totalVerts += strip.pairs * 2;
    }
    // One chunk holds everything exactly; past the cap every chunk is allocated full size.
    const chunkVerts = totalVerts <= maxVerts ? Math.max(totalVerts, 4) : maxVerts;
    const chunks: { verts: Float32Array; count: number; ranges: SwathDrawRange[] }[] = [];
    let cur = { verts: new Float32Array(chunkVerts * 3), count: 0, ranges: [] as SwathDrawRange[] };

    chunks.push(cur);
    for (const strip of strips) {
      let p = 0;

      while (p < strip.pairs - 1) {
        const space = Math.floor((maxVerts - cur.count) / 2);

        if (space < 2) {
          cur = { verts: new Float32Array(chunkVerts * 3), count: 0, ranges: [] };
          chunks.push(cur);
          continue;
        }
        const take = Math.min(space, strip.pairs - p);

        cur.verts.set(strip.data.subarray(p * 6, (p + take) * 6), cur.count * 3);
        cur.ranges.push({ first: cur.count, count: take * 2, kind: strip.kind, lit: strip.lit });
        cur.count += take * 2;
        // When the strip continues in the next chunk, repeat its last pair there so it stays gap-free.
        p = p + take < strip.pairs ? p + take - 1 : strip.pairs;
      }
    }

    while (this.meshes.length < chunks.length) {
      this.create_();
    }
    for (let i = 0; i < this.meshes.length; i++) {
      const chunk = chunks[i];

      if (chunk && chunk.count > 0) {
        this.meshes[i].setGeometry(chunk.verts, chunk.count, chunk.ranges);
      } else {
        this.meshes[i].vertexCount = 0;
        this.meshes[i].ranges = [];
      }
    }
  }
}
