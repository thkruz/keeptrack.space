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

  it('clicking a disabled drawer item forwards the click so the plugin can explain itself', () => {
    buildDrawer();
    const content = getEl('drawer-content', true)!;

    content.insertAdjacentHTML(
      'beforeend',
      '<div class="drawer-item disabled" data-plugin-id="overflight-icon" role="button"><span class="drawer-item-label">Overflight</span></div>',
    );
    const item = content.querySelector('.drawer-item[data-plugin-id="overflight-icon"]') as HTMLElement;
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // A disabled item must not be silently swallowed: it forwards bottomMenuClick
    // (the plugin's onBottomIconClick runs and can toast the reason it is disabled).
    expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'overflight-icon');
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

  describe('bottom icon state observer', () => {
    // MutationObserver delivers on a task boundary; the suite runs on fake
    // timers, so advance them (which also drains microtasks) to let it run.
    const flushObserver = () => vi.advanceTimersByTimeAsync(0);

    beforeEach(() => {
      // The hidden bottom-icon bar must exist before uiManagerFinal so the observer attaches.
      getEl('bottom-icons', true)?.remove();
      document.body.insertAdjacentHTML('beforeend', '<div id="bottom-icons"><div id="custom-sensor-icon"></div></div>');
    });

    it('mirrors bottom-icon selection onto every duplicate drawer row, even after the deferred toggle', async () => {
      buildDrawer();
      const content = getEl('drawer-content', true)!;

      // Same plugin listed twice: once in the Recent group, once in its category group.
      content.insertAdjacentHTML(
        'beforeend',
        '<div class="drawer-item" data-plugin-id="custom-sensor-icon"></div>' +
        '<div class="drawer-item" data-plugin-id="custom-sensor-icon"></div>',
      );
      const rows = [...content.querySelectorAll('.drawer-item[data-plugin-id="custom-sensor-icon"]')];

      getEl('custom-sensor-icon')!.classList.add('bmenu-item-selected');
      await flushObserver();
      rows.forEach((row) => expect(row.classList.contains('active')).toBe(true));

      getEl('custom-sensor-icon')!.classList.remove('bmenu-item-selected');
      await flushObserver();
      rows.forEach((row) => expect(row.classList.contains('active')).toBe(false));
    });

    it('mirrors bottom-icon disabled state onto drawer rows', async () => {
      buildDrawer();
      const content = getEl('drawer-content', true)!;

      content.insertAdjacentHTML(
        'beforeend',
        '<div class="drawer-item" data-plugin-id="custom-sensor-icon"></div>',
      );
      const row = content.querySelector('.drawer-item[data-plugin-id="custom-sensor-icon"]')!;

      getEl('custom-sensor-icon')!.classList.add('bmenu-item-disabled');
      await flushObserver();
      expect(row.classList.contains('disabled')).toBe(true);

      getEl('custom-sensor-icon')!.classList.remove('bmenu-item-disabled');
      await flushObserver();
      expect(row.classList.contains('disabled')).toBe(false);
    });
  });
});
