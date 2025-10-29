import { keepTrackApi } from '@app/keepTrackApi';

/**
 * Retrieves an array of HTMLElements with the specified class name.
 *
 * Do not include the . in the class name.
 *
 */
export const getClass = (id: string): HTMLElement[] => {
  const els = Array.from(keepTrackApi.containerRoot.querySelectorAll(`.${id}`));

  if (els.length) {
    return els as HTMLElement[];
  }

  /*
   * if (isThisNode()) {
   *   // Create an empty DIV and send that back
   *   // TODO - This is a hack. Tests should provide the right environment.
   *   const el = document.createElement('div');
   *   el.id = id;
   *   keepTrackApi.containerRoot.appendChild(el);
   *   return [<HTMLElement>(<unknown>el)];
   * }
   */
  return [];
  // throw new Error(`Element with class ${id} not found!`);
};
