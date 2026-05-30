import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { SatellitePhotos } from '@app/plugins/satellite-photos/satellite-photos';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatellitePhotos', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatellitePhotos, 'SatellitePhotos');
  standardPluginMenuButtonTests(SatellitePhotos, 'SatellitePhotos');

  describe('Plugin identity', () => {
    it('should have correct plugin name', () => {
      const plugin = new SatellitePhotos();

      expect(plugin.id).toBe('SatellitePhotos');
    });

    it('should have SelectSatManager as dependency', () => {
      const plugin = new SatellitePhotos();

      expect((plugin as any).dependencies_).toContain('SelectSatManager');
    });
  });

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new SatellitePhotos();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('menu-sat-photo');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.DISPLAY);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });

    it('should return correct side menu config', () => {
      const plugin = new SatellitePhotos();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('sat-photo-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
    });

    it('should return correct help config', () => {
      const plugin = new SatellitePhotos();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return correct drag options', () => {
      const plugin = new SatellitePhotos();
      const dragOptions = plugin.getDragOptions_();

      expect(dragOptions.isDraggable).toBe(true);
      expect(dragOptions.minWidth).toBe(200);
      expect(dragOptions.maxWidth).toBe(400);
    });

    it('should return keyboard shortcut with key H', () => {
      const plugin = new SatellitePhotos();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('H');
      expect(shortcuts[0].callback).toBeInstanceOf(Function);
    });

    it('should build side menu HTML with satellite list', () => {
      const plugin = new SatellitePhotos();
      const menuHtml = plugin.buildSideMenuHtml_();

      expect(menuHtml).toContain('sat-photo-menu');
      expect(menuHtml).toContain('sat-photo-menu-list');
      expect(menuHtml).toContain('meteosat9-link');
      expect(menuHtml).toContain('goes16-link');
      expect(menuHtml).toContain('elektro3-link');
    });
  });

  describe('Lifecycle', () => {
    it('should register uiManagerFinal handler on addJs', () => {
      const plugin = new SatellitePhotos();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(plugin as any, 'uiManagerFinal_').mockImplementation(() => { /* Intentional no-op */ });
      const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

      plugin.addJs();

      expect(onSpy).toHaveBeenCalledWith(EventBusEvent.uiManagerFinal, expect.any(Function));
    });

    it('should register onKeepTrackReady handler on addJs', () => {
      const plugin = new SatellitePhotos();
      const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

      plugin.addJs();

      expect(onSpy).toHaveBeenCalledWith(EventBusEvent.onKeepTrackReady, expect.any(Function));
    });
  });
});

describe('SatellitePhotos_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(SatellitePhotos, 'SatellitePhotos');
  standardPluginMenuButtonTests(SatellitePhotos, 'SatellitePhotos');
});

describe('SatellitePhotos_test_links', () => {
  setupStandardEnvironment([SelectSatManager]);
  const tempSatellitePhotosPlugin = new SatellitePhotos();

  websiteInit(tempSatellitePhotosPlugin);
  const links = Array.from(getEl('sat-photo-menu-content')!.getElementsByTagName('li')).map((li) => li.id);

  let satellitePhotosPlugin: SatellitePhotos;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    satellitePhotosPlugin = new SatellitePhotos();
    websiteInit(satellitePhotosPlugin);
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="colorbox-div"></div>';
  });

  links.forEach((link) => {
    it(`should have a working link to ${link}`, () => {
      expect(getEl(link)).toBeTruthy();
      expect(() => getEl(link)!.click()).not.toThrow();
    });
  });
});
