import { keepTrackContainer } from '@app/container';
import { Singletons } from '@app/interfaces';
import { SatMath } from '@app/static/sat-math';
import { SensorMath } from '@app/static/sensor-math';
import { SatelliteRecord } from 'ootk';
import { defaultSat, defaultSensor } from './environment/apiMocks';

describe('sensor-math', () => {
  // Should be able to process getTearData
  it('process_getTearData', () => {
    const test = () => SensorMath.getTearData(new Date('2023-01-01T00:00:00.000Z'), defaultSat.satrec as SatelliteRecord, [defaultSensor], false);

    expect(test).not.toThrow();
  });
  it('process_getTearData_isRiseSetLookangles', () => {
    // jest mock SatMath.checkIsInView to return true
    jest.spyOn(SatMath, 'checkIsInView').mockReturnValue(true);
    const test = () => SensorMath.getTearData(new Date('2023-01-01T00:00:00.000Z'), defaultSat.satrec as SatelliteRecord, [defaultSensor], true);

    expect(test).not.toThrow();
  });

  // Should be able to process nextpassList
  it('process_nextpassList', () => {
    const sensorMathInstance = new SensorMath();

    keepTrackContainer.registerSingleton(Singletons.SensorMath, sensorMathInstance);
    const test = () => SensorMath.nextpassList([defaultSat], [defaultSensor]);

    expect(test).not.toThrow();
  });

  // Should be able to process nextpass
  it('process_nextpass', () => {
    const test = () => SensorMath.nextpass(defaultSat, [defaultSensor]);

    expect(test).not.toThrow();
  });

  // Should be able to process getSunTimes
  it('process_getSunTimes', () => {
    const test = () => SensorMath.getSunTimes(defaultSat, [defaultSensor]);

    expect(test).not.toThrow();
  });

  /*
   * Should be able to process distanceString
   * TODO: This should actually test with SensorManager data set
   */
  it('process_distanceString', () => {
    const test = () => SensorMath.distanceString(defaultSat, defaultSat);

    expect(test).not.toThrow();
  });
});
