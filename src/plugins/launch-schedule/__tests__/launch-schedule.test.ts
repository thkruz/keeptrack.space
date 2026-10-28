import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { createColorbox } from '@app/engine/utils/colorbox';
import { LaunchSchedulePlugin, launchScheduleUrl } from '@app/plugins/launch-schedule/launch-schedule';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('LaunchSchedulePlugin', () => {
  let plugin: LaunchSchedulePlugin;

  beforeEach(() => {
    setupDefaultHtml();
    // Disabled by default in the manifest; enable so init() runs fully under test.
    settingsManager.plugins.LaunchSchedulePlugin = { enabled: true };
    plugin = new LaunchSchedulePlugin();
  });

  standardPluginSuite(LaunchSchedulePlugin, 'LaunchSchedulePlugin');

  describe('getBottomIconConfig', () => {
    it('should return correct config', () => {
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('launch-schedule-bottom-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toBeDefined();
    });
  });

  describe('getHelpConfig', () => {
    it('should return help config', () => {
      const config = plugin.getHelpConfig();

      expect(config.title).toBeDefined();
      expect(config.sections!.length).toBeGreaterThan(0);
    });
  });

  describe('getCommandPaletteCommands', () => {
    it('should return commands', () => {
      const commands = plugin.getCommandPaletteCommands();

      expect(commands.length).toBe(1);
      expect(commands[0].id).toBe('LaunchSchedulePlugin.open');
      expect(commands[0].callback).toBeInstanceOf(Function);
    });

    it('invokes the command callback without throwing', () => {
      websiteInit(plugin);
      vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

      expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
    });
  });

  describe('onBottomIconClick', () => {
    it('should not throw when menu is not active', () => {
      websiteInit(plugin);
      plugin.isMenuButtonActive = false;

      expect(() => plugin.onBottomIconClick()).not.toThrow();
    });
  });

  describe('bottomIconCallback bridge', () => {
    it('should call onBottomIconClick', () => {
      websiteInit(plugin);
      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });
});

describe('launch_schedule_plugin', () => {
  let launchCalendarPlugin: LaunchSchedulePlugin;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    // Disabled by default in the manifest; enable so init() runs fully under test.
    settingsManager.plugins.LaunchSchedulePlugin = { enabled: true };
    createColorbox();
    launchCalendarPlugin = new LaunchSchedulePlugin();
  });

  standardPluginSuite(LaunchSchedulePlugin, 'LaunchSchedulePlugin');
  standardPluginMenuButtonTests(LaunchSchedulePlugin, 'LaunchSchedulePlugin');

  test('close_colorbox', () => {
    launchCalendarPlugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, launchCalendarPlugin.bottomIconElementName);
    vi.advanceTimersByTime(4000);
    // eslint-disable-next-line dot-notation
    expect(() => launchCalendarPlugin['closeColorbox_']()).not.toThrow();
  });

  test('opening the calendar hides open side menus and stays active', () => {
    launchCalendarPlugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    const hideSpy = vi.spyOn(ServiceLocator.getUiManager(), 'hideSideMenus');

    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, launchCalendarPlugin.bottomIconElementName);

    expect(hideSpy).toHaveBeenCalled();
    expect(launchCalendarPlugin.isMenuButtonActive).toBe(true);
  });

  test('frames keeptrack.space/launches for the simulation year, not the wall-clock year', () => {
    launchCalendarPlugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    // Wall clock and simulation clock disagree on the year; the sim clock wins.
    ServiceLocator.getTimeManager().simulationTimeObj = new Date('2031-06-15T12:00:00Z');

    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, launchCalendarPlugin.bottomIconElementName);
    // openColorbox sets the iframe inside the loading-screen callback.
    vi.advanceTimersByTime(1000);

    expect((document.getElementById('colorbox-iframe') as HTMLIFrameElement).src).toBe('https://keeptrack.space/launches/2031');
  });

  test('uses the UTC year at the turn of the year', () => {
    launchCalendarPlugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date('2027-01-01T00:30:00Z');

    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, launchCalendarPlugin.bottomIconElementName);
    // openColorbox sets the iframe inside the loading-screen callback.
    vi.advanceTimersByTime(1000);

    expect((document.getElementById('colorbox-iframe') as HTMLIFrameElement).src).toBe('https://keeptrack.space/launches/2027');
  });
});

describe('launchScheduleUrl', () => {
  it('builds the keeptrack.space launches page for a year', () => {
    expect(launchScheduleUrl(1957)).toBe('https://keeptrack.space/launches/1957');
  });
});
