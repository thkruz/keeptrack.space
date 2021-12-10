import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as settingsMenu from '@app/js/plugins/settingsMenu/settingsMenu';
import { expect } from '@jest/globals';
/* eslint-disable no-undefined */

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('settingsMenu.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      settingsMenu.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('settingsMenu.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      settingsMenu.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('settingsMenu.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('fake');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('menu-settings');
      settingsMenu.bottomMenuClick('menu-settings');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('settingsMenu.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      settingsMenu.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('settingsMenu.onColorSelected', () => {
  test('0', () => {
    const callFunction: any = () => {
      settingsMenu.onColorSelected({ element: { css: () => true }, color: '[1.0, 1.0, 1.0, 1.0]' }, 'debris');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      settingsMenu.onColorSelected(null, 'debris');
    };

    expect(callFunction).toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      settingsMenu.onColorSelected({ element: { css: () => true }, color: '[1.0, 1.0, 1.0, 1.0]' }, null);
    };

    expect(callFunction).toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      settingsMenu.onColorSelected({ element: { css: () => true }, color: '[2.0.2, 2.0.2, 2.0.2, 2.0.2]' }, undefined);
    };

    expect(callFunction).toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      settingsMenu.onColorSelected({ element: { css: () => true }, color: '[1.0, 1.0, 1.0, 1>.0]' }, 'debris');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      settingsMenu.onColorSelected({ element: { css: () => false }, color: '#FF00FF' }, 'white');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('settingsMenu.settingsFormChange', () => {
  test('0', () => {
    const callFunction: any = () => {
      document.body.innerHTML = '<div id="left-menus"></div>';
      settingsMenu.uiManagerInit(); // Need the HTML to be loaded

      settingsMenu.settingsFormChange({ target: { id: 'settings-demo-mode' } }, false, true);
      settingsMenu.settingsFormChange({ target: { id: 'settings-sat-label-mode' } }, true);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      settingsMenu.settingsFormChange(null);
    };

    expect(callFunction).toThrow();
  });
});

describe('settingsMenu.settingsFormSubmit', () => {
  test('0', () => {
    const callFunction: any = () => {
      document.body.innerHTML = '<div id="left-menus"></div>';
      settingsMenu.uiManagerInit(); // Need the HTML to be loaded

      settingsMenu.settingsFormSubmit({ preventDefault: () => true }, false, false, false, false);
      settingsMenu.settingsFormSubmit({ preventDefault: () => true }, true, true, true, true);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      settingsMenu.settingsFormSubmit(null);
    };

    expect(callFunction).toThrow();
  });
});

describe('settingsMenu.settingsRisesetChange', () => {
  test('0', () => {
    const callFunction: any = () => {
      document.body.innerHTML = '<div id="left-menus"></div>';
      settingsMenu.uiManagerInit(); // Need the HTML to be loaded

      settingsMenu.settingsRisesetChange({ preventDefault: () => true }, false);
      settingsMenu.settingsRisesetChange({ preventDefault: () => true }, true);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      settingsMenu.settingsRisesetChange(null);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('settingsMenu.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('menu-settings');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      settingsMenu.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('settingsMenu.settingsFormChange', () => {
  test('0', () => {
    const callFunction: any = () => {
      settingsMenu.settingsFormChange({ target: false }, true, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      settingsMenu.settingsFormChange({ target: false }, true, true);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      settingsMenu.settingsFormChange(false, false, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      settingsMenu.settingsFormChange('user1+user2@mycompany.com', false, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      settingsMenu.settingsFormChange(undefined, false, false);
    };

    expect(callFunction).toThrow();
  });
});
