import * as echarts from 'echarts';

import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, Singletons } from '@app/js/interfaces';
import { SatMathApi } from '@app/js/singletons/sat-math-api';

type EChartsOption = echarts.EChartsOption;

export const createEcfScatterPlot = (data, isPlotAnalyisMenuOpen, curChart, chartDom) => {
  // Dont Load Anything if the Chart is Closed
  if (!isPlotAnalyisMenuOpen) return curChart;

  // Delete any old charts and start fresh
  let existInstance = echarts.getInstanceByDom(chartDom);
  if (existInstance) {
    echarts.dispose(curChart);
  }

  // Setup Configuration
  const app = {
    config: {
      xAxis3D: 'X',
      yAxis3D: 'Y',
      zAxis3D: 'Z',
    },
    configParameters: {} as EChartsOption,
  };

  curChart = echarts.init(chartDom);
  const schema = [
    { name: 'X', index: 0 },
    { name: 'Y', index: 1 },
    { name: 'Z', index: 2 },
  ];
  const fieldIndices = schema.reduce(function (obj, item): {} {
    obj[item.name] = item.index;
    return obj;
  }, {});
  let fieldNames = schema.map((item) => item.name);
  fieldNames = fieldNames.slice(2, fieldNames.length - 2);
  ['xAxis3D', 'yAxis3D', 'zAxis3D', 'color', 'symbolSize'].forEach((fieldName) => {
    app.configParameters[fieldName] = {
      options: fieldNames,
    };
  });

  // Setup Chart
  curChart.setOption({
    tooltip: {},
    xAxis3D: {
      name: app.config.xAxis3D,
      type: 'value',
    },
    yAxis3D: {
      name: app.config.yAxis3D,
      type: 'value',
    },
    zAxis3D: {
      name: app.config.zAxis3D,
      type: 'value',
    },
    grid3D: {
      axisLine: {
        lineStyle: {
          color: '#fff',
        },
      },
      axisPointer: {
        lineStyle: {
          color: '#ffbd67',
        },
      },
      viewControl: {
        rotateSensitivity: 10,
        distance: 600,
        zoomSensitivity: 5,
      },
    },
    series: data.map((sat) => ({
      type: 'scatter3D',
      name: sat.name,
      dimensions: [app.config.xAxis3D, app.config.yAxis3D, app.config.yAxis3D],
      data: sat.value.map((item: any, idx: number) => ({
        itemStyle: {
          opacity: 1 - idx / sat.value.length, // opacity by time
        },
        value: [item[fieldIndices[app.config.xAxis3D]], item[fieldIndices[app.config.yAxis3D]], item[fieldIndices[app.config.zAxis3D]]],
      })),
      symbolSize: 12,
      itemStyle: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
      },
      emphasis: {
        itemStyle: {
          color: '#fff',
        },
      },
    })),
  });

  return curChart;
};

export const getEcfScatterData = () => {
  const NUMBER_OF_POINTS = 100;
  const data = [];
  const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

  let sat = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
  data.push({ name: sat.name, value: SatMathApi.getEcfOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
  const lastSat = catalogManagerInstance.lastSelectedSat();
  if (lastSat !== -1) {
    sat = catalogManagerInstance.getSat(lastSat);
    data.push({ name: sat.name, value: SatMathApi.getEcfOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
  }

  return data;
};
