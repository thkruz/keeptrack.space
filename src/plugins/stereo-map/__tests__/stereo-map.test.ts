import { vi } from 'vitest';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { MenuMode } from '@app/engine/core/interfaces';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { StereoMap } from '@app/plugins/stereo-map/stereo-map';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrack } from '@app/keeptrack';

// Mock canvas getContext for jsdom (not implemented in jsdom)
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  canvas: { width: 1920, height: 1080 },
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  textAlign: '',
  textBaseline: '',
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe('StereoMapPlugin_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    ServiceLocator.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
    ServiceLocator.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    ServiceLocator.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    ServiceLocator.getCatalogManager().objectCache = [defaultSat];
    PluginRegistry.getPlugin(SelectSatManager)!.selectSat(0);
  });

  standardPluginSuite(StereoMap);
  standardPluginMenuButtonTests(StereoMap);

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new StereoMap();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('stereo-map-bottom-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.DISPLAY);
      expect(config.menuMode).toContain(MenuMode.ALL);
      expect(config.isDisabledOnLoad).toBe(true);
    });

    it('should return correct side menu config', () => {
      const plugin = new StereoMap();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('map-menu');
      expect(config.title).toBeDefined();
      expect(config.html).toContain('map-2d');
      expect(config.html).toContain('map-sat');
    });

    it('should return correct help config', () => {
      const plugin = new StereoMap();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThanOrEqual(3);
      expect(helpConfig.sections![0].image?.src).toContain('img/help/stereo-map/');
      expect(helpConfig.tips!.length).toBeGreaterThan(0);
      expect(helpConfig.shortcuts).toEqual([expect.objectContaining({ keys: ['M'] })]);
    });

    it('should return correct keyboard shortcuts', () => {
      const plugin = new StereoMap();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('m');
      expect(shortcuts[0].callback).toBeDefined();
    });

    it('should not have secondary menu config (pro only)', () => {
      const plugin = new StereoMap();

      expect((plugin as unknown as Record<string, unknown>).getSecondaryMenuConfig).toBeUndefined();
    });
  });

  describe('Command palette integration', () => {
    it('should return command palette commands', () => {
      const plugin = new StereoMap();
      const commands = plugin.getCommandPaletteCommands();

      expect(commands).toBeDefined();
      expect(commands.length).toBe(2);
    });

    it('should have unique command IDs', () => {
      const plugin = new StereoMap();
      const commands = plugin.getCommandPaletteCommands();
      const ids = commands.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should contain toggle and export commands', () => {
      const plugin = new StereoMap();
      const ids = plugin.getCommandPaletteCommands().map((c) => c.id);

      expect(ids).toContain('StereoMap.toggle');
      expect(ids).toContain('StereoMap.export');
    });

    it('should have callbacks for all commands', () => {
      const plugin = new StereoMap();
      const commands = plugin.getCommandPaletteCommands();

      commands.forEach((cmd) => {
        expect(typeof cmd.callback).toBe('function');
      });
    });
  });

  describe('onBottomIconClick', () => {
    it('should call bottomIconCallback bridge', () => {
      const plugin = new StereoMap();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onDownload', () => {
    it('should not throw when canvas is not initialized', () => {
      const plugin = new StereoMap();

      expect(() => plugin.onDownload()).not.toThrow();
    });
  });
});
