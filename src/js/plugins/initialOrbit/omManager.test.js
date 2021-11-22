/* eslint-disable no-undefined */
import { _jday, _arctan2, _dayOfYear, _pad0, _sv2kp, _propagate } from './omManager';
// @ponicode
describe('omManager._jday', () => {
  test('0', () => {
    let callFunction = () => {
      _jday(0.0, 90, 1, 0.0, -10, 1.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _jday(10, 0.0, 0, 10, 'December', -10);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _jday(1, 1, 29, 0, 'December', 0.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _jday(10, 1, 10, 0.0, 0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _jday(-1, -1, 0, -10, 0, -0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _jday(NaN, undefined, undefined, undefined, undefined, undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._arctan2', () => {
  test('0', () => {
    let callFunction = () => {
      _arctan2(0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _arctan2(0, 0.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _arctan2(0, 10);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _arctan2(1, 90);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _arctan2(0, 410);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _arctan2(-Infinity, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._dayOfYear', () => {
  test('0', () => {
    let callFunction = () => {
      _dayOfYear(-5.48, 0.0, 56784, 10, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _dayOfYear(-1, 28, 0, 'December', 10.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _dayOfYear(0, 0.0, 10, 0.0, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _dayOfYear(0, 0, 0.0, 'July', 10);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _dayOfYear(-1, 1, 12345, 1, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _dayOfYear(-Infinity, -Infinity, -Infinity, -Infinity, undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._pad0', () => {
  test('0', () => {
    let callFunction = () => {
      _pad0({ length: 10 }, -1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _pad0({ length: 0 }, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _pad0({ length: 64 }, 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _pad0({ length: 256 }, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _pad0({ length: 64 }, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _pad0(undefined, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._sv2kp', () => {
  test('0', () => {
    let param3 = [-1, ['41.1994', '-115.9206'], 1, 10, 0, 1, ['-19.3366', '-46.1477'], 1, -1, 1, -10, -10, 0, 1, 0, ['41.1994', '-115.9206'], -1, 0.0, 0.0, ['-19.3366', '-46.1477']];
    let callFunction = () => {
      _sv2kp(
        1,
        'Apt. 716',
        param3,
        'kg',
        'M_Earth',
        [
          'Edmond',
          'George',
          'George',
          'Jean-Philippe',
          'Edmond',
          'Anas',
          'Edmond',
          'Michael',
          'Pierre Edouard',
          'Edmond',
          'Anas',
          'Edmond',
          'George',
          'Edmond',
          'Pierre Edouard',
          'Pierre Edouard',
          'Jean-Philippe',
          'Michael',
          'Jean-Philippe',
          'Jean-Philippe',
        ],
        'bed-free@tutanota.de',
        undefined
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let param3 = [-10, 0.0, 0.0, 0, 0.0, -10, 0, 0.0, 0.0, 10, 0, 1, 10, -10, 10, ['39.2233', '-78.8613'], 10, -10, -1, -10];
    let callFunction = () => {
      _sv2kp(
        1,
        -1,
        param3,
        'Masai Lion',
        'Asiatic Lion',
        [
          'Edmond',
          'Michael',
          'George',
          'Pierre Edouard',
          'Anas',
          'Jean-Philippe',
          'George',
          'Pierre Edouard',
          'Jean-Philippe',
          'Anas',
          'Edmond',
          'Anas',
          'Pierre Edouard',
          'Edmond',
          'George',
          'Pierre Edouard',
          'Michael',
          'George',
          'Michael',
          'Jean-Philippe',
        ],
        'user@host:300',
        'm'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let param3 = [0, 0.0, 1, 1, -1, 10, 10, -10, -1, -10, -10, 1, 0, -10, 1, 1, 1, 1, 0, ['-84.8577', '134.8560']];
    let callFunction = () => {
      _sv2kp(
        "Boston's most advanced compression wear technology increases muscle oxygenation, stabilizes active muscles",
        -1,
        param3,
        'Asiatic Lion',
        'Masai Lion',
        [
          'Michael',
          'Pierre Edouard',
          'Pierre Edouard',
          'Edmond',
          'Jean-Philippe',
          'George',
          'Jean-Philippe',
          'Edmond',
          'Edmond',
          'George',
          'Michael',
          'Anas',
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Pierre Edouard',
          'Michael',
          'Michael',
        ],
        'km',
        'm'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let param3 = [1, -10, 0.0, 0.0, ['41.1994', '-115.9206'], -1, 0.0, -10, -1, 0.0, 1, 10, 0, -1, 10, -1, 0, 0.0, 1, ['39.2233', '-78.8613']];
    let callFunction = () => {
      _sv2kp(
        'The Apollotech B340 is an affordable wireless mouse with reliable connectivity, 12 months battery life and modern design',
        10,
        param3,
        'Transvaal lion',
        'Asiatic Lion',
        [
          'Jean-Philippe',
          'Michael',
          'Edmond',
          'Anas',
          'Edmond',
          'Pierre Edouard',
          'Edmond',
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Jean-Philippe',
          'Michael',
          'Jean-Philippe',
          'Pierre Edouard',
          'Michael',
          'Jean-Philippe',
          'Jean-Philippe',
          'George',
          'Pierre Edouard',
          'Edmond',
        ],
        'km',
        'Foo bar'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let param3 = [['41.1994', '-115.9206'], -10, 1, 0, 0, 0, ['-84.8577', '134.8560'], -10, 0, 1, 1, 1, 10, 10, 1, 0.0, 10, -10, -1, -1];
    let callFunction = () => {
      _sv2kp(
        0,
        0.0,
        param3,
        undefined,
        'M_Earth',
        [
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Anas',
          'Jean-Philippe',
          'Anas',
          'Edmond',
          'George',
          'Pierre Edouard',
          'Pierre Edouard',
          'George',
          'Anas',
          'Jean-Philippe',
          'George',
          'Edmond',
          'Pierre Edouard',
          'Edmond',
          'George',
          'Michael',
          'Anas',
        ],
        'something.example.com',
        'm'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _sv2kp(Infinity, undefined, [], '', undefined, [], '', '');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._propagate', () => {
  test('0', async () => {
    await _propagate(
      410,
      100,
      { getUTCMonth: () => 1, getUTCMilliseconds: () => 520, getUTCFullYear: () => true, getUTCDate: () => '01-13-2020', getUTCHours: () => 56784, getUTCMinutes: () => 75, getUTCSeconds: () => 243 },
      { twoline2satrec: () => 'Nile Crocodile', sgp4: () => 100 }
    );
  });

  test('1', async () => {
    await _propagate(
      380,
      1,
      { getUTCMonth: () => 28, getUTCMilliseconds: () => 380, getUTCFullYear: () => false, getUTCDate: () => '32-01-2020', getUTCHours: () => 'bc23a9d531064583ace8f67dad60f6bb', getUTCMinutes: () => 75, getUTCSeconds: () => 161 },
      { twoline2satrec: () => 'Spectacled Caiman', sgp4: () => -100 }
    );
  });

  test('2', async () => {
    await _propagate(
      100,
      -5.48,
      { getUTCMonth: () => 0, getUTCMilliseconds: () => 410, getUTCFullYear: () => false, getUTCDate: () => '01-13-2020', getUTCHours: () => 987650, getUTCMinutes: () => 5, getUTCSeconds: () => 161 },
      { twoline2satrec: () => 'Saltwater Crocodile', sgp4: () => 0 }
    );
  });

  test('3', async () => {
    await _propagate(
      320,
      -5.48,
      { getUTCMonth: () => 3, getUTCMilliseconds: () => 30, getUTCFullYear: () => true, getUTCDate: () => '01-01-2030', getUTCHours: () => 'bc23a9d531064583ace8f67dad60f6bb', getUTCMinutes: () => 25, getUTCSeconds: () => 241 },
      { twoline2satrec: () => 'Nile Crocodile', sgp4: () => -5.48 }
    );
  });

  test('4', async () => {
    await _propagate(
      100,
      -100,
      { getUTCMonth: () => 0, getUTCMilliseconds: () => 320, getUTCFullYear: () => false, getUTCDate: () => '32-01-2020', getUTCHours: () => 'bc23a9d531064583ace8f67dad60f6bb', getUTCMinutes: () => 75, getUTCSeconds: () => 127 },
      { twoline2satrec: () => 'Saltwater Crocodile', sgp4: () => -100 }
    );
  });

  test('5', async () => {
    await _propagate(-Infinity, -Infinity, {}, undefined);
  });
});
