import { vi } from 'vitest';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('TimeMachine', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TimeMachine, 'TimeMachine');
});
