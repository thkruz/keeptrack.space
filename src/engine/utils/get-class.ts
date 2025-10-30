import { KeepTrack } from '@app/keeptrack';

/**
 * Retrieves an array of HTMLElements with the specified class name.
 *
 * Do not include the . in the class name.
 *
 */
export const getClass = (id: string): HTMLElement[] => {
  const els = Array.from(KeepTrack.getInstance().containerRoot.querySelectorAll(`.${id}`));

  if (els.length) {
    return els as HTMLElement[];
  }

  /*
   * if (isThisNode()) {
   *   // Create an empty DIV and send that back
   *   // TODO - This is a hack. Tests should provide the right environment.
   *   const el = document.createElement('div');
   *   el.id = id;
   *   KeepTrack.getInstance().containerRoot.appendChild(el);
   *   return [<HTMLElement>(<unknown>el)];
   * }
   */
  return [];
  // throw new Error(`Element with class ${id} not found!`);
};
