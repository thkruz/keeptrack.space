import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { getEl } from '@app/engine/utils/get-el';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrack } from '@app/keeptrack';

describe('SettingsMenuPlugin_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
  });

  standardPluginSuite(SettingsMenuPlugin);
  standardPluginMenuButtonTests(SettingsMenuPlugin);

  // Test changing the form settings
  it('should change the form settings', () => {
    const settingsMenuPlugin = new SettingsMenuPlugin();

    websiteInit(settingsMenuPlugin);
    expect(() => getEl('settings-drawOrbits')?.click()).not.toThrow();
    expect(() => getEl('settings-drawTrailingOrbits')?.click()).not.toThrow();
    expect(() => getEl('settings-drawEcf')?.click()).not.toThrow();
    expect(() => getEl('settings-isDrawInCoverageLines')?.click()).not.toThrow();
    expect(() => getEl('settings-eciOnHover')?.click()).not.toThrow();
    expect(() => getEl('settings-hos')?.click()).not.toThrow();
    expect(() => getEl('settings-demo-mode')?.click()).not.toThrow();
    expect(() => getEl('settings-sat-label-mode')?.click()).not.toThrow();
    expect(() => getEl('settings-freeze-drag')?.click()).not.toThrow();
    expect(() => getEl('settings-time-machine-toasts')?.click()).not.toThrow();
    expect(() => getEl('settings-snp')?.click()).not.toThrow();
  });
  // Test submitting changes
  it('should submit changes', () => {
    const settingsMenuPlugin = new SettingsMenuPlugin();

    websiteInit(settingsMenuPlugin);
    ServiceLocator.getGroupsManager().clearSelect = jest.fn();
    const colorSchemeManagerInstance = new ColorSchemeManager();

    colorSchemeManagerInstance.setColorScheme = jest.fn();
    colorSchemeManagerInstance.reloadColors = jest.fn();
    Container.getInstance().registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
    expect(() => getEl('settings-submit')?.click()).not.toThrow();
  });
});
