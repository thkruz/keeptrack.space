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
