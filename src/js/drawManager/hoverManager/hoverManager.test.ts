import { defaultSat, defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms, SatObject, SettingsManager } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import { drawManager } from '../drawManager';
import * as hoverManager from './hoverManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
declare const settingsManager: SettingsManager;

// @ponicode
describe('hoverManager.hoverBoxOnSat', () => {
  beforeAll(() => {
    document.body.innerHTML = `
    <canvas id="keeptrack-canvas"></canvas>
    <div id="sat-hoverbox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="sat-hoverbox2"></div>
    <div id="sat-hoverbox3"></div>
    <div id="sat-minibox"></div>
    `;
    drawManager.init();
  });
  test('0', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    settingsManager.isDemoModeOn = false;
    let result: any = drawManager.hoverBoxOnSat(25544, 1000, 1000);
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('1', () => {
    let result: any = drawManager.hoverBoxOnSat(-1, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>{ static: true };
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () =>
      <SatObject>(<unknown>{ isRadarData: true, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0 });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () =>
      <SatObject>(<unknown>{ isRadarData: true, missileComplex: 1, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0 });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () =>
      <SatObject>(<unknown>{ isRadarData: true, satId: 1, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0 });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{
        static: true,
        type: SpaceObjectType.CONTROL_FACILITY,
        setRAE: jest.fn(),
        rae: { range: 0, az: 0, el: 0 },
        rcs: '0',
        azError: 0,
        elError: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { total: 0, x: 0, y: 0, z: 0 },
      });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{
        static: true,
        type: SpaceObjectType.STAR,
        setRAE: jest.fn(),
        rae: { range: 0, az: 0, el: 0 },
        rcs: '0',
        azError: 0,
        elError: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { total: 0, x: 0, y: 0, z: 0 },
        ra: 0,
        dec: 0,
      });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{
        missile: true,
        setRAE: jest.fn(),
        rae: { range: 0, az: 0, el: 0 },
        rcs: '0',
        azError: 0,
        elError: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { total: 0, x: 0, y: 0, z: 0 },
      });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{
        satId: 1,
        setRAE: jest.fn(),
        rae: { range: 0, az: 0, el: 0 },
        rcs: '0',
        azError: 0,
        elError: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { total: 0, x: 0, y: 0, z: 0 },
      });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });
});
// @ponicode
describe('hoverManager.updateHover', () => {
  test('0', () => {
    let result: any = hoverManager.updateHover();
    expect(result).toMatchSnapshot();
  });
});

describe('hoverManager.hoverOverNothing', () => {
  beforeAll(() => {
    document.body.innerHTML = `
    <div id="sat-hoverbox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="sat-hoverbox2"></div>
    <div id="sat-hoverbox3"></div>
  `;
    hoverManager.init();
  });
  it('should handle hovering over empty space', () => {
    keepTrackApi.programs.drawManager.isHoverBoxVisible = true;
    keepTrackApi.programs.objectManager.isStarManagerLoaded = true;
    settingsManager.enableHoverOverlay = true;
    let result: boolean = hoverManager.hoverOverNothing();
    expect(result).toBe(true);
  });
  it('should fail if the hover box is not visible', () => {
    keepTrackApi.programs.drawManager.isHoverBoxVisible = false;
    settingsManager.enableHoverOverlay = true;
    let result: boolean = hoverManager.hoverOverNothing();
    expect(result).toBe(false);
  });
  it('should fail if the hover overlay is not enabled', () => {
    keepTrackApi.programs.drawManager.isHoverBoxVisible = true;
    settingsManager.enableHoverOverlay = false;
    let result: boolean = hoverManager.hoverOverNothing();
    expect(result).toBe(false);
  });
});

describe('hoverManager.hoverOverSomething', () => {
  beforeAll(() => {
    document.body.innerHTML = `
    <div id="sat-hoverbox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="sat-hoverbox2"></div>
    <div id="sat-hoverbox3"></div>
  `;
    hoverManager.init();
  });
  it('should handle normal satellites', () => {
    settingsManager.enableHoverOverlay = true;
    hoverManager.hoverOverSomething(0, 0, 0);

    const satHoverBoxDOM = document.getElementById('sat-hoverbox');
    expect(satHoverBoxDOM).toMatchSnapshot();
  });
  it('should handle statics', () => {
    settingsManager.enableHoverOverlay = true;
    const tempSatSet = keepTrackApi.programs.satSet.getSat;
    keepTrackApi.programs.satSet.getSat = () => <SatObject>(<unknown>{ ...defaultSat, static: true });
    hoverManager.hoverOverSomething(10, 0, 0);
    const satHoverBoxDOM = document.getElementById('sat-hoverbox');
    expect(satHoverBoxDOM).toMatchSnapshot();
    keepTrackApi.programs.satSet.getSat = tempSatSet;
  });
  it('should handle missiles', () => {
    settingsManager.enableHoverOverlay = true;
    const tempSatSet = keepTrackApi.programs.satSet.getSat;
    keepTrackApi.programs.satSet.getSat = () => <SatObject>(<unknown>{ ...defaultSat, missile: true });
    hoverManager.hoverOverSomething(10, 0, 0);

    const satHoverBoxDOM = document.getElementById('sat-hoverbox');
    expect(satHoverBoxDOM).toMatchSnapshot();
    keepTrackApi.programs.satSet.getSat = tempSatSet;
  });
});

describe('hoverManager.staticObj', () => {
  beforeAll(() => {
    document.body.innerHTML = `
    <div id="sat-hoverbox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="sat-hoverbox2"></div>
    <div id="sat-hoverbox3"></div>
  `;
    hoverManager.init();
  });
  it('should handle launch facilities', () => {
    hoverManager.staticObj({ ...defaultSat, static: true, type: SpaceObjectType.LAUNCH_FACILITY });
  });
  it('should handle radar data', () => {
    hoverManager.staticObj({ ...defaultSat, static: true, isRadarData: true, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, azError: 0, elError: 0 });
  });
  it('should handle control facilities', () => {
    hoverManager.staticObj({ ...defaultSat, static: true, type: SpaceObjectType.CONTROL_FACILITY });
  });
  it('should handle stars', () => {
    hoverManager.staticObj({ ...defaultSat, static: true, type: SpaceObjectType.STAR, ra: 0, dec: 0 });
  });
  it('should handle other statics', () => {
    hoverManager.staticObj({ ...defaultSat, static: true, type: SpaceObjectType.LAUNCH_AGENCY });
  });
});

describe('hoverManager.satObj', () => {
  beforeAll(() => {
    document.body.innerHTML = `
    <div id="sat-hoverbox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="sat-hoverbox2"></div>
    <div id="sat-hoverbox3"></div>
  `;
    hoverManager.init();
  });
  it('should handle normal satellites', () => {
    hoverManager.satObj({ ...defaultSat, static: false });
  });
  it('should handle ui being disabled', () => {
    settingsManager.disableUI = true;
    hoverManager.satObj({ ...defaultSat, static: false });
    settingsManager.disableUI = false;
  });
  it('should handle a sensor being loaded', () => {
    keepTrackApi.programs.objectManager.isSensorManagerLoaded = true;
    keepTrackApi.programs.sensorManager.currentSensor = [defaultSensor];
    settingsManager.isShowNextPass = true;
    keepTrackApi.programs.drawManager.isShowDistance = true;
    hoverManager.satObj({ ...defaultSat, static: false });
  });
  it('should handle showing distance with a second satellite', () => {
    keepTrackApi.programs.objectManager.isSensorManagerLoaded = false;
    keepTrackApi.programs.drawManager.isShowDistance = true;
    const tempGetSat = keepTrackApi.programs.satSet.getSat;
    keepTrackApi.programs.satSet.getSat = () => defaultSat;
    hoverManager.satObj({ ...defaultSat, static: false });
    keepTrackApi.programs.satSet.getSat = tempGetSat;
  });
  it('should handle showing distance without a second satellite', () => {
    keepTrackApi.programs.objectManager.isSensorManagerLoaded = false;
    keepTrackApi.programs.drawManager.isShowDistance = true;
    const tempGetSat = keepTrackApi.programs.satSet.getSat;
    keepTrackApi.programs.satSet.getSat = () => null;
    hoverManager.satObj({ ...defaultSat, static: false });
    keepTrackApi.programs.satSet.getSat = tempGetSat;
  });
  it('should handle showing the next pass', () => {
    keepTrackApi.programs.objectManager.isSensorManagerLoaded = true;
    keepTrackApi.programs.drawManager.isShowDistance = false;
    keepTrackApi.programs.sensorManager.currentSensor = [defaultSensor];
    hoverManager.satObj({ ...defaultSat, static: false });
  });
});

describe('hoverManager.updateHover', () => {
  beforeAll(() => {
    document.body.innerHTML = `
    <div id="sat-hoverbox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="sat-hoverbox2"></div>
    <div id="sat-hoverbox3"></div>
  `;
    hoverManager.init();
  });
  it('should do something if the result box is open', () => {
    settingsManager.disableUI = false;
    settingsManager.lowPerf = false;
    keepTrackApi.programs.searchBox.isResultBoxOpen = () => true;
    keepTrackApi.programs.mainCamera.isDragging = false;
    settingsManager.isMobileModeEnabled = false;
    keepTrackApi.programs.satSet.satData[0] = { ...defaultSat, type: SpaceObjectType.STAR };
    hoverManager.updateHover();
    keepTrackApi.programs.satSet.satData[0] = { ...defaultSat, type: SpaceObjectType.LAUNCH_AGENCY };
    hoverManager.updateHover();
  });
  it('should show the search box', () => {
    settingsManager.disableUI = false;
    keepTrackApi.programs.searchBox.isHovering = () => true;
    const tempUi = keepTrackApi.programs.uiManager;
    keepTrackApi.programs.uiManager = <any>{
      searchBox: {
        getHoverSat: () => defaultSat.id,
      },
    };
    hoverManager.updateHover();
    keepTrackApi.programs.uiManager = tempUi;
  });
});
