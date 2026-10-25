import { validateConjunctionAnalysisState } from '@app/engine/conjunction/analysis-state';
import { generateScreeningCompareReport } from '@app/plugins/reports/conjunction-report-core';
import { buildDownloadPayload } from '@app/plugins/reports/report-formatter';
import { diffScreeningRuns, isSameScreeningWindow, parseScreeningCsv, pickScreeningRunPair, riskLevelFromPc, ScreeningRunInput } from '@app/plugins/reports/screening-diff';
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

describe('pickScreeningRunPair (scenario 1 iteration 3: "diff unavailable" despite both runs)', () => {
  const box = { radial: 25, intrack: 25, crosstrack: 25 };
  const parent = { ...baseline, boxKm: box };
  const analyst = { ...maneuverB, boxKm: box };
  /** A parent re-run over a different window (48 h), stored between the two matching runs. */
  const parent48h = { ...baseline, boxKm: box, endTimeMs: windowStart + 48 * 3600 * 1000 };

  it('pairs runs stored parent-then-analyst (newest first: analyst, parent)', () => {
    const pair = pickScreeningRunPair([analyst, parent], '39084', '90001');

    expect(pair).toEqual({ pre: parent, post: analyst });
  });

  it('pairs runs stored analyst-then-parent (newest first: parent, analyst)', () => {
    const pair = pickScreeningRunPair([parent, analyst], '39084', '90001');

    expect(pair).toEqual({ pre: parent, post: analyst });
  });

  it('matches by window, not by the most recent run of each object', () => {
    // Newest first: a 48 h parent run after the matching 72 h pair.
    const pair = pickScreeningRunPair([parent48h, analyst, parent], '39084', '90001');

    expect(pair!.pre).toBe(parent);
    expect(pair!.post).toBe(analyst);
    expect(diffScreeningRuns(pair!.pre, pair!.post).isWindowMismatch).toBe(false);
  });

  it('treats a different box as a different window', () => {
    const otherBox = { ...analyst, boxKm: { radial: 10, intrack: 10, crosstrack: 10 } };

    expect(isSameScreeningWindow(parent, otherBox)).toBe(false);
    expect(isSameScreeningWindow(parent, analyst)).toBe(true);
  });

  it('falls back to the newest run of each object when no window matches', () => {
    const pair = pickScreeningRunPair([parent48h, analyst], '39084', '90001');

    expect(pair).toEqual({ pre: parent48h, post: analyst });
    expect(diffScreeningRuns(pair!.pre, pair!.post).isWindowMismatch).toBe(true);
  });

  it('returns null when either object has no run', () => {
    expect(pickScreeningRunPair([parent], '39084', '90001')).toBeNull();
    expect(pickScreeningRunPair([analyst], '39084', '90001')).toBeNull();
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

describe('diffScreeningRuns moved pairing (Ted ruling 2026-10-24)', () => {
  const T0 = Date.parse('2026-10-24T14:00:00Z');
  const MIN = 60_000;
  const row = (secondaryId: string, tcaMs: number, missDistance: number, probabilityOfCollision: number | null) => ({ secondaryId, tcaMs, missDistance, probabilityOfCollision });
  const runOf = (primaryId: string, rows: ReturnType<typeof row>[]): ScreeningRunInput => ({ primaryId, startTimeMs: T0 - 3600_000, endTimeMs: T0 + 23 * 3600_000, rows });

  it('pairs a Medium encounter that moved one pass later into ONE moved row with old and new TCA and miss', () => {
    // The maneuver-comparison session: 68698 Medium before, Low 47 min later after the burn.
    const diff = diffScreeningRuns(runOf('68762', [row('68698', T0, 1.2, 5e-8)]), runOf('90000', [row('68698', T0 + 47 * MIN, 6.4, 1e-10)]));

    expect(diff.entries).toHaveLength(1);
    const e = diff.entries[0];

    expect(e.status).toBe('moved');
    expect(e.pre!.tcaMs).toBe(T0);
    expect(e.post!.tcaMs).toBe(T0 + 47 * MIN);
    expect(e.pre!.riskLevel).toBe('medium');
    expect(e.post!.riskLevel).toBe('low');
    expect(e.riskChange).toBe('down');
    expect(e.missDeltaKm!).toBeCloseTo(5.2, 9);
    expect(diff.counts).toEqual({ introduced: 0, removed: 0, unchanged: 0, moved: 1, appeared: 0, dropped: 0 });
    expect(diff.movedToleranceMs).toBe(6 * 3600_000);
  });

  it('keeps a TCA shift inside the 15 min match tolerance as the same event (unchanged / removed / introduced)', () => {
    const diff = diffScreeningRuns(runOf('1', [row('5', T0, 1.2, 5e-8)]), runOf('2', [row('5', T0 + 10 * MIN, 1.0, 6e-8)]));

    expect(diff.entries.map((e) => e.status)).toEqual(['unchanged']);
  });

  it('never pairs different secondaries', () => {
    const diff = diffScreeningRuns(runOf('1', [row('5', T0, 1.2, 5e-8)]), runOf('2', [row('6', T0 + 30 * MIN, 1.0, 5e-8)]));

    expect(diff.entries.map((e) => e.status).sort()).toEqual(['introduced', 'removed']);
  });

  it('leaves rows more than the moved tolerance apart as separate events', () => {
    const diff = diffScreeningRuns(runOf('1', [row('5', T0, 9, 1e-10)]), runOf('2', [row('5', T0 + 7 * 3600_000, 9, 1e-10)]));

    expect(diff.entries.map((e) => e.status).sort()).toEqual(['appeared', 'dropped']);
  });

  it('pairs closest TCA first and one-to-one, after the same-event pass', () => {
    // Pre: 5 at T0 and T0+3h. Post: 5 at T0+5min (same event as T0) and T0+2h (moved from T0+3h).
    const diff = diffScreeningRuns(
      runOf('1', [row('5', T0, 2, 1e-7), row('5', T0 + 180 * MIN, 3, 1e-7)]),
      runOf('2', [row('5', T0 + 5 * MIN, 2, 1e-7), row('5', T0 + 120 * MIN, 4, 1e-7)])
    );
    const moved = diff.entries.filter((e) => e.status === 'moved');

    expect(diff.entries).toHaveLength(2);
    expect(diff.entries.find((e) => e.status === 'unchanged')!.pre!.tcaMs).toBe(T0);
    expect(moved).toHaveLength(1);
    expect(moved[0].pre!.tcaMs).toBe(T0 + 180 * MIN);
    expect(moved[0].post!.tcaMs).toBe(T0 + 120 * MIN);
  });

  it('movedToleranceMs 0 turns the moved pass off', () => {
    const diff = diffScreeningRuns(runOf('1', [row('5', T0, 1.2, 5e-8)]), runOf('2', [row('5', T0 + 47 * MIN, 6.4, 1e-10)]), { movedToleranceMs: 0 });

    expect(diff.entries.map((e) => e.status).sort()).toEqual(['appeared', 'removed']);
  });

  it('prints the moved row in the report table and validates against the schema', () => {
    const diff = diffScreeningRuns(runOf('68762', [row('68698', T0, 1.2, 5e-8)]), runOf('90000', [row('68698', T0 + 47 * MIN, 6.4, 1e-10)]));
    const data = generateScreeningCompareReport({
      diff,
      env: {
        analysisEpoch: new Date(T0),
        wallClock: new Date(T0),
        appVersion: 'test',
        covarianceConfidenceLevel: 1,
        primaryHardBodyRadiusKm: 0.01,
        secondaryHardBodyRadiusKm: 0.005,
      },
    });
    const csv = buildDownloadPayload(data, 'csv').content;
    const text = buildDownloadPayload(data, 'text').content;

    expect(csv).toContain('Moved,68698,,2026-10-24 14:00:00,1.200,5.00e-8,2026-10-24 14:47:00,6.400,1.00e-10,+5.200');
    expect(text).toMatch(/Moved\s+1/u);
    expect(validateConjunctionAnalysisState(JSON.parse(buildDownloadPayload(data, 'json').content))).toEqual([]);
  });
});
