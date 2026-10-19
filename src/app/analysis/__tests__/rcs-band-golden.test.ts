/* eslint-disable @typescript-eslint/no-explicit-any */
import { estimateRcsWithSource } from '@app/app/analysis/rcs-estimator';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { RcsColorScheme } from '@app/engine/rendering/color-schemes/rcs-color-scheme';
import { Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * RCS colour band golden (ootk v8 plan, section 3 and section 4 step 1).
 *
 * This snapshot now captures ootk v8. It was first captured on v7 as the
 * before-picture; v8 changed `estimateRcs` to return a real area in m² (v7
 * returned 1.5 * sqrt(area), which is neither m² nor dBsm), which moved every
 * geometric-layer estimate below. The vmag-derived rows moved by a factor of
 * π because the std-mag estimator (and its inverse in rcs-estimator) now uses
 * the same 90 deg phase, r² = A / π Lambert convention as ootk v8
 * `estimateVmagFromRcs`. Per plan section 4 step 5 the scheme's fallback
 * thresholds were then re-tuned (top two: 1 and 10 became 0.8 and 30,
 * raising fallback-band agreement with the v7 capture from 137 to 148 of 200),
 * and the verifier then moved 0.8 back to 1.0, the Space-Track size-bin edge
 * (agreement 145 of 200; [1, 10] would give 137). The quantile thresholds adapt
 * to the catalog on their own and were not touched (113 of 200 quantile bands
 * match v7). Any further change to this snapshot needs a named cause.
 *
 * The sample is 200 synthetic objects built with a seeded PRNG, covering every
 * layer of the estimator cascade (catalog, preset, catalog-mined, geometric,
 * vmag-derived, unknown). Most go through the geometric layer because that is
 * the one that calls ootk `estimateRcs`. Each object records its estimated RCS
 * (6 significant digits), its source layer, its band under the scheme's
 * fallback thresholds (what the first recolor uses) and its band under the
 * quantile thresholds computed over this 200-object catalog. Names use a
 * unique first token per object so the name-prefix mining layer only fires
 * where the sample means it to (shared bus).
 */

const SAMPLE_SIZE = 200;
const TLE1 = '1 25544U 98067A   25341.54791667  .00016717  00000-0  10270-3 0  9004' as TleLine1;
const TLE2 = '2 25544  51.6446 351.7886 0002187  96.5361  28.6483 15.49315347256916' as TleLine2;
const SHAPES = ['sphere', 'cylinder', 'cone', 'hexagon', 'box', 'cube', ''] as const;
const TYPES = [SpaceObjectType.PAYLOAD, SpaceObjectType.ROCKET_BODY, SpaceObjectType.DEBRIS] as const;
const MINED_BUSES = ['GOLDEN-BUS-A', 'GOLDEN-BUS-B', 'GOLDEN-BUS-C'] as const;
const PRESET_NAMES = ['STARLINK-1001', 'ONEWEB-0101', 'GLOBALSTAR M097', 'IRIDIUM 180', 'HST'] as const;

/** mulberry32: tiny deterministic PRNG returning floats in [0, 1). */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Log-uniform value in [lo, hi], formatted the way catalog dimension strings are. */
const logUniform = (rand: () => number, lo: number, hi: number): string => (lo * (hi / lo) ** rand()).toFixed(3);

const sig6 = (v: number): string => Number(v.toPrecision(6)).toString();

const makeSat = (id: number, info: Record<string, unknown>): Satellite =>
  new Satellite({
    id,
    tle1: TLE1,
    tle2: TLE2,
    rcs: null,
    vmag: null,
    ...info,
  } as any);

/**
 * Deterministic 200-object catalog:
 *   0-19    catalog rcs published
 *   20-29   preset name match (PAYLOAD)
 *   30-44   bus shared with published-rcs neighbours (catalog-mined)
 *   45-184  geometric: random shape, dimensions 0.05 m to 30 m, random type
 *   185-194 vmag only (vmag-derived)
 *   195-199 no signal at all (unknown)
 */
const buildSample = (): Satellite[] => {
  const rand = mulberry32(0x5eed2026);
  const sats: Satellite[] = [];

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const type = TYPES[Math.floor(rand() * TYPES.length)];

    if (i < 20) {
      // Every third one carries a mined bus so the catalog-mined layer has neighbours
      const bus = i % 3 === 0 ? MINED_BUSES[(i / 3) % MINED_BUSES.length] : '';

      sats.push(makeSat(i, { name: `GCAT${i}`, type, rcs: Number(logUniform(rand, 0.001, 50)), bus }));
    } else if (i < 30) {
      sats.push(makeSat(i, { name: PRESET_NAMES[i % PRESET_NAMES.length], type: SpaceObjectType.PAYLOAD }));
    } else if (i < 45) {
      sats.push(makeSat(i, { name: `GMINED${i}`, type, bus: MINED_BUSES[i % MINED_BUSES.length] }));
    } else if (i < 185) {
      const shape = SHAPES[Math.floor(rand() * SHAPES.length)];

      sats.push(
        makeSat(i, {
          name: `GGEOM${i}`,
          type,
          shape,
          length: logUniform(rand, 0.05, 30),
          diameter: logUniform(rand, 0.05, 10),
          span: logUniform(rand, 0.05, 30),
        })
      );
    } else if (i < 195) {
      sats.push(makeSat(i, { name: `GVMAG${i}`, type, vmag: Number((2 + rand() * 14).toFixed(2)) }));
    } else {
      sats.push(makeSat(i, { name: `GNONE${i}`, type }));
    }
  }

  return sats;
};

/** Maps the colour returned by the scheme back to its band slug by reference. */
const bandOf = (scheme: RcsColorScheme, sat: Satellite): string => {
  const color = scheme.update(sat).color;
  const theme = scheme.colorTheme as Record<string, unknown>;

  for (const slug of Object.keys(RcsColorScheme.uniqueColorTheme)) {
    if (theme[slug] === color) {
      return slug;
    }
  }

  return 'other';
};

describe('RCS band golden (ootk v8)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures estimated RCS and colour band for 200 objects', async () => {
    const sats = buildSample();

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({ getSats: () => sats } as any);

    const scheme = new RcsColorScheme();
    const fallbackBands = sats.map((sat) => bandOf(scheme, sat));

    scheme.calculateParams();
    const thresholds = (scheme as any).thresholds_ as number[];
    const stats = (scheme as any).catalogStats_;

    const rows = sats.map((sat, i) => {
      const est = estimateRcsWithSource(sat, stats);

      return {
        id: sat.id,
        name: sat.name,
        shape: sat.shape,
        dims: [sat.length, sat.diameter, sat.span].join(' x '),
        rcs: est ? sig6(est.rcs) : null,
        source: est?.source ?? null,
        fallbackBand: fallbackBands[i],
        quantileBand: bandOf(scheme, sat),
      };
    });

    const bySource: Record<string, number> = {};
    const byBand: Record<string, number> = {};

    for (const row of rows) {
      bySource[row.source ?? 'none'] = (bySource[row.source ?? 'none'] ?? 0) + 1;
      byBand[row.quantileBand] = (byBand[row.quantileBand] ?? 0) + 1;
    }

    // Every cascade layer must be represented, or the sample stopped covering what it claims
    expect(Object.keys(bySource).sort()).toEqual(['catalog', 'catalog-mined', 'geometric', 'none', 'preset', 'vmag-derived']);
    expect(rows).toHaveLength(SAMPLE_SIZE);

    const golden = {
      quantileThresholds: thresholds.map(sig6),
      bySource,
      byBand,
      rows,
    };

    await expect(`${JSON.stringify(golden, null, 2)}\n`).toMatchFileSnapshot('./__snapshots__/rcs-band-golden.json');
  });
});
