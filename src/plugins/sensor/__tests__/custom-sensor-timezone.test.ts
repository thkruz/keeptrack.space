import { buildCustomSensorParams, customSensorFormFromSensor, validateCustomSensor } from '@app/plugins/sensor/custom-sensor-core';
import { customSensorParamsFromRecord, toCustomSensorRecord } from '@app/plugins/sensor/custom-sensor-persistence';

const base = {
  uiName: 'Site',
  type: 'Observer',
  lat: 40,
  lon: -74,
  alt: 0.1,
  minAz: 0,
  maxAz: 360,
  minEl: 5,
  maxEl: 90,
  minRng: 100,
  maxRng: 50000,
  mask: '',
};

describe('custom sensor time zone', () => {
  it('accepts empty and valid zones, rejects unknown ones', () => {
    expect(validateCustomSensor({ ...base, timeZone: '' })).toBeNull();
    expect(validateCustomSensor({ ...base })).toBeNull();
    expect(validateCustomSensor({ ...base, timeZone: 'America/New_York' })).toBeNull();
    expect(validateCustomSensor({ ...base, timeZone: 'Not/AZone' })).toBe('timeZoneInvalid');
  });

  it('keeps the zone on the sensor params, the form prefill and the persisted record', () => {
    const params = buildCustomSensorParams({ ...base, timeZone: ' Europe/Paris ' }, 'abc');

    expect(params.timeZone).toBe('Europe/Paris');
    expect(buildCustomSensorParams(base, 'abc').timeZone).toBeUndefined();
    expect(customSensorFormFromSensor(params as never)['cs-timezone']).toBe('Europe/Paris');

    const record = toCustomSensorRecord(params as never);

    expect(record.timeZone).toBe('Europe/Paris');
    expect(customSensorParamsFromRecord(record).timeZone).toBe('Europe/Paris');
    expect(customSensorParamsFromRecord({ ...record, timeZone: 'junk' }).timeZone).toBeUndefined();
  });
});
