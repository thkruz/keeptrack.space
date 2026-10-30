import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { RicPlot } from '@app/plugins/plot-analysis/ric-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';
import { vi } from 'vitest';

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

  describe('selection changes while open', () => {
    let plot: RicPlot;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = () => plot as any;
    const primary = { id: 1, name: 'PRI', sccNum: '00001' };
    const secondary = { id: 2, name: 'SEC', sccNum: '00002' };

    beforeEach(() => {
      plot = new RicPlot();
      plot.addHtml();
      const canvas = document.createElement('div');

      canvas.id = plot.plotCanvasId;
      document.body.appendChild(canvas);
      p().isMenuButtonActive = true;
      p().isIconDisabled = false;
      p().selectSatManager_.selectedSat = 1;
      p().selectSatManager_.secondarySat = 2;
      p().selectSatManager_.secondarySatObj = secondary;
    });

    afterEach(() => {
      document.getElementById(plot.plotCanvasId)?.remove();
      vi.restoreAllMocks();
    });

    it('a new primary with the secondary kept redraws the plot for the new pair', () => {
      const createSpy = vi.spyOn(plot, 'createPlot').mockImplementation(() => undefined);
      const dataSpy = vi.spyOn(plot, 'getPlotData').mockReturnValue([]);

      p().selectSatManager_.selectedSat = 3;
      EventBus.getInstance().emit(EventBusEvent.selectSatData, { ...primary, id: 3 } as never, 3);

      expect(dataSpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('a new secondary redraws the plot', () => {
      const createSpy = vi.spyOn(plot, 'createPlot').mockImplementation(() => undefined);

      vi.spyOn(plot, 'getPlotData').mockReturnValue([]);
      EventBus.getInstance().emit(EventBusEvent.setSecondarySat, secondary as never, 2);

      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('losing the secondary closes the plot and disables the icon (no stale pair)', () => {
      const createSpy = vi.spyOn(plot, 'createPlot').mockImplementation(() => undefined);
      const hideSpy = vi.spyOn(plot, 'hideSideMenus');

      p().selectSatManager_.secondarySat = -1;
      p().selectSatManager_.secondarySatObj = null;
      EventBus.getInstance().emit(EventBusEvent.setSecondarySat, null as never, -1);

      expect(createSpy).not.toHaveBeenCalled();
      expect(hideSpy).toHaveBeenCalled();
      expect(plot.isIconDisabled).toBe(true);
    });

    it('does not redraw while the plot is closed', () => {
      const createSpy = vi.spyOn(plot, 'createPlot').mockImplementation(() => undefined);

      p().isMenuButtonActive = false;
      EventBus.getInstance().emit(EventBusEvent.selectSatData, primary as never, 1);

      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
