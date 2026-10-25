import { RIC_CONVENTION, validateConjunctionAnalysisState } from '@app/engine/conjunction/analysis-state';
import {
  AnalysisEnv,
  analystParentSccNum,
  buildConjunctionState,
  buildManeuverState,
  generateConjunctionReport,
  generateManeuverReport,
} from '@app/plugins/reports/conjunction-report-core';
import { buildDownloadPayload } from '@app/plugins/reports/report-formatter';
import { diffScreeningRuns } from '@app/plugins/reports/screening-diff';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';

/** Recomputes the TLE checksum digit (column 69) after editing a line. */
const withChecksum = (line: string): string => {
  const body = line.slice(0, 68);
  let sum = 0;

  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      sum += parseInt(ch, 10);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return `${body}${sum % 10}`;
};

const L8_TLE1 = '1 39084U 13008A   22221.78099992  .00000176  00000-0  49109-4 0  9999';
const L8_TLE2 = '2 39084  98.2198 291.4222 0001287  95.0667 265.0678 14.57105218504766';

const landsat8 = new Satellite({ name: 'LANDSAT 8', tle1: L8_TLE1 as TleLine1, tle2: L8_TLE2 as TleLine2 });

/*
 * Constructed secondary: LANDSAT 8's orbit tilted by 0.1 deg (same node, same
 * phase). The two objects meet near the nodes every half orbit at roughly
 * v * delta-i = 13 m/s, so a close approach inside the window is guaranteed.
 */
const secondary = new Satellite({
  name: 'TEST DEB',
  tle1: withChecksum(L8_TLE1.replace('39084U 13008A  ', '99901U 13008ZZ ')) as TleLine1,
  tle2: withChecksum(L8_TLE2.replace('2 39084  98.2198', '2 99901  98.3198')) as TleLine2,
});

const env: AnalysisEnv = {
  analysisEpoch: new Date('2022-08-10T00:00:00Z'),
  wallClock: new Date('2026-10-16T00:00:00Z'),
  appVersion: '13.0.0-test',
  covarianceConfidenceLevel: 1,
  primaryHardBodyRadiusKm: 0.01,
  secondaryHardBodyRadiusKm: 0.005,
};

describe('Conjunction Report (LANDSAT 8 vs constructed secondary)', () => {
  const state = buildConjunctionState({ primary: landsat8, secondary, env });
  const enc = state.encounter!;

  it('finds a refined TCA inside the plus/minus 12 h window', () => {
    expect(enc).not.toBeNull();
    expect(Math.abs(enc.tcaMs - env.analysisEpoch.getTime())).toBeLessThanOrEqual(12 * 3600 * 1000);
    expect(enc.searchWindow.halfWidthHours).toBe(12);
    expect(enc.missDistanceKm).toBeLessThan(25);
  });

  it('reports a signed RIC whose magnitude is the miss distance', () => {
    const { radial, intrack, crosstrack } = enc.ricKm;

    expect(Math.hypot(radial, intrack, crosstrack)).toBeCloseTo(enc.missDistanceKm, 3);
    expect(enc.ricConvention).toBe(RIC_CONVENTION);
    expect(state.ricConvention).toContain('Secondary minus primary');
  });

  it('reports a relative speed consistent with a 0.1 deg plane difference', () => {
    expect(enc.relativeSpeedKmS).toBeGreaterThan(0.001);
    expect(enc.relativeSpeedKmS).toBeLessThan(0.1);
  });

  it('states the Pc inputs from the hard-body radii and the confidence level', () => {
    expect(enc.pcInputs.primaryHardBodyRadiusKm).toBe(0.01);
    expect(enc.pcInputs.secondaryHardBodyRadiusKm).toBe(0.005);
    expect(enc.pcInputs.combinedHardBodyRadiusKm).toBeCloseTo(0.015, 9);
    expect(enc.pcInputs.covarianceConfidenceLevel).toBe(1);
    expect(enc.pcInputs.covarianceSource).toContain('TLE');
    expect(typeof enc.pc).toBe('number');
  });

  it('summarizes both objects with TLE epoch, GP age and RIC sigmas', () => {
    const [p, s] = state.objects;

    expect(p.name).toBe('LANDSAT 8');
    expect(p.noradId).toBe('39084');
    expect(p.tleEpochIso).toBe('2022-08-09T18:44:38.393Z');
    expect(p.gpAgeHours!).toBeCloseTo(5.256, 2);
    expect(p.ricSigmasKm!.radial).toBeGreaterThan(0);
    expect(p.meanElements!.inclinationDeg).toBeCloseTo(98.2198, 4);
    expect(s.role).toBe('secondary');
    expect(s.meanElements!.inclinationDeg).toBeCloseTo(98.3198, 4);
  });

  it('samples relative geometry plus/minus 5 min at 10 s, closest at offset 0', () => {
    expect(state.relativeGeometry).toHaveLength(61);
    expect(state.relativeGeometry[0].offsetSec).toBe(-300);
    expect(state.relativeGeometry[60].offsetSec).toBe(300);
    const atTca = state.relativeGeometry.find((s) => s.offsetSec === 0)!;

    expect(atTca.rangeKm).toBeCloseTo(enc.missDistanceKm, 2);
    expect(Math.min(...state.relativeGeometry.map((s) => s.rangeKm))).toBeCloseTo(atTca.rangeKm, 2);
  });

  it('honours a wider search window', () => {
    const wide = buildConjunctionState({ primary: landsat8, secondary, env, halfWidthSec: 36 * 3600 });

    expect(wide.encounter!.searchWindow.halfWidthHours).toBe(36);
    expect(wide.encounter!.missDistanceKm).toBeLessThanOrEqual(enc.missDistanceKm + 1e-6);
  });

  it('serializes to a valid ConjunctionAnalysisState with schemaVersion and app version', () => {
    const data = generateConjunctionReport({ primary: landsat8, secondary, env });
    const json = JSON.parse(buildDownloadPayload(data, 'json').content);

    expect(validateConjunctionAnalysisState(json)).toEqual([]);
    expect(json.schemaVersion).toBe(2);
    expect(json.appVersion).toBe('13.0.0-test');
    expect(json.kind).toBe('conjunction');
  });

  it('emits the time series as CSV and the summary sections as text', () => {
    const data = generateConjunctionReport({ primary: landsat8, secondary, env });
    const csv = buildDownloadPayload(data, 'csv').content.split('\n');
    const text = buildDownloadPayload(data, 'text').content;

    expect(csv[0]).toBe('Time (UTC),Offset (s),Range (km),Radial (km),In-Track (km),Cross-Track (km),Rel Speed (km/s)');
    expect(csv).toHaveLength(62);
    expect(text).toContain('Conjunction Report');
    expect(text).toContain('Closest Approach');
    expect(text).toContain('Probability of Collision Inputs');
    expect(text).toContain('Combined Hard-Body Radius');
    expect(text).toContain('15.0 m');
    expect(data.filename).toBe('conjunction-39084-99901');
  });
});

describe('Maneuver Report', () => {
  // Analyst object: LANDSAT 8 with a slightly raised mean motion, derived from 39084.
  const analyst = new Satellite({
    name: 'Analyst Sat 59328',
    tle1: withChecksum(L8_TLE1.replace('39084U', '90000U')) as TleLine1,
    tle2: withChecksum(L8_TLE2.replace('2 39084', '2 90000').replace('14.57105218', '14.57005218')) as TleLine2,
  });

  analyst.derivedFromSccNum = '39084';

  const diff = diffScreeningRuns(
    { primaryId: '39084', startTimeMs: 0, endTimeMs: 1, rows: [{ secondaryId: '27493', tcaMs: 1_000, missDistance: 3.28, probabilityOfCollision: 3.15e-6 }] },
    { primaryId: '90000', startTimeMs: 0, endTimeMs: 1, rows: [{ secondaryId: '22707', tcaMs: 2_000, missDistance: 1.98, probabilityOfCollision: 9.8e-8 }] }
  );

  it('reads the analyst lineage duck-typed', () => {
    expect(analystParentSccNum(analyst)).toBe('39084');
    expect(analystParentSccNum(landsat8)).toBeNull();
    expect(analystParentSccNum({ sccNum: '1', parentSccNum: '2' })).toBe('2');
  });

  it('records burns, pre/post mean elements and their change', () => {
    const state = buildManeuverState({
      parent: landsat8,
      analyst,
      env,
      burns: [{ epochIso: '2022-08-09T20:00:00.000Z', frame: 'ric', inputDeltaVMs: [0, 0.05, 0], magnitudeMs: 0.05, source: 'manual', label: null }],
      screeningDiff: diff,
    });
    const option = state.maneuverOptions[0];

    expect(state.kind).toBe('maneuver');
    expect(state.objects.map((o) => o.role)).toEqual(['parent', 'analyst']);
    expect(state.objects[1].isAnalystObject).toBe(true);
    expect(state.objects[1].derivedFromNoradId).toBe('39084');
    expect(option.burnParametersAvailable).toBe(true);
    expect(option.totalDeltaVMs).toBeCloseTo(0.05, 9);
    expect(option.meanElementDeltas!.meanMotionRevPerDay!).toBeCloseTo(-0.001, 6);
    expect(option.screeningDiff!.counts.introduced).toBe(1);
    expect(option.screeningDiff!.counts.removed).toBe(1);
    expect(validateConjunctionAnalysisState(JSON.parse(JSON.stringify(state)))).toEqual([]);
  });

  it('prints a 5 cm/s burn as 0.0500 m/s, the same string the Pro burn history shows', () => {
    const burns = [
      { epochIso: '2022-08-09T20:00:00.000Z', frame: 'ric' as const, inputDeltaVMs: [0, 0.05, 0] as [number, number, number], magnitudeMs: 0.05, source: 'manual', label: null },
    ];
    const text = buildDownloadPayload(generateManeuverReport({ parent: landsat8, analyst, env, burns, screeningDiff: null }), 'text').content;

    expect(text).toContain('Burns (total 0.0500 m/s)');
    expect(text).toContain('+0.0000, +0.0500, +0.0000   0.0500');
  });

  it('JSON carries the same screening diff as the text report, at the top level too (scenario 1 iteration 3)', () => {
    const data = generateManeuverReport({ parent: landsat8, analyst, env, burns: null, screeningDiff: diff });
    const text = buildDownloadPayload(data, 'text').content;
    const json = JSON.parse(buildDownloadPayload(data, 'json').content);

    expect(text).toContain('Screening Diff Summary');
    expect(json.screeningDiff).not.toBeNull();
    expect(json.screeningDiff).toEqual(json.maneuverOptions[0].screeningDiff);
    expect(json.screeningDiff.counts).toEqual(diff.counts);
    expect(validateConjunctionAnalysisState(json)).toEqual([]);
  });

  it('says burn parameters are unavailable when no burn history is found', () => {
    const data = generateManeuverReport({ parent: landsat8, analyst, env, burns: null, screeningDiff: diff });
    const text = buildDownloadPayload(data, 'text').content;

    expect(text).toContain('Burn parameters unavailable');
    expect(JSON.parse(buildDownloadPayload(data, 'json').content).maneuverOptions[0].burns).toBeNull();
  });

  it('shows the reason in place of the diff when no screening runs are available', () => {
    const data = generateManeuverReport({ parent: landsat8, analyst, env, burns: null, screeningDiff: null, screeningDiffUnavailableReason: 'Run Debris Screening first.' });
    const text = buildDownloadPayload(data, 'text').content;
    const json = JSON.parse(buildDownloadPayload(data, 'json').content);

    expect(text).toContain('Run Debris Screening first.');
    expect(json.maneuverOptions[0].screeningDiffUnavailableReason).toBe('Run Debris Screening first.');
    expect(validateConjunctionAnalysisState(json)).toEqual([]);
  });

  it('compares the close approach to a selected secondary before and after', () => {
    const state = buildManeuverState({ parent: landsat8, analyst, env, burns: null, screeningDiff: null, secondary });
    const option = state.maneuverOptions[0];

    expect(option.preEncounter).not.toBeNull();
    expect(option.postEncounter).not.toBeNull();
    expect(state.objects.map((o) => o.role)).toEqual(['parent', 'analyst', 'secondary']);
    expect(generateManeuverReport({ parent: landsat8, analyst, env, burns: null, screeningDiff: null, secondary }).sections!.map((s) => s.title)).toContain(
      'Close Approach to TEST DEB (99901), Pre vs Post'
    );
  });
});

describe('Maneuver Report: clone uncertainty assumed from the parent (Ted ruling 2026-10-24)', () => {
  // A clone fitted at a burn 4 h after the analysis epoch: own TLE epoch in the future, BSTAR 0.
  const clone = new Satellite({
    name: 'LANDSAT 8 (burn 1)',
    tle1: withChecksum('1 90000U 13008A   22222.16666667  .00000000  00000-0  00000-0 0  9999') as TleLine1,
    tle2: withChecksum(L8_TLE2.replace('2 39084', '2 90000')) as TleLine2,
  });

  clone.derivedFromSccNum = '39084';

  const state = buildManeuverState({ parent: landsat8, analyst: clone, env, burns: null, screeningDiff: null, secondary });
  const [parentSummary, cloneSummary] = state.objects;

  it('gives the clone the parent 1-sigma RIC and GP age, flagged as assumed', () => {
    expect(cloneSummary.ricSigmasKm).toEqual(parentSummary.ricSigmasKm);
    expect(cloneSummary.gpAgeHours).toBeCloseTo(parentSummary.gpAgeHours!, 9);
    expect(cloneSummary.gpAgeHours!).toBeGreaterThan(0);
    expect(cloneSummary.uncertaintyAssumedFromNoradId).toBe('39084');
    expect(parentSummary.uncertaintyAssumedFromNoradId).toBeUndefined();
    // The clone keeps its own TLE epoch (the burn time).
    expect(cloneSummary.tleEpochIso).toBe('2022-08-10T04:00:00.000Z');
  });

  it('labels the inherited cells "(assumed from parent)" and adds a note', () => {
    const text = buildDownloadPayload(generateManeuverReport({ parent: landsat8, analyst: clone, env, burns: null, screeningDiff: null }), 'text').content;
    const lines = text.split('\n');
    const sigmaLine = lines.find((line) => line.startsWith('1-sigma'))!;
    const ageLine = lines.find((line) => line.startsWith('GP Age'))!;

    expect(sigmaLine.match(/\(assumed from parent\)/gu)).toHaveLength(1);
    expect(ageLine.match(/\(assumed from parent\)/gu)).toHaveLength(1);
    expect(text).toContain('assumed from its parent (39084)');
  });

  it('computes the post-burn Pc with the parent covariance and still validates', () => {
    expect(state.maneuverOptions[0].postEncounter).not.toBeNull();
    expect(validateConjunctionAnalysisState(JSON.parse(JSON.stringify(state)))).toEqual([]);
  });
});

describe('validateConjunctionAnalysisState', () => {
  it('reports every violation with its path', () => {
    const errors = validateConjunctionAnalysisState({ schemaVersion: 3, kind: 'nope', objects: 'x' });

    expect(errors).toContain('$.schemaVersion: expected one of 1, 2');
    expect(errors.some((e) => e.startsWith('$.kind'))).toBe(true);
    expect(errors).toContain('$.objects: expected array');
    expect(validateConjunctionAnalysisState(null)).toEqual(['$: expected object']);
  });
});

describe('Conjunction and Maneuver Reports: clone uncertainty from the root catalog object', () => {
  // A clone fitted at a burn 4 h after the analysis epoch (own TLE epoch in the future, BSTAR 0).
  const clone = new Satellite({
    name: 'LANDSAT 8 (burn 1)',
    tle1: withChecksum('1 90000U 13008A   22222.16666667  .00000000  00000-0  00000-0 0  9999') as TleLine1,
    tle2: withChecksum(L8_TLE2.replace('2 39084', '2 90000')) as TleLine2,
  });
  // A second burn on the clone: a clone of a clone.
  const cloneOfClone = new Satellite({
    name: 'LANDSAT 8 (burn 2)',
    tle1: withChecksum('1 90001U 13008A   22222.20833333  .00000000  00000-0  00000-0 0  9999') as TleLine1,
    tle2: withChecksum(L8_TLE2.replace('2 39084', '2 90001')) as TleLine2,
  });

  clone.derivedFromSccNum = '39084';
  cloneOfClone.derivedFromSccNum = '90000';

  it('a clone primary of a Conjunction Report takes the parent covariance, sigmas and GP age', () => {
    const own = buildConjunctionState({ primary: clone, secondary, env });
    const assumed = buildConjunctionState({ primary: clone, secondary, env, uncertaintyParents: { primary: landsat8 } });
    const parentState = buildConjunctionState({ primary: landsat8, secondary, env });
    const [primarySummary] = assumed.objects;

    expect(primarySummary.ricSigmasKm).toEqual(parentState.objects[0].ricSigmasKm);
    expect(primarySummary.gpAgeHours).toBeCloseTo(parentState.objects[0].gpAgeHours!, 9);
    expect(primarySummary.uncertaintyAssumedFromNoradId).toBe('39084');
    expect(own.objects[0].uncertaintyAssumedFromNoradId).toBeUndefined();
    // The clone's own TLE would claim a smaller uncertainty; the geometry is the clone's either way.
    expect(own.objects[0].ricSigmasKm).not.toEqual(primarySummary.ricSigmasKm);
    expect(assumed.encounter!.tcaMs).toBe(own.encounter!.tcaMs);
    expect(validateConjunctionAnalysisState(JSON.parse(JSON.stringify(assumed)))).toEqual([]);
  });

  it('a Maneuver Report on a clone of a clone gives both the parent clone and the analyst the root uncertainty', () => {
    const state = buildManeuverState({ parent: clone, analyst: cloneOfClone, env, burns: null, screeningDiff: null, uncertaintyRoot: landsat8 });
    const rootSummary = buildConjunctionState({ primary: landsat8, secondary, env }).objects[0];
    const [parentSummary, analystSummary] = state.objects;

    expect(parentSummary.uncertaintyAssumedFromNoradId).toBe('39084');
    expect(analystSummary.uncertaintyAssumedFromNoradId).toBe('39084');
    expect(analystSummary.ricSigmasKm).toEqual(rootSummary.ricSigmasKm);
    expect(parentSummary.ricSigmasKm).toEqual(rootSummary.ricSigmasKm);
  });
});
