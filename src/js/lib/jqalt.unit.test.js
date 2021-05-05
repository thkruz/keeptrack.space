/* eslint-disable no-undefined */
/*globals
  test
*/

import { jQAlt } from '@app/js/lib/jqalt.js';

Object.defineProperty(document, 'readyState', {
  set: function (value) {
    this.state = value;
  },
  get() {
    return this.state;
  },
});

test('jQAlt Unit Tests', () => {
  document.readyState = 'loading';
  jQAlt.docReady(() => {});
  document.readyState = 'complete';
  jQAlt.docReady(() => {});
  document.readyState = 'interactive';
  jQAlt.docReady(() => {});
});
