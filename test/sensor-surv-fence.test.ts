import { keepTrackContainer } from '@app/container';
import { KeepTrackApiEvents, Singletons } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { SensorManager } from '@app/plugins/sensor/sensorManager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('SensorSurvFence_class', () => {
  let sensorSurvFencePlugin: SensorSurvFence;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
    sensorSurvFencePlugin = new SensorSurvFence();
  });

  standardPluginSuite(SensorSurvFence, 'SensorSurvFence');
  standardPluginMenuButtonTests(SensorSurvFence, 'SensorSurvFence');

  // Test bottom menu click responses
  it('test_bottom_menu_click', () => {
    websiteInit(sensorSurvFencePlugin);

    expect(() => keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, sensorSurvFencePlugin.bottomIconElementName)).not.toThrow();

    const sensorManagerInstance = new SensorManager();

    sensorManagerInstance.isSensorSelected = jest.fn().mockReturnValue(true);
    keepTrackContainer.registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    expect(() => keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, sensorSurvFencePlugin.bottomIconElementName)).not.toThrow();
  });

  // Test changing sensor
  it('test_change_sensor', () => {
    websiteInit(sensorSurvFencePlugin);

    expect(() => keepTrackApi.emit(KeepTrackApiEvents.setSensor, 'sensor', 1)).not.toThrow();
    expect(() => keepTrackApi.emit(KeepTrackApiEvents.setSensor, null, null)).not.toThrow();
    expect(() => keepTrackApi.emit(KeepTrackApiEvents.setSensor, defaultSensor, 0)).not.toThrow();
    expect(() => keepTrackApi.emit(KeepTrackApiEvents.setSensor, null, null)).not.toThrow();
    expect(() => keepTrackApi.emit(KeepTrackApiEvents.setSensor, defaultSensor, 2)).not.toThrow();
  });
});
