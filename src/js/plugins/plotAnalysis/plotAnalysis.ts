import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import * as echarts from 'echarts';
import 'echarts-gl';
import $ from 'jquery';
import { PlotAnalysisBottomIcon } from './components/PlotAnalysisBottomIcon';
import { PlotAnalysisSideMenu } from './components/PlotAnalysisSideMenu';
import { createEcfScatterPlot, getEcfScatterData } from './components/plots/ecfScatterPlot';
import { createEciScatterPlot, getEciScatterData } from './components/plots/eciScatterPlot';
import { createInc2LonScatterPlot, getInc2LonScatterData } from './components/plots/inc2LonScatterPlot';
import { createRicScatterPlot, getRicScatterData } from './components/plots/ricScatterPlot';
import { createTime2LonScatterPlot, getTime2LonScatterData } from './components/plots/time2LonScatterPlot';

export let isPlotAnalyisMenuOpen = false;
export let isPlotAnalyisMenuOpen2 = false;
export let isPlotAnalyisMenuOpen3 = false;
export let isPlotAnalyisMenuOpen4 = false;
export let isPlotAnalyisMenuOpen5 = false;
export let curChart: echarts.ECharts;
export let curChart2: echarts.ECharts;
export let curChart3: echarts.ECharts;
export let curChart4: echarts.ECharts;
export let curChart5: echarts.ECharts;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'plotAnalysis',
    cb: () => uiManagerInit(),
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'plotAnalysis',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'plotAnalysis',
    cb: (): void => hideSideMenus(),
  });

  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'plotAnalysis',
    cb: selectSatData,
  });
};

export const uiManagerInit = (): void => {
  $('#left-menus').append(PlotAnalysisSideMenu);
  $('#bottom-icons').append(PlotAnalysisBottomIcon);

  $('#plot-analysis-menu').resizable({
    handles: 'e',
    stop: function () {
      curChart.resize();
    },
    maxWidth: 1200,
    minWidth: 500,
  });
  $('#plot-analysis-menu2').resizable({
    handles: 'e',
    stop: function () {
      curChart2.resize();
    },
    maxWidth: 1200,
    minWidth: 500,
  });
  $('#plot-analysis-menu3').resizable({
    handles: 'e',
    stop: function () {
      curChart3.resize();
    },
    maxWidth: 1200,
    minWidth: 500,
  });
};

/**
 * This function is called when the user clicks on a bottom icon
 * @param {string} iconName The name of the icon that was clicked
 * @returns {void}
 */
export const bottomMenuClick = (iconName: string): void => {
  switch (iconName) {
    case 'menu-plot-analysis':
      onEciPlotBtnClick();
      break;
    case 'menu-plot-analysis2':
      onEcfPlotBtnClick();
      break;
    case 'menu-plot-analysis3':
      onRicPlotBtnClick();
      break;
    case 'menu-plot-analysis4':
      onInc2LonPlotBtnClick();
      break;
    case 'menu-plot-analysis5':
      onTime2LonPlotBtnClick();
      break;
    default:
      break;
  }
};

export const onEciPlotBtnClick = () => {
  const { objectManager, uiManager } = keepTrackApi.programs;
  if (objectManager.selectedSat === -1) {
    uiManager.toast(`Select a Satellite First!`, 'caution');
    if (!$('#menu-plot-analysis:animated').length) {
      $('#menu-plot-analysis').effect('shake', {
        distance: 10,
      });
    }
    return;
  }

  if (isPlotAnalyisMenuOpen) {
    uiManager.hideSideMenus();
    isPlotAnalyisMenuOpen = false;
    return;
  } else {
    uiManager.hideSideMenus();
    (<any>$('#plot-analysis-menu')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
    isPlotAnalyisMenuOpen = true;

    const chartDom = document.getElementById('plot-analysis-chart');
    // let existInstance = echarts.getInstanceByDom(chartDom);

    // if (!existInstance) {
    curChart = createEciScatterPlot(getEciScatterData(), isPlotAnalyisMenuOpen, curChart, chartDom);
    // }
    setTimeout(() => {
      curChart.resize();
    }, 1000);
    $('#menu-plot-analysis').addClass('bmenu-item-selected');
    return;
  }
};

export const onEcfPlotBtnClick = () => {
  const { objectManager, uiManager } = keepTrackApi.programs;
  if (objectManager.selectedSat === -1) {
    uiManager.toast(`Select a Satellite First!`, 'caution');
    if (!$('#menu-plot-analysis2:animated').length) {
      $('#menu-plot-analysis2').effect('shake', {
        distance: 10,
      });
    }
    return;
  }

  if (isPlotAnalyisMenuOpen2) {
    uiManager.hideSideMenus();
    isPlotAnalyisMenuOpen2 = false;
    return;
  } else {
    uiManager.hideSideMenus();
    (<any>$('#plot-analysis-menu2')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
    isPlotAnalyisMenuOpen2 = true;

    const chartDom2 = document.getElementById('plot-analysis-chart2');
    // let existInstance = echarts.getInstanceByDom(chartDom2);

    // if (!existInstance) {
    curChart2 = createEcfScatterPlot(getEcfScatterData(), isPlotAnalyisMenuOpen2, curChart2, chartDom2);
    // }
    setTimeout(() => {
      curChart2.resize();
    }, 1000);
    $('#menu-plot-analysis2').addClass('bmenu-item-selected');
    return;
  }
};

export const onRicPlotBtnClick = () => {
  const { objectManager, uiManager } = keepTrackApi.programs;
  if (objectManager.secondarySat === -1) {
    uiManager.toast(`Select a Secondary Satellite First!`, 'caution');
    if (!$('#menu-plot-analysis3:animated').length) {
      $('#menu-plot-analysis3').effect('shake', {
        distance: 10,
      });
    }
    return;
  }

  if (objectManager.selectedSat === -1 || objectManager.lastSelectedSat() === -1) {
    uiManager.toast(`Select a Primary Satellite First!`, 'caution');
    if (!$('#menu-plot-analysis3:animated').length) {
      $('#menu-plot-analysis3').effect('shake', {
        distance: 10,
      });
    }
    return;
  }

  if (isPlotAnalyisMenuOpen3) {
    uiManager.hideSideMenus();
    isPlotAnalyisMenuOpen3 = false;
    return;
  } else {
    uiManager.hideSideMenus();
    (<any>$('#plot-analysis-menu3')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
    isPlotAnalyisMenuOpen3 = true;

    const chartDom3 = document.getElementById('plot-analysis-chart3');
    // let existInstance = echarts.getInstanceByDom(chartDom3);

    // if (!existInstance) {
    curChart3 = createRicScatterPlot(getRicScatterData(), isPlotAnalyisMenuOpen3, curChart3, chartDom3);
    // }
    setTimeout(() => {
      curChart3.resize();
    }, 1000);
    $('#menu-plot-analysis3').addClass('bmenu-item-selected');
    return;
  }
};

export const onInc2LonPlotBtnClick = () => {
  const { uiManager } = keepTrackApi.programs;
  if (isPlotAnalyisMenuOpen4) {
    uiManager.hideSideMenus();
    isPlotAnalyisMenuOpen4 = false;
    return;
  } else {
    uiManager.hideSideMenus();
    (<any>$('#plot-analysis-menu4')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
    isPlotAnalyisMenuOpen4 = true;

    const chartDom4 = document.getElementById('plot-analysis-chart4');
    let existInstance = echarts.getInstanceByDom(chartDom4);

    if (!existInstance) {
      curChart4 = createInc2LonScatterPlot(getInc2LonScatterData(), isPlotAnalyisMenuOpen4, curChart4, chartDom4);
    }
    setTimeout(() => {
      curChart4.resize();
    }, 1000);
    $('#menu-plot-analysis4').addClass('bmenu-item-selected');
    return;
  }
};

export const onTime2LonPlotBtnClick = () => {
  const { uiManager } = keepTrackApi.programs;
  if (isPlotAnalyisMenuOpen5) {
    uiManager.hideSideMenus();
    isPlotAnalyisMenuOpen5 = false;
    return;
  } else {
    uiManager.hideSideMenus();
    (<any>$('#plot-analysis-menu5')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
    isPlotAnalyisMenuOpen5 = true;

    const chartDom5 = document.getElementById('plot-analysis-chart5');
    let existInstance = echarts.getInstanceByDom(chartDom5);

    if (!existInstance) {
      curChart5 = createTime2LonScatterPlot(getTime2LonScatterData(), isPlotAnalyisMenuOpen5, curChart5, chartDom5);
    }
    setTimeout(() => {
      curChart5.resize();
    }, 1000);
    $('#menu-plot-analysis5').addClass('bmenu-item-selected');
    return;
  }
};

/**
 * This function is called when the user clicks on a menu item
 * @returns {void}
 */
export const hideSideMenus = (): void => {
  $('#plot-analysis-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-plot-analysis').removeClass('bmenu-item-selected');
  isPlotAnalyisMenuOpen = false;
  $('#plot-analysis-menu2').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-plot-analysis2').removeClass('bmenu-item-selected');
  isPlotAnalyisMenuOpen2 = false;
  $('#plot-analysis-menu3').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-plot-analysis3').removeClass('bmenu-item-selected');
  isPlotAnalyisMenuOpen3 = false;
  $('#plot-analysis-menu4').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-plot-analysis4').removeClass('bmenu-item-selected');
  isPlotAnalyisMenuOpen4 = false;
  $('#plot-analysis-menu5').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-plot-analysis5').removeClass('bmenu-item-selected');
  isPlotAnalyisMenuOpen5 = false;
};

/**
 * Update Plots When Satellite Clicked
 * - This does not apply to all plots
 * @param {SatObject} _sat - The satellite object (currently unused)
 * @param {number} satId - The id of the satellite
 * @returns {void}
 */
export const selectSatData = (_sat: SatObject, satId: number): void => {
  const { objectManager } = keepTrackApi.programs;
  if (satId === -1) {
    hideSideMenus();
    return;
  }
  if (isPlotAnalyisMenuOpen) {
    $('#menu-plot-analysis').addClass('bmenu-item-selected');
    const chartDom = document.getElementById('plot-analysis-chart');
    curChart = createEciScatterPlot(getEciScatterData(), isPlotAnalyisMenuOpen, curChart, chartDom);
  }
  if (isPlotAnalyisMenuOpen2) {
    $('#menu-plot-analysis2').addClass('bmenu-item-selected');
    const chartDom2 = document.getElementById('plot-analysis-chart2');
    curChart2 = createEcfScatterPlot(getEcfScatterData(), isPlotAnalyisMenuOpen2, curChart2, chartDom2);
  }
  if (objectManager.secondarySat !== -1 && isPlotAnalyisMenuOpen3) {
    $('#menu-plot-analysis3').addClass('bmenu-item-selected');
    const chartDom3 = document.getElementById('plot-analysis-chart3');
    curChart3 = createRicScatterPlot(getRicScatterData(), isPlotAnalyisMenuOpen3, curChart3, chartDom3);
  }
};
