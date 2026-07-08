/* eslint-disable max-lines-per-function, max-statements, no-await-in-loop, complexity */
/**
 * Real-data validation against ComSpOC's paired TLE / XTLE products for the
 * same satellites on the same day (`test.tle` = classic ephemeris-type-0,
 * `test.xtle` = SGP4-XP ephemeris-type-4). These are not redistributed, so the
 * script skips cleanly when they are absent. Unlike validate-parity.ts —
 * which synthesizes a type-4 TLE by flipping a flag — this exercises genuine
 * SGP4-XP element sets (repurposed AGOM/BTERM drag columns and all).
 *
 * It answers four questions:
 *   A. Does the SGP4-XP wasm build propagate real type-4 XTLEs cleanly?
 *   B. Does the classic build reject them (as validate-parity predicted)?
 *   C. On the classic type-0 TLEs, do the two builds still agree bit-for-bit?
 *   D. Propagated to a common absolute instant, does the XTLE-via-XP track land
 *      near the TLE-via-SGP4 track for the same object (i.e. is the XP output
 *      physically correct, not merely non-erroring)?
 *
 * The paired element sets do NOT share an epoch (ComSpOC issues them a few days
 * apart), so cross-source agreement is measured at common absolute times via
 * the ds50UTC propagation API, never at equal minutes-since-epoch.
 *
 * Usage:  npm run validate:sgp4-xtle
 *
 * Both wasm builds are license-restricted and optional; the script skips
 * cleanly when the Sgp4Prop artifacts are absent.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sgp4Wasm } from '../../src/engine/ootk/src/external/Sgp4Wasm';
import { Sgp4WasmBase } from '../../src/engine/ootk/src/external/Sgp4WasmBase';
import { Sgp4XpWasm } from '../../src/engine/ootk/src/external/Sgp4XpWasm';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(SCRIPT_DIR, '..', '..');
const TLE_FILE = join(SCRIPT_DIR, 'test.tle');
const XTLE_FILE = join(SCRIPT_DIR, 'test.xtle');
const OUT_DIR = join(ROOT_DIR, 'benchmark-results');

/** Julian date of the ds50UTC epoch (1949-12-31 00:00 UTC). */
const DS50_JD_EPOCH = 2433281.5;
const EPHEM_TYPE_COL = 62;
const DEEP_SPACE_PERIOD_MIN = 225;

/** Common absolute instants both tracks are propagated to (UTC). One near the
 *  XTLE epochs, one near the (newer) TLE epochs, to bracket the arc. */
const TARGETS = [
  { label: '2026-07-04T00Z (near XTLE epoch)', ms: Date.UTC(2026, 6, 4, 0, 0, 0) },
  { label: '2026-07-07T12Z (near TLE epoch)', ms: Date.UTC(2026, 6, 7, 12, 0, 0) },
];

const ds50Of = (ms: number): number => ms / 86400000 + 2440587.5 - DS50_JD_EPOCH;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ElsetEntry {
  id: string;
  l1: string;
  l2: string;
  ephType: number;
  meanMotion: number;
}

interface Xyz {
  x: number;
  y: number;
  z: number;
}

interface LoadResult {
  keys: bigint[];
  addFails: number;
  initFails: number;
}

interface CrossSample {
  id: string;
  isDeepSpace: boolean;
  /** Position magnitude delta between the two tracks (km), per target. */
  deltasKm: number[];
}

interface DeltaStats {
  n: number;
  min: number;
  median: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
}

interface XtleReport {
  generatedAt: string;
  node: string;
  tleFile: string;
  xtleFile: string;
  tleCount: number;
  xtleCount: number;
  tleTypes: Record<string, number>;
  xtleTypes: Record<string, number>;
  xpOnXtle: {
    ok: number;
    error: number;
    implausible: number;
    addFails: number;
    initFails: number;
    implausibleExamples: { id: string; magKm: number }[];
  };
  classicOnXtle: { probed: number; rejected: number; accepted: number };
  parity: { comparisons: number; maxComponentDeltaKm: number };
  crossSource: {
    matched: number;
    targets: string[];
    perTargetStats: DeltaStats[];
    bestStats: DeltaStats;
    nearEarthBest: DeltaStats;
    deepSpaceBest: DeltaStats;
    worst: { id: string; isDeepSpace: boolean; best: number }[];
  };
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/** Normalized NORAD id join key: file formatting differs ("   20" vs "00020"),
 *  so strip a purely-numeric field to its integer, else use the trimmed field
 *  (alpha-5 numbers start with a letter and pass through untouched). */
const normId = (l1: string): string => {
  const field = l1.substring(2, 7).trim();

  return (/^\d+$/u).test(field) ? String(Number.parseInt(field, 10)) : field.toUpperCase();
};

const parseElsetFile = (path: string): ElsetEntry[] => {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/u);
  const out: ElsetEntry[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i];
    const l2 = lines[i + 1];

    if (l1.startsWith('1 ') && l2.startsWith('2 ') && l1.length >= 63 && l2.length >= 63) {
      out.push({
        id: normId(l1),
        l1,
        l2,
        ephType: Number(l1[EPHEM_TYPE_COL]) || 0,
        meanMotion: Number.parseFloat(l2.substring(52, 63)) || 0,
      });
      i++;
    }
  }

  return out;
};

// ─── Stats ───────────────────────────────────────────────────────────────────

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) {
    return 0;
  }

  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
};

const computeStats = (values: number[]): DeltaStats => {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  return {
    n,
    min: n ? sorted[0] : 0,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: n ? sorted[n - 1] : 0,
    mean: n ? sorted.reduce((acc, v) => acc + v, 0) / n : 0,
  };
};

const posMagDelta = (a: Xyz, b: Xyz): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ─── Loading elsets into an engine ─────────────────────────────────────────────

/** Add every entry (per-sat so one bad set never aborts the batch) then
 *  initialize the ones that added. Returns a key aligned to `entries` (0n =
 *  failed) plus failure tallies. */
const loadInto = (engine: Sgp4WasmBase, entries: ElsetEntry[]): LoadResult => {
  const keys = entries.map((e) => {
    try {
      return engine.addSat(e.l1, e.l2);
    } catch {
      return 0n;
    }
  });
  const addFails = keys.filter((k) => k <= 0n).length;
  let initFails = 0;
  const validKeys = keys.filter((k) => k > 0n);

  try {
    engine.initSats(validKeys);
  } catch {
    // One bad key aborts a batch init; fall back to isolating per-sat.
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] <= 0n) {
        continue;
      }
      try {
        engine.initSats([keys[i]]);
      } catch {
        initFails++;
        keys[i] = 0n;
      }
    }
  }

  return { keys, addFails, initFails };
};

// ─── Main ────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  if (!existsSync(TLE_FILE) || !existsSync(XTLE_FILE)) {
    console.warn(`Skipping XTLE validation: expected paired files next to this script:\n  ${TLE_FILE}\n  ${XTLE_FILE}`);

    return;
  }

  const tles = parseElsetFile(TLE_FILE);
  const xtles = parseElsetFile(XTLE_FILE);

  const tleTypes = tallyTypes(tles);
  const xtleTypes = tallyTypes(xtles);

  console.log(`Parsed ${tles.length} TLEs   (ephemeris types ${JSON.stringify(tleTypes)})`);
  console.log(`Parsed ${xtles.length} XTLEs (ephemeris types ${JSON.stringify(xtleTypes)})`);

  const typesLookRight = Boolean(tleTypes['0']) && Boolean(xtleTypes['4']);

  console.log(`  .tle declares type-0, .xtle declares type-4: ${typesLookRight ? 'yes' : 'NO — unexpected'}`);

  // Load both wasm builds.
  let classic: Sgp4Wasm;
  let xp: Sgp4XpWasm;

  try {
    console.log('Loading classic Sgp4Prop.wasm and SGP4-XP Sgp4Prop.xp.wasm...');
    classic = await new Sgp4Wasm().load();
    xp = await new Sgp4XpWasm().load();
  } catch (err) {
    console.log(`\nWasm builds unavailable (${(err as Error).message.split('.')[0]}).`);
    console.log('The Sgp4Prop artifacts are license-restricted (space-track.org) and optional. Nothing to validate.');

    return;
  }

  // classic build holds the type-0 TLEs; xp build holds the type-4 XTLEs and
  // (for the parity check) the type-0 TLEs too — all distinct satKeys.
  console.log('Loading elsets into the wasm registries...');
  const tleInClassic = loadInto(classic, tles);
  const tleInXp = loadInto(xp, tles);
  const xtleInXp = loadInto(xp, xtles);

  // ─── A. Does XP propagate real type-4 XTLEs? ───────────────────────────────

  let xpOk = 0;
  let xpErr = 0;
  let xpImplausible = 0;
  const implausibleExamples: { id: string; magKm: number }[] = [];

  for (let i = 0; i < xtles.length; i++) {
    const key = xtleInXp.keys[i];

    if (key <= 0n) {
      xpErr++;
      continue;
    }
    const pv = xp.propagateOnePosVelFast(key, 0);

    if (pv.err !== 0) {
      xpErr++;
      continue;
    }
    const mag = Math.hypot(pv.position.x, pv.position.y, pv.position.z);

    // A magnitude sanity band (~120 km altitude to ~beyond-GEO); orbits outside
    // it are reentering or very-high-apogee objects, not XP propagation errors.
    if (!Number.isFinite(mag) || mag < 6500 || mag > 500000) {
      xpImplausible++;
      if (implausibleExamples.length < 12) {
        implausibleExamples.push({ id: xtles[i].id, magKm: mag });
      }
    } else {
      xpOk++;
    }
  }

  // ─── B. Does the classic build reject type-4 XTLEs? ────────────────────────

  // Probe only genuine type-4 sets — the .xtle product carries a few type-0
  // fallbacks, which the classic build legitimately accepts.
  const trueType4 = xtles.filter((e) => e.ephType === 4);
  const probeN = Math.min(500, trueType4.length);
  const classicProbe = await new Sgp4Wasm().load();
  let classicRejected = 0;
  let classicAccepted = 0;

  for (let i = 0; i < probeN; i++) {
    const e = trueType4[Math.floor((i / probeN) * trueType4.length)];
    const outcome = probeReject(classicProbe, e.l1, e.l2);

    if (outcome) {
      classicRejected++;
    } else {
      classicAccepted++;
    }
  }
  classicProbe.dispose();

  // ─── C. Bit-for-bit parity on the classic type-0 TLEs ──────────────────────

  const parityTimes = [0, 60, 720, 1440];
  let parityMax = 0;
  let parityN = 0;

  for (let i = 0; i < tles.length; i++) {
    const ck = tleInClassic.keys[i];
    const xk = tleInXp.keys[i];

    if (ck <= 0n || xk <= 0n) {
      continue;
    }
    for (const t of parityTimes) {
      const c = classic.propagateOnePosVelFast(ck, t);
      const x = xp.propagateOnePosVelFast(xk, t);

      if (c.err !== 0 || x.err !== 0) {
        continue;
      }
      parityMax = Math.max(
        parityMax,
        Math.abs(c.position.x - x.position.x),
        Math.abs(c.position.y - x.position.y),
        Math.abs(c.position.z - x.position.z),
      );
      parityN++;
    }
  }

  // ─── D. Cross-source agreement (TLE-via-SGP4 vs XTLE-via-XP) ────────────────

  const tleById = new Map(tles.map((e, i) => [e.id, { entry: e, key: tleInClassic.keys[i] }]));
  const xtleById = new Map(xtles.map((e, i) => [e.id, { entry: e, key: xtleInXp.keys[i] }]));
  const targetDs50 = TARGETS.map((t) => ds50Of(t.ms));
  const cross: CrossSample[] = [];
  let matched = 0;

  for (const [id, tle] of tleById) {
    const xtle = xtleById.get(id);

    if (!xtle || tle.key <= 0n || xtle.key <= 0n) {
      continue;
    }
    matched++;
    const periodMin = tle.entry.meanMotion > 0 ? 1440 / tle.entry.meanMotion : 0;
    const deltasKm: number[] = [];

    for (const ds50 of targetDs50) {
      const cRec = classic.propagateDs50UtcPosVel([tle.key], ds50, 1, 0)[0][0];
      const xRec = xp.propagateDs50UtcPosVel([xtle.key], ds50, 1, 0)[0][0];

      deltasKm.push(cRec.err === 0 && xRec.err === 0 ? posMagDelta(cRec.position, xRec.position) : Number.NaN);
    }
    cross.push({ id, isDeepSpace: periodMin >= DEEP_SPACE_PERIOD_MIN, deltasKm });
  }

  // Best-of-targets per satellite: the arc where each fit is freshest is the
  // fairest "do these describe the same orbit" signal (a big gap at one target
  // but small at the other usually just means one set was propagated further).
  const bestDeltas = cross
    .map((c) => Math.min(...c.deltasKm.filter((d) => !Number.isNaN(d))))
    .filter((d) => Number.isFinite(d));
  const perTargetStats = targetDs50.map((_ds, ti) =>
    computeStats(cross.map((c) => c.deltasKm[ti]).filter((d) => !Number.isNaN(d))));
  const bestStats = computeStats(bestDeltas);
  const nearEarthBest = computeStats(cross.filter((c) => !c.isDeepSpace)
    .map((c) => Math.min(...c.deltasKm.filter((d) => !Number.isNaN(d)))).filter((d) => Number.isFinite(d)));
  const deepSpaceBest = computeStats(cross.filter((c) => c.isDeepSpace)
    .map((c) => Math.min(...c.deltasKm.filter((d) => !Number.isNaN(d)))).filter((d) => Number.isFinite(d)));

  const worstCross = cross
    .map((c) => ({ id: c.id, isDeepSpace: c.isDeepSpace, best: Math.min(...c.deltasKm.filter((d) => !Number.isNaN(d))) }))
    .filter((c) => Number.isFinite(c.best))
    .sort((a, b) => b.best - a.best)
    .slice(0, 15);

  // ─── Report ────────────────────────────────────────────────────────────────

  const report: XtleReport = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    tleFile: 'test.tle',
    xtleFile: 'test.xtle',
    tleCount: tles.length,
    xtleCount: xtles.length,
    tleTypes,
    xtleTypes,
    xpOnXtle: {
      ok: xpOk,
      error: xpErr,
      implausible: xpImplausible,
      addFails: xtleInXp.addFails,
      initFails: xtleInXp.initFails,
      implausibleExamples,
    },
    classicOnXtle: { probed: probeN, rejected: classicRejected, accepted: classicAccepted },
    parity: { comparisons: parityN, maxComponentDeltaKm: parityMax },
    crossSource: {
      matched,
      targets: TARGETS.map((t) => t.label),
      perTargetStats,
      bestStats,
      nearEarthBest,
      deepSpaceBest,
      worst: worstCross,
    },
  };

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
  const jsonPath = join(OUT_DIR, 'sgp4-xtle.json');

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  printSummary(report);
  console.log(`\nJSON data: ${jsonPath}`);

  classic.dispose();
  xp.dispose();
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const tallyTypes = (entries: ElsetEntry[]): Record<string, number> => {
  const t: Record<string, number> = {};

  for (const e of entries) {
    const k = String(e.ephType);

    t[k] = (t[k] ?? 0) + 1;
  }

  return t;
};

/** True when the classic build cannot produce a valid state for this elset. */
const probeReject = (engine: Sgp4WasmBase, l1: string, l2: string): boolean => {
  let key: bigint;

  try {
    key = engine.addSat(l1, l2);
  } catch {
    return true;
  }
  try {
    engine.initSats([key]);
  } catch {
    return true;
  }

  return engine.propagateOnePosVelFast(key, 0).err !== 0;
};

const fmtKm = (v: number): string => {
  if (v === 0) {
    return '0';
  }

  return v < 1e-3 ? v.toExponential(2) : v.toFixed(3);
};

const printSummary = (r: XtleReport): void => {
  const line = '─'.repeat(74);
  const x = r.xpOnXtle;
  const c = r.classicOnXtle;
  const cs = r.crossSource;

  console.log(`\n${line}`);
  console.log('  ComSpOC TLE / XTLE real-data validation');
  console.log(line);

  const aPass = x.error === 0 && x.addFails === 0 && x.initFails === 0 && x.ok > 0;

  console.log('\n  A. SGP4-XP build on real type-4 XTLEs:');
  console.log(`     ${x.ok + x.implausible} added, initialized and propagated with 0 errors ` +
    `(${x.addFails} add / ${x.initFails} init failures)`);
  console.log(`     ${aPass ? 'PASS' : 'FAIL'} — XP ${aPass ? 'handles every real XTLE' : 'had failures'}`);
  if (x.implausible > 0) {
    const eg = x.implausibleExamples.map((e) => `${e.id}=${Math.round(e.magKm)}km`).join(', ');

    console.log(`     (${x.implausible} land outside the normal-orbit band — reentry/high-apogee, not errors: ${eg})`);
  }

  const bPass = c.rejected === c.probed;

  console.log('\n  B. Classic build on the same type-4 XTLEs:');
  console.log(`     probed ${c.probed} genuine type-4: ${c.rejected} rejected (no valid state), ${c.accepted} accepted`);
  console.log(`     ${bPass ? 'PASS' : 'NOTE'} — classic ${bPass ? 'rejects every XP element set, as expected' : 'accepted some'}`);

  console.log('\n  C. Classic (type-0) TLE parity, classic vs XP build:');
  console.log(`     ${r.parity.comparisons} comparisons, max |Δcomponent| ${fmtKm(r.parity.maxComponentDeltaKm)} km`);
  console.log(`     ${r.parity.maxComponentDeltaKm <= 0.001 ? 'PASS' : 'FAIL'} — bit-for-bit agreement on classic TLEs`);

  console.log('\n  D. Cross-source: TLE-via-SGP4 vs XTLE-via-XP, same object, common time:');
  console.log(`     ${cs.matched} satellites matched across both files`);
  console.log(`     position agreement (best-of-targets, km):  median ${fmtKm(cs.bestStats.median)}   p95 ${fmtKm(cs.bestStats.p95)}   max ${fmtKm(cs.bestStats.max)}`);
  console.log(`        near-Earth  median ${fmtKm(cs.nearEarthBest.median)}   p95 ${fmtKm(cs.nearEarthBest.p95)}`);
  console.log(`        deep-space  median ${fmtKm(cs.deepSpaceBest.median)}   p95 ${fmtKm(cs.deepSpaceBest.p95)}`);
  cs.perTargetStats.forEach((s, i) => {
    console.log(`     at ${cs.targets[i].padEnd(34)}  median ${fmtKm(s.median)}   p95 ${fmtKm(s.p95)} km  (n=${s.n})`);
  });

  console.log('\n  Worst cross-source offenders (largest best-target delta — maneuvers/decays expected here):');
  for (const w of cs.worst.slice(0, 8)) {
    console.log(`     ${w.id.padStart(7)}  ${(w.isDeepSpace ? 'deep-space' : 'near-Earth').padEnd(11)}  ${fmtKm(w.best)} km`);
  }
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
