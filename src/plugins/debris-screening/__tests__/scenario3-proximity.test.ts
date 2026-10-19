/* eslint-disable @typescript-eslint/no-explicit-any */
import { DebrisScreening } from '@app/plugins/debris-screening/debris-screening';
import { CatalogScreener, EpochUTC, Satellite, Seconds, Tle, TleLine1, TleLine2 } from '@ootk/src/main';
import { describe, expect, it, vi } from 'vitest';

/*
 * UX validation iteration 2, scenario 3: a 500 km Debris Screening of TEVEL2-3
 * (63218) from 2026-10-15 06:15 to 07:15 UTC listed TEVEL2-6 at 345 km but not
 * ION SCV-017 or STARLINK-6240, which the tester placed at 246 and 129 km at
 * 06:40:31. These are the element sets the tester's session used (TEVEL2-6
 * reproduces the screening's 345.263 km at 06:24:03 to the metre).
 *
 * Root cause: the plugin's apogee / perigee pre-filter had no pad (and ootk's
 * own filter a 10 km pad) whatever the box size, so any object whose altitude
 * band sat more than 0 (or 10) km above the primary's was never assessed,
 * although a 500 km box reaches 500 km radially.
 */
const TLES: Record<string, [string, string]> = {
  '63218': ['1 63218U 25052J   26287.66755778  .00021227  00000+0  57454-3 0  9991', '2 63218  97.3706 183.8828 0004506  73.8412 286.3329 15.37700197 88438'],
  '63215': ['1 63215U 25052F   26289.48858174  .00020898  00000+0  55339-3 0  9997', '2 63215  97.3729 186.2041 0004263  63.8963 296.2721 15.38381931 88735'],
  '63230': ['1 63230U 25052W   26289.95531293  .00004427  00000+0  16066-3 0  9990', '2 63230  97.3735 184.0358 0020940 343.6582  16.3980 15.28646924 88634'],
  '57084': ['1 57084U 23088AN  26289.70245948  .00000075  00000+0  12233-4 0  9997', '2 57084  43.0021 287.7732 0000657 278.6354  81.4424 15.27580190184302'],
};
const SECONDARY_IDS = ['63215', '63230', '57084'] as const;
const START_MS = Date.UTC(2026, 9, 15, 6, 15, 0);
const END_MS = START_MS + 3_600_000;
const INSTANT_MS = Date.UTC(2026, 9, 15, 6, 40, 31);
const BOX_KM = 500;

/** App-computed (SGP4, TEME) minimum separation over the window at 1 s, and the separation at 06:40:31. */
const EXPECTED: Record<(typeof SECONDARY_IDS)[number], { minKm: number; atInstantKm: number }> = {
  '63215': { minKm: 345.263, atInstantKm: 350.225 },
  '63230': { minKm: 109.984, atInstantKm: 245.851 },
  '57084': { minKm: 120.382, atInstantKm: 129.259 },
};

const satOf = (id: string, catalogId: number): Satellite => new Satellite({ id: catalogId, tle1: TLES[id][0] as TleLine1, tle2: TLES[id][1] as TleLine2 });
const separationKm = (a: Tle, b: Tle, ms: number): number => {
  const epoch = EpochUTC.fromDateTime(new Date(ms));
  const pa = a.propagate(epoch).position;
  const pb = b.propagate(epoch).position;

  return Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
};
const inBox = (e: { radialDistance: number; intrackDistance: number; crosstrackDistance: number }, box: number): boolean =>
  Math.abs(e.radialDistance) <= box && Math.abs(e.intrackDistance) <= box && Math.abs(e.crosstrackDistance) <= box;

describe('scenario 3 proximity miss (63218, 500 km box)', () => {
  const primaryTle = new Tle(TLES['63218'][0], TLES['63218'][1]);

  it('reproduces the separations with the app propagator', () => {
    for (const id of SECONDARY_IDS) {
      const tle = new Tle(TLES[id][0], TLES[id][1]);
      let minKm = Infinity;

      for (let t = START_MS; t <= END_MS; t += 1000) {
        minKm = Math.min(minKm, separationKm(primaryTle, tle, t));
      }

      expect(minKm).toBeCloseTo(EXPECTED[id].minKm, 0);
      expect(separationKm(primaryTle, tle, INSTANT_MS)).toBeCloseTo(EXPECTED[id].atInstantKm, 2);
    }
  });

  it('the old unpadded shell test dropped the two objects; the box-padded one keeps them', () => {
    const primary = satOf('63218', 0);
    const unpadded = (s: Satellite) => !(s.perigee > primary.apogee || primary.perigee > s.apogee);
    const pad = DebrisScreening.shellPadKm(BOX_KM, BOX_KM, BOX_KM);

    expect(SECONDARY_IDS.map((id, i) => unpadded(satOf(id, i + 1)))).toEqual([true, false, false]);
    expect(SECONDARY_IDS.every((id, i) => DebrisScreening.shellsCanMeet(primary, satOf(id, i + 1), pad))).toBe(true);
    // A small box still rejects bands that cannot meet it.
    expect(DebrisScreening.shellsCanMeet(primary, satOf('57084', 3), DebrisScreening.shellPadKm(1, 1, 1))).toBe(false);
  });

  it('the sync screening path (as onFormSubmit runs it) lists all three at their minimum separation', () => {
    const primary = satOf('63218', 0);
    const shellPad = DebrisScreening.shellPadKm(BOX_KM, BOX_KM, BOX_KM);
    const secondaries = SECONDARY_IDS.map((id, i) => satOf(id, i + 1))
      .filter((s) => DebrisScreening.shellsCanMeet(primary, s, shellPad))
      .map((s) => ({ tle: s.toTle(), name: s.sccNum }));
    const results = CatalogScreener.screenOneToMany({ tle: primary.toTle(), name: primary.sccNum }, secondaries, {
      startTime: EpochUTC.fromDateTime(new Date(START_MS)),
      endTime: EpochUTC.fromDateTime(new Date(END_MS)),
      searchStepSize: 240 as Seconds,
      tcaSearchMode: 'coarse-to-fine',
      shellPad,
    }).filter((r) => inBox(r.event, BOX_KM));
    const byId = new Map(results.map((r) => [r.secondaryId, r.event.missDistance]));

    for (const id of SECONDARY_IDS) {
      expect(byId.get(id)).toBeCloseTo(EXPECTED[id].minKm, 1);
    }
  });

  /*
   * The worker (src/webworker/debrisScreeningWorker.ts, used by the Pro single and set screens) runs
   * ScreeningFilter.filterCandidates with ootk's default 10 km pad, so it still drops STARLINK-6240
   * (27 km above the primary's band). Flip this to `it` once the worker passes the box-padded shell pad.
   */
  it('the screening worker lists all three', async () => {
    const posted: any[] = [];

    globalThis.postMessage = vi.fn((payload: unknown) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
    await import('@app/webworker/debrisScreeningWorker');
    posted.length = 0;

    (globalThis.onmessage as (m: { data: unknown }) => void)({
      data: {
        typ: 0, // START_SCREENING
        runId: 1,
        primary: { tle1: TLES['63218'][0], tle2: TLES['63218'][1], name: '63218', radius: 0.01 },
        secondaries: SECONDARY_IDS.map((id) => ({ tle1: TLES[id][0], tle2: TLES[id][1], name: id, radius: 0.005 })),
        startTimeMs: START_MS,
        endTimeMs: END_MS,
        searchStepSize: 60,
        uVal: BOX_KM,
        vVal: BOX_KM,
        wVal: BOX_KM,
        batchSize: 10,
        covarianceConfidenceLevel: 1,
      },
    });
    const rows = posted.filter((m) => m?.typ === 1).flatMap((m) => m.results);

    expect(rows.map((r: any) => r.secondaryId).sort()).toEqual([...SECONDARY_IDS].sort());
  });
});
