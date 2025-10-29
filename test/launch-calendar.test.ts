import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { createColorbox } from '@app/engine/utils/colorbox';
import { keepTrackApi } from '@app/keepTrackApi';
import { LaunchCalendar } from '@app/plugins/launch-calendar/launch-calendar';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

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
    keepTrackApi.emit(EventBusEvent.uiManagerInit);
    keepTrackApi.emit(EventBusEvent.uiManagerFinal);
    keepTrackApi.emit(EventBusEvent.bottomMenuClick, launchCalendarPlugin.bottomIconElementName);
    jest.advanceTimersByTime(4000);
    // eslint-disable-next-line dot-notation
    expect(() => launchCalendarPlugin['closeColorbox_']()).not.toThrow();
  });
});
