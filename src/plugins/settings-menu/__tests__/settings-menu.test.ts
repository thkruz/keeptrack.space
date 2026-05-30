import { vi } from 'vitest';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests, standardClickTests, standardChangeTests } from '@test/generic-tests';

describe('SettingsMenuPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SettingsMenuPlugin, 'SettingsMenuPlugin');
  standardPluginMenuButtonTests(SettingsMenuPlugin, 'SettingsMenuPlugin');
  standardClickTests(SettingsMenuPlugin);
  standardChangeTests(SettingsMenuPlugin);
});
