import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Degrees, Kilometers, SpaceObjectType } from '@ootk/src/main';
import { defaultSensor, defaultSat } from '@test/environment/apiMocks';

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

describe('DetailedSensor.isRaeInFov (explicit boresight-centric fovParams)', () => {
  /**
   * Space Fence style zenith-crossing fan: 2° wide, running from 10° elevation
   * in the west (az 270), through zenith, to 10° elevation in the east (az 90).
   * The legacy az/el box cannot represent this - the east half was never
   * flagged in-FOV before fovParams existed.
   */
  const fence = () => new DetailedSensor({
    objName: 'TESTFENCE',
    lat: 8.723 as Degrees,
    lon: 167.719 as Degrees,
    alt: 0.007 as Kilometers,
    type: SpaceObjectType.PHASED_ARRAY_RADAR,
    minAz: 268 as Degrees,
    maxAz: 272 as Degrees,
    minEl: 10 as Degrees,
    maxEl: 170 as Degrees,
    minRng: 50 as Kilometers,
    maxRng: 3057 as Kilometers,
    fovParams: {
      boresightAz: 270 as Degrees,
      boresightEl: 90 as Degrees,
      halfAngle: 80 as Degrees,
      minorHalfAngle: 1 as Degrees,
      rollAngle: 90 as Degrees,
      minRange: 50 as Kilometers,
      maxRange: 3057 as Kilometers,
      minElevation: 10 as Degrees,
    },
  });

  it.each([
    ['west half of the fan', 270, 45],
    ['east half of the fan (dead zone under legacy bounds)', 90, 45],
    ['zenith', 0, 90],
    ['near the west tip', 270, 12],
  ])('accepts a target in the %s', (_label, az, el) => {
    expect(fence().isRaeInFov(az as Degrees, el as Degrees, 1000 as Kilometers)).toBe(true);
  });

  it.each([
    ['north (across the thin axis)', 0, 45, 1000],
    ['south (across the thin axis)', 180, 45, 1000],
    ['below the minimum elevation', 270, 5, 1000],
    ['inside the minimum range', 270, 45, 20],
    ['beyond the maximum range', 270, 45, 4000],
  ])('rejects a target %s', (_label, az, el, rng) => {
    expect(fence().isRaeInFov(az as Degrees, el as Degrees, rng as Kilometers)).toBe(false);
  });

  it('survives a structured-clone round trip (position cruncher rehydration)', () => {
    const rehydrated = new DetailedSensor(structuredClone(fence()));

    expect(rehydrated.isRaeInFov(90 as Degrees, 45 as Degrees, 1000 as Kilometers)).toBe(true);
    expect(rehydrated.isRaeInFov(0 as Degrees, 45 as Degrees, 1000 as Kilometers)).toBe(false);
  });
});

describe('DetailedSensor.isRaeInFov (multi-face crossed fences)', () => {
  /**
   * LeoLabs CRSR-style crossed dual fences: each 2° wide with a 160° arc from
   * 20° elevation (az 210 / az 120) through zenith to the horizon on the
   * opposite side (az 30 / az 300). Boresights tilt 10° past zenith.
   */
  const crossedFence = () => new DetailedSensor({
    objName: 'TESTCROSS',
    lat: 10.6 as Degrees,
    lon: -85.5 as Degrees,
    alt: 0 as Kilometers,
    type: SpaceObjectType.PHASED_ARRAY_RADAR,
    minRng: 100 as Kilometers,
    maxRng: 3000 as Kilometers,
    boresightAz: [30, 300] as Degrees[],
    boresightEl: [80, 80] as Degrees[],
    fovParams: {
      halfAngle: 80 as Degrees,
      minorHalfAngle: 1 as Degrees,
      rollAngle: 0 as Degrees,
      minRange: 100 as Kilometers,
      maxRange: 3000 as Kilometers,
      minElevation: 0 as Degrees,
    },
  });

  it.each([
    ['face 1 high side (az 210)', 210, 25],
    ['face 1 low side (az 30, near horizon)', 30, 5],
    ['face 2 high side (az 120)', 120, 25],
    ['face 2 low side (az 300, near horizon)', 300, 5],
    ['zenith (both faces)', 0, 90],
  ])('accepts a target in %s', (_label, az, el) => {
    expect(crossedFence().isRaeInFov(az as Degrees, el as Degrees, 1000 as Kilometers)).toBe(true);
  });

  it.each([
    ['between the fence planes', 75, 45],
    ['below the 20° tip on the high side', 210, 15],
    ['opposite the low side but out of plane', 255, 45],
  ])('rejects a target %s', (_label, az, el) => {
    expect(crossedFence().isRaeInFov(az as Degrees, el as Degrees, 1000 as Kilometers)).toBe(false);
  });

  it('exposes both faces via getFaceFovs for mesh generation', () => {
    const fovs = crossedFence().getFaceFovs();

    expect(fovs).toHaveLength(2);
    expect(fovs![0].boresightAz).toBe(30);
    expect(fovs![1].boresightAz).toBe(300);
    expect(fovs![0].boresightEl).toBe(80);
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
