/* eslint-disable */
// @ts-nocheck

/*!
 Copyright (c) 2016 Fabio Soldati, www.peakfinder.org
 Copyright (c) 2025 Kruczek Labs LLC
 License MIT: http://www.opensource.org/licenses/MIT
*/

export interface Meuusjs {
  EclCoord: (a: string | number, b: string | number, c: any) => void;
  Math: any;
  EclCoordfromWgs84: (a: number, b: number, c: any) => any;
  EqCoord: (a: string | number, b: string | number) => void;
  HzCoord: (a: string | number, b: string | number) => void;
  Coord: {
    dmsToDeg: (a: any, b: number, c: number, d: number) => number;
    calcAngle: (a: any, b: any, c: any, d: any) => number;
    calcRA: (a: any, b: any, c: any) => number;
    secondsToHMSStr: (a: string | number) => string;
    secondsToHMStr: (a: string | number) => string;
    eqToEcl: (a: { ra: number; dec: number }, b: number) => any;
    eclToEq: (a: number, b: number) => any;
    eqToHz: (a: number, b: number, c: number) => any;
  };
  DeltaT: {
    jdToJde: (a: number, b: number) => number;
    jdeToJd: (a: number, b: number) => number;
    decimalYear: (a: { y: number; m: number }) => number;
    estimate: (a: { (arg0: number, arg1: number): number; (x: number, y: number): number }) => number;
  };
  JulianDay: any;
  Globe: { Er: number; Fl: number; parallaxConstants: (a: number, b: number) => { rhoslat: number; rhoclat: number } };
  Interp: {
    newLen3: (
      a: number,
      b: number,
      c: string | any[]
    ) => { x1: number; x3: number; y: string | any[]; a: number; b: number; c: number; abSum: number; xSum: number; xDiff: number };
    interpolateX: (a: { xSum: number; xDiff: number }, b: number) => any;
    interpolateN: (a: { y: number[]; abSum: number; c: number }, b: number) => number;
  };
  J2000: any;
  JulianCentury: number;
  Moon: {
    parallax: (a: number) => number;
    apparentEquatorial: (a: any) => { eq: any; delta: any };
    apparentTopocentric: (a: any, b: { lat: any; h: any; lng: any }, c: any) => { eq: any; delta: any };
    topocentricPosition: (
      a: { eq: { ra: any; dec: any }; delta: any },
      b: { lat: any; lng: any },
      c: boolean
    ) => { hz: any; eq: { ra: any; dec: any }; delta: any; q: { lat: any; lng: any } };
    approxTransit: (a: { startOfDay: () => any }, b: any) => any;
    approxTimes: (a: { startOfDay: () => any }, b: any) => any;
    times: (a: { startOfDay: () => any; jd: number; deltaT: any }, b: any) => any;
    parallacticAngle: (a: number, b: number, c: number) => number;
    geocentricPosition: (a: number) => { lng: any; lat: number; delta: number };
    ta: number[][];
    tb: number[][];
  };
  Nutation: any;
  Sidereal: any;
  Parallax: any;
  Refraction: any;
  Rise: any;
  MoonIllum: {
    phaseAngleEq: (a: number, b: number, c: any, d: number) => number;
    phaseAngleEq2: (a: any, b: any) => number;
    illuminated: (a: number) => number;
    positionAngle: (a: { ra: number; dec: number }, b: { dec: number; ra: number }) => number;
    _coselong: (a: { dec: number; ra: number }, b: { dec: number; ra: number }) => number;
  };
  Solar: {
    earthsunDelta: number;
    apparentEquatorial: (a: number) => any;
    apparentTopocentric: (a: any, b: { lat: any; h: any; lng: any }, c: any) => any;
    topocentricPosition: (a: any, b: { alt: any }, c: boolean) => { hz: { alt: any }; eq: any };
    approxTransit: (a: { startOfDay: () => any }, b: any) => any;
    approxTimes: (a: { startOfDay: () => any }, b: any) => any;
    times: (a: { startOfDay: () => any; jd: number; deltaT: any }, b: any) => any;
    meanAnomaly: (a: any) => number;
    trueLongitude: (a: number) => { s: any; v: any };
    apparentLongitude: (a: any, b: number) => number;
    node: (a: number) => number;
  };
  Solistice: {
    march: (a: number) => any;
    june: (a: number) => any;
    september: (a: number) => any;
    december: (a: number) => any;
    _eq: (a: number, b: number) => number;
    mc0: number[];
    jc0: number[];
    sc0: number[];
    dc0: number[];
    mc2: number[];
    jc2: number[];
    sc2: number[];
    dc2: number[];
    terms: number[][];
  };
}

const A = <Meuusjs>(<unknown>{
  JMod: 2400000.5,
  J2000: 2451545,
  J1900: 2415020,
  B1900: 2415020.3135,
  B1950: 2433282.4235,
  JulianYear: 365.25,
  JulianCentury: 36525,
  BesselianYear: 365.2421988,
  AU: 149597870,
});
A.EclCoord = function (a: number, b: number, c: number): void {
  if (isNaN(a) || isNaN(b)) throw Error('Invalid EclCoord object: (' + a + ', ' + b + ')');
  this.lat = a;
  this.lng = b;
  void 0 !== c && (this.h = c);
};
A.EclCoord.prototype = {
  toWgs84String: function () {
    return A.Math.formatNum((180 * this.lat) / Math.PI) + ', ' + A.Math.formatNum((180 * -this.lng) / Math.PI);
  },
};
A.EclCoordfromWgs84 = function (a: number, b: number, c: number): void {
  return new A.EclCoord((a * Math.PI) / 180, (-b * Math.PI) / 180, c);
};
A.EqCoord = function (a: number, b: number) {
  if (isNaN(a) || isNaN(b)) throw Error('Invalid EqCoord object: (' + a + ', ' + b + ')');
  this.ra = a;
  this.dec = b;
};
A.EqCoord.prototype = {
  toString: function () {
    return 'ra:' + A.Math.formatNum((180 * this.ra) / Math.PI) + ', dec:' + A.Math.formatNum((180 * this.dec) / Math.PI);
  },
};
A.HzCoord = function (a: string | number, b: string | number) {
  if (isNaN(a) || isNaN(b)) throw Error('Invalid HzCoord object: (' + a + ', ' + b + ')');
  this.az = a;
  this.alt = b;
};
A.HzCoord.prototype = {
  toString: function () {
    return 'azi:' + A.Math.formatNum((180 * this.az) / Math.PI) + ', alt:' + A.Math.formatNum((180 * this.alt) / Math.PI);
  },
};
A.Coord = {
  dmsToDeg: function (a: any, b: number, c: number, d: number) {
    d = (60 * (60 * b + c) + d) / 3600;
    return a ? -d : d;
  },
  calcAngle: function (a: any, b: any, c: any, d: any) {
    return (A.Coord.dmsToDeg(a, b, c, d) * Math.PI) / 180;
  },
  calcRA: function (a: any, b: any, c: any) {
    return ((A.Coord.dmsToDeg(!1, a, b, c) % 24) * 15 * Math.PI) / 180;
  },
  secondsToHMSStr: function (a: string | number) {
    var b = Math.floor(a / 86400);
    a = A.Math.pMod(a, 86400);
    var c = Math.floor(a / 3600) % 24,
      d = Math.floor(a / 60) % 60;
    a = Math.floor(a % 60);
    return (0 !== b ? b + 'd ' : '') + (10 > c ? '0' : '') + c + ':' + (10 > d ? '0' : '') + d + ':' + (10 > a ? '0' : '') + a;
  },
  secondsToHMStr: function (a: string | number) {
    var b = Math.floor(a / 86400);
    a = A.Math.pMod(a, 86400);
    var c = Math.floor(a / 3600) % 24;
    a = Math.floor(a / 60) % 60;
    return (0 !== b ? b + 'd ' : '') + (10 > c ? '0' : '') + c + ':' + (10 > a ? '0' : '') + a;
  },
  eqToEcl: function (a: { ra: number; dec: number }, b: number) {
    var c = Math.sin(a.ra),
      d = Math.sin(a.dec),
      e = Math.cos(a.dec),
      f = Math.sin(b);
    b = Math.cos(b);
    return new A.EclCoord(Math.atan2(c * b + (d / e) * f, Math.cos(a.ra)), Math.asin(d * b - e * f * c));
  },
  eclToEq: function (a: { lat: number; lng: number }, b: number) {
    var c = Math.sin(a.lat),
      d = Math.sin(a.lng),
      e = Math.cos(a.lng),
      f = Math.sin(b);
    b = Math.cos(b);
    let a2 = Math.atan2(c * b - (d / e) * f, Math.cos(a.lat));
    0 > a2 && (a2 += 2 * Math.PI);
    return new A.EqCoord(a2, Math.asin(d * b + e * f * c));
  },
  eqToHz: function (a: number, b: number, c: number) {
    c = c - b.lng - a.ra;
    var d = Math.cos(c),
      e = Math.sin(b.lat);
    b = Math.cos(b.lat);
    var f = Math.sin(a.dec);
    a = Math.cos(a.dec);
    return new A.HzCoord(Math.atan2(Math.sin(c), d * e - (f / a) * b), Math.asin(e * f + b * a * d));
  },
};
A.DeltaT = {
  jdToJde: function (a: number, b: number) {
    b || (b = A.DeltaT.estimate(a));
    return a + b / 86400;
  },
  jdeToJd: function (a: number, b: number) {
    b || (b = A.DeltaT.estimate(a));
    return a - b / 86400;
  },
  decimalYear: function (a: { y: number; m: number }) {
    a = A.JulianDay.jdToCalendar(a);
    return a.y + (a.m - 0.5) / 12;
  },
  estimate: function (a: { (arg0: number, arg1: number): number; (x: number, y: number): number }) {
    var b = A.DeltaT.decimalYear(a);
    a = Math.pow;
    return -500 > b
      ? -20 + 32 * a((b - 1820) / 100, 2)
      : 500 > b
        ? ((b /= 100), 10583.6 - 1014.41 * b + 33.78311 * a(b, 2) - 5.952053 * a(b, 3) - 0.1798452 * a(b, 4) + 0.022174192 * a(b, 5) + 0.0090316521 * a(b, 6))
        : 1600 > b
          ? ((b = (b - 1e3) / 100), 1574.2 - 556.01 * b + 71.23472 * a(b, 2) + 0.319781 * a(b, 3) - 0.8503463 * a(b, 4) - 0.005050998 * a(b, 5) + 0.0083572073 * a(b, 6))
          : 1700 > b
            ? ((b -= 1600), 120 - 0.9808 * b - 0.01532 * a(b, 2) + a(b, 3) / 7129)
            : 1800 > b
              ? ((b -= 1700), 8.83 + 0.1603 * b - 0.0059285 * a(b, 2) + 1.3336e-4 * a(b, 3) - a(b, 4) / 1174e3)
              : 1860 > b
                ? ((b -= 1800), 13.72 - 0.332447 * b + 0.0068612 * a(b, 2) + 0.0041116 * a(b, 3) - 3.7436e-4 * a(b, 4) + 1.21272e-5 * a(b, 5) - 1.699e-7 * a(b, 6) + 8.75e-10 * a(b, 7))
                : 1900 > b
                  ? ((b -= 1860), 7.62 + 0.5737 * b - 0.251754 * a(b, 2) + 0.01680668 * a(b, 3) - 4.473624e-4 * a(b, 4) + a(b, 5) / 233174)
                  : 1920 > b
                    ? ((b -= 1900), -2.79 + 1.494119 * b - 0.0598939 * a(b, 2) + 0.0061966 * a(b, 3) - 1.97e-4 * a(b, 4))
                    : 1941 > b
                      ? ((b -= 1920), 21.2 + 0.84493 * b - 0.0761 * a(b, 2) + 0.0020936 * a(b, 3))
                      : 1961 > b
                        ? ((b -= 1950), 29.07 + 0.407 * b - a(b, 2) / 233 + a(b, 3) / 2547)
                        : 1986 > b
                          ? ((b -= 1975), 45.45 + 1.067 * b - a(b, 2) / 260 - a(b, 3) / 718)
                          : 2005 > b
                            ? ((b -= 2e3), 63.86 + 0.3345 * b - 0.060374 * a(b, 2) + 0.0017275 * a(b, 3) + 6.51814e-4 * a(b, 4) + 2.373599e-5 * a(b, 5))
                            : 2050 > b
                              ? ((b -= 2e3), 62.92 + 0.32217 * b + 0.005589 * a(b, 2))
                              : 2150 > b
                                ? -20 + 32 * a((b - 1820) / 100, 2) - 0.5628 * (2150 - b)
                                : -20 + 32 * a((b - 1820) / 100, 2);
  },
};
A.Globe = {
  Er: 6378.14,
  Fl: 1 / 298.257,
  parallaxConstants: function (a: number, b: number) {
    b || (b = 0);
    var c = 1 - A.Globe.Fl;
    b = (0.001 * b) / A.Globe.Er;
    return { rhoslat: Math.sin(Math.atan(c * Math.tan(a))) * c + b * Math.sin(a), rhoclat: Math.cos(Math.atan(c * Math.tan(a))) + b * Math.cos(a) };
  },
};
A.Interp = {
  newLen3: function (a: number, b: number, c: string | any[]) {
    if (3 != c.length) throw 'Error not 3';
    if (b === a) throw 'Error no x range';
    var d = c[1] - c[0],
      e = c[2] - c[1];
    return { x1: a, x3: b, y: c, a: d, b: e, c: e - d, abSum: d + e, xSum: b + a, xDiff: b - a };
  },
  interpolateX: function (a: { xSum: number; xDiff: number }, b: number) {
    return A.Interp.interpolateN(a, (2 * b - a.xSum) / a.xDiff);
  },
  interpolateN: function (a: { y: number[]; abSum: number; c: number }, b: number) {
    return a.y[1] + 0.5 * b * (a.abSum + b * a.c);
  },
};
A.JulianDay = function (a: any, b: any) {
  a instanceof Date && (a = A.JulianDay.dateToJD(a));
  this.jd = a;
  this.deltaT = b ? b : A.DeltaT.estimate(this.jd);
  this.jde = A.DeltaT.jdToJde(this.jd, this.deltaT);
};
A.JulianDay.prototype = {
  toCalendar: function () {
    return A.JulianDay.jdToCalendar(this.jd);
  },
  toDate: function () {
    return A.JulianDay.jdToDate(this.jd);
  },
  jdJ2000Century: function () {
    return (this.jd - A.J2000) / A.JulianCentury;
  },
  jdeJ2000Century: function () {
    return (this.jde - A.J2000) / A.JulianCentury;
  },
  startOfDay: function () {
    return new A.JulianDay(Math.floor(this.jde - 0.5) + 0.5, this.deltaT);
  },
};
A.JulianDay.gregorianTimeStart = Date.UTC(1582, 9, 4);
A.JulianDay.jdFromGregorian = function (a: any, b: any, c: any) {
  return new A.JulianDay(A.JulianDay.jdFromGregorian(a, b, c));
};
A.JulianDay.jdFromJulian = function (a: any, b: any, c: any) {
  return new A.JulianDay(A.JulianDay.calendarJulianToJD(a, b, c));
};
A.JulianDay.jdFromJDE = function (a: number) {
  var b = A.DeltaT.estimate(a);
  a = A.DeltaT.jdeToJd(a, b);
  return new A.JulianDay(a, b);
};
A.JulianDay.dateToJD = function (a: {
  getUTCDate: () => number;
  getUTCHours: () => any;
  getUTCMinutes: () => any;
  getUTCSeconds: () => any;
  getTime: () => number;
  getUTCFullYear: () => any;
  getUTCMonth: () => number;
}) {
  var b = a.getUTCDate() + A.JulianDay.secondsFromHMS(a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds()) / 86400;
  return a.getTime() < A.JulianDay.gregorianTimeStart
    ? A.JulianDay.calendarJulianToJD(a.getUTCFullYear(), a.getUTCMonth() + 1, b)
    : A.JulianDay.calendarGregorianToJD(a.getUTCFullYear(), a.getUTCMonth() + 1, b);
};
A.JulianDay.calendarGregorianToJD = function (a: number, b: number, c: number) {
  if (1 === b || 2 === b) a--, (b += 12);
  var d = Math.floor(a / 100);
  return Math.floor((36525 * (a + 4716)) / 100) + Math.floor((306 * (b + 1)) / 10) + (2 - d + Math.floor(d / 4)) + c - 1524.5;
};
A.JulianDay.calendarJulianToJD = function (a: number, b: number, c: number) {
  if (1 === b || 2 === b) a--, (b += 12);
  return Math.floor((36525 * (a + 4716)) / 100) + Math.floor((306 * (b + 1)) / 10) + c - 1524.5;
};
A.JulianDay.secondsFromHMS = function (a: number, b: number, c: number) {
  return 3600 * a + 60 * b + c;
};
A.JulianDay.jdToDate = function (a: number) {
  var b = A.JulianDay.jdToCalendar(a);
  a = A.Math.modF(a + 0.5)[1];
  a = Math.round(86400 * a);
  return new Date(Date.UTC(b.y, b.m - 1, Math.floor(b.d), Math.floor(a / 3600) % 24, Math.floor(a / 60) % 60, Math.floor(a % 60)));
};
A.JulianDay.jdToCalendar = function (a: number | number[]) {
  a = A.Math.modF(a + 0.5);
  var b = a[0],
    c = b;
  2299151 <= b && ((c = Math.floor((100 * b - 186721625) / 3652425)), (c = b + 1 + c - Math.floor(c / 4)));
  var d = c + 1524;
  b = Math.floor((100 * d - 12210) / 36525);
  var e = Math.floor((36525 * b) / 100);
  c = Math.floor((1e4 * (d - e)) / 306001);
  a = d - e - Math.floor((306001 * c) / 1e4) + a[1];
  c = 14 === c || 15 === c ? c - 13 : c - 1;
  return { y: 1 === c || 2 === c ? Math.floor(b) - 4715 : Math.floor(b) - 4716, m: c, d: a };
};
A.JulianDay.leapYearGregorian = function (a: number) {
  return (0 === a % 4 && 0 !== a % 100) || 0 === a % 400;
};
A.JulianDay.dayOfYear = function (a: number, b: any, c: any, d: any) {
  a = 2;
  d && a--;
  return A.JulianDay._wholeMonths(b, a) + c;
};
A.JulianDay._wholeMonths = function (a: number, b: number) {
  return Math.round((275 * a) / 9 - ((a + 9) / 12) * b - 30);
};
A.Math = {
  pMod: function (a: number, b: number) {
    a %= b;
    0 > a && (a += b);
    return a;
  },
  modF: function (a: number) {
    return 0 > a ? ((a = -a), [-Math.floor(a), -(a % 1)]) : [Math.floor(a), a % 1];
  },
  horner: function (a: number, b: string | any[]) {
    var c = b.length - 1;
    if (0 >= c) throw 'empty array not supported';
    for (var d = b[c]; 0 < c;) c--, (d = d * a + b[c]);
    return d;
  },
  formatNum: function (a: number, b: number) {
    b = Math.pow(10, b | 4);
    return Math.round(a * b) / b;
  },
};
A.Moon = {
  parallax: function (a: number) {
    return Math.asin(6378.14 / a);
  },
  apparentEquatorial: function (a: any) {
    var b = A.Moon.geocentricPosition(a),
      c = A.Nutation.nutation(a);
    a = A.Nutation.meanObliquityLaskar(a) + c.deltaobliquity;
    return { eq: A.Coord.eclToEq(new A.EclCoord(b.lng + c.deltalng, b.lat), a), delta: b.delta };
  },
  apparentTopocentric: function (a: any, b: { lat: any; h: any; lng: any }, c: any) {
    var d = A.Moon.apparentEquatorial(a),
      e = A.Globe.parallaxConstants(b.lat, b.h),
      f = A.Moon.parallax(d.delta);
    c || (c = A.Sidereal.apparentInRa(a));
    return { eq: A.Parallax.topocentric(d.eq, f, e.rhoslat, e.rhoclat, b.lng, c), delta: d.delta };
  },
  topocentricPosition: function (a: { eq: { ra: any; dec: any }; delta: any }, b: { lat: any; lng: any }, c: boolean) {
    var d = A.Sidereal.apparentInRa(a);
    a = A.Moon.apparentTopocentric(a, b, d);
    var e = A.Coord.eqToHz(a.eq, b, d);
    !0 === c && (e.alt += A.Refraction.bennett2(e.alt));
    b = A.Moon.parallacticAngle(b.lat, d - (b.lng + a.eq.ra), a.eq.dec);
    return { hz: e, eq: a.eq, delta: a.delta, q: b };
  },
  approxTransit: function (a: { startOfDay: () => any }, b: any) {
    a = a.startOfDay();
    return A.Rise.approxTransit(b, A.Sidereal.apparent0UT(a), A.Moon.apparentTopocentric(a, b).eq);
  },
  approxTimes: function (a: { startOfDay: () => any }, b: any) {
    a = a.startOfDay();
    var c = A.Moon.apparentTopocentric(a, b),
      d = A.Moon.parallax(c.delta);
    d = A.Rise.stdh0Lunar(d);
    a = A.Sidereal.apparent0UT(a);
    return A.Rise.approxTimes(b, d, a, c.eq);
  },
  times: function (a: { startOfDay: () => any; jd: number; deltaT: any }, b: any) {
    a = a.startOfDay();
    var c = A.Moon.apparentTopocentric(new A.JulianDay(a.jd - 1, a.deltaT), b),
      d = A.Moon.apparentTopocentric(a, b),
      e = A.Moon.apparentTopocentric(new A.JulianDay(a.jd + 1, a.deltaT), b),
      f = A.Moon.parallax(d.delta);
    f = A.Rise.stdh0Lunar(f);
    var g = A.Sidereal.apparent0UT(a);
    return A.Rise.times(b, a.deltaT, f, g, [c.eq, d.eq, e.eq]);
  },
  parallacticAngle: function (a: number, b: number, c: number) {
    return Math.atan2(Math.sin(b), Math.tan(a) * Math.cos(c) - Math.sin(c) * Math.cos(b));
  },
  geocentricPosition: function (a: number) {
    var b = Math.PI / 180,
      c = a.jdeJ2000Century();
    a = A.Math.pMod(A.Math.horner(c, [218.3164477 * b, 481267.88123421 * b, -0.0015786 * b, b / 538841, -b / 65194e3]), 2 * Math.PI);
    var d = A.Math.pMod(A.Math.horner(c, [297.8501921 * b, 445267.1114034 * b, -0.0018819 * b, b / 545868, -b / 113065e3]), 2 * Math.PI),
      e = A.Math.pMod(A.Math.horner(c, [357.5291092 * b, 35999.0502909 * b, -1.535e-4 * b, b / 2449e4]), 2 * Math.PI),
      f = A.Math.pMod(A.Math.horner(c, [134.9633964 * b, 477198.8675055 * b, 0.0087414 * b, b / 69699, -b / 14712e3]), 2 * Math.PI),
      g = A.Math.pMod(A.Math.horner(c, [93.272095 * b, 483202.0175233 * b, -0.0036539 * b, -b / 3526e3, b / 86331e4]), 2 * Math.PI),
      l = 119.75 * b + 131.849 * b * c,
      m = 53.09 * b + 479264.29 * b * c,
      h = 313.45 * b + 481266.484 * b * c;
    c = A.Math.horner(c, [1, -0.002516, -7.4e-6]);
    var p = c * c;
    m = 3958 * Math.sin(l) + 1962 * Math.sin(a - g) + 318 * Math.sin(m);
    var n = 0;
    l = -2235 * Math.sin(a) + 382 * Math.sin(h) + 175 * Math.sin(l - g) + 175 * Math.sin(l + g) + 127 * Math.sin(a - f) - 115 * Math.sin(a + f);
    for (h = 0; h < A.Moon.ta.length; h++) {
      var k = A.Moon.ta[h];
      var r = d * k[0] + e * k[1] + f * k[2] + g * k[3],
        q = Math.sin(r);
      r = Math.cos(r);
      switch (k[1]) {
        case 0:
          m += k[4] * q;
          n += k[5] * r;
          break;
        case 1:
        case -1:
          m += k[4] * q * c;
          n += k[5] * r * c;
          break;
        case 2:
        case -2:
          m += k[4] * q * p;
          n += k[5] * r * p;
          break;
        default:
          throw 'error';
      }
    }
    for (h = 0; h < A.Moon.tb.length; h++)
      switch (((k = A.Moon.tb[h]), (q = Math.sin(d * k[0] + e * k[1] + f * k[2] + g * k[3])), k[1])) {
        case 0:
          l += k[4] * q;
          break;
        case 1:
        case -1:
          l += k[4] * q * c;
          break;
        case 2:
        case -2:
          l += k[4] * q * p;
          break;
        default:
          throw 'error';
      }
    return { lng: A.Math.pMod(a, 2 * Math.PI) + 1e-6 * m * b, lat: 1e-6 * l * b, delta: 385000.56 + 0.001 * n };
  },
  ta: [
    [0, 0, 1, 0, 6288774, -20905355],
    [2, 0, -1, 0, 1274027, -3699111],
    [2, 0, 0, 0, 658314, -2955968],
    [0, 0, 2, 0, 213618, -569925],
    [0, 1, 0, 0, -185116, 48888],
    [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158],
    [2, -1, -1, 0, 57066, -152138],
    [2, 0, 1, 0, 53322, -170733],
    [2, -1, 0, 0, 45758, -204586],
    [0, 1, -1, 0, -40923, -129620],
    [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755],
    [2, 0, 0, -2, 15327, 10321],
    [0, 0, 1, 2, -12528, 0],
    [0, 0, 1, -2, 10980, 79661],
    [4, 0, -1, 0, 10675, -34782],
    [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636],
    [2, 1, -1, 0, -7888, 24208],
    [2, 1, 0, 0, -6766, 30824],
    [1, 0, -1, 0, -5163, -8379],
    [1, 1, 0, 0, 4987, -16675],
    [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445],
    [4, 0, 0, 0, 3861, -11650],
    [2, 0, -3, 0, 3665, 14403],
    [0, 1, -2, 0, -2689, -7003],
    [2, 0, -1, 2, -2602, 0],
    [2, -1, -2, 0, 2390, 10056],
    [1, 0, 1, 0, -2348, 6322],
    [2, -2, 0, 0, 2236, -9884],
    [0, 1, 2, 0, -2120, 5751],
    [0, 2, 0, 0, -2069, 0],
    [2, -2, -1, 0, 2048, -4950],
    [2, 0, 1, -2, -1773, 4130],
    [2, 0, 0, 2, -1595, 0],
    [4, -1, -1, 0, 1215, -3958],
    [0, 0, 2, 2, -1110, 0],
    [3, 0, -1, 0, -892, 3258],
    [2, 1, 1, 0, -810, 2616],
    [4, -1, -2, 0, 759, -1897],
    [0, 2, -1, 0, -713, -2117],
    [2, 2, -1, 0, -700, 2354],
    [2, 1, -2, 0, 691, 0],
    [2, -1, 0, -2, 596, 0],
    [4, 0, 1, 0, 549, -1423],
    [0, 0, 4, 0, 537, -1117],
    [4, -1, 0, 0, 520, -1571],
    [1, 0, -2, 0, -487, -1739],
    [2, 1, 0, -2, -399, 0],
    [0, 0, 2, -2, -381, -4421],
    [1, 1, 1, 0, 351, 0],
    [3, 0, -2, 0, -340, 0],
    [4, 0, -3, 0, 330, 0],
    [2, -1, 2, 0, 327, 0],
    [0, 2, 1, 0, -323, 1165],
    [1, 1, -1, 0, 299, 0],
    [2, 0, 3, 0, 294, 0],
    [2, 0, -1, -2, 0, 8752],
  ],
  tb: [
    [0, 0, 0, 1, 5128122],
    [0, 0, 1, 1, 280602],
    [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573],
    [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266],
    [0, 0, 2, -1, 8822],
    [2, -1, 0, -1, 8216],
    [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200],
    [2, 1, 0, -1, -3359],
    [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065],
    [0, 1, -1, -1, -1870],
    [4, 0, -1, -1, 1828],
    [0, 1, 0, 1, -1794],
    [0, 0, 0, 3, -1749],
    [0, 1, -1, 1, -1565],
    [1, 0, 0, 1, -1491],
    [0, 1, 1, 1, -1475],
    [0, 1, 1, -1, -1410],
    [0, 1, 0, -1, -1344],
    [1, 0, 0, -1, -1335],
    [0, 0, 3, 1, 1107],
    [4, 0, 0, -1, 1021],
    [4, 0, -1, 1, 833],
    [0, 0, 1, -3, 777],
    [4, 0, -2, 1, 671],
    [2, 0, 0, -3, 607],
    [2, 0, 2, -1, 596],
    [2, -1, 1, -1, 491],
    [2, 0, -2, 1, -451],
    [0, 0, 3, -1, 439],
    [2, 0, 2, 1, 422],
    [2, 0, -3, -1, 421],
    [2, 1, -1, 1, -366],
    [2, 1, 0, 1, -351],
    [4, 0, 0, 1, 331],
    [2, -1, 1, 1, 315],
    [2, -2, 0, -1, 302],
    [0, 0, 1, 3, -283],
    [2, 1, 1, -1, -229],
    [1, 1, 0, -1, 223],
    [1, 1, 0, 1, 223],
    [0, 1, -2, -1, -220],
    [2, 1, -1, -1, -220],
    [1, 0, 1, 1, -185],
    [2, -1, -2, -1, 181],
    [0, 1, 2, 1, -177],
    [4, 0, -2, -1, 176],
    [4, -1, -1, -1, 166],
    [1, 0, 1, -1, -164],
    [4, 0, 1, -1, 132],
    [1, 0, -1, -1, -119],
    [4, -1, 0, -1, 115],
    [2, -2, 0, 1, 107],
  ],
};
A.MoonIllum = {
  phaseAngleEq: function (a: number, b: number, c: any, d: number) {
    a = A.MoonIllum._coselong(a, c);
    return Math.atan2(d * Math.sin(Math.acos(a)), b - d * a);
  },
  phaseAngleEq2: function (a: any, b: any) {
    return Math.acos(-A.MoonIllum._coselong(a, b));
  },
  illuminated: function (a: number) {
    return (1 + Math.cos(a)) / 2;
  },
  positionAngle: function (a: { ra: number; dec: number }, b: { dec: number; ra: number }) {
    var c = Math.cos(b.dec);
    return Math.atan2(c * Math.sin(b.ra - a.ra), Math.sin(b.dec) * Math.cos(a.dec) - c * Math.sin(a.dec) * Math.cos(b.ra - a.ra));
  },
  _coselong: function (a: { dec: number; ra: number }, b: { dec: number; ra: number }) {
    return Math.sin(b.dec) * Math.sin(a.dec) + Math.cos(b.dec) * Math.cos(a.dec) * Math.cos(b.ra - a.ra);
  },
};
A.Nutation = {
  nutation: function (a: number) {
    a = a.jdeJ2000Century();
    for (
      var b = (A.Math.horner(a, [297.85036, 445267.11148, -0.0019142, 1 / 189474]) * Math.PI) / 180,
      c = (A.Math.horner(a, [357.52772, 35999.05034, -1.603e-4, -1 / 3e5]) * Math.PI) / 180,
      d = (A.Math.horner(a, [134.96298, 477198.867398, 0.0086972, 1 / 5620]) * Math.PI) / 180,
      e = (A.Math.horner(a, [93.27191, 483202.017538, -0.0036825, 1 / 327270]) * Math.PI) / 180,
      f = (A.Math.horner(a, [125.04452, -1934.136261, 0.0020708, 1 / 45e4]) * Math.PI) / 180,
      g = 0,
      l = 0,
      m = A.Nutation.table22A.length - 1;
      0 <= m;
      m--
    ) {
      var h = A.Nutation.table22A[m],
        p = h[0] * b + h[1] * c + h[2] * d + h[3] * e + h[4] * f,
        n = Math.cos(p);
      g += Math.sin(p) * (h[5] + h[6] * a);
      l += n * (h[7] + h[8] * a);
    }
    return { deltalng: (1e-4 / 3600) * g * (Math.PI / 180), deltaobliquity: (1e-4 / 3600) * l * (Math.PI / 180) };
  },
  nutationInRA: function (a: { deltalng: number; deltaobliquity: any }) {
    var b = A.Nutation.meanObliquityLaskar(a);
    a = A.Nutation.nutation(a);
    return a.deltalng * Math.cos(b + a.deltaobliquity);
  },
  trueObliquity: function (a: { deltaobliquity: any }) {
    var b = A.Nutation.meanObliquityLaskar(a);
    a = A.Nutation.nutation(a);
    return b + a.deltaobliquity;
  },
  meanObliquity: function (a: { jdeJ2000Century: () => any }) {
    return A.Math.horner(a.jdeJ2000Century(), [
      (84381.448 / 3600) * (Math.PI / 180),
      (-46.815 / 3600) * (Math.PI / 180),
      (-5.9e-4 / 3600) * (Math.PI / 180),
      (0.001813 / 3600) * (Math.PI / 180),
    ]);
  },
  meanObliquityLaskar: function (a: { jdeJ2000Century: () => number }) {
    return A.Math.horner(0.01 * a.jdeJ2000Century(), [
      (84381.448 / 3600) * (Math.PI / 180),
      (-4680.93 / 3600) * (Math.PI / 180),
      (-1.55 / 3600) * (Math.PI / 180),
      (1999.25 / 3600) * (Math.PI / 180),
      (-51.38 / 3600) * (Math.PI / 180),
      (-249.67 / 3600) * (Math.PI / 180),
      (-39.05 / 3600) * (Math.PI / 180),
      (7.12 / 3600) * (Math.PI / 180),
      (27.87 / 3600) * (Math.PI / 180),
      (5.79 / 3600) * (Math.PI / 180),
      (2.45 / 3600) * (Math.PI / 180),
    ]);
  },
  table22A: [
    [0, 0, 0, 0, 1, -171996, -174.2, 92025, 8.9],
    [-2, 0, 0, 2, 2, -13187, -1.6, 5736, -3.1],
    [0, 0, 0, 2, 2, -2274, -0.2, 977, -0.5],
    [0, 0, 0, 0, 2, 2062, 0.2, -895, 0.5],
    [0, 1, 0, 0, 0, 1426, -3.4, 54, -0.1],
    [0, 0, 1, 0, 0, 712, 0.1, -7, 0],
    [-2, 1, 0, 2, 2, -517, 1.2, 224, -0.6],
    [0, 0, 0, 2, 1, -386, -0.4, 200, 0],
    [0, 0, 1, 2, 2, -301, 0, 129, -0.1],
    [-2, -1, 0, 2, 2, 217, -0.5, -95, 0.3],
    [-2, 0, 1, 0, 0, -158, 0, 0, 0],
    [-2, 0, 0, 2, 1, 129, 0.1, -70, 0],
    [0, 0, -1, 2, 2, 123, 0, -53, 0],
    [2, 0, 0, 0, 0, 63, 0, 0, 0],
    [0, 0, 1, 0, 1, 63, 0.1, -33, 0],
    [2, 0, -1, 2, 2, -59, 0, 26, 0],
    [0, 0, -1, 0, 1, -58, -0.1, 32, 0],
    [0, 0, 1, 2, 1, -51, 0, 27, 0],
    [-2, 0, 2, 0, 0, 48, 0, 0, 0],
    [0, 0, -2, 2, 1, 46, 0, -24, 0],
    [2, 0, 0, 2, 2, -38, 0, 16, 0],
    [0, 0, 2, 2, 2, -31, 0, 13, 0],
    [0, 0, 2, 0, 0, 29, 0, 0, 0],
    [-2, 0, 1, 2, 2, 29, 0, -12, 0],
    [0, 0, 0, 2, 0, 26, 0, 0, 0],
    [-2, 0, 0, 2, 0, -22, 0, 0, 0],
    [0, 0, -1, 2, 1, 21, 0, -10, 0],
    [0, 2, 0, 0, 0, 17, -0.1, 0, 0],
    [2, 0, -1, 0, 1, 16, 0, -8, 0],
    [-2, 2, 0, 2, 2, -16, 0.1, 7, 0],
    [0, 1, 0, 0, 1, -15, 0, 9, 0],
    [-2, 0, 1, 0, 1, -13, 0, 7, 0],
    [0, -1, 0, 0, 1, -12, 0, 6, 0],
    [0, 0, 2, -2, 0, 11, 0, 0, 0],
    [2, 0, -1, 2, 1, -10, 0, 5, 0],
    [2, 0, 1, 2, 2, -8, 0, 3, 0],
    [0, 1, 0, 2, 2, 7, 0, -3, 0],
    [-2, 1, 1, 0, 0, -7, 0, 0, 0],
    [0, -1, 0, 2, 2, -7, 0, 3, 0],
    [2, 0, 0, 2, 1, -7, 0, 3, 0],
    [2, 0, 1, 0, 0, 6, 0, 0, 0],
    [-2, 0, 2, 2, 2, 6, 0, -3, 0],
    [-2, 0, 1, 2, 1, 6, 0, -3, 0],
    [2, 0, -2, 0, 1, -6, 0, 3, 0],
    [2, 0, 0, 0, 1, -6, 0, 3, 0],
    [0, -1, 1, 0, 0, 5, 0, 0, 0],
    [-2, -1, 0, 2, 1, -5, 0, 3, 0],
    [-2, 0, 0, 0, 1, -5, 0, 3, 0],
    [0, 0, 2, 2, 1, -5, 0, 3, 0],
    [-2, 0, 2, 0, 1, 4, 0, 0, 0],
    [-2, 1, 0, 2, 1, 4, 0, 0, 0],
    [0, 0, 1, -2, 0, 4, 0, 0, 0],
    [-1, 0, 1, 0, 0, -4, 0, 0, 0],
    [-2, 1, 0, 0, 0, -4, 0, 0, 0],
    [1, 0, 0, 0, 0, -4, 0, 0, 0],
    [0, 0, 1, 2, 0, 3, 0, 0, 0],
    [0, 0, -2, 2, 2, -3, 0, 0, 0],
    [-1, -1, 1, 0, 0, -3, 0, 0, 0],
    [0, 1, 1, 0, 0, -3, 0, 0, 0],
    [0, -1, 1, 2, 2, -3, 0, 0, 0],
    [2, -1, -1, 2, 2, -3, 0, 0, 0],
    [0, 0, 3, 2, 2, -3, 0, 0, 0],
    [2, -1, 0, 2, 2, -3, 0, 0, 0],
  ],
};
A.Parallax = {
  earthsunParallax: ((8.794 / 60 / 60) * Math.PI) / 180,
  horizontal: function (a: number) {
    return ((8.794 / 60 / 60) * Math.PI) / 180 / a;
  },
  topocentric: function (a: { ra: number; dec: number }, b: number, c: number, d: number, e: number, f: number) {
    e = A.Math.pMod(f - e - a.ra, 2 * Math.PI);
    b = Math.sin(b);
    f = Math.cos(e);
    var g = Math.cos(a.dec);
    e = Math.atan2(-d * b * Math.sin(e), g - d * b * f);
    return new A.EqCoord(a.ra + e, Math.atan2((Math.sin(a.dec) - c * b) * Math.cos(e), g - d * b * f));
  },
  topocentric2: function (a: { ra: number; dec: number }, b: number, c: number, d: number, e: number, f: number) {
    e = A.Math.pMod(f - e - a.ra, 2 * Math.PI);
    f = Math.cos(a.dec);
    return new A.EqCoord(a.ra + (-b * d * Math.sin(e)) / f, a.dec + -b * (c * f - d * Math.cos(e) * Math.sin(a.dec)));
  },
};
A.Refraction = {
  bennett: function (a: number) {
    0 > a && (a = 0);
    var b = Math.PI / 180;
    return b / 60 / Math.tan(a + (7.31 * b * b) / (a + 4.4 * b));
  },
  bennett2: function (a: number) {
    var b = Math.PI / 180,
      c = 60 / b,
      d = 0.06 / c;
    c = 14.7 * c * b;
    b *= 13;
    a = A.Refraction.bennett(a);
    return a - d * Math.sin(c * a + b);
  },
  saemundsson: function (a: number) {
    var b = Math.PI / 180;
    return (1.02 * b) / 60 / Math.tan(a + (10.3 * b * b) / (a + 5.11 * b));
  },
};
A.Rise = {
  meanRefraction: (0.5667 * Math.PI) / 180,
  stdh0Stellar: (-0.5667 * Math.PI) / 180,
  stdh0Solar: (-0.8333 * Math.PI) / 180,
  stdh0LunarMean: (0.125 * Math.PI) / 180,
  stdh0Lunar: function (a: number) {
    return 0.7275 * a - A.Rise.meanRefraction;
  },
  circumpolar: function (a: number, b: number, c: number) {
    a = (Math.sin(b) - Math.sin(a) * Math.sin(c)) / (Math.cos(a) * Math.cos(c));
    return -1 > a || 1 < a ? null : a;
  },
  approxTransit: function (a: { lng: any }, b: number, c: { ra: any }) {
    return (43200 * (c.ra + a.lng)) / Math.PI - b;
  },
  approxTimes: function (a: number, b: number, c: number, d: { dec: any; ra: any }) {
    b = A.Rise.circumpolar(a.lat, b, d.dec);
    if (!b) return null;
    b = (43200 * Math.acos(b)) / Math.PI;
    a = (43200 * (d.ra + a.lng)) / Math.PI - c;
    return {
      transit: A.Math.pMod(a, 86400),
      transitd: Math.floor(a / 86400),
      rise: A.Math.pMod(a - b, 86400),
      rised: Math.floor((a - b) / 86400),
      set: A.Math.pMod(a + b, 86400),
      setd: Math.floor((a + b) / 86400),
    };
  },
  times: function (a: { lng: any; lat: number }, b: any, c: number, d: number, e: number | { dec: any }[]) {
    function f(e: number) {
      var f = A.Math.pMod(d + (360.985647 * e) / 360, 86400),
        g = e + b,
        h = A.Interp.interpolateX(l, g);
      g = A.Interp.interpolateX(m, g);
      f = (f * Math.PI) / 43200 - (a.lng + h);
      h = Math.cos(g);
      return A.Math.pMod(e + (((p * Math.sin(g) + n * h * Math.cos(f) - c) / (h * n * Math.sin(f))) * 43200) / Math.PI, 86400);
    }
    var g = A.Rise.approxTimes(a, c, d, e[1]);
    if (!g) return null;
    var l = A.Interp.newLen3(-86400, 86400, [e[0].ra, e[1].ra, e[2].ra]),
      m = A.Interp.newLen3(-86400, 86400, [e[0].dec, e[1].dec, e[2].dec]);
    e = d + (360.985647 * g.transit) / 360;
    var h = A.Interp.interpolateX(l, g.transit + b);
    g.transit = A.Math.pMod(g.transit - (e - (43200 * (a.lng + h)) / Math.PI), 86400);
    var p = Math.sin(a.lat),
      n = Math.cos(a.lat);
    g.rise = f(g.rise);
    g.set = f(g.set);
    return g;
  },
};
A.Sidereal = {
  iau82: [24110.54841, 8640184.812866, 0.093104, 6.2e-6],
  jdToCFrac: function (a: any[]) {
    a = A.Math.modF(a.jd + 0.5);
    return [new A.JulianDay(a[0] - 0.5).jdJ2000Century(), a[1]];
  },
  mean: function (a: any) {
    return A.Math.pMod(A.Sidereal._mean(a), 86400);
  },
  _mean: function (a: { s: number; f: number }) {
    a = A.Sidereal._mean0UT(a);
    return a.s + 86636.55536784 * a.f;
  },
  _meanInRA: function (a: { s: number; f: number }) {
    a = A.Sidereal._mean0UT(a);
    return (a.s * Math.PI) / 43200 + 2.0054758187 * a.f * Math.PI;
  },
  mean0UT: function (a: { s: any }) {
    a = A.Sidereal._mean0UT(a);
    return A.Math.pMod(a.s, 86400);
  },
  _mean0UT: function (a: any[]) {
    a = A.Sidereal.jdToCFrac(a);
    return { s: A.Math.horner(a[0], A.Sidereal.iau82), f: a[1] };
  },
  apparentInRa: function (a: any) {
    var b = A.Sidereal._meanInRA(a);
    a = A.Nutation.nutationInRA(a);
    return A.Math.pMod(b + a, 2 * Math.PI);
  },
  apparent: function (a: number) {
    var b = A.Sidereal._mean(a);
    a = (648e3 * A.Nutation.nutationInRA(a)) / Math.PI / 15;
    return A.Math.pMod(b + a, 86400);
  },
  apparentLocal: function (a: number, b: number) {
    a = A.Sidereal.apparent(a);
    return A.Math.pMod(a - (43200 * b) / Math.PI, 86400);
  },
  apparent0UT: function (a: number | any[]) {
    var b = A.Math.modF(a.jd + 0.5);
    a = A.Math.modF(a.jde + 0.5);
    b = A.Math.horner((b[0] - 0.5 - A.J2000) / 36525, A.Sidereal.iau82) + 86636.55536784 * b[1];
    a = (648e3 * A.Nutation.nutationInRA(new A.JulianDay(a[0]))) / Math.PI / 15;
    return A.Math.pMod(b + a, 86400);
  },
};
A.Solar = {
  earthsunDelta: 149597870,
  apparentEquatorial: function (a: number) {
    var b = a.jdJ2000Century(),
      c = A.Solar.node(b);
    b = A.Solar.apparentLongitude(b, c);
    a = A.Nutation.meanObliquityLaskar(a) + ((0.00256 * Math.PI) / 180) * Math.cos(c);
    c = Math.sin(b);
    return new A.EqCoord(Math.atan2(Math.cos(a) * c, Math.cos(b)), Math.asin(Math.sin(a) * c));
  },
  apparentTopocentric: function (a: any, b: { lat: any; h: any; lng: any }, c: any) {
    var d = A.Solar.apparentEquatorial(a),
      e = A.Globe.parallaxConstants(b.lat, b.h);
    c || (c = A.Sidereal.apparentInRa(a));
    return A.Parallax.topocentric2(d, A.Parallax.earthsunParallax, e.rhoslat, e.rhoclat, b.lng, c);
  },
  topocentricPosition: function (a: any, b: { alt: any }, c: boolean) {
    var d = A.Sidereal.apparentInRa(a);
    a = A.Solar.apparentTopocentric(a, b, d);
    b = A.Coord.eqToHz(a, b, d);
    !0 === c && (b.alt += A.Refraction.bennett2(b.alt));
    return { hz: b, eq: a };
  },
  approxTransit: function (a: { startOfDay: () => any }, b: any) {
    a = a.startOfDay();
    return A.Rise.approxTransit(b, A.Sidereal.apparent0UT(a), A.Solar.apparentTopocentric(a, b));
  },
  approxTimes: function (a: { startOfDay: () => any }, b: any) {
    var c = a.startOfDay();
    a = A.Solar.apparentTopocentric(c, b);
    var d = A.Rise.stdh0Solar;
    c = A.Sidereal.apparent0UT(c);
    return A.Rise.approxTimes(b, d, c, a);
  },
  times: function (a: { startOfDay: () => any; jd: number; deltaT: any }, b: any) {
    a = a.startOfDay();
    var c = A.Solar.apparentTopocentric(new A.JulianDay(a.jd - 1, a.deltaT), b),
      d = A.Solar.apparentTopocentric(a, b),
      e = A.Solar.apparentTopocentric(new A.JulianDay(a.jd + 1, a.deltaT), b),
      f = A.Rise.stdh0Solar,
      g = A.Sidereal.apparent0UT(a);
    return A.Rise.times(b, a.deltaT, f, g, [c, d, e]);
  },
  meanAnomaly: function (a: any) {
    return (A.Math.horner(a, [357.52911, 35999.05029, -1.537e-4]) * Math.PI) / 180;
  },
  trueLongitude: function (a: number) {
    var b = (A.Math.horner(a, [280.46646, 36000.76983, 3.032e-4]) * Math.PI) / 180,
      c = A.Solar.meanAnomaly(a);
    a = ((A.Math.horner(a, [1.914602, -0.004817, -1.4e-5]) * Math.sin(c) + (0.019993 - 1.01e-4 * a) * Math.sin(2 * c) + 2.89e-4 * Math.sin(3 * c)) * Math.PI) / 180;
    return { s: A.Math.pMod(b + a, 2 * Math.PI), v: A.Math.pMod(c + a, 2 * Math.PI) };
  },
  apparentLongitude: function (a: any, b: number) {
    b || (b = A.Solar.node(a));
    return A.Solar.trueLongitude(a).s - (0.00569 * Math.PI) / 180 - ((0.00478 * Math.PI) / 180) * Math.sin(b);
  },
  node: function (a: number) {
    return ((125.04 - 1934.136 * a) * Math.PI) / 180;
  },
};
A.Solistice = {
  march: function (a: number) {
    return 1e3 > a ? A.Solistice._eq(a, A.Solistice.mc0) : A.Solistice._eq(a - 2e3, A.Solistice.mc2);
  },
  june: function (a: number) {
    return 1e3 > a ? A.Solistice._eq(a, A.Solistice.jc0) : A.Solistice._eq(a - 2e3, A.Solistice.jc2);
  },
  september: function (a: number) {
    return 1e3 > a ? A.Solistice._eq(a, A.Solistice.sc0) : A.Solistice._eq(a - 2e3, A.Solistice.sc2);
  },
  december: function (a: number) {
    return 1e3 > a ? A.Solistice._eq(a, A.Solistice.dc0) : A.Solistice._eq(a - 2e3, A.Solistice.dc2);
  },
  _eq: function (a: number, b: number) {
    a = A.Math.horner(0.001 * a, b);
    b = (a - A.J2000) / A.JulianCentury;
    var c = ((35999.373 * Math.PI) / 180) * b - (2.47 * Math.PI) / 180;
    c = 1 + 0.0334 * Math.cos(c) + 7e-4 * Math.cos(2 * c);
    for (var d = 0, e = this.terms.length - 1; 0 <= e; e--) {
      var f = this.terms[e];
      d += f[0] * Math.cos(((f[1] + f[2] * b) * Math.PI) / 180);
    }
    return a + (1e-5 * d) / c;
  },
  mc0: [1721139.29189, 365242.1374, 0.06134, 0.00111, -7.1e-4],
  jc0: [1721233.25401, 365241.72562, -0.05232, 0.00907, 2.5e-4],
  sc0: [1721325.70455, 365242.49558, -0.11677, -0.00297, 7.4e-4],
  dc0: [1721414.39987, 365242.88257, -0.00769, -0.00933, -6e-5],
  mc2: [2451623.80984, 365242.37404, 0.05169, -0.00411, -5.7e-4],
  jc2: [2451716.56767, 365241.62603, 0.00325, 0.00888, -3e-4],
  sc2: [2451810.21715, 365242.01767, -0.11575, 0.00337, 7.8e-4],
  dc2: [2451900.05952, 365242.74049, -0.06223, -0.00823, 3.2e-4],
  terms: [
    [485, 324.96, 1934.136],
    [203, 337.23, 32964.467],
    [199, 342.08, 20.186],
    [182, 27.85, 445267.112],
    [156, 73.14, 45036.886],
    [136, 171.52, 22518.443],
    [77, 222.54, 65928.934],
    [74, 296.72, 3034.906],
    [70, 243.58, 9037.513],
    [58, 119.81, 33718.147],
    [52, 297.17, 150.678],
    [50, 21.02, 2281.226],
    [45, 247.54, 29929.562],
    [44, 325.15, 31555.956],
    [29, 60.93, 4443.417],
    [18, 155.12, 67555.328],
    [17, 288.79, 4562.452],
    [16, 198.04, 62894.029],
    [14, 199.76, 31436.921],
    [12, 95.39, 14577.848],
    [12, 287.11, 31931.756],
    [12, 320.81, 34777.259],
    [9, 227.73, 1222.114],
    [8, 15.45, 16859.074],
  ],
};

export { A };
