import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as photo from '@app/js/plugins/photo/photo';
import { expect } from '@jest/globals';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('photo.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      photo.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.rightBtnMenuAdd', () => {
  test('0', () => {
    const callFunction: any = () => {
      photo.rightBtnMenuAdd();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      photo.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.rmbMenuActions', () => {
  test('0', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('save-hd-rmb');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('save-4k-rmb');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('save-8k-rmb');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('save');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    const callFunction: any = () => {
      photo.rmbMenuActions('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.saveHiResPhoto', () => {
  test('0', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('4k');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('hd');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('8k');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('\u000b');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('12345');
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('da7588892');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('9876');
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('hd');
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    const callFunction: any = () => {
      photo.saveHiResPhoto('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('menu-photo');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('@menu-photo');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('\u000b');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('menu-photo');
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      photo.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
