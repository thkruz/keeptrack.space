import * as adviceManager from './adviceManager';

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
    let result: any = adviceManager.showAdvice('test', 'test');
    expect(result).toMatchSnapshot();
  });
});
