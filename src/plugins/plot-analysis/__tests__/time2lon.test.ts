import { vi } from 'vitest';
/* eslint-disable dot-notation */
import { KeepTrack } from '@app/keeptrack';
import { Time2LonPlots } from '@app/plugins/plot-analysis/time2lon';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('Time2LonPlots_class', () => {
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

  standardPluginSuite(Time2LonPlots, 'Time2LonPlots');
  standardPluginMenuButtonTests(Time2LonPlots, 'Time2LonPlots');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new Time2LonPlots();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('time2lon-plots-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toBeDefined();
    });

    it('should return correct side menu config', () => {
      const plugin = new Time2LonPlots();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('time2lon-plots-menu');
      expect(config.dragOptions?.isDraggable).toBe(false);
    });

    it('should return correct help config', () => {
      const plugin = new Time2LonPlots();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
    });

    it('should have isRenderPausedOnOpen set to true', () => {
      const plugin = new Time2LonPlots();

      expect(plugin.isRenderPausedOnOpen).toBe(true);
    });

    it('should build side menu HTML with full wrapper (no secondary menu in OSS)', () => {
      const plugin = new Time2LonPlots();
      const menuHtml = plugin['buildSideMenuHtml_']();

      // OSS has no secondary menu, so buildSideMenuHtml_ includes the wrapper
      expect(menuHtml).toContain('side-menu-parent');
      expect(menuHtml).toContain('plot-analysis-chart-time2lon');
      expect(menuHtml).toContain('time2lon-stats');
    });
  });

  describe('onBottomIconClick', () => {
    it('should not create plot when menu is inactive', () => {
      const plugin = new Time2LonPlots();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      expect(() => plugin.onBottomIconClick()).not.toThrow();
    });

    it('should call bottomIconCallback bridge', () => {
      const plugin = new Time2LonPlots();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onBottomIconDeselect', () => {
    it('should handle deselect when chart is null', () => {
      const plugin = new Time2LonPlots();

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
      const lookup = Time2LonPlots.buildTopCountries_(counts);

      // Top countries should have a display name (not 'Other')
      expect(lookup.get('US')).toBeDefined();
      expect(lookup.get('US')).not.toBe('Other');
      expect(lookup.get('RU')).toBeDefined();
      expect(lookup.get('RU')).not.toBe('Other');
      expect(lookup.get('CN')).not.toBe('Other');
      expect(lookup.get('J')).not.toBe('Other');
      expect(lookup.get('F')).not.toBe('Other');
    });

    it('should group countries beyond top N as Other', () => {
      const counts: Record<string, number> = {};

      // Create 25 countries with codes not in the country map
      for (let i = 0; i < 25; i++) {
        counts[`C${i}`] = 100 - i;
      }

      const lookup = Time2LonPlots.buildTopCountries_(counts);

      // Top 15 should keep their code (fallback when not in country map)
      expect(lookup.get('C0')).toBe('C0');
      expect(lookup.get('C14')).toBe('C14');

      // Beyond top 15 should be 'Other'
      expect(lookup.get('C15')).toBe('Other');
      expect(lookup.get('C24')).toBe('Other');
    });

    it('should handle empty input', () => {
      const lookup = Time2LonPlots.buildTopCountries_({});

      expect(lookup.size).toBe(0);
    });
  });

  describe('buildAllowedTypes_', () => {
    it('should include PAYLOAD when active payloads enabled', () => {
      const types = Time2LonPlots.buildAllowedTypes_({
        activePayloads: true,
        inactivePayloads: false,
        rocketBodies: false,
        debris: false,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 10,
        samplePoints: 24,
        maxTimeMin: 1440,
      });

      expect(types.has(SpaceObjectType.PAYLOAD)).toBe(true);
      expect(types.has(SpaceObjectType.ROCKET_BODY)).toBe(false);
      expect(types.has(SpaceObjectType.DEBRIS)).toBe(false);
    });

    it('should include PAYLOAD when inactive payloads enabled', () => {
      const types = Time2LonPlots.buildAllowedTypes_({
        activePayloads: false,
        inactivePayloads: true,
        rocketBodies: false,
        debris: false,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 10,
        samplePoints: 24,
        maxTimeMin: 1440,
      });

      expect(types.has(SpaceObjectType.PAYLOAD)).toBe(true);
    });

    it('should include ROCKET_BODY when rocket bodies enabled', () => {
      const types = Time2LonPlots.buildAllowedTypes_({
        activePayloads: false,
        inactivePayloads: false,
        rocketBodies: true,
        debris: false,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 10,
        samplePoints: 24,
        maxTimeMin: 1440,
      });

      expect(types.has(SpaceObjectType.ROCKET_BODY)).toBe(true);
      expect(types.has(SpaceObjectType.PAYLOAD)).toBe(false);
    });

    it('should include DEBRIS when debris enabled', () => {
      const types = Time2LonPlots.buildAllowedTypes_({
        activePayloads: false,
        inactivePayloads: false,
        rocketBodies: false,
        debris: true,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 10,
        samplePoints: 24,
        maxTimeMin: 1440,
      });

      expect(types.has(SpaceObjectType.DEBRIS)).toBe(true);
    });

    it('should include all types when all enabled', () => {
      const types = Time2LonPlots.buildAllowedTypes_({
        activePayloads: true,
        inactivePayloads: true,
        rocketBodies: true,
        debris: true,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 10,
        samplePoints: 24,
        maxTimeMin: 1440,
      });

      expect(types.has(SpaceObjectType.PAYLOAD)).toBe(true);
      expect(types.has(SpaceObjectType.ROCKET_BODY)).toBe(true);
      expect(types.has(SpaceObjectType.DEBRIS)).toBe(true);
    });

    it('should return empty set when nothing enabled', () => {
      const types = Time2LonPlots.buildAllowedTypes_({
        activePayloads: false,
        inactivePayloads: false,
        rocketBodies: false,
        debris: false,
        celestrak: true,
        vimpel: false,
        minInclination: 0,
        maxInclination: 10,
        samplePoints: 24,
        maxTimeMin: 1440,
      });

      expect(types.size).toBe(0);
    });
  });

});
