/* eslint-disable dot-notation */
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
});
