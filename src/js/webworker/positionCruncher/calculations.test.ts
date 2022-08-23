import { SensorObjectCruncher } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import { DEG2RAD } from '../../lib/constants';
import * as calculations from './calculations';

const defaultSensor: SensorObjectCruncher = {
  observerGd: {
    lat: 0,
    lon: 0,
    alt: 0,
  },
  obsmaxaz: 0,
  obsmaxel: 0,
  obsminaz: 0,
  obsminel: 0,
  obsmaxrange: 0,
  obsminrange: 0,
  country: '',
  shortName: '',
  staticNum: 0,
  sun: '',
  lat: 0,
  lon: 0,
  alt: 0,
  name: '',
  volume: false,
  zoom: 'leo',
};

describe('calculations', () => {
  it('lookAnglesToEcf', () => {
    const azDeg = 0;
    const elDeg = 0;
    const rng = 0;
    const obsLat = 0;
    const obsLong = 0;
    const obsAlt = 0;
    const result = calculations.lookAnglesToEcf(azDeg, elDeg, rng, obsLat, obsLong, obsAlt);
    expect(result).toMatchSnapshot();
  });
  it('propTime', () => {
    const dynamicOffsetEpoch = 0;
    const staticOffset = 0;
    const propRate = 0;
    const now = new Date(2022, 0, 1);
    now.setUTCHours(0, 0, 0, 0);
    const result = calculations.propTime(dynamicOffsetEpoch, staticOffset, propRate);
    expect(result).toMatchSnapshot();
  });
  it('checkSunExclusion', () => {
    const j = 0;
    const gmst = 0;
    const now = new Date(2022, 0, 1);
    now.setUTCHours(0, 0, 0, 0);
    const result = calculations.checkSunExclusion(defaultSensor, j, gmst, now);
    expect(result).toMatchSnapshot();
  });

  describe('isInFov', () => {
    let isInFovSensor = { ...defaultSensor };
    let isInFovSensor2 = { ...defaultSensor };
    beforeEach(() => {
      isInFovSensor.obsminaz = -90;
      isInFovSensor.obsmaxaz = 90;
      isInFovSensor.obsminel = -90;
      isInFovSensor.obsmaxel = 90;
      isInFovSensor.obsminrange = 0;
      isInFovSensor.obsmaxrange = 100;

      isInFovSensor2.obsminaz = 0;
      isInFovSensor2.obsmaxaz = 0;
      isInFovSensor2.obsminel = 0;
      isInFovSensor2.obsmaxel = 0;
      isInFovSensor2.obsminrange = 0;
      isInFovSensor2.obsmaxrange = 0;
      isInFovSensor2.obsminaz2 = -90;
      isInFovSensor2.obsmaxaz2 = 90;
      isInFovSensor2.obsminel2 = -90;
      isInFovSensor2.obsmaxel2 = 90;
      isInFovSensor2.obsminrange2 = 0;
      isInFovSensor2.obsmaxrange2 = 100;
    });

    it('should return 1 if in fov', () => {
      const rae = {
        az: 0 * DEG2RAD,
        el: 0 * DEG2RAD,
        rng: 50,
      };
      const result = calculations.isInFov(rae, isInFovSensor);
      expect(result).toBe(1);
    });
    it('should return 0 if not in fov', () => {
      const rae = {
        az: -180 * DEG2RAD,
        el: -180 * DEG2RAD,
        rng: 200,
      };
      const result = calculations.isInFov(rae, isInFovSensor);
      expect(result).toBe(0);
    });
    it('should handle second sensor and in fov', () => {
      const rae = {
        az: 0 * DEG2RAD,
        el: 0 * DEG2RAD,
        rng: 50,
      };
      const result = calculations.isInFov(rae, isInFovSensor2);
      expect(result).toBe(1);
    });
    it('should handle second sensor, az crosses 0, and in fov', () => {
      const rae = {
        az: 0 * DEG2RAD,
        el: 0 * DEG2RAD,
        rng: 50,
      };
      isInFovSensor2.obsminaz = 350;
      isInFovSensor2.obsmaxaz = 10;
      isInFovSensor2.obsminaz2 = 350;
      isInFovSensor2.obsmaxaz2 = 10;
      const result = calculations.isInFov(rae, isInFovSensor2);
      expect(result).toBe(1);
    });
    it('should return 1 if in fov and az crosses 0', () => {
      const northSensor = { ...isInFovSensor };
      northSensor.obsminaz = 350;
      northSensor.obsmaxaz = 10;
      const rae = {
        az: 0 * DEG2RAD,
        el: 10 * DEG2RAD,
        rng: 50,
      };
      const result = calculations.isInFov(rae, northSensor);
      expect(result).toBe(1);
    });
    it('should return 0 if not in fov and az crosses 0', () => {
      const northSensor = { ...isInFovSensor };
      northSensor.obsminaz = 350;
      northSensor.obsmaxaz = 10;
      const rae = {
        az: 20 * DEG2RAD,
        el: -180 * DEG2RAD,
        rng: 200,
      };
      const result = calculations.isInFov(rae, northSensor);
      expect(result).toBe(0);
    });
  });
  describe('setupTimeVariables', () => {
    it('should return the correct time variables', () => {
      const now = new Date(2022, 0, 1);
      now.setUTCHours(0, 0, 0, 0);
      const result = calculations.setupTimeVariables(0, 0, 1, true, false, defaultSensor);
      expect(result).toMatchSnapshot();
    });
    it('should return the correct time variables', () => {
      const now = new Date(2022, 0, 1);
      now.setUTCHours(0, 0, 0, 0);
      const result = calculations.setupTimeVariables(0, 0, 1, false, false, defaultSensor);
      expect(result).toMatchSnapshot();
    });
  });

  describe('isSensorDeepSpace', () => {
    it('should return true if deep space', () => {
      const sensor = { ...defaultSensor };
      sensor.type = SpaceObjectType.OPTICAL;
      let result = calculations.isSensorDeepSpace([sensor, sensor], sensor);
      expect(result).toBe(true);

      sensor.type = SpaceObjectType.OBSERVER;
      result = calculations.isSensorDeepSpace([sensor, sensor], sensor);
      expect(result).toBe(true);

      sensor.type = SpaceObjectType.MECHANICAL;
      result = calculations.isSensorDeepSpace([sensor, sensor], sensor);
      expect(result).toBe(true);
    });

    it('should return false if not deep space', () => {
      const sensor = { ...defaultSensor };
      sensor.type = SpaceObjectType.PHASED_ARRAY_RADAR;
      let result = calculations.isSensorDeepSpace([sensor, sensor], sensor);
      expect(result).toBe(false);
      result = calculations.isSensorDeepSpace([sensor], sensor);
      expect(result).toBe(false);
      sensor.type = SpaceObjectType.MECHANICAL;
      result = calculations.isSensorDeepSpace([sensor], sensor);
      expect(result).toBe(false);
    });
  });
});
