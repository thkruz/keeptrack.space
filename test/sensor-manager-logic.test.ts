import { vi } from 'vitest';
import { SensorManager } from '@app/app/sensors/sensorManager';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { setupStandardEnvironment } from './environment/standard-env';
import { defaultSensor } from './environment/apiMocks';

/*
 * SensorManager's lookup/selection layer is pure array bookkeeping over
 * currentSensors / secondarySensors / stfSensors. The pure lookups need no
 * environment; the remove/clear paths call updatePositionCruncher_ and so run
 * under the standard environment.
 */
const sensor = (over: Partial<DetailedSensor>): DetailedSensor => {
  const s = defaultSensor.clone();

  Object.assign(s, over);

  return s;
};

describe('SensorManager lookups', () => {
  let mgr: SensorManager;

  beforeEach(() => {
    mgr = new SensorManager();
  });

  describe('getSensor', () => {
    it('returns the primary sensor, or null when none selected', () => {
      expect(mgr.getSensor()).toBeNull();
      const s = sensor({});

      mgr.currentSensors = [s];
      expect(mgr.getSensor()).toBe(s);
    });
  });

  describe('isSensorSelected', () => {
    it('is true only when a real primary sensor is present', () => {
      expect(mgr.isSensorSelected()).toBe(false);
      mgr.currentSensors = [sensor({})];
      expect(mgr.isSensorSelected()).toBe(true);
    });
  });

  describe('getSensorById', () => {
    it('finds a sensor by id across current/secondary/stf lists', () => {
      const primary = sensor({ sensorId: 5 });
      const secondary = sensor({ sensorId: 9 });

      mgr.currentSensors = [primary];
      mgr.secondarySensors = [secondary];

      expect(mgr.getSensorById(5)).toBe(primary);
      expect(mgr.getSensorById(9)).toBe(secondary);
      expect(mgr.getSensorById(123)).toBeNull();
    });
  });

  describe('getSensorByObjName', () => {
    it('finds a sensor by objName, null for missing or undefined', () => {
      const s = sensor({ objName: 'CODSFS' });

      mgr.currentSensors = [s];

      expect(mgr.getSensorByObjName('CODSFS')).toBe(s);
      expect(mgr.getSensorByObjName('NOPE')).toBeNull();
      expect(mgr.getSensorByObjName(undefined)).toBeNull();
    });
  });

  describe('getSensorList', () => {
    it('returns an empty list for an unknown group name', () => {
      expect(mgr.getSensorList('definitely-not-a-group')).toStrictEqual([]);
    });
  });
});

describe('SensorManager remove/clear', () => {
  let mgr: SensorManager;

  beforeEach(() => {
    setupStandardEnvironment();
    mgr = new SensorManager();
  });

  afterEach(() => vi.restoreAllMocks());

  it('removeSecondarySensor drops the matching secondary', () => {
    const a = sensor({ sensorId: 1 });
    const b = sensor({ sensorId: 2 });

    mgr.currentSensors = [sensor({ sensorId: 0 })];
    mgr.secondarySensors = [a, b];

    mgr.removeSecondarySensor(a);

    expect(mgr.secondarySensors).toStrictEqual([b]);
  });

  it('removeStf drops the matching stf sensor', () => {
    const stf = sensor({ sensorId: 7 });

    mgr.stfSensors = [stf];
    mgr.removeStf(stf);

    expect(mgr.stfSensors).toStrictEqual([]);
  });

  it('clearStf empties the stf list', () => {
    mgr.stfSensors = [sensor({}), sensor({})];
    mgr.clearStf();

    expect(mgr.stfSensors).toStrictEqual([]);
  });

  it('removeSecondarySensor with no arg pops the last secondary', () => {
    const a = sensor({ sensorId: 1 });
    const b = sensor({ sensorId: 2 });

    mgr.secondarySensors = [a, b];
    mgr.removeSecondarySensor();

    expect(mgr.secondarySensors).toStrictEqual([a]);
  });
});
