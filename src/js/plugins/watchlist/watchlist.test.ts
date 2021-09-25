import * as watchlist from '@app/js/plugins/watchlist/watchlist';

import { defaultSat, defaultSensor, keepTrackApiStubs } from '@app/js/api/apiMocks';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('watchlist.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('watchlist.updateWatchlist', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.updateWatchlist();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('watchlist.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.updateLoop', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.updateLoop();
      watchlist.updateWatchlist([25544]);
      watchlist.updateLoop();
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      keepTrackApi.programs.sensorManager.currentSensorMultiSensor = true;
      keepTrackApi.programs.sensorManager.currentSensorList = [defaultSensor, defaultSensor];
      watchlist.updateLoop();
      watchlist.updateWatchlist([25544]);
      watchlist.updateLoop();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.bottomMenuClick', () => {
  keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
  watchlist.init();
  test('0', () => {
    let callFunction: any = () => {
      watchlist.bottomMenuClick('menu-watchlist');
      watchlist.bottomMenuClick('menu-watchlist');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      watchlist.updateWatchlist([25544]);
      watchlist.bottomMenuClick('menu-watchlist');
      watchlist.bottomMenuClick('menu-watchlist');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      document.body.innerHTML = '<div id="info-overlay-content"></div>';
      watchlist.bottomMenuClick('menu-info-overlay');
      watchlist.bottomMenuClick('menu-info-overlay');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      document.body.innerHTML = '<div id="info-overlay-content"></div>';
      watchlist.updateWatchlist([25544]);
      watchlist.bottomMenuClick('menu-info-overlay');
      watchlist.bottomMenuClick('menu-info-overlay');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      watchlist.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
      watchlist.bottomMenuClick('menu-info-overlay');
      watchlist.bottomMenuClick('menu-info-overlay');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.onCruncherReady', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.onCruncherReady();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('watchlist.hideSideMenus', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('watchlist.pushOverlayElement', () => {
  const nextPassArray = [defaultSat, defaultSat];
  test('0', () => {
    let callFunction: any = () => {
      watchlist.pushOverlayElement(keepTrackApi.programs.satSet, nextPassArray, 0, 'Lights', [false, '^5.0.0', 'bc23a9d531064583ace8f67dad60f6bb', '^5.0.0', 987650]);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      watchlist.pushOverlayElement(keepTrackApi.programs.satSet, nextPassArray, 3, 'Port', [true, '1.0.0', 56784, '^5.0.0', 56784]);
    };

    expect(callFunction).toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      watchlist.pushOverlayElement(keepTrackApi.programs.satSet, nextPassArray, 0, false, [true]);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      watchlist.pushOverlayElement(NaN, nextPassArray, NaN, '', []);
    };

    expect(callFunction).toThrow();
  });
});

describe('watchlist.infoOverlayContentClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.infoOverlayContentClick({
        currentTarget: {
          textContent: '25544:25544'
        }
      });
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.watchlistListClick', () => {
  test('0', () => {
    let callFunction: any = () => {      
      watchlist.watchlistListClick(25544);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.watchlistContentEvent', () => {
  test('0', () => {
    let callFunction: any = () => {      
      watchlist.watchlistContentEvent(new Event('submit'), 25544);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {      
      watchlist.watchlistContentEvent(null, 25544);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.watchlistSaveClick', () => {
  // NOTE: saveAs doesn't work in test mode, but it should throw an error properly
  test('0', () => {
    let callFunction: any = () => {
      watchlist.watchlistSaveClick(new Event('click'));
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.watchlistFileChange', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.watchlistFileChange(null);
    };

    expect(callFunction).toThrow();
  });
});

describe('watchlist.watchListReaderOnLoad', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.watchListReaderOnLoad(null);
    };

    expect(callFunction).toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      const evt = {
        target: {
          readyState: 4,
        }
      }
      watchlist.watchListReaderOnLoad(evt);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      const evt = {
        target: {
          readyState: 2,
          error: 'error',
        }
      }
      watchlist.watchListReaderOnLoad(evt);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      const evt = {
        target: {
          readyState: 2,
          result: '[25544,25544]',
        }
      }
      watchlist.watchListReaderOnLoad(evt);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      const evt = {
        target: {
          readyState: 2,
          result: '25@@544,25544]',
        }
      }
      watchlist.watchListReaderOnLoad(evt);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      const evt = {
        target: {
          readyState: 2,
          result: '',
        }
      }
      watchlist.watchListReaderOnLoad(evt);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('watchlist.menuSelectableClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      watchlist.menuSelectableClick();
    };

    expect(callFunction).not.toThrow();
  });
});
