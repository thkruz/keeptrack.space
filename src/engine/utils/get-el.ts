import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { isThisNode } from './isThisNode';

/**
 * Returns the HTML element with the specified ID. If the element is not found, it returns null.
 * If `isExpectedMissing` is set to `true`, it will not throw an error if the element is not found.
 * If `isExpectedMissing` is set to `false` (default), it will throw an error if the element is not found.
 * @param id - The ID of the HTML element to retrieve.
 * @param isExpectedMissing - Whether or not the element is expected to be missing.
 * @returns The HTML element with the specified ID, or null if it is not found.
 * @throws An error if the element is not found and `isExpectedMissing` is set to `false`.
 */
export const getEl = (id: string, isExpectedMissing = false): HTMLElement | null => {
  const el = document.getElementById(id);

  if (el) {
    return el;
  }

  // Return an empty div to avoid errors
  if (isThisNode() && !isExpectedMissing) {
    throw new Error(`Element with id '${id}' not found!`);
  }

  return null;
  // DEBUG: Use this code for finding bad requests
};

/**
 * Upper bound (ms) on how long a deferred DOM write may wait for an idle period.
 *
 * Without a deadline, `requestIdleCallback` only fires when the browser finds idle
 * time between frames. A render loop that saturates the main thread (slow GPU,
 * software rendering, a remote desktop session, headless Chromium) never yields any,
 * so the write is starved forever and the UI keeps its placeholder markup.
 */
export const IDLE_WRITE_TIMEOUT_MS = 100;

/**
 * Run `cb` during the next idle period, but no later than {@link IDLE_WRITE_TIMEOUT_MS}.
 * Falls back to `setTimeout` where `requestIdleCallback` is unavailable (Safari).
 */
export const requestIdleWrite = (cb: () => void): void => {
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(cb, { timeout: IDLE_WRITE_TIMEOUT_MS });

    return;
  }

  setTimeout(cb, 0);
};

export const setInnerHtml = (id: string, html: string) => {
  requestIdleWrite(() => {
    const el = getEl(id, true);

    if (!el) {
      errorManagerInstance.debug(`Element with id ${id} not found!`);

      return;
    }
    el.innerHTML = html;
  });
};

/**
 * Shows the element with the specified ID by changing its display style.
 * @param id - The ID of the element to show.
 * @param value - The value to set for the display style (default: 'block').
 */
export const showEl = (id: string | HTMLElement, value = 'block') => {
  if (typeof id === 'object') {
    id.style.display = value;

    return;
  }

  const el = getEl(id, true);

  if (el) {
    el.style.display = value;
  }
};

/**
 * Hides the element with the specified ID.
 * @param id - The ID of the element to hide.
 */
export const hideEl = (id: string | HTMLElement) => {
  if (typeof id === 'object') {
    id.style.display = 'none';

    return;
  }

  if (typeof id === 'string') {
    const el = getEl(id, true);

    if (el) {
      el.style.display = 'none';
    }

    return;
  }

  errorManagerInstance.debug(`Element with id ${id} not found!`);
};
