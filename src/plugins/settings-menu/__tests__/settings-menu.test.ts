import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { SatLabelMode } from '@app/settings/ui-settings';
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

  it('renders the own General and Fast-CPU sections as v13 cards', () => {
    const plugin = new SettingsMenuPlugin();

    websiteInit(plugin);

    expect(getEl('settings-own-sections')?.querySelectorAll('section.kt-section').length).toBeGreaterThanOrEqual(2);
    expect(getEl('setting-general-drawOrbits')).not.toBeNull();
    expect(getEl('setting-fastCpu-showNextPassOnHover')).not.toBeNull();
    // No legacy submit button - settings apply immediately.
    expect(getEl('settings-submit', true)).toBeNull();
    expect(getEl('settings-reset')).not.toBeNull();
  });
});

describe('SettingsMenuPlugin immediate-apply', () => {
  let plugin: SettingsMenuPlugin;

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    plugin = new SettingsMenuPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies a no-side-effect toggle to settingsManager immediately on change', () => {
    settingsManager.isEciOnHover = false;
    const toggle = getEl('setting-general-displayEciOnHover') as HTMLInputElement;

    expect(toggle).not.toBeNull();
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));

    expect(settingsManager.isEciOnHover).toBe(true);
  });

  it('forces satLabelMode to OFF and refreshes when demo mode is enabled', () => {
    settingsManager.satLabelMode = SatLabelMode.ALL;
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');
    const demo = getEl('setting-general-enableDemoMode') as HTMLInputElement;

    demo.checked = true;
    demo.dispatchEvent(new Event('change'));

    expect(settingsManager.isDemoModeOn).toBe(true);
    expect(settingsManager.satLabelMode).toBe(SatLabelMode.OFF);
    expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.settingsMenuRefresh);
  });

  it('reflects the saved isShowNextPass value when rendered (regression: load read the wrong setting)', () => {
    settingsManager.isShowNextPass = true;
    EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);

    const snp = getEl('setting-fastCpu-showNextPassOnHover') as HTMLInputElement;

    expect(snp).not.toBeNull();
    expect(snp.checked).toBe(true);
  });

  it('does not render the confidence toggle when the feature is unavailable', () => {
    settingsManager.isShowConfidenceLevels = false;
    EventBus.getInstance().emit(EventBusEvent.settingsMenuRefresh);

    expect(getEl('setting-general-showConfidenceLevels', true)).toBeNull();
  });
});

describe('SettingsMenuPlugin reset and filter', () => {
  let plugin: SettingsMenuPlugin;

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    ServiceLocator.getGroupsManager().clearSelect = vi.fn();
    plugin = new SettingsMenuPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reset restores defaults, including settings the old reset missed', () => {
    settingsManager.isDrawTrailingOrbits = true;
    settingsManager.isDemoModeOn = true;
    settingsManager.isShowNextPass = true;
    settingsManager.numberOfEcfOrbitsToDraw = 5;
    settingsManager.satLabelMode = SatLabelMode.ALL;

    SettingsMenuPlugin.resetToDefaults();

    expect(settingsManager.isDrawTrailingOrbits).toBe(false);
    expect(settingsManager.isDemoModeOn).toBe(false);
    expect(settingsManager.isShowNextPass).toBe(false);
    expect(settingsManager.numberOfEcfOrbitsToDraw).toBe(1);
    expect(settingsManager.satLabelMode).toBe(SatLabelMode.FOV_ONLY);
  });

  it('filtering hides rows whose label does not match and collapses empty sections', () => {
    const filter = getEl('settings-filter') as HTMLInputElement;

    filter.value = 'demo';
    filter.dispatchEvent(new Event('input'));

    const demoRow = getEl('setting-general-enableDemoMode')!.closest('.switch.row') as HTMLElement;
    const orbitsRow = getEl('setting-general-drawOrbits')!.closest('.switch.row') as HTMLElement;

    expect(demoRow.style.display).not.toBe('none');
    expect(orbitsRow.style.display).toBe('none');
  });
});
