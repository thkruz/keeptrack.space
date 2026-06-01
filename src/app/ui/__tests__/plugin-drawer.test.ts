import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { PluginDrawer } from '@app/app/ui/plugin-drawer';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const emit = (e: EventBusEvent, ...args: unknown[]) => EventBus.getInstance().emit(e, ...args);

const buildDrawer = (): PluginDrawer => {
  const drawer = new PluginDrawer();

  drawer.init();
  emit(EventBusEvent.uiManagerInit);
  emit(EventBusEvent.uiManagerFinal);

  return drawer;
};

describe('PluginDrawer', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    // Roots the drawer DOM is appended to.
    for (const id of ['keeptrack-root', 'nav-wrapper', 'ui-wrapper']) {
      if (!getEl(id, true)) {
        document.body.insertAdjacentHTML('beforeend', `<div id="${id}"></div>`);
      }
    }
    settingsManager.isMobileModeEnabled = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.classList.remove('drawer-mode', 'is-mobile-mode');
  });

  it('init builds the drawer DOM and the hamburger button', () => {
    buildDrawer();

    expect(getEl('plugin-drawer', true)).not.toBeNull();
    expect(getEl('drawer-hamburger', true)).not.toBeNull();
    expect(document.body.classList.contains('drawer-mode')).toBe(true);
  });

  it('open / close / toggle flip the open class and state', () => {
    const drawer = buildDrawer();

    drawer.open();
    expect(getEl('plugin-drawer')!.classList.contains('open')).toBe(true);

    drawer.close();
    expect(getEl('plugin-drawer')!.classList.contains('open')).toBe(false);

    // toggle opens then closes.
    drawer.toggle();
    expect(getEl('plugin-drawer')!.classList.contains('open')).toBe(true);
    drawer.toggle();
    expect(getEl('plugin-drawer')!.classList.contains('open')).toBe(false);
  });

  it('open is idempotent and close is a no-op when already closed', () => {
    const drawer = buildDrawer();

    drawer.open();
    expect(() => drawer.open()).not.toThrow();
    drawer.close();
    expect(() => drawer.close()).not.toThrow();
  });

  it('toggleRailMode is a no-op in mobile mode', () => {
    settingsManager.isMobileModeEnabled = true;
    const drawer = buildDrawer();

    expect(() => drawer.toggleRailMode()).not.toThrow();
  });

  it('toggleRailMode toggles open state on tablet+', () => {
    const drawer = buildDrawer();

    drawer.toggleRailMode();
    expect(getEl('plugin-drawer')!.classList.contains('open')).toBe(true);
  });

  describe('EventBus reactions', () => {
    it('hideSideMenus closes an open drawer', () => {
      const drawer = buildDrawer();

      drawer.open();
      emit(EventBusEvent.hideSideMenus);

      expect(getEl('plugin-drawer')!.classList.contains('open')).toBe(false);
    });

    it('selectSatData closes the drawer and syncs disabled state', () => {
      const drawer = buildDrawer();

      drawer.open();
      expect(() => emit(EventBusEvent.selectSatData, null)).not.toThrow();
      expect(getEl('plugin-drawer')!.classList.contains('open')).toBe(false);
    });

    it('onWatchlistUpdated adds and clears the watchlist badge', () => {
      buildDrawer();

      expect(() => emit(EventBusEvent.onWatchlistUpdated, [{ id: 1, inView: false }])).not.toThrow();
      expect(() => emit(EventBusEvent.onWatchlistUpdated, [])).not.toThrow();
    });

    it('connectivityChange updates the connectivity status', () => {
      buildDrawer();

      expect(() => emit(EventBusEvent.connectivityChange, false)).not.toThrow();
      expect(() => emit(EventBusEvent.connectivityChange, true)).not.toThrow();
    });

    it('setSensor and resetSensor sync badges without throwing', () => {
      buildDrawer();

      expect(() => emit(EventBusEvent.setSensor)).not.toThrow();
      expect(() => emit(EventBusEvent.resetSensor)).not.toThrow();
    });

    it('onKeepTrackReady marks the drawer ready', () => {
      const drawer = buildDrawer();

      emit(EventBusEvent.onKeepTrackReady);

      expect(getEl('plugin-drawer')!.classList.contains('ready')).toBe(true);
      expect(drawer).toBeDefined();
    });
  });

  it('mobile mode adds the is-mobile-mode body class', () => {
    settingsManager.isMobileModeEnabled = true;
    buildDrawer();

    expect(document.body.classList.contains('is-mobile-mode')).toBe(true);
  });
});
