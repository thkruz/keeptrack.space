/**
 *
 * @param {string} str Input string
 * @param {number} num Maximum length of the string
 * @returns {string} Trunicated string
 */

export const truncateString = (str: string, num: number): string => {
  if (!str) {
    return 'Unknown';
  }

  /*
   * If the length of str is less than or equal to num
   * just return str--don't truncate it.
   */
  if (str.length <= num) {
    return str;
  }
  // Return str truncated with '...' concatenated to the end of str.

  return `${str.slice(0, num)}...`;
};
