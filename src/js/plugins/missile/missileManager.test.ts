import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as missileManager from '../../plugins/missile/missileManager';
/* eslint-disable no-undefined */

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('missileManager._Pressure', () => {
  test('0', () => {
    let callFunction: any = () => {
      missileManager._Pressure(0.1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      missileManager._Pressure(0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      missileManager._Pressure(1.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      missileManager._Pressure(10.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      missileManager._Pressure(2.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      missileManager._Pressure(NaN);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('missileManager._Temperature', () => {
  test('0', () => {
    let callFunction: any = () => {
      missileManager._Temperature(90);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      missileManager._Temperature(66.25);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      missileManager._Temperature(115.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      missileManager._Temperature(12.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      missileManager._Temperature(33.75);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      missileManager._Temperature(Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('missileManager._CD', () => {
  test('0', () => {
    let callFunction: any = () => {
      missileManager._CD(550);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      missileManager._CD(100);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      missileManager._CD(0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      missileManager._CD(1.1875);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      missileManager._CD(3.625);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      missileManager._CD(-Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('missileManager._CoordinateCalculator', () => {
  test('0', () => {
    let callFunction: any = () => {
      missileManager._CoordinateCalculator(-5.48, 56784, 12, 56784);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      missileManager._CoordinateCalculator(100, 12345, 12345, 12);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      missileManager._CoordinateCalculator(1, 987650, 12345, 12);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      missileManager._CoordinateCalculator(100, 12345, 987650, 12345);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      missileManager._CoordinateCalculator(1, 1238, 35, 56784);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      missileManager._CoordinateCalculator(NaN, NaN, NaN, NaN);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('missileManager._IterationFun', () => {
  test('0', () => {
    let callFunction: any = () => {
      missileManager._IterationFun(100, 0, 987650, 1.0, 61, 50, -100, 100, 6370000, 0, 5, 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      missileManager._IterationFun(100, 0, 46, 0.5, 1234, 410, 0, -100, 5000.0, 12345, 18, 2000.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      missileManager._IterationFun(100, 1200001, 56784, 1.0, 38, 70, -5.48, 100, 2000.0, 56784, 18, 9999);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      missileManager._IterationFun(0, 100, 12345, 0.1, 12, 350, 0, -5.48, 0.01, 12345, 5, 1000);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      missileManager._IterationFun(100, 1200001, 12, 0.1, 5431, 4, 0, 0, 9999, 658, 18, 1000);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      missileManager._IterationFun(-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('missileManager._Bisection', () => {
  test('0', () => {
    let callFunction: any = () => {
      missileManager._Bisection(50, 100, 70, 0, 12345, 1.0, 56784, 12, 12345, 30, 0, 0, 100, 123, 35, 1.0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      missileManager._Bisection(410, -5.48, 350, 56784, 12345, 2.0, 12, 12, 987650, 100, 100, 0, 5000.0, 5, 35, 1.0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      missileManager._Bisection(50, 100, 4, 56784, 12, 10.0, 6, 56784, 12, 520, -100, 0, 100.0, 12345, 18, 10.0, 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      missileManager._Bisection(30, 100, 50, 12, 12, 10.0, 1, 0, 0, 410, 1, 0, 6370000, 12345, 75, 0.0, 100.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      missileManager._Bisection(70, 0, 350, 1, 0, 1.0, 987650, 987650, 56784, 50, -100, -100, 3500.0, 12, 75, -0.5, 1000);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      missileManager._Bisection(-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('missileManager.MassRaidPre', () => {
  test('0', () => {
    let result: any = missileManager.MassRaidPre(6, 'm2v');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = missileManager.MassRaidPre(1.0, 'mpe');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = missileManager.MassRaidPre(6, 'mpe');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = missileManager.MassRaidPre(200, 'pdf');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = missileManager.MassRaidPre(1.0, 'pdf');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = missileManager.MassRaidPre(Infinity, '');
    expect(result).toMatchSnapshot();
  });
});
