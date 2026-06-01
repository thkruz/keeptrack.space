import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorManager } from '@app/app/sensors/sensorManager';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const sensor = (over: Partial<DetailedSensor>): DetailedSensor => {
  const s = defaultSensor.clone();

  Object.assign(s, over);

  return s;
};

describe('SensorManager selection bookkeeping', () => {
  let mgr: SensorManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => mgr as any;

  beforeEach(() => {
    setupStandardEnvironment();
    mgr = new SensorManager();
    // Isolate the array bookkeeping from cruncher/reset side effects.
    vi.spyOn(p(), 'updatePositionCruncher_').mockImplementation(() => undefined);
    vi.spyOn(mgr, 'resetSensorSelected').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('removeSensor', () => {
    it('promotes a secondary sensor when the primary is removed', () => {
      const primary = sensor({ sensorId: 0 });
      const secondary = sensor({ sensorId: 1 });

      mgr.currentSensors = [primary];
      mgr.secondarySensors = [secondary];

      mgr.removeSensor(primary);

      expect(mgr.currentSensors).toStrictEqual([secondary]);
      expect(mgr.resetSensorSelected).not.toHaveBeenCalled();
    });

    it('resets the selection when no sensors remain', () => {
      const primary = sensor({ sensorId: 0 });

      mgr.currentSensors = [primary];
      mgr.secondarySensors = [];

      mgr.removeSensor(primary);

      expect(mgr.currentSensors).toStrictEqual([]);
      expect(mgr.resetSensorSelected).toHaveBeenCalled();
    });

    it('also strips the sensor from the secondary and stf lists', () => {
      const target = sensor({ sensorId: 3 });
      const keep = sensor({ sensorId: 4 });

      mgr.currentSensors = [keep];
      mgr.secondarySensors = [target];
      mgr.stfSensors = [target];

      mgr.removeSensor(target);

      expect(mgr.secondarySensors).toStrictEqual([]);
      expect(mgr.stfSensors).toStrictEqual([]);
      expect(mgr.currentSensors).toStrictEqual([keep]);
    });
  });

  describe('removePrimarySensor', () => {
    it('pops the last primary when called with no argument', () => {
      const a = sensor({ sensorId: 1 });
      const b = sensor({ sensorId: 2 });

      mgr.currentSensors = [a, b];
      mgr.secondarySensors = [];

      mgr.removePrimarySensor();

      expect(mgr.currentSensors).toStrictEqual([a]);
      expect(mgr.resetSensorSelected).not.toHaveBeenCalled();
    });

    it('resets when removing the only primary with no secondary fallback', () => {
      const only = sensor({ sensorId: 1 });

      mgr.currentSensors = [only];
      mgr.secondarySensors = [];

      mgr.removePrimarySensor(only);

      expect(mgr.currentSensors).toStrictEqual([]);
      expect(mgr.resetSensorSelected).toHaveBeenCalled();
    });
  });

  describe('verifySensors', () => {
    it('returns the passed sensors unchanged', () => {
      const passed = [sensor({ sensorId: 9 })];

      expect(mgr.verifySensors(passed)).toBe(passed);
    });

    it('falls back to the current sensors when none are passed', () => {
      const current = [sensor({ sensorId: 5 })];

      mgr.currentSensors = current;

      expect(mgr.verifySensors(undefined)).toBe(current);
    });
  });

  describe('setCurrentSensor', () => {
    it('throws when handed an array whose first element is null', () => {
      expect(() => mgr.setCurrentSensor([null] as never)).toThrow();
    });
  });

  describe('getSensorList', () => {
    it('returns mapped sensors for a known group name', () => {
      const list = mgr.getSensorList('ssn');

      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });
  });
});
