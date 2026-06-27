import { vi } from 'vitest';

// const-enum values (erased at compile time)
const IN = { START_SEARCH: 0, CANCEL: 1 } as const;
const OUT = { VERIFIED: 1, COMPLETE: 2, ERROR: 3, TCA_CHUNK: 4 } as const;

// Two near-coincident ISS-epoch element sets so the verified pair survives the
// searchRadius gate but stays above minMissDistance (not a duplicate-TLE drop).
const TLE1_A = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2_A = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';
const TLE1_B = '1 25545U 98067B   08264.51782528 -.00002182  00000-0 -11606-4 0  2928';
const TLE2_B = '2 25545  51.6416 247.4627 0006703 130.5360 325.5288 15.72125391563530';

const coSat = (sccNum: string, name: string, tle1: string, tle2: string) => ({
  tle1,
  tle2,
  sccNum,
  name,
  perigee: 400,
  apogee: 420,
});

interface Posted {
  typ?: number;
  runId?: number;
  results?: { sat1Scc: string; sat2Scc: string; missDistanceKm: number }[];
  updates?: { i: number; tcaEpochMs: number; missAtTcaKm: number }[];
  processed?: number;
  total?: number;
  tcaCount?: number;
  message?: string;
}

let posted: Posted[] = [];

const loadWorker = async () => {
  await import('@app/webworker/closeObjectsWorker');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as ((m: { data: unknown }) => void))({ data });
};

const startMsg = (overrides: Record<string, unknown> = {}) => ({
  typ: IN.START_SEARCH,
  runId: 1,
  sats: [
    coSat('25544', 'ISS-A', TLE1_A, TLE2_A),
    coSat('25545', 'ISS-B', TLE1_B, TLE2_B),
  ],
  pairs: [[0, 1]],
  searchRadiusKm: 1e9,
  minMissDistanceKm: 0,
  simEpochMs: Date.UTC(2008, 8, 20, 0, 0, 0),
  verifyOffsetMs: 0,
  tcaWindowMs: 3600_000,
  coarseStepMs: 60_000,
  tolMs: 1000,
  maxTcaPairs: 100,
  ...overrides,
});

describe('closeObjectsWorker', () => {
  beforeEach(() => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: Posted) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  it('posts "ready" on load and installs an onmessage handler', async () => {
    await loadWorker();

    expect(posted).toContain('ready');
    expect(typeof globalThis.onmessage).toBe('function');
  });

  it('posts VERIFIED then COMPLETE for a candidate pair within the search radius', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg());

    const verified = posted.find((p) => p.typ === OUT.VERIFIED);
    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(verified).toBeDefined();
    expect(verified!.runId).toBe(1);
    expect(verified!.results!.length).toBe(1);
    expect(verified!.results![0]).toMatchObject({ sat1Scc: '25544', sat2Scc: '25545' });
    expect(complete).toMatchObject({ typ: OUT.COMPLETE, runId: 1 });
  });

  it('streams a TCA_CHUNK with an update for the verified pair', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg());

    const tca = posted.find((p) => p.typ === OUT.TCA_CHUNK);

    expect(tca).toBeDefined();
    expect(tca!.updates!.length).toBeGreaterThan(0);
    expect(tca!.updates![0]).toHaveProperty('tcaEpochMs');
    expect(tca!.updates![0]).toHaveProperty('missAtTcaKm');
  });

  it('drops a pair whose miss distance falls below minMissDistanceKm (duplicate TLE)', async () => {
    await loadWorker();
    posted = [];

    // Same element set twice => near-zero miss => dropped by the minMissDistance gate.
    dispatch(startMsg({
      sats: [coSat('25544', 'A', TLE1_A, TLE2_A), coSat('25545', 'B', TLE1_A, TLE2_A)],
      minMissDistanceKm: 1,
    }));

    const verified = posted.find((p) => p.typ === OUT.VERIFIED);

    expect(verified!.results!.length).toBe(0);
  });

  it('drops a pair whose miss distance exceeds the search radius', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg({ searchRadiusKm: 0.001 }));

    const verified = posted.find((p) => p.typ === OUT.VERIFIED);

    expect(verified!.results!.length).toBe(0);
  });

  it('skips a pair that shares an sccNum (same object, two data sources)', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg({
      sats: [coSat('25544', 'A', TLE1_A, TLE2_A), coSat('25544', 'B', TLE1_B, TLE2_B)],
    }));

    const verified = posted.find((p) => p.typ === OUT.VERIFIED);

    expect(verified!.results!.length).toBe(0);
  });

  it('emits an empty VERIFIED + COMPLETE when a satellite has a malformed TLE', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg({
      sats: [coSat('25544', 'A', TLE1_A, TLE2_A), coSat('00000', 'BAD', 'garbage', 'garbage')],
    }));

    expect(posted.find((p) => p.typ === OUT.VERIFIED)!.results!.length).toBe(0);
    expect(posted.find((p) => p.typ === OUT.COMPLETE)).toBeDefined();
  });

  it('does not post a VERIFIED when the run was cancelled first', async () => {
    await loadWorker();
    posted = [];

    dispatch({ typ: IN.CANCEL, runId: 5 });
    dispatch(startMsg({ runId: 5 }));

    expect(posted.find((p) => p.typ === OUT.VERIFIED)).toBeUndefined();
  });

  it('ignores unknown message types without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: 99, runId: 1 })).not.toThrow();
  });
});
