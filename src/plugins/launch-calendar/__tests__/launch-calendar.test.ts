import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { LaunchCalendar } from '@app/plugins/launch-calendar/launch-calendar';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { createColorbox } from '@app/engine/utils/colorbox';
import { setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('LaunchCalendar', () => {
  let plugin: LaunchCalendar;

  beforeEach(() => {
    setupDefaultHtml();
    plugin = new LaunchCalendar();
  });

  standardPluginSuite(LaunchCalendar, 'LaunchCalendar');

  describe('getBottomIconConfig', () => {
    it('should return correct config', () => {
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('launch-calendar-bottom-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toBeDefined();
    });
  });

  describe('getHelpConfig', () => {
    it('should return help config', () => {
      const config = plugin.getHelpConfig();

      expect(config.title).toBeDefined();
      expect(config.body).toBeDefined();
    });
  });

  describe('getCommandPaletteCommands', () => {
    it('should return commands', () => {
      const commands = plugin.getCommandPaletteCommands();

      expect(commands.length).toBe(1);
      expect(commands[0].id).toBe('LaunchCalendar.open');
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

describe('launch_calendar_plugin', () => {
  let launchCalendarPlugin: LaunchCalendar;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    createColorbox();
    launchCalendarPlugin = new LaunchCalendar();
  });

  standardPluginSuite(LaunchCalendar, 'LaunchCalendar');
  standardPluginMenuButtonTests(LaunchCalendar, 'LaunchCalendar');

  test('close_colorbox', () => {
    launchCalendarPlugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, launchCalendarPlugin.bottomIconElementName);
    vi.advanceTimersByTime(4000);
    // eslint-disable-next-line dot-notation
    expect(() => launchCalendarPlugin['closeColorbox_']()).not.toThrow();
  });
});
