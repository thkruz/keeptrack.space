/**
 * @!format -- DONT FORMAT THIS YET
 */
/* eslint-disable no-unused-vars */
import { GPU } from '@app/js/lib/gpu-browser.min.js';
import { satellite } from '@app/js/lookangles.js';
import { settingsManager } from '@app/js/keeptrack-head.js';

const MINUTES_PER_DAY = 1440;
let gM = {};
gM.kern = {};
gM.transforms = {};
gM.settings = {};
gM.settings.steps = 16;
gM.settings.batchSize = 5;

gM.gpu = new GPU({
  mode: settingsManager.gpujsMode
});

gM.transforms.satrec = (satrec) => {
  let satrecArray = [];
  let i = 0;
  for (var key in satrec) {    
    if (Object.prototype.hasOwnProperty.call(satrec, key)) {
      if (key == 'method') {
        let num = (satrec[key] == 'd') ? 1 : 0;
        satrecArray.push(num);
        i++;
        continue;
      }
      if (key == 'init') {
        let num = (satrec[key] == 'y') ? 1 : 0;
        satrecArray.push(num);
        i++;
        continue;
      }
      if (key == 'operationmode') {
        let num = (satrec[key] == 'i') ? 1 : 0;
        satrecArray.push(num);
        i++;
        continue;
      }
      if (key == 'satnum') {
        satrecArray.push(parseInt(satrec[key]));
        i++;
        continue;
      }
      // If None of the above
      satrecArray.push(satrec[key]);
      i++;
      continue;
    }
  }
  while (i < 100) {
    satrecArray.push(0);
    i++;
  }
  return satrecArray;
};

// gM.getSat = (posArray, satnum) => {
//   let id = satSet.sccIndex[satnum];
//   let x = posArray[id*4+1][0][0];
//   let y = posArray[id*4+2][0][0];
//   let z = posArray[id*4+3][0][0];
//   console.log(`${x}, ${y}, ${z}`);
// }

gM.satrecSetup = (numOfSats,offset, now, satData) => {
  // let satData = satSet.getSatData();

  now = (now) ? now : new Date();
  offset = (offset) ? offset : 0;

  var j = jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
  );
  j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond

  let gpuSatRecList = [];
  let timeList = [];
  let satrec;
  for (var i = offset; i < offset + numOfSats; i++) {
    satrec = satellite.twoline2satrec(satData[i].TLE1,satData[i].TLE2);
    // if (satrec.satnum == "39208") debugger
    gpuSatRecList.push(
      gM.transforms.satrec(satrec)
    );

    timeList.push((j - satrec.jdsatepoch) * MINUTES_PER_DAY);
  }
  return [gpuSatRecList,timeList];
};

gM.funcs = {};
gM.funcs.sgp4 = (numOfSats,stepSize) => {
  console.time("gM.funcs.sgp4");
  let resArray = [];
  let res;
  let now = new Date();
  let s = 0;
  let satrecList,tsinceList;
  while (s < numOfSats) {
    let satStartIndex = s;
    let satBatchSize = gM.settings.batchSize;
    if (satStartIndex + gM.settings.batchSize > numOfSats) {
      satBatchSize = numOfSats - satStartIndex;
    }
    s += satBatchSize;

    [satrecList,tsinceList] = gM.satrecSetup(satBatchSize,satStartIndex, now);
    gM.kern.sgp4.setOutput([4,gM.settings.steps,satrecList.length]);
    // [j][t,x,y,z,xdot,ydot,zdot][id]
    try {
      res = gM.kern.sgp4(satrecList,tsinceList,stepSize);
    } catch (e) {
      console.log(s);
      console.debug(e);
    }
    resArray = resArray.concat(res);
  }

  console.timeEnd("gM.funcs.sgp4");
  return resArray;
  // resArray[t,x,y,z][time][batch]
}
gM.funcs.sgp42 = (numOfSats,propLength) => {
  // if (satrecList > 100) 'Max 100 satellites at a time!';
  // if (propLength > 60*1440*2) 'Max Two Day Propagation';
  // if (satrecList.length !== tsinceList.length) throw 'Parameters must be same length!';

  let batches = Math.floor(numOfSats / 50);
  let lastBatchSats = numOfSats % 50;
  let tArray = [];
  let xArray = [];
  let yArray = [];
  let zArray = [];
  for (var b = 0; b <= batches; b++) {
    let t = [];
    let x = [];
    let y = [];
    let z = [];
    let satrecList,tsinceList;
    if (b == batches) { // If Last Batch
      if (lastBatchSats == 0) break;
      [satrecList,tsinceList] = gM.satrecSetup(lastBatchSats,b*50);
    } else {
      [satrecList,tsinceList] = gM.satrecSetup(50,b*50);
    }
    gM.kern.sgp4.setOutput([satrecList.length,propLength,4]);
    // [j][t,x,y,z,xdot,ydot,zdot][id]
    // try {
      [t, x, y, z] = gM.kern.sgp4(satrecList,tsinceList);
    // } catch {
      // debugger
    // }
    tArray = tArray.concat(t);
    xArray = xArray.concat(x);
    yArray = yArray.concat(y);
    zArray = zArray.concat(z);
  }

  return xArray;
}

// SGP4 Of Satellites At Same Time Advanced by PropTime
gM.kern.sgp4 = gM.gpu.createKernel( function(satrecList,tsinceList,stepSize) {
  let t = tsinceList[this.thread.z] + (stepSize * this.thread.y / 60); // per Second
  if (this.thread.x == 0) return t;

  let pi = 3.141592653589793;
  let x2o3 = 2.0 / 3.0;
  let j2 = 0.00108262998905;
  let j3 = -0.00000253215306;
  let j4 = -0.00000161098761;
  let earthRadius = 6378.137; // in km
  let twoPi = pi * 2;
  let deg2rad = pi / 180.0;
  let rad2deg = 180 / pi;
  let minutesPerDay = 1440.0;
  let mu = 398600.5; // in km3 / s2
  let xke = 60.0 / Math.sqrt((earthRadius * earthRadius * earthRadius) / mu);
  let tumin = 1.0 / xke;
  let j3oj2 = j3 / j2;

  var am = 0;
  var axnl = 0;
  var aynl = 0;
  var betal = 0;
  var cosim = 0;
  var sinim = 0;
  var cnod = 0;
  var snod = 0;
  var cos2u = 0;
  var sin2u = 0;
  var coseo1 = 0;
  var sineo1 = 0;
  var cosi = 0;
  var sini = 0;
  var cosip = 0;
  var sinip = 0;
  var cosisq = 0;
  var cossu = 0;
  var sinsu = 0;
  var cosu = 0;
  var sinu = 0;
  var delm = 0;
  var delomg = 0;
  var dndt = 0;
  var emsq = 0;
  var ecose = 0;
  var el2 = 0;
  var eo1 = 0;
  var esine = 0;
  var argpm = 0;
  var argpp = 0;
  var pl = 0;
  var rl = 0;
  var rvdot = 0;
  var rvdotl = 0;
  var su = 0;
  var t2 = 0;
  var t3 = 0;
  var t4 = 0;
  var tc = 0;
  var tem5 = 0;
  var tempvar = 0;
  var temp1 = 0;
  var temp2 = 0;
  var tempa = 0;
  var tempe = 0;
  var templ = 0;
  var u = 0;
  var ux = 0;
  var uy = 0;
  var uz = 0;
  var vx = 0;
  var vy = 0;
  var vz = 0;
  var inclm = 0;
  var mm = 0;
  var nm = 0;
  var nodem = 0;
  var xinc = 0;
  var xincp = 0;
  var xl = 0;
  var xlm = 0;
  var mp = 0;
  var xmdf = 0;
  var xmx = 0;
  var xmy = 0;
  var vnodedf = 0;
  var xnode = 0;
  var nodep = 0;
  let mrt = 0.0;
  var temp = 0;
  var r0 = 0;
  var r1 = 0;
  var r2 = 0;
  var v0 = 0;
  var v1 = 0;
  var v2 = 0;
  var aycof = satrecList[this.thread.z][18];
  var xlcof = satrecList[this.thread.z][40];
  var con41 = satrecList[this.thread.z][19];
  var x1mth2 = satrecList[this.thread.z][36];
  var x7thm1 = satrecList[this.thread.z][37];

  //  ------- update for secular gravity and atmospheric drag -----
  xmdf = satrecList[this.thread.z][10] + satrecList[this.thread.z][38] * t;
  let argpdf = satrecList[this.thread.z][9] + satrecList[this.thread.z][28] * t;
  let nodedf = satrecList[this.thread.z][7] + satrecList[this.thread.z][39] * t;
  argpm = argpdf;
  mm = xmdf;
  t2 = t * t;
  nodem = nodedf + satrecList[this.thread.z][42] * t2;
  tempa = 1.0 - satrecList[this.thread.z][20] * t;
  tempe = satrecList[this.thread.z][5] * satrecList[this.thread.z][21] * t;
  templ = satrecList[this.thread.z][32] * t2;

  if (satrecList[this.thread.z][16] !== 1) {
      delomg = satrecList[this.thread.z][29] * t;
      //  sgp4fix use mutliply for speed instead of pow
      var delmtemp = 1.0 + satrecList[this.thread.z][27] * Math.cos(xmdf);
      delm =
          satrecList[this.thread.z][41] *
          (delmtemp * delmtemp * delmtemp - satrecList[this.thread.z][26]);
      temp = delomg + delm;
      mm = xmdf + temp;
      argpm = argpdf - temp;
      t3 = t2 * t;
      t4 = t3 * t;
      tempa =
          tempa - satrecList[this.thread.z][23] * t2 - satrecList[this.thread.z][24] * t3 - satrecList[this.thread.z][25] * t4;
      tempe =
          tempe +
          satrecList[this.thread.z][5] * satrecList[this.thread.z][22] * (Math.sin(mm) - satrecList[this.thread.z][30]);
      templ =
          templ +
          satrecList[this.thread.z][33] * t3 +
          t4 * (satrecList[this.thread.z][34] + t * satrecList[this.thread.z][35]);
  }
  nm = satrecList[this.thread.z][11];
  var em = satrecList[this.thread.z][8];
  inclm = satrecList[this.thread.z][6];
  if (satrecList[this.thread.z][17] === 1) {
      tc = t;

      var irez = satrecList[this.thread.z][46];
      var d2201 = satrecList[this.thread.z][47];
      var d2211 = satrecList[this.thread.z][48];
      var d3210 = satrecList[this.thread.z][49];
      var d3222 = satrecList[this.thread.z][50];
      var d4410 = satrecList[this.thread.z][51];
      var d4422 = satrecList[this.thread.z][52];
      var d5220 = satrecList[this.thread.z][53];
      var d5232 = satrecList[this.thread.z][54];
      var d5421 = satrecList[this.thread.z][55];
      var d5433 = satrecList[this.thread.z][56];
      var dedt = satrecList[this.thread.z][57];
      var del1 = satrecList[this.thread.z][58];
      var del2 = satrecList[this.thread.z][59];
      var del3 = satrecList[this.thread.z][60];
      var didt = satrecList[this.thread.z][61];
      var dmdt = satrecList[this.thread.z][62];
      var dnodt = satrecList[this.thread.z][63];
      var domdt = satrecList[this.thread.z][64];
      var argpo = satrecList[this.thread.z][9];
      var argpdot = satrecList[this.thread.z][28];
      var gsto = satrecList[this.thread.z][45];
      var xfact = satrecList[this.thread.z][84];
      var xlamo = satrecList[this.thread.z][95];
      var no = satrecList[this.thread.z][11];
      var atime = satrecList[this.thread.z][98];
      // var em = em;
      var xli = satrecList[this.thread.z][99];
      var xni = satrecList[this.thread.z][100];

      var fasx2 = 0.13130908;
      var fasx4 = 2.8843198;
      var fasx6 = 0.37448087;
      var g22 = 5.7686396;
      var g32 = 0.95240898;
      var g44 = 1.8014998;
      var g52 = 1.050833;
      var g54 = 4.4108898;
      var rptim = 4.37526908801129966e-3; // equates to 7.29211514668855e-5 rad/sec
      var stepp = 720.0;
      var stepn = -720.0;
      var step2 = 259200.0;

      //  ----------- calculate deep space resonance effects -----------
      dndt = 0.0;
      var theta = (gsto + tc * rptim) % twoPi;
      em = em + dedt * t;

      inclm = inclm + didt * t;
      argpm = argpm + domdt * t;
      nodem = nodem + dnodt * t;
      mm = mm + dmdt * t;

      var ft = 0.0;
      if (irez !== 0) {
          //  sgp4fix streamline check
          if (
              atime === 0.0 ||
              t * atime <= 0.0 ||
              Math.abs(t) < Math.abs(atime)
          ) {
              atime = 0.0;
              xni = no;
              xli = xlamo;
          }

          // sgp4fix move check outside loop
          var delt = 0;
          if (t > 0.0) {
              delt = stepp;
          } else {
              delt = stepn;
          }
          var iretn = 381; // added for do loop
          var iret = 0; // added for loop
          var xndt = 0;
          var xldot = 0;
          var xnddt = 0;
          while (iretn === 381) {
              //  ------------------- dot terms calculated -------------
              //  ----------- near - synchronous resonance terms -------
              if (irez !== 2) {
                  xndt =
                      del1 * Math.sin(xli - fasx2) +
                      del2 * Math.sin(2.0 * (xli - fasx4)) +
                      del3 * Math.sin(3.0 * (xli - fasx6));
                  xldot = xni + xfact;
                  xnddt =
                      del1 * Math.cos(xli - fasx2) +
                      2.0 * del2 * Math.cos(2.0 * (xli - fasx4)) +
                      3.0 * del3 * Math.cos(3.0 * (xli - fasx6));
                  xnddt = xnddt * xldot;
              } else {
                  // --------- near - half-day resonance terms --------
                  var xomi = argpo + argpdot * atime;
                  var x2omi = xomi + xomi;
                  var x2li = xli + xli;
                  xndt =
                      d2201 * Math.sin(x2omi + xli - g22) +
                      d2211 * Math.sin(xli - g22) +
                      d3210 * Math.sin(xomi + xli - g32) +
                      d3222 * Math.sin(-xomi + xli - g32) +
                      d4410 * Math.sin(x2omi + x2li - g44) +
                      d4422 * Math.sin(x2li - g44) +
                      d5220 * Math.sin(xomi + xli - g52) +
                      d5232 * Math.sin(-xomi + xli - g52) +
                      d5421 * Math.sin(xomi + x2li - g54) +
                      d5433 * Math.sin(-xomi + x2li - g54);
                  xldot = xni + xfact;
                  xnddt =
                      d2201 * Math.cos(x2omi + xli - g22) +
                      d2211 * Math.cos(xli - g22) +
                      d3210 * Math.cos(xomi + xli - g32) +
                      d3222 * Math.cos(-xomi + xli - g32) +
                      d5220 * Math.cos(xomi + xli - g52) +
                      d5232 * Math.cos(-xomi + xli - g52) +
                      2.0 *
                          (d4410 * Math.cos(x2omi + x2li - g44) +
                              d4422 * Math.cos(x2li - g44) +
                              d5421 * Math.cos(xomi + x2li - g54) +
                              d5433 * Math.cos(-xomi + x2li - g54));
                  xnddt = xnddt * xldot;
              }
              //  ----------------------- integrator -------------------
              //  sgp4fix move end checks to end of routine
              if (Math.abs(t - atime) >= stepp) {
                  iret = 0;
                  iretn = 381;
              } else {
                  ft = t - atime;
                  iretn = 0;
              }
              if (iretn === 381) {
                  xli = xli + xldot * delt + xndt * step2;
                  xni = xni + xndt * delt + xnddt * step2;
                  atime = atime + delt;
              }
          }
          nm = xni + xndt * ft + xnddt * ft * ft * 0.5;
          xl = xli + xldot * ft + xndt * ft * ft * 0.5;
          if (irez !== 1) {
              mm = xl - 2.0 * nodem + 2.0 * theta;
              dndt = nm - no;
          } else {
              mm = xl - nodem - argpm + theta;
              dndt = nm - no;
          }
          nm = no + dndt;
      }
  }

  if (nm <= 0.0) {
      //  printf("// error nm %f\n", nm);
      // satrecList[this.thread.z].error = 2;
      //  sgp4fix add return
      return nm;
  }
  am = Math.pow(xke / nm, x2o3) * tempa * tempa;
  nm = xke / Math.pow(am, 1.5);
  em = em - tempe;

  //  fix tolerance for error recognition
  //  sgp4fix am is fixed from the previous nm check
  if (em >= 1.0 || em < -0.001) {
      // || (am < 0.95)
      //  printf("// error em %f\n", em);
      // satrecList[this.thread.z].error = 1;
      //  sgp4fix to return if there is an error in eccentricity
      return -401;
  }
  //  sgp4fix fix tolerance to avoid a divide by zero
  if (em < 1.0e-6) {
      em = 1.0e-6;
  }
  mm = mm + satrecList[this.thread.z][11] * templ;
  xlm = mm + argpm + nodem;
  emsq = em * em;
  temp = 1.0 - emsq;

  nodem = nodem % twoPi;
  argpm = argpm % twoPi;
  xlm = xlm % twoPi;
  mm = (xlm - argpm - nodem) % twoPi;

  //  ----------------- compute extra mean quantities -------------
  sinim = Math.sin(inclm);
  cosim = Math.cos(inclm);

  //  -------------------- add lunar-solar periodics --------------
  var ep = em;
  xincp = inclm;
  argpp = argpm;
  nodep = nodem;
  mp = mm;
  sinip = sinim;
  cosip = cosim;
  if (satrecList[this.thread.z][17] === 1) {
      var init = 0;
      var opsmode = satrecList[this.thread.z][43];

      // Copy satellite attributes into local variables for convenience
      // and symmetry in writing formulae.
      var alfdp = 0;
      var betdp = 0;
      var cosop = 0;
      var sinop = 0;
      var dalf = 0;
      var dbet = 0;
      var dls = 0;
      var f2 = 0;
      var f3 = 0;
      var pe = 0;
      var pgh = 0;
      var ph = 0;
      var pinc = 0;
      var sel = 0;
      var ses = 0;
      var sghl = 0;
      var vsghs = 0;
      var vshs = 0;
      var sil = 0;
      var sinzf = 0;
      var sis = 0;
      var sll = 0;
      var sls = 0;
      var xls = 0;
      var xnoh = 0;
      var zf = 0;
      var zm = 0;
      var shll = 0;

      var e3 = satrecList[this.thread.z][65];
      var ee2 = satrecList[this.thread.z][66];
      var peo = satrecList[this.thread.z][67];
      var pgho = satrecList[this.thread.z][68];
      var pho = satrecList[this.thread.z][69];
      var pinco = satrecList[this.thread.z][70];
      var plo = satrecList[this.thread.z][71];
      var se2 = satrecList[this.thread.z][72];
      var se3 = satrecList[this.thread.z][73];
      var sgh2 = satrecList[this.thread.z][74];
      var sgh3 = satrecList[this.thread.z][75];
      var sgh4 = satrecList[this.thread.z][76];
      var sh2 = satrecList[this.thread.z][77];
      var sh3 = satrecList[this.thread.z][78];
      var si2 = satrecList[this.thread.z][79];
      var si3 = satrecList[this.thread.z][80];
      var sl2 = satrecList[this.thread.z][81];
      var sl3 = satrecList[this.thread.z][82];
      var sl4 = satrecList[this.thread.z][83];
      t = satrecList[this.thread.z][31];
      var xgh2 = satrecList[this.thread.z][85];
      var xgh3 = satrecList[this.thread.z][86];
      var xgh4 = satrecList[this.thread.z][87];
      var xh2 = satrecList[this.thread.z][88];
      var xh3 = satrecList[this.thread.z][89];
      var xi2 = satrecList[this.thread.z][90];
      var xi3 = satrecList[this.thread.z][91];
      var xl2 = satrecList[this.thread.z][92];
      var xl3 = satrecList[this.thread.z][93];
      var xl4 = satrecList[this.thread.z][94];
      var zmol = satrecList[this.thread.z][96];
      var zmos = satrecList[this.thread.z][97];

      //  ---------------------- constants -----------------------------
      var zns = 1.19459e-5;
      var zes = 0.01675;
      var znl = 1.5835218e-4;
      var zel = 0.0549;

      //  --------------- calculate time varying periodics -----------
      zm = zmos + zns * t;
      // be sure that the initial call has time set to zero
      if (init === 1) {
          zm = zmos;
      }
      zf = zm + 2.0 * zes * Math.sin(zm);
      sinzf = Math.sin(zf);
      f2 = 0.5 * sinzf * sinzf - 0.25;
      f3 = -0.5 * sinzf * Math.cos(zf);
      ses = se2 * f2 + se3 * f3;
      sis = si2 * f2 + si3 * f3;
      sls = sl2 * f2 + sl3 * f3 + sl4 * sinzf;
      var sghs = sgh2 * f2 + sgh3 * f3 + sgh4 * sinzf;
      var shs = sh2 * f2 + sh3 * f3;
      zm = zmol + znl * t;
      if (init === 1) {
          zm = zmol;
      }

      zf = zm + 2.0 * zel * Math.sin(zm);
      sinzf = Math.sin(zf);
      f2 = 0.5 * sinzf * sinzf - 0.25;
      f3 = -0.5 * sinzf * Math.cos(zf);
      sel = ee2 * f2 + e3 * f3;
      sil = xi2 * f2 + xi3 * f3;
      sll = xl2 * f2 + xl3 * f3 + xl4 * sinzf;
      sghl = xgh2 * f2 + xgh3 * f3 + xgh4 * sinzf;
      shll = xh2 * f2 + xh3 * f3;
      pe = ses + sel;
      pinc = sis + sil;
      pl = sls + sll;
      pgh = sghs + sghl;
      ph = shs + shll;

      if (init === 0) {
          pe = pe - peo;
          pinc = pinc - pinco;
          pl = pl - plo;
          pgh = pgh - pgho;
          ph = ph - pho;
          xincp = xincp + pinc;
          ep = ep + pe;
          sinip = Math.sin(xincp);
          cosip = Math.cos(xincp);

          if (xincp >= 0.2) {
              ph = ph / sinip;
              pgh = pgh - cosip * ph;
              argpp = argpp + pgh;
              nodep = nodep + ph;
              mp = mp + pl;
          } else {
              //  ---- apply periodics with lyddane modification ----
              sinop = Math.sin(nodep);
              cosop = Math.cos(nodep);
              alfdp = sinip * sinop;
              betdp = sinip * cosop;
              dalf = ph * cosop + pinc * cosip * sinop;
              dbet = -ph * sinop + pinc * cosip * cosop;
              alfdp = alfdp + dalf;
              betdp = betdp + dbet;
              nodep = nodep % twoPi;
              //  sgp4fix for afspc written intrinsic functions
              //  nodep used without a trigonometric function ahead
              if (nodep < 0.0 && opsmode === 0) {
                  nodep = nodep + twoPi;
              }
              xls = mp + argpp + cosip * nodep;
              dls = pl + pgh - pinc * nodep * sinip;
              xls = xls + dls;
              xnoh = nodep;
              nodep = Math.atan2(alfdp, betdp);
              //  sgp4fix for afspc written intrinsic functions
              //  nodep used without a trigonometric function ahead
              if (nodep < 0.0 && opsmode === 0) {
                  nodep = nodep + twoPi;
              }
              if (Math.abs(xnoh - nodep) > pi) {
                  if (nodep < xnoh) {
                      nodep = nodep + twoPi;
                  } else {
                      nodep = nodep - twoPi;
                  }
              }
              mp = mp + pl;
              argpp = xls - mp - cosip * nodep;
          }
      }

      if (xincp < 0.0) {
          xincp = -xincp;
          nodep = nodep + pi;
          argpp = argpp - pi;
      }
      if (ep < 0.0 || ep > 1.0) {
          // satrecList[this.thread.z].error = 3;
          //  sgp4fix add return
          return -402;
      }
  }
  //  -------------------- long period periodics ------------------
  if (satrecList[this.thread.z][17] === 1) {
      sinip = Math.sin(xincp);
      cosip = Math.cos(xincp);
      aycof = -0.5 * j3oj2 * sinip;
      //  sgp4fix for divide by zero for xincp = 180 deg
      if (Math.abs(cosip + 1.0) > 1.5e-12) {
          xlcof =
              (-0.25 *
                  j3oj2 *
                  sinip *
                  (3.0 + 5.0 * cosip)) /
              (1.0 + cosip);
      } else {
          xlcof =
              (-0.25 *
                  j3oj2 *
                  sinip *
                  (3.0 + 5.0 * cosip)) /
              1.5e-12;
      }
  }
  axnl = ep * Math.cos(argpp);
  temp = 1.0 / (am * (1.0 - ep * ep));
  aynl = ep * Math.sin(argpp) + temp * aycof;
  xl = mp + argpp + nodep + temp * xlcof * axnl;

  //  --------------------- solve kepler's equation ---------------
  u = (xl - nodep) % twoPi;
  eo1 = u;
  tem5 = 9999.9;
  var ktr = 1;

  //    sgp4fix for kepler iteration
  //    the following iteration needs better limits on corrections
  while (Math.abs(tem5) >= 1.0e-12 && ktr <= 10) {
      sineo1 = Math.sin(eo1);
      coseo1 = Math.cos(eo1);
      tem5 = 1.0 - coseo1 * axnl - sineo1 * aynl;
      tem5 = (u - aynl * coseo1 + axnl * sineo1 - eo1) / tem5;
      if (tem5 > 0.95) {
          tem5 = 0.95;
      } else if (tem5 < -0.95) {
          tem5 = -0.95;
      }
      eo1 = eo1 + tem5;
      ktr = ktr + 1;
  }
  //  ------------- short period preliminary quantities -----------
  ecose = axnl * coseo1 + aynl * sineo1;
  esine = axnl * sineo1 - aynl * coseo1;
  el2 = axnl * axnl + aynl * aynl;
  pl = am * (1.0 - el2);
  if (pl < 0.0) {
      // satrecList[this.thread.z].error = 4;
      //  sgp4fix add return
      return -403;
  } else {
      rl = am * (1.0 - ecose);
      var rdotl = (Math.sqrt(am) * esine) / rl;
      rvdotl = Math.sqrt(pl) / rl;
      betal = Math.sqrt(1.0 - el2);
      temp = esine / (1.0 + betal);
      sinu = (am / rl) * (sineo1 - aynl - axnl * temp);
      cosu = (am / rl) * (coseo1 - axnl + aynl * temp);
      su = Math.atan2(sinu, cosu);
      sin2u = (cosu + cosu) * sinu;
      cos2u = 1.0 - 2.0 * sinu * sinu;
      temp = 1.0 / pl;
      temp1 = 0.5 * j2 * temp;
      temp2 = temp1 * temp;

      //  -------------- update for short period periodics ------------
      if (satrecList[this.thread.z][17] === 1) {
          cosisq = cosip * cosip;
          con41 = 3.0 * cosisq - 1.0;
          x1mth2 = 1.0 - cosisq;
          x7thm1 = 7.0 * cosisq - 1.0;
      }
      mrt =
          rl * (1.0 - 1.5 * temp2 * betal * satrecList[this.thread.z][19]) +
          0.5 * temp1 * satrecList[this.thread.z][36] * cos2u;
      su = su - 0.25 * temp2 * satrecList[this.thread.z][37] * sin2u;
      xnode = nodep + 1.5 * temp2 * cosip * sin2u;
      xinc = xincp + 1.5 * temp2 * cosip * sinip * cos2u;
      var mvt =
          rdotl -
          (nm * temp1 * satrecList[this.thread.z][36] * sin2u) / xke;
      rvdot =
          rvdotl +
          (nm *
              temp1 *
              (satrecList[this.thread.z][36] * cos2u + 1.5 * satrecList[this.thread.z][19])) /
              xke;

      //  --------------------- orientation vectors -------------------
      sinsu = Math.sin(su);
      cossu = Math.cos(su);
      snod = Math.sin(xnode);
      cnod = Math.cos(xnode);
      sini = Math.sin(xinc);
      cosi = Math.cos(xinc);
      xmx = -snod * cosi;
      xmy = cnod * cosi;
      ux = xmx * sinsu + cnod * cossu;
      uy = xmy * sinsu + snod * cossu;
      uz = sini * sinsu;
      vx = xmx * cossu - cnod * sinsu;
      vy = xmy * cossu - snod * sinsu;
      vz = sini * cossu;

      //  --------- position and velocity (in km and km/sec) ----------
      r0 = mrt * ux * earthRadius;
      r1 = mrt * uy * earthRadius;
      r2 = mrt * uz * earthRadius;
      v0 = (mvt * ux + rvdot * vx) * ((earthRadius * xke) / 60.0);
      v1 = (mvt * uy + rvdot * vy) * ((earthRadius * xke) / 60.0);
      v2 = (mvt * uz + rvdot * vz) * ((earthRadius * xke) / 60.0);
  }
  //  sgp4fix for decaying satellites
  if (mrt < 1.0) {
      // satrecList[this.thread.z].error = 6;
      return -404;
  }

  // if (this.thread.y == 0) {
    if (this.thread.x == 1) return r0;
    if (this.thread.x == 2) return r1;
    if (this.thread.x == 3) return r2;
  // } else if (this.thread.y == 1) {
    if (this.thread.x == 4) return v0;
    if (this.thread.x == 5) return v1;
    if (this.thread.x == 6) return v2;
  // }
},{
  dynamicOutput: true,
  output: [10000,7,1]
})

var jday = (year, mon, day, hr, minute, sec) => {
    'use strict';
    return (
        367.0 * year -
        Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) +
        Math.floor((275 * mon) / 9.0) +
        day +
        1721013.5 +
        ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
    );
};

export { gM};