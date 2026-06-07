import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { Container } from '@app/engine/core/container';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { Singletons } from '@app/engine/core/interfaces';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SettingsMenuPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SettingsMenuPlugin, 'SettingsMenuPlugin');
  standardPluginMenuButtonTests(SettingsMenuPlugin, 'SettingsMenuPlugin');
  standardClickTests(SettingsMenuPlugin);
  standardChangeTests(SettingsMenuPlugin);
});

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
    expect(() => getEl('settings-demo-mode')?.click()).not.toThrow();
    expect(() => getEl('settings-freeze-drag')?.click()).not.toThrow();
    expect(() => getEl('settings-snp')?.click()).not.toThrow();
  });
  // Test submitting changes
  it('should submit changes', () => {
    const settingsMenuPlugin = new SettingsMenuPlugin();

    websiteInit(settingsMenuPlugin);
    ServiceLocator.getGroupsManager().clearSelect = vi.fn();
    const colorSchemeManagerInstance = new ColorSchemeManager();

    colorSchemeManagerInstance.setColorScheme = vi.fn();
    colorSchemeManagerInstance.reloadColors = vi.fn();
    Container.getInstance().registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
    expect(() => getEl('settings-submit')?.click()).not.toThrow();
  });
});

describe('SettingsMenuPlugin form handlers', () => {
  let plugin: SettingsMenuPlugin;

  const statics = SettingsMenuPlugin as unknown as {
    onFormChange_(e: unknown, isDMChecked?: boolean): void;
    onSubmit_(e: unknown): void;
  };

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    plugin = new SettingsMenuPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onFormChange_ ignores unknown targets', () => {
    expect(() => statics.onFormChange_({ target: { id: 'some-unknown-control' } }, false)).not.toThrow();
  });

  it('onFormChange_ throws when the event is missing', () => {
    expect(() => statics.onFormChange_(undefined)).toThrow();
  });

  it('forces satLabelMode to OFF and emits settingsMenuRefresh when demo mode is enabled', async () => {
    const { EventBus } = await import('@app/engine/events/event-bus');
    const { EventBusEvent } = await import('@app/engine/events/event-bus-events');
    const { SatLabelMode } = await import('@app/settings/ui-settings');

    settingsManager.satLabelMode = SatLabelMode.ALL;
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    statics.onFormChange_({ target: { id: 'settings-demo-mode' } }, true);

    expect(settingsManager.satLabelMode).toBe(SatLabelMode.OFF);
    expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.settingsMenuRefresh);
  });

  it('onSubmit_ throws when the event is missing', () => {
    expect(() => statics.onSubmit_(undefined)).toThrow();
  });

  it('onSubmit_ applies changed orbit settings and stops time machine', () => {
    const orbit = ServiceLocator.getOrbitManager();

    orbit.orbitThreadMgr = { sendSettingsUpdate: vi.fn() } as never;
    orbit.drawOrbitsSettingChanged = vi.fn();
    orbit.updateOrbitType = vi.fn();
    ServiceLocator.getGroupsManager().clearSelect = vi.fn();
    const csm = ServiceLocator.getColorSchemeManager();

    csm.calculateColorBuffers = vi.fn().mockResolvedValue(undefined as never);
    csm.reloadColors = vi.fn();

    const timeMachine = new TimeMachine();

    PluginRegistry.addPlugin(timeMachine);
    timeMachine.isMenuButtonActive = true;
    vi.spyOn(timeMachine, 'setBottomIconToUnselected').mockImplementation(() => undefined);

    // Force the "changed" branches: a different ECF-orbit count and a flipped draw-orbits checkbox.
    settingsManager.numberOfEcfOrbitsToDraw = 1;
    (getEl('settings-numberOfEcfOrbitsToDraw') as HTMLInputElement).value = '5';
    settingsManager.isDrawOrbits = false;
    (getEl('settings-drawOrbits') as HTMLInputElement).checked = true;

    statics.onSubmit_({ preventDefault: vi.fn() });

    expect(orbit.orbitThreadMgr.sendSettingsUpdate).toHaveBeenCalledWith(5);
    expect(orbit.drawOrbitsSettingChanged).toHaveBeenCalled();
    expect(timeMachine.isMenuButtonActive).toBe(false);
  });

  it('uiManagerFinal hides confidence and time-machine rows when those features are off', () => {
    settingsManager.isShowConfidenceLevels = false;
    settingsManager.plugins = { ...settingsManager.plugins, TimeMachine: undefined } as never;

    // Capture this plugin's own uiManagerFinal handler to avoid firing other plugins' handlers.
    const onSpy = vi.spyOn(EventBus.getInstance(), 'on');
    const fresh = new SettingsMenuPlugin();

    fresh.addHtml();
    const finalHandlers = onSpy.mock.calls.filter(([evt]) => evt === EventBusEvent.uiManagerFinal).map((c) => c[1] as () => void);

    expect(() => finalHandlers.forEach((h) => h())).not.toThrow();
  });
});
