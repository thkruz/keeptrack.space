import { MobileManager } from '@app/app/ui/mobileManager';
import { SplashScreen } from '@app/app/ui/splash-screen';
import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
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

  describe('hints', () => {
    afterEach(() => {
      KeyboardShortcutRegistry.clear();
    });

    it('builds shortcut tips from described registry entries and skips undocumented ones', () => {
      KeyboardShortcutRegistry.clear();
      KeyboardShortcutRegistry.register('CameraInputHandler', [
        { key: 'ArrowUp', description: 'Pan the camera', callback: () => undefined },
        { key: 'ArrowDown', description: 'Pan the camera', callback: () => undefined },
        { key: 'x', callback: () => undefined },
      ]);
      KeyboardShortcutRegistry.registerInfo('PluginDrawer', [{ key: 'Tab', description: 'Toggle the plugin drawer', callback: () => undefined }]);

      const hints = SplashScreen.collectHints();
      const shortcutHints = hints.filter((h) => h.startsWith('Press '));

      expect(shortcutHints).toEqual(['Press ↑: Pan the camera', 'Press ↓: Pan the camera', 'Press Tab: Toggle the plugin drawer']);
      // The static tips that named keys are gone; only key-free ones remain.
      expect(hints.some((h) => /Press the '[A-Z]' key/u.test(h))).toBe(false);
      expect(hints.length).toBeGreaterThan(shortcutHints.length);
    });

    it('fills the hint element once the UI is up', () => {
      KeyboardShortcutRegistry.clear();
      KeyboardShortcutRegistry.register('OrbitManager', [{ key: 'L', description: 'Toggle orbit lines', callback: () => undefined }]);
      vi.spyOn(Math, 'random').mockReturnValue(0.999999);

      expect(getEl('loading-hint-text')?.textContent).toBe('');
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
      expect(getEl('loading-hint-text')?.textContent).toBe('Press L: Toggle orbit lines');
    });
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
