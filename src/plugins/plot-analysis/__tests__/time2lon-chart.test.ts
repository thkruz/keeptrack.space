/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildChartOption, computeLonRange, Time2LonChartLabels } from '@app/plugins/plot-analysis/time2lon-chart';
import { Time2LonSatLine } from '@app/plugins/plot-analysis/time2lon-core';

const labels: Time2LonChartLabels = {
  title: 'Waterfall',
  xAxis: 'Longitude',
  yAxis: 'Time',
  tooltipCountry: 'Country',
  tooltipLongitude: 'Longitude',
  tooltipTime: 'Time from now',
  unitMin: 'min',
  empty: 'No objects match the current filters',
};

const line = (over: Partial<Time2LonSatLine> = {}): Time2LonSatLine => ({
  satName: 'GEOSAT',
  satId: 1,
  country: 'United States',
  points: [
    { value: [100, 0], satName: 'GEOSAT', satId: 1 },
    { value: [101, 30], satName: 'GEOSAT', satId: 1 },
  ],
  ...over,
});

describe('time2lon-chart computeLonRange', () => {
  it('returns a padded min/max spanning the data', () => {
    const range = computeLonRange([line()])!;

    expect(range.min).toBeLessThan(100);
    expect(range.max).toBeGreaterThan(101);
  });

  it('returns null when there is no data', () => {
    expect(computeLonRange([])).toBeNull();
  });

  it('clamps the window to the ±180 belt', () => {
    const range = computeLonRange([line({ points: [{ value: [-180, 0], satName: 'A', satId: 2 }, { value: [180, 0], satName: 'B', satId: 3 }] })])!;

    expect(range.min).toBeGreaterThanOrEqual(-180);
    expect(range.max).toBeLessThanOrEqual(180);
  });
});

describe('time2lon-chart buildChartOption', () => {
  it('builds one line series per satellite with the data x-range', () => {
    const option = buildChartOption([line(), line({ satId: 2 })], labels) as any;

    expect(option.series).toHaveLength(2);
    expect(option.series[0].type).toBe('line');
    expect(option.series[0].name).toBe('United States');
    expect(option.title.text).toBe('Waterfall');

    const xZoom = option.dataZoom.find((z: any) => z.type === 'slider' && z.xAxisIndex);

    expect(xZoom.startValue).toBeLessThan(100);
    expect(xZoom.endValue).toBeGreaterThan(101);
    // Sliders are inset from the canvas edges so they are not clipped by the menu.
    expect(xZoom.bottom).toBeGreaterThan(0);
    const yZoom = option.dataZoom.find((z: any) => z.type === 'slider' && z.yAxisIndex);

    expect(yZoom.right).toBeGreaterThan(0);
    expect(option.grid.right).toBeGreaterThan(0);
    expect(option.grid.bottom).toBeGreaterThan(0);
    // The empty-state graphic should be absent when there is data.
    expect(option.graphic).toEqual([]);
  });

  it('shows the empty-state graphic and no series when there is no data', () => {
    const option = buildChartOption([], labels) as any;

    expect(option.series).toHaveLength(0);
    expect(option.graphic).toHaveLength(1);
    expect(option.graphic[0].style.text).toBe('No objects match the current filters');
  });

  it('formats the tooltip with the localized labels', () => {
    const option = buildChartOption([line()], labels) as any;
    const formatted = option.tooltip.formatter({
      data: { value: [123.456, 12.34], satName: 'GEOSAT', satId: 1 },
      color: '#fff',
      seriesName: 'United States',
    });

    expect(formatted).toContain('GEOSAT');
    expect(formatted).toContain('United States');
    expect(formatted).toContain('123.456');
    expect(formatted).toContain('12.34');
    expect(formatted).toContain('min');
  });

  it('returns an empty string for a malformed tooltip data point', () => {
    const option = buildChartOption([line()], labels) as any;

    expect(option.tooltip.formatter({ data: undefined })).toBe('');
  });
});
