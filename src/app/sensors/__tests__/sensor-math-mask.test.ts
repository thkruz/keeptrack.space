import { SatMath } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorMath, TearrType } from '@app/app/sensors/sensor-math';
import { Degrees, Kilometers, SatelliteRecord, SpaceObjectType } from '@ootk/src/main';
import { vi } from 'vitest';

/*
 * Same analytic overhead pass as best-pass-calculator.test.ts:
 *   el(t) = 50 sin(pi t / 600), az(t) = 0.3 t for t in [0, 600] s.
 * Mask: interpolated vertices (0,10) (45,10) (90,60) (135,10) (270,10); sensor minEl 10.
 * Hand-derived edges: minEl rise at 38.457 s, mask set at 267.884 s, mask re-rise at
 * 332.116 s, minEl set at 561.543 s.
 */
const BASE_MS = Date.UTC(2025, 0, 1);

const sensor = new DetailedSensor({
  objName: 'MASKED',
  lat: 0 as Degrees,
  lon: 0 as Degrees,
  alt: 0 as Kilometers,
  type: SpaceObjectType.OPTICAL,
  minAz: 0 as Degrees,
  maxAz: 360 as Degrees,
  minEl: 10 as Degrees,
  maxEl: 90 as Degrees,
  minRng: 0 as Kilometers,
  maxRng: 50000 as Kilometers,
  interpolateMask: true,
  elevationMasks: [0, 45, 90, 135, 270].map((az) => ({ startAz: az as Degrees, stopAz: az as Degrees, minEl: (az === 90 ? 60 : 10) as Degrees })),
});

const at = (sec: number) => new Date(BASE_MS + sec * 1000);

describe('SensorMath.getTearData rise/set rows with a horizon mask', () => {
  beforeEach(() => {
    vi.spyOn(SatMath, 'getRae').mockImplementation((date: Date) => {
      const t = (date.getTime() - BASE_MS) / 1000;

      if (t < 0 || t > 600) {
        return { az: 0 as Degrees, el: -10 as Degrees, rng: 3000 as Kilometers };
      }

      return { az: (0.3 * t) as Degrees, el: (50 * Math.sin((Math.PI * t) / 600)) as Degrees, rng: 1000 as Kilometers };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const satrec = {} as SatelliteRecord;

  it('flags the re-rise after the masked gap (t = 333 s; t = 332 s is under the mask)', () => {
    // el already falls after the t = 300 s peak, so pass isMaxElFound to get a plain RISE row
    const row = SensorMath.getTearData(at(333), satrec, [sensor], true, true);

    expect(row.type).toBe(TearrType.RISE);
    expect(row.maskLimited).toBe(true);
  });

  it('flags the set into the masked gap (t = 267 s; t = 268 s is under the mask)', () => {
    const row = SensorMath.getTearData(at(267), satrec, [sensor], true, true);

    expect(row.type).toBe(TearrType.SET);
    expect(row.maskLimited).toBe(true);
  });

  it('does not flag the minEl rise (t = 39 s; t = 38 s is below minEl 10)', () => {
    const row = SensorMath.getTearData(at(39), satrec, [sensor], true, false);

    expect(row.type).toBe(TearrType.RISE);
    expect(row.maskLimited).toBe(false);
  });
});
