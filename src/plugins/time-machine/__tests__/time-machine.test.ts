import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { hasSettingsContribution, ISettingToggleControl } from '@app/engine/plugins/core/plugin-capabilities';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { KeepTrack } from '@app/keeptrack';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { Milliseconds } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('TimeMachine', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TimeMachine, 'TimeMachine');
});

describe('TimeMachine_class', () => {
  let timeMachinePlugin: TimeMachine;

  beforeEach(() => {
    setupDefaultHtml();
    timeMachinePlugin = new TimeMachine();
  });

  standardPluginSuite(TimeMachine, 'TimeMachine');
  standardPluginMenuButtonTests(TimeMachine, 'TimeMachine');

  // test the full animation
  it('should animate the time machine', () => {
    vi.useFakeTimers();
    websiteInit(timeMachinePlugin);
    ServiceLocator.getCatalogManager().getObject = vi.fn().mockReturnValue(defaultSat);
    ServiceLocator.getCatalogManager().objectCache = Array(50).fill(defaultSat);
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="search-results"></div>';

    settingsManager.timeMachineDelay = <Milliseconds>0;
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, timeMachinePlugin.bottomIconElementName);
    vi.advanceTimersByTime(1000);
    expect(timeMachinePlugin.isMenuButtonActive).toBe(true);
    vi.advanceTimersByTime(10000);
    // Restore fake timers to avoid leaking real timers to other test files
    vi.useFakeTimers();
  }, 15000);
});

describe('TimeMachine branches', () => {
  let plugin: TimeMachine;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new TimeMachine();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('command palette toggle invokes bottomMenuClicked', () => {
    const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);
    const commands = plugin.getCommandPaletteCommands();

    expect(commands[0].id).toBe('TimeMachine.toggle');
    commands[0].callback();
    expect(spy).toHaveBeenCalled();
  });

  it('playNextSatellite unselects the icon and returns when not running', () => {
    const spy = vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);

    plugin.isTimeMachineRunning = false;
    plugin.isMenuButtonActive = true;
    plugin.playNextSatellite(0, 99);

    expect(spy).toHaveBeenCalled();
  });

  it('playNextSatellite returns when the run count is stale', () => {
    plugin.isTimeMachineRunning = true;
    plugin.historyOfSatellitesRunCount = 1;
    const createSpy = vi.spyOn(ServiceLocator.getGroupsManager(), 'createGroup');

    plugin.playNextSatellite(999, 99);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('playNextSatellite loops at present day when loopTimeMachine is set', () => {
    const groups = ServiceLocator.getGroupsManager();

    vi.spyOn(groups, 'createGroup').mockReturnValue({ updateOrbits: vi.fn() } as never);
    vi.spyOn(groups, 'selectGroup').mockImplementation(() => undefined);
    // Stub the replay so the scheduled timeout doesn't recurse into a full animation run.
    const playSpy = vi.spyOn(plugin, 'historyOfSatellitesPlay').mockImplementation(() => undefined);

    plugin.isTimeMachineRunning = true;
    plugin.historyOfSatellitesRunCount = 0;
    settingsManager.isDisableTimeMachineToasts = true;
    settingsManager.loopTimeMachine = true;
    settingsManager.timeMachineDelayAtPresentDay = 10;

    // The frozen system time is 2022, so year 22 is "present day" and triggers the loop branch.
    plugin.playNextSatellite(0, 22);
    vi.advanceTimersByTime(20);

    expect(playSpy).toHaveBeenCalled();
  });

  it('removeSatellite returns when the run count is stale', () => {
    plugin.historyOfSatellitesRunCount = 1;
    const clearSpy = vi.spyOn(ServiceLocator.getGroupsManager(), 'clearSelect');

    plugin.removeSatellite(999);

    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('removeSatellite returns when the menu button is inactive', () => {
    plugin.historyOfSatellitesRunCount = 0;
    plugin.isMenuButtonActive = false;
    const clearSpy = vi.spyOn(ServiceLocator.getGroupsManager(), 'clearSelect');

    plugin.removeSatellite(0);

    expect(clearSpy).not.toHaveBeenCalled();
  });
});

describe('TimeMachine settings contribution', () => {
  let plugin: TimeMachine;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new TimeMachine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('advertises a settings contribution to the settings-menu collector', () => {
    expect(hasSettingsContribution(plugin)).toBe(true);
  });

  it('contributes a single toggle bound to settingsManager.isDisableTimeMachineToasts', () => {
    const contribution = plugin.getSettingsContribution();

    expect(contribution.sectionId).toBe('TimeMachine');
    expect(contribution.controls).toHaveLength(1);
    expect(contribution.controls[0].type).toBe('toggle');
    expect(contribution.controls[0].id).toBe('disableToasts');

    settingsManager.isDisableTimeMachineToasts = false;
    expect((contribution.controls[0] as ISettingToggleControl).get()).toBe(false);

    settingsManager.isDisableTimeMachineToasts = true;
    expect((contribution.controls[0] as ISettingToggleControl).get()).toBe(true);
  });

  it('writes the new value to settingsManager and persists to localStorage when set() is called', () => {
    const contribution = plugin.getSettingsContribution();
    const toggle = contribution.controls[0] as ISettingToggleControl;
    const saveSpy = vi.spyOn(PersistenceManager.getInstance(), 'saveItem').mockImplementation(() => undefined);

    toggle.set(true);

    expect(settingsManager.isDisableTimeMachineToasts).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS, 'true');

    toggle.set(false);

    expect(settingsManager.isDisableTimeMachineToasts).toBe(false);
    expect(saveSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS, 'false');
  });
});
