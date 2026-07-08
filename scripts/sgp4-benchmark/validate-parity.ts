/* eslint-disable max-lines-per-function, max-statements, no-await-in-loop, complexity */
/**
 * SGP4 cross-engine parity validation: proves the classic USSF Astro Standards
 * wasm build (`Sgp4Prop.wasm`) and the SGP4-XP build (`Sgp4Prop.xp.wasm`)
 * return the same TEME position and velocity when handed the *same* TLE, and
 * empirically answers whether the XP build can also propagate classic (type-0)
 * TLEs — not just the ephemeris-type-4 sets it is designed for.
 *
 * The two builds are genuinely different binaries (the XP one is roughly twice
 * the size because it carries the extended atmospheric-density / solar-radiation
 * model), so agreement is not a foregone conclusion.
 *
 * What it does:
 *   1. Bulk parity — samples the catalog, propagates every satellite to a
 *      spread of times-since-epoch through both wasm builds (plus the pure-TS
 *      Sgp4 as a third witness), and aggregates the position/velocity deltas,
 *      split near-Earth vs deep-space, with the worst offenders listed.
 *   2. Ephemeris-type probe — feeds a handful of representative satellites to
 *      both builds as their real type-0 TLE and as a synthesized type-4 variant
 *      (ephemeris digit flipped, checksum repaired), recording which build
 *      accepts/initializes/propagates each, to show what "XP does both" means.
 *
 * Usage:
 *   npm run validate:sgp4-parity                 # default 5000-sat sample
 *   npm run validate:sgp4-parity -- --limit 500
 *   npm run validate:sgp4-parity -- --all        # whole catalog
 *
 * Both wasm builds are license-restricted and optional; when the Sgp4Prop
 * artifacts are absent from src/engine/ootk/src/external/, the script prints a
 * note and exits cleanly (nothing to validate).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FormatTle } from '../../src/engine/ootk/src/coordinate/FormatTle';
import { Sgp4OpsMode } from '../../src/engine/ootk/src/enums/Sgp4OpsMode';
import { Sgp4Wasm } from '../../src/engine/ootk/src/external/Sgp4Wasm';
import { Sgp4WasmBase } from '../../src/engine/ootk/src/external/Sgp4WasmBase';
import { Sgp4XpWasm } from '../../src/engine/ootk/src/external/Sgp4XpWasm';
import { Sgp4WasmError } from '../../src/engine/ootk/src/external/Sgp4WasmTypes';
import { Sgp4, Sgp4GravConstants } from '../../src/engine/ootk/src/sgp4/sgp4';
import { SatelliteRecord } from '../../src/engine/ootk/src/types/types';
import { renderParityReport } from './parity-report';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CATALOG_FILE = 'public/tle/tle.json';
const OUT_DIR = join(ROOT_DIR, 'benchmark-results');

/** Times since epoch (minutes) probed for every satellite. A negative sample,
 *  short arcs, and multi-day arcs together stress where the two builds could
 *  diverge most (deep-space perturbations grow with propagation span). */
const TSINCE_MIN = [-720, 0, 5, 30, 90, 360, 720, 1440, 2880, 5760];

/** SGP4/SDP4 hand-off: orbital period >= 225 min selects the deep-space model. */
const DEEP_SPACE_PERIOD_MIN = 225;

/** Column (0-indexed) of the ephemeris type on TLE line 1, and the checksum. */
const EPHEM_TYPE_COL = 62;
const CHECKSUM_COL = 68;

// ─── CLI args ────────────────────────────────────────────────────────────────

const argValue = (name: string, fallback: number): number => {
  const idx = process.argv.indexOf(`--${name}`);

  if (idx === -1 || idx + 1 >= process.argv.length) {
    return fallback;
  }

  return Number.parseInt(process.argv[idx + 1], 10) || fallback;
};

const ALL = process.argv.includes('--all');
const LIMIT = ALL ? 0 : argValue('limit', 5000);

// Each Emscripten runtime we load registers its own `uncaughtException`
// listener and never removes it; the probe loads a fresh pair per regime, so
// lift Node's 10-listener warning cap for this short-lived script.
process.setMaxListeners(0);

// ─── Types ───────────────────────────────────────────────────────────────────

interface CorpusEntry {
  tle1: string;
  tle2: string;
  name: string;
  /** Ephemeris type declared by the source (line 1 col 63): 0 classic, 4 XP. */
  ephType: number;
}

interface Xyz {
  x: number;
  y: number;
  z: number;
}

interface Sample {
  name: string;
  noradId: string;
  tsince: number;
  isDeepSpace: boolean;
  /** Largest |Δ| position component between the two wasm builds (km). */
  posDelta: number;
  /** |Δ| velocity magnitude between the two wasm builds (km/s). */
  velDelta: number;
  /** |Δ| position magnitude, classic wasm vs pure-TS Sgp4 (km). */
  classicVsTs: number;
  /** |Δ| position magnitude, XP wasm vs pure-TS Sgp4 (km). */
  xpVsTs: number;
}

export interface DeltaStats {
  n: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

export interface ProbeRow {
  name: string;
  noradId: string;
  regime: string;
  /** Result of feeding the real type-0 TLE to each build. */
  type0: { classic: string; xp: string };
  /** Result of feeding the synthesized type-4 variant to each build. */
  type4: { classic: string; xp: string };
  /** |Δ| position, classic-vs-XP on the type-0 TLE (km); null if either failed. */
  type0BuildDeltaKm: number | null;
  /** |Δ| position, XP type-0 vs XP type-4 of the same elements (km); null if failed. */
  xpType0VsType4Km: number | null;
}

export interface ParityReport {
  generatedAt: string;
  node: string;
  catalogFile: string;
  catalogSize: number;
  sampled: number;
  commonSats: number;
  tsinceMin: number[];
  ephemTypeCounts: Record<string, number>;
  overall: DeltaStats;
  nearEarth: DeltaStats;
  deepSpace: DeltaStats;
  velOverall: DeltaStats;
  classicVsTs: DeltaStats;
  xpVsTs: DeltaStats;
  worstOffenders: Sample[];
  probes: ProbeRow[];
  parityThresholdKm: number;
  parityPass: boolean;
  enginesSkipped: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) {
    return 0;
  }

  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
};

const computeDeltaStats = (values: number[]): DeltaStats => {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  return {
    n,
    max: n ? sorted[n - 1] : 0,
    mean: n ? sorted.reduce((acc, v) => acc + v, 0) / n : 0,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
};

const posMagDelta = (a: Xyz, b: Xyz): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const maxCompDelta = (a: Xyz, b: Xyz): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));

/** Flip line 1's ephemeris type to `type` and repair the checksum. */
const setEphemType = (tle1: string, type: number): string => {
  const flipped = FormatTle.setCharAt(tle1, EPHEM_TYPE_COL, String(type));

  return FormatTle.setCharAt(flipped, CHECKSUM_COL, String(FormatTle.tleChecksum(flipped)));
};

// ─── Corpus loading (supports both tle1/tle2 and CelesTrak OMM JSON) ──────────

/** The subset of a CelesTrak flat-OMM JSON record this script consumes. */
interface OmmFlat {
  EPOCH: string;
  OBJECT_ID?: string;
  OBJECT_NAME?: string;
  NORAD_CAT_ID?: string | number;
  CLASSIFICATION_TYPE?: string;
  INCLINATION: string | number;
  MEAN_MOTION: string | number;
  RA_OF_ASC_NODE: string | number;
  ARG_OF_PERICENTER: string | number;
  MEAN_ANOMALY: string | number;
  ECCENTRICITY: string | number;
  BSTAR?: string | number;
  MEAN_MOTION_DOT?: string | number;
  MEAN_MOTION_DDOT?: string | number;
  ELEMENT_SET_NO?: string | number;
  REV_AT_EPOCH?: string | number;
  EPHEMERIS_TYPE?: string | number;
}

/** CelesTrak flat-OMM record → a real TLE line pair via ootk's own formatter.
 *  Fidelity does not affect parity: both wasm builds receive the identical
 *  strings, so they must still agree. */
const ommToTle = (o: OmmFlat): CorpusEntry | null => {
  try {
    const epoch = new Date(o.EPOCH);
    const year = epoch.getUTCFullYear();
    const epochday = (epoch.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1;
    const intl = String(o.OBJECT_ID ?? '').replace('-', '').slice(2);

    const { tle1, tle2 } = FormatTle.createTle({
      inc: Number(o.INCLINATION),
      meanmo: Number(o.MEAN_MOTION),
      rasc: Number(o.RA_OF_ASC_NODE),
      argPe: Number(o.ARG_OF_PERICENTER),
      meana: Number(o.MEAN_ANOMALY),
      ecen: Number(o.ECCENTRICITY),
      epochyr: year % 100,
      epochday,
      intl,
      scc: String(o.NORAD_CAT_ID ?? ''),
      bstar: Number(o.BSTAR ?? 0),
      meanMotionDot: Number(o.MEAN_MOTION_DOT ?? 0),
      meanMotionDdot: Number(o.MEAN_MOTION_DDOT ?? 0),
      classification: String(o.CLASSIFICATION_TYPE ?? 'U'),
      elementSetNo: Number(o.ELEMENT_SET_NO ?? 999),
      revAtEpoch: Number(o.REV_AT_EPOCH ?? 0),
      ephemerisType: Number(o.EPHEMERIS_TYPE ?? 0),
    });

    return { tle1, tle2, name: String(o.OBJECT_NAME ?? ''), ephType: Number(o.EPHEMERIS_TYPE ?? 0) };
  } catch {
    return null;
  }
};

const loadCorpus = (): CorpusEntry[] => {
  const raw = JSON.parse(readFileSync(join(ROOT_DIR, CATALOG_FILE), 'utf8')) as Record<string, unknown>[];
  const out: CorpusEntry[] = [];

  for (const e of raw) {
    if (typeof e.tle1 === 'string' && typeof e.tle2 === 'string' && e.tle1.length >= 68 && e.tle2.length >= 68) {
      const nm = e.name ?? e.OBJECT_NAME;

      out.push({
        tle1: e.tle1,
        tle2: e.tle2,
        name: typeof nm === 'string' ? nm : '',
        ephType: Number(e.tle1[EPHEM_TYPE_COL]) || 0,
      });
    } else if (e.MEAN_MOTION !== undefined) {
      const converted = ommToTle(e as unknown as OmmFlat);

      if (converted) {
        out.push(converted);
      }
    }
  }

  return out;
};

/** Even stride so a subset still spans the whole catalog (LEO → deep space). */
const sampleEvenly = <T>(items: T[], limit: number): T[] => {
  if (limit <= 0 || items.length <= limit) {
    return items;
  }
  const step = items.length / limit;

  return Array.from({ length: limit }, (_unused, i) => items[Math.floor(i * step)]);
};

// ─── Ephemeris-type probe ─────────────────────────────────────────────────────

type ProbeOutcome = { status: string; pos: Xyz | null };

/** Run one TLE through a fresh-enough engine, capturing where it stops. */
const probeEngine = (engine: Sgp4WasmBase, tle1: string, tle2: string, tsince: number): ProbeOutcome => {
  let key: bigint;

  try {
    key = engine.addSat(tle1, tle2);
  } catch (err) {
    return { status: `add failed (code ${(err as Sgp4WasmError).code ?? '?'})`, pos: null };
  }

  try {
    engine.initSats([key]);
  } catch (err) {
    return { status: `init failed (code ${(err as Sgp4WasmError).code ?? '?'})`, pos: null };
  }

  const pv = engine.propagateOnePosVelFast(key, tsince);

  if (pv.err !== 0) {
    return { status: `prop err ${pv.err}`, pos: null };
  }

  return { status: 'ok', pos: pv.position };
};

const regimeOf = (periodMin: number, ecc: number): string => {
  if (ecc > 0.5) {
    return 'HEO/Molniya';
  }
  if (periodMin >= 1400 && periodMin <= 1500) {
    return 'GEO/synchronous';
  }
  if (periodMin >= DEEP_SPACE_PERIOD_MIN) {
    return 'MEO/deep-space';
  }
  if (periodMin < 95) {
    return 'VLEO';
  }

  return 'LEO';
};

/** Pick up to `count` satellites spread across distinct orbital regimes. */
const pickProbeReps = (
  entries: CorpusEntry[],
  satrecs: (SatelliteRecord | null)[],
  count: number,
): { entry: CorpusEntry; regime: string; noradId: string }[] => {
  const byRegime = new Map<string, { entry: CorpusEntry; regime: string; noradId: string }>();

  for (let i = 0; i < entries.length; i++) {
    const s = satrecs[i];

    if (!s) {
      continue;
    }
    const periodMin = (2 * Math.PI) / s.no;
    const regime = regimeOf(periodMin, s.ecco);

    if (!byRegime.has(regime)) {
      byRegime.set(regime, { entry: entries[i], regime, noradId: entries[i].tle1.substring(2, 7).trim() });
    }
  }

  return [...byRegime.values()].slice(0, count);
};

// ─── Main ────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  console.log('Loading catalog...');
  const corpus = loadCorpus();

  if (corpus.length === 0) {
    console.error(`No usable TLEs found in ${CATALOG_FILE}.`);
    process.exitCode = 1;

    return;
  }

  const ephemTypeCounts: Record<string, number> = {};

  for (const e of corpus) {
    const k = String(e.ephType);

    ephemTypeCounts[k] = (ephemTypeCounts[k] ?? 0) + 1;
  }

  const entries = sampleEvenly(corpus, LIMIT);

  console.log(`Catalog: ${corpus.length} usable TLEs; validating a sample of ${entries.length}.`);
  console.log(`Ephemeris-type distribution (whole catalog): ${JSON.stringify(ephemTypeCounts)}`);

  // Pure-TS reference satrecs (never routed through a wasm backend here).
  Sgp4.clearWasmBackend();
  const satrecs: (SatelliteRecord | null)[] = entries.map((e) => {
    try {
      const s = Sgp4.createSatrec(e.tle1, e.tle2, Sgp4GravConstants.wgs72, Sgp4OpsMode.AFSPC);

      return s.error === 0 ? s : null;
    } catch {
      return null;
    }
  });

  // Load both wasm builds and batch-add the sample into each.
  const enginesSkipped: string[] = [];
  let classic: Sgp4Wasm | null = null;
  let xp: Sgp4XpWasm | null = null;
  let classicKeys: bigint[] = [];
  let xpKeys: bigint[] = [];
  const tleText = entries.map((e) => `${e.tle1}\n${e.tle2}`).join('\n');

  try {
    console.log('Loading classic Sgp4Prop.wasm...');
    classic = await new Sgp4Wasm().load();
    classicKeys = classic.addSats(tleText);
    classic.initSats(classicKeys.filter((k) => k > 0n));
  } catch (err) {
    console.warn(`Skipping sgp4-wasm: ${(err as Error).message.split('.')[0]}`);
    enginesSkipped.push('sgp4-wasm');
    classic = null;
  }

  try {
    console.log('Loading SGP4-XP Sgp4Prop.xp.wasm...');
    xp = await new Sgp4XpWasm().load();
    xpKeys = xp.addSats(tleText);
    xp.initSats(xpKeys.filter((k) => k > 0n));
  } catch (err) {
    console.warn(`Skipping sgp4-xp-wasm: ${(err as Error).message.split('.')[0]}`);
    enginesSkipped.push('sgp4-xp-wasm');
    xp = null;
  }

  if (!classic || !xp) {
    console.log('\nBoth wasm builds are required for parity validation; one or both are unavailable.');
    console.log('The Sgp4Prop artifacts are license-restricted (space-track.org) and optional. Nothing to validate.');

    return;
  }

  // ─── Bulk parity sweep ─────────────────────────────────────────────────────

  const samples: Sample[] = [];
  let bothErrored = 0;

  console.log(`Propagating ${entries.length} satellites to ${TSINCE_MIN.length} times through both builds...`);

  for (let i = 0; i < entries.length; i++) {
    const s = satrecs[i];
    const ck = classicKeys[i];
    const xk = xpKeys[i];

    if (!s || ck <= 0n || xk <= 0n) {
      continue;
    }
    const periodMin = (2 * Math.PI) / s.no;
    const isDeepSpace = periodMin >= DEEP_SPACE_PERIOD_MIN;
    const noradId = entries[i].tle1.substring(2, 7).trim();

    for (const tsince of TSINCE_MIN) {
      const cPv = classic.propagateOnePosVelFast(ck, tsince);
      const xPv = xp.propagateOnePosVelFast(xk, tsince);

      if (cPv.err !== 0 || xPv.err !== 0) {
        if (cPv.err !== 0 && xPv.err !== 0) {
          bothErrored++;
        }
        continue;
      }

      const tsPv = Sgp4.propagate(s, tsince);
      const tsPos = tsPv.position;

      samples.push({
        name: entries[i].name,
        noradId,
        tsince,
        isDeepSpace,
        posDelta: maxCompDelta(cPv.position, xPv.position),
        velDelta: Math.hypot(
          cPv.velocity.x - xPv.velocity.x,
          cPv.velocity.y - xPv.velocity.y,
          cPv.velocity.z - xPv.velocity.z,
        ),
        classicVsTs: tsPos ? posMagDelta(cPv.position, tsPos) : Number.NaN,
        xpVsTs: tsPos ? posMagDelta(xPv.position, tsPos) : Number.NaN,
      });
    }
  }

  const overall = computeDeltaStats(samples.map((s) => s.posDelta));
  const nearEarth = computeDeltaStats(samples.filter((s) => !s.isDeepSpace).map((s) => s.posDelta));
  const deepSpace = computeDeltaStats(samples.filter((s) => s.isDeepSpace).map((s) => s.posDelta));
  const velOverall = computeDeltaStats(samples.map((s) => s.velDelta));
  const classicVsTs = computeDeltaStats(samples.map((s) => s.classicVsTs).filter((v) => !Number.isNaN(v)));
  const xpVsTs = computeDeltaStats(samples.map((s) => s.xpVsTs).filter((v) => !Number.isNaN(v)));
  const worstOffenders = [...samples].sort((a, b) => b.posDelta - a.posDelta).slice(0, 15);

  // A sub-meter agreement across every regime and span is the pass bar; both
  // builds implement the identical SGP4 reference for classic TLEs.
  const parityThresholdKm = 0.001;
  const parityPass = overall.max <= parityThresholdKm;

  // ─── Ephemeris-type probe ──────────────────────────────────────────────────

  console.log('Probing ephemeris-type handling (type-0 vs synthesized type-4)...');
  const reps = pickProbeReps(entries, satrecs, 8);
  const probes: ProbeRow[] = [];
  const probeTsince = 90;

  for (const rep of reps) {
    // Fresh instances isolate any hard failure from the bulk-test engines.
    const cProbe = await new Sgp4Wasm().load();
    const xProbe = await new Sgp4XpWasm().load();
    const type4Line1 = setEphemType(rep.entry.tle1, 4);

    const c0 = probeEngine(cProbe, rep.entry.tle1, rep.entry.tle2, probeTsince);
    const x0 = probeEngine(xProbe, rep.entry.tle1, rep.entry.tle2, probeTsince);
    const c4 = probeEngine(cProbe, type4Line1, rep.entry.tle2, probeTsince);
    const x4 = probeEngine(xProbe, type4Line1, rep.entry.tle2, probeTsince);

    probes.push({
      name: rep.entry.name,
      noradId: rep.noradId,
      regime: rep.regime,
      type0: { classic: c0.status, xp: x0.status },
      type4: { classic: c4.status, xp: x4.status },
      type0BuildDeltaKm: c0.pos && x0.pos ? maxCompDelta(c0.pos, x0.pos) : null,
      xpType0VsType4Km: x0.pos && x4.pos ? maxCompDelta(x0.pos, x4.pos) : null,
    });

    cProbe.dispose();
    xProbe.dispose();
  }

  // ─── Report ────────────────────────────────────────────────────────────────

  const report: ParityReport = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    catalogFile: CATALOG_FILE,
    catalogSize: corpus.length,
    sampled: entries.length,
    commonSats: new Set(samples.map((s) => s.noradId)).size,
    tsinceMin: TSINCE_MIN,
    ephemTypeCounts,
    overall,
    nearEarth,
    deepSpace,
    velOverall,
    classicVsTs,
    xpVsTs,
    worstOffenders,
    probes,
    parityThresholdKm,
    parityPass,
    enginesSkipped,
  };

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
  const htmlPath = join(OUT_DIR, 'sgp4-parity.html');
  const jsonPath = join(OUT_DIR, 'sgp4-parity.json');

  writeFileSync(htmlPath, renderParityReport(report));
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  printConsoleSummary(report, bothErrored);

  console.log(`\nHTML report: ${htmlPath}`);
  console.log(`JSON data:   ${jsonPath}`);

  classic.dispose();
  xp.dispose();
};

// ─── Console summary ───────────────────────────────────────────────────────────

const fmtKm = (v: number): string => {
  if (v === 0) {
    return '0';
  }

  return v < 1e-3 ? v.toExponential(2) : v.toFixed(6);
};

const printConsoleSummary = (r: ParityReport, bothErrored: number): void => {
  const line = '─'.repeat(72);

  console.log(`\n${line}`);
  console.log('  SGP4 vs SGP4-XP wasm — cross-engine parity');
  console.log(line);
  console.log(`  Sample: ${r.commonSats} satellites × ${r.tsinceMin.length} times = ${r.overall.n} comparisons`);
  console.log(`  (${r.deepSpace.n} deep-space, ${r.nearEarth.n} near-Earth; ${bothErrored} both-errored pairs skipped)`);
  console.log('');
  console.log('  Position delta between the two builds (max |Δcomponent|, km):');
  console.log(`    overall     max ${fmtKm(r.overall.max).padStart(12)}   p99 ${fmtKm(r.overall.p99).padStart(12)}   mean ${fmtKm(r.overall.mean).padStart(12)}`);
  console.log(`    near-Earth  max ${fmtKm(r.nearEarth.max).padStart(12)}   p99 ${fmtKm(r.nearEarth.p99).padStart(12)}   mean ${fmtKm(r.nearEarth.mean).padStart(12)}`);
  console.log(`    deep-space  max ${fmtKm(r.deepSpace.max).padStart(12)}   p99 ${fmtKm(r.deepSpace.p99).padStart(12)}   mean ${fmtKm(r.deepSpace.mean).padStart(12)}`);
  console.log(`  Velocity delta (km/s):  max ${fmtKm(r.velOverall.max)}   mean ${fmtKm(r.velOverall.mean)}`);
  console.log(`  Sanity vs pure-TS Sgp4 (pos mag, km):  classic max ${fmtKm(r.classicVsTs.max)}   XP max ${fmtKm(r.xpVsTs.max)}`);
  console.log('');
  const failNote = r.parityPass ? '' : ` (max ${fmtKm(r.overall.max)} km exceeds threshold)`;

  console.log(`  VERDICT: ${r.parityPass ? 'PASS' : 'FAIL'} — both builds agree within ${r.parityThresholdKm} km on classic TLEs${failNote}`);

  if (r.worstOffenders.length && r.overall.max > 0) {
    console.log('\n  Worst offenders (classic vs XP):');
    for (const w of r.worstOffenders.slice(0, 5)) {
      console.log(`    ${w.noradId.padStart(6)} ${(w.name || '').slice(0, 22).padEnd(22)} t=${String(w.tsince).padStart(5)}min  Δpos ${fmtKm(w.posDelta)} km`);
    }
  }

  console.log(`\n${line}`);
  console.log('  Ephemeris-type handling: can the XP build do both?');
  console.log(line);
  console.log('  regime            type-0 classic / xp        type-4 classic / xp        xp t0-vs-t4');
  for (const p of r.probes) {
    const t0 = `${p.type0.classic} / ${p.type0.xp}`;
    const t4 = `${p.type4.classic} / ${p.type4.xp}`;
    const div = p.xpType0VsType4Km === null ? '-' : `${fmtKm(p.xpType0VsType4Km)} km`;

    console.log(`  ${p.regime.padEnd(16)} ${t0.padEnd(26)} ${t4.padEnd(26)} ${div}`);
  }
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
