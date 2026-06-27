import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { workerCheckIsInView, workerGetRae } from '@app/webworker/shared/pass-worker-helpers';
import { Degrees, Kilometers, Sgp4 } from '@ootk/src/main';

/** A ground sensor near Cape Cod (CODSFS-like) with a wrap-around primary azimuth fan. */
const buildSensor = (overrides: Partial<ConstructorParameters<typeof DetailedSensor>[0]> = {}): DetailedSensor =>
  new DetailedSensor({
    objName: 'TEST-SENSOR',
    lat: 41.75 as Degrees,
    lon: -70.54 as Degrees,
    alt: 0.06 as Kilometers,
    minAz: 0 as Degrees,
    maxAz: 360 as Degrees,
    minEl: 0 as Degrees,
    maxEl: 90 as Degrees,
    minRng: 0 as Kilometers,
    maxRng: 50000 as Kilometers,
    ...overrides,
  });

/** Make a PassRae quickly. */
const rae = (az: number | null, el: number | null, rng: number | null) => ({ az, el, rng });

describe('workerCheckIsInView', () => {
  it('returns false when any of az/el/rng is null', () => {
    const sensor = buildSensor();

    expect(workerCheckIsInView(sensor, rae(null, 10, 1000))).toBe(false);
    expect(workerCheckIsInView(sensor, rae(10, null, 1000))).toBe(false);
    expect(workerCheckIsInView(sensor, rae(10, 10, null))).toBe(false);
  });

  it('returns true for a look angle inside the primary field of regard', () => {
    const sensor = buildSensor({
      minAz: 0 as Degrees,
      maxAz: 180 as Degrees,
      minEl: 5 as Degrees,
      maxEl: 85 as Degrees,
      minRng: 100 as Kilometers,
      maxRng: 40000 as Kilometers,
    });

    expect(workerCheckIsInView(sensor, rae(90, 45, 2000))).toBe(true);
  });

  it('returns false when the look angle is out of the primary range', () => {
    const sensor = buildSensor({
      minAz: 0 as Degrees,
      maxAz: 180 as Degrees,
      minEl: 5 as Degrees,
      maxEl: 85 as Degrees,
      minRng: 100 as Kilometers,
      maxRng: 40000 as Kilometers,
    });

    // Azimuth above maxAz.
    expect(workerCheckIsInView(sensor, rae(270, 45, 2000))).toBe(false);
    // Elevation below minEl.
    expect(workerCheckIsInView(sensor, rae(90, 1, 2000))).toBe(false);
    // Range beyond maxRng.
    expect(workerCheckIsInView(sensor, rae(90, 45, 999999))).toBe(false);
  });

  it('returns true via the secondary field of regard when outside the primary', () => {
    const sensor = buildSensor({
      minAz: 0 as Degrees,
      maxAz: 90 as Degrees,
      minEl: 5 as Degrees,
      maxEl: 85 as Degrees,
      minRng: 100 as Kilometers,
      maxRng: 40000 as Kilometers,
      minAz2: 180 as Degrees,
      maxAz2: 270 as Degrees,
      minEl2: 5 as Degrees,
      maxEl2: 85 as Degrees,
      minRng2: 100 as Kilometers,
      maxRng2: 40000 as Kilometers,
    });

    // Outside primary (az 200), inside secondary fan.
    expect(workerCheckIsInView(sensor, rae(200, 45, 2000))).toBe(true);
  });

  it('handles the wrap-around azimuth case where minAz > maxAz', () => {
    const sensor = buildSensor({
      minAz: 347 as Degrees,
      maxAz: 227 as Degrees,
      minEl: 3 as Degrees,
      maxEl: 85 as Degrees,
      minRng: 100 as Kilometers,
      maxRng: 40000 as Kilometers,
      // No secondary fan -> NaN comparisons must not match.
    });

    // az above minAz (350 >= 347) -> in view.
    expect(workerCheckIsInView(sensor, rae(350, 45, 2000))).toBe(true);
    // az below maxAz (10 <= 227) -> in view.
    expect(workerCheckIsInView(sensor, rae(10, 45, 2000))).toBe(true);
    // az in the dead zone between maxAz and minAz (300) -> out of view.
    expect(workerCheckIsInView(sensor, rae(300, 45, 2000))).toBe(false);
    // Within the fan but below the elevation floor -> out of view.
    expect(workerCheckIsInView(sensor, rae(10, 1, 2000))).toBe(false);
  });
});

describe('workerGetRae', () => {
  // ISS-like TLE with a known 2025 epoch.
  const line1 = '1 25544U 98067A   25019.50000000  .00016717  00000-0  10270-3 0  9005';
  const line2 = '2 25544  51.6400 208.9163 0006317  69.9862 290.2553 15.54225995 12345';

  it('returns finite az/el/rng for a real satellite and sensor', () => {
    const satrec = Sgp4.createSatrec(line1, line2);
    const sensor = buildSensor();
    // A time inside the SGP4 validity window for this epoch.
    const now = new Date(Date.UTC(2025, 0, 19, 13, 0, 0));

    const result = workerGetRae(now, satrec, sensor);

    expect(typeof result.az).toBe('number');
    expect(typeof result.el).toBe('number');
    expect(typeof result.rng).toBe('number');
    expect(Number.isFinite(result.az as number)).toBe(true);
    expect(Number.isFinite(result.el as number)).toBe(true);
    expect(Number.isFinite(result.rng as number)).toBe(true);
    expect((result.rng as number)).toBeGreaterThan(0);
  });

  it('returns nulls when propagation fails', () => {
    const satrec = Sgp4.createSatrec(line1, line2);
    const sensor = buildSensor();
    const now = new Date(Date.UTC(2025, 0, 19, 13, 0, 0));

    const propagateSpy = vi.spyOn(Sgp4, 'propagate').mockImplementation(() => {
      throw new Error('propagation failure');
    });

    const result = workerGetRae(now, satrec, sensor);

    expect(result).toStrictEqual({ az: null, el: null, rng: null });

    propagateSpy.mockRestore();
  });

  it('returns nulls when propagation yields no position', () => {
    const satrec = Sgp4.createSatrec(line1, line2);
    const sensor = buildSensor();
    const now = new Date(Date.UTC(2025, 0, 19, 13, 0, 0));

    const propagateSpy = vi.spyOn(Sgp4, 'propagate').mockReturnValue({ position: false, velocity: false } as never);

    const result = workerGetRae(now, satrec, sensor);

    expect(result).toStrictEqual({ az: null, el: null, rng: null });

    propagateSpy.mockRestore();
  });
});
