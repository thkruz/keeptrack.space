import { validateConjunctionAnalysisState } from '@app/engine/conjunction/analysis-state';
import { generateScreeningCompareReport } from '@app/plugins/reports/conjunction-report-core';
import { buildDownloadPayload } from '@app/plugins/reports/report-formatter';
import { diffScreeningRuns, parseScreeningCsv, riskLevelFromPc, ScreeningRunInput } from '@app/plugins/reports/screening-diff';
import { readFileSync } from 'fs';

/*
 * Fixtures: the three 72 h Debris Screening exports from UX validation scenario 1
 * (docs/ux-validation-results). Baseline is LANDSAT 8 (39084); A is analyst 90000
 * (+5 cm/s in-track 1 rev before TCA); B is analyst 90001 (+10 cm/s 10 revs before).
 * Hand-derived truth: A introduces a 1.98 km event with 22707; B removes the 27493
 * and 59070 "High" events; 33928 is unchanged in both.
 */
const FIXTURE_DIR = 'src/plugins/reports/__tests__/fixtures';
const load = (name: string): string => readFileSync(`${FIXTURE_DIR}/scenario-1-rescreen-${name}-72h.csv`, 'utf8');

const windowStart = Date.parse('2026-10-17T02:08:07Z');
const windowEnd = windowStart + 72 * 3600 * 1000;
const run = (primaryId: string, csvName: string): ScreeningRunInput => ({
  primaryId,
  startTimeMs: windowStart,
  endTimeMs: windowEnd,
  rows: parseScreeningCsv(load(csvName)),
});

const baseline = run('39084', 'baseline');
const maneuverA = run('90000', 'maneuver-A');
const maneuverB = run('90001', 'maneuver-B');
/** The parent and both analyst clones fly together; their mutual rows are not real conjunctions. */
const EXCLUDE = ['39084', '90000', '90001'];

describe('parseScreeningCsv', () => {
  it('reads every row of the baseline export', () => {
    expect(baseline.rows).toHaveLength(37);
    expect(baseline.rows[1]).toEqual({
      secondaryId: '27493',
      tcaMs: Date.parse('2026-10-19T21:13:09Z'),
      missDistance: 3.279756,
      probabilityOfCollision: 3.15e-6,
    });
  });

  it('reads "<1e-12" as an upper bound that bands as low', () => {
    const row = baseline.rows.find((r) => r.secondaryId === '33928')!;

    expect(row.probabilityOfCollision).toBe(1e-12);
    expect(riskLevelFromPc(row.probabilityOfCollision)).toBe('low');
  });

  it('keeps a row with a blank secondary id', () => {
    expect(maneuverB.rows[0].secondaryId).toBe('');
  });

  it('rejects a CSV that is not a screening export', () => {
    expect(() => parseScreeningCsv('a,b\n1,2')).toThrow();
  });
});

describe('riskLevelFromPc', () => {
  it('uses the Debris Screening thresholds', () => {
    expect(riskLevelFromPc(4.88e-4)).toBe('critical');
    expect(riskLevelFromPc(3.15e-6)).toBe('high');
    expect(riskLevelFromPc(9.8e-8)).toBe('medium');
    expect(riskLevelFromPc(1e-9)).toBe('low');
    expect(riskLevelFromPc(null)).toBe('unknown');
  });
});

describe('diffScreeningRuns on the scenario 1 fixtures', () => {
  const diffA = diffScreeningRuns(baseline, maneuverA, { excludeSecondaryIds: EXCLUDE });
  const diffB = diffScreeningRuns(baseline, maneuverB, { excludeSecondaryIds: EXCLUDE });
  const ids = (diff: typeof diffA, status: string): string[] => diff.entries.filter((e) => e.status === status).map((e) => e.secondaryId);
  const entry = (diff: typeof diffA, id: string) => diff.entries.find((e) => e.secondaryId === id);

  it('maneuver A introduces the 1.98 km event with 22707', () => {
    expect(ids(diffA, 'introduced')).toEqual(['22707']);
    const e = entry(diffA, '22707')!;

    expect(e.pre!.missDistanceKm).toBeCloseTo(18.036, 3);
    expect(e.post!.missDistanceKm).toBeCloseTo(1.982, 3);
    expect(e.post!.riskLevel).toBe('medium');
    expect(e.riskChange).toBe('up');
    expect(e.missDeltaKm!).toBeCloseTo(1.982277 - 18.035911, 6);
  });

  it('maneuver A removes 27493 and keeps 59070 of concern (High to Medium)', () => {
    expect(ids(diffA, 'removed')).toEqual(['27493']);
    const e = entry(diffA, '59070')!;

    expect(e.status).toBe('unchanged');
    expect(e.riskChange).toBe('down');
  });

  it('maneuver B removes the 27493 and 59070 High events and introduces nothing', () => {
    expect(ids(diffB, 'removed').sort()).toEqual(['27493', '59070']);
    expect(ids(diffB, 'introduced')).toEqual([]);
    expect(diffB.counts.removed).toBe(2);
    expect(entry(diffB, '27493')!.post).toBeNull();
  });

  it('33928 is unchanged by both maneuvers', () => {
    for (const diff of [diffA, diffB]) {
      const e = entry(diff, '33928')!;

      expect(e.status).toBe('unchanged');
      expect(e.pre!.tcaIso).toBe('2026-10-17T03:08:07.000Z');
    }
    expect(entry(diffA, '33928')!.post!.missDistanceKm).toBeCloseTo(16.928, 3);
    expect(entry(diffB, '33928')!.post!.missDistanceKm).toBeCloseTo(15.254, 3);
  });

  it('drops the parent and analyst clones from both sides', () => {
    for (const diff of [diffA, diffB]) {
      for (const id of EXCLUDE) {
        expect(entry(diff, id)).toBeUndefined();
      }
      expect(diff.excludedSecondaryIds).toEqual(EXCLUDE);
    }
    expect(diffA.preRun.eventCount).toBe(36);
  });

  it('splits below-threshold presence changes into appeared and dropped', () => {
    expect(ids(diffA, 'appeared').sort()).toEqual(['270439', '31841', '34968', '42315']);
    // 30202 moved from 10-18 20:28 to 10-17 23:52 under B: a different event, not a match.
    expect(ids(diffB, 'dropped')).toContain('30202');
    expect(ids(diffB, 'appeared')).toContain('30202');
  });

  it('orders introduced first, then removed, then unchanged', () => {
    const order = diffA.entries.map((e) => e.status);

    expect(order.indexOf('introduced')).toBeLessThan(order.indexOf('removed'));
    expect(order.lastIndexOf('removed')).toBeLessThan(order.indexOf('unchanged'));
  });

  it('counts add up to the entries', () => {
    const total = Object.values(diffB.counts).reduce((a, b) => a + b, 0);

    expect(total).toBe(diffB.entries.length);
    expect(diffB.isWindowMismatch).toBe(false);
  });

  it('flags runs over different windows', () => {
    const shifted = { ...maneuverA, startTimeMs: windowStart + 3600_000, endTimeMs: windowEnd + 3600_000 };

    expect(diffScreeningRuns(baseline, shifted).isWindowMismatch).toBe(true);
  });

  it('a higher concern threshold turns the Medium 22707 event into a plain unchanged pair', () => {
    const diff = diffScreeningRuns(baseline, maneuverA, { excludeSecondaryIds: EXCLUDE, concernThreshold: 'high' });

    expect(entry(diff, '22707')!.status).toBe('unchanged');
    // 59070 goes High -> Medium, so under a High threshold it is removed.
    expect(ids(diff, 'removed').sort()).toEqual(['27493', '59070']);
  });
});

describe('generateScreeningCompareReport', () => {
  const diff = diffScreeningRuns(baseline, maneuverB, { excludeSecondaryIds: EXCLUDE, source: 'debris-screening-runs', nameOf: (id) => (id === '27493' ? 'TEST DEB' : '') });
  const data = generateScreeningCompareReport({
    diff,
    env: {
      analysisEpoch: new Date(windowStart),
      wallClock: new Date('2026-10-16T04:27:47Z'),
      appVersion: '13.0.0-test',
      covarianceConfidenceLevel: 1,
      primaryHardBodyRadiusKm: 0.01,
      secondaryHardBodyRadiusKm: 0.005,
    },
  });

  it('emits a JSON state that validates against the schema', () => {
    const json = JSON.parse(buildDownloadPayload(data, 'json').content);

    expect(validateConjunctionAnalysisState(json)).toEqual([]);
    expect(json.kind).toBe('screening-compare');
    expect(json.screeningDiff.counts.removed).toBe(2);
  });

  it('emits the diff as CSV and an aligned text table with the summary section', () => {
    const csv = buildDownloadPayload(data, 'csv').content;
    const text = buildDownloadPayload(data, 'text').content;

    expect(csv.split('\n')[0]).toBe('Status,Secondary,Name,Pre TCA (UTC),Pre Miss (km),Pre Pc,Post TCA (UTC),Post Miss (km),Post Pc,Miss Change (km)');
    expect(csv).toContain('Removed,27493,TEST DEB,2026-10-19 21:13:09,3.280,3.15e-6,-,-,-,-');
    expect(text).toContain('Screening Diff Summary');
    expect(text).toContain('Screening Comparison Report');
  });
});
