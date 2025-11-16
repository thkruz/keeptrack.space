import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { createColorbox } from '@app/engine/utils/colorbox';
import { LaunchCalendar } from '@app/plugins/launch-calendar/launch-calendar';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';
import { EventBus } from '@app/engine/events/event-bus';

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
    jest.advanceTimersByTime(4000);
    // eslint-disable-next-line dot-notation
    expect(() => launchCalendarPlugin['closeColorbox_']()).not.toThrow();
  });
});
