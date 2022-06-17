import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as echarts from 'echarts';

type EChartsOption = echarts.EChartsOption;

export const createRicScatterPlot = (data, isPlotAnalyisMenuOpen, curChart, chartDom) => {
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
      xAxis3D: 'Radial',
      yAxis3D: 'In-Track',
      zAxis3D: 'Cross-Track',
    },
    configParameters: {} as EChartsOption,
  };

  curChart = echarts.init(chartDom);
  const schema = [
    { name: 'Radial', index: 0 },
    { name: 'In-Track', index: 1 },
    { name: 'Cross-Track', index: 2 },
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
    title: {
      text: 'RIC Scatter Plot',
      textStyle: {
        fontSize: 16,
        color: '#fff',
      },
    },
    legend: {
      show: true,
      textStyle: {
        color: '#fff',
      },
    },
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

export const getRicScatterData = () => {
  const NUMBER_OF_POINTS = 500;
  const { satSet, objectManager, satellite } = keepTrackApi.programs;

  const data = [];

  if (objectManager.selectedSat === -1 || objectManager.secondarySat === -1) return [];

  const satP = satSet.getSat(objectManager.selectedSat);
  const satS = objectManager.secondarySatObj;
  data.push({ name: satP.name, value: [[0, 0, 0]] });
  data.push({ name: satS.name, value: satellite.getRicOfCurrentOrbit(satS, satP, NUMBER_OF_POINTS, 5) });

  return data;
};
