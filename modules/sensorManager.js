// Sensor Manager (sensorManager)
(function () {
  var sensorManager = {};
  var sensorList = {};

  sensorList.COD = {
    name: 'Cape Cod AFS, MA',
    googleName: 'Cape Cod',
    shortName: 'COD',
    type: 'Phased Array Radar',
    lat: 41.754785,
    long: -70.539151,
    obshei: 0.060966,
    obsminaz: 347,
    obsmaxaz: 227,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 5555,
    changeObjectInterval: 1000,
    staticNum: 1,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.BLE = {
    name: 'Beale AFB, CA',
    googleName: 'Beale',
    shortName: 'BLE',
    type: 'Phased Array Radar',
    lat: 39.136064,
    long: -121.351237,
    obshei: 0.060966, // TODO: Find correct height
    obsminaz: 126,
    obsmaxaz: 6,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 5555,
    changeObjectInterval: 1000,
    staticNum: 0,
    zoom: 'leo',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.CLR = {
    name: 'Clear AFS, AK',
    googleName: 'Clear',
    shortName: 'CLR',
    type: 'Phased Array Radar',
    lat: 64.290556,
    long: -149.186944,
    obshei: 0.060966,
    obsminaz: 184,
    obsmaxaz: 64,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 4910,
    changeObjectInterval: 1000,
    staticNum: 2,
    zoom: 'leo',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.EGL = {
    name: 'Eglin AFB, FL',
    googleName: 'Eglin',
    shortName: 'EGL',
    type: 'Phased Array Radar',
    lat: 30.572411,
    long: -86.214836,
    obshei: 0.060966, // TODO: Confirm Altitude
    obsminaz: 120,
    obsmaxaz: 240,
    obsminel: 3,
    obsmaxel: 105,
    obsminrange: 200,
    obsmaxrange: 200000,
    changeObjectInterval: 1000,
    staticNum: 3,
    zoom: 'geo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte002.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.FYL = {
    name: 'RAF Fylingdales, UK',
    googleName: 'Fylingdales',
    shortName: 'FYL',
    type: 'Phased Array Radar',
    lat: 54.361758,
    long: -0.670051,
    obshei: 0.060966, // TODO: Find correct height
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 4820,
    changeObjectInterval: 1000,
    staticNum: 4,
    zoom: 'leo',
    country: 'United Kingdom',
    sun: 'No Impact',
    volume: false
  };
  sensorList.CAV = {
    name: 'Cavalier AFS, ND',
    googleName: 'Cavalier',
    shortName: 'CAV',
    type: 'Phased Array Radar',
    lat: 48.724567,
    long: -97.899755,
    obshei: 0.060966, // TODO: Find correct height
    obsminaz: 298,
    obsmaxaz: 78,
    obsminel: 1.9,
    obsmaxel: 95,
    obsminrange: 200,
    obsmaxrange: 3300, // TODO: Double check this
    changeObjectInterval: 1000,
    staticNum: 5,
    zoom: 'leo',
    url: 'https://mostlymissiledefense.com/2012/04/12/parcs-cavalier-radar-april-12-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: true
  };
  sensorList.THL = {
    name: 'Thule AFB, GL',
    googleName: 'Thule',
    shortName: 'THL',
    type: 'Phased Array Radar',
    lat: 76.570322,
    long: -68.299211,
    obshei: 0.060966, // TODO: Find correct height
    obsminaz: 297,
    obsmaxaz: 177,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 5555,
    changeObjectInterval: 1000,
    staticNum: 6,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.CDN = {
    name: 'Cobra Dane, AK',
    googleName: 'Cobra Dane',
    shortName: 'CDN',
    type: 'Phased Array Radar',
    lat: 52.737,
    long: 174.092,
    obshei: 0.010966, // TODO: Find correct height
    obsminaz: 259,
    obsmaxaz: 19,
    obsminel: 2,
    obsmaxel: 30,
    obsminrange: 200,
    obsmaxrange: 4200,
    obsminaz2: 251,
    obsmaxaz2: 27,
    obsminel2: 30,
    obsmaxel2: 80,
    obsminrange2: 200,
    obsmaxrange2: 4200,
    changeObjectInterval: 1000,
    staticNum: 7,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: true
  };
  sensorList.ALT = {
    name: 'ALTAIR, Kwaj',
    googleName: 'ALTAIR',
    shortName: 'ALT',
    type: 'Mechanical',
    lat: 8.716667,
    long: 167.733333,
    obshei: 0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 200,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 8,
    zoom: 'geo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte005.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.MIL = {
    name: 'Millstone, MA',
    googleName: 'Millstone',
    shortName: 'MIL',
    type: 'Mechanical',
    lat: 42.6233,
    long: -71.4882,
    obshei: 0.131,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 200,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 9,
    zoom: 'geo',
    url: 'https://mostlymissiledefense.com/2012/05/05/space-surveillance-sensors-millstone-hill-radar/',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.DGC = {
    name: 'Diego Garcia',
    googleName: 'Diego Garcia',
    shortName: 'DGC',
    type: 'Optical',
    lat: -7.296480,
    long: 72.390153,
    obshei: 0.0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 20,
    obsmaxel: 90,
    obsminrange: 20000,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 10,
    zoom: 'geo',
    url: 'https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.MAU = {
    name: 'Maui, HI',
    googleName: 'Maui',
    shortName: 'MAU',
    type: 'Optical',
    lat: 20.708350,
    long: -156.257595,
    obshei: 3.0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 20,
    obsmaxel: 90,
    obsminrange: 20000,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 11,
    zoom: 'geo',
    url: 'https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.SOC = {
    name: 'Socorro, NM',
    googleName: 'Socorro',
    shortName: 'SOC',
    type: 'Optical',
    lat: 33.817233,
    long: -106.659961,
    obshei: 1.24,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 20,
    obsmaxel: 90,
    obsminrange: 20000,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 12,
    zoom: 'geo',
    url: 'https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.ASC = {
    name: 'Ascension',
    googleName: 'Ascension',
    shortName: 'ASC',
    type: 'Mechanical',
    lat: -7.969444,
    long: -14.393889,
    obshei: 0.0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 200,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 22,
    zoom: 'geo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.GLB = {
    name: 'Globus II, NOR',
    googleName: 'Globus II',
    shortName: 'GLB',
    type: 'Mechanical',
    lat: 70.3671,
    long: 31.1271,
    obshei: 0.0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 200,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 23,
    zoom: 'geo',
    url: '',
    country: 'Norway',
    sun: 'No Impact',
    volume: false
  };
  // //////////////////////
  // ESOC RADARS
  // //////////////////////
  sensorList.GRV = {
    name: 'Grand Réseau Adapté à la Veille Spatiale, FRA',
    googleName: 'GRAVES',
    shortName: 'GRV',
    type: 'Phased Array',
    lat: 47.347778,
    long: 5.51638,
    obshei: 0.0,
    obsminaz: 90,
    obsmaxaz: 270,
    obsminel: 20,
    obsmaxel: 40,
    obsminrange: 0,
    obsmaxrange: 1700, // http://emits.sso.esa.int/emits-doc/AO5059RD1.pdf
    changeObjectInterval: 20000,
    staticNum: 24,
    zoom: 'leo',
    url: '',
    country: 'France',
    sun: 'No Impact',
    volume: true
  };
  sensorList.TIR = {
    name: 'Tracking and Imaging Radar, GER',
    googleName: 'TIRA',
    shortName: 'TIR',
    type: 'Mechanical',
    lat: 50.6166,
    long: 7.1296,
    obshei: 0.0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1.5, // http://www.issfd.org/ISSFD_2012/ISSFD23_CRSD2_3.pdf
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 200000, // http://emits.sso.esa.int/emits-doc/AO5059RD1.pdf
    changeObjectInterval: 20000,
    staticNum: 25,
    zoom: 'geo',
    url: '',
    country: 'Germany',
    sun: 'No Impact',
    volume: false
  };
  sensorList.NRC = {
    name: 'Croce del Nord, ITA',
    googleName: 'Northern Cross',
    shortName: 'NRC',
    type: 'Bistatic Radio Telescope',
    lat: 44.5208,
    long: 11.6469,
    obshei: 0.025,
    obsminaz: 89.1,
    obsmaxaz: 90.9,
    obsminel: 45,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 1700,
    obsminaz2: 179.1,
    obsmaxaz2: 180.9,
    obsminel2: 45,
    obsmaxel2: 90,
    obsminrange2: 0,
    obsmaxrange2: 1700,
    changeObjectInterval: 20000,
    staticNum: 26,
    zoom: 'leo',
    url: '',
    country: 'Italy',
    sun: 'No Impact',
    volume: false
  };
  sensorList.TRO = {
    name: 'RAF Troodos, UK',
    googleName: 'RAF Troodos',
    shortName: 'TRO',
    type: 'Optical',
    lat: 34.912778,
    long: 32.883889,
    obshei: 0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 10,
    obsmaxel: 90,
    obsminrange: 25000,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 27,
    zoom: 'geo',
    url: '',
    country: 'United Kingdom',
    sun: 'No Impact',
    volume: false
  };
  sensorList.SDT = {
    name: 'ESA Space Debris Telescope, ESP',
    googleName: 'ESA Space Debris Telescope',
    shortName: 'SDT',
    type: 'Optical',
    lat: 28.3,
    long: -16.5097,
    obshei: 0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 10,
    obsmaxel: 90,
    obsminrange: 25000,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 28,
    zoom: 'geo',
    url: '',
    country: 'Spain',
    sun: 'No Impact',
    volume: false
  };

  // //////////////////////
  // RUSSIAN RADARS
  // //////////////////////
  sensorList.ARM = {
    name: 'Armavir, RUS',
    googleName: 'Armavir',
    shortName: 'ARM',
    type: 'Phased Array Radar',
    lat: 44.925106,
    long: 40.983894,
    obshei: 0.0,
    obsminaz: 55, // All Information via russianforces.org
    obsmaxaz: 295,
    obsminel: 2,
    obsmaxel: 60,
    obsminrange: 100,
    obsmaxrange: 4200,
    changeObjectInterval: 1000,
    staticNum: 13,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.BAL = {
    name: 'Balkhash, RUS',
    googleName: 'Balkhash',
    shortName: 'BAL',
    type: 'Phased Array Radar',
    lat: 46.603076,
    long: 74.530985,
    obshei: 0.0,
    obsminaz: 91, // All Information via russianforces.org
    obsmaxaz: 151,
    obsminel: 5.5,
    obsmaxel: 34.5,
    obsminrange: 385,
    obsmaxrange: 4600,
    changeObjectInterval: 1000,
    staticNum: 14,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.GAN = {
    name: 'Gantsevichi, RUS',
    googleName: 'Gantsevichi',
    shortName: 'GAN',
    type: 'Phased Array Radar',
    lat: 52.850000,
    long: 26.480000,
    obshei: 0.0,
    obsminaz: 190, // All Information via russianforces.org
    obsmaxaz: 310,
    obsminel: 3,
    obsmaxel: 80,
    obsminrange: 300,
    obsmaxrange: 6500,
    changeObjectInterval: 1000,
    staticNum: 15,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.LEK = {
    name: 'Lekhtusi, RUS',
    googleName: 'Lekhtusi',
    shortName: 'LEK',
    type: 'Phased Array Radar',
    lat: 60.275458,
    long: 30.546017,
    obshei: 0.0,
    obsminaz: 245,
    obsmaxaz: 355,
    obsminel: 2,
    obsmaxel: 70,
    obsminrange: 100,
    obsmaxrange: 4200,
    changeObjectInterval: 1000,
    staticNum: 16,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.MIS = {
    name: 'Mishelevka-D',
    googleName: 'Mishelevka',
    shortName: 'MIS',
    type: 'Phased Array Radar',
    lat: 52.855500,
    long: 103.231700,
    obshei: 0.0,
    obsminaz: 41, // All Information via russianforces.org
    obsmaxaz: 219,
    obsminel: 5.5,
    obsmaxel: 34.5,
    obsminrange: 250,
    obsmaxrange: 4600,
    changeObjectInterval: 1000,
    staticNum: 17,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.OLE = {
    name: 'Olenegorsk',
    googleName: 'Olenegorsk',
    shortName: 'OLE',
    type: 'Phased Array Radar',
    lat: 68.114100,
    long: 33.910200,
    obshei: 0.0,
    obsminaz: 280, // All Information via russianforces.org
    obsmaxaz: 340,
    obsminel: 5.5,
    obsmaxel: 34.5,
    obsminrange: 250,
    obsmaxrange: 4600,
    changeObjectInterval: 1000,
    staticNum: 18,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.PEC = {
    name: 'Pechora',
    googleName: 'Pechora',
    shortName: 'PEC',
    type: 'Phased Array Radar',
    lat: 65.210000,
    long: 57.295000,
    obshei: 0.0,
    obsminaz: 305, // All Information via russianforces.org
    obsmaxaz: 55,
    obsminel: 2,
    obsmaxel: 55,
    obsminrange: 300,
    obsmaxrange: 7200,
    changeObjectInterval: 1000,
    staticNum: 19,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.PIO = {
    name: 'Pionersky',
    googleName: 'Pionersky',
    shortName: 'PIO',
    type: 'Phased Array Radar',
    lat: 54.857294,
    long: 20.182350,
    obshei: 0.0,
    obsminaz: 187.5, // All Information via russianforces.org
    obsmaxaz: 292.5,
    obsminel: 2,
    obsmaxel: 60,
    obsminrange: 100,
    obsmaxrange: 4200,
    changeObjectInterval: 1000,
    staticNum: 20,
    zoom: 'leo',
    country: 'Russia',
    sun: 'No Impact',
    volume: false
  };
  sensorList.XUA = {
    name: 'Xuanhua, PRC',
    googleName: 'Xuanhua',
    shortName: 'XUA',
    type: 'Phased Array Radar',
    lat: 40.446944,
    long: 115.116389,
    obshei: 1.6,
    obsminaz: 300,    // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    obsmaxaz: 60,     // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    obsminel: 2,      // Information via globalsecurity.org
    obsmaxel: 80,     // Information via globalsecurity.org
    obsminrange: 300, // TODO: Verify
    obsmaxrange: 3000, // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    changeObjectInterval: 1000,
    staticNum: 21,
    zoom: 'leo',
    country: 'China',
    sun: 'No Impact',
    volume: false
  };

  // ISON Sensors
  sensorList.MAY = {
    name: 'Mayhill, NM',
    googleName: 'Mayhill',
    shortName: 'MAY',
    type: 'Optical',
    lat: 32.9039,
    long: -105.5289,
    obshei: 2.225,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 10,
    obsmaxel: 90,
    obsminrange: 25000,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 29,
    zoom: 'geo',
    country: 'USA',
    sun: 'No Impact',
    volume: false
  };

  sensorManager.sensorListLength = function () {
    var sensorListCount = 0;
    for (var sensor in sensorList) {
      if (sensorList.hasOwnProperty(sensor)) {
        sensorListCount++;
      }
    }
    return sensorListCount;
  };
  sensorManager.curSensorPositon = [0, 0, 0];
  sensorManager.selectedSensor = {};
  sensorManager.whichRadar = '';
  sensorManager.setSensor = function (selectedSensor, staticNum) {
    if (selectedSensor == null && staticNum == null) return;
    var sensor;
    if (selectedSensor === 'SSN') {
      var allSSNSensors = [];
      for (sensor in sensorList) {
        if ((sensorList[sensor].country === 'United States') ||
        (sensorList[sensor].country === 'United Kingdom') ||
        (sensorList[sensor].country === 'Norway')) {
          allSSNSensors.push(sensorList[sensor]);
        }
      }
      satCruncher.postMessage({
        typ: 'offset',
        dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
        setlatlong: true,
        sensor: allSSNSensors,
        multiSensor: true
      });
      satellite.setobs(sensorManager.sensorList.COD);
      satellite.getsensorinfo();
      selectSat(-1);
      setTimeout(satSet.setColorScheme, 1500, ColorScheme.default, true);
    } else if (selectedSensor === 'NATO-MW') {
      var natoMWSensors = [];
      natoMWSensors.push(sensorManager.sensorList.BLE);
      natoMWSensors.push(sensorManager.sensorList.CAV);
      natoMWSensors.push(sensorManager.sensorList.COD);
      natoMWSensors.push(sensorManager.sensorList.CLR);
      natoMWSensors.push(sensorManager.sensorList.FYL);
      natoMWSensors.push(sensorManager.sensorList.THL);
      satCruncher.postMessage({
        typ: 'offset',
        dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
        setlatlong: true,
        sensor: natoMWSensors,
        multiSensor: true
      });
      satellite.setobs(sensorManager.sensorList.COD);
      satellite.getsensorinfo();
      selectSat(-1);
      setTimeout(satSet.setColorScheme, 1500, ColorScheme.default, true);
    } else if (selectedSensor === 'RUS-ALL') {
      var rusSensors = [];
      rusSensors.push(sensorManager.sensorList.ARM);
      rusSensors.push(sensorManager.sensorList.BAL);
      rusSensors.push(sensorManager.sensorList.GAN);
      rusSensors.push(sensorManager.sensorList.LEK);
      rusSensors.push(sensorManager.sensorList.MIS);
      rusSensors.push(sensorManager.sensorList.OLE);
      rusSensors.push(sensorManager.sensorList.PEC);
      rusSensors.push(sensorManager.sensorList.PIO);
      satCruncher.postMessage({
        typ: 'offset',
        dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
        setlatlong: true,
        sensor: rusSensors,
        multiSensor: true
      });
      satellite.setobs(sensorManager.sensorList.ARM);
      satellite.getsensorinfo();
      selectSat(-1);
      setTimeout(satSet.setColorScheme, 1500, ColorScheme.default, true);
    } else {
      for (sensor in sensorList) {
        if (sensorList[sensor] === selectedSensor || (sensorList[sensor].staticNum === staticNum && typeof staticNum != 'undefined')) {
          sensorManager.selectedSensor = sensorList[sensor];
          ga('send', 'event', 'Sensor', sensorList[sensor].googleName, 'Selected');
          // Do For All Sensors
          sensorManager.whichRadar = sensorManager.selectedSensor.shortName;
          satCruncher.postMessage({
            typ: 'offset',
            dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
            setlatlong: true,
            sensor: sensorManager.selectedSensor
          });
          satellite.setobs(sensorManager.selectedSensor);

          $('#sensor-info-title').html("<a class='iframe' href='" + sensorManager.selectedSensor.url + "'>" + sensorManager.selectedSensor.name + '</a>');
          $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
          $('#sensor-type').html(sensorManager.selectedSensor.type);
          $('#sensor-country').html(sensorManager.selectedSensor.country);
          selectSat(-1);
          changeZoom(sensorManager.selectedSensor.zoom);
          camSnap(latToPitch(sensorManager.selectedSensor.lat), longToYaw(sensorManager.selectedSensor.long));
          satellite.getsensorinfo();
        }
      }
    }

    uiController.legendMenuChange('default');
  };

  sensorManager.sensorList = sensorList;
  window.sensorManager = sensorManager;
})();
