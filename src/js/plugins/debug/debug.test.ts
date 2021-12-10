import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as debug from '@app/js/plugins/debug/debug';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('debug.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      debug.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('debug.startGremlins', () => {
  test('0', () => {
    const callFunction: any = () => {
      debug.startGremlins();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('debug.canClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      debug.canClick({ parentElement: { className: 'bmenu-item' } });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      debug.canClick({ parentElement: { className: '' } });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      debug.canClick({ parentElement: { className: 'bmenu-item!' } });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      debug.canClick({ parentElement: { className: 'Customer Metrics Consultant' } });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      debug.canClick({ parentElement: { className: 'National Infrastructure Supervisor' } });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      debug.canClick({ parentElement: { className: 'Principal Implementation Strategist' } });
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      debug.canClick({ parentElement: { className: 'menu-item' } });
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('debug.getRandomInt', () => {
  test('0', () => {
    const callFunction: any = () => {
      debug.getRandomInt(0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      debug.getRandomInt(0, -100);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      debug.getRandomInt(0, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      debug.getRandomInt(100, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      debug.getRandomInt(-1, -1);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      debug.getRandomInt(NaN, NaN);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      debug.getRandomInt(-1, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      debug.getRandomInt(1, 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    const callFunction: any = () => {
      debug.getRandomInt(-100, 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    const callFunction: any = () => {
      debug.getRandomInt(0, -1);
    };

    expect(callFunction).not.toThrow();
  });

  test('10', () => {
    const callFunction: any = () => {
      debug.getRandomInt(0.1, -1);
    };

    expect(callFunction).not.toThrow();
  });

  test('11', () => {
    const callFunction: any = () => {
      debug.getRandomInt(Infinity, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('debug.defaultPositionSelector', () => {
  test('0', () => {
    const callFunction: any = () => {
      debug.defaultPositionSelector();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('debug.runGremlins', () => {
  test('0', () => {
    const callFunction: any = () => {
      debug.runGremlins();
    };

    expect(callFunction).not.toThrow();
  });
});
