import { keepTrackContainer } from '@app/container';
import { Singletons } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { StandardSensorManager } from '@app/plugins/sensor/sensorManager';
import { defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('SensorFov_class', () => {
  let SensorFovPlugin: SensorFov;
  beforeEach(() => {
    setupStandardEnvironment();
    SensorFovPlugin = new SensorFov();
  });

  standardPluginSuite(SensorFov, 'SensorFov');
  standardPluginMenuButtonTests(SensorFov, 'SensorFov');

  // Test bottom menu click responses
  it('test_bottom_menu_click', () => {
    websiteInit(SensorFovPlugin);

    expect(() => keepTrackApi.methods.bottomMenuClick(SensorFovPlugin.bottomIconElementName)).not.toThrow();

    const sensorManagerInstance = new StandardSensorManager();
    sensorManagerInstance.isSensorSelected = jest.fn().mockReturnValue(true);
    keepTrackContainer.registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    expect(() => keepTrackApi.methods.bottomMenuClick(SensorFovPlugin.bottomIconElementName)).not.toThrow();
  });

  // Test changing sensor
  it('test_change_sensor', () => {
    websiteInit(SensorFovPlugin);

    expect(() => keepTrackApi.methods.setSensor('sensor', 1)).not.toThrow();
    expect(() => keepTrackApi.methods.setSensor(null, null)).not.toThrow();
    expect(() => keepTrackApi.methods.setSensor(defaultSensor, 0)).not.toThrow();
    expect(() => keepTrackApi.methods.setSensor(null, null)).not.toThrow();
    expect(() => keepTrackApi.methods.setSensor(defaultSensor, 2)).not.toThrow();
  });
});
