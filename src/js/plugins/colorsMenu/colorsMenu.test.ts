import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as colorsMenu from './colorsMenu';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('colorsMenu.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('colorsMenu.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('colorsMenu.rightBtnMenuAdd', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.rightBtnMenuAdd();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('colorsMenu.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('colorsMenu.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('menu-color-scheme');
      colorsMenu.bottomMenuClick('menu-color-scheme');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('colorsMenu.colorsMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('default');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('velocity');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('sunlight');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('near-earth');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('deep-space');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('elset-age');
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      document.body.innerHTML = `<input id="search" value="1"></input>`;
      colorsMenu.colorsMenuClick('lost-objects');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('rcs');
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('smallsats');
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('countries');
    };

    expect(callFunction).not.toThrow();
  });

  test('10', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('colorsMenu.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('menu-color-scheme');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      colorsMenu.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('colorsMenu.colorsMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('velocity');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('elset-age');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('lost-objects');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('smallsats');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('default');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      colorsMenu.colorsMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
