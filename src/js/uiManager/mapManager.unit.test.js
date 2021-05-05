/* eslint-disable no-undefined */
/*globals
  test
  expect
*/

import { mapManager } from '@app/js/uiManager/mapManager.js';

test(`mapManager Unit Tests`, () => {
  mapManager.braun(
    {
      lat: 41,
      lon: -71,
    },
    { meridian: 0 }
  );

  mapManager.braun(
    {
      point: {
        x: 0.5,
        y: 0.5,
      },
      lat: 41,
      lon: -71,
    },
    { meridian: 0, latLimit: 50 }
  );

  mapManager.braun(
    {
      x: 0.5,
      y: 0.5,
    },
    { meridian: 0, latLimit: 50 }
  );

  mapManager.braun(
    {
      x: 0.5,
      y: 0.5,
    },
    { meridian: 10, latLimit: 50 }
  );

  mapManager.options();

  expect(() => mapManager.braun({}, { meridian: 0, latLimit: 50 })).toThrow('Invalid input point.');
});
