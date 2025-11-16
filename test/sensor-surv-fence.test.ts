import { SensorManager } from '@app/app/sensors/sensorManager';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { SensorSurvFence } from '@app/plugins/sensor-surv/sensor-surv-fence';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSensor } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { EventBus } from '@app/engine/events/event-bus';

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

    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, sensorSurvFencePlugin.bottomIconElementName)).not.toThrow();

    const sensorManagerInstance = new SensorManager();

    sensorManagerInstance.isSensorSelected = jest.fn().mockReturnValue(true);
    Container.getInstance().registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, sensorSurvFencePlugin.bottomIconElementName)).not.toThrow();
  });

  // Test changing sensor
  it('test_change_sensor', () => {
    websiteInit(sensorSurvFencePlugin);

    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, 'sensor', 1)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 0)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, null, null)).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.setSensor, defaultSensor, 2)).not.toThrow();
  });
});
