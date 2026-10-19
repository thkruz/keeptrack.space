/* eslint-disable @typescript-eslint/no-explicit-any */
import { DebrisScreening } from '@app/plugins/debris-screening/debris-screening';
import { CatalogObject, CatalogScreener, cappedScreeningCovarianceFromTle, EpochUTC, Kilometers, Satellite, Seconds, StateCovariance, TleLine1, TleLine2 } from '@ootk/src/main';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/*
 * Debris-screening probability-of-collision golden (ootk v8 plan, section 3
 * row 1 and section 4 step 1).
 *
 * This snapshot now captures ootk v8. It was first captured on v7 as the
 * before-picture, when screening Pc was built from a covariance whose diagonal
 * held sigmas in km instead of variances in km², with the in-track and
 * cross-track slots swapped, labelled ECI so ConjunctionAssessment applied a
 * spurious ECI-to-RIC rotation, then fed to Foster's formula. v8 fixed all of
 * those (cappedScreeningCovarianceFromTle returns RIC variances in R, I, C
 * order; the secondary covariance is rotated into the primary RIC frame before
 * summing; chanPc2D is corrected; TLEs age against the state epoch) and
 * reworked findTCA, which moved intrack/crosstrack at TCA by under 0.2 m.
 * v7 to v8 Pc: 90001 4.16e-4 to 1.34e-4, 90002 2.22e-5 to 1.59e-5, 90003
 * 2.81e-6 to 3.29e-8. Plan section 4 step 5 keeps the 1e-4 risk bands; no
 * screening threshold here was compensating for the inflated covariances.
 * Any further change to this snapshot needs a named cause.
 *
 * Paths captured here (OSS):
 *  - debrisScreeningWorker.ts: the real worker message handler, driven with a
 *    START_SCREENING message and a captured postMessage.
 *  - debris-screening.ts: the sync screening path. onFormSubmit is DOM and
 *    ServiceLocator bound, so this mirrors its ootk calls exactly (the plugin's
 *    own calculateCovarianceFromSatellite and toRow_, CatalogScreener with the
 *    same radii and 240 s step) without driving the form.
 * The toca-poca path lives in src/plugins-pro/toca-poca-plugin/__tests__/pc-golden.test.ts.
 *
 * The wall clock stays frozen so the snapshot can never depend on it (v7
 * CovarianceSample aged the TLE against `new Date()`; v8 uses the state epoch).
 */

// ISS TLE from the worker test; epoch 2008-09-20 12:25:40 UTC
const BASE_TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const BASE_TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';
const EPOCH_MS = Date.UTC(2008, 8, 20, 12, 25, 40, 104);
const FROZEN_NOW_MS = EPOCH_MS + 86_400_000;
const WINDOW_START_MS = EPOCH_MS;
const WINDOW_END_MS = EPOCH_MS + 45 * 60 * 1000;
const CONFIDENCE = 1;
const RIC_BOX_KM = 50;

/*
 * Secondaries: the primary orbit with a different inclination (planes cross at
 * the nodes) and a small mean-anomaly offset (sets the miss distance). Same
 * mean motion and phase, so both reach the descending node together roughly
 * 22 minutes after epoch.
 */
const PAIRS = [
  { satnum: '90001', dInc: 2, dMa: 0.001 },
  { satnum: '90002', dInc: -4, dMa: 0.01 },
  { satnum: '90003', dInc: 8, dMa: -0.012 },
] as const;

const tleChecksum = (line: string): number => {
  let sum = 0;

  for (const ch of line.slice(0, 68)) {
    if (ch >= '0' && ch <= '9') {
      sum += Number(ch);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return sum % 10;
};

const withChecksum = (line: string): string => `${line.slice(0, 68)}${tleChecksum(line)}`;

const setField = (line: string, start: number, width: number, value: string): string => `${line.slice(0, start)}${value.padStart(width)}${line.slice(start + width)}`;

const buildSecondaryTle = (satnum: string, dInc: number, dMa: number): { tle1: string; tle2: string } => {
  let l1 = setField(BASE_TLE1, 2, 5, satnum);
  let l2 = setField(BASE_TLE2, 2, 5, satnum);
  const inc = Number(BASE_TLE2.slice(8, 16)) + dInc;
  const ma = (Number(BASE_TLE2.slice(43, 51)) + dMa + 360) % 360;

  l2 = setField(l2, 8, 8, inc.toFixed(4));
  l2 = setField(l2, 43, 8, ma.toFixed(4));
  l1 = withChecksum(l1);
  l2 = withChecksum(l2);

  return { tle1: l1, tle2: l2 };
};

const sig6 = (v: number | null | undefined): string | null => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toPrecision(6)).toString() : String(v ?? null));

const covDiag = (cov: StateCovariance): { frame: string; diag: (string | null)[] } => ({
  frame: String(cov.frame),
  diag: cov.matrix.elements.map((row, i) => sig6(row[i])),
});

const rowSummary = (row: any) => ({
  secondaryId: row.secondaryId,
  tcaIso: new Date(row.tcaMs).toISOString(),
  missDistanceKm: sig6(row.missDistance),
  radialKm: sig6(row.radialDistance),
  intrackKm: sig6(row.intrackDistance),
  crosstrackKm: sig6(row.crosstrackDistance),
  relativeVelocityKmS: sig6(row.relativeVelocity),
  pc: sig6(row.probabilityOfCollision),
  riskScore: sig6(row.riskScore),
});

const secondaries = PAIRS.map((p) => ({ ...p, ...buildSecondaryTle(p.satnum, p.dInc, p.dMa) }));

describe('debris-screening Pc golden (ootk v8)', () => {
  let savedConfidence: number;

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FROZEN_NOW_MS);
    savedConfidence = settingsManager.covarianceConfidenceLevel;
    settingsManager.covarianceConfidenceLevel = CONFIDENCE;
  });

  afterAll(() => {
    settingsManager.covarianceConfidenceLevel = savedConfidence;
    vi.useRealTimers();
  });

  it('captures Pc, miss distance, TCA and covariance through the worker and the sync plugin path', async () => {
    // ---- Covariances (the shared ootk helper every path calls) ----
    const covariances: Record<string, unknown> = {
      PRIMARY: covDiag(cappedScreeningCovarianceFromTle(BASE_TLE1, BASE_TLE2, CONFIDENCE)),
    };

    for (const s of secondaries) {
      covariances[s.satnum] = covDiag(cappedScreeningCovarianceFromTle(s.tle1, s.tle2, CONFIDENCE));
    }

    // ---- Path 1: debrisScreeningWorker message handler ----
    const posted: any[] = [];

    globalThis.postMessage = vi.fn((payload: unknown) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
    await import('@app/webworker/debrisScreeningWorker');
    posted.length = 0;

    (globalThis.onmessage as (m: { data: unknown }) => void)({
      data: {
        typ: 0, // DsWorkerMsgType.START_SCREENING
        runId: 1,
        primary: { tle1: BASE_TLE1, tle2: BASE_TLE2, name: 'PRIMARY', radius: 0.01 },
        secondaries: secondaries.map((s) => ({ tle1: s.tle1, tle2: s.tle2, name: s.satnum, radius: 0.005 })),
        startTimeMs: WINDOW_START_MS,
        endTimeMs: WINDOW_END_MS,
        searchStepSize: 60,
        uVal: RIC_BOX_KM,
        vVal: RIC_BOX_KM,
        wVal: RIC_BOX_KM,
        batchSize: 10,
        covarianceConfidenceLevel: CONFIDENCE,
      },
    });

    const workerErrors = posted.filter((m) => m?.typ === 3);

    expect(workerErrors).toEqual([]);
    const workerRows = posted
      .filter((m) => m?.typ === 1)
      .flatMap((m) => m.results)
      .sort((a, b) => String(a.secondaryId).localeCompare(String(b.secondaryId)));

    // ---- Path 2: debris-screening.ts sync path (mirrors onFormSubmit) ----
    const calcCov = (sat: Satellite) => (DebrisScreening.prototype as any).calculateCovarianceFromSatellite.call({}, sat) as StateCovariance;
    const primarySat = new Satellite({ id: 0, tle1: BASE_TLE1 as TleLine1, tle2: BASE_TLE2 as TleLine2 });
    const primary: CatalogObject = {
      tle: primarySat.toTle(),
      name: primarySat.sccNum,
      radius: 0.01 as Kilometers,
      covariance: calcCov(primarySat),
    };
    const syncSecondaries: CatalogObject[] = secondaries.map((s, i) => {
      const sat = new Satellite({ id: i + 1, tle1: s.tle1 as TleLine1, tle2: s.tle2 as TleLine2 });

      return { tle: sat.toTle(), name: sat.sccNum, radius: 0.005 as Kilometers, covariance: calcCov(sat) };
    });
    const syncResults = CatalogScreener.screenOneToMany(primary, syncSecondaries, {
      startTime: EpochUTC.fromDateTime(new Date(WINDOW_START_MS)),
      endTime: EpochUTC.fromDateTime(new Date(WINDOW_END_MS)),
      searchStepSize: 240 as Seconds,
    });
    const syncRows = syncResults.map((r) => (DebrisScreening as any).toRow_(r)).sort((a: any, b: any) => String(a.secondaryId).localeCompare(String(b.secondaryId)));

    // Sanity: every pair is a real close approach with a finite Pc in both paths
    for (const rows of [workerRows, syncRows]) {
      expect(rows.map((r: any) => String(r.secondaryId))).toEqual(PAIRS.map((p) => p.satnum));
      for (const r of rows) {
        expect(r.missDistance).toBeLessThan(5);
        expect(Number.isFinite(r.probabilityOfCollision)).toBe(true);
      }
    }

    const golden = {
      frozenNow: new Date(FROZEN_NOW_MS).toISOString(),
      window: [new Date(WINDOW_START_MS).toISOString(), new Date(WINDOW_END_MS).toISOString()],
      confidenceLevel: CONFIDENCE,
      tles: {
        PRIMARY: [BASE_TLE1, BASE_TLE2],
        ...Object.fromEntries(secondaries.map((s) => [s.satnum, [s.tle1, s.tle2]])),
      },
      covariances,
      debrisScreeningWorker: workerRows.map(rowSummary),
      debrisScreeningSync: syncRows.map(rowSummary),
    };

    await expect(`${JSON.stringify(golden, null, 2)}\n`).toMatchFileSnapshot('./__snapshots__/pc-golden.json');
  });
});
