import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { Inc2LonPlots } from '@app/plugins/plot-analysis/inc2lon';
import { RicPlot } from '@app/plugins/plot-analysis/ric-plots';
import { Time2LonPlots } from '@app/plugins/plot-analysis/time2lon';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const clickHandlers: ((event: { data: unknown }) => void)[] = [];

vi.mock('echarts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('echarts')>();
  const chart = {
    on: (_name: string, cb: (event: { data: unknown }) => void) => {
      clickHandlers.push(cb);
    },
    setOption: vi.fn(),
    resize: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
  };

  return { ...actual, init: vi.fn(() => chart), dispose: vi.fn() };
});

describe('plot-analysis pluginActionUsed', () => {
  let emit: ReturnType<typeof vi.spyOn>;
  const used = (id: string) => emit.mock.calls.some((c) => c[0] === EventBusEvent.pluginActionUsed && c[1] === id);

  beforeEach(() => {
    clickHandlers.length = 0;
    setupStandardEnvironment([SelectSatManager]);
    emit = vi.spyOn(EventBus.getInstance(), 'emit');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RicPlot', () => {
    const plot = (primary: number, secondary: number, points: unknown[]) => {
      const ric = new RicPlot() as unknown as {
        isMenuButtonActive: boolean;
        selectSatManager_: { selectedSat: number; secondarySat: number; secondarySatObj: null };
        updateInfo_: () => void;
        createPlot: (p: unknown[], el: HTMLElement) => void;
      };

      ric.isMenuButtonActive = true;
      ric.selectSatManager_ = { selectedSat: primary, secondarySat: secondary, secondarySatObj: null };
      ric.updateInfo_ = vi.fn();
      ric.createPlot(points, document.createElement('div'));
    };
    const point = { t: 0, r: 1, i: 2, c: 3, range: 4, iso: '2026-01-01T00:00:00.000Z' };

    it('emits when a plot is generated for a primary/secondary pair', () => {
      plot(1, 2, [point]);
      expect(used('RicPlot')).toBe(true);
    });

    it('does not emit without a secondary or without data', () => {
      plot(1, -1, [point]);
      plot(1, 2, []);
      expect(used('RicPlot')).toBe(false);
    });
  });

  describe.each([
    ['Time2LonPlots', () => new Time2LonPlots(), { satId: 7 }],
    ['Inc2LonPlots', () => new Inc2LonPlots(), { id: 7 }],
  ])('%s', (id, make, data) => {
    it('emits when a plotted satellite is selected from the chart, not on PNG download', () => {
      const plugin = make() as unknown as { selectSatManager_: { selectSat: (n: number) => void }; initChart_: (el: HTMLElement) => void };
      const selectSat = vi.fn();

      plugin.selectSatManager_ = { selectSat };
      plugin.initChart_(document.createElement('div'));
      expect(used(id)).toBe(false);

      clickHandlers[0]({ data: {} });
      expect(used(id)).toBe(false);

      clickHandlers[0]({ data });
      expect(selectSat).toHaveBeenCalledWith(7);
      expect(used(id)).toBe(true);
    });
  });
});
