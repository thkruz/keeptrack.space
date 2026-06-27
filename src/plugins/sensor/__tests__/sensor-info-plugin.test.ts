import { vi } from 'vitest';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

describe('SensorInfoPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  it('constructs without throwing', () => {
    expect(() => new SensorInfoPlugin()).not.toThrow();
  });

  standardPluginSuite(SensorInfoPlugin);
  standardPluginMenuButtonTests(SensorInfoPlugin);
  standardClickTests(SensorInfoPlugin);
});
