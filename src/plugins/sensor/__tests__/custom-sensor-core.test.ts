import { buildCustomSensorParams, CustomSensorFormValues, mapSensorType, validateCustomSensor } from '@app/plugins/sensor/custom-sensor-core';
import { SpaceObjectType, ZoomValue } from '@ootk/src/main';

const VALID: CustomSensorFormValues = {
  uiName: 'My Scope',
  type: 'Observer',
  lat: 40,
  lon: -75,
  alt: 0.1,
  minAz: 0,
  maxAz: 360,
  minEl: 0,
  maxEl: 90,
  minRng: 0,
  maxRng: 1000,
};

const withValues = (over: Partial<CustomSensorFormValues>): CustomSensorFormValues => ({ ...VALID, ...over });

describe('custom-sensor-core validateCustomSensor', () => {
  it('accepts a fully valid form', () => {
    expect(validateCustomSensor(VALID)).toBeNull();
  });

  it.each([
    ['lat', 95, 'latRange'],
    ['lat', -95, 'latRange'],
    ['lon', 200, 'lonRange'],
    ['lon', -200, 'lonRange'],
    ['alt', -5, 'altRange'],
    ['minAz', 400, 'minAzRange'],
    ['maxAz', -400, 'maxAzRange'],
    ['minEl', -100, 'minElRange'],
    ['maxEl', 100, 'maxElRange'],
    ['minRng', -1, 'minRangeValue'],
    ['maxRng', -1, 'maxRangeValue'],
  ])('rejects out-of-range %s=%s with %s', (field, value, expectedKey) => {
    expect(validateCustomSensor(withValues({ [field]: value }))).toBe(expectedKey);
  });

  it.each(['lat', 'lon', 'alt', 'minAz', 'maxAz', 'minEl', 'maxEl', 'minRng', 'maxRng'])('rejects NaN %s as invalidNumber', (field) => {
    expect(validateCustomSensor(withValues({ [field]: NaN }))).toBe('invalidNumber');
  });

  it('rejects minEl greater than maxEl', () => {
    expect(validateCustomSensor(withValues({ minEl: 80, maxEl: 10 }))).toBe('elOrder');
  });

  it('rejects minRng greater than maxRng', () => {
    expect(validateCustomSensor(withValues({ minRng: 2000, maxRng: 1000 }))).toBe('rangeOrder');
  });

  it('allows a wrap-around azimuth (minAz greater than maxAz)', () => {
    // Azimuth wraps through north (e.g. 350 to 10 degrees), so this must be valid.
    expect(validateCustomSensor(withValues({ minAz: 350, maxAz: 10 }))).toBeNull();
  });
});

describe('custom-sensor-core mapSensorType', () => {
  it.each([
    ['Observer', SpaceObjectType.OBSERVER],
    ['Optical', SpaceObjectType.OPTICAL],
    ['Mechanical', SpaceObjectType.MECHANICAL],
    ['Phased Array Radar', SpaceObjectType.PHASED_ARRAY_RADAR],
  ])('maps %s', (type, expected) => {
    expect(mapSensorType(type)).toBe(expected);
  });

  it('defaults an unknown type to Observer', () => {
    expect(mapSensorType('Wormhole Array')).toBe(SpaceObjectType.OBSERVER);
  });
});

describe('custom-sensor-core buildCustomSensorParams', () => {
  it('builds params for a valid form', () => {
    const params = buildCustomSensorParams(VALID, 'abc123');

    expect(params.uiName).toBe('My Scope');
    expect(params.lat).toBe(40);
    expect(params.objName).toBe('Custom Sensor-abc123');
    expect(params.type).toBe(SpaceObjectType.OBSERVER);
  });

  it('frames a long-range sensor at GEO zoom and a short-range one at LEO', () => {
    expect(buildCustomSensorParams(withValues({ maxRng: 50000 }), 'a').zoom).toBe(ZoomValue.GEO);
    expect(buildCustomSensorParams(withValues({ maxRng: 1000 }), 'b').zoom).toBe(ZoomValue.LEO);
  });
});
