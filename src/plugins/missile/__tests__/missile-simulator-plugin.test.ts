import { MissileSimulatorPlugin } from '@app/plugins/missile/missile-simulator-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('MissileSimulatorPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('constructs without throwing', () => {
    expect(() => new MissileSimulatorPlugin()).not.toThrow();
  });

  standardPluginSmokeSuite(MissileSimulatorPlugin, 'MissileSimulatorPlugin');
});
