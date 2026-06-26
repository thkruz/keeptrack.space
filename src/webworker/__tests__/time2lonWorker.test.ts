import { vi } from 'vitest';

// const-enum values (erased at compile time)
const IN = { START: 0, CANCEL: 1 } as const;
const OUT = { CHUNK: 0, PROGRESS: 1, COMPLETE: 2, ERROR: 3 } as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

const satData = (satId: number, overrides: Record<string, unknown> = {}) => ({
  satId,
  satName: `SAT-${satId}`,
  country: 'USA',
  tle1: TLE1,
  tle2: TLE2,
  periodMin: 92.6,
  ...overrides,
});

let posted: { typ?: number; runId?: number; line?: unknown; processed?: number; total?: number }[] = [];

const loadWorker = async () => {
  await import('@app/webworker/time2lonWorker');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as ((m: { data: unknown }) => void))({ data });
};

describe('time2lonWorker', () => {
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

  it('streams CHUNK + PROGRESS per satellite and a terminal COMPLETE on START', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START,
      runId: 1,
      sats: [satData(25544), satData(25545)],
      nowMs: Date.UTC(2008, 8, 20, 0, 0, 0),
      samplePoints: 8,
      maxTimeMin: 200,
    });

    await vi.runAllTimersAsync();

    const chunks = posted.filter((p) => p.typ === OUT.CHUNK);
    const progress = posted.filter((p) => p.typ === OUT.PROGRESS);
    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(chunks.length).toBe(2);
    expect(progress.length).toBe(2);
    expect(progress.at(-1)).toMatchObject({ processed: 2, total: 2 });
    expect(complete).toMatchObject({ typ: OUT.COMPLETE, runId: 1 });
  });

  it('produces a non-null line for a valid GEO-regime satellite', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START,
      runId: 7,
      sats: [satData(25544)],
      nowMs: Date.UTC(2008, 8, 20, 0, 0, 0),
      samplePoints: 16,
      maxTimeMin: 200,
    });

    await vi.runAllTimersAsync();

    const chunk = posted.find((p) => p.typ === OUT.CHUNK);

    expect(chunk).toBeDefined();
    expect(chunk!.line).not.toBeNull();
  });

  it('skips a satellite with a malformed TLE without throwing and still posts a CHUNK', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START,
      runId: 2,
      sats: [satData(99999, { tle1: 'garbage', tle2: 'garbage' })],
      nowMs: Date.UTC(2008, 8, 20, 0, 0, 0),
      samplePoints: 8,
      maxTimeMin: 200,
    });

    await vi.runAllTimersAsync();

    // A failed satellite emits a null line but the run still completes.
    const chunk = posted.find((p) => p.typ === OUT.CHUNK);
    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(chunk).toMatchObject({ typ: OUT.CHUNK, line: null });
    expect(complete).toBeDefined();
  });

  it('aborts the run when a CANCEL for the active runId arrives before START', async () => {
    await loadWorker();
    posted = [];

    // CANCEL records the runId; a START with the same runId must bail immediately.
    dispatch({ typ: IN.CANCEL, runId: 5 });
    dispatch({
      typ: IN.START,
      runId: 5,
      sats: [satData(25544)],
      nowMs: Date.UTC(2008, 8, 20, 0, 0, 0),
      samplePoints: 8,
      maxTimeMin: 200,
    });

    await vi.runAllTimersAsync();

    expect(posted.find((p) => p.typ === OUT.COMPLETE)).toBeUndefined();
  });

  it('ignores unknown message types without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: 99, runId: 1 })).not.toThrow();
  });
});
