import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('SensorInfoPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  afterEach(() => {
    jest.advanceTimersByTime(1000);
  });

  standardPluginSuite(SensorInfoPlugin);
  standardPluginMenuButtonTests(SensorInfoPlugin);
  standardClickTests(SensorInfoPlugin);
});
