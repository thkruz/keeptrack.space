/*!
SunCalc is a JavaScript library for calculating sun/moon position and light phases.
https://github.com/mourner/suncalc

Original Copyright (c) 2011-2015, Vladimir Agafonkin
ES2019 Modifications Copyright (c) 2020, Theoodre Kruczek
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas
*/

import { DEG2RAD, TAU } from './constants';

export const SunCalc = {
  MILLISECONDS_IN_A_DAY: 1000 * 60 * 60 * 24,
  J1970: 2440588,
  J2000: 2451545,
  J0: 0.0009, // calculations for sun times
  // Make some variables we can reusue a bunch
  lw: null,
  phi: null,
  d: null,
  H: null,
  h: null,

  // sun times configuration (angle, morning name, evening name)
  times: [
    [-0.833, 'sunrise', 'sunset'],
    [-0.3, 'sunriseEnd', 'sunsetStart'],
    [-6, 'dawn', 'dusk'],
    [-12, 'nauticalDawn', 'nauticalDusk'],
    [-18, 'nightEnd', 'night'],
    [6, 'goldenHourEnd', 'goldenHour'],
  ],
  toJulian: (date) => date.valueOf() / SunCalc.MILLISECONDS_IN_A_DAY - 0.5 + SunCalc.J1970,
  fromJulian: (j) => new Date((j + 0.5 - SunCalc.J1970) * SunCalc.MILLISECONDS_IN_A_DAY),
  toDays(date) {
    return SunCalc.toJulian(date) - SunCalc.J2000;
  },
  e: (TAU / 360) * 23.4397, // obliquity of the Earth
  rightAscension: (l, b) => Math.atan2(Math.sin(l) * Math.cos(SunCalc.e) - Math.tan(b) * Math.sin(SunCalc.e), Math.cos(l)),
  declination: (l, b) => Math.asin(Math.sin(b) * Math.cos(SunCalc.e) + Math.cos(b) * Math.sin(SunCalc.e) * Math.sin(l)),
  azimuth: (H, phi, dec) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)),
  altitude: (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)),
  siderealTime: (d, lw) => (TAU / 360) * (280.16 + 360.9856235 * d) - lw,
  astroRefraction: (h) => {
    if (h < 0)
      // the following formula works for positive altitudes only.
      h = 0; // if h = -0.08901179 a div/0 would occur.

    // formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
    // 1.02 / Math.tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to TAU / 360:
    return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
  },
  // general sun calculations
  solarMeanAnomaly: (d) => (TAU / 360) * (357.5291 + 0.98560028 * d),
  eclipticLongitude: (M) => {
    var C = (TAU / 360) * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)), // equation of center
      P = (TAU / 360) * 102.9372; // perihelion of the Earth

    return M + C + P + TAU / 2;
  },
  sunCoords: (d) => {
    var M = SunCalc.solarMeanAnomaly(d),
      L = SunCalc.eclipticLongitude(M);

    return {
      dec: SunCalc.declination(L, 0),
      ra: SunCalc.rightAscension(L, 0),
    };
  },
  julianCycle: (d, lw) => Math.round(d - SunCalc.J0 - lw / ((2 * TAU) / 2)),
  approxTransit: (Ht, lw, n) => SunCalc.J0 + (Ht + lw) / ((2 * TAU) / 2) + n,
  solarTransitJ: (ds, M, L) => SunCalc.J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L),
  hourAngle: (h, phi, d) => Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d))),
  // returns set time for the given sun altitude
  getSetJ: (h, lw, phi, dec, n, M, L) => {
    var w = SunCalc.hourAngle(h, phi, dec),
      a = SunCalc.approxTransit(w, lw, n);
    return SunCalc.solarTransitJ(a, M, L);
  },
  moonCoords: (d) => {
    // geocentric ecliptic coordinates of the moon

    var L = (TAU / 360) * (218.316 + 13.176396 * d), // ecliptic longitude
      M = (TAU / 360) * (134.963 + 13.064993 * d), // mean anomaly
      F = (TAU / 360) * (93.272 + 13.22935 * d), // mean distance
      l = L + (TAU / 360) * 6.289 * Math.sin(M), // longitude
      b = (TAU / 360) * 5.128 * Math.sin(F), // latitude
      dt = 385001 - 20905 * Math.cos(M); // distance to the moon in km

    return {
      ra: SunCalc.rightAscension(l, b),
      dec: SunCalc.declination(l, b),
      dist: dt,
    };
  },
  hoursLater: (date, h) => new Date(date.valueOf() + (h * SunCalc.MILLISECONDS_IN_A_DAY) / 24),
  getStarPosition: (date, lat, lng, c) => {
    SunCalc.lw = DEG2RAD * -lng;
    SunCalc.phi = DEG2RAD * lat;
    SunCalc.d = SunCalc.toDays(date);
    SunCalc.H = SunCalc.siderealTime(SunCalc.d, SunCalc.lw) - (c.ra / 12) * Math.PI;
    SunCalc.h = SunCalc.altitude(SunCalc.H, SunCalc.phi, (c.dec / 180) * Math.PI);

    SunCalc.h += SunCalc.astroRefraction(SunCalc.h); // altitude correction for refraction

    return {
      azimuth: SunCalc.azimuth(SunCalc.H, SunCalc.phi, (c.dec / 180) * Math.PI),
      altitude: SunCalc.h,
      vmag: c.vmag,
      name: c.name,
      pname: c.pname,
      dist: c.dist,
    };
  },
  // calculates sun position for a given date and latitude/longitude
  getSunPosition: (date, lat, lng) => {
    var lw = (TAU / 360) * -lng,
      phi = (TAU / 360) * lat,
      d = SunCalc.toDays(date),
      c = SunCalc.sunCoords(d),
      H = SunCalc.siderealTime(d, lw) - c.ra;

    return {
      azimuth: SunCalc.azimuth(H, phi, c.dec),
      altitude: SunCalc.altitude(H, phi, c.dec),
    };
  },
  // adds a custom time to the times config
  addTime: (angle, riseName, setName) => {
    SunCalc.times.push([angle, riseName, setName]);
  },
  // calculates sun times for a given date and latitude/longitude
  getTimes: (date, lat, lng) => {
    var lw = (TAU / 360) * -lng,
      phi = (TAU / 360) * lat,
      d = SunCalc.toDays(date),
      n = SunCalc.julianCycle(d, lw),
      ds = SunCalc.approxTransit(0, lw, n),
      M = SunCalc.solarMeanAnomaly(ds),
      L = SunCalc.eclipticLongitude(M),
      dec = SunCalc.declination(L, 0),
      Jnoon = SunCalc.solarTransitJ(ds, M, L),
      i,
      len,
      time,
      Jset,
      Jrise;

    var result = {
      solarNoon: SunCalc.fromJulian(Jnoon),
      nadir: SunCalc.fromJulian(Jnoon - 0.5),
    };

    for (i = 0, len = SunCalc.times.length; i < len; i += 1) {
      time = SunCalc.times[i];

      Jset = SunCalc.getSetJ((time[0] * TAU) / 360, lw, phi, dec, n, M, L);
      Jrise = Jnoon - (Jset - Jnoon);

      result[time[1]] = SunCalc.fromJulian(Jrise);
      result[time[2]] = SunCalc.fromJulian(Jset);
    }

    return result;
  },
  // moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas
  getMoonPosition: (date, lat, lng) => {
    var lw = (TAU / 360) * -lng,
      phi = (TAU / 360) * lat,
      d = SunCalc.toDays(date),
      c = SunCalc.moonCoords(d),
      H = SunCalc.siderealTime(d, lw) - c.ra,
      h = SunCalc.altitude(H, phi, c.dec),
      // formula 14.1 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
      pa = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(c.dec) - Math.sin(c.dec) * Math.cos(H));

    h = h + SunCalc.astroRefraction(h); // altitude correction for refraction

    return {
      azimuth: SunCalc.azimuth(H, phi, c.dec),
      altitude: h,
      distance: c.dist,
      parallacticAngle: pa,
    };
  },
  // calculations for illumination parameters of the moon,
  // based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
  // Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
  getMoonIllumination: (date) => {
    var d = SunCalc.toDays(date || new Date()),
      s = SunCalc.sunCoords(d),
      m = SunCalc.moonCoords(d),
      sdist = 149598000, // distance from Earth to Sun in km
      phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)),
      inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi)),
      angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));

    return {
      fraction: (1 + Math.cos(inc)) / 2,
      phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / TAU / 2,
      angle: angle,
    };
  },
  // calculations for moon rise/set times are based on http://www.stargazing.net/kepler/moonrise.html article
  getMoonTimes: (date, lat, lng, inUTC) => {
    var t = new Date(date);
    if (inUTC) t.setUTCHours(0, 0, 0, 0);
    else t.setHours(0, 0, 0, 0);

    var hc = (0.133 * TAU) / 360,
      h0 = SunCalc.getMoonPosition(t, lat, lng).altitude - hc,
      h1,
      h2,
      rise,
      set,
      a,
      b,
      xe,
      ye,
      d,
      roots,
      x1,
      x2,
      dx;

    // go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
    for (var i = 1; i <= 24; i += 2) {
      h1 = SunCalc.getMoonPosition(SunCalc.hoursLater(t, i), lat, lng).altitude - hc;
      h2 = SunCalc.getMoonPosition(SunCalc.hoursLater(t, i + 1), lat, lng).altitude - hc;

      a = (h0 + h2) / 2 - h1;
      b = (h2 - h0) / 2;
      xe = -b / (2 * a);
      ye = (a * xe + b) * xe + h1;
      d = b * b - 4 * a * h1;
      roots = 0;

      if (d >= 0) {
        dx = Math.sqrt(d) / (Math.abs(a) * 2);
        x1 = xe - dx;
        x2 = xe + dx;
        if (Math.abs(x1) <= 1) roots++;
        if (Math.abs(x2) <= 1) roots++;
        if (x1 < -1) x1 = x2;
      }

      if (roots === 1) {
        if (h0 < 0) rise = i + x1;
        else set = i + x1;
      } else if (roots === 2) {
        rise = i + (ye < 0 ? x2 : x1);
        set = i + (ye < 0 ? x1 : x2);
      }

      if (rise && set) break;

      h0 = h2;
    }

    var result = {};

    if (rise) result.rise = SunCalc.hoursLater(t, rise);
    if (set) result.set = SunCalc.hoursLater(t, set);

    if (!rise && !set) result[ye > 0 ? 'alwaysUp' : 'alwaysDown'] = true;

    return result;
  },
};
