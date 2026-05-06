import './asyncIndicator.css';

/**
 * Non-blocking async indicator: a small ring spinner that fades in
 * under the top bar while an async action is in flight.
 *
 * Show/hide are reference-counted so concurrent callers stack
 * correctly — the spinner stays visible until the last `hide()`.
 *
 * Usage:
 *   showAsyncIndicator();
 *   try { ... } finally { hideAsyncIndicator(); }
 *
 * Or with the wrapper that handles try/finally for you:
 *   await withAsyncIndicator(fetch(url));
 */

const ELEMENT_ID = 'async-indicator';
const ACTIVE_CLASS = 'async-indicator--active';

let activeCount_ = 0;
let element_: HTMLElement | null = null;

const ensureElement_ = (label: string): HTMLElement => {
  if (element_?.isConnected) {
    element_.setAttribute('aria-label', label);

    return element_;
  }

  const el = document.createElement('div');

  el.id = ELEMENT_ID;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-label', label);
  document.body.appendChild(el);
  element_ = el;

  return el;
};

/**
 * Show the async indicator. Increments an internal counter — pair every
 * call with exactly one `hideAsyncIndicator()` (typically in a `finally`).
 *
 * @param label Optional aria-label describing the action (defaults to "Loading…").
 */
export const showAsyncIndicator = (label = 'Loading…'): void => {
  activeCount_++;
  ensureElement_(label).classList.add(ACTIVE_CLASS);
};

/**
 * Hide the async indicator. Decrements the internal counter; the spinner
 * only fades out once every paired `showAsyncIndicator()` has been hidden.
 */
export const hideAsyncIndicator = (): void => {
  if (activeCount_ === 0) {
    return;
  }
  activeCount_--;
  if (activeCount_ === 0) {
    element_?.classList.remove(ACTIVE_CLASS);
  }
};

/**
 * Convenience wrapper: shows the indicator, awaits the promise, hides
 * the indicator on success or failure, and re-throws any rejection.
 */
export const withAsyncIndicator = async <T>(promise: Promise<T>, label?: string): Promise<T> => {
  showAsyncIndicator(label);
  try {
    return await promise;
  } finally {
    hideAsyncIndicator();
  }
};

/**
 * Test-only helper to reset internal state between specs.
 */
export const resetAsyncIndicatorForTests = (): void => {
  activeCount_ = 0;
  if (element_?.isConnected) {
    element_.remove();
  }
  element_ = null;
};
