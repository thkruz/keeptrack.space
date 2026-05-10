import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { vi } from 'vitest';
import { UiManager } from '../ui-manager';

/**
 * Regression test for #1331:
 * Pressing a plugin's keyboard shortcut before `EventBusEvent.uiManagerFinal` fires
 * used to throw `hideSideMenus is not a function`, because both `hideSideMenus`
 * and `bottomIconPress` were assigned inside the `uiManagerFinal` listener.
 *
 * The fix moves them to class field initializers — these tests guard against
 * any future refactor that re-introduces the lazy-assignment pattern.
 */
describe('UiManager construction-time defaults', () => {
  beforeEach(() => {
    EventBus.getInstance().unregisterAllEvents();
    vi.spyOn(ServiceLocator, 'getSoundManager').mockReturnValue(null as never);
    // `closeColorbox` calls `getEl('colorbox-div')`, which throws in the jsdom
    // test environment when the element is missing (browsers return null).
    // Provide the element so the call is a no-op, matching production behaviour.
    document.body.innerHTML = '<div id="colorbox-div" style="display:none;"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('exposes hideSideMenus as a function immediately after construction', () => {
    const uiManager = new UiManager();

    expect(typeof uiManager.hideSideMenus).toBe('function');
  });

  it('hideSideMenus emits EventBusEvent.hideSideMenus without throwing before uiManagerFinal', () => {
    const uiManager = new UiManager();
    const listener = vi.fn();

    EventBus.getInstance().on(EventBusEvent.hideSideMenus, listener);

    expect(() => uiManager.hideSideMenus()).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('exposes bottomIconPress as a function immediately after construction', () => {
    const uiManager = new UiManager();

    expect(typeof uiManager.bottomIconPress).toBe('function');
  });

  it('bottomIconPress emits EventBusEvent.bottomMenuClick with the element id', () => {
    const uiManager = new UiManager();
    const listener = vi.fn();

    EventBus.getInstance().on(EventBusEvent.bottomMenuClick, listener);

    const fakeIcon = { id: 'menu-planets' } as HTMLElement;

    expect(() => uiManager.bottomIconPress(fakeIcon)).not.toThrow();
    expect(listener).toHaveBeenCalledWith('menu-planets');
  });
});
