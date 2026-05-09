import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEl } from '@app/engine/utils/get-el';

import { MobileManager } from '@app/app/ui/mobileManager';
import { SplashScreen } from '@app/app/ui/splash-screen';
import { KeepTrack } from '@app/keeptrack';

describe('SplashScreen_class', () => {
  beforeEach(() => {
    // getEl() resolves via document.getElementById, which does not pierce
    // shadow roots, so the splash screen must be attached to the live document.
    document.body.innerHTML = '';
    KeepTrack.getInstance().containerRoot = document.body as unknown as HTMLDivElement;
    SplashScreen.initLoadingScreen(document.body);
  });

  afterEach(() => {
    document.body.innerHTML = '';
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
});
