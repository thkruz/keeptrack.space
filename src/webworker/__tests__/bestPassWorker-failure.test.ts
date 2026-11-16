import { vi } from 'vitest';

vi.mock('@app/webworker/shared/pass-worker-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@app/webworker/shared/pass-worker-helpers')>();

  return { ...actual, workerGetRae: () => ({ az: null, el: null, rng: null }) };
});

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';
let posted: Record<string, unknown>[] = [];

describe('bestPassWorker propagation failure', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    posted = [];
    globalThis.postMessage = vi.fn((payload: Record<string, unknown>) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  it('flags a satellite whose every sample is null as failed on its CHUNK and in COMPLETE', async () => {
    await import('@app/webworker/bestPassWorker');
    (globalThis.onmessage as (m: { data: unknown }) => void)({
      data: {
        typ: 0,
        runId: 1,
        sats: [{ sccNum: '25544', tle1: TLE1, tle2: TLE2 }],
        sensors: [{ lat: 41.75, lon: -70.5, alt: 0.06, minAz: 0, maxAz: 360, minEl: 3, maxEl: 85, minRng: 0, maxRng: 5556, name: 'COD', type: 1 }],
        sensorNames: ['COD'],
        baseTimeMs: Date.UTC(2008, 8, 20),
        lengthDays: 1,
        intervalSec: 60,
        maxResults: 50,
        sunEci: { x: 0, y: 0, z: 0 },
      },
    });
    await vi.runAllTimersAsync();

    const chunk = posted.find((p) => p.typ === 0);
    const complete = posted.find((p) => p.typ === 2);

    expect(chunk).toMatchObject({ satId: '25544', failed: true, truncated: false });
    expect(complete).toMatchObject({ failedIds: ['25544'] });
  });
});
