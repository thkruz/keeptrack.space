import { MobileManager } from '@app/app/ui/mobileManager';
import { OrbitalSettings } from '@app/settings/orbital-settings';
import { settingsManager } from '@app/settings/settings';

describe('OrbitalSettings.maxOrbitsDisplayed', () => {
  it('defaults to 100000', () => {
    const orbital = new OrbitalSettings();

    expect(orbital.maxOrbitsDisplayed).toBe(100000);
  });

  it('round-trips through the settings proxy (flat <-> nested)', () => {
    const previous = settingsManager.maxOrbitsDisplayed;

    settingsManager.maxOrbitsDisplayed = 42;
    expect(settingsManager.orbital.maxOrbitsDisplayed).toBe(42);

    settingsManager.orbital.maxOrbitsDisplayed = 99;
    expect(settingsManager.maxOrbitsDisplayed).toBe(99);

    settingsManager.maxOrbitsDisplayed = previous;
  });

  it('does not expose the legacy typo names on settingsManager', () => {
    const sm = settingsManager as unknown as Record<string, unknown>;

    expect(sm.maxOribtsDisplayed).toBeUndefined();
    expect(sm.maxOribtsDisplayedDesktop).toBeUndefined();
    expect(sm.maxOribtsDisplayedDesktopAll).toBeUndefined();
    expect(sm.maxOrbitsDisplayedMobile).toBeUndefined();
  });

  it('exposes the mobile orbit limit constant on MobileManager', () => {
    expect(MobileManager.MOBILE_ORBIT_LIMIT).toBe(1500);
  });
});
