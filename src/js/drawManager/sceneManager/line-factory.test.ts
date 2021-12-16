import { defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms, SatObject } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import * as lineManager from './line-factory';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('drawWhenSelected', () => {
  let inst: any;

  beforeEach(() => {
    inst = new lineManager.LineFactory();
  });

  test('0', () => {
    let result: any = inst.drawWhenSelected();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    inst.drawLineList = [{ isDrawWhenSelected: true }];
    let result: any = inst.drawWhenSelected();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    inst.drawLineList = [{ isDrawWhenSelected: false }];
    let result: any = inst.drawWhenSelected();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('clear', () => {
  let inst: any;

  beforeEach(() => {
    inst = new lineManager.LineFactory();
  });

  test('0', () => {
    let result: any = inst.clear();
    expect(result).toMatchSnapshot();
  });
});

describe('removeStars', () => {
  let inst: any;

  beforeEach(() => {
    inst = new lineManager.LineFactory();
  });

  test('0', () => {
    inst.drawLineList = [{ sat: { type: SpaceObjectType.STAR } }];
    let result: any = inst.removeStars();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    inst.drawLineList = [{ sat2: { type: SpaceObjectType.STAR } }];
    let result: any = inst.removeStars();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    inst.drawLineList = [{ sat2: { type: SpaceObjectType.PAYLOAD } }];
    let result: any = inst.removeStars();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('getLineListLen', () => {
  let inst: any;

  beforeEach(() => {
    inst = new lineManager.LineFactory();
  });

  test('0', () => {
    let result: any = inst.getLineListLen();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('draw', () => {
  let inst: any;

  beforeEach(() => {
    inst = new lineManager.LineFactory();
  });

  test('0', () => {
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    inst.create('sat', 25544);
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    inst.create('sat3', [25544, 5]);
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    inst.create('sat3', [25544, 5]);
    inst.drawLineList[0].sat2 = defaultSensor;
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    inst.create('scan', [25544, 5]);
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    inst.create('scan2', [25544, 5]);
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    inst.create('ref2', [1000, 1000, 1000, -1000, -1000, -1000]);
    let result: any = inst.draw();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('create', () => {
  let inst: any;

  beforeEach(() => {
    inst = new lineManager.LineFactory();
  });

  test('0', () => {
    let result: any = inst.create('scan2', [64, 'elio@example.com'], [-5.48, -5.48, -5.48, -100]);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = inst.create('scan2', [64, 'Dillenberg'], [-5.48, 1, -5.48, 100]);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = inst.create('misl', ['_Elio', true, false, false, 256], 'o');
    expect(result).toMatchSnapshot();
  });

  test('Check Color Options', () => {
    let result: any = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'r');
    expect(result).toMatchSnapshot();
    result = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'o');
    expect(result).toMatchSnapshot();
    result = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'y');
    expect(result).toMatchSnapshot();
    result = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'g');
    expect(result).toMatchSnapshot();
    result = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'b');
    expect(result).toMatchSnapshot();
    result = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'c');
    expect(result).toMatchSnapshot();
    result = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'p');
    expect(result).toMatchSnapshot();
    result = inst.create('Sat', ['@elio@example.com', true, true, false, 0], 'w');
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result = inst.create('ref', [32, false, 'Dillenberg']);
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    let result = inst.create('sat', 25544);
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    let result = inst.create('sat2', [25544, 10, 10, 10]);
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result = inst.create('sat3', [25544, 5]);
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    let result = inst.create('sat4', [25544, 5]);
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    let result = inst.create('sat5', [25544, 5]);
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    let result = inst.create('sat6', [25544, 5]);
    expect(result).toMatchSnapshot();
  });

  test('17', () => {
    let result = inst.create('scan', [25544]);
    expect(result).toMatchSnapshot();
  });

  test('18', () => {
    let result = inst.create('scan2', [25544, 47, 107, 3, 5556]);
    expect(result).toMatchSnapshot();
  });

  test('19', () => {
    let result = inst.create('misl', [25544, 5]);
    expect(result).toMatchSnapshot();
  });

  test('20', () => {
    let result = inst.create('ref', [1000, 1000, 1000]);
    expect(result).toMatchSnapshot();
  });

  test('21', () => {
    let result = inst.create('ref2', [1000, 1000, 1000, -1000, -1000, -1000]);
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    keepTrackApi.programs.satSet.getSat = () => <SatObject>{};
    let result = inst.create('sat', [25544, 5]);
    expect(result).toMatchSnapshot();
    result = inst.create('sat2', [25544, 10, 10, 10]);
    expect(result).toMatchSnapshot();
    result = inst.create('sat3', [25544, 5]);
    expect(result).toMatchSnapshot();
    result = inst.create('sat4', [25544, 5]);
    expect(result).toMatchSnapshot();
    result = inst.create('sat5', [25544, 5]);
    expect(result).toMatchSnapshot();
    result = inst.create('sat6', [25544, 5]);
    expect(result).toMatchSnapshot();
    result = inst.create('scan', [25544]);
    expect(result).toMatchSnapshot();
    result = inst.create('scan2', [25544, 47, 107, 3, 5556]);
    expect(result).toMatchSnapshot();
    result = inst.create('misl', [25544, 5]);
    expect(result).toMatchSnapshot();
    result = inst.create('ref', [1000, 1000, 1000]);
    expect(result).toMatchSnapshot();
    result = inst.create('ref2', [1000, 1000, 1000, -1000, -1000, -1000]);
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.satSet.getSat = keepTrackApiStubs.programs.satSet.getSat;
  });

  test('50', () => {
    const callFunction: any = () => {
      inst.create('ref', [32, false, 'Dillenberg'], [1]);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('updateLineToSat', () => {
  let inst: any;

  beforeEach(() => {
    inst = new lineManager.LineFactory();
  });

  test('0', () => {
    let result = inst.updateLineToSat(10, 10);
    expect(result).toMatchSnapshot();
  });
});
