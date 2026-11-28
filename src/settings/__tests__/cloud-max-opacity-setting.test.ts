import { StorageKey } from '@app/engine/utils/persistence-manager';
import { PERSISTED_SETTINGS_TABLE } from '@app/settings/persisted-settings-table';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('cloudMaxOpacity setting', () => {
  const entry = () => PERSISTED_SETTINGS_TABLE.find((e) => e.key === StorageKey.SETTINGS_HQ_GRAPHICS)!;

  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    settingsManager.cloudMaxOpacity = 0.95;
  });

  it('defaults to 0.95', () => {
    expect(settingsManager.cloudMaxOpacity).toBe(0.95);
  });

  it('round-trips through the saved HQ graphics settings', () => {
    settingsManager.cloudMaxOpacity = 0.6;
    const raw = entry().serialize(settingsManager) as string;

    settingsManager.cloudMaxOpacity = 0.95;
    entry().deserialize(settingsManager, raw);
    expect(settingsManager.cloudMaxOpacity).toBe(0.6);
  });

  it('clamps saved values to 0.3..1 and falls back to 0.95 when missing', () => {
    entry().deserialize(settingsManager, JSON.stringify({ cloudMaxOpacity: 0.1 }));
    expect(settingsManager.cloudMaxOpacity).toBe(0.3);
    entry().deserialize(settingsManager, JSON.stringify({ cloudMaxOpacity: 3 }));
    expect(settingsManager.cloudMaxOpacity).toBe(1);
    entry().deserialize(settingsManager, JSON.stringify({}));
    expect(settingsManager.cloudMaxOpacity).toBe(0.95);
  });
});
