import { renderCustomSensorList } from '../custom-sensor-list-renderer';

describe('renderCustomSensorList precision', () => {
  const sensor = { uiName: 'RIDGE', objName: 'RIDGE', lat: 10.25, lon: -20, alt: 1.5, minAz: 0, maxAz: 360, minEl: 2.5, maxEl: 90, minRng: 0, maxRng: 2000 };

  it('shows the typed altitude without rounding to whole km', () => {
    const html = renderCustomSensorList([sensor as never], (k) => k, '');

    expect(html).toContain('1.5 km');
    expect(html).not.toContain('2 km');
    expect(html).toContain('10.25°');
    expect(html).toContain('-20°');
  });
});
