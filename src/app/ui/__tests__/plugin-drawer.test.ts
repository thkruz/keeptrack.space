import { PluginDrawer } from '@app/app/ui/plugin-drawer';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { getEl } from '@app/engine/utils/get-el';
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
      '<div class="drawer-item disabled" data-plugin-id="overflight-icon" role="button"><span class="drawer-item-label">Overflight</span></div>'
    );
    const item = content.querySelector('.drawer-item[data-plugin-id="overflight-icon"]') as HTMLElement;
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // A disabled item must not be silently swallowed: it forwards bottomMenuClick
    // (the plugin's onBottomIconClick runs and can toast the reason it is disabled).
    expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'overflight-icon');
  });

  it('a disabled drawer item whose plugin gives a reason toasts it instead of forwarding the click', () => {
    buildDrawer();
    const content = getEl('drawer-content', true)!;

    content.insertAdjacentHTML('beforeend', '<div class="drawer-item disabled" data-plugin-id="reason-icon" role="button"><span class="drawer-item-label">Reason</span></div>');
    PluginRegistry.addPlugin({
      id: 'ReasonPlugin',
      bottomIconElementName: 'reason-icon',
      getDisabledReason: () => 'Add satellites to the watchlist first',
      explainDisabledReason: KeepTrackPlugin.prototype.explainDisabledReason,
    } as never);
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    (content.querySelector('.drawer-item[data-plugin-id="reason-icon"]') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(toast).toHaveBeenCalledWith('Add satellites to the watchlist first', expect.anything());
    expect(emitSpy).not.toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'reason-icon');
    PluginRegistry.unregisterAllPlugins();
  });

  describe('rail icon activation', () => {
    const addItem = (pluginId: string): HTMLElement => {
      const content = getEl('drawer-content', true)!;

      content.insertAdjacentHTML('beforeend', `<div class="drawer-item" data-plugin-id="${pluginId}" role="button"><span class="drawer-item-label">${pluginId}</span></div>`);

      return content.querySelector(`.drawer-item[data-plugin-id="${pluginId}"]`) as HTMLElement;
    };

    // The suite already runs on fake timers (standard environment).
    it('a click that arrives with the pointer activates the plugin on the first click', () => {
      buildDrawer();
      const drawerEl = getEl('plugin-drawer')!;

      drawerEl.classList.add('rail-mode');
      const item = addItem('ric-plot-icon');
      const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

      // Enter the rail and click in one motion (no hover dwell).
      drawerEl.dispatchEvent(new MouseEvent('mouseenter'));
      item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      vi.advanceTimersByTime(500);

      expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'ric-plot-icon');
      // The press cancelled the pending hover-expansion so the layout never moved under the cursor.
      expect(drawerEl.classList.contains('rail-hover')).toBe(false);
    });

    it('resting on the rail still expands it after the hover-intent delay', () => {
      buildDrawer();
      const drawerEl = getEl('plugin-drawer')!;

      drawerEl.classList.add('rail-mode');
      drawerEl.dispatchEvent(new MouseEvent('mouseenter'));

      expect(drawerEl.classList.contains('rail-hover')).toBe(false);
      vi.advanceTimersByTime(300);
      expect(drawerEl.classList.contains('rail-hover')).toBe(true);

      drawerEl.dispatchEvent(new MouseEvent('mouseleave'));
      expect(drawerEl.classList.contains('rail-hover')).toBe(false);
    });

    it('pressing the account row cancels a pending hover-expansion so the row cannot move', () => {
      buildDrawer();
      const drawerEl = getEl('plugin-drawer')!;
      const account = getEl('drawer-user-account')!;

      account.innerHTML = '<a id="user-account__login-btn" class="drawer-user-account__row">Login</a>';
      drawerEl.classList.add('rail-mode');
      drawerEl.dispatchEvent(new MouseEvent('mouseenter'));
      account.firstElementChild!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      vi.advanceTimersByTime(500);

      expect(drawerEl.classList.contains('rail-hover')).toBe(false);
    });

    it('anchors the account row directly above the rail toggle', () => {
      buildDrawer();
      const account = getEl('drawer-user-account')!;

      // The status footer collapses in rail mode and expands on hover; it must sit ABOVE the account
      // row so that expansion never slides the login row out from under the cursor.
      expect(account.nextElementSibling?.id).toBe('drawer-rail-toggle');
      expect(account.previousElementSibling?.id).toBe('drawer-status-footer');
    });

    it('activates the pressed item when the layout shifted between mousedown and mouseup', () => {
      buildDrawer();
      const item = addItem('ric-plot-icon');
      const content = getEl('drawer-content', true)!;
      const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

      item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      // mouseup landed elsewhere, so the browser fires click on the common ancestor.
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      vi.advanceTimersByTime(500);

      expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'ric-plot-icon');
    });
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
        '<div class="drawer-item" data-plugin-id="custom-sensor-icon"></div><div class="drawer-item" data-plugin-id="custom-sensor-icon"></div>'
      );
      const rows = [...content.querySelectorAll('.drawer-item[data-plugin-id="custom-sensor-icon"]')];

      getEl('custom-sensor-icon')!.classList.add('bmenu-item-selected');
      await flushObserver();
      rows.forEach((row) => {
        expect(row.classList.contains('active')).toBe(true);
      });

      getEl('custom-sensor-icon')!.classList.remove('bmenu-item-selected');
      await flushObserver();
      rows.forEach((row) => {
        expect(row.classList.contains('active')).toBe(false);
      });
    });

    it('mirrors bottom-icon disabled state onto drawer rows', async () => {
      buildDrawer();
      const content = getEl('drawer-content', true)!;

      content.insertAdjacentHTML('beforeend', '<div class="drawer-item" data-plugin-id="custom-sensor-icon"></div>');
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
