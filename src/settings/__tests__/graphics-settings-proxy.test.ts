import { SettingsManager } from '@app/settings/settings';

describe('SettingsManager graphics proxy: isSkipTleInterpolation', () => {
  it('reads false (not undefined) on a fresh settings manager', () => {
    const sm = new SettingsManager();

    expect(sm.isSkipTleInterpolation).toBe(false);
  });

  it('round-trips through the settings proxy (flat <-> nested)', () => {
    const sm = new SettingsManager();

    sm.isSkipTleInterpolation = true;
    expect(sm.graphics.isSkipTleInterpolation).toBe(true);

    sm.graphics.isSkipTleInterpolation = false;
    expect(sm.isSkipTleInterpolation).toBe(false);
  });
});

describe('SettingsManager graphics proxy: isDrawEarth', () => {
  it('reads true (not undefined) on a fresh settings manager', () => {
    const sm = new SettingsManager();

    expect(sm.isDrawEarth).toBe(true);
  });

  it('round-trips through the settings proxy (flat <-> nested)', () => {
    const sm = new SettingsManager();

    sm.isDrawEarth = false;
    expect(sm.graphics.isDrawEarth).toBe(false);

    sm.graphics.isDrawEarth = true;
    expect(sm.isDrawEarth).toBe(true);
  });
});
