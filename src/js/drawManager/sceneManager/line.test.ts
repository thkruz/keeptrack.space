import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import * as line from '@app/js/drawManager/sceneManager/line';
// @ponicode
describe('set', () => {
  let inst: any;

  beforeEach(() => {
    inst = new line.Line(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.orbitManager.shader);
  });

  test('0', () => {
    let result: any = inst.set([1000, 2000, -1000], [-1000, -2000, -1000]);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('draw', () => {
  let inst: any;

  beforeEach(() => {
    inst = new line.Line(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.orbitManager.shader);
  });

  test('0', () => {
    let result: any = inst.draw([0, 100, 0, 0]);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });
});
