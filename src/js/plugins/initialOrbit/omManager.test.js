const omManager = require('./omManager');
// @ponicode
describe('omManager._jday', () => {
  test('0', () => {
    let callFunction = () => {
      omManager._jday(0.0, 90, 1, 0.0, -10, 1.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      omManager._jday(10, 0.0, 0, 10, 'December', -10);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      omManager._jday(1, 1, 29, 0, 'December', 0.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      omManager._jday(10, 1, 10, 0.0, 0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      omManager._jday(-1, -1, 0, -10, 0, -0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      omManager._jday(NaN, undefined, undefined, undefined, undefined, undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._arctan2', () => {
  test('0', () => {
    let callFunction = () => {
      omManager._arctan2(0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      omManager._arctan2(0, 0.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      omManager._arctan2(0, 10);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      omManager._arctan2(1, 90);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      omManager._arctan2(0, 410);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      omManager._arctan2(-Infinity, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._dayOfYear', () => {
  test('0', () => {
    let callFunction = () => {
      omManager._dayOfYear(-5.48, 0.0, 56784, 10, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      omManager._dayOfYear(-1, 28, 0, 'December', 10.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      omManager._dayOfYear(0, 0.0, 10, 0.0, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      omManager._dayOfYear(0, 0, 0.0, 'July', 10);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      omManager._dayOfYear(-1, 1, 12345, 1, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      omManager._dayOfYear(-Infinity, -Infinity, -Infinity, -Infinity, undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._pad0', () => {
  test('0', () => {
    let callFunction = () => {
      omManager._pad0({ length: 10 }, -1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      omManager._pad0({ length: 0 }, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      omManager._pad0({ length: 64 }, 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      omManager._pad0({ length: 256 }, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      omManager._pad0({ length: 64 }, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      omManager._pad0(undefined, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._sv2kp', () => {
  test('0', () => {
    let callFunction = () => {
      omManager._sv2kp(
        1,
        'Apt. 716',
        [-1, ['41.1994', '-115.9206'], 1, 10, 0, 1, ['-19.3366', '-46.1477'], 1, -1, 1, -10, -10, 0, 1, 0, ['41.1994', '-115.9206'], -1, 0.0, 0.0, ['-19.3366', '-46.1477']],
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
    let callFunction = () => {
      omManager._sv2kp(
        1,
        -1,
        [-10, 0.0, 0.0, 0, 0.0, -10, 0, 0.0, 0.0, 10, 0, 1, 10, -10, 10, ['39.2233', '-78.8613'], 10, -10, -1, -10],
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
    let callFunction = () => {
      omManager._sv2kp(
        "Boston's most advanced compression wear technology increases muscle oxygenation, stabilizes active muscles",
        -1,
        [0, 0.0, 1, 1, -1, 10, 10, -10, -1, -10, -10, 1, 0, -10, 1, 1, 1, 1, 0, ['-84.8577', '134.8560']],
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
    let callFunction = () => {
      omManager._sv2kp(
        'The Apollotech B340 is an affordable wireless mouse with reliable connectivity, 12 months battery life and modern design',
        10,
        [1, -10, 0.0, 0.0, ['41.1994', '-115.9206'], -1, 0.0, -10, -1, 0.0, 1, 10, 0, -1, 10, -1, 0, 0.0, 1, ['39.2233', '-78.8613']],
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
    let callFunction = () => {
      omManager._sv2kp(
        0,
        0.0,
        [['41.1994', '-115.9206'], -10, 1, 0, 0, 0, ['-84.8577', '134.8560'], -10, 0, 1, 1, 1, 10, 10, 1, 0.0, 10, -10, -1, -1],
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
      omManager._sv2kp(Infinity, undefined, [], '', undefined, [], '', '');
    };

    expect(callFunction).not.toThrow();
  });
});
