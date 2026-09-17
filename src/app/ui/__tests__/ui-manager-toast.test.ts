import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import type { Toast } from '@materializecss/materialize';
import { Mock, vi } from 'vitest';
import { UiManager } from '../ui-manager';

/**
 * Regression tests for #1425 / #1433 ("Cannot read properties of null (reading 'remove')"
 * in Toast._removeContainer).
 *
 * Materialize v2's `dismiss()` is NOT idempotent: the second call runs `_removeContainer()`
 * against an already-null `_container` and throws exactly the TypeError the production
 * reports carried. The library's own 20 ms auto-dismiss interval never consulted
 * KeepTrack's `dismissedToasts_` guard, so "auto-expire, then tap" tore a toast down twice.
 *
 * The global Materialize stub (test/vitest-setup.ts) gives every Toast a `dismiss = vi.fn()`.
 * Each test re-implements it to mirror the real non-idempotent teardown, so a second call
 * surfaces as a throw instead of silently passing.
 */
type MockToast = Toast & { dismiss: Mock };
type UiManagerInternals = { makeToast_: (text: string, type: ToastMsgType, isLong?: boolean) => MockToast | null; activeToastList_: Toast[] };

describe('UiManager toast teardown (#1425, #1433)', () => {
  let uiManager: UiManager;
  let internals: UiManagerInternals;

  beforeEach(() => {
    vi.useFakeTimers();
    EventBus.getInstance().unregisterAllEvents();
    vi.spyOn(ServiceLocator, 'getSoundManager').mockReturnValue(null as never);
    document.body.innerHTML = '<div id="colorbox-div" style="display:none;"></div>';
    settingsManager.isDisableToasts = false;
    uiManager = new UiManager();
    internals = uiManager as unknown as UiManagerInternals;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  /** Create a toast through the production path and make its dismiss behave like Materialize's. */
  const makeToast = (): MockToast => {
    const toast = internals.makeToast_('hello', ToastMsgType.normal);

    expect(toast).not.toBeNull();
    internals.activeToastList_.push(toast!);

    let container: { remove: () => void } | null = { remove: () => undefined };

    toast!.dismiss.mockImplementation(() => {
      // Materialize: `Toast._container.remove(); Toast._container = null;`
      container!.remove();
      container = null;
    });

    return toast!;
  };

  it('dismisses exactly once when the toast auto-expires and is then clicked', () => {
    const toast = makeToast();

    vi.advanceTimersByTime(toast.timeRemaining + 1);
    expect(toast.dismiss).toHaveBeenCalledTimes(1);

    expect(() => toast.el.dispatchEvent(new MouseEvent('click'))).not.toThrow();
    expect(() => toast.el.dispatchEvent(new MouseEvent('contextmenu'))).not.toThrow();
    expect(toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses exactly once when clicked and the auto-expire timer then fires', () => {
    const toast = makeToast();

    toast.el.dispatchEvent(new MouseEvent('click'));
    expect(toast.dismiss).toHaveBeenCalledTimes(1);

    expect(() => vi.advanceTimersByTime(toast.timeRemaining + 1)).not.toThrow();
    expect(toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it('dismissAllToasts after auto-expiry never double-tears a toast', () => {
    const first = makeToast();
    const second = makeToast();

    vi.advanceTimersByTime(first.timeRemaining + 1);

    expect(() => uiManager.dismissAllToasts()).not.toThrow();
    expect(first.dismiss).toHaveBeenCalledTimes(1);
    expect(second.dismiss).toHaveBeenCalledTimes(1);
    expect(internals.activeToastList_).toHaveLength(0);
  });

  it('removes an auto-expired toast from the active list', () => {
    const toast = makeToast();

    expect(internals.activeToastList_).toContain(toast);
    vi.advanceTimersByTime(toast.timeRemaining + 1);
    expect(internals.activeToastList_).not.toContain(toast);
  });

  it('never lets a library teardown throw reach the caller', () => {
    const toast = makeToast();

    // Simulate a future library regression: even the first dismiss blows up.
    toast.dismiss.mockImplementation(() => {
      throw new TypeError("Cannot read properties of null (reading 'remove')");
    });

    expect(() => toast.el.dispatchEvent(new MouseEvent('click'))).not.toThrow();
    expect(internals.activeToastList_).not.toContain(toast);
  });
});
