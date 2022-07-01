import * as adviceManager from './adviceManager';

// @ponicode
describe('adviceManager.onReady', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.onReady();
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    adviceManager.init();
    let result: any = adviceManager.onReady(true);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.welcome', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.welcome();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.findIss', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.findIss();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.showSensors', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.showSensors();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.useLegend', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.useLegend();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.togleNight', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.togleNight();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.missileMenu', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.missileMenu();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.satelliteSelected', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.satelliteSelected();
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    let result: any = () => {
      adviceManager.init();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
      adviceManager.satelliteSelected();
    };
    expect(result()).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.countries', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.countries();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.colorScheme', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.colorScheme();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.customSensors', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.customSensors();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.cspocSensors', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.cspocSensors();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.mwSensors', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.mwSensors();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.planetariumDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.planetariumDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.satViewDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.satViewDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.mapDIsabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.mapDIsabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.lookanglesDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.lookanglesDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.ssnLookanglesDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.ssnLookanglesDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.survFenceDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.survFenceDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.bubbleDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.bubbleDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.sensorInfoDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.sensorInfoDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.editSatDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.editSatDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.breakupDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.breakupDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.satFovDisabled', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.satFovDisabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.sensor', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.sensor();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = () => {
      adviceManager.sensor();
      adviceManager.sensor();
      adviceManager.sensor();
      adviceManager.sensor();
      adviceManager.sensor();
      adviceManager.sensor();
      adviceManager.sensor();
    };
    expect(result()).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.isEnabled', () => {
  test('0', () => {
    adviceManager.init();
    adviceManager.on();
    let result: any = adviceManager.isEnabled();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    adviceManager.init();
    adviceManager.off();
    let result: any = adviceManager.isEnabled();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.on', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.on();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.off', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.off();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.clearAdvice', () => {
  test('0', () => {
    adviceManager.init();
    let result: any = adviceManager.clearAdvice();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('adviceManager.showAdvice', () => {
  beforeAll(() => {
    adviceManager.init();
    adviceManager.on();
  });
  test('0', () => {
    let result: any = adviceManager.showAdvice('test', 'test', null, 'top-left');
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    let result: any = adviceManager.showAdvice('test', 'test', null, 'left');
    expect(result).toMatchSnapshot();
  });
  test('2', () => {
    let result: any = adviceManager.showAdvice('test', 'test', null, 'bottom-left');
    expect(result).toMatchSnapshot();
  });
  test('3', () => {
    let result: any = adviceManager.showAdvice('test', 'test', null, 'top-right');
    expect(result).toMatchSnapshot();
  });
  test('4', () => {
    let result: any = adviceManager.showAdvice('test', 'test', null, 'right');
    expect(result).toMatchSnapshot();
  });
  test('5', () => {
    let result: any = adviceManager.showAdvice('test', 'test', null, 'bottom-right');
    expect(result).toMatchSnapshot();
  });
  test('6', () => {
    let result: any = adviceManager.showAdvice('test', 'test', null, 'bottom');
    expect(result).toMatchSnapshot();
  });
  test('7', () => {
    document.body.innerHTML = '<div id="test"></div>';
    let result: any = adviceManager.showAdvice('test', 'test', document.querySelector('body'), 'bottom');
    adviceManager.clearAdvice();
    expect(result).toMatchSnapshot();
  });
});
