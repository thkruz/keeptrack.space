import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import * as colorbox from '@app/engine/utils/colorbox';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { SatellitePhotos } from '@app/plugins/satellite-photos/satellite-photos';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
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
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
    });

    it('should return correct drag options', () => {
      const plugin = new SatellitePhotos();
      const dragOptions = (plugin as any).getDragOptions_();

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

    it('should build a v13 side menu with action rows for each fixed source', () => {
      const plugin = new SatellitePhotos();
      const menuHtml = (plugin as any).buildSideMenuHtml_();

      expect(menuHtml).toContain('kt-ui-v13');
      expect(menuHtml).toContain('sat-photo-menu-content');
      expect(menuHtml).toContain('meteosat9-link');
      expect(menuHtml).toContain('goes19-link');
      expect(menuHtml).toContain('goes18-link');
      expect(menuHtml).toContain('elektro3-link');
      expect(menuHtml).toContain('sat-photo-dscovr-list');
      expect(menuHtml).toContain('sat-photo-refresh');
    });
  });

  describe('Lifecycle', () => {
    it('should register uiManagerFinal handler on addJs', () => {
      const plugin = new SatellitePhotos();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(plugin as any, 'uiManagerFinal_').mockImplementation(() => {
        /* Intentional no-op */
      });
      const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

      plugin.addJs();

      expect(onSpy).toHaveBeenCalledWith(EventBusEvent.uiManagerFinal, expect.any(Function));
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
  const links = Array.from(getEl('sat-photo-menu-content')!.querySelectorAll('.sat-photo-link')).map((el) => el.id);

  let satellitePhotosPlugin: SatellitePhotos;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    satellitePhotosPlugin = new SatellitePhotos();
    websiteInit(satellitePhotosPlugin);
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="colorbox-div"></div>';
  });

  it('renders one action row per fixed imagery source', () => {
    expect(links.length).toBeGreaterThan(0);
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

  it('clicking each fixed imagery link loads an image', () => {
    ['meteosat9-link', 'meteosat11-link', 'himawari8-link', 'goes19-link', 'goes18-link', 'elektro3-link'].forEach((id) => {
      getEl(id)!.click();
    });

    expect(colorbox.openColorbox).toHaveBeenCalled();
    // Runs the openImage_ setTimeout that re-enables colorbox close.
    vi.advanceTimersByTime(2500);
  });

  it('clicking the Elektro link is safe across future, distant-past and present sim times', () => {
    const tm = ServiceLocator.getTimeManager();

    tm.simulationTimeObj = new Date(Date.now() + 1000 * 60 * 60 * 48) as never;
    expect(() => getEl('elektro3-link')!.click()).not.toThrow();

    tm.simulationTimeObj = new Date(Date.now() - 1000 * 60 * 60 * 48) as never;
    expect(() => getEl('elektro3-link')!.click()).not.toThrow();

    tm.simulationTimeObj = new Date(Date.now() - 1000 * 60 * 60) as never;
    expect(() => getEl('elektro3-link')!.click()).not.toThrow();
    vi.advanceTimersByTime(2500);
  });

  it('Himawari warns for future sim times', () => {
    const tm = ServiceLocator.getTimeManager();
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    tm.simulationTimeObj = new Date(Date.now() + 1000 * 60 * 60 * 48) as never;
    getEl('himawari8-link')!.click();

    expect(toast).toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
  });

  it('refresh reloads the last opened source with a cache-busted URL', () => {
    getEl('goes19-link')!.click();
    const openCalls = (colorbox.openColorbox as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(getEl('sat-photo-refresh')!.style.display).toBe('flex');
    getEl('sat-photo-refresh')!.click();

    expect((colorbox.openColorbox as ReturnType<typeof vi.fn>).mock.calls.length).toBe(openCalls + 1);
    const lastUrl = (colorbox.openColorbox as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];

    expect(lastUrl).toContain('_=');
    vi.advanceTimersByTime(2500);
  });

  it('refresh is a no-op before any source has been opened', () => {
    expect(() => getEl('sat-photo-refresh')!.click()).not.toThrow();
    expect(colorbox.openColorbox).not.toHaveBeenCalled();
  });

  it('opening the side menu fetches DSCOVR and adds image links that snap the camera', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        // eslint-disable-next-line camelcase
        json: () => Promise.resolve([{ image: 'img', identifier: '20220101', centroid_coordinates: { lat: 0, lon: 0 } }]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })
    ) as any;

    plugin.onSideMenuOpen();
    await flushAsync();

    expect(getEl('dscovr1-link', true)).not.toBeNull();
    getEl('dscovr1-link', true)!.click();
    expect(ServiceLocator.getMainCamera().camSnap).toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
  });

  it('only fetches DSCOVR once even if the menu is opened repeatedly', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })) as never;

    plugin.onSideMenuOpen();
    plugin.onSideMenuOpen();

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('shows an unavailable note on a non-ok HTTP response', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 503 })) as never;

    plugin.onSideMenuOpen();
    await flushAsync();

    expect(getEl('sat-photo-dscovr-list')!.innerHTML).toContain('Temporarily Unavailable');
  });

  it('shows an unavailable note when the API fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network'))) as never;

    plugin.onSideMenuOpen();
    await flushAsync();

    expect(getEl('sat-photo-dscovr-list')!.innerHTML).toContain('Temporarily Unavailable');
  });

  it('renderDscovrRows_ returns early when the list element is absent', () => {
    getEl('sat-photo-dscovr-list', true)?.remove();
    p().discvrSources_ = [{ id: 'dscovr1', label: 'x', sccNum: 40390, buildImage: () => ({ url: 'u' }) }];

    expect(() => p().renderDscovrRows_()).not.toThrow();
  });
});
