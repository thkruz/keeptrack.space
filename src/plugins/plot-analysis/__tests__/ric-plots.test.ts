import { RicPlot } from '@app/plugins/plot-analysis/ric-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('RicPlot_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  it('constructs without throwing', () => {
    expect(() => new RicPlot()).not.toThrow();
  });

  standardPluginSmokeSuite(RicPlot, 'RicPlot');

  describe('assessment header', () => {
    const assessment = { relationship: 'co-orbital' as const, planeAngleDeg: 0.4, periodDiffPct: 0.2, maxRangeKm: 1234.4 };
    const render = (plot: RicPlot, rangeNowKm: number): string =>
      (plot as unknown as { renderAssessment_: (a: typeof assessment, r: number) => string }).renderAssessment_(assessment, rangeNowKm);

    it('labels the window maximum as "Max range (N orbits)" and adds the current range', () => {
      const plot = new RicPlot();
      const html = render(plot, 12.34);

      expect(html).toContain('Max range (');
      expect(html).toMatch(/orbits\) 1234 km/u);
      expect(html).toContain('Range now 12.3 km');
    });

    it('omits "Range now" when there is no first sample', () => {
      const html = render(new RicPlot(), NaN);

      expect(html).toContain('Max range (');
      expect(html).not.toContain('Range now');
    });
  });
});
