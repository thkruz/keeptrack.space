import * as starManager from './starManager';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '../api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
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
      starManager.drawConstellations('rgb(20%,10%,30%)');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      starManager.drawConstellations('#FF00FF');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      starManager.drawConstellations('black');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      starManager.drawConstellations('#F00');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      starManager.drawConstellations('rgb(0,100,200)');
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
      starManager.findStarsConstellation('bc23a9d531064583ace8f67dad60f6bb');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      starManager.findStarsConstellation(12345);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      starManager.findStarsConstellation(12);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      starManager.findStarsConstellation(56784);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      starManager.findStarsConstellation('a1969970175');
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
