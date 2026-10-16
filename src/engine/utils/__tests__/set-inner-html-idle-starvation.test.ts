import { IDLE_WRITE_TIMEOUT_MS, requestIdleWrite, setInnerHtml } from '@app/engine/utils/get-el';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression: a render loop that saturates the main thread (headless Chromium,
 * software GL, a slow GPU, a remote desktop session) never yields an idle period.
 * `requestIdleCallback` without a `timeout` then never fires, and every
 * setInnerHtml() write is lost: the sat-info-box kept its placeholder markup
 * ("This is a title", "xxxx-xxxA", "99999", "xxx km") after selecting a satellite.
 */
describe('setInnerHtml under idle starvation', () => {
  const originalRic = globalThis.requestIdleCallback;

  /**
   * Mirrors browser behavior with zero idle time: the callback only ever runs
   * when its `timeout` expires; without one it is queued forever.
   */
  const starvedRequestIdleCallback = (cb: IdleRequestCallback, opts?: IdleRequestOptions): number => {
    if (typeof opts?.timeout !== 'number') {
      return 0;
    }

    return setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), opts.timeout) as unknown as number;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="sat-info-title-name">This is a title</div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.requestIdleCallback = originalRic;
    document.body.innerHTML = '';
  });

  it('still writes the element when the browser never goes idle', () => {
    globalThis.requestIdleCallback = starvedRequestIdleCallback as typeof requestIdleCallback;

    setInnerHtml('sat-info-title-name', 'LANDSAT 8');
    vi.advanceTimersByTime(IDLE_WRITE_TIMEOUT_MS);

    expect(document.getElementById('sat-info-title-name')!.innerHTML).toBe('LANDSAT 8');
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback = undefined;
    const cb = vi.fn();

    expect(() => requestIdleWrite(cb)).not.toThrow();
    vi.advanceTimersByTime(0);

    expect(cb).toHaveBeenCalledTimes(1);
  });
});
