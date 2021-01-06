/**
 * Used to replace jQuery Functions with Standard JS
 */

class jQAlt {
  static docReady(fn) {
    // see if DOM is already available
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      // call on next available tick
      setTimeout(fn, 1);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
}

export { jQAlt };
