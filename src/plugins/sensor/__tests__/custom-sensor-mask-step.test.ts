import { maskMinElevation } from '@ootk/src/main';
import { describe, expect, it } from 'vitest';
import { buildCustomSensorParams, formatMask, isStepBinMask, parseMask } from '../custom-sensor-core';

const baseValues = {
  uiName: 'S',
  type: 'Observer',
  lat: 10,
  lon: 10,
  alt: 0,
  minAz: 0,
  maxAz: 360,
  minEl: 0,
  maxEl: 90,
  minRng: 0,
  maxRng: 1000,
};

describe('custom sensor step-bin mask', () => {
  it('holds elevation until the next azimuth, wrapping at 360', () => {
    const { masks, error } = parseMask('0,10\n90,35\n200,5', true);

    expect(error).toBeNull();
    expect(maskMinElevation(masks, 45, false, 0)).toBe(10);
    expect(maskMinElevation(masks, 89.9, false, 0)).toBe(10);
    expect(maskMinElevation(masks, 90, false, 0)).toBe(35);
    expect(maskMinElevation(masks, 150, false, 0)).toBe(35);
    expect(maskMinElevation(masks, 350, false, 0)).toBe(5);
  });

  it('interpolated mode still interpolates', () => {
    const { masks } = parseMask('0,10\n90,30');

    expect(maskMinElevation(masks, 45, true, 0)).toBeCloseTo(20, 5);
  });

  it('wraps the last bin through north when the first azimuth is above 0', () => {
    const { masks } = parseMask('10,20\n200,40', true);

    expect(maskMinElevation(masks, 5, false, 0)).toBe(40);
    expect(maskMinElevation(masks, 100, false, 0)).toBe(20);
  });

  it('sets interpolateMask false and round-trips as az,el text', () => {
    const params = buildCustomSensorParams({ ...baseValues, mask: '90,35\n0,10', maskStep: true }, 'x');

    expect(params.interpolateMask).toBe(false);
    expect(isStepBinMask(params.elevationMasks, params.interpolateMask)).toBe(true);
    expect(formatMask(params.elevationMasks, params.interpolateMask)).toBe('0,10\n90,35');
    expect(buildCustomSensorParams({ ...baseValues, mask: '0,10\n90,35' }, 'x').interpolateMask).toBe(true);
  });
});
