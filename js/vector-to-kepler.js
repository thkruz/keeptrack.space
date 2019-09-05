(function() {
  var vec2kepler = {};

  function arctan2(Ey, Ex) {
    var u;
    var Pi = 3.14159265358979;


    if (Ex != 0)
    {
       u = Math.atan(Ey / Ex);
       if (Ex < 0) {u = u + Pi;}
       if (Ex > 0 && Ey < 0) {u = u + 2 * Pi;}
    }
    else
    {
       if (Ey < 0) {u = -Pi / 2;}
       if (Ey == 0) {u = 0;}
       if (Ey > 0) {u = Pi / 2;}
    }
    return u;
  }
  function toDegrees(theta) {
    return 180*theta/3.14159265358979;
  }
  function toRadians(theta) {
    return 3.14159265358979*theta/180;
  }

  vec2kepler.computeOrbitalElements = function (massPrimary, massSecondary, vector, massPrimaryU, massSecondaryU, vectorU, outputU) {
    // TODO: Error Checking for invalid units

    var G = 6.6725985e-11;
    var Pi = Math.PI;
    var Rx = vector[0];
    var Ry = vector[1];
    var Rz = vector[2];
    var Vx = vector[3];
    var Vy = vector[4];
    var Vz = vector[5];
    var RxU, RyU, RzU = 'm';
    var VxU, VyU, VzU = 'm/s';

    if (!(massPrimaryU=='kg' || typeof massPrimaryU == 'undefined')) {
      if (massPrimaryU=='g'){massPrimary=massPrimary/1000;}
      if (massPrimaryU=='M_Sun'){massPrimary=massPrimary* 1.98894729428839E+30;}
      if (massPrimaryU=='M_Mercury'){massPrimary=massPrimary* 3.30192458710471E+23;}
      if (massPrimaryU=='M_Venus'){massPrimary=massPrimary* 4.86862144253118E+24;}
      if (massPrimaryU=='M_Earth'){massPrimary=massPrimary* 5.97378250603408E+24;}
      if (massPrimaryU=='M_Mars'){massPrimary=massPrimary* 6.41863349674674E+23;}
      if (massPrimaryU=='M_Jupiter'){massPrimary=massPrimary* 1.89863768365072E+27;}
      if (massPrimaryU=='M_Saturn'){massPrimary=massPrimary* 5.68470940139966E+26;}
      if (massPrimaryU=='M_Uranus'){massPrimary=massPrimary* 8.68333186484441E+25;}
      if (massPrimaryU=='M_Neptune'){massPrimary=massPrimary* 1.02431564713932E+26;}
      if (massPrimaryU=='M_Pluto'){massPrimary=massPrimary* 1.30861680530754E+22;}
      if (massPrimaryU=='M_Moon'){massPrimary=massPrimary* 7.34777534869879E+22;}
      if (massPrimaryU=='M_Phobos'){massPrimary=massPrimary* 1.03409569809204E+16;}
      if (massPrimaryU=='M_Deimos'){massPrimary=massPrimary* 1.79842730102965E+15;}
      if (massPrimaryU=='M_Io'){massPrimary=massPrimary* 8.9320629865446E+22;}
      if (massPrimaryU=='M_Europa'){massPrimary=massPrimary* 4.79990319196655E+22;}
      if (massPrimaryU=='M_Ganymede'){massPrimary=massPrimary* 1.48187846087315E+23;}
      if (massPrimaryU=='M_Callisto'){massPrimary=massPrimary* 1.07595283170753E+23;}
      if (massPrimaryU=='M_Amalthea'){massPrimary=massPrimary* 7.49344708762353E+18;}
      if (massPrimaryU=='M_Himalia'){massPrimary=massPrimary* 9.55630662185067E+18;}
      if (massPrimaryU=='M_Elara'){massPrimary=massPrimary* 7.76699816441212E+17;}
      if (massPrimaryU=='M_Pasiphae'){massPrimary=massPrimary* 1.90926209704339E+17;}
      if (massPrimaryU=='M_Sinope'){massPrimary=massPrimary* 7.76699816441212E+16;}
      if (massPrimaryU=='M_Lysithea'){massPrimary=massPrimary* 7.76699816441212E+16;}
      if (massPrimaryU=='M_Carme'){massPrimary=massPrimary* 9.55630662185067E+16;}
      if (massPrimaryU=='M_Ananke'){massPrimary=massPrimary* 3.81852419408679E+16;}
      if (massPrimaryU=='M_Leda'){massPrimary=massPrimary* 5.6778056079615E+15;}
      if (massPrimaryU=='M_Thebe'){massPrimary=massPrimary* 7.76699816441212E+17;}
      if (massPrimaryU=='M_Adrastea'){massPrimary=massPrimary* 1.90926209704339E+16;}
      if (massPrimaryU=='M_Metis'){massPrimary=massPrimary* 9.55630662185067E+16;}
      if (massPrimaryU=='M_Mimas'){massPrimary=massPrimary* 3.81429321227243E+19;}
      if (massPrimaryU=='M_Enceladus'){massPrimary=massPrimary* 1.17050220435577E+20;}
      if (massPrimaryU=='M_Tethys'){massPrimary=massPrimary* 6.17639232970985E+20;}
      if (massPrimaryU=='M_Dione'){massPrimary=massPrimary* 1.09569832670221E+21;}
      if (massPrimaryU=='M_Rhea'){massPrimary=massPrimary* 2.31572188769539E+21;}
      if (massPrimaryU=='M_Titan'){massPrimary=massPrimary* 1.34555202850711E+23;}
      if (massPrimaryU=='M_Hyperion'){massPrimary=massPrimary* 5.54593618108186E+18;}
      if (massPrimaryU=='M_Iapetus'){massPrimary=massPrimary* 1.80652899243564E+21;}
      if (massPrimaryU=='M_Phoebe'){massPrimary=massPrimary* 8.28855423929348E+18;}
      if (massPrimaryU=='M_Janus'){massPrimary=massPrimary* 1.8972946850153E+18;}
      if (massPrimaryU=='M_Epimetheus'){massPrimary=massPrimary* 5.26205381601159E+17;}
      if (massPrimaryU=='M_Atlas'){massPrimary=massPrimary* 1.13924780048507E+15;}
      if (massPrimaryU=='M_Prometheus'){massPrimary=massPrimary* 1.87289854971031E+17;}
      if (massPrimaryU=='M_Pandora'){massPrimary=massPrimary* 1.48445610732647E+17;}
      if (massPrimaryU=='M_Ariel'){massPrimary=massPrimary* 1.29013922898875E+21;}
      if (massPrimaryU=='M_Umbriel'){massPrimary=massPrimary* 1.25880780428295E+21;}
      if (massPrimaryU=='M_Titania'){massPrimary=massPrimary* 3.4460391356142E+21;}
      if (massPrimaryU=='M_Oberon'){massPrimary=massPrimary* 2.99680258484984E+21;}
      if (massPrimaryU=='M_Miranda'){massPrimary=massPrimary* 6.51349484606072E+19;}
      if (massPrimaryU=='M_Triton'){massPrimary=massPrimary* 2.13993058500051E+22;}
      if (massPrimaryU=='M_Charon'){massPrimary=massPrimary* 1.62268483858135E+21;}
      if (massPrimaryU=='M_Ceres'){massPrimary=massPrimary* 8.70013290062687E+20;}
      if (massPrimaryU=='M_Pallas'){massPrimary=massPrimary* 3.1800485774705E+20;}
      if (massPrimaryU=='M_Vesta'){massPrimary=massPrimary* 3.00004582780236E+20;}
    }
    if (!(massSecondaryU=='kg' || typeof massSecondaryU == 'undefined')) {
      if (massSecondaryU=='g'){massSecondary=massSecondary/1000;}
      if (massSecondaryU=='M_Sun'){massSecondary=massSecondary* 1.98894729428839E+30;}
      if (massSecondaryU=='M_Mercury'){massSecondary=massSecondary* 3.30192458710471E+23;}
      if (massSecondaryU=='M_Venus'){massSecondary=massSecondary* 4.86862144253118E+24;}
      if (massSecondaryU=='M_Earth'){massSecondary=massSecondary* 5.97378250603408E+24;}
      if (massSecondaryU=='M_Mars'){massSecondary=massSecondary* 6.41863349674674E+23;}
      if (massSecondaryU=='M_Jupiter'){massSecondary=massSecondary* 1.89863768365072E+27;}
      if (massSecondaryU=='M_Saturn'){massSecondary=massSecondary* 5.68470940139966E+26;}
      if (massSecondaryU=='M_Uranus'){massSecondary=massSecondary* 8.68333186484441E+25;}
      if (massSecondaryU=='M_Neptune'){massSecondary=massSecondary* 1.02431564713932E+26;}
      if (massSecondaryU=='M_Pluto'){massSecondary=massSecondary* 1.30861680530754E+22;}
      if (massSecondaryU=='M_Moon'){massSecondary=massSecondary* 7.34777534869879E+22;}
      if (massSecondaryU=='M_Phobos'){massSecondary=massSecondary* 1.03409569809204E+16;}
      if (massSecondaryU=='M_Deimos'){massSecondary=massSecondary* 1.79842730102965E+15;}
      if (massSecondaryU=='M_Io'){massSecondary=massSecondary* 8.9320629865446E+22;}
      if (massSecondaryU=='M_Europa'){massSecondary=massSecondary* 4.79990319196655E+22;}
      if (massSecondaryU=='M_Ganymede'){massSecondary=massSecondary* 1.48187846087315E+23;}
      if (massSecondaryU=='M_Callisto'){massSecondary=massSecondary* 1.07595283170753E+23;}
      if (massSecondaryU=='M_Amalthea'){massSecondary=massSecondary* 7.49344708762353E+18;}
      if (massSecondaryU=='M_Himalia'){massSecondary=massSecondary* 9.55630662185067E+18;}
      if (massSecondaryU=='M_Elara'){massSecondary=massSecondary* 7.76699816441212E+17;}
      if (massSecondaryU=='M_Pasiphae'){massSecondary=massSecondary* 1.90926209704339E+17;}
      if (massSecondaryU=='M_Sinope'){massSecondary=massSecondary* 7.76699816441212E+16;}
      if (massSecondaryU=='M_Lysithea'){massSecondary=massSecondary* 7.76699816441212E+16;}
      if (massSecondaryU=='M_Carme'){massSecondary=massSecondary* 9.55630662185067E+16;}
      if (massSecondaryU=='M_Ananke'){massSecondary=massSecondary* 3.81852419408679E+16;}
      if (massSecondaryU=='M_Leda'){massSecondary=massSecondary* 5.6778056079615E+15;}
      if (massSecondaryU=='M_Thebe'){massSecondary=massSecondary* 7.76699816441212E+17;}
      if (massSecondaryU=='M_Adrastea'){massSecondary=massSecondary* 1.90926209704339E+16;}
      if (massSecondaryU=='M_Metis'){massSecondary=massSecondary* 9.55630662185067E+16;}
      if (massSecondaryU=='M_Mimas'){massSecondary=massSecondary* 3.81429321227243E+19;}
      if (massSecondaryU=='M_Enceladus'){massSecondary=massSecondary* 1.17050220435577E+20;}
      if (massSecondaryU=='M_Tethys'){massSecondary=massSecondary* 6.17639232970985E+20;}
      if (massSecondaryU=='M_Dione'){massSecondary=massSecondary* 1.09569832670221E+21;}
      if (massSecondaryU=='M_Rhea'){massSecondary=massSecondary* 2.31572188769539E+21;}
      if (massSecondaryU=='M_Titan'){massSecondary=massSecondary* 1.34555202850711E+23;}
      if (massSecondaryU=='M_Hyperion'){massSecondary=massSecondary* 5.54593618108186E+18;}
      if (massSecondaryU=='M_Iapetus'){massSecondary=massSecondary* 1.80652899243564E+21;}
      if (massSecondaryU=='M_Phoebe'){massSecondary=massSecondary* 8.28855423929348E+18;}
      if (massSecondaryU=='M_Janus'){massSecondary=massSecondary* 1.8972946850153E+18;}
      if (massSecondaryU=='M_Epimetheus'){massSecondary=massSecondary* 5.26205381601159E+17;}
      if (massSecondaryU=='M_Atlas'){massSecondary=massSecondary* 1.13924780048507E+15;}
      if (massSecondaryU=='M_Prometheus'){massSecondary=massSecondary* 1.87289854971031E+17;}
      if (massSecondaryU=='M_Pandora'){massSecondary=massSecondary* 1.48445610732647E+17;}
      if (massSecondaryU=='M_Ariel'){massSecondary=massSecondary* 1.29013922898875E+21;}
      if (massSecondaryU=='M_Umbriel'){massSecondary=massSecondary* 1.25880780428295E+21;}
      if (massSecondaryU=='M_Titania'){massSecondary=massSecondary* 3.4460391356142E+21;}
      if (massSecondaryU=='M_Oberon'){massSecondary=massSecondary* 2.99680258484984E+21;}
      if (massSecondaryU=='M_Miranda'){massSecondary=massSecondary* 6.51349484606072E+19;}
      if (massSecondaryU=='M_Triton'){massSecondary=massSecondary* 2.13993058500051E+22;}
      if (massSecondaryU=='M_Charon'){massSecondary=massSecondary* 1.62268483858135E+21;}
      if (massSecondaryU=='M_Ceres'){massSecondary=massSecondary* 8.70013290062687E+20;}
      if (massSecondaryU=='M_Pallas'){massSecondary=massSecondary* 3.1800485774705E+20;}
      if (massSecondaryU=='M_Vesta'){massSecondary=massSecondary* 3.00004582780236E+20;}
    }

    if (typeof vectorU != 'undefined') {
      RxU = vectorU[0];
      RyU = vectorU[1];
      RzU = vectorU[2];
      VxU = vectorU[3];
      VyU = vectorU[4];
      VzU = vectorU[5];
      if (RxU=='cm'){Rx=Rx/100;}
      if (RxU=='km'){Rx=Rx*1000;}
      if (RxU=='AU'){Rx=Rx*149597870691;}
      if (RxU=='LY'){Rx=Rx*9.4605e15;}
      if (RxU=='PC'){Rx=Rx*3.0857e16;}
      if (RxU=='mi'){Rx=Rx*1609.344;}
      if (RxU=='ft'){Rx=Rx*0.3048;}

      if (RyU=='cm'){Ry=Ry/100;}
      if (RyU=='km'){Ry=Ry*1000;}
      if (RyU=='AU'){Ry=Ry*149597870691;}
      if (RyU=='LY'){Ry=Ry*9.4605e15;}
      if (RyU=='PC'){Ry=Ry*3.0857e16;}
      if (RyU=='mi'){Ry=Ry*1609.344;}
      if (RyU=='ft'){Ry=Ry*0.3048;}

      if (RzU=='cm'){Rz=Rz/100;}
      if (RzU=='km'){Rz=Rz*1000;}
      if (RzU=='AU'){Rz=Rz*149597870691;}
      if (RzU=='LY'){Rz=Rz*9.4605e15;}
      if (RzU=='PC'){Rz=Rz*3.0857e16;}
      if (RzU=='mi'){Rz=Rz*1609.344;}
      if (RzU=='ft'){Rz=Rz*0.3048;}

      if (VxU=='km/s'){Vx=(Vx*1000);}
      if (VyU=='km/s'){Vy=(Vy*1000);}
      if (VzU=='km/s'){Vz=(Vz*1000);}
    }

    // Prevent divide by 0 errors
    if (Rx== 0) {Rx = 0.000000000000001;}
    if (Ry== 0) {Ry = 0.000000000000001;}
    if (Rz== 0) {Rz = 0.000000000000001;}
    if (Vx== 0) {Vx = 0.000000000000001;}
    if (Vy== 0) {Vy = 0.000000000000001;}
    if (Vz== 0) {Vz = 0.000000000000001;}

    var Mu = G * (massPrimary + massSecondary);

    var R = Math.sqrt(Rx*Rx + Ry*Ry + Rz*Rz);
    var V = Math.sqrt(Vx*Vx + Vy*Vy + Vz*Vz);
    var a = 1/(2 / R - V*V / Mu); //  semi-major axis

    var Hx = Ry*Vz - Rz*Vy;
    var Hy = Rz*Vx - Rx*Vz;
    var Hz = Rx*Vy - Ry*Vx;
    var H = Math.sqrt(Hx*Hx + Hy*Hy + Hz*Hz);

    var p = H*H / Mu;
    var q = Rx*Vx + Ry*Vy + Rz*Vz;  // dot product of r*v

    var E = Math.sqrt(1 - p / a);  // eccentricity

    var Ex = 1 - R / a;
    var Ey = q / Math.sqrt(a * Mu);

    var i = Math.acos(Hz / H);
    var lan = 0;
    if ( i != 0 ) { lan = arctan2(Hx,-Hy); }

    var TAx = H*H / (R*Mu) - 1;
    var TAy = H*q / (R * Mu);
    var TA = arctan2(TAy, TAx);
    var Cw = (Rx * Math.cos(lan) + Ry * Math.sin(lan))/R;

    var Sw = 0;
    if ( i==0 || i==Pi)
       { Sw = (Ry * Math.cos(lan) - Rx * Math.sin(lan)) / R; }
    else
       { Sw = Rz / (R * Math.sin(i)); }

    var W = arctan2(Sw, Cw) - TA;
    if (W<0) {W=2*Pi+W;}

    var u = arctan2(Ey, Ex); // eccentric anomoly
    var M = u-E * Math.sin(u); // Mean anomoly
    var TL = W + TA + lan; // True longitude

    while (TL >=2*Pi) {TL = TL - 2*Pi;}

    var PlusMinus = a * E;
    var Periapsis = a - PlusMinus;
    var Apoapsis = a + PlusMinus;
    var Period = 2 * Pi * Math.sqrt((a*a*a / (G*(massPrimary + massSecondary))));

    if (typeof outputU == 'undefined'){
      outputU = 'm';
    } else {
      if (outputU=='cm'){a=a*100;}
      if (outputU=='km'){a=a/1000;}
      if (outputU=='outputU'){a=a/149597870691;}
      if (outputU=='LY'){a=a/9.4605e15;}
      if (outputU=='PC'){a=a/3.0857e16;}
      if (outputU=='mi'){a=a/1609.344;}
      if (outputU=='ft'){a=a/0.3048;}

      if (outputU=='cm'){Periapsis=Periapsis*100;}
      if (outputU=='km'){Periapsis=Periapsis/1000;}
      if (outputU=='AU'){Periapsis=Periapsis/149597870691;}
      if (outputU=='LY'){Periapsis=Periapsis/9.4605e15;}
      if (outputU=='PC'){Periapsis=Periapsis/3.0857e16;}
      if (outputU=='mi'){Periapsis=Periapsis/1609.344;}
      if (outputU=='ft'){Periapsis=Periapsis/0.3048;}

      if (outputU=='cm'){Apoapsis=Apoapsis*100;}
      if (outputU=='km'){Apoapsis=Apoapsis/1000;}
      if (outputU=='AU'){Apoapsis=Apoapsis/149597870691;}
      if (outputU=='LY'){Apoapsis=Apoapsis/9.4605e15;}
      if (outputU=='PC'){Apoapsis=Apoapsis/3.0857e16;}
      if (outputU=='mi'){Apoapsis=Apoapsis/1609.344;}
      if (outputU=='ft'){Apoapsis=Apoapsis/0.3048;}
    }

    if (typeof outputU2 == 'undefined'){
      outputU2 = 's';
    } else {
      if (outputU2=='m'){Period=Period/60;}
      if (outputU2=='h'){Period=Period/3600;}
      if (outputU2=='d'){Period=Period/86400;}
      if (outputU2=='yr'){Period=Period/3.15581e7;}
      if (outputU2=='Ky'){Period=Period/3.15581e10;}
      if (outputU2=='My'){Period=Period/3.15581e13;}
      if (outputU2=='By'){Period=Period/3.15581e16;}
    }

    // toDegrees
    i=toDegrees(i);
    lan=toDegrees(lan);
    W=toDegrees(W);
    M=toDegrees(M);
    TA=toDegrees(TA);
    TL=toDegrees(TL);

    // DEBUG:
    console.log('a: ' + a + ' ' + outputU); //semiMajorAxis
    console.log('E: ' + E);
    console.log('i: ' + i);
    console.log('lan: ' + lan);
    console.log('W: ' + W);
    console.log('M: ' + M);
    console.log('TA: ' + TA);
    console.log('TL: ' + TL);
    console.log('Periapsis: ' + Periapsis + ' ' + outputU);
    console.log('Apoapsis: ' + Apoapsis + ' ' + outputU);
    console.log('Period: ' + Period + ' ' + outputU2);
    //
    // if (!isNaN(a) && isFinite(a))

    return {
      'semiMajorAxis': a,
      'eccentricity': E,
      'inclination': i,
      'raan': lan,
      'argPe': W,
      'mo': M,
      'TA': TA,
      'TL': TL,
      'perigee': Periapsis,
      'apogee': Apoapsis,
      'period': Period
    };
  };

  vec2kepler.ComputeStateVectors = function (a, ec, i, w0, o0, m0, massPrimary, massSecondary, massPrimaryU, massSecondaryU, aU, vectorU)
  {
    var G = 6.6725985e-11;
    var RxU, RyU, RzU = 'm';
    var VxU, VyU, VzU = 'm/s';

    i=toRadians(i);
    w0=toRadians(w0);
    o0=toRadians(o0);
    m0=toRadians(m0);

    if (typeof aU == 'undefined') {
      aU = 'm';
    } else {
      if (aU=='cm'){a=a/100;}
      if (aU=='km'){a=a*1000;}
      if (aU=='AU'){a=a*149597870691;}
      if (aU=='LY'){a=a*9.4605e15;}
      if (aU=='PC'){a=a*3.0857e16;}
      if (aU=='mi'){a=a*1609.344;}
      if (aU=='ft'){a=a*0.3048;}
    }

    if (!(massPrimaryU=='kg' || typeof massPrimaryU == 'undefined')) {
      if (massPrimaryU=='g'){massPrimary=massPrimary/1000;}
      if (massPrimaryU=='M_Sun'){massPrimary=massPrimary* 1.98894729428839E+30;}
      if (massPrimaryU=='M_Mercury'){massPrimary=massPrimary* 3.30192458710471E+23;}
      if (massPrimaryU=='M_Venus'){massPrimary=massPrimary* 4.86862144253118E+24;}
      if (massPrimaryU=='M_Earth'){massPrimary=massPrimary* 5.97378250603408E+24;}
      if (massPrimaryU=='M_Mars'){massPrimary=massPrimary* 6.41863349674674E+23;}
      if (massPrimaryU=='M_Jupiter'){massPrimary=massPrimary* 1.89863768365072E+27;}
      if (massPrimaryU=='M_Saturn'){massPrimary=massPrimary* 5.68470940139966E+26;}
      if (massPrimaryU=='M_Uranus'){massPrimary=massPrimary* 8.68333186484441E+25;}
      if (massPrimaryU=='M_Neptune'){massPrimary=massPrimary* 1.02431564713932E+26;}
      if (massPrimaryU=='M_Pluto'){massPrimary=massPrimary* 1.30861680530754E+22;}
      if (massPrimaryU=='M_Moon'){massPrimary=massPrimary* 7.34777534869879E+22;}
      if (massPrimaryU=='M_Phobos'){massPrimary=massPrimary* 1.03409569809204E+16;}
      if (massPrimaryU=='M_Deimos'){massPrimary=massPrimary* 1.79842730102965E+15;}
      if (massPrimaryU=='M_Io'){massPrimary=massPrimary* 8.9320629865446E+22;}
      if (massPrimaryU=='M_Europa'){massPrimary=massPrimary* 4.79990319196655E+22;}
      if (massPrimaryU=='M_Ganymede'){massPrimary=massPrimary* 1.48187846087315E+23;}
      if (massPrimaryU=='M_Callisto'){massPrimary=massPrimary* 1.07595283170753E+23;}
      if (massPrimaryU=='M_Amalthea'){massPrimary=massPrimary* 7.49344708762353E+18;}
      if (massPrimaryU=='M_Himalia'){massPrimary=massPrimary* 9.55630662185067E+18;}
      if (massPrimaryU=='M_Elara'){massPrimary=massPrimary* 7.76699816441212E+17;}
      if (massPrimaryU=='M_Pasiphae'){massPrimary=massPrimary* 1.90926209704339E+17;}
      if (massPrimaryU=='M_Sinope'){massPrimary=massPrimary* 7.76699816441212E+16;}
      if (massPrimaryU=='M_Lysithea'){massPrimary=massPrimary* 7.76699816441212E+16;}
      if (massPrimaryU=='M_Carme'){massPrimary=massPrimary* 9.55630662185067E+16;}
      if (massPrimaryU=='M_Ananke'){massPrimary=massPrimary* 3.81852419408679E+16;}
      if (massPrimaryU=='M_Leda'){massPrimary=massPrimary* 5.6778056079615E+15;}
      if (massPrimaryU=='M_Thebe'){massPrimary=massPrimary* 7.76699816441212E+17;}
      if (massPrimaryU=='M_Adrastea'){massPrimary=massPrimary* 1.90926209704339E+16;}
      if (massPrimaryU=='M_Metis'){massPrimary=massPrimary* 9.55630662185067E+16;}
      if (massPrimaryU=='M_Mimas'){massPrimary=massPrimary* 3.81429321227243E+19;}
      if (massPrimaryU=='M_Enceladus'){massPrimary=massPrimary* 1.17050220435577E+20;}
      if (massPrimaryU=='M_Tethys'){massPrimary=massPrimary* 6.17639232970985E+20;}
      if (massPrimaryU=='M_Dione'){massPrimary=massPrimary* 1.09569832670221E+21;}
      if (massPrimaryU=='M_Rhea'){massPrimary=massPrimary* 2.31572188769539E+21;}
      if (massPrimaryU=='M_Titan'){massPrimary=massPrimary* 1.34555202850711E+23;}
      if (massPrimaryU=='M_Hyperion'){massPrimary=massPrimary* 5.54593618108186E+18;}
      if (massPrimaryU=='M_Iapetus'){massPrimary=massPrimary* 1.80652899243564E+21;}
      if (massPrimaryU=='M_Phoebe'){massPrimary=massPrimary* 8.28855423929348E+18;}
      if (massPrimaryU=='M_Janus'){massPrimary=massPrimary* 1.8972946850153E+18;}
      if (massPrimaryU=='M_Epimetheus'){massPrimary=massPrimary* 5.26205381601159E+17;}
      if (massPrimaryU=='M_Atlas'){massPrimary=massPrimary* 1.13924780048507E+15;}
      if (massPrimaryU=='M_Prometheus'){massPrimary=massPrimary* 1.87289854971031E+17;}
      if (massPrimaryU=='M_Pandora'){massPrimary=massPrimary* 1.48445610732647E+17;}
      if (massPrimaryU=='M_Ariel'){massPrimary=massPrimary* 1.29013922898875E+21;}
      if (massPrimaryU=='M_Umbriel'){massPrimary=massPrimary* 1.25880780428295E+21;}
      if (massPrimaryU=='M_Titania'){massPrimary=massPrimary* 3.4460391356142E+21;}
      if (massPrimaryU=='M_Oberon'){massPrimary=massPrimary* 2.99680258484984E+21;}
      if (massPrimaryU=='M_Miranda'){massPrimary=massPrimary* 6.51349484606072E+19;}
      if (massPrimaryU=='M_Triton'){massPrimary=massPrimary* 2.13993058500051E+22;}
      if (massPrimaryU=='M_Charon'){massPrimary=massPrimary* 1.62268483858135E+21;}
      if (massPrimaryU=='M_Ceres'){massPrimary=massPrimary* 8.70013290062687E+20;}
      if (massPrimaryU=='M_Pallas'){massPrimary=massPrimary* 3.1800485774705E+20;}
      if (massPrimaryU=='M_Vesta'){massPrimary=massPrimary* 3.00004582780236E+20;}
    }
    if (!(massSecondaryU=='kg' || typeof massSecondaryU == 'undefined')) {
      if (massSecondaryU=='g'){massSecondary=massSecondary/1000;}
      if (massSecondaryU=='M_Sun'){massSecondary=massSecondary* 1.98894729428839E+30;}
      if (massSecondaryU=='M_Mercury'){massSecondary=massSecondary* 3.30192458710471E+23;}
      if (massSecondaryU=='M_Venus'){massSecondary=massSecondary* 4.86862144253118E+24;}
      if (massSecondaryU=='M_Earth'){massSecondary=massSecondary* 5.97378250603408E+24;}
      if (massSecondaryU=='M_Mars'){massSecondary=massSecondary* 6.41863349674674E+23;}
      if (massSecondaryU=='M_Jupiter'){massSecondary=massSecondary* 1.89863768365072E+27;}
      if (massSecondaryU=='M_Saturn'){massSecondary=massSecondary* 5.68470940139966E+26;}
      if (massSecondaryU=='M_Uranus'){massSecondary=massSecondary* 8.68333186484441E+25;}
      if (massSecondaryU=='M_Neptune'){massSecondary=massSecondary* 1.02431564713932E+26;}
      if (massSecondaryU=='M_Pluto'){massSecondary=massSecondary* 1.30861680530754E+22;}
      if (massSecondaryU=='M_Moon'){massSecondary=massSecondary* 7.34777534869879E+22;}
      if (massSecondaryU=='M_Phobos'){massSecondary=massSecondary* 1.03409569809204E+16;}
      if (massSecondaryU=='M_Deimos'){massSecondary=massSecondary* 1.79842730102965E+15;}
      if (massSecondaryU=='M_Io'){massSecondary=massSecondary* 8.9320629865446E+22;}
      if (massSecondaryU=='M_Europa'){massSecondary=massSecondary* 4.79990319196655E+22;}
      if (massSecondaryU=='M_Ganymede'){massSecondary=massSecondary* 1.48187846087315E+23;}
      if (massSecondaryU=='M_Callisto'){massSecondary=massSecondary* 1.07595283170753E+23;}
      if (massSecondaryU=='M_Amalthea'){massSecondary=massSecondary* 7.49344708762353E+18;}
      if (massSecondaryU=='M_Himalia'){massSecondary=massSecondary* 9.55630662185067E+18;}
      if (massSecondaryU=='M_Elara'){massSecondary=massSecondary* 7.76699816441212E+17;}
      if (massSecondaryU=='M_Pasiphae'){massSecondary=massSecondary* 1.90926209704339E+17;}
      if (massSecondaryU=='M_Sinope'){massSecondary=massSecondary* 7.76699816441212E+16;}
      if (massSecondaryU=='M_Lysithea'){massSecondary=massSecondary* 7.76699816441212E+16;}
      if (massSecondaryU=='M_Carme'){massSecondary=massSecondary* 9.55630662185067E+16;}
      if (massSecondaryU=='M_Ananke'){massSecondary=massSecondary* 3.81852419408679E+16;}
      if (massSecondaryU=='M_Leda'){massSecondary=massSecondary* 5.6778056079615E+15;}
      if (massSecondaryU=='M_Thebe'){massSecondary=massSecondary* 7.76699816441212E+17;}
      if (massSecondaryU=='M_Adrastea'){massSecondary=massSecondary* 1.90926209704339E+16;}
      if (massSecondaryU=='M_Metis'){massSecondary=massSecondary* 9.55630662185067E+16;}
      if (massSecondaryU=='M_Mimas'){massSecondary=massSecondary* 3.81429321227243E+19;}
      if (massSecondaryU=='M_Enceladus'){massSecondary=massSecondary* 1.17050220435577E+20;}
      if (massSecondaryU=='M_Tethys'){massSecondary=massSecondary* 6.17639232970985E+20;}
      if (massSecondaryU=='M_Dione'){massSecondary=massSecondary* 1.09569832670221E+21;}
      if (massSecondaryU=='M_Rhea'){massSecondary=massSecondary* 2.31572188769539E+21;}
      if (massSecondaryU=='M_Titan'){massSecondary=massSecondary* 1.34555202850711E+23;}
      if (massSecondaryU=='M_Hyperion'){massSecondary=massSecondary* 5.54593618108186E+18;}
      if (massSecondaryU=='M_Iapetus'){massSecondary=massSecondary* 1.80652899243564E+21;}
      if (massSecondaryU=='M_Phoebe'){massSecondary=massSecondary* 8.28855423929348E+18;}
      if (massSecondaryU=='M_Janus'){massSecondary=massSecondary* 1.8972946850153E+18;}
      if (massSecondaryU=='M_Epimetheus'){massSecondary=massSecondary* 5.26205381601159E+17;}
      if (massSecondaryU=='M_Atlas'){massSecondary=massSecondary* 1.13924780048507E+15;}
      if (massSecondaryU=='M_Prometheus'){massSecondary=massSecondary* 1.87289854971031E+17;}
      if (massSecondaryU=='M_Pandora'){massSecondary=massSecondary* 1.48445610732647E+17;}
      if (massSecondaryU=='M_Ariel'){massSecondary=massSecondary* 1.29013922898875E+21;}
      if (massSecondaryU=='M_Umbriel'){massSecondary=massSecondary* 1.25880780428295E+21;}
      if (massSecondaryU=='M_Titania'){massSecondary=massSecondary* 3.4460391356142E+21;}
      if (massSecondaryU=='M_Oberon'){massSecondary=massSecondary* 2.99680258484984E+21;}
      if (massSecondaryU=='M_Miranda'){massSecondary=massSecondary* 6.51349484606072E+19;}
      if (massSecondaryU=='M_Triton'){massSecondary=massSecondary* 2.13993058500051E+22;}
      if (massSecondaryU=='M_Charon'){massSecondary=massSecondary* 1.62268483858135E+21;}
      if (massSecondaryU=='M_Ceres'){massSecondary=massSecondary* 8.70013290062687E+20;}
      if (massSecondaryU=='M_Pallas'){massSecondary=massSecondary* 3.1800485774705E+20;}
      if (massSecondaryU=='M_Vesta'){massSecondary=massSecondary* 3.00004582780236E+20;}
    }

    var Mass = massPrimary + massSecondary;

    var eca = m0 + ec / 2;
    var diff = 10000;
    var eps = 0.000001;
    var e1=0;

    while (diff > eps) {
        e1 = eca - (eca - ec * Math.sin(eca) - m0) / (1 - ec * Math.cos(eca));
        diff = Math.abs(e1 - eca);
        eca = e1;
    }

    var ceca = Math.cos(eca);
    var seca = Math.sin(eca);
    e1 = a * Math.sqrt(Math.abs(1 - ec * ec));
    var xw = a * (ceca - ec);
    var yw = e1 * seca;

    var edot = Math.sqrt((G * Mass) / a) / (a * (1 - ec * ceca));
    var xdw = -a * edot * seca;
    var ydw = e1 * edot * ceca;

    var Cw = Math.cos(w0);
    var Sw = Math.sin(w0);
    var co = Math.cos(o0);
    var so = Math.sin(o0);
    var ci = Math.cos(i);
    var si = Math.sin(i);
    var swci = Sw * ci;
    var cwci = Cw * ci;
    var pX = Cw * co - so * swci;
    var pY = Cw * so + co * swci;
    var pZ = Sw * si;
    var qx = -Sw * co - so * cwci;
    var qy = -Sw * so + co * cwci;
    var qz = Cw * si;
    Rx = xw * pX + yw * qx;
    Ry = xw * pY + yw * qy;
    Rz = xw * pZ + yw * qz;
    Vx = xdw * pX + ydw * qx;
    Vy = xdw * pY + ydw * qy;
    Vz = xdw * pZ + ydw * qz;

    if (typeof vectorU != 'undefined') {
      RxU = vectorU[0];
      RyU = vectorU[1];
      RzU = vectorU[2];
      VxU = vectorU[3];
      VyU = vectorU[4];
      VzU = vectorU[5];
      if (RxU=='cm'){Rx=Rx*100;}
      if (RxU=='km'){Rx=Rx/1000;}
      if (RxU=='AU'){Rx=Rx/149597870691;}
      if (RxU=='LY'){Rx=Rx/9.4605e15;}
      if (RxU=='PC'){Rx=Rx/3.0857e16;}
      if (RxU=='mi'){Rx=Rx/1609.344;}
      if (RxU=='ft'){Rx=Rx/0.3048;}

      if (RyU=='cm'){Ry=Ry*100;}
      if (RyU=='km'){Ry=Ry/1000;}
      if (RyU=='AU'){Ry=Ry/149597870691;}
      if (RyU=='LY'){Ry=Ry/9.4605e15;}
      if (RyU=='PC'){Ry=Ry/3.0857e16;}
      if (RyU=='mi'){Ry=Ry/1609.344;}
      if (RyU=='ft'){Ry=Ry/0.3048;}

      if (RzU=='cm'){Rz=Rz*100;}
      if (RzU=='km'){Rz=Rz/1000;}
      if (RzU=='AU'){Rz=Rz/149597870691;}
      if (RzU=='LY'){Rz=Rz/9.4605e15;}
      if (RzU=='PC'){Rz=Rz/3.0857e16;}
      if (RzU=='mi'){Rz=Rz/1609.344;}
      if (RzU=='ft'){Rz=Rz/0.3048;}

      if (VxU=='km/s'){Vx=(Vx/1000);}
      if (VyU=='km/s'){Vy=(Vy/1000);}
      if (VzU=='km/s'){Vz=(Vz/1000);}
    }

    return {
      'position': {
        'x': Rx,
        'y': Ry,
        'z': Rz
      },
      'velocityX': Vx,
      'velocityY': Vy,
      'velocityZ': Vz
    };
  };
  window.vec2kepler = vec2kepler;
})();
