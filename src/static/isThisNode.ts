/**
 * Checks if the current environment is Node.js.
 * @returns {boolean} Returns true if the current environment is Node.js, false otherwise.
 */
export const isThisNode = () => {
  const nodeName = (typeof process !== 'undefined' && process?.release?.name) || false;


  return !!nodeName;
};
