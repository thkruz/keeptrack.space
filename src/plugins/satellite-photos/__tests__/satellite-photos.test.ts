import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import * as colorbox from '@app/engine/utils/colorbox';
import { SatellitePhotos } from '@app/plugins/satellite-photos/satellite-photos';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const flushAsync = async () => {
  for (let i = 0; i < 6; i++) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

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

describe('SatellitePhotos behavior', () => {
  let plugin: SatellitePhotos;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statics = SatellitePhotos as any;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new SatellitePhotos();
    websiteInit(plugin);
    vi.spyOn(colorbox, 'openColorbox').mockImplementation(() => undefined);
    ServiceLocator.getUiManager().searchManager.hideResults = vi.fn();
    ServiceLocator.getCatalogManager().sccNum2Id = vi.fn(() => 1);
    ServiceLocator.getMainCamera().changeZoom = vi.fn();
    ServiceLocator.getMainCamera().camSnap = vi.fn();
    PluginRegistry.getPlugin(SelectSatManager)!.selectSat = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('H shortcut opens the menu', () => {
    const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

    plugin.getKeyboardShortcuts()[0].callback();

    expect(spy).toHaveBeenCalled();
  });

  it('clicking each weather-sat link loads an image', () => {
    ['meteosat9-link', 'meteosat11-link', 'himawari8-link', 'goes16-link', 'goes18-link', 'elektro3-link'].forEach((id) => {
      getEl(id)!.click();
    });

    expect(colorbox.openColorbox).toHaveBeenCalled();
    // Runs the colorbox_ setTimeout that re-enables colorbox close.
    vi.advanceTimersByTime(2500);
  });

  it('loadElektro_ handles future, distant-past and present sim times', () => {
    const tm = ServiceLocator.getTimeManager();

    tm.simulationTimeObj = new Date(Date.now() + 1000 * 60 * 60 * 48) as never;
    expect(() => p().loadElektro_()).not.toThrow();

    tm.simulationTimeObj = new Date(Date.now() - 1000 * 60 * 60 * 48) as never;
    expect(() => p().loadElektro_()).not.toThrow();

    tm.simulationTimeObj = new Date(Date.now() - 1000 * 60 * 60) as never;
    expect(() => p().loadElektro_()).not.toThrow();
  });

  it('loadElektroPastOrPresent_ adjusts a sim time near the 24h boundary', () => {
    // Frozen test time is midnight, which makes the >24h adjustment unreachable; use a non-midnight clock.
    vi.setSystemTime(new Date('2022-06-15T14:23:00Z'));
    const tm = ServiceLocator.getTimeManager();

    // Gap just under 24h so flooring the minutes pushes closestTime past the 24h mark.
    tm.simulationTimeObj = new Date(Date.now() - (24 * 60 - 1) * 60 * 1000) as never;
    expect(() => p().loadElektro_()).not.toThrow();

    vi.setSystemTime(new Date('2022-01-01T00:00:00Z'));
  });

  it('himawari8_ loads a past image and warns for future sim times', () => {
    const tm = ServiceLocator.getTimeManager();

    tm.simulationTimeObj = new Date(Date.now() - 1000 * 60 * 60) as never;
    expect(() => statics.himawari8_()).not.toThrow();
    vi.advanceTimersByTime(2500);

    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    tm.simulationTimeObj = new Date(Date.now() + 1000 * 60 * 60 * 48) as never;
    statics.himawari8_();
    expect(toast).toHaveBeenCalled();
  });

  it('initDISCOVR_ runs on keepTrackReady and adds image links when the API responds', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      // eslint-disable-next-line camelcase
      json: () => Promise.resolve([{ image: 'img', identifier: '20220101', centroid_coordinates: { lat: 0, lon: 0 } }]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

    // The onKeepTrackReady handler (wired in addJs) is what kicks off initDISCOVR_.
    EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);
    await flushAsync();

    expect(getEl('discovr-link1', true)).not.toBeNull();
    // The added link snaps the camera to the photo coordinates.
    getEl('discovr-link1', true)!.click();
    expect(ServiceLocator.getMainCamera().camSnap).toHaveBeenCalled();
  });

  it('initDISCOVR_ falls into the catch on a non-ok HTTP response', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 503 })) as never;

    p().initDISCOVR_();
    await flushAsync();

    expect(getEl('sat-photo-menu-list')!.innerHTML).toContain('Temporarily Unavailable');
  });

  it('initDISCOVR_ shows an unavailable entry when the API fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network'))) as never;

    p().initDISCOVR_();
    await flushAsync();

    expect(getEl('sat-photo-menu-list')!.innerHTML).toContain('Temporarily Unavailable');
  });

  it('addDiscvrLinks_ returns early when the list element is absent', () => {
    getEl('sat-photo-menu-list', true)?.remove();
    p().discvrPhotos_ = [{ imageUrl: 'u', lat: 0, lon: 0 }];

    expect(() => p().addDiscvrLinks_()).not.toThrow();
  });
});
