/**
 * time2lon-chart.ts - Pure echarts option builder for the Waterfall plot.
 *
 * Given the satellite lines and a set of pre-localized labels, it returns the
 * full echarts option object. Kept DOM-free and t7e-free (the plugin resolves
 * the strings and passes them in) so the chart configuration is unit-testable in
 * isolation.
 */

import type * as echarts from 'echarts';
import { Time2LonDataPoint, Time2LonSatLine } from './time2lon-core';

/** All user-facing strings the chart needs, resolved by the caller. */
export interface Time2LonChartLabels {
  title: string;
  xAxis: string;
  yAxis: string;
  tooltipCountry: string;
  tooltipLongitude: string;
  tooltipTime: string;
  unitMin: string;
  empty: string;
}

/** Color of the selected object's trace: bright amber so it stands out from the country palette. */
export const HIGHLIGHT_COLOR = '#ffc400';

/** Widest the default longitude window is allowed to open to. */
const LON_LIMIT = 180;
/** Fallback half-window (deg) when the data spans a single longitude. */
const MIN_HALF_SPAN = 5;

/**
 * The min/max longitude across every plotted point, padded so the markers are
 * not flush against the axis. Returns null when there is no data, letting the
 * caller fall back to the full belt.
 */
export const computeLonRange = (data: Time2LonSatLine[]): { min: number; max: number } | null => {
  let min = Infinity;
  let max = -Infinity;

  for (const sat of data) {
    for (const point of sat.points) {
      const lon = point.value[0];

      if (lon < min) {
        min = lon;
      }
      if (lon > max) {
        max = lon;
      }
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  const pad = Math.max((max - min) * 0.05, MIN_HALF_SPAN);

  return {
    min: Math.max(-LON_LIMIT, min - pad),
    max: Math.min(LON_LIMIT, max + pad),
  };
};

/** One echarts line series for a satellite; the selected object gets a distinct, labelled style. */
const buildSeries = (sat: Time2LonSatLine, isHighlighted: boolean) => {
  const base = {
    type: 'line' as const,
    name: sat.country,
    id: sat.satId.toString(),
    data: sat.points,
    symbol: 'circle',
    symbolSize: 10,
    lineStyle: { width: 1 },
    itemStyle: { opacity: 1 },
    emphasis: {
      focus: 'series' as const,
      itemStyle: { opacity: 1 },
      lineStyle: {
        color: '#fff',
        width: 3,
      },
    },
  };

  if (!isHighlighted) {
    return base;
  }

  return {
    ...base,
    z: 10,
    symbolSize: 12,
    color: HIGHLIGHT_COLOR,
    lineStyle: { width: 3, color: HIGHLIGHT_COLOR },
    itemStyle: { opacity: 1, color: HIGHLIGHT_COLOR, borderColor: '#000', borderWidth: 1 },
    endLabel: {
      show: true,
      formatter: sat.satName,
      color: HIGHLIGHT_COLOR,
      fontWeight: 'bold' as const,
      fontSize: 13,
      textBorderColor: '#000',
      textBorderWidth: 2,
    },
  };
};

/**
 * Builds the echarts option for the waterfall plot. When `highlightSatId` matches a
 * plotted line (the user's selected object), that trace is drawn last in a distinct
 * color with a name label so it can be found without hovering.
 */
export const buildChartOption = (data: Time2LonSatLine[], labels: Time2LonChartLabels, highlightSatId: number | null = null): echarts.EChartsOption => {
  const range = computeLonRange(data) ?? { min: -LON_LIMIT, max: LON_LIMIT };
  const isEmpty = data.length === 0;
  const isHighlight = (sat: Time2LonSatLine) => highlightSatId !== null && sat.satId === highlightSatId;
  // Draw the highlighted line last so it sits on top, and so the legend swatch for its
  // country keeps the palette color of an ordinary series.
  const ordered = [...data.filter((sat) => !isHighlight(sat)), ...data.filter(isHighlight)];

  return {
    animation: false,
    title: {
      text: labels.title,
      textStyle: {
        fontSize: 16,
        color: '#fff',
      },
    },
    legend: {
      show: true,
      top: 30,
      textStyle: {
        color: '#fff',
      },
    },
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
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const p = (Array.isArray(params) ? params[0] : params) as { data?: Time2LonDataPoint; color?: string; seriesName?: string };
        const d = p.data;

        if (!d?.value) {
          return '';
        }

        const satName = d.satName ?? '';

        return `
          <div style="text-align: left;">
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
              <div style="width: 10px; height: 10px; background-color: ${p.color};
                border-radius: 50%; margin-right: 5px;"></div>
              <span style="font-weight: bold;">${satName}</span>
            </div>
            <div><b>${labels.tooltipCountry}:</b> ${p.seriesName}</div>
            <div><b>${labels.tooltipLongitude}:</b> ${d.value[0].toFixed(3)}°</div>
            <div><b>${labels.tooltipTime}:</b> ${d.value[1].toFixed(2)} ${labels.unitMin}</div>
          </div>
        `;
      },
    },
    // Leave room on the right for the vertical zoom slider and at the bottom for
    // the horizontal one, so neither is clipped against the canvas edge.
    grid: {
      right: 75,
      bottom: 110,
    },
    xAxis: {
      name: labels.xAxis,
      type: 'value' as const,
      position: 'bottom',
      nameLocation: 'middle',
      nameGap: 35,
      axisLabel: { color: '#999' },
      nameTextStyle: { color: '#fff', fontSize: 14 },
    },
    yAxis: {
      name: labels.yAxis,
      type: 'value' as const,
      position: 'left',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: { color: '#999' },
      nameTextStyle: { color: '#fff', fontSize: 14 },
    },
    dataZoom: [
      {
        type: 'slider' as const,
        show: true,
        xAxisIndex: [0],
        startValue: range.min,
        endValue: range.max,
        bottom: 40,
        height: 24,
      },
      {
        type: 'slider' as const,
        show: true,
        yAxisIndex: [0],
        right: 25,
        width: 20,
        start: 0,
        end: 100,
      },
      {
        type: 'inside' as const,
        xAxisIndex: [0],
        startValue: range.min,
        endValue: range.max,
      },
      {
        type: 'inside' as const,
        yAxisIndex: [0],
      },
    ],
    series: ordered.map((sat) => buildSeries(sat, isHighlight(sat))),
  };
};
