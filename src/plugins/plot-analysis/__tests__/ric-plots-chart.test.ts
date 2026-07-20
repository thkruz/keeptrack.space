import { buildRicChartOption, RicChartLabels, RicPoint } from '@app/plugins/plot-analysis/ric-plots-chart';

const LABELS: RicChartLabels = {
  radial: 'Radial',
  inTrack: 'In-Track',
  crossTrack: 'Cross-Track',
  range: 'Range',
  timeAxis: 'Time (min)',
  distanceAxis: 'Distance (km)',
  empty: 'Select a primary and a secondary satellite',
  unitKm: 'km',
  unitMin: 'min',
};

const POINTS: RicPoint[] = [
  { t: 0, r: 1, i: 2, c: 3, range: Math.sqrt(14), iso: '2026-05-31T00:00:00.000Z' },
  { t: 0.9, r: 4, i: 5, c: 6, range: Math.sqrt(77), iso: '2026-05-31T00:00:54.000Z' },
];

describe('buildRicChartOption', () => {
  it('builds four stacked line panels sharing the time axis', () => {
    const opt = buildRicChartOption(POINTS, LABELS);

    expect(opt.series).toHaveLength(4);
    expect(opt.grid).toHaveLength(4);
    expect(opt.xAxis).toHaveLength(4);
    expect(opt.yAxis).toHaveLength(4);
    // Every series is a 2D line bound to its own grid.
    (opt.series as { type: string; gridIndex?: number }[]).forEach((s) => {
      expect(s.type).toBe('line');
    });
  });

  it('maps each panel to the matching RIC component over time', () => {
    const opt = buildRicChartOption(POINTS, LABELS);
    const series = opt.series as { name: string; data: number[][] }[];

    expect(series[0].name).toBe('Radial');
    expect(series[0].data).toEqual([
      [0, 1],
      [0.9, 4],
    ]);
    expect(series[1].data).toEqual([
      [0, 2],
      [0.9, 5],
    ]);
    expect(series[2].data).toEqual([
      [0, 3],
      [0.9, 6],
    ]);
    expect(series[3].data[0][1]).toBeCloseTo(Math.sqrt(14));
  });

  it('shows an empty-state message and no graphic when data exists', () => {
    const empty = buildRicChartOption([], LABELS);

    expect((empty.graphic as unknown[]).length).toBe(1);

    const filled = buildRicChartOption(POINTS, LABELS);

    expect((filled.graphic as unknown[]).length).toBe(0);
  });

  it('formats the axis tooltip with km and min units', () => {
    const opt = buildRicChartOption(POINTS, LABELS);
    const tip = (opt.tooltip as { formatter: (p: unknown) => string }).formatter([{ axisValue: 0.9, value: [0.9, 4], color: '#ff5252', seriesName: 'Radial' }]);

    expect(tip).toContain('0.9 min');
    expect(tip).toContain('4.00 km');
    expect(tip).toContain('Radial');
  });

  it('links the x-axes so zooming time stays in sync', () => {
    const opt = buildRicChartOption(POINTS, LABELS);
    const zoom = opt.dataZoom as { xAxisIndex: number[] }[];

    zoom.forEach((z) => expect(z.xAxisIndex).toEqual([0, 1, 2, 3]));
  });
});
