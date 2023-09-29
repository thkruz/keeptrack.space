import { keepTrackApi } from '@app/js/keepTrackApi';
import { createColorbox } from '@app/js/lib/colorbox';
import { LaunchCalendar } from '@app/js/plugins/launch-calendar/launch-calendar';
import { setupMinimumHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('launch_calendar_plugin', () => {
  let launchCalendarPlugin: LaunchCalendar;
  beforeEach(() => {
    setupMinimumHtml();
    createColorbox();
    launchCalendarPlugin = new LaunchCalendar();
  });

  standardPluginSuite(LaunchCalendar, 'LaunchCalendar');
  standardPluginMenuButtonTests(LaunchCalendar, 'LaunchCalendar');

  test('close_colorbox', () => {
    launchCalendarPlugin.init();
    keepTrackApi.methods.uiManagerInit();
    keepTrackApi.methods.uiManagerFinal();
    keepTrackApi.methods.bottomMenuClick(launchCalendarPlugin.bottomIconElementName);
    jest.advanceTimersByTime(4000);
    expect(() => launchCalendarPlugin['closeColorbox_']()).not.toThrow();
  });
});
