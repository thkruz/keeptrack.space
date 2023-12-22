import { keepTrackApi } from '@app/keepTrackApi';
import { createColorbox } from '@app/lib/colorbox';
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
    keepTrackApi.methods.uiManagerInit();
    keepTrackApi.methods.uiManagerFinal();
    keepTrackApi.methods.bottomMenuClick(launchCalendarPlugin.bottomIconElementName);
    jest.advanceTimersByTime(4000);
    expect(() => launchCalendarPlugin['closeColorbox_']()).not.toThrow();
  });
});
