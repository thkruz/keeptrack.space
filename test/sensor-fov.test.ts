import { SensorManager } from '@app/app/sensors/sensorManager';
import { keepTrackContainer } from '@app/container';
import { Singletons } from '@app/engine/core/interfaces';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { keepTrackApi } from '@app/keepTrackApi';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('SensorFov_class', () => {
  let SensorFovPlugin: SensorFov;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
    SensorFovPlugin = new SensorFov();
  });

  standardPluginSuite(SensorFov, 'SensorFov');
  standardPluginMenuButtonTests(SensorFov, 'SensorFov');

  // Test bottom menu click responses
  it('test_bottom_menu_click', () => {
    websiteInit(SensorFovPlugin);

    expect(() => keepTrackApi.emit(EventBusEvent.bottomMenuClick, SensorFovPlugin.bottomIconElementName)).not.toThrow();

    const sensorManagerInstance = new SensorManager();

    sensorManagerInstance.isSensorSelected = jest.fn().mockReturnValue(true);
    keepTrackContainer.registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    expect(() => keepTrackApi.emit(EventBusEvent.bottomMenuClick, SensorFovPlugin.bottomIconElementName)).not.toThrow();
  });

  // Test changing sensor
  it('test_change_sensor', () => {
    websiteInit(SensorFovPlugin);

    expect(() => keepTrackApi.emit(EventBusEvent.setSensor, 'sensor', 1)).not.toThrow();
    expect(() => keepTrackApi.emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => keepTrackApi.emit(EventBusEvent.setSensor, defaultSensor, 0)).not.toThrow();
    expect(() => keepTrackApi.emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => keepTrackApi.emit(EventBusEvent.setSensor, defaultSensor, 2)).not.toThrow();
  });
});
