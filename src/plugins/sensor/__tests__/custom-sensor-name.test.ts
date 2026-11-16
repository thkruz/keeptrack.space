import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { describe, expect, it } from 'vitest';
import { buildCustomSensorParams, type CustomSensorFormValues } from '../custom-sensor-core';

describe('custom sensor typed name (#282)', () => {
  it('uses the typed name as name and uiName; objName stays the id', () => {
    const values = {
      uiName: 'RIDGE',
      lat: 30,
      lon: -86,
      alt: 0.1,
      minAz: 0,
      maxAz: 360,
      minEl: 0,
      maxEl: 90,
      minRng: 0,
      maxRng: 5000,
      type: 'Observer',
      mask: '',
      maskStep: false,
    } as unknown as CustomSensorFormValues;
    const sensor = new DetailedSensor(buildCustomSensorParams(values, 'abc123'));

    expect(sensor.name).toBe('RIDGE');
    expect(sensor.uiName).toBe('RIDGE');
    expect(sensor.objName).toBe('Custom Sensor-abc123');
  });
});
