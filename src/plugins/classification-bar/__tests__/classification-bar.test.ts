import { vi } from 'vitest';
import { ClassificationBar } from '@app/plugins/classification-bar/classification-bar';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('ClassificationBar', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ClassificationBar, 'ClassificationBar');
});
