import { vi } from 'vitest';

// const-enum values (erased at compile time)
const IN = { START: 0, CANCEL: 1 } as const;
const OUT = { CHUNK: 0, PROGRESS: 1, COMPLETE: 2, ERROR: 3 } as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

const bpSat = (sccNum: string) => ({ sccNum, tle1: TLE1, tle2: TLE2 });

// Minimal SensorObjectCruncher-shaped data the worker reconstructs into a DetailedSensor.
const sensor = () => ({
  lat: 41.754785,
  lon: -70.539151,
  alt: 0.062,
  minAz: 0,
  maxAz: 360,
  minEl: 3,
  maxEl: 85,
  minRng: 0,
  maxRng: 5556,
  name: 'COD',
  type: 1,
});

let posted: { typ?: number; runId?: number; processed?: number; total?: number; truncated?: boolean; passes?: unknown[] }[] = [];

const loadWorker = async () => {
  await import('@app/webworker/bestPassWorker');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as (m: { data: unknown }) => void)({ data });
};

const startMsg = (overrides: Record<string, unknown> = {}) => ({
  typ: IN.START,
  runId: 1,
  sats: [bpSat('25544')],
  sensors: [sensor()],
  sensorNames: ['COD'],
  baseTimeMs: Date.UTC(2008, 8, 20, 0, 0, 0),
  lengthDays: 1,
  intervalSec: 30,
  maxResults: 50,
  sunEci: { x: 0, y: 0, z: 0 },
  ...overrides,
});

describe('bestPassWorker', () => {
  beforeEach(() => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: { typ?: number }) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  it('posts "ready" on load and installs an onmessage handler', async () => {
    await loadWorker();

    expect(posted).toContain('ready');
    expect(typeof globalThis.onmessage).toBe('function');
  });

  it('streams a CHUNK + PROGRESS per satellite and a terminal COMPLETE on START', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg({ sats: [bpSat('25544'), bpSat('25545')] }));

    await vi.runAllTimersAsync();

    const chunks = posted.filter((p) => p.typ === OUT.CHUNK);
    const progress = posted.filter((p) => p.typ === OUT.PROGRESS);
    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(chunks.length).toBe(2);
    expect(progress.at(-1)).toMatchObject({ processed: 2, total: 2 });
    expect(complete).toMatchObject({ typ: OUT.COMPLETE, runId: 1 });
    expect(typeof complete!.truncated).toBe('boolean');
  });

  it('emits a CHUNK with a passes array for a valid satellite/sensor pair', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg());

    await vi.runAllTimersAsync();

    const chunk = posted.find((p) => p.typ === OUT.CHUNK);

    expect(chunk).toBeDefined();
    expect(Array.isArray(chunk!.passes)).toBe(true);
  });

  it('skips a satellite with a malformed TLE but still completes', async () => {
    await loadWorker();
    posted = [];

    dispatch(startMsg({ sats: [{ sccNum: '99999', tle1: 'garbage', tle2: 'garbage' }] }));

    await vi.runAllTimersAsync();

    const chunk = posted.find((p) => p.typ === OUT.CHUNK);
    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(chunk).toMatchObject({ typ: OUT.CHUNK, passes: [] });
    expect(complete).toBeDefined();
    expect(complete).toMatchObject({ failedIds: ['99999'], truncatedIds: [] });
  });

  it('does not mark a valid object with no passes as failed', async () => {
    await loadWorker();
    posted = [];

    // A 10 km range limit means the sensor never sees the ISS, so the search finds zero passes.
    dispatch(startMsg({ sensors: [{ ...sensor(), maxRng: 10 }] }));

    await vi.runAllTimersAsync();

    const chunk = posted.find((p) => p.typ === OUT.CHUNK) as { passes: unknown[]; failed?: boolean } | undefined;
    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(chunk!.passes).toEqual([]);
    expect(chunk!.failed ?? false).toBe(false);
    expect(complete).toMatchObject({ failedIds: [] });
  });

  it('aborts when a CANCEL for the active runId precedes START', async () => {
    await loadWorker();
    posted = [];

    dispatch({ typ: IN.CANCEL, runId: 3 });
    dispatch(startMsg({ runId: 3 }));

    await vi.runAllTimersAsync();

    expect(posted.find((p) => p.typ === OUT.COMPLETE)).toBeUndefined();
  });

  it('ignores unknown message types without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: 99, runId: 1 })).not.toThrow();
  });
});

describe('bestPassWorker clipped-pass opt-in', () => {
  // Opt-in rows carry START_CLIPPED/END_CLIPPED keys; default rows never do.
  const clippedKeys = (rows: unknown[]) => rows.filter((r) => 'START_CLIPPED' in (r as object) || 'END_CLIPPED' in (r as object));

  const collect = async (overrides: Record<string, unknown>) => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: { typ?: number }) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
    await import('@app/webworker/bestPassWorker');
    dispatch(startMsg({ runId: 7, lengthDays: 2, ...overrides }));
    await vi.runAllTimersAsync();

    return posted.filter((p) => p.typ === OUT.CHUNK).flatMap((p) => p.passes ?? []);
  };

  it('without the flag returns default rows (no clip fields)', async () => {
    const rows = await collect({});

    expect(rows.length).toBeGreaterThan(0);
    expect(clippedKeys(rows)).toHaveLength(0);
  });

  it('with includeClippedPasses: true rows carry the clip fields', async () => {
    const rows = await collect({ includeClippedPasses: true });

    expect(rows.length).toBeGreaterThan(0);
    expect(clippedKeys(rows)).toHaveLength(rows.length);
  });
});
