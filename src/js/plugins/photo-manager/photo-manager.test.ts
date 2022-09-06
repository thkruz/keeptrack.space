import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as photoManager from '@app/js/plugins/photo-manager/photo-manager';
import { expect } from '@jest/globals';
/* eslint-disable camelcase */

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('photoManager.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.dscovrLoaded', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: 429 });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: 100 });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const object: any = [{ image: 'test', centroid_coordinates: { lat: 0, long: 0 }, identifier: '123456789123456789' }];
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: 200, response: JSON.stringify(object) });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ response: -Infinity });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const object: any = [{ image: 'test{', centroid_coordinates: { lat: 0, long: 0 }, identifier: '1234567891#23456789' }];
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: 200, response: JSON.stringify(object) });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const object: any = [{ image: 'test', centroid_coordinates: { lat: 0.1, long: 0.1 }, identifier: '135802468035802469' }];
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: 220, response: JSON.stringify(object) });
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      photoManager.dscovrLoaded('fakeData');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: 500 });
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: 400 });
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    const callFunction: any = () => {
      photoManager.dscovrLoaded({ status: -Infinity });
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.meteosat11', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.meteosat11();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.meteosat8', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.meteosat8();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.goes1', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.goes1();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.himawari8', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.himawari8();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.colorbox', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.colorbox('https://croplands.org/app/a/confirm?t=');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      photoManager.colorbox('http://base.com');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      photoManager.colorbox('https://api.telegram.org/bot');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      photoManager.colorbox('www.google.com');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      photoManager.colorbox('http://www.croplands.org/account/confirm?t=');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      photoManager.colorbox('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('photoManager.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('menu-sat-photo');
      photoManager.bottomMenuClick('menu-sat-photo');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.discovr', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.discovr();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('photoManager.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('menu-sat-photo');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      photoManager.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
