import { vi } from 'vitest';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SettingsMenuPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SettingsMenuPlugin, 'SettingsMenuPlugin');
});
