import { isThisNode } from '../static/isThisNode';

/**
 * Returns the HTML element with the specified ID. If the element is not found, it returns null.
 * If `isExpectedMissing` is set to `true`, it will not throw an error if the element is not found.
 * If `isExpectedMissing` is set to `false` (default), it will throw an error if the element is not found.
 * @param id - The ID of the HTML element to retrieve.
 * @param isExpectedMissing - Whether or not the element is expected to be missing.
 * @returns The HTML element with the specified ID, or null if it is not found.
 * @throws An error if the element is not found and `isExpectedMissing` is set to `false`.
 */
export const getEl = (id: string, isExpectedMissing = false): HTMLElement => {
  const el = document.getElementById(id);
  if (el) return el;
  // if (isThisNode()) {
  //     // Create an empty DIV and send that back
  //     // TODO - This is a hack. Tests should provide the right environment.
  //     const _el = document.createElement('div');
  //     _el.id = id;
  //     document.body.appendChild(_el);
  //     return <HTMLElement>(<unknown>_el);
  // }

  // Return an empty div to avoid errors
  if (isThisNode() && !isExpectedMissing) {
    // console.warn(document.body.innerHTML);
    throw new Error(`Element with id ${id} not found!`);
  }
  return null;
  // DEBUG: Use this code for finding bad requests
};

/**
 * Shows the element with the specified ID by setting its display style to 'block'.
 * @param id - The ID of the element to show.
 */
export const showEl = (id: string) => {
  const el = getEl(id, true);
  if (el) el.style.display = 'block';
};

/**
 * Hides the element with the specified ID.
 * @param id - The ID of the element to hide.
 */
export const hideEl = (id: string) => {
  const el = getEl(id, true);
  if (el) el.style.display = 'none';
};
