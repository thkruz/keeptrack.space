/*globals
  test
  expect
*/

import { keepTrackApi } from './externalApi';

test(`keepTrackApi Unit Testing`, () => {
  expect(() => {
    keepTrackApi.register({
      method: 'test',
      cbName: 'test',
      cb: () => console.log('test'),
    });
  }).toThrow(Error);

  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  expect(() => {
    keepTrackApi.unregister({ method: 'test', cbName: 'test' });
  }).toThrow(Error);

  expect(() => {
    keepTrackApi.unregister({ method: 'selectSatData', cbName: 'test2' });
  }).toThrow(Error);

  keepTrackApi.unregister({ method: 'selectSatData', cbName: 'test' });
});
