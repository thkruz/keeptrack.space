import * as photo from '@app/js/plugins/photo/photo';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('photo.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      photo.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.rightBtnMenuAdd', () => {
  test('0', () => {
    let callFunction: any = () => {
      photo.rightBtnMenuAdd();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      photo.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.rmbMenuActions', () => {
  test('0', () => {
    let callFunction: any = () => {
      photo.rmbMenuActions('save-hd-rmb');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      photo.rmbMenuActions('save-4k-rmb');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      photo.rmbMenuActions('save-8k-rmb');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      photo.rmbMenuActions('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.saveHiResPhoto', () => {
  test('0', () => {
    let callFunction: any = () => {
      photo.saveHiResPhoto('4k');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      photo.saveHiResPhoto('hd');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      photo.saveHiResPhoto('8k');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      photo.saveHiResPhoto('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photo.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      photo.bottomMenuClick('menu-photo');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      photo.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
