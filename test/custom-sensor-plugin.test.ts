import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { TopMenu } from './../src/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('CustomSensorPlugin_class', () => {
  let customSensorPlugin: CustomSensorPlugin;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorInfoPlugin, SensorListPlugin]);
    customSensorPlugin = new CustomSensorPlugin();
    void customSensorPlugin; // Variable is used indirectly by plugin suite tests
  });

  afterEach(() => {
    jest.advanceTimersByTime(1000);
  });

  standardPluginSuite(CustomSensorPlugin);
  standardPluginMenuButtonTests(CustomSensorPlugin);
  standardClickTests(CustomSensorPlugin);
  standardChangeTests(CustomSensorPlugin);
});
