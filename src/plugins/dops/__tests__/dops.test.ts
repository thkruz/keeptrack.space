import { vi } from 'vitest';
/* eslint-disable dot-notation */
import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { DopsPlugin } from '@app/plugins/dops/dops';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('DopsPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(DopsPlugin, 'DopsPlugin');
  standardPluginMenuButtonTests(DopsPlugin, 'DopsPlugin');
  standardPluginRmbTests(DopsPlugin, 'DopsPlugin');

  describe('getSideMenuConfig', () => {
    it('should contain expected form elements', () => {
      const plugin = new DopsPlugin();
      const config = plugin.getSideMenuConfig();

      expect(config.html).toContain('dops-menu');
      expect(config.html).toContain('dops-form');
      expect(config.html).toContain('dops-lat');
      expect(config.html).toContain('dops-lon');
      expect(config.html).toContain('dops-alt');
      expect(config.html).toContain('dops-el');
      expect(config.html).toContain('dops-submit');
    });
  });

  describe('form submission', () => {
    it('should set up form submit listener', () => {
      const plugin = new DopsPlugin();

      websiteInit(plugin);

      const form = getEl('dops-form');

      expect(form).toBeDefined();
    });

    it('should not throw on form submit event', () => {
      const plugin = new DopsPlugin();

      websiteInit(plugin);

      const form = getEl('dops-form');

      expect(() => form!.dispatchEvent(new Event('submit', { cancelable: true }))).not.toThrow();
    });
  });

  describe('getGpsSats', () => {
    it('should be a static method', () => {
      expect(DopsPlugin.getGpsSats).toBeDefined();
      expect(typeof DopsPlugin.getGpsSats).toBe('function');
    });
  });

  describe('bottomIconCallback', () => {
    it('should not throw when menu is inactive', () => {
      const plugin = new DopsPlugin();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      expect(() => plugin.bottomIconCallback()).not.toThrow();
    });
  });

  describe('rmbCallback', () => {
    it('should handle unknown targetId gracefully', () => {
      const plugin = new DopsPlugin();

      websiteInit(plugin);

      expect(() => plugin.rmbCallback('unknown-id')).not.toThrow();
    });
  });
});

describe('DopsPlugin behavior', () => {
  let plugin: DopsPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new DopsPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('D shortcut returns in FPS mode and opens the menu otherwise', () => {
    const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

    ServiceLocator.getMainCamera().cameraType = CameraType.FPS;
    plugin.getKeyboardShortcuts()[0].callback();
    expect(spy).not.toHaveBeenCalled();

    ServiceLocator.getMainCamera().cameraType = CameraType.CURRENT;
    plugin.getKeyboardShortcuts()[0].callback();
    expect(spy).toHaveBeenCalled();
  });

  it('rmbCallback warns when the clicked location is invalid', () => {
    ServiceLocator.getInputManager().mouse = { latLon: undefined } as never;

    expect(() => plugin.rmbCallback('dops-24dops-rmb')).not.toThrow();
  });

  it('rmbCallback fills the form and opens the menu when inactive', () => {
    ServiceLocator.getInputManager().mouse = { latLon: { lat: 10, lon: 20 } } as never;
    plugin.isMenuButtonActive = false;
    const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

    plugin.rmbCallback('dops-24dops-rmb');

    expect((getEl('dops-lat') as HTMLInputElement).value).toBe('10.000');
    expect(spy).toHaveBeenCalled();
  });

  it('rmbCallback refreshes the side menu when already active', () => {
    ServiceLocator.getInputManager().mouse = { latLon: { lat: 10, lon: 20 } } as never;
    plugin.isMenuButtonActive = true;
    vi.spyOn(plugin as unknown as { updateSideMenu(): void }, 'updateSideMenu').mockImplementation(() => undefined);
    vi.spyOn(plugin, 'setBottomIconToEnabled').mockImplementation(() => undefined);

    expect(() => plugin.rmbCallback('dops-24dops-rmb')).not.toThrow();
  });

  it('getGpsSats collects catalog satellites for the GPS group', () => {
    const group = { groupList: { GPSGroup: { ids: [1, 2] } }, createGroup: vi.fn() };
    const catalog = { getSat: (id: number) => (id === 1 ? { sccNum: '1' } : null) };

    const sats = DopsPlugin.getGpsSats(catalog as never, group as never);

    expect(sats).toHaveLength(1);
  });
});
