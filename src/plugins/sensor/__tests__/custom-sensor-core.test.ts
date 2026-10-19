import { buildCustomSensorParams, CustomSensorFormValues, mapSensorType, parseMask, validateCustomSensor } from '@app/plugins/sensor/custom-sensor-core';
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

describe('custom-sensor-core parseMask', () => {
  it('treats blank text as no mask', () => {
    expect(parseMask('')).toEqual({ masks: [], error: null, badPair: null });
    expect(parseMask('   \n  ')).toEqual({ masks: [], error: null, badPair: null });
    expect(parseMask(undefined).error).toBeNull();
  });

  it('parses one pair per line, skipping blank lines and spaces', () => {
    const { masks, error } = parseMask('0,5\n\n 90 , 25 \r\n180,5\n\n270,25\n');

    expect(error).toBeNull();
    expect(masks.map((m) => [m.startAz, m.minEl])).toEqual([
      [0, 5],
      [90, 25],
      [180, 5],
      [270, 25],
    ]);
    // Interpolated vertices: stopAz mirrors startAz (ignored by ootk in this mode)
    expect(masks.every((m) => m.stopAz === m.startAz)).toBe(true);
  });

  it('parses semicolon-separated pairs and decimals', () => {
    const { masks, error } = parseMask('0,5; 120.5,12.25;240,8');

    expect(error).toBeNull();
    expect(masks.map((m) => [m.startAz, m.minEl])).toEqual([
      [0, 5],
      [120.5, 12.25],
      [240, 8],
    ]);
  });

  it.each([
    ['0,5\nnorth,10', 'north,10'],
    ['0,5\n90', '90'],
    ['0,5\n360,10', '360,10'],
    ['0,5\n-1,10', '-1,10'],
    ['0,5\n90,90', '90,90'],
    ['0,5\n90,-2', '90,-2'],
  ])('reports the first bad pair in %j', (text, pair) => {
    expect(parseMask(text)).toEqual({ masks: [], error: 'maskBadPair', badPair: pair });
  });

  it('reports a duplicate azimuth', () => {
    expect(parseMask('0,5\n90,10\n90,20')).toEqual({ masks: [], error: 'maskDuplicateAz', badPair: '90,20' });
  });

  it('needs at least two points', () => {
    expect(parseMask('45,10').error).toBe('maskTooFew');
  });

  it('accepts exactly 72 points and rejects 73', () => {
    // 72 points every 5 deg: az 0, 5, ..., 355
    const pairs72 = Array.from({ length: 72 }, (_, i) => `${i * 5},10`).join('\n');
    // 73 points: the same plus az 357
    const pairs73 = `${pairs72}\n357,10`;

    expect(parseMask(pairs72).masks).toHaveLength(72);
    expect(parseMask(pairs73).error).toBe('maskTooMany');
  });

  it('surfaces mask errors through validateCustomSensor after the numeric rules', () => {
    expect(validateCustomSensor(withValues({ mask: '0,5\nbad' }))).toBe('maskBadPair');
    expect(validateCustomSensor(withValues({ mask: '0,5\n90,25' }))).toBeNull();
    // Numeric rules still win over a bad mask
    expect(validateCustomSensor(withValues({ lat: 95, mask: 'bad' }))).toBe('latRange');
  });

  it('passes a valid mask into the sensor params as interpolated vertices', () => {
    const params = buildCustomSensorParams(withValues({ mask: '0,5\n90,25\n180,5\n270,25' }), 'm');

    expect(params.elevationMasks).toHaveLength(4);
    expect(params.interpolateMask).toBe(true);
    expect(buildCustomSensorParams(VALID, 'n').elevationMasks).toBeUndefined();
  });
});
