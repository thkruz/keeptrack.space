/* eslint-disable max-lines-per-function, max-statements, no-await-in-loop */
/**
 * SGP4 propagator benchmark: pure-TypeScript Sgp4 vs the USSF Astro Standards
 * wasm builds (classic + SGP4-XP), across single-TLE latency, full-catalog
 * frames, and catalog load. Writes a self-contained HTML report plus raw JSON.
 *
 * Usage:
 *   npm run benchmark:sgp4                         # full catalog
 *   npm run benchmark:sgp4 -- --limit 5000         # subset
 *   npm run benchmark:sgp4 -- --frames 20 --single-iters 5000
 *
 * The wasm engines are skipped (with a note in the report) when the
 * license-restricted Sgp4Prop artifacts are not present in
 * src/engine/ootk/src/external/.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sgp4OpsMode } from '../../src/engine/ootk/src/enums/Sgp4OpsMode';
import { Sgp4Wasm } from '../../src/engine/ootk/src/external/Sgp4Wasm';
import { Sgp4WasmBase } from '../../src/engine/ootk/src/external/Sgp4WasmBase';
import { Sgp4XpWasm } from '../../src/engine/ootk/src/external/Sgp4XpWasm';
import { Sgp4, Sgp4GravConstants } from '../../src/engine/ootk/src/sgp4/sgp4';
import { SatelliteRecord } from '../../src/engine/ootk/src/types/types';
import { BenchmarkReport, BenchmarkRow, renderHtmlReport, Stats } from './report';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DS50_EPOCH_JD = 2433281.5;

// ─── CLI args ────────────────────────────────────────────────────────────────

const argValue = (name: string, fallback: number): number => {
  const idx = process.argv.indexOf(`--${name}`);

  if (idx === -1 || idx + 1 >= process.argv.length) {
    return fallback;
  }

  return Number.parseInt(process.argv[idx + 1], 10) || fallback;
};

const LIMIT = argValue('limit', 0);
const FRAMES = argValue('frames', 10);
const WARMUP_FRAMES = argValue('warmup', 3);
const SINGLE_ITERS = argValue('single-iters', 2000);
/**
 * Default target is the current time — matching what the running app
 * propagates to (elset age drives the cruncher's extra validation work).
 * Pass --target-epoch to propagate to just past the newest elset instead.
 */
const TARGET_EPOCH = process.argv.includes('--target-epoch');
const CATALOG_FILE = 'public/tle/tle.json';
const OUT_DIR = join(ROOT_DIR, 'benchmark-results');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const nowNs = (): bigint => process.hrtime.bigint();
const msSince = (start: bigint): number => Number(process.hrtime.bigint() - start) / 1e6;

const computeStats = (samples: number[]): Stats => {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((acc, v) => acc + v, 0) / n;
  const variance = n > 1 ? sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0;

  return {
    n,
    mean,
    std: Math.sqrt(variance),
    min: sorted[0],
    median: sorted[Math.floor(n / 2)],
    p95: sorted[Math.min(Math.floor(n * 0.95), n - 1)],
    max: sorted[n - 1],
  };
};

interface TleEntry {
  tle1: string;
  tle2: string;
  name?: string;
}

interface WasmEngine {
  name: 'sgp4-wasm' | 'sgp4-xp-wasm';
  /** Registry pre-filled via batch add — used for fast-call and batch modes */
  batch: Sgp4WasmBase;
  /** Empty registry — used by the Sgp4.propagate seam (lazy attach) */
  seam: Sgp4WasmBase;
  satKeys: bigint[];
  loadMs: number;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  console.log('Loading catalog...');
  const raw = JSON.parse(readFileSync(join(ROOT_DIR, CATALOG_FILE), 'utf8')) as TleEntry[];
  let entries = raw.filter((e) => e.tle1?.length >= 68 && e.tle2?.length >= 68);

  if (LIMIT > 0) {
    entries = entries.slice(0, LIMIT);
  }

  // TS parse pass: also the TS side of the "catalog load" scenario
  console.log(`Parsing ${entries.length} TLEs with the TypeScript engine...`);
  const tsLoadStart = nowNs();
  const tsSatrecs: (SatelliteRecord | null)[] = entries.map((e) => {
    try {
      const satrec = Sgp4.createSatrec(e.tle1, e.tle2, Sgp4GravConstants.wgs72, Sgp4OpsMode.AFSPC);

      return satrec.error === 0 ? satrec : null;
    } catch {
      return null;
    }
  });
  const tsLoadMs = msSince(tsLoadStart);

  // Wasm engines: batch-load registries (the wasm side of "catalog load")
  const tleText = entries.map((e) => `${e.tle1}\n${e.tle2}`).join('\n');
  const engines: WasmEngine[] = [];
  const enginesSkipped: string[] = [];

  for (const [name, Ctor] of [['sgp4-wasm', Sgp4Wasm], ['sgp4-xp-wasm', Sgp4XpWasm]] as const) {
    try {
      const batch = await new Ctor().load();
      const seam = await new Ctor().load();

      console.log(`Loading catalog into ${name}...`);
      const loadStart = nowNs();
      const satKeys = batch.addSats(tleText);
      const validKeys = satKeys.filter((k) => k > 0n);

      batch.initSats(validKeys);
      const loadMs = msSince(loadStart);

      engines.push({ name, batch, seam, satKeys, loadMs });
    } catch (error) {
      console.warn(`Skipping ${name}: ${(error as Error).message.split('.')[0]}`);
      enginesSkipped.push(name);
    }
  }

  /*
   * Common set: satellites accepted by the TS engine and every wasm engine,
   * so all measurements propagate identical work.
   */
  const commonIdx: number[] = [];

  for (let i = 0; i < entries.length; i++) {
    if (tsSatrecs[i] && engines.every((e) => e.satKeys[i] > 0n)) {
      commonIdx.push(i);
    }
  }
  console.log(`Common set: ${commonIdx.length} of ${entries.length} satellites`);

  const satrecs = commonIdx.map((i) => tsSatrecs[i] as SatelliteRecord);
  /*
   * Target instant: "now" (like the running app) by default, or just past the
   * newest elset with --target-epoch.
   */
  const jdNow = Date.now() / 86400000 + 2440587.5;
  const jdTarget = TARGET_EPOCH ? Math.max(...satrecs.map((s) => s.jdsatepoch)) + 1 / 24 : jdNow;
  const ds50Target = jdTarget - DS50_EPOCH_JD;
  const mse = satrecs.map((s) => (jdTarget - s.jdsatepoch) * 1440.0);
  const elsetAgeDays = [...mse].sort((a, b) => a - b)[Math.floor(mse.length / 2)] / 1440;

  const rows: BenchmarkRow[] = [];

  rows.push({ scenario: 'Catalog load', engine: 'sgp4', mode: 'createSatrec loop', unit: 'ms', stats: computeStats([tsLoadMs]) });
  for (const e of engines) {
    rows.push({ scenario: 'Catalog load', engine: e.name, mode: 'batch add + init', unit: 'ms', stats: computeStats([e.loadMs]) });
  }

  // ─── Cross-engine parity check ─────────────────────────────────────────────

  let maxDelta = 0;
  const paritySample = Math.min(200, commonIdx.length);

  for (const e of engines) {
    for (let s = 0; s < paritySample; s++) {
      const i = Math.floor((s / paritySample) * commonIdx.length);
      const tsPv = Sgp4.propagate(satrecs[i], mse[i]);
      const wasmPv = e.batch.propagateOnePosVelFast(e.satKeys[commonIdx[i]], mse[i]);

      if (tsPv.position && wasmPv.err === 0) {
        maxDelta = Math.max(
          maxDelta,
          Math.abs(tsPv.position.x - wasmPv.position.x),
          Math.abs(tsPv.position.y - wasmPv.position.y),
          Math.abs(tsPv.position.z - wasmPv.position.z),
        );
      }
    }
  }
  console.log(`Parity check: max position delta ${maxDelta.toExponential(2)} km over ${paritySample} satellites/engine`);

  // ─── Single TLE latency ────────────────────────────────────────────────────

  const issIdx = commonIdx.findIndex((i) => entries[i].tle1.substring(2, 7).trim() === '25544');
  const singleIdx = issIdx >= 0 ? issIdx : 0;
  const singleSatrec = satrecs[singleIdx];
  const singleName = entries[commonIdx[singleIdx]].name ?? `#${entries[commonIdx[singleIdx]].tle1.substring(2, 7).trim()}`;
  const singleTsince = (i: number): number => (i % 1440) - 720;

  console.log(`Single-TLE latency (${singleName}, ${SINGLE_ITERS} calls)...`);

  const singleBench = (fn: (tsince: number) => void): Stats => {
    for (let i = 0; i < 200; i++) {
      fn(singleTsince(i)); // warmup
    }
    const samples: number[] = [];

    for (let i = 0; i < SINGLE_ITERS; i++) {
      const t = nowNs();

      fn(singleTsince(i));
      samples.push(Number(process.hrtime.bigint() - t) / 1e3); // us
    }

    return computeStats(samples);
  };

  rows.push({
    scenario: 'Single TLE', engine: 'sgp4', mode: 'Sgp4.propagate', unit: 'us/call',
    stats: singleBench((t) => Sgp4.propagate(singleSatrec, t)),
  });

  for (const e of engines) {
    const key = e.satKeys[commonIdx[singleIdx]];

    rows.push({
      scenario: 'Single TLE', engine: e.name, mode: 'fast call', unit: 'us/call',
      stats: singleBench((t) => e.batch.propagateOnePosVelFast(key, t)),
    });
  }

  // ─── Full catalog frames ───────────────────────────────────────────────────

  const frameBench = (label: string, fn: () => void): Stats => {
    for (let i = 0; i < WARMUP_FRAMES; i++) {
      fn();
    }
    const samples: number[] = [];

    for (let i = 0; i < FRAMES; i++) {
      const t = nowNs();

      fn();
      samples.push(msSince(t));
    }
    console.log(`  ${label}: ${computeStats(samples).mean.toFixed(1)} ms/frame`);

    return computeStats(samples);
  };

  console.log(`Full catalog frames (${commonIdx.length} sats x ${FRAMES} frames)...`);

  /*
   * Cruncher frame simulation: replicates positionCruncher.updateSatellite's
   * per-satellite work (minutes-since-epoch, propagate, NaN/energy checks,
   * Float32Array writes, and the old-elset altitude band validation). The
   * validation triggers when satrec.isimp or the elset is older than 20 days,
   * so the target time matters — with a stale catalog every satellite pays it.
   */
  const apogees = satrecs.map((s) => {
    const meanMotion = (s.no * 60 * 24) / (2 * Math.PI);
    const semiMajorAxis = (8681663.653 / meanMotion) ** (2 / 3);

    return semiMajorAxis * (1 + s.ecco) - 6371;
  });
  const perigees = satrecs.map((s) => {
    const meanMotion = (s.no * 60 * 24) / (2 * Math.PI);
    const semiMajorAxis = (8681663.653 / meanMotion) ** (2 / 3);

    return semiMajorAxis * (1 - s.ecco) - 6371;
  });
  const satPosF32 = new Float32Array(satrecs.length * 3);
  const satVelF32 = new Float32Array(satrecs.length * 3);

  /** The pre-fix iterative geodetic altitude check (20 trig iterations). */
  const validateOld = (px: number, py: number, pz: number, apogee: number, perigee: number): boolean => {
    const a = 6378.137;
    const b = 6356.7523142;
    const R = Math.sqrt(px * px + py * py);
    const f = (a - b) / a;
    const e2 = 2 * f - f * f;
    let k = 0;
    let lat = Math.atan2(pz, R);
    let C = 1;

    while (k < 20) {
      C = 1 / Math.sqrt(1 - e2 * (Math.sin(lat) * Math.sin(lat)));
      lat = Math.atan2(pz + a * C * e2 * Math.sin(lat), R);
      k += 1;
    }
    const alt = R / Math.cos(lat) - a * C;

    return alt <= apogee + 1000 && alt >= perigee - 100;
  };

  /** The post-fix spherical band check (reuses the caller's radius). */
  const validateNew = (rMag: number, apogee: number, perigee: number): boolean => rMag - 6371 <= apogee + 1030 && rMag - 6371 >= perigee - 130;

  const crunchSim = (satrecsArr: SatelliteRecord[], useOldValidation: boolean) => (): void => {
    for (let i = 0; i < satrecsArr.length; i++) {
      const pv = Sgp4.propagate(satrecsArr[i], mse[i]);

      if (!pv.position || !pv.velocity) {
        continue;
      }
      const p = pv.position;
      const v = pv.velocity;

      if (Number.isNaN(p.x) || Number.isNaN(p.y) || Number.isNaN(p.z)) {
        continue;
      }
      const rMag = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      const vMagSq = v.x * v.x + v.y * v.y + v.z * v.z;

      if (0.5 * vMagSq - 398600.4418 / rMag > 0 || rMag < 6350) {
        continue;
      }
      satPosF32[i * 3] = p.x;
      satPosF32[i * 3 + 1] = p.y;
      satPosF32[i * 3 + 2] = p.z;
      satVelF32[i * 3] = v.x;
      satVelF32[i * 3 + 1] = v.y;
      satVelF32[i * 3 + 2] = v.z;

      if (satrecsArr[i].isimp || mse[i] / 1440 > 20) {
        if (useOldValidation) {
          validateOld(p.x, p.y, p.z, apogees[i], perigees[i]);
        } else {
          validateNew(rMag, apogees[i], perigees[i]);
        }
      }
    }
  };

  rows.push({
    scenario: 'Full catalog frame', engine: 'sgp4', mode: 'loop', unit: 'ms/frame',
    stats: frameBench('sgp4 loop', () => {
      for (let i = 0; i < satrecs.length; i++) {
        Sgp4.propagate(satrecs[i], mse[i]);
      }
    }),
  });

  // TS cruncher sim must run before any wasm backend is installed
  rows.push({
    scenario: 'Cruncher frame sim', engine: 'sgp4', mode: 'old validation', unit: 'ms/frame',
    stats: frameBench('sgp4 crunch-sim old', crunchSim(satrecs, true)),
  });
  rows.push({
    scenario: 'Cruncher frame sim', engine: 'sgp4', mode: 'new validation', unit: 'ms/frame',
    stats: frameBench('sgp4 crunch-sim new', crunchSim(satrecs, false)),
  });

  for (const e of engines) {
    // Seam: exactly the app path — Sgp4.propagate with the backend installed.
    // Dedicated satrecs + empty-registry instance so lazy attach works.
    const seamSatrecs = commonIdx.map((i) => Sgp4.createSatrec(entries[i].tle1, entries[i].tle2, Sgp4GravConstants.wgs72, Sgp4OpsMode.AFSPC));

    Sgp4.useWasmBackend(e.seam);
    rows.push({
      scenario: 'Full catalog frame', engine: e.name, mode: 'seam (app path)', unit: 'ms/frame',
      stats: frameBench(`${e.name} seam`, () => {
        for (let i = 0; i < seamSatrecs.length; i++) {
          Sgp4.propagate(seamSatrecs[i], mse[i]);
        }
      }),
    });

    /*
     * Cruncher sim through the seam while the backend is still installed —
     * the seam satrecs keep their attached satKeys, exactly like the app's
     * long-running worker.
     */
    rows.push({
      scenario: 'Cruncher frame sim', engine: e.name, mode: 'old validation', unit: 'ms/frame',
      stats: frameBench(`${e.name} crunch-sim old`, crunchSim(seamSatrecs, true)),
    });
    rows.push({
      scenario: 'Cruncher frame sim', engine: e.name, mode: 'new validation', unit: 'ms/frame',
      stats: frameBench(`${e.name} crunch-sim new`, crunchSim(seamSatrecs, false)),
    });
    Sgp4.clearWasmBackend();

    // Fast-call loop: per-satellite calls without the seam bookkeeping
    const keys = commonIdx.map((i) => e.satKeys[i]);

    rows.push({
      scenario: 'Full catalog frame', engine: e.name, mode: 'fast-call loop', unit: 'ms/frame',
      stats: frameBench(`${e.name} fast-call`, () => {
        for (let i = 0; i < keys.length; i++) {
          e.batch.propagateOnePosVelFast(keys[i], mse[i]);
        }
      }),
    });

    // Batch (api): one wrapper call per frame, including key marshalling
    rows.push({
      scenario: 'Full catalog frame', engine: e.name, mode: 'batch (api)', unit: 'ms/frame',
      stats: frameBench(`${e.name} batch api`, () => {
        e.batch.propagateDs50UtcPosVel(keys, ds50Target, 1, 0);
      }),
    });

    /*
     * Batch (prebuilt): key/result buffers allocated once and reused across
     * frames, positions copied out — models an optimized position cruncher.
     */
    const mod = e.batch.module;
    const keysPtr = mod._malloc(keys.length * 8);
    const resultPtr = mod._malloc(keys.length * 8 * 8);

    mod.HEAP64.set(BigInt64Array.from(keys), keysPtr >> 3);
    const rawBatch = (mod as unknown as Record<string, (...args: number[]) => number>)._Sgp4PropDs50UtcPosVel_wasm;
    const positions = new Float64Array(keys.length * 3);

    rows.push({
      scenario: 'Full catalog frame', engine: e.name, mode: 'batch (prebuilt)', unit: 'ms/frame',
      stats: frameBench(`${e.name} batch prebuilt`, () => {
        rawBatch(keysPtr, keys.length, ds50Target, 1, 0, resultPtr);
        const heap = mod.HEAPF64;
        const base = resultPtr >> 3;

        for (let i = 0; i < keys.length; i++) {
          const off = base + i * 8;

          positions[i * 3] = heap[off + 2];
          positions[i * 3 + 1] = heap[off + 3];
          positions[i * 3 + 2] = heap[off + 4];
        }
      }),
    });

    mod._free(keysPtr);
    mod._free(resultPtr);
  }

  // ─── Report ────────────────────────────────────────────────────────────────

  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    cpu: cpus()[0]?.model?.trim() ?? 'unknown CPU',
    catalogFile: CATALOG_FILE,
    catalogSize: entries.length,
    commonSats: commonIdx.length,
    singleSatName: singleName,
    frames: FRAMES,
    warmupFrames: WARMUP_FRAMES,
    singleIters: SINGLE_ITERS,
    medianElsetAgeDays: elsetAgeDays,
    maxPositionDeltaKm: maxDelta,
    paritySampleSize: paritySample,
    enginesSkipped,
    rows,
  };

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
  const htmlPath = join(OUT_DIR, 'sgp4-benchmark.html');
  const jsonPath = join(OUT_DIR, 'sgp4-benchmark.json');

  writeFileSync(htmlPath, renderHtmlReport(report));
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  console.log('\nSummary (mean):');
  for (const row of rows) {
    console.log(`  ${row.scenario.padEnd(20)} ${row.engine.padEnd(14)} ${row.mode.padEnd(18)} ${row.stats.mean.toFixed(2).padStart(12)} ${row.unit}`);
  }
  console.log(`\nHTML report: ${htmlPath}`);
  console.log(`JSON data:   ${jsonPath}`);

  for (const e of engines) {
    e.batch.dispose();
    e.seam.dispose();
  }
};

main().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
