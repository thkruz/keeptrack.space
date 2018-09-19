/*
  global

  $
  ga
  lookangles
  changeZoom
  camSnap
  latToPitch
  longToYaw
  saveAs
  Blob
  satCruncher
  timeManager

 */

function saveVariable (variable) {
  variable = JSON.stringify(variable);
  var blob = new Blob([variable], {type: 'text/plain;charset=utf-8'});
  saveAs(blob, 'variable.txt');
}

$.ajaxSetup({
  cache: false
});

// Launch Site Manager (launchSiteManager)
(function () {
  var launchSiteManager = {};
  var launchSiteList = {};
  launchSiteList.AFETR = {
    name: 'AFETR',
    lat: 28.46,
    lon: 279.45
  };
  launchSiteList.AFWTR = {
    name: 'AFWTR',
    lat: 34.77,
    lon: 239.4
  };
  launchSiteList.CAS = {
    name: 'CAS',
    lat: 28.1,
    lon: 344.6
  };
  launchSiteList.ERAS = {
    name: 'ERAS',
    lat: 28.46,
    lon: 279.45
  };
  launchSiteList.FRGUI = {
    name: 'FRGUI',
    lat: 5.23,
    lon: 307.24
  };
  launchSiteList.HGSTR = {
    name: 'HGSTR',
    lat: 31.09,
    lon: 357.17
  };
  launchSiteList.JSC = {
    name: 'JSC',
    lat: 41.11,
    lon: 100.46
  };
  launchSiteList.KODAK = {
    name: 'KODAK',
    lat: 57.43,
    lon: 207.67
  };
  launchSiteList.KSCUT = {
    name: 'KSCUT',
    lat: 31.25,
    lon: 131.07
  };
  launchSiteList.KWAJ = {
    name: 'KWAJ',
    lat: 9.04,
    lon: 167.74
  };
  launchSiteList.KYMTR = {
    name: 'KYMTR',
    lat: 48.57,
    lon: 46.25
  };
  launchSiteList.NSC = {
    name: 'NSC',
    lat: 34.42,
    lon: 127.52
  };
  launchSiteList.OREN = {
    name: 'OREN',
    lat: 51.2,
    lon: 59.85
  };
  launchSiteList.PKMTR = {
    name: 'PKMTR',
    lat: 62.92,
    lon: 40.57
  };
  launchSiteList.PMRF = {
    name: 'PMRF',
    lat: 22.02,
    lon: 200.22
  };
  launchSiteList.RLLC = {
    name: 'RLLC',
    lat: -39.26,
    lon: 177.86
  };
  launchSiteList.SADOL = {
    name: 'SADOL',
    lat: 75,
    lon: 40
  };
  launchSiteList.SEAL = {
    name: 'SEAL',
    lat: 0,
    lon: 210
  };
  launchSiteList.SEM = {
    name: 'SEM',
    lat: 35.23,
    lon: 53.92
  };
  launchSiteList.SNMLP = {
    name: 'SNMLP',
    lat: 2.94,
    lon: 40.21
  };
  launchSiteList.SRI = {
    name: 'SRI',
    lat: 13.73,
    lon: 80.23
  };
  launchSiteList.TNSTA = {
    name: 'TNSTA',
    lat: 30.39,
    lon: 130.96
  };
  launchSiteList.TSC = {
    name: 'TSC',
    lat: 39.14,
    lon: 111.96
  };
  launchSiteList.TTMTR = {
    name: 'TTMTR',
    lat: 45.95,
    lon: 63.35
  };
  launchSiteList.TNGH = {
    name: 'TNGH',
    lat: 40.85,
    lon: 129.66
  };
  launchSiteList.VOSTO = {
    name: 'VOSTO',
    lat: 51.88,
    lon: 128.33
  };
  launchSiteList.WLPIS = {
    name: 'WLPIS',
    lat: 37.84,
    lon: 284.53
  };
  launchSiteList.WOMRA = {
    name: 'WOMRA',
    lat: -30.95,
    lon: 136.5
  };
  launchSiteList.WRAS = {
    name: 'WRAS',
    lat: 34.77,
    lon: 239.4
  };
  launchSiteList.WSC = {
    name: 'WSC',
    lat: 19.61,
    lon: 110.95
  };
  launchSiteList.XSC = {
    name: 'XSC',
    lat: 28.24,
    lon: 102.02
  };
  launchSiteList.YAVNE = {
    name: 'YAVNE',
    lat: 31.88,
    lon: 34.68
  };
  launchSiteList.YUN = {
    name: 'YUN',
    lat: 39.66,
    lon: 124.7
  };
  launchSiteManager.launchSiteList = launchSiteList;
  window.launchSiteManager = launchSiteManager;
})();

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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    staticNum: 27,
    zoom: 'geo',
    url: '',
    country: 'Spain',
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
    sun: 'No Impact'
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
      console.log('setSensor - SSN');
      var allSSNSensors = [];
      for (sensor in sensorList) {
        if ((sensorList[sensor].country === 'United States') ||
        (sensorList[sensor].country === 'United Kingdom') ||
        (sensorList[sensor].country === 'Norway')) {
          allSSNSensors.push(sensorList[sensor]);
        }
      }
      console.log(allSSNSensors);
      satCruncher.postMessage({
        typ: 'offset',
        dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
        setlatlong: true,
        sensor: allSSNSensors,
        multiSensor: true
      });
      return;
    }
    for (sensor in sensorList) {
      if (sensorList[sensor] === selectedSensor || sensorList[sensor].staticNum === staticNum) {
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
        $('#sensor-sun').html(sensorManager.selectedSensor.sun);
        selectSat(-1);
        changeZoom(sensorManager.selectedSensor.zoom);
        console.log('2: ' + Date.now());
        camSnap(latToPitch(sensorManager.selectedSensor.lat), longToYaw(sensorManager.selectedSensor.long));
        satellite.getsensorinfo();
      }
    }

    uiController.legendMenuChange('default');
  };

  sensorManager.sensorList = sensorList;
  window.sensorManager = sensorManager;
})();

// TLE Manager (tleManager)
(function () {
  var tleManager = {};
  tleManager.missileSet = [];
  tleManager.analSatSet = [];
  tleManager.staticSet = [];
  tleManager.fieldOfViewSet = [];

  tleManager.init = function () {
    var i;
    for (i = 0; i < MAX_MISSILES; i++) {
      var missileInfo = {
        static: false,
        missile: true,
        active: false,
        type: '',
        name: i,
        latList: [],
        lonList: [],
        altList: [],
        timeList: []
      };
      tleManager.missileSet.push(missileInfo);
    }

    for (i = 0; i < MAX_ANALSATS; i++) {
      var analSatInfo = {
        static: false,
        missile: false,
        active: false,
        ON: 'Analyst Sat ' + i,
        C: 'ANALSAT',
        LV: 'Analyst Satellite',
        LS: 'ANALSAT',
        SCC_NUM: (60000 + i).toString(),
        TLE1: '1 ' + (60000 + i).toString() + 'U 58002B   17115.48668720 +.00000144 +00000-0 +16234-3 0  9994',
        TLE2: '2 ' + (60000 + i).toString() + ' 034.2502 167.2636 0042608 222.6554 121.5501 24.84703551080477',
        intlDes: (60000 + i).toString(),
        type: 'sat',
        id: i
      };
      tleManager.analSatSet.push(analSatInfo);
    }

    var sensorList = window.sensorManager.sensorList;
    for (var sensor in sensorList) {
      var sensorInfo = {
        static: true,
        staticNum: sensorList[sensor].staticNum,
        name: sensorList[sensor].name,
        type: sensorList[sensor].type,
        lat: sensorList[sensor].lat,
        lon: sensorList[sensor].long,
        changeObjectInterval: sensorList[sensor].changeObjectInterval
      };
      tleManager.staticSet.push(sensorInfo);
    }

    var launchSiteList = window.launchSiteManager.launchSiteList;
    for (var launchSite in launchSiteList) {
      var launchSiteInfo = {
        static: true,
        name: launchSiteList[launchSite].name,
        type: 'Launch Facility',
        lat: launchSiteList[launchSite].lat,
        lon: launchSiteList[launchSite].lon
      };
      tleManager.staticSet.push(launchSiteInfo);
    }

    for (i = 0; i < MAX_FIELD_OF_VIEW_MARKERS; i++) {
      var fieldOfViewMarker = {
        static: true,
        marker: true,
        id: i
      };
      tleManager.fieldOfViewSet.push(fieldOfViewMarker);
    }
  };
  tleManager.init();
  tleManager.extractCountry = function (C) {
    var country;
    country = C; // Assume it is right and overwrite if it is a code below.
    if (C === 'U') {
      country = 'Unknown';
    // Table Nested in ELSE to Make Hiding it Easier
    } else if (C === 'ANALSAT') {
      country = 'Analyst Satellite';
    } else {
      if (C === 'AB') { // Headquartered in Riyadh, Saudi Arabia
        country = 'Saudi Arabia';
      }
      if (C === 'AC') {
        country = 'AsiaSat Corp';
      }
      if (C === 'ALG') {
        country = 'Algeria';
      }
      if (C === 'ALL') {
        country = 'All';
      }
      if (C === 'ARGN') {
        country = 'Argentina';
      }
      if (C === 'ASRA') {
        country = 'Austria';
      }
      if (C === 'AUS') {
        country = 'Australia';
      }
      if (C === 'AZER') {
        country = 'Azerbaijan';
      }
      if (C === 'BEL') {
        country = 'Belgium';
      }
      if (C === 'BELA') {
        country = 'Belarus';
      }
      if (C === 'BERM') {
        country = 'Bermuda';
      }
      if (C === 'BOL') {
        country = 'Bolivia';
      }
      if (C === 'BRAZ') {
        country = 'Brazil';
      }
      if (C === 'CA') {
        country = 'Canada';
      }
      if (C === 'CHBZ') {
        country = 'China/Brazil';
      }
      if (C === 'CHLE') {
        country = 'Chile';
      }
      if (C === 'CIS') {
        country = 'Commonwealth of Ind States';
      }
      if (C === 'COL') {
        country = 'Colombia';
      }
      if (C === 'CZCH') {
        country = 'Czechoslovakia';
      }
      if (C === 'DEN') {
        country = 'Denmark';
      }
      if (C === 'ECU') {
        country = 'Ecuador';
      }
      if (C === 'EGYP') {
        country = 'Egypt';
      }
      if (C === 'ESA') {
        country = 'European Space Agency';
      }
      // if (C === 'ESA') {
      //   country = 'European Space Research Org';
      // }
      if (C === 'EST') {
        country = 'Estonia';
      }
      if (C === 'EUME') {
        country = 'EUMETSAT';
      }
      if (C === 'EUTE') {
        country = 'EUTELSAT';
      }
      if (C === 'FGER') {
        country = 'France/Germany';
      }
      if (C === 'FR') {
        country = 'France';
      }
      if (C === 'FRIT') {
        country = 'France/Italy';
      }
      if (C === 'GER') {
        country = 'Germany';
      }
      if (C === 'GLOB') { // Headquartered in Louisiana, USA
        country = 'United States';
      }
      if (C === 'GREC') {
        country = 'Greece';
      }
      if (C === 'HUN') {
        country = 'Hungary';
      }
      if (C === 'IM') { // Headquartered in London, UK
        country = 'United Kingdom';
      }
      if (C === 'IND') {
        country = 'India';
      }
      if (C === 'INDO') {
        country = 'Indonesia';
      }
      if (C === 'IRAN') {
        country = 'Iran';
      }
      if (C === 'IRAQ') {
        country = 'Iraq';
      }
      if (C === 'ISRA') {
        country = 'Israel';
      }
      if (C === 'ISS') {
        country = 'International';
      }
      if (C === 'IT') {
        country = 'Italy';
      }
      if (C === 'ITSO') { // Headquartered in Luxembourg District, Luxembourg
        country = 'Luxembourg';
      }
      if (C === 'JPN') {
        country = 'Japan';
      }
      if (C === 'KAZ') {
        country = 'Kazakhstan';
      }
      if (C === 'LAOS') {
        country = 'Laos';
      }
      if (C === 'LTU') {
        country = 'Lithuania';
      }
      if (C === 'LUXE') {
        country = 'Luxembourg';
      }
      if (C === 'MALA') {
        country = 'Malaysia';
      }
      if (C === 'MEX') {
        country = 'Mexico';
      }
      if (C === 'NATO') {
        country = 'North Atlantic Treaty Org';
      }
      if (C === 'NETH') {
        country = 'Netherlands';
      }
      if (C === 'NICO') { // Headquartered in Washington, USA
        country = 'United States';
      }
      if (C === 'NIG') {
        country = 'Nigeria';
      }
      if (C === 'NKOR') {
        country = 'North Korea';
      }
      if (C === 'NOR') {
        country = 'Norway';
      }
      if (C === 'O3B') { // Majority Shareholder Based in Luxembourg
        country = 'Luxembourg';
      }
      if (C === 'ORB') { // Headquartered in Louisiana, USA
        country = 'United States';
      }
      if (C === 'PAKI') {
        country = 'Pakistan';
      }
      if (C === 'PERU') {
        country = 'Peru';
      }
      if (C === 'POL') {
        country = 'Poland';
      }
      if (C === 'POR') {
        country = 'Portugal';
      }
      if (C === 'PRC') {
        country = 'China';
      }
      if (C === 'RASC') { // Headquartered in Mauritius
        country = 'Mauritius';
      }
      if (C === 'ROC') {
        country = 'Taiwan';
      }
      if (C === 'ROM') {
        country = 'Romania';
      }
      if (C === 'RP') {
        country = 'Philippines';
      }
      if (C === 'SAFR') {
        country = 'South Africa';
      }
      if (C === 'SAUD') {
        country = 'Saudi Arabia';
      }
      if (C === 'SEAL') { // Primary Shareholder Russian
        country = 'Russia';
      }
      if (C === 'RP') {
        country = 'Philippines';
      }
      if (C === 'SES') {
        country = 'Luxembourg';
      }
      if (C === 'SING') {
        country = 'Singapore';
      }
      if (C === 'SKOR') {
        country = 'South Korea';
      }
      if (C === 'SPN') {
        country = 'Spain';
      }
      if (C === 'STCT') {
        country = 'Singapore/Taiwan';
      }
      if (C === 'SWED') {
        country = 'Sweden';
      }
      if (C === 'SWTZ') {
        country = 'Switzerland';
      }
      if (C === 'THAI') {
        country = 'Thailand';
      }
      if (C === 'TMMC') {
        country = 'Turkmenistan/Monaco';
      }
      if (C === 'TURK') {
        country = 'Turkey';
      }
      if (C === 'UAE') {
        country = 'United Arab Emirates';
      }
      if (C === 'UK') {
        country = 'United Kingdom';
      }
      if (C === 'UKR') {
        country = 'Ukraine';
      }
      if (C === 'URY') {
        country = 'Uruguay';
      }
      if (C === 'US') {
        country = 'United States';
      }
      if (C === 'USBZ') {
        country = 'United States/Brazil';
      }
      if (C === 'VENZ') {
        country = 'Venezuela';
      }
      if (C === 'VTNM') {
        country = 'Vietnam';
      }
    }
    return country;
  };
  tleManager.extractLiftVehicle = function (LV) {
    switch (LV) {
      // ///////////////////////////////////////////////////////////////////////
      // UNITED STATES
      // ///////////////////////////////////////////////////////////////////////
      case 'Scout B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutb.html'>" + LV + '</a>');
        break;
      case 'Scout X-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutx-1.html'>" + LV + '</a>');
        break;
      case 'Scout X-4':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutx-4.html'>" + LV + '</a>');
        break;
      case 'Scout A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scouta.html'>" + LV + '</a>');
        break;
      case 'Scout G-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutg-1.html'>" + LV + '</a>');
        break;
      case 'Scout S-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scout.html'>" + LV + '</a>');
        break;
      case 'Delta 0300':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/d/delta0300.html'>" + LV + '</a>');
        break;
      case 'Falcon 9':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/f/falcon9.html'>" + LV + '</a>');
        break;
      case 'Falcon 9 v1.1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/f/falcon9v11.html'>" + LV + '</a>');
        break;
      case 'Atlas Agena B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/a/atlasagenab.html'>" + LV + '</a>');
        break;
      case 'Thor Ablestar':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/thorablestar.html'>" + LV + '</a>');
        break;

      // ///////////////////////////////////////////////////////////////////////
      // RUSSIA
      // ///////////////////////////////////////////////////////////////////////
      case 'Soyuz-ST-A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-st-a.html'>" + LV + '</a>');
        break;
      case 'Soyuz-ST-B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-st-b.html'>" + LV + '</a>');
        break;
      case 'Soyuz 11A511L':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz11a511l.html'>" + LV + '</a>');
        break;
      case 'Soyuz-U':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-u.html'>" + LV + '</a>');
        break;
      case 'Soyuz-U-PVB':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-u-pvb.html'>" + LV + '</a>');
        break;
      case 'Soyuz-FG':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-fg.html'>" + LV + '</a>');
        break;
      case 'Soyuz-2-1A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-2-1a.html'>" + LV + '</a>');
        break;
      case 'Soyuz-2-1B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-2-1b.html'>" + LV + '</a>');
        break;
      case 'Kosmos 11K65M':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/k/kosmos11k65m.html'>Kosmos 3M</a>");
        break;
      case 'Kosmos 65S3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/k/kosmos65s3.html'>" + LV + '</a>');
        break;
      case 'Tsiklon-2':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/tsiklon-2.html'>" + LV + '</a>');
        break;
      case 'Tsiklon-3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/tsiklon-3.html'>" + LV + '</a>');
        break;
      case 'Vostok 8A92M':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/v/vostok8a92m.html'>" + LV + '</a>');
        break;
      case 'Vostok 8K72K':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/v/vostok8k72k.html'>" + LV + '</a>');
        break;
      // ///////////////////////////////////////////////////////////////////////
      // CHINA
      // ///////////////////////////////////////////////////////////////////////
      case 'Chang Zheng 1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng1.html'>" + LV + '</a>');
        break;
      case 'Chang Zheng 3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng3.html'>" + LV + '</a>');
        break;
      case 'Chang Zheng 3A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng3a.html'>" + LV + '</a>');
        break;
      case 'Chang Zheng 4':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng4.html'>" + LV + '</a>');
        break;
      case 'Chang Zheng 4B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng4b.html'>" + LV + '</a>');
        break;
      case 'Chang Zheng 2C-III/SD':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng2c-iiisd.html'>" + LV + '</a>');
        break;
      case 'Chang Zheng 2C':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng2c.html'>" + LV + '</a>');
        break;
      case 'Chang Zheng 6':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng6.html'>" + LV + '</a>');
        break;
    }
  };
  tleManager.extractLaunchSite = function (LS) {
    var site;
    var sitec;
    if (LS === 'U' || LS === 'Unknown') {
      site = 'Unknown';
      sitec = 'Unknown';
    // Table Nested in ELSE to Make Hiding it Easier
    } else if (LS === 'ANALSAT') {
      site = 'Analyst Satellite';
      sitec = 'Analyst Satellite';
    } else {
      if (LS === 'AFETR') {
        site = 'Cape Canaveral AFS';
        sitec = 'United States';
      }
      if (LS === 'AFWTR') {
        site = 'Vandenberg AFB';
        sitec = 'United States';
      }
      if (LS === 'CAS') {
        site = 'Canary Islands';
        sitec = 'United States';
      }
      if (LS === 'FRGUI') {
        site = 'French Guiana';
        sitec = 'United States';
      }
      if (LS === 'HGSTR') {
        site = 'Hammaguira STR';
        sitec = 'Algeria';
      }
      if (LS === 'KSCUT') {
        site = 'Uchinoura Space Center';
        sitec = 'Japan';
      }
      if (LS === 'KYMTR') {
        site = 'Kapustin Yar MSC';
        sitec = 'Russia';
      }
      if (LS === 'PKMTR') {
        site = 'Plesetsk MSC';
        sitec = 'Russia';
      }
      if (LS === 'WSC') {
        site = 'Wenchang SLC';
        sitec = 'China';
      }
      if (LS === 'SNMLP') {
        site = 'San Marco LP';
        sitec = 'Kenya';
      }
      if (LS === 'SRI') {
        site = 'Satish Dhawan SC';
        sitec = 'India';
      }
      if (LS === 'TNSTA') {
        site = 'Tanegashima SC';
        sitec = 'Japan';
      }
      if (LS === 'TTMTR') {
        site = 'Baikonur Cosmodrome';
        sitec = 'Kazakhstan';
      }
      if (LS === 'WLPIS') {
        site = 'Wallops Island';
        sitec = 'United States';
      }
      if (LS === 'WOMRA') {
        site = 'Woomera';
        sitec = 'Australia';
      }
      if (LS === 'VOSTO') {
        site = 'Vostochny Cosmodrome';
        sitec = 'Russia';
      }
      if (LS === 'PMRF') {
        site = 'PMRF Barking Sands';
        sitec = 'United States';
      }
      if (LS === 'SEAL') {
        site = 'Sea Launch Odyssey';
        sitec = 'Russia';
      }
      if (LS === 'KWAJ') {
        site = 'Kwajalein';
        sitec = 'United States';
      }
      if (LS === 'ERAS') {
        site = 'Pegasus East';
        sitec = 'United States';
      }
      if (LS === 'JSC') {
        site = 'Jiuquan SLC';
        sitec = 'China';
      }
      if (LS === 'SVOB') {
        site = 'Svobodny';
        sitec = 'Russia';
      }
      if (LS === 'UNKN') {
        site = 'Unknown';
        sitec = 'Unknown';
      }
      if (LS === 'TSC') {
        site = 'Taiyaun SC';
        sitec = 'China';
      }
      if (LS === 'WRAS') {
        site = 'Pegasus West';
        sitec = 'United States';
      }
      if (LS === 'XSC') {
        site = 'Xichang SC';
        sitec = 'China';
      }
      if (LS === 'YAVNE') {
        site = 'Yavne';
        sitec = 'Israel';
      }
      if (LS === 'OREN') {
        site = 'Orenburg';
        sitec = 'Russia';
      }
      if (LS === 'SADOL') {
        site = 'Submarine Launch';
        sitec = 'Russia';
      }
      if (LS === 'KODAK') {
        site = 'Kodiak Island';
        sitec = 'United States';
      }
      if (LS === 'SEM') {
        site = 'Semnan';
        sitec = 'Iran';
      }
      if (LS === 'YUN') {
        site = 'Sohae SLS';
        sitec = 'North Korea';
      }
      if (LS === 'TNGH') {
        site = 'Tonghae SLG';
        sitec = 'North Korea';
      }
      if (LS === 'NSC') {
        site = 'Naro Space Center';
        sitec = 'South Korea';
      }
      if (LS === 'RLLC') {
        site = 'Rocket Labs LC';
        sitec = 'New Zealand';
      }
    }
    return {
      site: site,
      sitec: sitec
    };
  };

  window.tleManager = tleManager;
})();
