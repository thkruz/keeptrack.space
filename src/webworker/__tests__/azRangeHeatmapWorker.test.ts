import { vi } from 'vitest';

// const-enum values (erased at compile time)
const IN = { START: 0, CANCEL: 1 } as const;
const OUT = { PARTIAL: 0, RESULT: 1, ERROR: 2 } as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

interface Posted {
  typ?: number;
  runId?: number;
  bins?: number[][];
  numAzBins?: number;
  numRngBins?: number;
  maxRng?: number;
  stepsProcessed?: number;
  stepsTotal?: number;
  binSatNums?: string[][][];
  message?: string;
}

let posted: Posted[] = [];

const loadWorker = async () => {
  await import('@app/webworker/azRangeHeatmapWorker');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as (m: { data: unknown }) => void)({ data });
};

const startMsg = (overrides: Record<string, unknown> = {}) => ({
  typ: IN.START,
  runId: 1,
  tleData: [{ tle1: TLE1, tle2: TLE2, sccNum: '25544' }],
  // ISS overpass-ish observer; the worker just bins whatever passes the band.
  sensorLat: 41.75,
  sensorLon: -70.54,
  sensorAlt: 0.062,
  sensorMaxRng: 6000,
  startTimeMs: Date.UTC(2008, 8, 20, 0, 0, 0),
  durationSec: 600,
  stepSec: 60,
  // Wide band + full-sky FOV so at least some steps register hits deterministically.
  elevationDeg: 0,
  marginDeg: 90,
  numAzBins: 36,
  numRngBins: 10,
  fovMinAz: 0,
  fovMaxAz: 360,
  ...overrides,
});

describe('azRangeHeatmapWorker', () => {
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

  it('streams PARTIAL snapshots and a terminal RESULT on START', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg());

    await vi.runAllTimersAsync();

    const partials = posted.filter((p) => p.typ === OUT.PARTIAL);
    const result = posted.find((p) => p.typ === OUT.RESULT);

    expect(partials.length).toBeGreaterThan(0);
    expect(result).toBeDefined();
    expect(result!.runId).toBe(1);
    expect(result!.numAzBins).toBe(36);
    expect(result!.numRngBins).toBe(10);
    expect(result!.maxRng).toBe(6000);
  });

  it('RESULT carries a correctly-dimensioned bins matrix and per-bin sccNum lists', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg());

    await vi.runAllTimersAsync();

    const result = posted.find((p) => p.typ === OUT.RESULT)!;

    expect(result.bins!.length).toBe(36);
    expect(result.bins![0].length).toBe(10);
    expect(result.binSatNums!.length).toBe(36);
    expect(result.binSatNums![0].length).toBe(10);
  });

  it('skips a malformed TLE entry but still produces a RESULT', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg({ tleData: [{ tle1: 'garbage', tle2: 'garbage', sccNum: '00000' }] }));

    await vi.runAllTimersAsync();

    expect(posted.find((p) => p.typ === OUT.RESULT)).toBeDefined();
  });

  it('honours the dual-face FOV branch (fovMinAz2/fovMaxAz2) without throwing', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg({ fovMinAz: 0, fovMaxAz: 90, fovMinAz2: 270, fovMaxAz2: 360 }));

    await vi.runAllTimersAsync();

    expect(posted.find((p) => p.typ === OUT.RESULT)).toBeDefined();
  });

  it('aborts mid-run when CANCEL arrives after START', async () => {
    await loadWorker();
    posted = [];

    // Long job so the first yield happens before completion, giving CANCEL a chance.
    const run = (globalThis.onmessage as (m: { data: unknown }) => Promise<void>)({
      data: startMsg({ runId: 9, durationSec: 36000, stepSec: 60 }),
    });

    dispatch({ typ: IN.CANCEL, runId: 9 });

    await vi.runAllTimersAsync();
    await run;

    // Cancelled run must not post a RESULT.
    expect(posted.find((p) => p.typ === OUT.RESULT)).toBeUndefined();
  });

  it('ignores unknown message types without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: 99, runId: 1 })).not.toThrow();
  });
});
