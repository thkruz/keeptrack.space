import { keepTrackContainer } from '@app/container';
import { Singletons } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { StandardColorSchemeManager } from '@app/singletons/color-scheme-manager';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('SettingsMenuPlugin_class', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setupStandardEnvironment();
  });

  standardPluginSuite(SettingsMenuPlugin);
  standardPluginMenuButtonTests(SettingsMenuPlugin);

  // Test changing the form settings
  it('should change the form settings', () => {
    const settingsMenuPlugin = new SettingsMenuPlugin();
    websiteInit(settingsMenuPlugin);
    expect(() => document.getElementById('settings-leoSats').click()).not.toThrow();
    expect(() => document.getElementById('settings-heoSats').click()).not.toThrow();
    expect(() => document.getElementById('settings-meoSats').click()).not.toThrow();
    expect(() => document.getElementById('settings-geoSats').click()).not.toThrow();
    expect(() => document.getElementById('settings-showAgencies').click()).not.toThrow();
    expect(() => document.getElementById('settings-drawOrbits').click()).not.toThrow();
    expect(() => document.getElementById('settings-drawTrailingOrbits').click()).not.toThrow();
    expect(() => document.getElementById('settings-drawEcf').click()).not.toThrow();
    expect(() => document.getElementById('settings-isDrawInCoverageLines').click()).not.toThrow();
    expect(() => document.getElementById('settings-drawSun').click()).not.toThrow();
    expect(() => document.getElementById('settings-drawBlackEarth').click()).not.toThrow();
    expect(() => document.getElementById('settings-drawMilkyWay').click()).not.toThrow();
    expect(() => document.getElementById('settings-eciOnHover').click()).not.toThrow();
    expect(() => document.getElementById('settings-hos').click()).not.toThrow();
    expect(() => document.getElementById('settings-demo-mode').click()).not.toThrow();
    expect(() => document.getElementById('settings-sat-label-mode').click()).not.toThrow();
    expect(() => document.getElementById('settings-freeze-drag').click()).not.toThrow();
    expect(() => document.getElementById('settings-time-machine-toasts').click()).not.toThrow();
    expect(() => document.getElementById('settings-snp').click()).not.toThrow();
  });
  // Test submitting changes
  it('should submit changes', () => {
    const settingsMenuPlugin = new SettingsMenuPlugin();
    websiteInit(settingsMenuPlugin);
    keepTrackApi.getGroupsManager().clearSelect = jest.fn();
    const colorSchemeManagerInstance = new StandardColorSchemeManager();
    colorSchemeManagerInstance.setColorScheme = jest.fn();
    colorSchemeManagerInstance.reloadColors = jest.fn();
    keepTrackContainer.registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
    expect(() => document.getElementById('settings-submit').click()).not.toThrow();
  });
});
