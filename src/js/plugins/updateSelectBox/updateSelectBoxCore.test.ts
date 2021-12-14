import { defaultSat, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as updateSelectBoxCore from './updateSelectBoxCore';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('updateSelectBoxCore.updateSelectBoxCoreCallback', () => {
  test('0', () => {
    const callFunction: any = () => {
      updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
      keepTrackApi.programs.objectManager.isSensorManagerLoaded = true;
      keepTrackApi.programs.satellite.currentTEARR = {
        name: 'test',
        lat: 1,
        lon: 1,
        alt: 0,
        az: 0,
        el: 0,
        rng: 0,
        inView: true,
      };
      updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      keepTrackApi.programs.satellite.currentTEARR = {
        name: '',
        lat: 1,
        lon: 1,
        alt: 0,
        az: 0,
        el: 0,
        rng: 0,
        inView: false,
      };
      updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
      (<any>defaultSat).missile = true;
      updateSelectBoxCore.updateSelectBoxCoreCallback(defaultSat);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      updateSelectBoxCore.updateSelectBoxCoreCallback(null);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('updateSelectBoxCore.updateSelectBoxCoreCallback', () => {
  test('0', () => {
    const callFunction: any = () => {
      updateSelectBoxCore.updateSelectBoxCoreCallback({ velocity: { total: 10000 }, missile: 'Saltwater Crocodile' });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      updateSelectBoxCore.updateSelectBoxCoreCallback({ velocity: { total: Infinity }, missile: Infinity });
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('updateSelectBoxCore.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      updateSelectBoxCore.init();
    };

    expect(callFunction).not.toThrow();
  });
});
