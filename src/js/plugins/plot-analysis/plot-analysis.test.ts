import * as plotAnalysis from '@app/js/plugins/plot-analysis/plot-analysis';
import * as echarts from 'echarts';
import { defaultSat, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import { createEcfScatterPlot, getEcfScatterData } from './components/plots/ecfScatterPlot';
import { createEciScatterPlot, getEciScatterData } from './components/plots/eciScatterPlot';
import { createInc2LonScatterPlot, getInc2LonScatterData } from './components/plots/inc2LonScatterPlot';
import { createRicScatterPlot, getRicScatterData } from './components/plots/ricScatterPlot';
import { createTime2LonScatterPlot, getTime2LonScatterData } from './components/plots/time2LonScatterPlot';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

let spy: jest.SpyInstance;
let spy2: jest.SpyInstance;
let spy3: jest.SpyInstance;

// @ponicode
describe('plotAnalysis.init', () => {
  test('0', () => {
    let result: any = plotAnalysis.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('plotAnalysis.uiManagerInit', () => {
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
        <div id="left-menus"></div>
        <div id="bottom-icons"></div>
        <div id="plot-analysis-menu"></div>
        <div id="plot-analysis-menu2"></div>
        <div id="plot-analysis-menu3"></div>
        </div>
        </div>`
    );
    let result: any = plotAnalysis.uiManagerInit();
    expect(result).toMatchSnapshot();
    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

// @ponicode
describe('plotAnalysis.bottomMenuClick', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });

  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div id="wrapper0"><div>
      <div id="left-menus"></div>
      <div id="bottom-icons"></div>
      <div id="plot-analysis-menu"></div>
      <div id="plot-analysis-menu2"></div>
      <div id="plot-analysis-menu3"></div>
      <div id="plot-analysis-menu4"></div>
      <div id="plot-analysis-menu5"></div>
      </div>
      </div>`
  );
  plotAnalysis.init();
  plotAnalysis.uiManagerInit();

  test('0', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    let result: any = plotAnalysis.bottomMenuClick('menu-plot-analysis');
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.objectManager.selectedSat = 0;
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis');
    expect(result).toMatchSnapshot();
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    let result: any = plotAnalysis.bottomMenuClick('menu-plot-analysis2');
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.objectManager.selectedSat = 0;
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis2');
    expect(result).toMatchSnapshot();
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis2');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    let result: any = plotAnalysis.bottomMenuClick('menu-plot-analysis3');
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.objectManager.selectedSat = 0;
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis3');
    expect(result).toMatchSnapshot();
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis3');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = plotAnalysis.bottomMenuClick('menu-plot-analysis4');
    expect(result).toMatchSnapshot();
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis4');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = plotAnalysis.bottomMenuClick('menu-plot-analysis5');
    expect(result).toMatchSnapshot();
    result = plotAnalysis.bottomMenuClick('menu-plot-analysis5');
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = plotAnalysis.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('plotAnalysis.onEciPlotBtnClick', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
          <div id="menu-plot-analysis:animated"></div>
          <div id="menu-plot-analysis"></div>
          <div id="plot-analysis-menu"></div>
          <div id="plot-analysis-chart"></div>
        </div>
        </div>`
    );
    let result: any = plotAnalysis.onEciPlotBtnClick();
    expect(result).toMatchSnapshot();
    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

// @ponicode
describe('plotAnalysis.onEcfPlotBtnClick', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
          <div id="menu-plot-analysis2:animated"></div>
          <div id="menu-plot-analysis2"></div>
          <div id="plot-analysis-menu2"></div>
          <div id="plot-analysis-chart2"></div>
        </div>
        </div>`
    );
    let result: any = plotAnalysis.onEcfPlotBtnClick();
    expect(result).toMatchSnapshot();
    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

// @ponicode
describe('plotAnalysis.onRicPlotBtnClick', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
          <div id="menu-plot-analysis3:animated"></div>
          <div id="menu-plot-analysis3"></div>
          <div id="plot-analysis-menu3"></div>
          <div id="plot-analysis-chart3"></div>
        </div>
        </div>`
    );
    plotAnalysis.init();
    plotAnalysis.uiManagerInit();

    plotAnalysis.bottomMenuClick('menu-plot-analysis3');
    let result: any = plotAnalysis.onRicPlotBtnClick();
    expect(result).toMatchSnapshot();
    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

// @ponicode
describe('plotAnalysis.onInc2LonPlotBtnClick', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
          <div id="menu-plot-analysis4:animated"></div>
          <div id="menu-plot-analysis4"></div>
          <div id="plot-analysis-menu4"></div>
          <canvas id="plot-analysis-chart4">
        </div>
        </div>`
    );

    plotAnalysis.init();
    plotAnalysis.uiManagerInit();

    plotAnalysis.bottomMenuClick('menu-plot-analysis4');
    let result: any = plotAnalysis.onInc2LonPlotBtnClick();
    expect(result).toMatchSnapshot();
    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

// @ponicode
describe('plotAnalysis.onTime2LonPlotBtnClick', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
        <div id="menu-plot-analysis5:animated"></div>
        <div id="menu-plot-analysis5"></div>
        <div id="plot-analysis-menu5"></div>
        <canvas id="plot-analysis-chart5">
        </div>
        </div>`
    );
    plotAnalysis.init();
    plotAnalysis.uiManagerInit();

    plotAnalysis.bottomMenuClick('menu-plot-analysis5');
    let result: any = plotAnalysis.onTime2LonPlotBtnClick();
    expect(result).toMatchSnapshot();
    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

// @ponicode
describe('plotAnalysis.hideSideMenus', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          dispose: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
  });
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
          <div id="plot-analysis-menu"></div>
          <div id="menu-plot-analysis" class="bmenu-item-selected"></div>
          <div id="plot-analysis-menu2"></div>
          <div id="menu-plot-analysis2" class="bmenu-item-selected"></div>
          <div id="plot-analysis-menu3"></div>
          <div id="menu-plot-analysis3" class="bmenu-item-selected"></div>
          <div id="plot-analysis-menu4"></div>
          <div id="menu-plot-analysis4" class="bmenu-item-selected"></div>
          <div id="plot-analysis-menu5"></div>
          <div id="menu-plot-analysis5" class="bmenu-item-selected"></div>
        </div>
        </div>`
    );
    let result: any = plotAnalysis.hideSideMenus();
    expect(result).toMatchSnapshot();
    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

// @ponicode
describe('plotAnalysis.selectSatData', () => {
  beforeAll(() => {
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
        }
    );
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });
  test('0', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
          <canvas id="plot-analysis-chart">
          <canvas id="plot-analysis-chart2">
          <canvas id="plot-analysis-chart3">
        </div>
        </div>`
    );
    plotAnalysis.init();
    plotAnalysis.uiManagerInit();

    plotAnalysis.bottomMenuClick('menu-plot-analysis');
    let result: any = plotAnalysis.selectSatData(defaultSat, 0);
    expect(result).toMatchSnapshot();
    plotAnalysis.bottomMenuClick('menu-plot-analysis2');
    result = plotAnalysis.selectSatData(defaultSat, 0);
    expect(result).toMatchSnapshot();
    plotAnalysis.bottomMenuClick('menu-plot-analysis3');
    result = plotAnalysis.selectSatData(defaultSat, 0);
    expect(result).toMatchSnapshot();

    expect(document.getElementById('wrapper0')).toMatchSnapshot();
    document.body.removeChild(document.getElementById('wrapper0'));
  });
});

describe('Test all plots', () => {
  beforeAll(() => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div id="wrapper0"><div>
          <canvas id="plot-analysis-chart">
          <canvas id="plot-analysis-chart2">
          <canvas id="plot-analysis-chart3">
          <canvas id="plot-analysis-chart4">
          <canvas id="plot-analysis-chart5">
        </div>
        </div>`
    );
    keepTrackApi.programs.satSet.satData.push({ ...defaultSat, ...{ eccentricity: 0.1, period: 1440, inclination: 0, country: 'US' } });
    keepTrackApi.programs.satSet.satData.push({ ...defaultSat, ...{ eccentricity: 0.1, period: 1440, inclination: 0, country: 'Russia' } });
    keepTrackApi.programs.satSet.satData.push({ ...defaultSat, ...{ eccentricity: 0.1, period: 1440, inclination: 0, country: 'China' } });
    keepTrackApi.programs.satSet.satData.push({ ...defaultSat, ...{ eccentricity: 0.1, period: 1440, inclination: 0, country: 'France' } });
    keepTrackApi.programs.satSet.getSatPosOnly = () => ({ ...defaultSat, ...{ eccentricity: 0.1, period: 1440, inclination: 0, country: 'US' } });
    spy = jest.spyOn(echarts, 'getInstanceByDom').mockImplementation(() => <any>false);
    spy2 = jest.spyOn(echarts, 'dispose').mockImplementation(() => {});
    spy3 = jest.spyOn(echarts, 'init').mockImplementation(
      () =>
        <any>{
          hideLoading: jest.fn(),
          setOption: jest.fn(),
          showLoading: jest.fn(),
          on: jest.fn(),
        }
    );
    plotAnalysis.init();
    plotAnalysis.uiManagerInit();
  });
  afterAll(() => {
    spy.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
  });
  it('should be able to plot eci scatter plots', () => {
    const chartDom = document.getElementById('plot-analysis-chart');
    let curChart: echarts.ECharts;
    curChart = createEciScatterPlot(getEciScatterData(), false, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createEciScatterPlot(getEciScatterData(), true, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createEciScatterPlot(getEciScatterData(), true, curChart, false);
    expect(curChart).toMatchSnapshot();
  });
  it('should be able to plot ecf scatter plots', () => {
    const chartDom = document.getElementById('plot-analysis-chart2');
    let curChart: echarts.ECharts;
    curChart = createEcfScatterPlot(getEcfScatterData(), false, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createEcfScatterPlot(getEcfScatterData(), true, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createEcfScatterPlot(getEcfScatterData(), true, curChart, false);
    expect(curChart).toMatchSnapshot();
  });
  it('should be able to plot ric scatter plots', () => {
    const chartDom = document.getElementById('plot-analysis-chart3');
    let curChart: echarts.ECharts;
    curChart = createRicScatterPlot(getRicScatterData(), false, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createRicScatterPlot(getRicScatterData(), true, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createRicScatterPlot(getRicScatterData(), true, curChart, false);
    expect(curChart).toMatchSnapshot();
  });
  it('should be able to plot inc2lon scatter plots', () => {
    const chartDom = document.getElementById('plot-analysis-chart4');
    let curChart: echarts.ECharts;
    curChart = createInc2LonScatterPlot(getInc2LonScatterData(), false, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createInc2LonScatterPlot(getInc2LonScatterData(), true, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createInc2LonScatterPlot(getInc2LonScatterData(), true, curChart, false);
    expect(curChart).toMatchSnapshot();
  });
  it('should be able to plot time2lon plots', () => {
    const chartDom = document.getElementById('plot-analysis-chart5');
    let curChart: echarts.ECharts;
    curChart = createTime2LonScatterPlot(getTime2LonScatterData(), false, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createTime2LonScatterPlot(getTime2LonScatterData(), true, curChart, chartDom);
    expect(curChart).toMatchSnapshot();
    curChart = createTime2LonScatterPlot(getTime2LonScatterData(), true, curChart, false);
    expect(curChart).toMatchSnapshot();
  });
});
