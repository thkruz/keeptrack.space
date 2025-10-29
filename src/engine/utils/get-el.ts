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

export const setInnerHtml = (id: string, html: string) => {
  requestIdleCallback(() => {
    const el = getEl(id);

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
