/* eslint-disable no-undefined */
/*globals
  test
*/

import { SunCalc } from '@app/js/lib/suncalc.js';

test('sunCalc Unit Tests', () => {
  let dateObj = new Date();
  SunCalc.fromJulian(SunCalc.toJulian(dateObj));

  SunCalc.toDays(dateObj);

  SunCalc.getMoonIllumination();

  let d = SunCalc.toDays(dateObj);
  let c = SunCalc.sunCoords(d);
  SunCalc.getStarPosition(dateObj, 0, 0, c);

  SunCalc.getSunPosition(dateObj, 0, 0);

  SunCalc.getTimes(dateObj, 0, 0);

  SunCalc.getMoonPosition(dateObj, 0, 0);

  SunCalc.getMoonTimes(dateObj, 0, 0, true);
  SunCalc.getMoonTimes(dateObj, -10, -10, false);

  SunCalc.addTime(0.1, 'Early', 'Early Time');
});
