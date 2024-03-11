import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('CustomSensorPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  afterEach(() => {
    jest.advanceTimersByTime(1000);
  });

  standardPluginSuite(CustomSensorPlugin);
  standardPluginMenuButtonTests(CustomSensorPlugin);
  standardClickTests(CustomSensorPlugin);
  standardChangeTests(CustomSensorPlugin);
});
