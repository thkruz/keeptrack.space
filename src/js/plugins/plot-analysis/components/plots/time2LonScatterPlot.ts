import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { RAD2DEG } from '@app/js/lib/constants';
import * as echarts from 'echarts';

export const createTime2LonScatterPlot = (data, isPlotAnalyisMenuOpen, curChart, chartDom) => {
  // Dont Load Anything if the Chart is Closed
  if (!isPlotAnalyisMenuOpen) return curChart;

  // Delete any old charts and start fresh
  let existInstance = echarts.getInstanceByDom(chartDom);
  if (!existInstance) {
    // Setup Configuration
    curChart = echarts.init(chartDom);
    curChart.on('click', function (event) {
      if (event.data?.id) {
        keepTrackApi.programs.satSet.selectSat(event.data.id);
      }
    });
  } else {
    return curChart;
  }

  // Setup Chart
  curChart.setOption({
    title: {
      text: 'Time vs Longitude Scatter Plot',
      textStyle: {
        fontSize: 16,
        color: '#fff',
      },
    },
    tooltip: {},
    xAxis: {
      name: 'Longitude',
      type: 'value',
      position: 'bottom',
    },
    yAxis: {
      name: 'Time',
      type: 'value',
      position: 'left',
    },
    zAxis: {
      name: 'Mean Motion',
      type: 'value',
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: -180,
        end: 180,
      },
      {
        type: 'slider',
        show: true,
        yAxisIndex: [0],
        left: '93%',
        start: 0,
        end: 1440,
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        start: -180,
        end: 180,
      },
      {
        type: 'inside',
        yAxisIndex: [0],
        start: 0,
        end: 1440,
      },
    ],
    // visualMap: [
    //   {
    //     left: 'left',
    //     top: '10%',
    //     dimension: 2,
    //     min: 0,
    //     max: 18,
    //     itemWidth: 30,
    //     itemHeight: 500,
    //     calculable: true,
    //     precision: 0.05,
    //     text: ['Mean Motion'],
    //     textGap: 30,
    //     textStyle: {
    //       color: '#fff',
    //     },
    //     inRange: {
    //       // symbolSize: [10, 70],
    //     },
    //     outOfRange: {
    //       // symbolSize: [10, 70],
    //       opacity: 0,
    //       symbol: 'none',
    //     },
    //     controller: {
    //       inRange: {
    //         color: ['#41577c'],
    //       },
    //       outOfRange: {
    //         color: ['#999'],
    //       },
    //     },
    //   },
    // ],
    series: data.map((item) => ({
      type: 'line',
      name: item.name,
      data: item.data.map((dataPoint: any) => ({
        name: item.country,
        id: item.satId,
        value: [dataPoint[1], dataPoint[0]],
      })),
      // symbolSize: 8,
      // itemStyle: {
      // borderWidth: 1,
      // borderColor: 'rgba(255,255,255,0.8)',
      // },
      emphasis: {
        itemStyle: {
          color: '#fff',
        },
      },
    })),
  });

  return curChart;
};

export const getTime2LonScatterData = () => {
  const { satSet, satellite, timeManager } = keepTrackApi.programs;
  const now = timeManager.simulationTimeObj.getTime();

  const data = [];
  satSet.satData.forEach((sat) => {
    if (!sat.TLE1 || sat.type !== SpaceObjectType.PAYLOAD) return;
    if (sat.eccentricity > 0.1) return;
    if (sat.period < 1240) return;
    if (sat.period > 1640) return;
    switch (sat.country) {
      case 'United States of America':
      case 'United States':
      case 'US':
      case 'Russian Federation':
      case 'CIS':
      case 'Russia':
      case 'China':
      case `China, People's Republic of`:
      case `Hong Kong Special Administrative Region, China`:
      case 'China (Republic)':
        break;
      default:
        return;
    }
    sat = satSet.getSatPosOnly(sat.id);
    const plotPoints = satellite.getLlaOfCurrentOrbit(sat, 24);
    const plotData = [];
    plotPoints.forEach((point) => {
      const pointTime = (point.time - now) / 1000 / 60;
      if (pointTime > 1440 || pointTime < 0) return;
      plotData.push([pointTime, point.lon * RAD2DEG]);
    });
    data.push({
      name: sat.name,
      satId: sat.id,
      country: sat.country,
      data: plotData,
    });
  });
  return data;
};
