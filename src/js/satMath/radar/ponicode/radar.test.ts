import * as radar from '@app/js/satMath/radar/radar';
// @ponicode
describe('radar.radarMinSignal', () => {
  test('0', () => {
    let result: any = radar.radarMinSignal(-100, 100, 0.0, 4.0, 10.23);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = radar.radarMinSignal(1, -100, 0.0, 5.0, 10.0);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = radar.radarMinSignal(-100, -5.48, 10.0, 4, 10.0);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = radar.radarMinSignal(0, 0, -0.5, 4, -29.45);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = radar.radarMinSignal(-5.48, -5.48, 1.0, 4.0, 0.5);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = radar.radarMinSignal(Infinity, Infinity, Infinity, Infinity, Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('radar.radarMaxrng', () => {
  test('0', () => {
    let result: any = radar.radarMaxrng(-100, 100, 10.23, 31, -1.0);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = radar.radarMaxrng(100, -100, 10.23, 29, 1.0);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = radar.radarMaxrng(1, 0, -29.45, 31.0, 0.5);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = radar.radarMaxrng(-5.48, 1, 0.0, 29, 0.5);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = radar.radarMaxrng(100, 0, 10.0, 31, -0.5);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = radar.radarMaxrng(-Infinity, -Infinity, -Infinity, -Infinity, -Infinity);
    expect(result).toMatchSnapshot();
  });
});
