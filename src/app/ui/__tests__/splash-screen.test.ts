import { MobileManager } from '@app/app/ui/mobileManager';
import { SplashScreen } from '@app/app/ui/splash-screen';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SplashScreen_class', () => {
  let previousContainerRoot: HTMLDivElement;

  beforeEach(() => {
    // getEl() resolves via document.getElementById, which does not pierce
    // shadow roots, so the splash screen must be attached to the live document.
    document.body.innerHTML = '';
    previousContainerRoot = KeepTrack.getInstance().containerRoot;
    KeepTrack.getInstance().containerRoot = document.body as unknown as HTMLDivElement;
    SplashScreen.initLoadingScreen(document.body);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    KeepTrack.getInstance().containerRoot = previousContainerRoot;
  });

  // Tests that the loading screen is hidden immediately when running on mobile
  it('test_hide_splash_screen_mobile', () => {
    MobileManager.checkMobileMode = vi.fn().mockReturnValue(true);
    SplashScreen.hideSplashScreen();
    // Wait for timers to finish
    vi.advanceTimersByTime(1000);
    expect(getEl('loading-screen')?.style.display).toBe('');
  });

  // Tests that the loading screen is resized and hidden after a timeout when running on desktop
  it('test_hide_splash_screen_desktop', () => {
    SplashScreen.hideSplashScreen();
    // Wait for timers to finish
    vi.advanceTimersByTime(1000);
    expect(getEl('loading-screen')?.style.display).toBe('');
  });

  // Tests that loadStr() does nothing when the loader text element is not found
  it('test_load_str_element_not_found', () => {
    KeepTrack.getInstance().containerRoot.innerHTML = '<div id="loader-text"></div>';
    SplashScreen.loadStr('test');
    expect(getEl('loader-text')?.textContent).toBe('test');
  });

  describe('resetDisplaySettings_ (boot recovery)', () => {
    const resetDisplaySettings = () => (SplashScreen as unknown as { resetDisplaySettings_(): void }).resetDisplaySettings_();

    afterEach(() => {
      localStorage.clear();
    });

    it('clears settings/filter/graphics/colorScheme keys but preserves user data', () => {
      // Settings-family keys (should be cleared) - incl. the drawOrbits value that wedged boot.
      localStorage.setItem('v2-keepTrack-settings-drawOrbits', 'false');
      localStorage.setItem('v2-keepTrack-graphicsSettings-godraysDecay', '0.9');
      localStorage.setItem('v2-filter-settings-debris', 'true');
      localStorage.setItem('v2-keepTrack-colorScheme', 'CountryColorScheme');
      localStorage.setItem('v2-keepTrack-colorSchemeOverrides', '{}');
      // User DATA (must survive).
      localStorage.setItem('v2-keepTrack-watchlistList', '[25544]');
      localStorage.setItem('v2-keepTrack-favoritesList', '[25544]');
      localStorage.setItem('v2-keepTrack-scenarioLibrary', '{}');
      localStorage.setItem('i18nextLng', 'en');

      resetDisplaySettings();

      expect(localStorage.getItem('v2-keepTrack-settings-drawOrbits')).toBeNull();
      expect(localStorage.getItem('v2-keepTrack-graphicsSettings-godraysDecay')).toBeNull();
      expect(localStorage.getItem('v2-filter-settings-debris')).toBeNull();
      expect(localStorage.getItem('v2-keepTrack-colorScheme')).toBeNull();
      expect(localStorage.getItem('v2-keepTrack-colorSchemeOverrides')).toBeNull();

      expect(localStorage.getItem('v2-keepTrack-watchlistList')).toBe('[25544]');
      expect(localStorage.getItem('v2-keepTrack-favoritesList')).toBe('[25544]');
      expect(localStorage.getItem('v2-keepTrack-scenarioLibrary')).toBe('{}');
      expect(localStorage.getItem('i18nextLng')).toBe('en');
    });

    it('is a no-op that never throws when there are no settings keys', () => {
      localStorage.setItem('v2-keepTrack-watchlistList', '[1]');

      expect(() => resetDisplaySettings()).not.toThrow();
      expect(localStorage.getItem('v2-keepTrack-watchlistList')).toBe('[1]');
    });
  });
});
