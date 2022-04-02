import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as echarts from 'echarts';
import 'echarts-gl';
import $ from 'jquery';
import { PlotAnalysisBottomIcon } from './components/PlotAnalysisBottomIcon';
import { PlotAnalysisSideMenu } from './components/PlotAnalysisSideMenu';
import { createRicScatterPlot, getRicScatterData } from './components/ricScatterPlot';

export let isPlotAnalyisMenuOpen = false;
export let curChart: echarts.ECharts;

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
    minWidth: 300,
  });
};

export const bottomMenuClick = (iconName: string) => {
  const { sensorManager, uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-plot-analysis') {
    if (!sensorManager.checkSensorSelected()) {
      // No Sensor Selected
      uiManager.toast(`Select a Sensor First!`, 'caution', true);
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
      let existInstance = echarts.getInstanceByDom(chartDom);

      if (!existInstance) {
        curChart = createRicScatterPlot(getRicScatterData(), isPlotAnalyisMenuOpen, curChart);
      }
      setTimeout(() => {
        curChart.resize();
      }, 1000);
      $('#menu-plot-analysis').addClass('bmenu-item-selected');
      return;
    }
  }
};

export const hideSideMenus = () => {
  $('#plot-analysis-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-plot-analysis').removeClass('bmenu-item-selected');
  isPlotAnalyisMenuOpen = false;
};

export const selectSatData = () => {
  curChart = createRicScatterPlot(getRicScatterData(), isPlotAnalyisMenuOpen, curChart);
};
