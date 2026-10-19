import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { buildCustomSensorParams, CustomSensorFormValues } from '@app/plugins/sensor/custom-sensor-core';
import {
  buildCustomSensorStore,
  CUSTOM_SENSOR_STORE_VERSION,
  customSensorParamsFromRecord,
  parseCustomSensorStore,
  toCustomSensorRecord,
} from '@app/plugins/sensor/custom-sensor-persistence';
import { SpaceObjectType, ZoomValue } from '@ootk/src/main';

const FORM: CustomSensorFormValues = {
  uiName: 'CU Boulder UHF',
  type: 'Mechanical',
  lat: 40.0075,
  lon: -105.2659,
  alt: 1.655,
  minAz: 0,
  maxAz: 360,
  minEl: 10,
  maxEl: 90,
  minRng: 100,
  maxRng: 50000,
  mask: '0,5\n90,25\n180,5\n270,25',
};

const makeCustom = (over: Partial<CustomSensorFormValues> = {}, id = 'abc123') => new DetailedSensor(buildCustomSensorParams({ ...FORM, ...over }, id));

describe('custom-sensor-persistence', () => {
  it('round-trips a custom sensor through JSON with every field intact', () => {
    const original = makeCustom();
    const json = JSON.stringify(buildCustomSensorStore(original, []));
    const store = parseCustomSensorStore(json);

    expect(store).not.toBeNull();
    expect(store!.primaryObjName).toBe(original.objName);
    expect(store!.sensors).toHaveLength(1);

    const rebuilt = new DetailedSensor(customSensorParamsFromRecord(store!.sensors[0]));

    expect(rebuilt.objName).toBe(original.objName);
    expect(rebuilt.name).toBe('CU Boulder UHF');
    expect(rebuilt.uiName).toBe('CU Boulder UHF');
    expect(rebuilt.type).toBe(SpaceObjectType.MECHANICAL);
    expect(rebuilt.lat).toBeCloseTo(40.0075, 6);
    expect(rebuilt.lon).toBeCloseTo(-105.2659, 6);
    expect(rebuilt.alt).toBeCloseTo(1.655, 6);
    expect(rebuilt.minAz).toBe(0);
    expect(rebuilt.maxAz).toBe(360);
    expect(rebuilt.minEl).toBe(10);
    expect(rebuilt.maxEl).toBe(90);
    expect(rebuilt.minRng).toBe(100);
    expect(rebuilt.maxRng).toBe(50000);
    expect(rebuilt.elevationMasks).toEqual(original.elevationMasks);
    expect(rebuilt.interpolateMask).toBe(true);
    expect(rebuilt.isCustomSensor).toBe(true);
  });

  it('records a catalog primary as null and keeps custom secondaries', () => {
    const catalogPrimary = toCustomSensorRecord(makeCustom()) as unknown as DetailedSensor;
    const builtIn = { ...catalogPrimary, objName: 'CODSFS', name: 'Cape Cod SFS', isCustomSensor: false } as unknown as DetailedSensor;
    const secondary = makeCustom({ uiName: 'Second' }, 'def456');
    const store = buildCustomSensorStore(builtIn, [secondary]);

    expect(store.primaryObjName).toBeNull();
    expect(store.sensors.map((s) => s.objName)).toEqual([secondary.objName]);
  });

  it('drops duplicate objNames', () => {
    const sensor = makeCustom();
    const store = buildCustomSensorStore(sensor, [sensor]);

    expect(store.sensors).toHaveLength(1);
  });

  it('returns null for missing, corrupt or wrong-version data', () => {
    expect(parseCustomSensorStore(null)).toBeNull();
    expect(parseCustomSensorStore('')).toBeNull();
    expect(parseCustomSensorStore('{not json')).toBeNull();
    expect(parseCustomSensorStore(JSON.stringify({ version: CUSTOM_SENSOR_STORE_VERSION + 1, primaryObjName: null, sensors: [] }))).toBeNull();
  });

  it('skips invalid records and clears a primary that no longer matches a record', () => {
    const good = toCustomSensorRecord(makeCustom());
    const json = JSON.stringify({
      version: CUSTOM_SENSOR_STORE_VERSION,
      primaryObjName: 'Custom Sensor-missing',
      sensors: [good, { ...good, objName: 'CODSFS' }, { ...good, objName: 'Custom Sensor-x', lat: 'north' }],
    });
    const store = parseCustomSensorStore(json);

    expect(store!.sensors).toEqual([good]);
    expect(store!.primaryObjName).toBeNull();
  });

  it('defaults a record without a zoom to LEO framing', () => {
    const record = toCustomSensorRecord(makeCustom());

    delete record.zoom;

    expect(customSensorParamsFromRecord(record).zoom).toBe(ZoomValue.LEO);
  });
});
