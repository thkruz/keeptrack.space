import { vi } from 'vitest';

// const-enum values (erased at compile time)
const IN = { START_SCREENING: 0, CANCEL: 1 } as const;
const OUT = { CHUNK: 1, COMPLETE: 2, ERROR: 3, PROGRESS: 4 } as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';
const sat = (name: string) => ({ tle1: TLE1, tle2: TLE2, name, radius: 0.05 });

let posted: unknown[] = [];

/** postMessage must be mocked before the worker module's top-level postMessage('ready'). */
const loadWorker = async () => {
  await import('@app/webworker/debrisScreeningWorker');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as (m: { data: unknown }) => void)({ data });
};

describe('debrisScreeningWorker', () => {
  beforeEach(() => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: unknown) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  it('posts "ready" on load and installs an onmessage handler', async () => {
    await loadWorker();

    expect(posted).toContain('ready');
    expect(typeof globalThis.onmessage).toBe('function');
  });

  it('runs START_SCREENING and posts a COMPLETE (or ERROR) terminal message', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START_SCREENING,
      runId: 1,
      primary: sat('PRIMARY'),
      secondaries: [sat('SECONDARY')],
      startTimeMs: Date.UTC(2008, 8, 20, 0, 0, 0),
      endTimeMs: Date.UTC(2008, 8, 20, 1, 0, 0),
      searchStepSize: 60,
      uVal: 1,
      vVal: 1,
      wVal: 1,
      batchSize: 10,
      covarianceConfidenceLevel: 0.95,
    });

    expect(posted.length).toBeGreaterThan(0);
    const terminal = posted.at(-1) as { typ: number; runId: number };

    expect([OUT.COMPLETE, OUT.ERROR]).toContain(terminal.typ);
    expect(terminal.runId).toBe(1);
  });

  it('handles CANCEL without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: IN.CANCEL, runId: 99 })).not.toThrow();
  });
});
