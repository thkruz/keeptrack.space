import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { EciPos } from '@app/js/api/keepTrackTypes';
import * as echarts from 'echarts';

type EChartsOption = echarts.EChartsOption;

export const createEciScatterPlot = (data, isPlotAnalyisMenuOpen, curChart, chartDom) => {
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

  // Get the Data
  const dataRange = data.reduce((range, sat) => {
    const minDataX = sat.value.reduce((min: number, item: EciPos) => Math.min(min, item[0]), Infinity);
    const maxDataX = sat.value.reduce((max: number, item: EciPos) => Math.max(max, item[0]), -Infinity);
    const minDataY = sat.value.reduce((min: number, item: EciPos) => Math.min(min, item[1]), Infinity);
    const maxDataY = sat.value.reduce((max: number, item: EciPos) => Math.max(max, item[1]), -Infinity);
    const minDataZ = sat.value.reduce((min: number, item: EciPos) => Math.min(min, item[2]), Infinity);
    const maxDataZ = sat.value.reduce((max: number, item: EciPos) => Math.max(max, item[2]), -Infinity);
    const minData = Math.round(Math.min(minDataX, minDataY, minDataZ) / 1000) * 1000;
    const maxData = Math.round(Math.max(maxDataX, maxDataY, maxDataZ) / 1000) * 1000;
    const _dataRange = Math.max(maxData, Math.abs(minData));
    return Math.max(range, _dataRange);
  }, 0);

  // Setup Chart
  curChart.setOption({
    tooltip: {},
    xAxis3D: {
      name: app.config.xAxis3D,
      type: 'value',
      min: -dataRange,
      max: dataRange,
    },
    yAxis3D: {
      name: app.config.yAxis3D,
      type: 'value',
      min: -dataRange,
      max: dataRange,
    },
    zAxis3D: {
      name: app.config.zAxis3D,
      type: 'value',
      min: -dataRange,
      max: dataRange,
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
      // symbol: 'triangle',
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

export const getEciScatterData = () => {
  const NUMBER_OF_POINTS = 100;
  const { satSet, objectManager, satellite } = keepTrackApi.programs;

  const data = [];
  let sat = satSet.getSat(objectManager.selectedSat);
  data.push({ name: sat.name, value: satellite.getEciOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
  const lastSat = objectManager.lastSelectedSat();
  if (lastSat !== -1) {
    sat = satSet.getSat(lastSat);
    data.push({ name: sat.name, value: satellite.getEciOfCurrentOrbit(sat, NUMBER_OF_POINTS).map((point) => [point.x, point.y, point.z]) });
  }

  return data;
};
