import { buildGabbardOption } from '@app/plugins/breakup-analysis/breakup-gabbard-chart';

const labels = { apogee: 'Apogee', perigee: 'Perigee', periodAxis: 'Period (min)', altitudeAxis: 'Altitude (km)' };

describe('buildGabbardOption', () => {
  it('emits an apogee and perigee scatter series with the supplied data', () => {
    const option = buildGabbardOption({ apogee: [[100, 900]], perigee: [[100, 800]] }, labels) as {
      series: Array<{ name: string; type: string; data: number[][] }>;
    };

    expect(option.series).toHaveLength(2);
    expect(option.series[0]).toMatchObject({ name: 'Apogee', type: 'scatter', data: [[100, 900]] });
    expect(option.series[1]).toMatchObject({ name: 'Perigee', type: 'scatter', data: [[100, 800]] });
  });

  it('labels both axes from the supplied labels', () => {
    const option = buildGabbardOption({ apogee: [], perigee: [] }, labels) as {
      xAxis: { name: string };
      yAxis: { name: string };
    };

    expect(option.xAxis.name).toBe('Period (min)');
    expect(option.yAxis.name).toBe('Altitude (km)');
  });
});
