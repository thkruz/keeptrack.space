/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * breakup-gabbard-chart.ts builds the ECharts option for the Breakup Analysis
 * Gabbard diagram (orbital period on x, apogee/perigee altitude on y). It is
 * kept DOM-free and locale-free (all labels are passed in) so the option object
 * can be unit-tested directly; the plugin owns only echarts.init / setOption.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import type { EChartsCoreOption } from 'echarts';
import { GabbardData } from './breakup-analysis-core';

/** Pre-localized labels the Gabbard chart needs (keeps this module locale-free). */
export interface GabbardChartLabels {
  apogee: string;
  perigee: string;
  periodAxis: string;
  altitudeAxis: string;
}

const APOGEE_COLOR = '#ff5252';
const PERIGEE_COLOR = '#4fc3f7';

/** Build the full ECharts option for a fragment cloud's Gabbard diagram. */
export const buildGabbardOption = (data: GabbardData, labels: GabbardChartLabels): EChartsCoreOption => ({
  animation: false,
  // Horizontal, centered legend so the two short items sit side by side instead
  // of stacking/overlapping in the narrow side-menu panel.
  legend: {
    show: true,
    orient: 'horizontal',
    top: 4,
    left: 'center',
    itemGap: 18,
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#fff', fontSize: 11 },
  },
  // Explicit margins (no containLabel) guarantee fixed room for the rotated
  // y-axis name on the left and the centered x-axis name along the bottom, so
  // neither clips in the ~360px-wide panel.
  grid: { top: 40, left: 52, right: 16, bottom: 44 },
  tooltip: {
    trigger: 'item',
    formatter: (params: { seriesName?: string; value?: [number, number] }) => {
      const value = params.value ?? [0, 0];

      return `${params.seriesName ?? ''}<br/>${labels.periodAxis}: ${value[0].toFixed(1)}<br/>${labels.altitudeAxis}: ${value[1].toFixed(0)}`;
    },
  },
  xAxis: {
    name: labels.periodAxis,
    nameLocation: 'middle',
    nameGap: 24,
    type: 'value',
    scale: true,
    axisLabel: { color: '#999', hideOverlap: true },
    nameTextStyle: { color: '#fff', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  },
  yAxis: {
    name: labels.altitudeAxis,
    nameLocation: 'middle',
    nameGap: 36,
    type: 'value',
    scale: true,
    axisLabel: { color: '#999', hideOverlap: true },
    nameTextStyle: { color: '#fff', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  },
  series: [
    {
      name: labels.apogee,
      type: 'scatter',
      symbolSize: 6,
      itemStyle: { color: APOGEE_COLOR, opacity: 0.8 },
      data: data.apogee,
    },
    {
      name: labels.perigee,
      type: 'scatter',
      symbolSize: 6,
      itemStyle: { color: PERIGEE_COLOR, opacity: 0.8 },
      data: data.perigee,
    },
  ],
});
