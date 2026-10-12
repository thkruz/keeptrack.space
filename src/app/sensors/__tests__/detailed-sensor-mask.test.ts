import { DetailedSensor, DetailedSensorParams } from '@app/app/sensors/DetailedSensor';
import { Degrees, ElevationMask, FovShape, Kilometers, SpaceObjectType } from '@ootk/src/main';

/*
 * The T1 test mask: vertices (0,5), (90,25), (180,5), (270,25), interpolated. By hand, the
 * floor at az 45 is 5 + 20 * 45/90 = 15, so el 14 is masked and el 16 is visible.
 */
const MASK: ElevationMask[] = [
  { startAz: 0 as Degrees, stopAz: 0 as Degrees, minEl: 5 as Degrees },
  { startAz: 90 as Degrees, stopAz: 90 as Degrees, minEl: 25 as Degrees },
  { startAz: 180 as Degrees, stopAz: 180 as Degrees, minEl: 5 as Degrees },
  { startAz: 270 as Degrees, stopAz: 270 as Degrees, minEl: 25 as Degrees },
];

const base: DetailedSensorParams = {
  objName: 'MASKTEST',
  uiName: 'Mask Test',
  lat: 40 as Degrees,
  lon: -105 as Degrees,
  alt: 0 as Kilometers,
  type: SpaceObjectType.OPTICAL,
  minAz: 0 as Degrees,
  maxAz: 360 as Degrees,
  minEl: 0 as Degrees,
  maxEl: 90 as Degrees,
  minRng: 0 as Kilometers,
  maxRng: 50000 as Kilometers,
  elevationMasks: MASK,
  interpolateMask: true,
};

describe.each([
  ['legacy az/el path', base],
  [
    'fovParams path',
    {
      ...base,
      fovParams: {
        boresightAz: 0 as Degrees,
        boresightEl: 90 as Degrees,
        halfAngle: 90 as Degrees,
        minRange: 0 as Kilometers,
        maxRange: 50000 as Kilometers,
        minElevation: 0 as Degrees,
        shape: FovShape.CIRCULAR_CONE,
      },
    } as DetailedSensorParams,
  ],
])('DetailedSensor horizon mask (%s)', (_label, params) => {
  const sensor = new DetailedSensor(params);

  it('rejects el 14 at az 45 (floor 15)', () => {
    expect(sensor.isRaeInFov(45 as Degrees, 14 as Degrees, 1000 as Kilometers)).toBe(false);
  });

  it('accepts el 16 at az 45 (floor 15)', () => {
    expect(sensor.isRaeInFov(45 as Degrees, 16 as Degrees, 1000 as Kilometers)).toBe(true);
  });

  it("reports the 'mask' reject reason with the interpolated floor", () => {
    const reason = sensor.getFovRejectReason(45 as Degrees, 14 as Degrees, 1000 as Kilometers);

    expect(reason?.kind).toBe('mask');
    expect(reason?.limit).toBeCloseTo(15, 9);
  });

  it('passes the mask into the ootk FieldOfView', () => {
    const fov = sensor.getFieldOfView();

    expect(fov?.elevationMasks.length).toBe(4);
    expect(fov?.interpolateMask).toBe(true);
    expect(fov?.getMinElevation(45 as Degrees)).toBeCloseTo(15, 9);
  });

  it('exposes the mask elevation and vertex count', () => {
    expect(sensor.hasElevationMask()).toBe(true);
    expect(sensor.getMaskVertexCount()).toBe(4);
    // 25 - 20 * 45/90 = 15 at az 135
    expect(sensor.getMaskElevationAt(135 as Degrees)).toBeCloseTo(15, 9);
  });

  it('survives a structured clone into a worker (rehydrated with new DetailedSensor)', () => {
    const rehydrated = new DetailedSensor(structuredClone({ ...sensor }) as unknown as DetailedSensorParams);

    expect(rehydrated.isRaeInFov(45 as Degrees, 14 as Degrees, 1000 as Kilometers)).toBe(false);
    expect(rehydrated.isRaeInFov(45 as Degrees, 16 as Degrees, 1000 as Kilometers)).toBe(true);
  });

  it('keeps the mask through clone()', () => {
    expect(sensor.clone().isRaeInFov(45 as Degrees, 14 as Degrees, 1000 as Kilometers)).toBe(false);
  });
});

describe('DetailedSensor horizon mask with a higher sensor minEl', () => {
  const sensor = new DetailedSensor({ ...base, minEl: 10 as Degrees });

  it('uses max(minEl, mask): 10 wins over the 5 deg vertex at az 0', () => {
    expect(sensor.isRaeInFov(0 as Degrees, 9 as Degrees, 1000 as Kilometers)).toBe(false);
    expect(sensor.isRaeInFov(0 as Degrees, 11 as Degrees, 1000 as Kilometers)).toBe(true);
    expect(sensor.getFovRejectReason(0 as Degrees, 9 as Degrees, 1000 as Kilometers)?.kind).toBe('minEl');
  });
});

describe('DetailedSensor without a mask', () => {
  const sensor = new DetailedSensor({ ...base, elevationMasks: undefined, interpolateMask: undefined });

  it('is unchanged: el 1 at az 45 is visible with minEl 0', () => {
    expect(sensor.isRaeInFov(45 as Degrees, 1 as Degrees, 1000 as Kilometers)).toBe(true);
    expect(sensor.hasElevationMask()).toBe(false);
    expect(sensor.getMaskElevationAt(45 as Degrees)).toBeNull();
  });
});
