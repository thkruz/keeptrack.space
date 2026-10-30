import * as ootk from '@ootk/src/main';
import { vi } from 'vitest';
import { AzRangeMsgType, AzRangeOutMsgType, AzRangeOutResult } from '../az-range-heatmap-messages';

// Independent oracle: integrate declared piecewise-constant dwell intervals.
// Propagation/frame transforms are intentionally mocked: these tests verify the
// temporal metric and boundaries, not an orbit model.
describe('Az/Range time-weighted occupancy', () => {
  let posted: AzRangeOutResult[];
  let dwell: (seconds: number, satellite: number) => { az: number; el: number; rng: number };
  let index = 0;
  let seconds = 0;

  beforeEach(async () => {
    posted = [];
    index = 0;
    globalThis.postMessage = vi.fn((data: AzRangeOutResult) => posted.push(data)) as never;
    vi.spyOn(ootk.Sgp4, 'createSatrec').mockImplementation(() => ({ jdsatepoch: 2440587.5, satellite: index++ }) as never);
    vi.spyOn(ootk.Sgp4, 'propagate').mockImplementation((record, minutes) => {
      seconds = minutes * 60;
      return { position: { x: (record as unknown as { satellite: number }).satellite, y: 0, z: 0 } } as never;
    });
    vi.spyOn(ootk, 'eci2ecef').mockImplementation((position) => position as never);
    vi.spyOn(ootk, 'ecefRad2rae').mockImplementation((_observer, position) => dwell(seconds, position.x) as never);
    await import('../azRangeHeatmapWorker');
  });
  afterEach(() => vi.restoreAllMocks());

  const run = async (durationSec: number, stepSec: number, satellites = 1): Promise<AzRangeOutResult> => {
    index = 0;
    const promise = (globalThis.onmessage as unknown as (event: { data: unknown }) => Promise<void>)({
      data: {
        typ: AzRangeMsgType.START,
        runId: 1,
        tleData: Array.from({ length: satellites }, (_, n) => ({ tle1: 'fixture', tle2: 'fixture', sccNum: String(n) })),
        sensorLat: 0,
        sensorLon: 0,
        sensorAlt: 0,
        sensorMaxRng: 100,
        startTimeMs: 0,
        durationSec,
        stepSec,
        elevationDeg: 0,
        marginDeg: 1,
        numAzBins: 4,
        numRngBins: 2,
        fovMinAz: 0,
        fovMaxAz: 360,
      },
    });
    await vi.runAllTimersAsync();
    await promise;
    return posted.filter((message) => message.typ === AzRangeOutMsgType.RESULT).at(-1)!;
  };

  it('keeps constant occupancy at one and sums overlapping objects', async () => {
    dwell = () => ({ az: 45, el: 0, rng: 25 });
    expect((await run(125, 60)).bins[0][0]).toBe(1);
    expect((await run(125, 30, 2)).bins[0][0]).toBe(2);
  });

  it('clips the last interval, excludes the window end, and leaves empty bins zero', async () => {
    dwell = (time) => ({ az: 45, el: time < 119 ? 10 : 0, rng: 25 });
    const result = await run(125, 60);
    expect(result.bins[0][0]).toBeCloseTo(5 / 125, 10);
    expect(result.bins[1][0]).toBe(0);
  });

  it('wraps azimuth 360 to zero and includes max-range boundary', async () => {
    dwell = () => ({ az: 360, el: 0, rng: 100 });
    const result = await run(60, 30);
    expect(result.bins[0][1]).toBe(1);
    expect(result.bins[3][1]).toBe(0);
  });

  it('converges on a frozen independent 123-second dwell in a 600-second window', async () => {
    dwell = (time) => ({ az: 45, el: time < 123 ? 0 : 10, rng: 25 });
    const expected = 123 / 600;
    const values: number[] = [];
    for (const step of [60, 30, 10, 5, 1]) {
      // biome-ignore lint/performance/noAwaitInLoops: ordered sampling study limits worker memory
      const value = (await run(600, step)).bins[0][0];
      values.push(value);
      expect(Math.abs(value - expected)).toBeLessThanOrEqual(step / 600 + 1e-9);
    }
    expect(values).toEqual([0.3, 0.25, 130 / 600, 125 / 600, expected]);
  });
});
