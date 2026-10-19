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
 * Materialize v2's `dismiss()` is NOT idempotent, and its teardown is asynchronous: each call
 * queues a `setTimeout` that splices the toast out of `Toast._toasts` and, once the list is
 * empty, runs `_removeContainer()` against the shared static `_container`. A second call
 * queues a second teardown that hits the already-null container and throws exactly the
 * TypeError the production reports carried, from inside the timer where no try/catch reaches.
 *
 * The global Materialize stub (test/vitest-setup.ts) gives every Toast a plain `dismiss = vi.fn()`.
 * `installLibraryDismiss` swaps in a fake with the real shape just before production code wraps
 * it: each call records on the per-toast `teardown` mock and defers the teardown against a shared
 * container, so a double dismiss surfaces as a throw when the timers run instead of passing quietly.
 */
type MockToast = Toast & { teardown: Mock; wasSwiped: boolean };
type UiManagerInternals = {
  guardDismiss_: (toast: Toast) => void;
  makeToast_: (text: string, type: ToastMsgType, isLong?: boolean) => MockToast | null;
  activeToastList_: Toast[];
};

const library: { toasts: Toast[]; container: { remove: () => void } | null } = { toasts: [], container: null };

const installLibraryDismiss = (toast: MockToast) => {
  library.container ??= { remove: () => undefined };
  library.toasts.push(toast);
  toast.wasSwiped = false;
  toast.teardown = vi.fn();
  toast.dismiss = () => {
    toast.teardown();
    setTimeout(() => {
      library.toasts.splice(library.toasts.indexOf(toast), 1);
      if (library.toasts.length === 0) {
        // Materialize: `Toast._container.remove(); Toast._container = null;`
        library.container!.remove();
        library.container = null;
      }
    }, 300);
  };
};

describe('UiManager toast teardown (#1425, #1433)', () => {
  let uiManager: UiManager;
  let internals: UiManagerInternals;

  beforeEach(() => {
    vi.useFakeTimers();
    EventBus.getInstance().unregisterAllEvents();
    vi.spyOn(ServiceLocator, 'getSoundManager').mockReturnValue(null as never);
    document.body.innerHTML = '<div id="colorbox-div" style="display:none;"></div>';
    settingsManager.isDisableToasts = false;
    library.toasts = [];
    library.container = null;
    uiManager = new UiManager();
    internals = uiManager as unknown as UiManagerInternals;

    const guardDismiss = internals.guardDismiss_.bind(uiManager);

    vi.spyOn(internals, 'guardDismiss_').mockImplementation((toast: Toast) => {
      installLibraryDismiss(toast as MockToast);
      guardDismiss(toast);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  /** Create a toast through the production path. */
  const makeToast = (): MockToast => {
    const toast = internals.makeToast_('hello', ToastMsgType.normal);

    expect(toast).not.toBeNull();
    internals.activeToastList_.push(toast!);

    return toast!;
  };

  /** What Materialize's Toast._onDragEnd does once a swipe passes the activation distance. */
  const swipe = (toast: MockToast) => {
    toast.wasSwiped = true;
    toast.dismiss();
  };

  it('dismisses exactly once when the toast auto-expires and is then clicked', () => {
    const toast = makeToast();

    vi.advanceTimersByTime(toast.timeRemaining + 1);
    expect(toast.teardown).toHaveBeenCalledTimes(1);

    expect(() => toast.el.dispatchEvent(new MouseEvent('click'))).not.toThrow();
    expect(() => toast.el.dispatchEvent(new MouseEvent('contextmenu'))).not.toThrow();
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(toast.teardown).toHaveBeenCalledTimes(1);
  });

  it('dismisses exactly once when clicked and the auto-expire timer then fires', () => {
    const toast = makeToast();

    toast.el.dispatchEvent(new MouseEvent('click'));
    expect(toast.teardown).toHaveBeenCalledTimes(1);

    expect(() => vi.runAllTimers()).not.toThrow();
    expect(toast.teardown).toHaveBeenCalledTimes(1);
  });

  it('dismisses exactly once when swiped away and the auto-expire timer then fires (#1425)', () => {
    const toast = makeToast();

    swipe(toast);
    expect(toast.teardown).toHaveBeenCalledTimes(1);
    expect(internals.activeToastList_).not.toContain(toast);

    expect(() => vi.runAllTimers()).not.toThrow();
    expect(toast.teardown).toHaveBeenCalledTimes(1);
  });

  it('a swipe during dismissAllToasts never double-tears either toast (#1425)', () => {
    const first = makeToast();
    const second = makeToast();

    swipe(first);

    expect(() => uiManager.dismissAllToasts()).not.toThrow();
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(first.teardown).toHaveBeenCalledTimes(1);
    expect(second.teardown).toHaveBeenCalledTimes(1);
    expect(library.container).toBeNull();
  });

  it('dismissAllToasts after auto-expiry never double-tears a toast', () => {
    const first = makeToast();
    const second = makeToast();

    vi.advanceTimersByTime(first.timeRemaining + 1);

    expect(() => uiManager.dismissAllToasts()).not.toThrow();
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(first.teardown).toHaveBeenCalledTimes(1);
    expect(second.teardown).toHaveBeenCalledTimes(1);
    expect(internals.activeToastList_).toHaveLength(0);
  });

  it('removes an auto-expired toast from the active list', () => {
    const toast = makeToast();

    expect(internals.activeToastList_).toContain(toast);
    vi.advanceTimersByTime(toast.timeRemaining + 1);
    expect(internals.activeToastList_).not.toContain(toast);
  });

  it('never lets a synchronous library teardown throw reach the caller', () => {
    const toast = makeToast();

    // Simulate a future library regression: even the first dismiss blows up synchronously.
    toast.teardown.mockImplementation(() => {
      throw new TypeError("Cannot read properties of null (reading 'remove')");
    });

    expect(() => toast.el.dispatchEvent(new MouseEvent('click'))).not.toThrow();
    expect(internals.activeToastList_).not.toContain(toast);
  });
});

describe('UiManager toast duration and click-through', () => {
  const duration = (text: string, type: ToastMsgType, isLong: boolean): number =>
    (UiManager as unknown as { toastDuration_: (t: string, ty: ToastMsgType, l: boolean) => number }).toastDuration_(text, type, isLong);

  it('keeps the 100 s timer for long critical and error toasts', () => {
    expect(duration('Something broke', ToastMsgType.critical, true)).toBe(100000);
    expect(duration('Something broke', ToastMsgType.error, true)).toBe(100000);
  });

  it('auto-dismisses long caution, serious, standby and normal toasts within 20 s', () => {
    const capMsg = 'Showing the top 100 of 101 conjunctions (highest Pc first); raise Max Results to see the rest';

    for (const type of [ToastMsgType.caution, ToastMsgType.serious, ToastMsgType.standby, ToastMsgType.normal]) {
      const ms = duration(capMsg, type, true);

      expect(ms).toBeGreaterThanOrEqual(8000);
      expect(ms).toBeLessThanOrEqual(20000);
    }
  });

  it('keeps the 4 to 12 s window for short toasts', () => {
    expect(duration('Hi', ToastMsgType.normal, false)).toBe(4000);
    expect(duration('x'.repeat(500), ToastMsgType.caution, false)).toBe(12000);
  });

  it('lets clicks pass through the toast container but not the toast card', () => {
    const container = document.createElement('div');
    const toastEl = document.createElement('div');

    container.appendChild(toastEl);
    (UiManager as unknown as { makeToastClickThrough_: (el: HTMLElement) => void }).makeToastClickThrough_(toastEl);

    expect(container.style.pointerEvents).toBe('none');
    expect(toastEl.style.pointerEvents).toBe('auto');
  });
});
