import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { enforceLoginGates, enforceLoginGatesAfterNextUpdate } from '@app/engine/plugins/core/login-gate-enforcer';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// base-plugin reads the global settingsManager (not the module import), so drive that one.
const globalSettings = (): { isDisableLoginGate: boolean } => (globalThis as unknown as { settingsManager: { isDisableLoginGate: boolean } }).settingsManager;

interface FakeView {
  plugin: KeepTrackPlugin;
  /** Stand-in for a camera-mode plugin's own state (e.g. camera.cameraType === FLAT_MAP). */
  state: { isViewOn: boolean };
}

/**
 * Builds a plugin on the real prototype (skipping the UI-heavy constructor) and
 * wires the real base-class bottomMenuClick handler, so closing goes through the
 * exact path a user's second click takes.
 */
const makeView = (id: string, opts: { gated?: boolean; active?: boolean } = {}): FakeView => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as KeepTrackPlugin;
  const state = { isViewOn: opts.active ?? false };

  plugin.id = id;
  plugin.bottomIconElementName = `${id}-bottom-icon`;
  plugin.sideMenuElementName = '';
  plugin.isLoginRequired = opts.gated ?? false;
  plugin.isMenuButtonActive = opts.active ?? false;
  plugin.isRequireSatelliteSelected = false;
  plugin.isRequireSensorSelected = false;
  plugin.shakeBottomIcon = vi.fn();
  // Like FlatMapView.bottomIconCallback: a click while on returns to the default view.
  plugin.registerBottomMenuClicked(() => {
    state.isViewOn = !state.isViewOn;
  });
  PluginRegistry.addPlugin(plugin);

  return { plugin, state };
};

describe('login-gate-enforcer', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let openModal: ReturnType<typeof vi.fn>;
  let token: string | null;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    EventBus.getInstance().unregisterAllEvents();
    globalSettings().isDisableLoginGate = false;
    token = null;
    KeepTrackPlugin.loginGateTokenProvider = () => token;
    openModal = vi.fn();
    KeepTrackPlugin.loginGateOpenModal = openModal;
    warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    EventBus.getInstance().unregisterAllEvents();
    KeepTrackPlugin.loginGateTokenProvider = null;
    KeepTrackPlugin.loginGateOpenModal = null;
    vi.restoreAllMocks();
  });

  it('closes an active gated view for a logged-out user and returns to the default view', () => {
    const flat = makeView('FlatMapView', { gated: true, active: true });

    const closed = enforceLoginGates();

    expect(closed).toEqual([flat.plugin]);
    expect(flat.plugin.isMenuButtonActive).toBe(false);
    expect(flat.state.isViewOn).toBe(false);
  });

  it('leaves ungated plugins and inactive gated plugins alone', () => {
    const free = makeView('EarthCenteredView', { gated: false, active: true });
    const idle = makeView('PolarView', { gated: true, active: false });

    expect(enforceLoginGates()).toEqual([]);
    expect(free.state.isViewOn).toBe(true);
    expect(free.plugin.isMenuButtonActive).toBe(true);
    expect(idle.state.isViewOn).toBe(false);
  });

  it('keeps a gated view open while the user is logged in', () => {
    token = 'live-token';
    const flat = makeView('FlatMapView', { gated: true, active: true });

    KeepTrackPlugin.setLoginGateToken(flat.plugin, token);

    expect(enforceLoginGates({ isNotify: true })).toEqual([]);
    expect(flat.state.isViewOn).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('keeps gated views open when the login gate is disabled', () => {
    globalSettings().isDisableLoginGate = true;
    const flat = makeView('FlatMapView', { gated: true, active: true });

    expect(enforceLoginGates()).toEqual([]);
    expect(flat.state.isViewOn).toBe(true);
  });

  it('shows the drawer login prompt only when asked to notify', () => {
    const flat = makeView('FlatMapView', { gated: true, active: true });

    enforceLoginGates();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(openModal).not.toHaveBeenCalled();

    flat.plugin.isMenuButtonActive = true;
    flat.state.isViewOn = true;
    enforceLoginGates({ isNotify: true });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(flat.plugin.shakeBottomIcon).toHaveBeenCalled();
    expect(openModal).toHaveBeenCalledTimes(1);
  });

  it('closes a plugin with no bottom icon by clearing its active state', () => {
    const plugin = Object.create(KeepTrackPlugin.prototype) as KeepTrackPlugin;

    plugin.id = 'Headless';
    plugin.bottomIconElementName = '';
    plugin.sideMenuElementName = '';
    plugin.isLoginRequired = true;
    plugin.isMenuButtonActive = true;
    PluginRegistry.addPlugin(plugin);

    expect(enforceLoginGates()).toEqual([plugin]);
    expect(plugin.isMenuButtonActive).toBe(false);
  });

  describe('enforceLoginGatesAfterNextUpdate', () => {
    it('catches a view that only reports itself active on the next update tick', async () => {
      const flat = makeView('FlatMapView', { gated: true, active: false });

      // A camera-mode plugin syncs isMenuButtonActive from the camera in its updateLoop listener.
      EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
        if (flat.state.isViewOn && !flat.plugin.isMenuButtonActive) {
          flat.plugin.isMenuButtonActive = true;
        }
      });

      // A scenario restore flips the view on directly, bypassing the click gate.
      flat.state.isViewOn = true;
      enforceLoginGatesAfterNextUpdate({ isNotify: true });

      // Nothing is active yet, so nothing closes immediately.
      expect(flat.state.isViewOn).toBe(true);

      EventBus.getInstance().emit(EventBusEvent.updateLoop);

      expect(flat.state.isViewOn).toBe(false);
      expect(flat.plugin.isMenuButtonActive).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(openModal).toHaveBeenCalledTimes(1);

      // The one-shot listener removes itself after the tick.
      await Promise.resolve();
      flat.state.isViewOn = true;
      EventBus.getInstance().emit(EventBusEvent.updateLoop);
      expect(flat.state.isViewOn).toBe(true);
    });

    it('notifies once when the view was already active at restore time', () => {
      makeView('FlatMapView', { gated: true, active: true });

      enforceLoginGatesAfterNextUpdate({ isNotify: true });
      EventBus.getInstance().emit(EventBusEvent.updateLoop);

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
