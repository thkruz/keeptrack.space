/*
MIT License

Copyright (C) 2013 Shashwat Kandadai, UCSC Jack Baskin School of Engineering

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 var satellite = {};
(function () {
  const pi = Math.PI;
  const twoPi = pi * 2;
  const deg2rad = pi / 180.0;
  const rad2deg = 180 / pi;
  const minutesPerDay = 1440.0;
  const mu = 398600.5; // in km3 / s2
  const earthRadius = 6378.137; // in km
  const xke = 60.0 / Math.sqrt((earthRadius * earthRadius * earthRadius) / mu);
  const tumin = 1.0 / xke;
  const j2 = 0.00108262998905;
  const j3 = -0.00000253215306;
  const j4 = -0.00000161098761;
  const j3oj2 = j3 / j2;
  const x2o3 = 2.0 / 3.0;
  const gstimeFromJday = (...args) => {
    console.warn('gstimeFromJday is deprecated, use gstime instead.'); // eslint-disable-line no-console
    return gstime(...args);
  };
  const gstimeFromDate = (...args) => {
    console.warn('gstimeFromDate is deprecated, use gstime instead.'); // eslint-disable-line no-console
    return gstime(...args);
  };

  function gstimeInternal(jdut1) {
    const tut1 = (jdut1 - 2451545.0) / 36525.0;

    let temp =
      (-6.2e-6 * tut1 * tut1 * tut1) +
      (0.093104 * tut1 * tut1) +
      (((876600.0 * 3600) + 8640184.812866) * tut1) + 67310.54841; // # sec
    temp = ((temp * deg2rad) / 240.0) % twoPi; // 360/86400 = 1/240, to deg, to rad

    //  ------------------------ check quadrants ---------------------
    if (temp < 0.0) {
      temp += twoPi;
    }

    return temp;
  }
  function jdayInternal(year, mon, day, hr, minute, sec, msec = 0) {
    return (
      ((367.0 * year) - Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25)) +
      Math.floor((275 * mon) / 9.0) +
      day + 1721013.5 +
      (((((msec / 60000) + (sec / 60.0) + minute) / 60.0) + hr) / 24.0) // ut in days
      // # - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
    );
  }
  function radiansToDegrees(radians) {
    return radians * rad2deg;
  }
  function topocentric(observerGeodetic, satelliteEcf) {
    // http://www.celestrak.com/columns/v02n02/
    // TS Kelso's method, except I'm using ECF frame
    // and he uses ECI.

    const {
      longitude,
      latitude,
    } = observerGeodetic;

    const observerEcf = geodeticToEcf(observerGeodetic);

    const rx = satelliteEcf.x - observerEcf.x;
    const ry = satelliteEcf.y - observerEcf.y;
    const rz = satelliteEcf.z - observerEcf.z;

    const topS =
    ((Math.sin(latitude) * Math.cos(longitude) * rx) +
    (Math.sin(latitude) * Math.sin(longitude) * ry)) -
    (Math.cos(latitude) * rz);

    const topE =
    (-Math.sin(longitude) * rx) +
    (Math.cos(longitude) * ry);

    const topZ =
    (Math.cos(latitude) * Math.cos(longitude) * rx) +
    (Math.cos(latitude) * Math.sin(longitude) * ry) +
    (Math.sin(latitude) * rz);

    return { topS, topE, topZ };
  }
  function topocentricToLookAngles(tc) {
    const { topS, topE, topZ } = tc;
    const rangeSat = Math.sqrt((topS * topS) + (topE * topE) + (topZ * topZ));
    const El = Math.asin(topZ / rangeSat);
    const Az = Math.atan2(-topE, topS) + pi;

    return {
      azimuth: Az,
      elevation: El,
      rangeSat, // Range in km
    };
  }

  days2mdhms = function (year, days) {
    const lmonth = [31, (year % 4) === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const dayofyr = Math.floor(days);

    //  ----------------- find month and day of month ----------------
    let i = 1;
    let inttemp = 0;
    while ((dayofyr > (inttemp + lmonth[i - 1])) && i < 12) {
      inttemp += lmonth[i - 1];
      i += 1;
    }

    const mon = i;
    const day = dayofyr - inttemp;

    //  ----------------- find hours minutes and seconds -------------
    let temp = (days - dayofyr) * 24.0;
    const hr = Math.floor(temp);
    temp = (temp - hr) * 60.0;
    const minute = Math.floor(temp);
    const sec = (temp - minute) * 60.0;

    return {
      mon,
      day,
      hr,
      minute,
      sec,
    };
  }
  degreesLat = function (radians) {
    if (radians < (-pi / 2) || radians > (pi / 2)) {
      throw new RangeError('Latitude radians must be in range [-pi/2; pi/2].');
    }
    return radiansToDegrees(radians);
  }
  degreesLong = function (radians) {
    if (radians < -pi || radians > pi) {
      throw new RangeError('Longitude radians must be in range [-pi; pi].');
    }
    return radiansToDegrees(radians);
  }
  dscom = function (options) {
    const {
      epoch,
      ep,
      argpp,
      tc,
      inclp,
      nodep,
      np,
    } = options;

    let a1;
    let a2;
    let a3;
    let a4;
    let a5;
    let a6;
    let a7;
    let a8;
    let a9;
    let a10;
    let cc;
    let x1;
    let x2;
    let x3;
    let x4;
    let x5;
    let x6;
    let x7;
    let x8;
    let zcosg;
    let zsing;
    let zcosh;
    let zsinh;
    let zcosi;
    let zsini;

    let ss1;
    let ss2;
    let ss3;
    let ss4;
    let ss5;
    let ss6;
    let ss7;
    let sz1;
    let sz2;
    let sz3;
    let sz11;
    let sz12;
    let sz13;
    let sz21;
    let sz22;
    let sz23;
    let sz31;
    let sz32;
    let sz33;
    let s1;
    let s2;
    let s3;
    let s4;
    let s5;
    let s6;
    let s7;
    let z1;
    let z2;
    let z3;
    let z11;
    let z12;
    let z13;
    let z21;
    let z22;
    let z23;
    let z31;
    let z32;
    let z33;

    // -------------------------- constants -------------------------
    const zes = 0.01675;
    const zel = 0.05490;
    const c1ss = 2.9864797e-6;
    const c1l = 4.7968065e-7;
    const zsinis = 0.39785416;
    const zcosis = 0.91744867;
    const zcosgs = 0.1945905;
    const zsings = -0.98088458;

    //  --------------------- local variables ------------------------
    const nm = np;
    const em = ep;
    const snodm = Math.sin(nodep);
    const cnodm = Math.cos(nodep);
    const sinomm = Math.sin(argpp);
    const cosomm = Math.cos(argpp);
    const sinim = Math.sin(inclp);
    const cosim = Math.cos(inclp);
    const emsq = em * em;
    const betasq = 1.0 - emsq;
    const rtemsq = Math.sqrt(betasq);

    //  ----------------- initialize lunar solar terms ---------------
    const peo = 0.0;
    const pinco = 0.0;
    const plo = 0.0;
    const pgho = 0.0;
    const pho = 0.0;
    const day = epoch + 18261.5 + (tc / 1440.0);
    const xnodce = (4.5236020 - (9.2422029e-4 * day)) % twoPi;
    const stem = Math.sin(xnodce);
    const ctem = Math.cos(xnodce);
    const zcosil = 0.91375164 - (0.03568096 * ctem);
    const zsinil = Math.sqrt(1.0 - (zcosil * zcosil));
    const zsinhl = (0.089683511 * stem) / zsinil;
    const zcoshl = Math.sqrt(1.0 - (zsinhl * zsinhl));
    const gam = 5.8351514 + (0.0019443680 * day);
    let zx = (0.39785416 * stem) / zsinil;
    const zy = (zcoshl * ctem) + (0.91744867 * zsinhl * stem);
    zx = Math.atan2(zx, zy);
    zx += gam - xnodce;
    const zcosgl = Math.cos(zx);
    const zsingl = Math.sin(zx);

    //  ------------------------- do solar terms ---------------------
    zcosg = zcosgs;
    zsing = zsings;
    zcosi = zcosis;
    zsini = zsinis;
    zcosh = cnodm;
    zsinh = snodm;
    cc = c1ss;
    const xnoi = 1.0 / nm;

    let lsflg = 0;
    while (lsflg < 2) {
      lsflg += 1;
      a1 = (zcosg * zcosh) + (zsing * zcosi * zsinh);
      a3 = (-zsing * zcosh) + (zcosg * zcosi * zsinh);
      a7 = (-zcosg * zsinh) + (zsing * zcosi * zcosh);
      a8 = zsing * zsini;
      a9 = (zsing * zsinh) + (zcosg * zcosi * zcosh);
      a10 = zcosg * zsini;
      a2 = (cosim * a7) + (sinim * a8);
      a4 = (cosim * a9) + (sinim * a10);
      a5 = (-sinim * a7) + (cosim * a8);
      a6 = (-sinim * a9) + (cosim * a10);

      x1 = (a1 * cosomm) + (a2 * sinomm);
      x2 = (a3 * cosomm) + (a4 * sinomm);
      x3 = (-a1 * sinomm) + (a2 * cosomm);
      x4 = (-a3 * sinomm) + (a4 * cosomm);
      x5 = a5 * sinomm;
      x6 = a6 * sinomm;
      x7 = a5 * cosomm;
      x8 = a6 * cosomm;

      z31 = (12.0 * x1 * x1) - (3.0 * x3 * x3);
      z32 = (24.0 * x1 * x2) - (6.0 * x3 * x4);
      z33 = (12.0 * x2 * x2) - (3.0 * x4 * x4);

      z1 = (3.0 * ((a1 * a1) + (a2 * a2))) + (z31 * emsq);
      z2 = (6.0 * ((a1 * a3) + (a2 * a4))) + (z32 * emsq);
      z3 = (3.0 * ((a3 * a3) + (a4 * a4))) + (z33 * emsq);

      z11 =
      (-6.0 * a1 * a5) +
      (emsq * ((-24.0 * x1 * x7) - (6.0 * x3 * x5)));
      z12 =
      (-6.0 * ((a1 * a6) + (a3 * a5))) +
      (emsq * ((-24.0 * ((x2 * x7) + (x1 * x8))) + (-6.0 * ((x3 * x6) + (x4 * x5)))));

      z13 =
      (-6.0 * a3 * a6) +
      (emsq * ((-24.0 * x2 * x8) - (6.0 * x4 * x6)));

      z21 =
      (6.0 * a2 * a5) +
      (emsq * ((24.0 * x1 * x5) - (6.0 * x3 * x7)));
      z22 = (6.0 * ((a4 * a5) + (a2 * a6))) +
      (emsq * ((24.0 * ((x2 * x5) + (x1 * x6))) - (6.0 * ((x4 * x7) + (x3 * x8)))));
      z23 =
      (6.0 * a4 * a6) +
      (emsq * ((24.0 * x2 * x6) - (6.0 * x4 * x8)));

      z1 = z1 + z1 + (betasq * z31);
      z2 = z2 + z2 + (betasq * z32);
      z3 = z3 + z3 + (betasq * z33);
      s3 = cc * xnoi;
      s2 = (-0.5 * s3) / rtemsq;
      s4 = s3 * rtemsq;
      s1 = -15.0 * em * s4;
      s5 = (x1 * x3) + (x2 * x4);
      s6 = (x2 * x3) + (x1 * x4);
      s7 = (x2 * x4) - (x1 * x3);

      //  ----------------------- do lunar terms -------------------
      if (lsflg === 1) {
        ss1 = s1;
        ss2 = s2;
        ss3 = s3;
        ss4 = s4;
        ss5 = s5;
        ss6 = s6;
        ss7 = s7;
        sz1 = z1;
        sz2 = z2;
        sz3 = z3;
        sz11 = z11;
        sz12 = z12;
        sz13 = z13;
        sz21 = z21;
        sz22 = z22;
        sz23 = z23;
        sz31 = z31;
        sz32 = z32;
        sz33 = z33;
        zcosg = zcosgl;
        zsing = zsingl;
        zcosi = zcosil;
        zsini = zsinil;
        zcosh = (zcoshl * cnodm) + (zsinhl * snodm);
        zsinh = (snodm * zcoshl) - (cnodm * zsinhl);
        cc = c1l;
      }
    }

    const zmol = (4.7199672 + ((0.22997150 * day) - gam)) % twoPi;
    const zmos = (6.2565837 + (0.017201977 * day)) % twoPi;

    //  ------------------------ do solar terms ----------------------
    const se2 = 2.0 * ss1 * ss6;
    const se3 = 2.0 * ss1 * ss7;
    const si2 = 2.0 * ss2 * sz12;
    const si3 = 2.0 * ss2 * (sz13 - sz11);
    const sl2 = -2.0 * ss3 * sz2;
    const sl3 = -2.0 * ss3 * (sz3 - sz1);
    const sl4 = -2.0 * ss3 * (-21.0 - (9.0 * emsq)) * zes;
    const sgh2 = 2.0 * ss4 * sz32;
    const sgh3 = 2.0 * ss4 * (sz33 - sz31);
    const sgh4 = -18.0 * ss4 * zes;
    const sh2 = -2.0 * ss2 * sz22;
    const sh3 = -2.0 * ss2 * (sz23 - sz21);

    //  ------------------------ do lunar terms ----------------------
    const ee2 = 2.0 * s1 * s6;
    const e3 = 2.0 * s1 * s7;
    const xi2 = 2.0 * s2 * z12;
    const xi3 = 2.0 * s2 * (z13 - z11);
    const xl2 = -2.0 * s3 * z2;
    const xl3 = -2.0 * s3 * (z3 - z1);
    const xl4 = -2.0 * s3 * (-21.0 - (9.0 * emsq)) * zel;
    const xgh2 = 2.0 * s4 * z32;
    const xgh3 = 2.0 * s4 * (z33 - z31);
    const xgh4 = -18.0 * s4 * zel;
    const xh2 = -2.0 * s2 * z22;
    const xh3 = -2.0 * s2 * (z23 - z21);

    return {
      snodm,
      cnodm,
      sinim,
      cosim,
      sinomm,

      cosomm,
      day,
      e3,
      ee2,
      em,

      emsq,
      gam,
      peo,
      pgho,
      pho,

      pinco,
      plo,
      rtemsq,
      se2,
      se3,

      sgh2,
      sgh3,
      sgh4,
      sh2,
      sh3,

      si2,
      si3,
      sl2,
      sl3,
      sl4,

      s1,
      s2,
      s3,
      s4,
      s5,

      s6,
      s7,
      ss1,
      ss2,
      ss3,

      ss4,
      ss5,
      ss6,
      ss7,
      sz1,

      sz2,
      sz3,
      sz11,
      sz12,
      sz13,

      sz21,
      sz22,
      sz23,
      sz31,
      sz32,

      sz33,
      xgh2,
      xgh3,
      xgh4,
      xh2,

      xh3,
      xi2,
      xi3,
      xl2,
      xl3,

      xl4,
      nm,
      z1,
      z2,
      z3,

      z11,
      z12,
      z13,
      z21,
      z22,

      z23,
      z31,
      z32,
      z33,
      zmol,

      zmos,
    };
  }
  dsinit = function (options) {
    const {
      cosim,
      argpo,
      s1,
      s2,
      s3,
      s4,
      s5,
      sinim,
      ss1,
      ss2,
      ss3,
      ss4,
      ss5,
      sz1,
      sz3,
      sz11,
      sz13,
      sz21,
      sz23,
      sz31,
      sz33,
      t,
      tc,
      gsto,
      mo,
      mdot,
      no,
      nodeo,
      nodedot,
      xpidot,
      z1,
      z3,
      z11,
      z13,
      z21,
      z23,
      z31,
      z33,
      ecco,
      eccsq,
    } = options;

    let {
      emsq,
      em,
      argpm,
      inclm,
      mm,
      nm,
      nodem,
      irez,
      atime,
      d2201,
      d2211,
      d3210,
      d3222,
      d4410,
      d4422,
      d5220,
      d5232,
      d5421,
      d5433,
      dedt,
      didt,
      dmdt,
      dnodt,
      domdt,
      del1,
      del2,
      del3,
      xfact,
      xlamo,
      xli,
      xni,
    } = options;

    let f220;
    let f221;
    let f311;
    let f321;
    let f322;
    let f330;
    let f441;
    let f442;
    let f522;
    let f523;
    let f542;
    let f543;
    let g200;
    let g201;
    let g211;
    let g300;
    let g310;
    let g322;
    let g410;
    let g422;
    let g520;
    let g521;
    let g532;
    let g533;
    let sini2;
    let temp;
    let temp1;
    let xno2;
    let ainv2;
    let aonv;
    let cosisq;
    let eoc;

    const q22 = 1.7891679e-6;
    const q31 = 2.1460748e-6;
    const q33 = 2.2123015e-7;
    const root22 = 1.7891679e-6;
    const root44 = 7.3636953e-9;
    const root54 = 2.1765803e-9;
    const rptim = 4.37526908801129966e-3; // equates to 7.29211514668855e-5 rad/sec
    const root32 = 3.7393792e-7;
    const root52 = 1.1428639e-7;
    const znl = 1.5835218e-4;
    const zns = 1.19459e-5;

    // -------------------- deep space initialization ------------
    irez = 0;
    if ((nm < 0.0052359877) && (nm > 0.0034906585)) {
      irez = 1;
    }
    if ((nm >= 8.26e-3) && (nm <= 9.24e-3) && (em >= 0.5)) {
      irez = 2;
    }

    // ------------------------ do solar terms -------------------
    const ses = ss1 * zns * ss5;
    const sis = ss2 * zns * (sz11 + sz13);
    const sls = -zns * ss3 * ((sz1 + sz3) - 14.0 - (6.0 * emsq));
    const sghs = ss4 * zns * ((sz31 + sz33) - 6.0);
    let shs = -zns * ss2 * (sz21 + sz23);

    // sgp4fix for 180 deg incl
    if (inclm < 5.2359877e-2 || inclm > pi - 5.2359877e-2) {
      shs = 0.0;
    }
    if (sinim !== 0.0) {
      shs /= sinim;
    }
    const sgs = sghs - (cosim * shs);

    // ------------------------- do lunar terms ------------------
    dedt = ses + (s1 * znl * s5);
    didt = sis + (s2 * znl * (z11 + z13));
    dmdt = sls - (znl * s3 * ((z1 + z3) - 14.0 - (6.0 * emsq)));
    const sghl = s4 * znl * ((z31 + z33) - 6.0);
    let shll = -znl * s2 * (z21 + z23);

    // sgp4fix for 180 deg incl
    if ((inclm < 5.2359877e-2) || (inclm > (pi - 5.2359877e-2))) {
      shll = 0.0;
    }
    domdt = sgs + sghl;
    dnodt = shs;
    if (sinim !== 0.0) {
      domdt -= (cosim / sinim) * shll;
      dnodt += shll / sinim;
    }

    // ----------- calculate deep space resonance effects --------
    const dndt = 0.0;
    const theta = (gsto + (tc * rptim)) % twoPi;
    em += dedt * t;
    inclm += didt * t;
    argpm += domdt * t;
    nodem += dnodt * t;
    mm += dmdt * t;

    // sgp4fix for negative inclinations
    // the following if statement should be commented out
    // if (inclm < 0.0)
    // {
      //   inclm  = -inclm;
      //   argpm  = argpm - pi;
      //   nodem = nodem + pi;
      // }

      // -------------- initialize the resonance terms -------------
      if (irez !== 0) {
        aonv = ((nm / xke) ** x2o3);

        // ---------- geopotential resonance for 12 hour orbits ------
        if (irez === 2) {
          cosisq = cosim * cosim;
          const emo = em;
          em = ecco;
          const emsqo = emsq;
          emsq = eccsq;
          eoc = em * emsq;
          g201 = -0.306 - ((em - 0.64) * 0.440);

          if (em <= 0.65) {
            g211 = (3.616 - (13.2470 * em)) + (16.2900 * emsq);
            g310 = ((-19.302 + (117.3900 * em)) - (228.4190 * emsq)) + (156.5910 * eoc);
            g322 = ((-18.9068 + (109.7927 * em)) - (214.6334 * emsq)) + (146.5816 * eoc);
            g410 = ((-41.122 + (242.6940 * em)) - (471.0940 * emsq)) + (313.9530 * eoc);
            g422 = ((-146.407 + (841.8800 * em)) - (1629.014 * emsq)) + (1083.4350 * eoc);
            g520 = ((-532.114 + (3017.977 * em)) - (5740.032 * emsq)) + (3708.2760 * eoc);
          } else {
            g211 = ((-72.099 + (331.819 * em)) - (508.738 * emsq)) + (266.724 * eoc);
            g310 = ((-346.844 + (1582.851 * em)) - (2415.925 * emsq)) + (1246.113 * eoc);
            g322 = ((-342.585 + (1554.908 * em)) - (2366.899 * emsq)) + (1215.972 * eoc);
            g410 = ((-1052.797 + (4758.686 * em)) - (7193.992 * emsq)) + (3651.957 * eoc);
            g422 = ((-3581.690 + (16178.110 * em)) - (24462.770 * emsq)) + (12422.520 * eoc);
            if (em > 0.715) {
              g520 = ((-5149.66 + (29936.92 * em)) - (54087.36 * emsq)) + (31324.56 * eoc);
            } else {
              g520 = (1464.74 - (4664.75 * em)) + (3763.64 * emsq);
            }
          }
          if (em < 0.7) {
            g533 = ((-919.22770 + (4988.6100 * em)) - (9064.7700 * emsq)) + (5542.21 * eoc);
            g521 = ((-822.71072 + (4568.6173 * em)) - (8491.4146 * emsq)) + (5337.524 * eoc);
            g532 = ((-853.66600 + (4690.2500 * em)) - (8624.7700 * emsq)) + (5341.4 * eoc);
          } else {
            g533 = ((-37995.780 + (161616.52 * em)) - (229838.20 * emsq)) + (109377.94 * eoc);
            g521 = ((-51752.104 + (218913.95 * em)) - (309468.16 * emsq)) + (146349.42 * eoc);
            g532 = ((-40023.880 + (170470.89 * em)) - (242699.48 * emsq)) + (115605.82 * eoc);
          }
          sini2 = sinim * sinim;
          f220 = 0.75 * (1.0 + (2.0 * cosim) + cosisq);
          f221 = 1.5 * sini2;
          f321 = 1.875 * sinim * (1.0 - (2.0 * cosim) - (3.0 * cosisq));
          f322 = -1.875 * sinim * ((1.0 + (2.0 * cosim)) - (3.0 * cosisq));
          f441 = 35.0 * sini2 * f220;
          f442 = 39.3750 * sini2 * sini2;

          f522 = 9.84375 * sinim * ((sini2 * (1.0 - (2.0 * cosim) - (5.0 * cosisq))) +
          (0.33333333 * (-2.0 + (4.0 * cosim) + (6.0 * cosisq))));
          f523 = sinim * ((4.92187512 * sini2 * ((-2.0 - (4.0 * cosim)) + (10.0 * cosisq))) +
          (6.56250012 * ((1.0 + (2.0 * cosim)) - (3.0 * cosisq))));
          f542 = 29.53125 * sinim * ((2.0 - (8.0 * cosim)) +
          (cosisq * (-12.0 + (8.0 * cosim) + (10.0 * cosisq))));
          f543 = 29.53125 * sinim * ((-2.0 - (8.0 * cosim)) +
          (cosisq * ((12.0 + (8.0 * cosim)) - (10.0 * cosisq))));

          xno2 = nm * nm;
          ainv2 = aonv * aonv;
          temp1 = 3.0 * xno2 * ainv2;
          temp = temp1 * root22;
          d2201 = temp * f220 * g201;
          d2211 = temp * f221 * g211;
          temp1 *= aonv;
          temp = temp1 * root32;
          d3210 = temp * f321 * g310;
          d3222 = temp * f322 * g322;
          temp1 *= aonv;
          temp = 2.0 * temp1 * root44;
          d4410 = temp * f441 * g410;
          d4422 = temp * f442 * g422;
          temp1 *= aonv;
          temp = temp1 * root52;
          d5220 = temp * f522 * g520;
          d5232 = temp * f523 * g532;
          temp = 2.0 * temp1 * root54;
          d5421 = temp * f542 * g521;
          d5433 = temp * f543 * g533;
          xlamo = ((mo + nodeo + nodeo) - (theta + theta)) % twoPi;
          xfact = (mdot + dmdt + (2.0 * ((nodedot + dnodt) - rptim))) - no;
          em = emo;
          emsq = emsqo;
        }

        //  ---------------- synchronous resonance terms --------------
        if (irez === 1) {
          g200 = 1.0 + (emsq * (-2.5 + (0.8125 * emsq)));
          g310 = 1.0 + (2.0 * emsq);
          g300 = 1.0 + (emsq * (-6.0 + (6.60937 * emsq)));
          f220 = 0.75 * (1.0 + cosim) * (1.0 + cosim);
          f311 = (0.9375 * sinim * sinim * (1.0 + (3.0 * cosim))) - (0.75 * (1.0 + cosim));
          f330 = 1.0 + cosim;
          f330 *= 1.875 * f330 * f330;
          del1 = 3.0 * nm * nm * aonv * aonv;
          del2 = 2.0 * del1 * f220 * g200 * q22;
          del3 = 3.0 * del1 * f330 * g300 * q33 * aonv;
          del1 = del1 * f311 * g310 * q31 * aonv;
          xlamo = ((mo + nodeo + argpo) - theta) % twoPi;
          xfact = (mdot + xpidot + dmdt + domdt + dnodt) - (no + rptim);
        }

        //  ------------ for sgp4, initialize the integrator ----------
        xli = xlamo;
        xni = no;
        atime = 0.0;
        nm = no + dndt;
      }

      return {
        em,
        argpm,
        inclm,
        mm,
        nm,
        nodem,

        irez,
        atime,

        d2201,
        d2211,
        d3210,
        d3222,
        d4410,

        d4422,
        d5220,
        d5232,
        d5421,
        d5433,

        dedt,
        didt,
        dmdt,
        dndt,
        dnodt,
        domdt,

        del1,
        del2,
        del3,

        xfact,
        xlamo,
        xli,
        xni,
      };
    }
  dspace = function (options) {
      const {
        irez,
        d2201,
        d2211,
        d3210,
        d3222,
        d4410,
        d4422,
        d5220,
        d5232,
        d5421,
        d5433,
        dedt,
        del1,
        del2,
        del3,
        didt,
        dmdt,
        dnodt,
        domdt,
        argpo,
        argpdot,
        t,
        tc,
        gsto,
        xfact,
        xlamo,
        no,
      } = options;

      let {
        atime,
        em,
        argpm,
        inclm,
        xli,
        mm,
        xni,
        nodem,
        nm,
      } = options;

      const fasx2 = 0.13130908;
      const fasx4 = 2.8843198;
      const fasx6 = 0.37448087;
      const g22 = 5.7686396;
      const g32 = 0.95240898;
      const g44 = 1.8014998;
      const g52 = 1.0508330;
      const g54 = 4.4108898;
      const rptim = 4.37526908801129966e-3; // equates to 7.29211514668855e-5 rad/sec
      const stepp = 720.0;
      const stepn = -720.0;
      const step2 = 259200.0;

      let delt;
      let x2li;
      let x2omi;
      let xl;
      let xldot;
      let xnddt;
      let xndt;
      let xomi;
      let dndt = 0.0;
      let ft = 0.0;

      //  ----------- calculate deep space resonance effects -----------
      const theta = (gsto + (tc * rptim)) % twoPi;
      em += dedt * t;

      inclm += didt * t;
      argpm += domdt * t;
      nodem += dnodt * t;
      mm += dmdt * t;

      // sgp4fix for negative inclinations
      // the following if statement should be commented out
      // if (inclm < 0.0)
      // {
      //   inclm = -inclm;
      //   argpm = argpm - pi;
      //   nodem = nodem + pi;
      // }

      /* - update resonances : numerical (euler-maclaurin) integration - */
      /* ------------------------- epoch restart ----------------------  */
      //   sgp4fix for propagator problems
      //   the following integration works for negative time steps and periods
      //   the specific changes are unknown because the original code was so convoluted

      // sgp4fix take out atime = 0.0 and fix for faster operation

      if (irez !== 0) {
        //  sgp4fix streamline check
        if (atime === 0.0 || t * atime <= 0.0 || Math.abs(t) < Math.abs(atime)) {
          atime = 0.0;
          xni = no;
          xli = xlamo;
        }

        // sgp4fix move check outside loop
        if (t > 0.0) {
          delt = stepp;
        } else {
          delt = stepn;
        }

        let iretn = 381; // added for do loop
        while (iretn === 381) {
          //  ------------------- dot terms calculated -------------
          //  ----------- near - synchronous resonance terms -------
          if (irez !== 2) {
            xndt =
            (del1 * Math.sin(xli - fasx2)) +
            (del2 * Math.sin(2.0 * (xli - fasx4))) +
            (del3 * Math.sin(3.0 * (xli - fasx6)));
            xldot = xni + xfact;
            xnddt =
            (del1 * Math.cos(xli - fasx2)) +
            (2.0 * del2 * Math.cos(2.0 * (xli - fasx4))) +
            (3.0 * del3 * Math.cos(3.0 * (xli - fasx6)));
            xnddt *= xldot;
          } else {
            // --------- near - half-day resonance terms --------
            xomi = argpo + (argpdot * atime);
            x2omi = xomi + xomi;
            x2li = xli + xli;
            xndt =
            (d2201 * Math.sin((x2omi + xli) - g22)) +
            (d2211 * Math.sin(xli - g22)) +
            (d3210 * Math.sin((xomi + xli) - g32)) +
            (d3222 * Math.sin((-xomi + xli) - g32)) +
            (d4410 * Math.sin((x2omi + x2li) - g44)) +
            (d4422 * Math.sin(x2li - g44)) +
            (d5220 * Math.sin((xomi + xli) - g52)) +
            (d5232 * Math.sin((-xomi + xli) - g52)) +
            (d5421 * Math.sin((xomi + x2li) - g54)) +
            (d5433 * Math.sin((-xomi + x2li) - g54));
            xldot = xni + xfact;
            xnddt =
            (d2201 * Math.cos((x2omi + xli) - g22)) +
            (d2211 * Math.cos(xli - g22)) +
            (d3210 * Math.cos((xomi + xli) - g32)) +
            (d3222 * Math.cos((-xomi + xli) - g32)) +
            (d5220 * Math.cos((xomi + xli) - g52)) +
            (d5232 * Math.cos((-xomi + xli) - g52)) +
            (2.0 * d4410 * Math.cos((x2omi + x2li) - g44)) +
            (d4422 * Math.cos(x2li - g44)) +
            (d5421 * Math.cos((xomi + x2li) - g54)) +
            (d5433 * Math.cos((-xomi + x2li) - g54));
            xnddt *= xldot;
          }

          //  ----------------------- integrator -------------------
          //  sgp4fix move end checks to end of routine
          if (Math.abs(t - atime) >= stepp) {
            iretn = 381;
          } else {
            ft = t - atime;
            iretn = 0;
          }

          if (iretn === 381) {
            xli += (xldot * delt) + (xndt * step2);
            xni += (xndt * delt) + (xnddt * step2);
            atime += delt;
          }
        }

        nm = xni + (xndt * ft) + (xnddt * ft * ft * 0.5);
        xl = xli + (xldot * ft) + (xndt * ft * ft * 0.5);
        if (irez !== 1) {
          mm = (xl - (2.0 * nodem)) + (2.0 * theta);
          dndt = nm - no;
        } else {
          mm = (xl - nodem - argpm) + theta;
          dndt = nm - no;
        }
        nm = no + dndt;
      }

      return {
        atime,
        em,
        argpm,
        inclm,
        xli,
        mm,
        xni,
        nodem,
        dndt,
        nm,
      };
    }
  dopplerFactor = function (location, position, velocity) {
    const currentRange = Math.sqrt(
      ((position.x - location.x) ** 2) +
      ((position.y - location.y) ** 2) +
      ((position.z - location.z) ** 2));

      const nextPos = {
        x: position.x + velocity.x,
        y: position.y + velocity.y,
        z: position.z + velocity.z,
      };

      const nextRange = Math.sqrt(
        ((nextPos.x - location.x) ** 2) +
        ((nextPos.y - location.y) ** 2) +
        ((nextPos.z - location.z) ** 2));

        let rangeRate = nextRange - currentRange;

        function sign(value) {
          return value >= 0 ? 1 : -1;
        }

        rangeRate *= sign(rangeRate);
        const c = 299792.458; // Speed of light in km/s
        return (1 + (rangeRate / c));
      }
  dpper = function (satrec, options) {
        const {
          e3,
          ee2,
          peo,
          pgho,
          pho,
          pinco,
          plo,
          se2,
          se3,
          sgh2,
          sgh3,
          sgh4,
          sh2,
          sh3,
          si2,
          si3,
          sl2,
          sl3,
          sl4,
          t,
          xgh2,
          xgh3,
          xgh4,
          xh2,
          xh3,
          xi2,
          xi3,
          xl2,
          xl3,
          xl4,
          zmol,
          zmos,
        } = satrec;

        const {
          init,
          opsmode,
        } = options;

        let {
          ep,
          inclp,
          nodep,
          argpp,
          mp,
        } = options;

        // Copy satellite attributes into local variables for convenience
        // and symmetry in writing formulae.

        let alfdp;
        let betdp;
        let cosip;
        let sinip;
        let cosop;
        let sinop;
        let dalf;
        let dbet;
        let dls;
        let f2;
        let f3;
        let pe;
        let pgh;
        let ph;
        let pinc;
        let pl;
        let sinzf;
        let xls;
        let xnoh;
        let zf;
        let zm;

        //  ---------------------- constants -----------------------------
        const zns = 1.19459e-5;
        const zes = 0.01675;
        const znl = 1.5835218e-4;
        const zel = 0.05490;

        //  --------------- calculate time varying periodics -----------
        zm = zmos + (zns * t);

        // be sure that the initial call has time set to zero
        if (init === 'y') {
          zm = zmos;
        }
        zf = zm + (2.0 * zes * Math.sin(zm));
        sinzf = Math.sin(zf);
        f2 = (0.5 * sinzf * sinzf) - 0.25;
        f3 = -0.5 * sinzf * Math.cos(zf);

        const ses = (se2 * f2) + (se3 * f3);
        const sis = (si2 * f2) + (si3 * f3);
        const sls = (sl2 * f2) + (sl3 * f3) + (sl4 * sinzf);
        const sghs = (sgh2 * f2) + (sgh3 * f3) + (sgh4 * sinzf);
        const shs = (sh2 * f2) + (sh3 * f3);

        zm = zmol + (znl * t);
        if (init === 'y') {
          zm = zmol;
        }

        zf = zm + (2.0 * zel * Math.sin(zm));
        sinzf = Math.sin(zf);
        f2 = (0.5 * sinzf * sinzf) - 0.25;
        f3 = -0.5 * sinzf * Math.cos(zf);

        const sel = (ee2 * f2) + (e3 * f3);
        const sil = (xi2 * f2) + (xi3 * f3);
        const sll = (xl2 * f2) + (xl3 * f3) + (xl4 * sinzf);
        const sghl = (xgh2 * f2) + (xgh3 * f3) + (xgh4 * sinzf);
        const shll = (xh2 * f2) + (xh3 * f3);

        pe = ses + sel;
        pinc = sis + sil;
        pl = sls + sll;
        pgh = sghs + sghl;
        ph = shs + shll;

        if (init === 'n') {
          pe -= peo;
          pinc -= pinco;
          pl -= plo;
          pgh -= pgho;
          ph -= pho;
          inclp += pinc;
          ep += pe;
          sinip = Math.sin(inclp);
          cosip = Math.cos(inclp);

          /* ----------------- apply periodics directly ------------ */
          // sgp4fix for lyddane choice
          // strn3 used original inclination - this is technically feasible
          // gsfc used perturbed inclination - also technically feasible
          // probably best to readjust the 0.2 limit value and limit discontinuity
          // 0.2 rad = 11.45916 deg
          // use next line for original strn3 approach and original inclination
          // if (inclo >= 0.2)
          // use next line for gsfc version and perturbed inclination
          if (inclp >= 0.2) {
            ph /= sinip;
            pgh -= cosip * ph;
            argpp += pgh;
            nodep += ph;
            mp += pl;
          } else {
            //  ---- apply periodics with lyddane modification ----
            sinop = Math.sin(nodep);
            cosop = Math.cos(nodep);
            alfdp = sinip * sinop;
            betdp = sinip * cosop;
            dalf = (ph * cosop) + (pinc * cosip * sinop);
            dbet = (-ph * sinop) + (pinc * cosip * cosop);
            alfdp += dalf;
            betdp += dbet;
            nodep %= twoPi;

            //  sgp4fix for afspc written intrinsic functions
            //  nodep used without a trigonometric function ahead
            if (nodep < 0.0 && opsmode === 'a') {
              nodep += twoPi;
            }
            xls = mp + argpp + (cosip * nodep);
            dls = (pl + pgh) - (pinc * nodep * sinip);
            xls += dls;
            xnoh = nodep;
            nodep = Math.atan2(alfdp, betdp);

            //  sgp4fix for afspc written intrinsic functions
            //  nodep used without a trigonometric function ahead
            if (nodep < 0.0 && opsmode === 'a') {
              nodep += twoPi;
            }
            if (Math.abs(xnoh - nodep) > pi) {
              if (nodep < xnoh) {
                nodep += twoPi;
              } else {
                nodep -= twoPi;
              }
            }
            mp += pl;
            argpp = xls - mp - (cosip * nodep);
          }
        }

        return {
          ep,
          inclp,
          nodep,
          argpp,
          mp,
        };
      }
  eciToGeodetic = function (eci, gmst) {
    // http://www.celestrak.com/columns/v02n03/
    const a = 6378.137;
    const b = 6356.7523142;
    const R = Math.sqrt((eci.x * eci.x) + (eci.y * eci.y));
    const f = (a - b) / a;
    const e2 = ((2 * f) - (f * f));

    let longitude = Math.atan2(eci.y, eci.x) - gmst;
    while (longitude < -pi) {
      longitude += twoPi;
    }
    while (longitude > pi) {
      longitude -= twoPi;
    }

    const kmax = 20;
    let k = 0;
    let latitude = Math.atan2(
      eci.z,
      Math.sqrt((eci.x * eci.x) + (eci.y * eci.y)),
    );
    let C;
    while (k < kmax) {
      C = 1 / Math.sqrt(1 - (e2 * (Math.sin(latitude) * Math.sin(latitude))));
      latitude = Math.atan2(eci.z + (a * C * e2 * Math.sin(latitude)), R);
      k += 1;
    }
    const height = (R / Math.cos(latitude)) - (a * C);
    return { longitude, latitude, height };
  }
  ecfToEci = function (ecf, gmst) {
    // ccar.colorado.edu/ASEN5070/handouts/coordsys.doc
    //
    // [X]     [C -S  0][X]
    // [Y]  =  [S  C  0][Y]
    // [Z]eci  [0  0  1][Z]ecf
    //
    const X = (ecf.x * Math.cos(gmst)) - (ecf.y * Math.sin(gmst));
    const Y = (ecf.x * (Math.sin(gmst))) + (ecf.y * Math.cos(gmst));
    const Z = ecf.z;
    return { x: X, y: Y, z: Z };
  }
  eciToEcf = function (eci, gmst) {
    // ccar.colorado.edu/ASEN5070/handouts/coordsys.doc
    //
    // [X]     [C -S  0][X]
    // [Y]  =  [S  C  0][Y]
    // [Z]eci  [0  0  1][Z]ecf
    //
    //
    // Inverse:
    // [X]     [C  S  0][X]
    // [Y]  =  [-S C  0][Y]
    // [Z]ecf  [0  0  1][Z]eci

    const x = (eci.x * Math.cos(gmst)) + (eci.y * Math.sin(gmst));
    const y = (eci.x * (-Math.sin(gmst))) + (eci.y * Math.cos(gmst));
    const { z } = eci;

    return {
      x,
      y,
      z,
    };
  }
  ecfToLookAngles = function (observerGeodetic, satelliteEcf) {
    const topocentricCoords = topocentric(observerGeodetic, satelliteEcf);
    return topocentricToLookAngles(topocentricCoords);
  }
  geodeticToEcf = function (geodetic) {
    const {
      longitude,
      latitude,
      height,
    } = geodetic;

    const a = 6378.137;
    const b = 6356.7523142;
    const f = (a - b) / a;
    const e2 = ((2 * f) - (f * f));
    const normal = a / Math.sqrt(1 - (e2 * (Math.sin(latitude) * Math.sin(latitude))));

    const x = (normal + height) * Math.cos(latitude) * Math.cos(longitude);
    const y = (normal + height) * Math.cos(latitude) * Math.sin(longitude);
    const z = ((normal * (1 - e2)) + height) * Math.sin(latitude);

    return {
      x,
      y,
      z,
    };
  }
  gstime = function (...args) {
    if (args[0] instanceof Date || args.length > 1) {
      return gstimeInternal(jday(...args));
    }
    return gstimeInternal(...args);
  }
  initl = function (options) {
    const {
      ecco,
      epoch,
      inclo,
      opsmode,
    } = options;

    let {
      no,
    } = options;

    // sgp4fix use old way of finding gst
    // ----------------------- earth constants ---------------------
    // sgp4fix identify constants and allow alternate values

    // ------------- calculate auxillary epoch quantities ----------
    const eccsq = ecco * ecco;
    const omeosq = 1.0 - eccsq;
    const rteosq = Math.sqrt(omeosq);
    const cosio = Math.cos(inclo);
    const cosio2 = cosio * cosio;

    // ------------------ un-kozai the mean motion -----------------
    const ak = ((xke / no) ** x2o3);
    const d1 = (0.75 * j2 * ((3.0 * cosio2) - 1.0)) / (rteosq * omeosq);
    let delPrime = d1 / (ak * ak);
    const adel = ak * (1.0 - (delPrime * delPrime) -
    (delPrime * ((1.0 / 3.0) + ((134.0 * delPrime * delPrime) / 81.0))));
    delPrime = d1 / (adel * adel);
    no /= (1.0 + delPrime);

    const ao = ((xke / no) ** x2o3);
    const sinio = Math.sin(inclo);
    const po = ao * omeosq;
    const con42 = 1.0 - (5.0 * cosio2);
    const con41 = -con42 - cosio2 - cosio2;
    const ainv = 1.0 / ao;
    const posq = po * po;
    const rp = ao * (1.0 - ecco);
    const method = 'n';

    //  sgp4fix modern approach to finding sidereal time
    let gsto;
    if (opsmode === 'a') {
      //  sgp4fix use old way of finding gst
      //  count integer number of days from 0 jan 1970
      const ts70 = epoch - 7305.0;
      const ds70 = Math.floor(ts70 + 1.0e-8);
      const tfrac = ts70 - ds70;

      //  find greenwich location at epoch
      const c1 = 1.72027916940703639e-2;
      const thgr70 = 1.7321343856509374;
      const fk5r = 5.07551419432269442e-15;
      const c1p2p = c1 + twoPi;
      gsto = (thgr70 + (c1 * ds70) + (c1p2p * tfrac) + (ts70 * ts70 * fk5r)) % twoPi;
      if (gsto < 0.0) {
        gsto += twoPi;
      }
    } else {
      gsto = gstime(epoch + 2433281.5);
    }

    return {
      no,

      method,

      ainv,
      ao,
      con41,
      con42,
      cosio,

      cosio2,
      eccsq,
      omeosq,
      posq,

      rp,
      rteosq,
      sinio,
      gsto,
    };
  }
  invjday = function (jd, asArray) {
    // --------------- find year and days of the year -
    const temp = jd - 2415019.5;
    const tu = temp / 365.25;
    let year = 1900 + Math.floor(tu);
    let leapyrs = Math.floor((year - 1901) * 0.25);

    // optional nudge by 8.64x10-7 sec to get even outputs
    let days = (temp - (((year - 1900) * 365.0) + leapyrs)) + 0.00000000001;

    // ------------ check for case of beginning of a year -----------
    if (days < 1.0) {
      year -= 1;
      leapyrs = Math.floor((year - 1901) * 0.25);
      days = temp - (((year - 1900) * 365.0) + leapyrs);
    }

    // ----------------- find remaing data  -------------------------
    const mdhms = days2mdhms(year, days);

    const {
      mon,
      day,
      hr,
      minute,
    } = mdhms;

    const sec = mdhms.sec - 0.00000086400;

    if (asArray) {
      return [year, mon, day, hr, minute, Math.floor(sec)];
    }

    return new Date(Date.UTC(year, mon - 1, day, hr, minute, Math.floor(sec)));
  }
  jday = function (year, mon, day, hr, minute, sec, msec) {
    if (year instanceof Date) {
      const date = year;
      return jdayInternal(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds(),
      );
    }

    return jdayInternal(year, mon, day, hr, minute, sec, msec);
  }
  propagate = function (...args) {
    // Return a position and velocity vector for a given date and time.
    const satrec = args[0];
    const date = Array.prototype.slice.call(args, 1);
    const j = jday(...date);
    const m = (j - satrec.jdsatepoch) * minutesPerDay;
    return sgp4(satrec, m);
  }
  sgp4init = function (satrec, options) {
    /* eslint-disable no-param-reassign */

    const {
      opsmode,
      satn,
      epoch,
      xbstar,
      xecco,
      xargpo,
      xinclo,
      xmo,
      xno,
      xnodeo,
    } = options;

    let cosim;
    let sinim;
    let cc1sq;
    let cc2;
    let cc3;
    let coef;
    let coef1;
    let cosio4;
    let em;
    let emsq;
    let eeta;
    let etasq;
    let argpm;
    let nodem;
    let inclm;
    let mm;
    let nm;
    let perige;
    let pinvsq;
    let psisq;
    let qzms24;
    let s1;
    let s2;
    let s3;
    let s4;
    let s5;
    let sfour;
    let ss1;
    let ss2;
    let ss3;
    let ss4;
    let ss5;
    let sz1;
    let sz3;
    let sz11;
    let sz13;
    let sz21;
    let sz23;
    let sz31;
    let sz33;
    let tc;
    let temp;
    let temp1;
    let temp2;
    let temp3;
    let tsi;
    let xpidot;
    let xhdot1;
    let z1;
    let z3;
    let z11;
    let z13;
    let z21;
    let z23;
    let z31;
    let z33;

    /* ------------------------ initialization --------------------- */
    // sgp4fix divisor for divide by zero check on inclination
    // the old check used 1.0 + Math.cos(pi-1.0e-9), but then compared it to
    // 1.5 e-12, so the threshold was changed to 1.5e-12 for consistency
    const temp4 = 1.5e-12;

    // ----------- set all near earth variables to zero ------------
    satrec.isimp = 0; satrec.method = 'n'; satrec.aycof = 0.0;
    satrec.con41 = 0.0; satrec.cc1 = 0.0; satrec.cc4 = 0.0;
    satrec.cc5 = 0.0; satrec.d2 = 0.0; satrec.d3 = 0.0;
    satrec.d4 = 0.0; satrec.delmo = 0.0; satrec.eta = 0.0;
    satrec.argpdot = 0.0; satrec.omgcof = 0.0; satrec.sinmao = 0.0;
    satrec.t = 0.0; satrec.t2cof = 0.0; satrec.t3cof = 0.0;
    satrec.t4cof = 0.0; satrec.t5cof = 0.0; satrec.x1mth2 = 0.0;
    satrec.x7thm1 = 0.0; satrec.mdot = 0.0; satrec.nodedot = 0.0;
    satrec.xlcof = 0.0; satrec.xmcof = 0.0; satrec.nodecf = 0.0;

    // ----------- set all deep space variables to zero ------------
    satrec.irez = 0; satrec.d2201 = 0.0; satrec.d2211 = 0.0;
    satrec.d3210 = 0.0; satrec.d3222 = 0.0; satrec.d4410 = 0.0;
    satrec.d4422 = 0.0; satrec.d5220 = 0.0; satrec.d5232 = 0.0;
    satrec.d5421 = 0.0; satrec.d5433 = 0.0; satrec.dedt = 0.0;
    satrec.del1 = 0.0; satrec.del2 = 0.0; satrec.del3 = 0.0;
    satrec.didt = 0.0; satrec.dmdt = 0.0; satrec.dnodt = 0.0;
    satrec.domdt = 0.0; satrec.e3 = 0.0; satrec.ee2 = 0.0;
    satrec.peo = 0.0; satrec.pgho = 0.0; satrec.pho = 0.0;
    satrec.pinco = 0.0; satrec.plo = 0.0; satrec.se2 = 0.0;
    satrec.se3 = 0.0; satrec.sgh2 = 0.0; satrec.sgh3 = 0.0;
    satrec.sgh4 = 0.0; satrec.sh2 = 0.0; satrec.sh3 = 0.0;
    satrec.si2 = 0.0; satrec.si3 = 0.0; satrec.sl2 = 0.0;
    satrec.sl3 = 0.0; satrec.sl4 = 0.0; satrec.gsto = 0.0;
    satrec.xfact = 0.0; satrec.xgh2 = 0.0; satrec.xgh3 = 0.0;
    satrec.xgh4 = 0.0; satrec.xh2 = 0.0; satrec.xh3 = 0.0;
    satrec.xi2 = 0.0; satrec.xi3 = 0.0; satrec.xl2 = 0.0;
    satrec.xl3 = 0.0; satrec.xl4 = 0.0; satrec.xlamo = 0.0;
    satrec.zmol = 0.0; satrec.zmos = 0.0; satrec.atime = 0.0;
    satrec.xli = 0.0; satrec.xni = 0.0;

    // sgp4fix - note the following variables are also passed directly via satrec.
    // it is possible to streamline the sgp4init call by deleting the "x"
    // variables, but the user would need to set the satrec.* values first. we
    // include the additional assignments in case twoline2rv is not used.

    satrec.bstar = xbstar;
    satrec.ecco = xecco;
    satrec.argpo = xargpo;
    satrec.inclo = xinclo;
    satrec.mo = xmo;
    satrec.no = xno;
    satrec.nodeo = xnodeo;

    //  sgp4fix add opsmode
    satrec.operationmode = opsmode;

    // ------------------------ earth constants -----------------------
    // sgp4fix identify constants and allow alternate values

    const ss = (78.0 / earthRadius) + 1.0;
    // sgp4fix use multiply for speed instead of pow
    const qzms2ttemp = (120.0 - 78.0) / earthRadius;
    const qzms2t = qzms2ttemp * qzms2ttemp * qzms2ttemp * qzms2ttemp;

    satrec.init = 'y';
    satrec.t = 0.0;

    const initlOptions = {
      satn,
      ecco: satrec.ecco,

      epoch,
      inclo: satrec.inclo,
      no: satrec.no,

      method: satrec.method,
      opsmode: satrec.operationmode,
    };

    const initlResult = initl(initlOptions);

    const {
      ao,
      con42,
      cosio,
      cosio2,
      eccsq,
      omeosq,
      posq,
      rp,
      rteosq,
      sinio,
    } = initlResult;

    satrec.no = initlResult.no;
    satrec.con41 = initlResult.con41;
    satrec.gsto = initlResult.gsto;
    satrec.error = 0;

    // sgp4fix remove this check as it is unnecessary
    // the mrt check in sgp4 handles decaying satellite cases even if the starting
    // condition is below the surface of te earth
    // if (rp < 1.0)
    // {
    //   printf("// *** satn%d epoch elts sub-orbital ***\n", satn);
    //   satrec.error = 5;
    // }

    if (omeosq >= 0.0 || satrec.no >= 0.0) {
      satrec.isimp = 0;
      if ((rp < 220.0 / earthRadius) + 1.0) {
        satrec.isimp = 1;
      }
      sfour = ss;
      qzms24 = qzms2t;
      perige = (rp - 1.0) * earthRadius;

      // - for perigees below 156 km, s and qoms2t are altered -
      if (perige < 156.0) {
        sfour = perige - 78.0;
        if (perige < 98.0) {
          sfour = 20.0;
        }

        // sgp4fix use multiply for speed instead of pow
        const qzms24temp = (120.0 - sfour) / earthRadius;
        qzms24 = qzms24temp * qzms24temp * qzms24temp * qzms24temp;
        sfour = (sfour / earthRadius) + 1.0;
      }
      pinvsq = 1.0 / posq;

      tsi = 1.0 / (ao - sfour);
      satrec.eta = ao * satrec.ecco * tsi;
      etasq = satrec.eta * satrec.eta;
      eeta = satrec.ecco * satrec.eta;
      psisq = Math.abs(1.0 - etasq);
      coef = qzms24 * (tsi ** 4.0);
      coef1 = coef / (psisq ** 3.5);
      cc2 = coef1 * satrec.no * ((ao * (1.0 + (1.5 * etasq) + (eeta * (4.0 + etasq)))) +
      (((0.375 * j2 * tsi) / psisq) * satrec.con41 *
      (8.0 + (3.0 * etasq * (8.0 + etasq)))));
      satrec.cc1 = satrec.bstar * cc2;
      cc3 = 0.0;
      if (satrec.ecco > 1.0e-4) {
        cc3 = (-2.0 * coef * tsi * j3oj2 * satrec.no * sinio) / satrec.ecco;
      }
      satrec.x1mth2 = 1.0 - cosio2;
      satrec.cc4 = 2.0 * satrec.no * coef1 * ao * omeosq * (
        ((satrec.eta * (2.0 + (0.5 * etasq))) +
        (satrec.ecco * (0.5 + (2.0 * etasq)))) -
        (((j2 * tsi) / (ao * psisq)) *
        ((-3.0 * satrec.con41 * ((1.0 - (2.0 * eeta)) + (etasq * (1.5 - (0.5 * eeta))))) +
        (0.75 * satrec.x1mth2 *
          ((2.0 * etasq) - (eeta * (1.0 + etasq))) *
          Math.cos(2.0 * satrec.argpo))))
        );
        satrec.cc5 = 2.0 * coef1 * ao * omeosq * (1.0 + (2.75 * (etasq + eeta)) + (eeta * etasq));
        cosio4 = cosio2 * cosio2;
        temp1 = 1.5 * j2 * pinvsq * satrec.no;
        temp2 = 0.5 * temp1 * j2 * pinvsq;
        temp3 = -0.46875 * j4 * pinvsq * pinvsq * satrec.no;
        satrec.mdot = satrec.no + (0.5 * temp1 * rteosq * satrec.con41) +
        (0.0625 * temp2 * rteosq * ((13.0 - (78.0 * cosio2)) + (137.0 * cosio4)));
        satrec.argpdot = (-0.5 * temp1 * con42) +
        (0.0625 * temp2 * ((7.0 - (114.0 * cosio2)) + (395.0 * cosio4))) +
        (temp3 * ((3.0 - (36.0 * cosio2)) + (49.0 * cosio4)));
        xhdot1 = -temp1 * cosio;
        satrec.nodedot = xhdot1 + (((0.5 * temp2 * (4.0 - (19.0 * cosio2))) +
        (2.0 * temp3 * (3.0 - (7.0 * cosio2)))) * cosio);
        xpidot = satrec.argpdot + satrec.nodedot;
        satrec.omgcof = satrec.bstar * cc3 * Math.cos(satrec.argpo);
        satrec.xmcof = 0.0;
        if (satrec.ecco > 1.0e-4) {
          satrec.xmcof = (-x2o3 * coef * satrec.bstar) / eeta;
        }
        satrec.nodecf = 3.5 * omeosq * xhdot1 * satrec.cc1;
        satrec.t2cof = 1.5 * satrec.cc1;

        // sgp4fix for divide by zero with xinco = 180 deg
        if (Math.abs(cosio + 1.0) > 1.5e-12) {
          satrec.xlcof = (-0.25 * j3oj2 * sinio * (3.0 + (5.0 * cosio))) / (1.0 + cosio);
        } else {
          satrec.xlcof = (-0.25 * j3oj2 * sinio * (3.0 + (5.0 * cosio))) / temp4;
        }
        satrec.aycof = -0.5 * j3oj2 * sinio;

        // sgp4fix use multiply for speed instead of pow
        const delmotemp = 1.0 + (satrec.eta * Math.cos(satrec.mo));
        satrec.delmo = delmotemp * delmotemp * delmotemp;
        satrec.sinmao = Math.sin(satrec.mo);
        satrec.x7thm1 = (7.0 * cosio2) - 1.0;

        // --------------- deep space initialization -------------
        if ((2 * pi) / satrec.no >= 225.0) {
          satrec.method = 'd';
          satrec.isimp = 1;
          tc = 0.0;
          inclm = satrec.inclo;

          const dscomOptions = {
            epoch,
            ep: satrec.ecco,
            argpp: satrec.argpo,
            tc,
            inclp: satrec.inclo,
            nodep: satrec.nodeo,

            np: satrec.no,

            e3: satrec.e3,
            ee2: satrec.ee2,

            peo: satrec.peo,
            pgho: satrec.pgho,
            pho: satrec.pho,
            pinco: satrec.pinco,

            plo: satrec.plo,
            se2: satrec.se2,
            se3: satrec.se3,

            sgh2: satrec.sgh2,
            sgh3: satrec.sgh3,
            sgh4: satrec.sgh4,

            sh2: satrec.sh2,
            sh3: satrec.sh3,
            si2: satrec.si2,
            si3: satrec.si3,

            sl2: satrec.sl2,
            sl3: satrec.sl3,
            sl4: satrec.sl4,

            xgh2: satrec.xgh2,
            xgh3: satrec.xgh3,
            xgh4: satrec.xgh4,
            xh2: satrec.xh2,

            xh3: satrec.xh3,
            xi2: satrec.xi2,
            xi3: satrec.xi3,
            xl2: satrec.xl2,

            xl3: satrec.xl3,
            xl4: satrec.xl4,

            zmol: satrec.zmol,
            zmos: satrec.zmos,
          };

          const dscomResult = dscom(dscomOptions);

          satrec.e3 = dscomResult.e3;
          satrec.ee2 = dscomResult.ee2;

          satrec.peo = dscomResult.peo;
          satrec.pgho = dscomResult.pgho;
          satrec.pho = dscomResult.pho;

          satrec.pinco = dscomResult.pinco;
          satrec.plo = dscomResult.plo;
          satrec.se2 = dscomResult.se2;
          satrec.se3 = dscomResult.se3;

          satrec.sgh2 = dscomResult.sgh2;
          satrec.sgh3 = dscomResult.sgh3;
          satrec.sgh4 = dscomResult.sgh4;
          satrec.sh2 = dscomResult.sh2;
          satrec.sh3 = dscomResult.sh3;

          satrec.si2 = dscomResult.si2;
          satrec.si3 = dscomResult.si3;
          satrec.sl2 = dscomResult.sl2;
          satrec.sl3 = dscomResult.sl3;
          satrec.sl4 = dscomResult.sl4;

          ({
            sinim,
            cosim,
            em,
            emsq,
            s1,
            s2,
            s3,
            s4,
            s5,
            ss1,
            ss2,
            ss3,
            ss4,
            ss5,
            sz1,
            sz3,
            sz11,
            sz13,
            sz21,
            sz23,
            sz31,
            sz33,
          } = dscomResult);

          satrec.xgh2 = dscomResult.xgh2;
          satrec.xgh3 = dscomResult.xgh3;
          satrec.xgh4 = dscomResult.xgh4;
          satrec.xh2 = dscomResult.xh2;
          satrec.xh3 = dscomResult.xh3;
          satrec.xi2 = dscomResult.xi2;
          satrec.xi3 = dscomResult.xi3;
          satrec.xl2 = dscomResult.xl2;
          satrec.xl3 = dscomResult.xl3;
          satrec.xl4 = dscomResult.xl4;
          satrec.zmol = dscomResult.zmol;
          satrec.zmos = dscomResult.zmos;

          ({
            nm,
            z1,
            z3,
            z11,
            z13,
            z21,
            z23,
            z31,
            z33,
          } = dscomResult);

          const dpperOptions = {
            inclo: inclm,
            init: satrec.init,
            ep: satrec.ecco,
            inclp: satrec.inclo,
            nodep: satrec.nodeo,
            argpp: satrec.argpo,
            mp: satrec.mo,
            opsmode: satrec.operationmode,
          };

          const dpperResult = dpper(satrec, dpperOptions);

          satrec.ecco = dpperResult.ep;
          satrec.inclo = dpperResult.inclp;
          satrec.nodeo = dpperResult.nodep;
          satrec.argpo = dpperResult.argpp;
          satrec.mo = dpperResult.mp;

          argpm = 0.0;
          nodem = 0.0;
          mm = 0.0;

          const dsinitOptions = {
            cosim,
            emsq,
            argpo: satrec.argpo,
            s1,
            s2,
            s3,
            s4,
            s5,
            sinim,
            ss1,
            ss2,
            ss3,
            ss4,
            ss5,
            sz1,
            sz3,
            sz11,
            sz13,
            sz21,
            sz23,
            sz31,
            sz33,
            t: satrec.t,
            tc,
            gsto: satrec.gsto,
            mo: satrec.mo,
            mdot: satrec.mdot,
            no: satrec.no,
            nodeo: satrec.nodeo,
            nodedot: satrec.nodedot,
            xpidot,
            z1,
            z3,
            z11,
            z13,
            z21,
            z23,
            z31,
            z33,
            ecco: satrec.ecco,
            eccsq,
            em,
            argpm,
            inclm,
            mm,
            nm,
            nodem,
            irez: satrec.irez,
            atime: satrec.atime,
            d2201: satrec.d2201,
            d2211: satrec.d2211,
            d3210: satrec.d3210,
            d3222: satrec.d3222,
            d4410: satrec.d4410,
            d4422: satrec.d4422,
            d5220: satrec.d5220,
            d5232: satrec.d5232,
            d5421: satrec.d5421,
            d5433: satrec.d5433,
            dedt: satrec.dedt,
            didt: satrec.didt,
            dmdt: satrec.dmdt,
            dnodt: satrec.dnodt,
            domdt: satrec.domdt,
            del1: satrec.del1,
            del2: satrec.del2,
            del3: satrec.del3,
            xfact: satrec.xfact,
            xlamo: satrec.xlamo,
            xli: satrec.xli,
            xni: satrec.xni,
          };

          const dsinitResult = dsinit(dsinitOptions);

          satrec.irez = dsinitResult.irez;
          satrec.atime = dsinitResult.atime;
          satrec.d2201 = dsinitResult.d2201;
          satrec.d2211 = dsinitResult.d2211;

          satrec.d3210 = dsinitResult.d3210;
          satrec.d3222 = dsinitResult.d3222;
          satrec.d4410 = dsinitResult.d4410;
          satrec.d4422 = dsinitResult.d4422;
          satrec.d5220 = dsinitResult.d5220;

          satrec.d5232 = dsinitResult.d5232;
          satrec.d5421 = dsinitResult.d5421;
          satrec.d5433 = dsinitResult.d5433;
          satrec.dedt = dsinitResult.dedt;
          satrec.didt = dsinitResult.didt;

          satrec.dmdt = dsinitResult.dmdt;
          satrec.dnodt = dsinitResult.dnodt;
          satrec.domdt = dsinitResult.domdt;
          satrec.del1 = dsinitResult.del1;

          satrec.del2 = dsinitResult.del2;
          satrec.del3 = dsinitResult.del3;
          satrec.xfact = dsinitResult.xfact;
          satrec.xlamo = dsinitResult.xlamo;
          satrec.xli = dsinitResult.xli;

          satrec.xni = dsinitResult.xni;
        }

        // ----------- set variables if not deep space -----------
        if (satrec.isimp !== 1) {
          cc1sq = satrec.cc1 * satrec.cc1;
          satrec.d2 = 4.0 * ao * tsi * cc1sq;
          temp = (satrec.d2 * tsi * satrec.cc1) / 3.0;
          satrec.d3 = ((17.0 * ao) + sfour) * temp;
          satrec.d4 = 0.5 * temp * ao * tsi * ((221.0 * ao) + (31.0 * sfour)) * satrec.cc1;
          satrec.t3cof = satrec.d2 + (2.0 * cc1sq);
          satrec.t4cof = 0.25 * ((3.0 * satrec.d3) +
          (satrec.cc1 * ((12.0 * satrec.d2) + (10.0 * cc1sq))));
          satrec.t5cof = 0.2 * (
            (3.0 * satrec.d4) +
            (12.0 * satrec.cc1 * satrec.d3) +
            (6.0 * satrec.d2 * satrec.d2) +
            (15.0 * cc1sq * ((2.0 * satrec.d2) + cc1sq))
          );
        }

        /* finally propogate to zero epoch to initialize all others. */
        // sgp4fix take out check to let satellites process until they are actually below earth surface
        // if(satrec.error == 0)
      }

      sgp4(satrec, 0, 0);

      satrec.init = 'n';

      /* eslint-enable no-param-reassign */
    }
  sgp4 = function (satrec, tsince) {
      /* eslint-disable no-param-reassign */

      let coseo1;
      let sineo1;
      let cosip;
      let sinip;
      let cosisq;
      let delm;
      let delomg;
      let eo1;
      let argpm;
      let argpp;
      let su;
      let t3;
      let t4;
      let tc;
      let tem5;
      let temp;
      let tempa;
      let tempe;
      let templ;
      let inclm;
      let mm;
      let nm;
      let nodem;
      let xincp;
      let xlm;
      let mp;
      let nodep;

      /* ------------------ set mathematical constants --------------- */
      // sgp4fix divisor for divide by zero check on inclination
      // the old check used 1.0 + cos(pi-1.0e-9), but then compared it to
      // 1.5 e-12, so the threshold was changed to 1.5e-12 for consistency

      const temp4 = 1.5e-12;

      const vkmpersec = (earthRadius * xke) / 60.0;

      // --------------------- clear sgp4 error flag -----------------
      satrec.t = tsince;
      satrec.error = 0;

      //  ------- update for secular gravity and atmospheric drag -----
      const xmdf = satrec.mo + (satrec.mdot * satrec.t);
      const argpdf = satrec.argpo + (satrec.argpdot * satrec.t);
      const nodedf = satrec.nodeo + (satrec.nodedot * satrec.t);
      argpm = argpdf;
      mm = xmdf;
      const t2 = satrec.t * satrec.t;
      nodem = nodedf + (satrec.nodecf * t2);
      tempa = 1.0 - (satrec.cc1 * satrec.t);
      tempe = satrec.bstar * satrec.cc4 * satrec.t;
      templ = satrec.t2cof * t2;

      if (satrec.isimp !== 1) {
        delomg = satrec.omgcof * satrec.t;
        //  sgp4fix use mutliply for speed instead of pow
        const delmtemp = 1.0 + (satrec.eta * Math.cos(xmdf));
        delm = satrec.xmcof * ((delmtemp * delmtemp * delmtemp) - satrec.delmo);
        temp = delomg + delm;
        mm = xmdf + temp;
        argpm = argpdf - temp;
        t3 = t2 * satrec.t;
        t4 = t3 * satrec.t;
        tempa = tempa - (satrec.d2 * t2) - (satrec.d3 * t3) - (satrec.d4 * t4);
        tempe += satrec.bstar * satrec.cc5 * (Math.sin(mm) - satrec.sinmao);
        templ = templ + (satrec.t3cof * t3) + (t4 * (satrec.t4cof + (satrec.t * satrec.t5cof)));
      }
      nm = satrec.no;
      let em = satrec.ecco;
      inclm = satrec.inclo;
      if (satrec.method === 'd') {
        tc = satrec.t;

        const dspaceOptions = {
          irez: satrec.irez,
          d2201: satrec.d2201,
          d2211: satrec.d2211,
          d3210: satrec.d3210,
          d3222: satrec.d3222,
          d4410: satrec.d4410,
          d4422: satrec.d4422,
          d5220: satrec.d5220,
          d5232: satrec.d5232,
          d5421: satrec.d5421,
          d5433: satrec.d5433,
          dedt: satrec.dedt,
          del1: satrec.del1,
          del2: satrec.del2,
          del3: satrec.del3,
          didt: satrec.didt,
          dmdt: satrec.dmdt,
          dnodt: satrec.dnodt,
          domdt: satrec.domdt,
          argpo: satrec.argpo,
          argpdot: satrec.argpdot,
          t: satrec.t,
          tc,
          gsto: satrec.gsto,
          xfact: satrec.xfact,
          xlamo: satrec.xlamo,
          no: satrec.no,
          atime: satrec.atime,
          em,
          argpm,
          inclm,
          xli: satrec.xli,
          mm,
          xni: satrec.xni,
          nodem,
          nm,
        };

        const dspaceResult = dspace(dspaceOptions);

        ({
          em,
          argpm,
          inclm,
          mm,
          nodem,
          nm,
        } = dspaceResult);
      }

      if (nm <= 0.0) {
        // printf("// error nm %f\n", nm);
        satrec.error = 2;
        // sgp4fix add return
        return [false, false];
      }

      const am = ((xke / nm) ** x2o3) * tempa * tempa;
      nm = xke / (am ** 1.5);
      em -= tempe;

      // fix tolerance for error recognition
      // sgp4fix am is fixed from the previous nm check
      if (em >= 1.0 || em < -0.001) { // || (am < 0.95)
        // printf("// error em %f\n", em);
        satrec.error = 1;
        // sgp4fix to return if there is an error in eccentricity
        return [false, false];
      }

      //  sgp4fix fix tolerance to avoid a divide by zero
      if (em < 1.0e-6) {
        em = 1.0e-6;
      }
      mm += satrec.no * templ;
      xlm = mm + argpm + nodem;

      nodem %= twoPi;
      argpm %= twoPi;
      xlm %= twoPi;
      mm = (xlm - argpm - nodem) % twoPi;

      // ----------------- compute extra mean quantities -------------
      const sinim = Math.sin(inclm);
      const cosim = Math.cos(inclm);

      // -------------------- add lunar-solar periodics --------------
      let ep = em;
      xincp = inclm;
      argpp = argpm;
      nodep = nodem;
      mp = mm;
      sinip = sinim;
      cosip = cosim;
      if (satrec.method === 'd') {
        const dpperParameters = {
          inclo: satrec.inclo,
          init: 'n',
          ep,
          inclp: xincp,
          nodep,
          argpp,
          mp,
          opsmode: satrec.operationmod,
        };

        const dpperResult = dpper(satrec, dpperParameters);

        ({
          ep,
          nodep,
          argpp,
          mp,
        } = dpperResult);

        xincp = dpperResult.inclp;

        if (xincp < 0.0) {
          xincp = -xincp;
          nodep += pi;
          argpp -= pi;
        }
        if (ep < 0.0 || ep > 1.0) {
          //  printf("// error ep %f\n", ep);
          satrec.error = 3;
          //  sgp4fix add return
          return [false, false];
        }
      }

      //  -------------------- long period periodics ------------------
      if (satrec.method === 'd') {
        sinip = Math.sin(xincp);
        cosip = Math.cos(xincp);
        satrec.aycof = -0.5 * j3oj2 * sinip;

        //  sgp4fix for divide by zero for xincp = 180 deg
        if (Math.abs(cosip + 1.0) > 1.5e-12) {
          satrec.xlcof = (-0.25 * j3oj2 * sinip * (3.0 + (5.0 * cosip))) / (1.0 + cosip);
        } else {
          satrec.xlcof = (-0.25 * j3oj2 * sinip * (3.0 + (5.0 * cosip))) / temp4;
        }
      }

      const axnl = ep * Math.cos(argpp);
      temp = 1.0 / (am * (1.0 - (ep * ep)));
      const aynl = (ep * Math.sin(argpp)) + (temp * satrec.aycof);
      const xl = mp + argpp + nodep + (temp * satrec.xlcof * axnl);

      // --------------------- solve kepler's equation ---------------
      const u = (xl - nodep) % twoPi;
      eo1 = u;
      tem5 = 9999.9;
      let ktr = 1;

      //    sgp4fix for kepler iteration
      //    the following iteration needs better limits on corrections
      while (Math.abs(tem5) >= 1.0e-12 && ktr <= 10) {
        sineo1 = Math.sin(eo1);
        coseo1 = Math.cos(eo1);
        tem5 = 1.0 - (coseo1 * axnl) - (sineo1 * aynl);
        tem5 = (((u - (aynl * coseo1)) + (axnl * sineo1)) - eo1) / tem5;
        if (Math.abs(tem5) >= 0.95) {
          if (tem5 > 0.0) {
            tem5 = 0.95;
          } else {
            tem5 = -0.95;
          }
        }
        eo1 += tem5;
        ktr += 1;
      }

      //  ------------- short period preliminary quantities -----------
      const ecose = (axnl * coseo1) + (aynl * sineo1);
      const esine = (axnl * sineo1) - (aynl * coseo1);
      const el2 = (axnl * axnl) + (aynl * aynl);
      const pl = am * (1.0 - el2);
      if (pl < 0.0) {
        //  printf("// error pl %f\n", pl);
        satrec.error = 4;
        //  sgp4fix add return
        return [false, false];
      }

      const rl = am * (1.0 - ecose);
      const rdotl = (Math.sqrt(am) * esine) / rl;
      const rvdotl = Math.sqrt(pl) / rl;
      const betal = Math.sqrt(1.0 - el2);
      temp = esine / (1.0 + betal);
      const sinu = (am / rl) * (sineo1 - aynl - (axnl * temp));
      const cosu = (am / rl) * ((coseo1 - axnl) + (aynl * temp));
      su = Math.atan2(sinu, cosu);
      const sin2u = (cosu + cosu) * sinu;
      const cos2u = 1.0 - (2.0 * sinu * sinu);
      temp = 1.0 / pl;
      const temp1 = 0.5 * j2 * temp;
      const temp2 = temp1 * temp;

      // -------------- update for short period periodics ------------
      if (satrec.method === 'd') {
        cosisq = cosip * cosip;
        satrec.con41 = (3.0 * cosisq) - 1.0;
        satrec.x1mth2 = 1.0 - cosisq;
        satrec.x7thm1 = (7.0 * cosisq) - 1.0;
      }

      const mrt = (rl * (1.0 - (1.5 * temp2 * betal * satrec.con41))) +
      (0.5 * temp1 * satrec.x1mth2 * cos2u);
      su -= 0.25 * temp2 * satrec.x7thm1 * sin2u;
      const xnode = nodep + (1.5 * temp2 * cosip * sin2u);
      const xinc = xincp + (1.5 * temp2 * cosip * sinip * cos2u);
      const mvt = rdotl - ((nm * temp1 * satrec.x1mth2 * sin2u) / xke);
      const rvdot = rvdotl + ((nm * temp1 * ((satrec.x1mth2 * cos2u) + (1.5 * satrec.con41))) / xke);

      // --------------------- orientation vectors -------------------
      const sinsu = Math.sin(su);
      const cossu = Math.cos(su);
      const snod = Math.sin(xnode);
      const cnod = Math.cos(xnode);
      const sini = Math.sin(xinc);
      const cosi = Math.cos(xinc);
      const xmx = -snod * cosi;
      const xmy = cnod * cosi;
      const ux = (xmx * sinsu) + (cnod * cossu);
      const uy = (xmy * sinsu) + (snod * cossu);
      const uz = sini * sinsu;
      const vx = (xmx * cossu) - (cnod * sinsu);
      const vy = (xmy * cossu) - (snod * sinsu);
      const vz = sini * cossu;

      // --------- position and velocity (in km and km/sec) ----------
      const r = {
        x: (mrt * ux) * earthRadius,
        y: (mrt * uy) * earthRadius,
        z: (mrt * uz) * earthRadius,
      };
      const v = {
        x: ((mvt * ux) + (rvdot * vx)) * vkmpersec,
        y: ((mvt * uy) + (rvdot * vy)) * vkmpersec,
        z: ((mvt * uz) + (rvdot * vz)) * vkmpersec,
      };

      // sgp4fix for decaying satellites
      if (mrt < 1.0) {
        // printf("// decay condition %11.6f \n",mrt);
        satrec.error = 6;
        return {
          position: false,
          velocity: false,
        };
      }

      return {
        position: r,
        velocity: v,
      };

      /* eslint-enable no-param-reassign */
    }
  twoline2satrec = function (longstr1, longstr2) {
    const opsmode = 'i';
    const xpdotp = 1440.0 / (2.0 * pi); // 229.1831180523293;
    let year = 0;

    const satrec = {};
    satrec.error = 0;

    satrec.satnum = longstr1.substring(2, 7);

    satrec.epochyr = parseInt(longstr1.substring(18, 20), 10);
    satrec.epochdays = parseFloat(longstr1.substring(20, 32));
    satrec.ndot = parseFloat(longstr1.substring(33, 43));
    satrec.nddot = parseFloat(
      `.${parseInt(longstr1.substring(44, 50), 10)
      }E${longstr1.substring(50, 52)}`,
    );
    satrec.bstar = parseFloat(
      `${longstr1.substring(53, 54)
      }.${parseInt(longstr1.substring(54, 59), 10)
      }E${longstr1.substring(59, 61)}`,
    );

    // satrec.satnum = longstr2.substring(2, 7);
    satrec.inclo = parseFloat(longstr2.substring(8, 16));
    satrec.nodeo = parseFloat(longstr2.substring(17, 25));
    satrec.ecco = parseFloat(`.${longstr2.substring(26, 33)}`);
    satrec.argpo = parseFloat(longstr2.substring(34, 42));
    satrec.mo = parseFloat(longstr2.substring(43, 51));
    satrec.no = parseFloat(longstr2.substring(52, 63));

    // ---- find no, ndot, nddot ----
    satrec.no /= xpdotp; //   rad/min
    // satrec.nddot= satrec.nddot * Math.pow(10.0, nexp);
    // satrec.bstar= satrec.bstar * Math.pow(10.0, ibexp);

    // ---- convert to sgp4 units ----
    satrec.a = ((satrec.no * tumin) ** (-2.0 / 3.0));
    satrec.ndot /= (xpdotp * 1440.0); // ? * minperday
    satrec.nddot /= (xpdotp * 1440.0 * 1440);

    // ---- find standard orbital elements ----
    satrec.inclo *= deg2rad;
    satrec.nodeo *= deg2rad;
    satrec.argpo *= deg2rad;
    satrec.mo *= deg2rad;

    satrec.alta = (satrec.a * (1.0 + satrec.ecco)) - 1.0;
    satrec.altp = (satrec.a * (1.0 - satrec.ecco)) - 1.0;


    // ----------------------------------------------------------------
    // find sgp4epoch time of element set
    // remember that sgp4 uses units of days from 0 jan 1950 (sgp4epoch)
    // and minutes from the epoch (time)
    // ----------------------------------------------------------------

    // ---------------- temp fix for years from 1957-2056 -------------------
    // --------- correct fix will occur when year is 4-digit in tle ---------

    if (satrec.epochyr < 57) {
      year = satrec.epochyr + 2000;
    } else {
      year = satrec.epochyr + 1900;
    }

    const mdhmsResult = days2mdhms(year, satrec.epochdays);

    const {
      mon,
      day,
      hr,
      minute,
      sec,
    } = mdhmsResult;
    satrec.jdsatepoch = jday(year, mon, day, hr, minute, sec);

    //  ---------------- initialize the orbit at sgp4epoch -------------------
    sgp4init(satrec, {
      opsmode,
      satn: satrec.satnum,
      epoch: satrec.jdsatepoch - 2433281.5,
      xbstar: satrec.bstar,
      xecco: satrec.ecco,
      xargpo: satrec.argpo,
      xinclo: satrec.inclo,
      xmo: satrec.mo,
      xno: satrec.no,
      xnodeo: satrec.nodeo,
    });

    return satrec;
  }

  satellite.days2mdhms = days2mdhms;
  satellite.degreesLat = degreesLat;
  satellite.degreesLong = degreesLong;
  satellite.dscom = dscom;
  satellite.dsinit = dsinit;
  satellite.dspace = dspace;
  satellite.dopplerFactor = dopplerFactor;
  satellite.dpper = dpper;
  satellite.eciToGeodetic = eciToGeodetic;
  satellite.ecfToEci = ecfToEci;
  satellite.eciToEcf = eciToEcf;
  satellite.ecfToLookAngles = ecfToLookAngles;
  satellite.geodeticToEcf = geodeticToEcf;
  satellite.gstime = gstime;
  satellite.gstimeFromJday = gstimeFromJday;
  satellite.gstimeFromDate = gstimeFromDate;
  satellite.initl = initl;
  satellite.invjday = invjday;
  satellite.jday = jday;
  satellite.propagate = propagate;
  satellite.sgp4init = sgp4init;
  satellite.sgp4 = sgp4;
  satellite.twoline2satrec = twoline2satrec;
})();
