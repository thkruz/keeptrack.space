import { BreakupAnalysis } from '@app/plugins/breakup-analysis/breakup-analysis';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('BreakupAnalysis_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSuite(BreakupAnalysis, 'BreakupAnalysis');
  standardPluginMenuButtonTests(BreakupAnalysis, 'BreakupAnalysis');

  describe('configuration', () => {
    it('should return bottom icon config', () => {
      const plugin = new BreakupAnalysis();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('breakup-analysis-bottom-icon');
      expect(config.image).toBeDefined();
    });

    it('should return side menu config', () => {
      const plugin = new BreakupAnalysis();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('breakup-analysis-menu');
      expect(config.html).toContain('breakup-analysis-event-table');
      expect(config.html).toContain('breakup-analysis-detail');
    });

    it('should return help config', () => {
      const plugin = new BreakupAnalysis();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return drag options with min/max width', () => {
      const plugin = new BreakupAnalysis();
      const config = plugin.getSideMenuConfig();

      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(400);
      expect(config.dragOptions?.maxWidth).toBe(800);
    });
  });

  describe('event list', () => {
    it('should render all 6 breakup events in the table', () => {
      const plugin = new BreakupAnalysis();

      websiteInit(plugin);

      const config = plugin.getSideMenuConfig();

      expect(config.html).toContain('Fengyun-1C');
      expect(config.html).toContain('Cosmos 2251');
      expect(config.html).toContain('Iridium 33');
      expect(config.html).toContain('Cosmos 1408');
      expect(config.html).toContain('Briz-M');
      expect(config.html).toContain('USA-193');
    });

    it('should include breakup dates in the event table', () => {
      const plugin = new BreakupAnalysis();
      const config = plugin.getSideMenuConfig();

      expect(config.html).toContain('2007-01-11');
      expect(config.html).toContain('2009-02-10');
      expect(config.html).toContain('2021-11-15');
    });
  });

  describe('onBottomIconClick', () => {
    it('should not throw when menu is not active', () => {
      const plugin = new BreakupAnalysis();

      websiteInit(plugin);
      plugin.isMenuButtonActive = false;

      expect(() => plugin.onBottomIconClick()).not.toThrow();
    });

    it('should call bottomIconCallback', () => {
      const plugin = new BreakupAnalysis();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('command palette', () => {
    it('exposes Open and Export commands', () => {
      const plugin = new BreakupAnalysis();
      const commands = plugin.getCommandPaletteCommands();

      expect(commands.map((c) => c.id)).toEqual(['BreakupAnalysis.open', 'BreakupAnalysis.export']);
    });

    it('gates Export availability on having tracked fragments', () => {
      const plugin = new BreakupAnalysis();
      const exportCmd = plugin.getCommandPaletteCommands().find((c) => c.id === 'BreakupAnalysis.export')!;

      expect(exportCmd.isAvailable?.()).toBe(false);
    });
  });

  describe('showEventList_', () => {
    it('should clear selected event and debris results', () => {
      const plugin = new BreakupAnalysis();

      websiteInit(plugin);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = plugin as any;

      p.selectedEventId_ = 'fengyun1c';
      p.debrisResults_ = [{}];

      p.showEventList_();

      expect(p.selectedEventId_).toBeNull();
      expect(p.debrisResults_).toHaveLength(0);
    });
  });
});
