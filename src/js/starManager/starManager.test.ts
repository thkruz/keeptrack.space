/* eslint-disable no-undefined */
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../api/apiMocks';
import { KeepTrackPrograms } from './../api/keepTrackTypes';
import * as starManager from './starManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('starManager.init', () => {
  test('0', () => {
    let callFunction = () => {
      starManager.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('starManager.clearConstellations', () => {
  test('0', () => {
    let callFunction = () => {
      starManager.clearConstellations();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('starManager.drawConstellations', () => {
  test('0', () => {
    let callFunction = () => {
      starManager.drawConstellations('Piscis Austrinus');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      starManager.drawConstellations(undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('starManager.drawAllConstellations', () => {
  test('0', () => {
    let callFunction = () => {
      starManager.drawAllConstellations();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('starManager.findStarsConstellation', () => {
  test('0', () => {
    let callFunction = () => {
      starManager.findStarsConstellation('fakeData');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      starManager.findStarsConstellation('12345');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      starManager.findStarsConstellation('12');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      starManager.findStarsConstellation('56784');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      starManager.findStarsConstellation('fakeData');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      starManager.findStarsConstellation(undefined);
    };

    expect(callFunction).not.toThrow();
  });
});
