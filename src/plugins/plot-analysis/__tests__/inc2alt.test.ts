/* eslint-disable dot-notation */
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { t7e } from '@app/locales/keys';
import { Inc2AltPlots } from '@app/plugins/plot-analysis/inc2alt';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('Inc2AltPlots_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(Inc2AltPlots, 'Inc2AltPlots');
  standardPluginMenuButtonTests(Inc2AltPlots, 'Inc2AltPlots');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new Inc2AltPlots();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('inc2alt-plots-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toBeDefined();
    });

    it('should return correct side menu config', () => {
      const plugin = new Inc2AltPlots();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('inc2alt-plots-menu');
    });

    it('should return correct help config', () => {
      const plugin = new Inc2AltPlots();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
    });

    it('should return keyboard shortcuts with I key', () => {
      const plugin = new Inc2AltPlots();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('I');
      expect(shortcuts[0].callback).toBeInstanceOf(Function);
    });

    it('should build side menu HTML', () => {
      const plugin = new Inc2AltPlots();
      const html = plugin['buildSideMenuHtml_']();

      expect(html).toContain('inc2alt-plots-menu');
      expect(html).toContain('plot-analysis-chart-inc2alt');
      expect(html).toContain('inc2alt-stats');
    });
  });

  describe('onBottomIconClick', () => {
    it('should not create plot when menu is inactive', () => {
      const plugin = new Inc2AltPlots();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      expect(() => plugin.onBottomIconClick()).not.toThrow();
    });

    it('should call bottomIconCallback bridge', () => {
      const plugin = new Inc2AltPlots();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getPlotData', () => {
    it('should return constellation-grouped data', () => {
      const plugin = new Inc2AltPlots();
      const data = plugin.getPlotData();

      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(8);
      expect(data[0].name).toBe('Starlink');
      expect(data[data.length - 1].name).toBe('Other');
    });

    it('should have all expected constellation names', () => {
      const plugin = new Inc2AltPlots();
      const data = plugin.getPlotData();
      const names = data.map((d) => d.name);

      expect(names).toEqual(['Starlink', 'OneWeb', 'Iridium', 'Orbcomm', 'Globalstar', 'Planet', 'Spire', 'Other']);
    });
  });

  describe('onBottomIconDeselect', () => {
    it('should handle deselect when chart is null', () => {
      const plugin = new Inc2AltPlots();

      websiteInit(plugin);

      expect(plugin.chart).toBeNull();
      expect(() => plugin.onBottomIconDeselect()).not.toThrow();
      expect(plugin.chart).toBeNull();
    });
  });

  describe('Chart disposal on close', () => {
    it('disposes the chart when hideSideMenus closes the menu', () => {
      const plugin = new Inc2AltPlots();

      websiteInit(plugin);
      const disposeSpy = vi.spyOn(plugin as unknown as { disposeChart_: () => void }, 'disposeChart_');

      plugin['isMenuButtonActive'] = false;
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('keeps the chart when the menu is still active', () => {
      const plugin = new Inc2AltPlots();

      websiteInit(plugin);
      const disposeSpy = vi.spyOn(plugin as unknown as { disposeChart_: () => void }, 'disposeChart_');
      // Block the base listener from marking the menu inactive, so this models a hideSideMenus
      // emitted while the plot is being opened.
      vi.spyOn(plugin as unknown as { markMenuButtonInactive_: () => void }, 'markMenuButtonInactive_').mockImplementation(() => undefined);

      plugin['isMenuButtonActive'] = true;
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);

      expect(disposeSpy).not.toHaveBeenCalled();
    });

    it('drops the chart reference and the resize listener', () => {
      const plugin = new Inc2AltPlots();
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const handler = () => undefined;

      plugin['resizeHandler_'] = handler;
      plugin.onBottomIconDeselect();

      expect(removeSpy).toHaveBeenCalledWith('resize', handler);
      expect(plugin['resizeHandler_']).toBeNull();
      expect(plugin.chart).toBeNull();
    });
  });

  describe('Total label', () => {
    const base = {
      activePayloads: false,
      inactivePayloads: false,
      rocketBodies: false,
      debris: false,
      celestrak: true,
      vimpel: false,
      minAltitude: 70,
      maxAltitude: 3000,
      minInclination: 0,
      maxInclination: 180,
      maxPeriod: 250,
    };
    const key = (k: string) => t7e(`plugins.Inc2AltPlots.labels.${k}` as Parameters<typeof t7e>[0]);

    it('names payloads when only payloads (or nothing) are included', () => {
      expect(Inc2AltPlots.totalLabel_({ ...base, activePayloads: true })).toBe(key('totalLeoPayloads'));
      expect(Inc2AltPlots.totalLabel_({ ...base, activePayloads: true, inactivePayloads: true })).toBe(key('totalLeoPayloads'));
      expect(Inc2AltPlots.totalLabel_(base)).toBe(key('totalLeoPayloads'));
    });

    it('names the single non-payload type', () => {
      expect(Inc2AltPlots.totalLabel_({ ...base, rocketBodies: true })).toBe(key('totalLeoRocketBodies'));
      expect(Inc2AltPlots.totalLabel_({ ...base, debris: true })).toBe(key('totalLeoDebris'));
    });

    it('says objects when the set mixes types', () => {
      expect(Inc2AltPlots.totalLabel_({ ...base, activePayloads: true, rocketBodies: true })).toBe(key('totalLeoObjects'));
      expect(Inc2AltPlots.totalLabel_({ ...base, rocketBodies: true, debris: true })).toBe(key('totalLeoObjects'));
    });

    it('writes the label into the footer', () => {
      const plugin = new Inc2AltPlots();

      document.body.insertAdjacentHTML('beforeend', plugin['buildSideMenuHtml_']());
      plugin['currentFilters_'] = { ...base, activePayloads: true, rocketBodies: true };
      plugin['updateStatistics_']([{ name: 'Other', value: [[98, 500, 95, 'A', 1, 0, 0, 'US']] }]);

      expect(document.getElementById('inc2alt-total-count')?.textContent).toBe(`${key('totalLeoObjects')}: 1`);
    });
  });

  describe('Empty result', () => {
    it('shows the no-match message only when nothing is plotted', () => {
      const plugin = new Inc2AltPlots();

      document.body.insertAdjacentHTML('beforeend', plugin['buildSideMenuHtml_']());
      const message = document.getElementById('inc2alt-empty-message')!;

      expect(message.hidden).toBe(true);

      plugin['updateStatistics_']([{ name: 'Other', value: [] }]);
      expect(message.hidden).toBe(false);
      expect(message.textContent).toBe(t7e('plugins.Inc2AltPlots.labels.noMatches' as Parameters<typeof t7e>[0]));

      plugin['updateStatistics_']([{ name: 'Other', value: [[98, 500, 95, 'A', 1, 0, 0, 'US']] }]);
      expect(message.hidden).toBe(true);
    });

    it('pins empty-plot axes to the filter ranges (altitude on x, inclination on y)', () => {
      const bounds = Inc2AltPlots.emptyAxisBounds_({
        activePayloads: true,
        inactivePayloads: false,
        rocketBodies: false,
        debris: false,
        celestrak: true,
        vimpel: false,
        minAltitude: 500,
        maxAltitude: 900,
        minInclination: 40,
        maxInclination: 60,
        maxPeriod: 250,
      });

      expect(bounds.xAxis).toEqual({ min: 500, max: 900 });
      expect(bounds.yAxis).toEqual({ min: 40, max: 60 });
    });

    it('widens a range that collapsed to one value', () => {
      const bounds = Inc2AltPlots.emptyAxisBounds_({
        activePayloads: true,
        inactivePayloads: false,
        rocketBodies: false,
        debris: false,
        celestrak: true,
        vimpel: false,
        minAltitude: 0,
        maxAltitude: 0,
        minInclination: 99,
        maxInclination: 99,
        maxPeriod: 250,
      });

      expect(bounds.xAxis).toEqual({ min: 0, max: 10 });
      expect(bounds.yAxis).toEqual({ min: 98, max: 100 });
    });
  });
});
