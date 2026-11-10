/**
 * Validates an object id taken from a worker message before it is used to index a worker's object cache.
 *
 * Message data is untrusted input: without this check a key such as "__proto__" or "constructor" could
 * reach a property write on the cache (prototype pollution). Only integers in [0, length) pass, and the
 * result is a new number derived from the input rather than the input itself.
 * @param id - The id from the message
 * @param length - The current cache length
 * @returns The index to use, or null when the id is not a valid index
 */
export const toCacheIndex = (id: unknown, length: number): number | null => {
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 0 || id >= length) {
    return null;
  }

  return Math.trunc(id);
};
