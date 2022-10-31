import * as echarts from 'echarts';

import { MILLISECONDS_PER_DAY, RAD2DEG } from '@app/js/lib/constants';

import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { jday } from '@app/js/timeManager/transforms';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const createInc2AltScatterPlot = (data, isPlotAnalyisMenuOpen, curChart, chartDom) => {
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
      text: 'Inclination vs Altitude Scatter Plot',
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
      name: 'Inclination',
      type: 'value',
      position: 'bottom',
    },
    yAxis: {
      name: 'Altitude',
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
        min: 80,
        max: 250,
        itemWidth: 30,
        itemHeight: 500,
        calculable: true,
        precision: 0.05,
        text: ['Period (min)'],
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

export const getInc2AltScatterData = () => {
  const { satSet, satellite, timeManager } = keepTrackApi.programs;

  const china = [];
  const usa = [];
  const russia = [];
  const other = [];

  satSet.satData.forEach((sat) => {
    if (!sat.TLE1 || sat.type !== SpaceObjectType.PAYLOAD) return;
    if (sat.period > 250) return;
    sat = satSet.getSatPosOnly(sat.id);
    const now = timeManager.simulationTimeObj;
    let j = jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    const gmst = satellite.gstime(j);
    sat = { ...sat, ...satellite.eciToGeodetic(sat.position, gmst) };

    if (sat.alt < 80) return; // TODO: USE THIS FOR FINDING DECAYS!

    switch (sat.country) {
      case 'United States of America':
      case 'United States':
      case 'US':
        usa.push([sat.alt, sat.inclination * RAD2DEG, sat.period, sat.name, sat.id]);
        return;
      case 'Russian Federation':
      case 'CIS':
      case 'RU':
      case 'SU':
      case 'Russia':
        russia.push([sat.alt, sat.inclination * RAD2DEG, sat.period, sat.name, sat.id]);
        return;
      case 'China':
      case `China, People's Republic of`:
      case `Hong Kong Special Administrative Region, China`:
      case 'China (Republic)':
      case 'PRC':
      case 'CN':
        china.push([sat.alt, sat.inclination * RAD2DEG, sat.period, sat.name, sat.id]);
        return;
      default:
        other.push([sat.alt, sat.inclination * RAD2DEG, sat.period, sat.name, sat.id]);
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
