import { vi } from 'vitest';
/* eslint-disable dot-notation */
import { KeepTrack } from '@app/keeptrack';
import { Inc2LonPlots } from '@app/plugins/plot-analysis/inc2lon';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('Inc2LonPlots_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);

    // Mock engine for isRenderPausedOnOpen
    KeepTrack.getInstance().engine = {
      pause: vi.fn(),
      resume: vi.fn(),
    } as unknown as typeof KeepTrack.prototype.engine;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(Inc2LonPlots, 'Inc2LonPlots');
  standardPluginMenuButtonTests(Inc2LonPlots, 'Inc2LonPlots');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new Inc2LonPlots();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('inc2lon-plots-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toBeDefined();
    });

    it('should return correct side menu config', () => {
      const plugin = new Inc2LonPlots();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('inc2lon-plots-menu');
      expect(config.dragOptions?.isDraggable).toBe(false);
    });

    it('should return correct help config', () => {
      const plugin = new Inc2LonPlots();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
    });

    it('should return keyboard shortcuts with G key', () => {
      const plugin = new Inc2LonPlots();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('g');
      expect(shortcuts[0].callback).toBeInstanceOf(Function);
    });

    it('should have isRenderPausedOnOpen set to true', () => {
      const plugin = new Inc2LonPlots();

      expect(plugin.isRenderPausedOnOpen).toBe(true);
    });

    it('should build side menu HTML with full wrapper (no secondary menu in OSS)', () => {
      const plugin = new Inc2LonPlots();
      const menuHtml = plugin['buildSideMenuHtml_']();

      expect(menuHtml).toContain('side-menu-parent');
      expect(menuHtml).toContain('plot-analysis-chart-inc2lon');
    });
  });

  describe('onBottomIconClick', () => {
    it('should not create plot when menu is inactive', () => {
      const plugin = new Inc2LonPlots();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      expect(() => plugin.onBottomIconClick()).not.toThrow();
    });

    it('should call bottomIconCallback bridge', () => {
      const plugin = new Inc2LonPlots();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onBottomIconDeselect', () => {
    it('should handle deselect when chart is null', () => {
      const plugin = new Inc2LonPlots();

      websiteInit(plugin);

      expect(plugin.chart).toBeNull();
      expect(() => plugin.onBottomIconDeselect()).not.toThrow();
      expect(plugin.chart).toBeNull();
    });
  });

  describe('buildTopCountries_', () => {
    it('should return top countries with display names', () => {
      const counts: Record<string, number> = {
        US: 100,
        RU: 50,
        CN: 30,
        J: 20,
        F: 10,
      };
      const lookup = Inc2LonPlots.buildTopCountries_(counts);

      expect(lookup.get('US')).toBeDefined();
      expect(lookup.get('US')).not.toBe('Other');
      expect(lookup.get('RU')).not.toBe('Other');
    });

    it('should group countries beyond top N as Other', () => {
      const counts: Record<string, number> = {};

      for (let i = 0; i < 25; i++) {
        counts[`C${i}`] = 100 - i;
      }

      const lookup = Inc2LonPlots.buildTopCountries_(counts);

      // Top 15 should have their own names
      expect(lookup.get('C0')).toBe('C0');
      expect(lookup.get('C14')).toBe('C14');
      // Beyond top 15 should be Other
      expect(lookup.get('C15')).toBe('Other');
      expect(lookup.get('C24')).toBe('Other');
    });

    it('should handle empty input', () => {
      const lookup = Inc2LonPlots.buildTopCountries_({});

      expect(lookup.size).toBe(0);
    });
  });

  describe('buildAllowedTypes_', () => {
    it('should include PAYLOAD when active payloads enabled', () => {
      const types = Inc2LonPlots.buildAllowedTypes_({
        activePayloads: true,
        inactivePayloads: false,
        rocketBodies: false,
        debris: false,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 17,
        maxEccentricity: 0.1,
        minPeriod: 1240,
        maxPeriod: 1640,
      });

      expect(types.has(SpaceObjectType.PAYLOAD)).toBe(true);
      expect(types.has(SpaceObjectType.ROCKET_BODY)).toBe(false);
    });

    it('should include multiple types when multiple filters enabled', () => {
      const types = Inc2LonPlots.buildAllowedTypes_({
        activePayloads: true,
        inactivePayloads: false,
        rocketBodies: true,
        debris: true,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 17,
        maxEccentricity: 0.1,
        minPeriod: 1240,
        maxPeriod: 1640,
      });

      expect(types.has(SpaceObjectType.PAYLOAD)).toBe(true);
      expect(types.has(SpaceObjectType.ROCKET_BODY)).toBe(true);
      expect(types.has(SpaceObjectType.DEBRIS)).toBe(true);
    });

    it('should return empty set when nothing enabled', () => {
      const types = Inc2LonPlots.buildAllowedTypes_({
        activePayloads: false,
        inactivePayloads: false,
        rocketBodies: false,
        debris: false,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 17,
        maxEccentricity: 0.1,
        minPeriod: 1240,
        maxPeriod: 1640,
      });

      expect(types.size).toBe(0);
    });
  });
});
