/**
 * ric-plots-chart.ts - Pure echarts option builder for the 2D RIC plots.
 *
 * Issue #705 replaced the single 3D RIC scatter plot with four 2D time-series
 * sub-plots (Radial, In-Track, Cross-Track and total Range vs time) so the
 * relative motion of the secondary satellite is easy to read over time.
 *
 * Kept DOM-free and t7e-free (the plugin resolves the strings and passes them
 * in) so the chart configuration is unit-testable in isolation.
 */

import type * as echarts from 'echarts';

/** A single sample of the secondary satellite's RIC offset at a point in time. */
export interface RicPoint {
  /** Elapsed time from the first sample, in minutes. */
  t: number;
  /** Radial offset (km). */
  r: number;
  /** In-Track offset (km). */
  i: number;
  /** Cross-Track offset (km). */
  c: number;
  /** Total range = sqrt(r^2 + i^2 + c^2) (km). */
  range: number;
  /** ISO timestamp of the sample, used in tooltips. */
  iso: string;
}

/** All user-facing strings the chart needs, resolved by the caller. */
export interface RicChartLabels {
  radial: string;
  inTrack: string;
  crossTrack: string;
  range: string;
  timeAxis: string;
  distanceAxis: string;
  empty: string;
  unitKm: string;
  unitMin: string;
}

const COLORS = {
  radial: '#ff5252',
  inTrack: '#4caf50',
  crossTrack: '#42a5f5',
  range: '#ffb300',
} as const;

/** The four sub-plots, laid out in a 2x2 grid sharing the time axis. */
const PANELS = [
  { key: 'r', color: COLORS.radial, gridIndex: 0 },
  { key: 'i', color: COLORS.inTrack, gridIndex: 1 },
  { key: 'c', color: COLORS.crossTrack, gridIndex: 2 },
  { key: 'range', color: COLORS.range, gridIndex: 3 },
] as const;

/** 2x2 grid geometry (percent of the canvas). */
const GRID_LAYOUT = [
  { left: '7%', top: '8%', width: '38%', height: '34%' },
  { left: '57%', top: '8%', width: '38%', height: '34%' },
  { left: '7%', top: '55%', width: '38%', height: '34%' },
  { left: '57%', top: '55%', width: '38%', height: '34%' },
];

/** Title geometry, one above each grid. */
const TITLE_LAYOUT = [
  { left: '7%', top: '2%' },
  { left: '57%', top: '2%' },
  { left: '7%', top: '49%' },
  { left: '57%', top: '49%' },
];

/** Builds the echarts option for the 2D RIC plots. */
export const buildRicChartOption = (points: RicPoint[], labels: RicChartLabels): echarts.EChartsOption => {
  const isEmpty = points.length === 0;
  const panelLabels = [labels.radial, labels.inTrack, labels.crossTrack, labels.range];

  return {
    animation: false,
    backgroundColor: 'transparent',
    title: TITLE_LAYOUT.map((pos, idx) => ({
      ...pos,
      text: panelLabels[idx],
      textStyle: { color: PANELS[idx].color, fontSize: 14 },
    })),
    graphic: isEmpty
      ? [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: labels.empty,
            fill: '#bbb',
            fontSize: 16,
          },
        },
      ]
      : [],
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      label: { backgroundColor: '#555' },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const arr = Array.isArray(params) ? params : [params];
        const first = arr[0] as { axisValue?: number };
        const time = typeof first?.axisValue === 'number' ? first.axisValue.toFixed(1) : '';
        const rows = arr
          .map((p) => {
            const point = p as { color?: string; seriesName?: string; value?: number[] };
            const val = point.value?.[1];

            if (typeof val !== 'number') {
              return '';
            }

            return `
              <div style="display: flex; align-items: center; margin-top: 2px;">
                <div style="width: 10px; height: 10px; background-color: ${point.color};
                  border-radius: 50%; margin-right: 5px;"></div>
                <span>${point.seriesName}: <b>${val.toFixed(2)} ${labels.unitKm}</b></span>
              </div>`;
          })
          .join('');

        return `
          <div style="text-align: left;">
            <div><b>${time} ${labels.unitMin}</b></div>
            ${rows}
          </div>`;
      },
    },
    grid: GRID_LAYOUT,
    xAxis: PANELS.map((_, idx) => ({
      type: 'value' as const,
      gridIndex: idx,
      name: labels.timeAxis,
      nameLocation: 'middle' as const,
      nameGap: 25,
      // Start at zero and let echarts round the upper bound to a clean tick so the
      // axis spans (just over) the full 5-orbit window without a ragged max label.
      min: 0,
      axisLabel: { color: '#999' },
      nameTextStyle: { color: '#ccc', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    })),
    yAxis: PANELS.map((_, idx) => ({
      type: 'value' as const,
      gridIndex: idx,
      name: labels.distanceAxis,
      nameLocation: 'middle' as const,
      nameGap: 45,
      scale: true,
      axisLabel: { color: '#999' },
      nameTextStyle: { color: '#ccc', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    })),
    dataZoom: [
      {
        type: 'inside' as const,
        xAxisIndex: [0, 1, 2, 3],
      },
      {
        type: 'slider' as const,
        show: true,
        xAxisIndex: [0, 1, 2, 3],
        left: '7%',
        right: '5%',
        bottom: 8,
        height: 16,
      },
    ],
    series: PANELS.map((panel) => ({
      type: 'line' as const,
      name: panelLabels[panel.gridIndex],
      xAxisIndex: panel.gridIndex,
      yAxisIndex: panel.gridIndex,
      showSymbol: false,
      lineStyle: { width: 2, color: panel.color },
      itemStyle: { color: panel.color },
      emphasis: { focus: 'series' as const },
      data: points.map((p) => [p.t, p[panel.key]]),
    })),
  };
};
