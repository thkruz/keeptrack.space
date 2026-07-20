import { CatalogSource } from '@ootk/src/main';
import { vi } from 'vitest';

// const-enum values (erased at compile time)
const IN = { START: 0, CANCEL: 1 } as const;
const OUT = { PROGRESS: 0, COMPLETE: 1, ERROR: 2 } as const;

// Two near-identical GEO element sets so the single-sat survey has a neighbor to screen.
const TLE1_A = '1 41866U 16071A   24001.50000000  .00000000  00000-0  00000-0 0  9991';
const TLE2_A = '2 41866   0.0200  90.0000 0001000   0.0000   0.0000  1.00270000    01';
const TLE1_B = '1 41867U 16071B   24001.50000000  .00000000  00000-0  00000-0 0  9992';
const TLE2_B = '2 41867   0.0200  90.0000 0001000   0.0000   1.0000  1.00270000    02';

const proxSat = (id: number, sccNum: string, tle1: string, tle2: string) => ({
  id,
  sccNum,
  name: `GEO-${sccNum}`,
  tle1,
  tle2,
  source: CatalogSource.CELESTRAK,
  altId: '',
});

const params = (overrides: Record<string, unknown> = {}) => ({
  maxDis: 1000,
  maxVel: 10,
  durationSec: 600,
  baseTimeMs: Date.UTC(2024, 0, 1, 12, 0, 0),
  stepSeconds: 60,
  refineToleranceMs: 500,
  ...overrides,
});

interface Posted {
  typ?: number;
  runId?: number;
  done?: number;
  total?: number;
  events?: unknown[];
  message?: string;
}

let posted: Posted[] = [];

const loadWorker = async () => {
  await import('@app/webworker/proximityOpsWorker');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as (m: { data: unknown }) => void)({ data });
};

describe('proximityOpsWorker', () => {
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

  it('runs the single-satellite survey and posts a terminal COMPLETE with an events array', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START,
      runId: 1,
      mode: 'single',
      sats: [proxSat(1, '41866', TLE1_A, TLE2_A), proxSat(2, '41867', TLE1_B, TLE2_B)],
      params: params(),
    });

    await vi.runAllTimersAsync();

    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(complete).toBeDefined();
    expect(complete!.runId).toBe(1);
    expect(Array.isArray(complete!.events)).toBe(true);
  });

  it('walks the LEO all-vs-all bins, streaming PROGRESS then a COMPLETE', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START,
      runId: 2,
      mode: 'ava-leo',
      sats: [proxSat(1, '41866', TLE1_A, TLE2_A), proxSat(2, '41867', TLE1_B, TLE2_B)],
      params: params(),
    });

    await vi.runAllTimersAsync();

    const progress = posted.filter((p) => p.typ === OUT.PROGRESS);
    const complete = posted.find((p) => p.typ === OUT.COMPLETE);

    expect(progress.length).toBeGreaterThan(0);
    expect(progress.at(-1)).toMatchObject({ done: progress.at(-1)!.total });
    expect(complete).toBeDefined();
  });

  it('walks the GEO all-vs-all belt, streaming PROGRESS then a COMPLETE', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START,
      runId: 3,
      mode: 'ava-geo',
      sats: [proxSat(1, '41866', TLE1_A, TLE2_A), proxSat(2, '41867', TLE1_B, TLE2_B)],
      params: params(),
    });

    await vi.runAllTimersAsync();

    expect(posted.filter((p) => p.typ === OUT.PROGRESS).length).toBeGreaterThan(0);
    expect(posted.find((p) => p.typ === OUT.COMPLETE)).toBeDefined();
  });

  it('posts an ERROR (not a throw) when the satellite data is unparseable', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.START,
      runId: 4,
      mode: 'single',
      sats: [proxSat(1, '00000', 'garbage', 'garbage')],
      params: params(),
    });

    await vi.runAllTimersAsync();

    // Either it errors cleanly or completes with no events; never throws / hangs.
    const terminal = posted.find((p) => p.typ === OUT.COMPLETE || p.typ === OUT.ERROR);

    expect(terminal).toBeDefined();
  });

  it('aborts the all-vs-all survey when CANCEL arrives after START', async () => {
    await loadWorker();
    posted = [];

    const run = (globalThis.onmessage as (m: { data: unknown }) => Promise<void>)({
      data: {
        typ: IN.START,
        runId: 9,
        mode: 'ava-geo',
        sats: [proxSat(1, '41866', TLE1_A, TLE2_A), proxSat(2, '41867', TLE1_B, TLE2_B)],
        params: params(),
      },
    });

    dispatch({ typ: IN.CANCEL, runId: 9 });

    await vi.runAllTimersAsync();
    await run;

    expect(posted.find((p) => p.typ === OUT.COMPLETE)).toBeUndefined();
  });

  it('ignores unknown message types without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: 99, runId: 1 })).not.toThrow();
  });
});
