import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { RAD2DEG } from '@app/js/lib/constants';
import * as echarts from 'echarts';

export const createInc2LonScatterPlot = (data, isPlotAnalyisMenuOpen, curChart, chartDom) => {
  // Dont Load Anything if the Chart is Closed
  if (!isPlotAnalyisMenuOpen) return curChart;

  // Delete any old charts and start fresh
  let existInstance = echarts.getInstanceByDom(chartDom);
  if (!existInstance) {
    // Setup Configuration
    curChart = echarts.init(chartDom);
    curChart.on('click', (event) => {
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
      text: 'Inclination vs Longitude Scatter Plot',
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
    xAxis: {
      name: 'Longitude',
      type: 'value',
      position: 'bottom',
    },
    yAxis: {
      name: 'Inclination',
      type: 'value',
      position: 'left',
    },
    zAxis: {
      name: 'Period',
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
        end: 65,
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
        end: 65,
      },
    ],
    visualMap: [
      {
        left: 'left',
        top: '10%',
        dimension: 2,
        min: 1240,
        max: 1640,
        itemWidth: 30,
        itemHeight: 500,
        calculable: true,
        precision: 0.05,
        text: ['Period (minutes)'],
        textGap: 30,
        textStyle: {
          color: '#fff',
        },
        inRange: {
          // symbolSize: [10, 70],
        },
        outOfRange: {
          // symbolSize: [10, 70],
          opacity: 0,
          symbol: 'none',
        },
        controller: {
          inRange: {
            color: ['#41577c'],
          },
          outOfRange: {
            color: ['#999'],
          },
        },
      },
    ],
    series: data.map((country) => ({
      type: 'scatter',
      name: country.name,
      data: country.value.map((item: any) => ({
        name: item[3],
        id: item[4],
        value: [item[1], item[0], item[2]],
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

export const getInc2LonScatterData = () => {
  const { satSet, satellite } = keepTrackApi.programs;

  const china = [];
  const usa = [];
  const russia = [];
  const other = [];

  satSet.satData.forEach((sat) => {
    if (!sat.TLE1 || sat.type !== SpaceObjectType.PAYLOAD) return;
    if (sat.eccentricity > 0.1) return;
    if (sat.period < 1240) return;
    if (sat.period > 1640) return;
    if (sat.inclination * RAD2DEG > 17) return;
    sat = satSet.getSatPosOnly(sat.id);
    sat = { ...sat, ...satellite.eci2ll(sat.position.x, sat.position.y, sat.position.z) };
    switch (sat.country) {
      case 'United States of America':
      case 'United States':
      case 'US':
        usa.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
        return;
      case 'Russian Federation':
      case 'CIS':
      case 'Russia':
        russia.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
        return;
      case 'China':
      case `China, People's Republic of`:
      case `Hong Kong Special Administrative Region, China`:
      case 'China (Republic)':
        china.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
        return;
      default:
        other.push([sat.inclination * RAD2DEG, sat.lon, sat.period, sat.name, sat.id]);
        return;
    }
  });

  return [
    { name: 'USA', value: usa },
    { name: 'Other', value: other },
    { name: 'Russia', value: russia },
    { name: 'China', value: china },
  ];
};
