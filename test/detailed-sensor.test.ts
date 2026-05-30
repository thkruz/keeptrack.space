import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Degrees, Kilometers } from '@ootk/src/main';
import { defaultSensor, defaultSat } from './environment/apiMocks';

/*
 * DetailedSensor's field-of-view geometry is pure (no DOM/ServiceLocator): RAE
 * bounds checking with azimuth wraparound + secondary lobes, boresight/azimuth-
 * span math, and the sat-in-FOV delegation. Sensors are built by cloning the
 * mock sensor and overriding the bound fields.
 */
const sensorWith = (over: Partial<DetailedSensor>): DetailedSensor => {
  const s = defaultSensor.clone();

  Object.assign(s, over);

  return s;
};

describe('DetailedSensor.isRaeInFov (azimuth-sector FOV)', () => {
  const simple = () => sensorWith({
    minAz: 0 as Degrees, maxAz: 180 as Degrees,
    minEl: 10 as Degrees, maxEl: 80 as Degrees,
    minRng: 200 as Kilometers, maxRng: 5000 as Kilometers,
    minAz2: undefined, maxAz2: undefined,
  });

  it('accepts a target inside all bounds', () => {
    expect(simple().isRaeInFov(90 as Degrees, 45 as Degrees, 1000 as Kilometers)).toBe(true);
  });

  it.each([
    ['azimuth', 270, 45, 1000],
    ['elevation', 90, 5, 1000],
    ['range (near)', 90, 45, 100],
    ['range (far)', 90, 45, 9000],
  ])('rejects out-of-bounds %s', (_label, az, el, rng) => {
    expect(simple().isRaeInFov(az as Degrees, el as Degrees, rng as Kilometers)).toBe(false);
  });

  it('handles azimuth wraparound (minAz > maxAz)', () => {
    const wrap = sensorWith({
      minAz: 350 as Degrees, maxAz: 10 as Degrees,
      minEl: 0 as Degrees, maxEl: 90 as Degrees,
      minRng: 0 as Kilometers, maxRng: 10000 as Kilometers,
      minAz2: undefined, maxAz2: undefined,
    });

    expect(wrap.isRaeInFov(355 as Degrees, 45 as Degrees, 1000 as Kilometers)).toBe(true);
    expect(wrap.isRaeInFov(180 as Degrees, 45 as Degrees, 1000 as Kilometers)).toBe(false);
  });

  it('checks the secondary FOV lobe when the primary misses', () => {
    const dual = sensorWith({
      minAz: 0 as Degrees, maxAz: 10 as Degrees,
      minEl: 0 as Degrees, maxEl: 90 as Degrees,
      minRng: 0 as Kilometers, maxRng: 10000 as Kilometers,
      minAz2: 100 as Degrees, maxAz2: 120 as Degrees,
    });

    // 110 misses the primary [0,10] but hits the secondary [100,120].
    expect(dual.isRaeInFov(110 as Degrees, 45 as Degrees, 1000 as Kilometers)).toBe(true);
  });
});

describe('DetailedSensor boresight / span math', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priv = (s: DetailedSensor) => s as any;

  it('boresight azimuth is the midpoint of a normal sector', () => {
    const s = sensorWith({ minAz: 0 as Degrees, maxAz: 180 as Degrees });

    expect(priv(s).calculateBoresightAz_()).toBe(90);
  });

  it('boresight azimuth handles a wraparound sector', () => {
    const s = sensorWith({ minAz: 347 as Degrees, maxAz: 227 as Degrees });

    // span = (360-347)+227 = 240; boresight = (347 + 120) % 360 = 107.
    expect(priv(s).calculateBoresightAz_()).toBe(107);
  });

  it('boresight elevation clamps to [-90, 90]', () => {
    const s = sensorWith({ minEl: -100 as Degrees, maxEl: 100 as Degrees });

    expect(priv(s).calculateBoresightEl_()).toBe(0);
  });

  it('azimuth span handles normal and wraparound sectors', () => {
    expect(priv(sensorWith({ minAz: 10 as Degrees, maxAz: 60 as Degrees })).getAzimuthSpan_()).toBe(50);
    expect(priv(sensorWith({ minAz: 350 as Degrees, maxAz: 10 as Degrees })).getAzimuthSpan_()).toBe(20);
  });
});

describe('DetailedSensor misc', () => {
  it('reports it is a sensor', () => {
    expect(defaultSensor.isSensor()).toBe(true);
  });

  it('isSatInFov returns a boolean for a real satellite', () => {
    expect(typeof defaultSensor.isSatInFov(defaultSat, new Date('2022-01-01T00:00:00Z'))).toBe('boolean');
  });

  it('clone produces an independent copy with the same bounds', () => {
    const copy = defaultSensor.clone();

    expect(copy).not.toBe(defaultSensor);
    expect(copy.minAz).toBe(defaultSensor.minAz);
    expect(copy.maxRng).toBe(defaultSensor.maxRng);
  });
});
