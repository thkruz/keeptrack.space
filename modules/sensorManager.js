// Sensor Manager (sensorManager)
(function () {
  var sensorManager = {};
  var sensorList = {};

  sensorList.COD = {
    name: 'Cape Cod AFS, Massachusetts',
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
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.BLE = {
    name: 'Beale AFB, California',
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
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.CLR = {
    name: 'Clear AFS, Alaska',
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
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.EGL = {
    name: 'Eglin AFB, Florida',
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
    name: 'RAF Fylingdales, United Kingdom',
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
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    country: 'United Kingdom',
    sun: 'No Impact',
    volume: false
  };
  sensorList.CAV = {
    name: 'Cavalier AFS, North Dakota',
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
    linkAEHF: true,
    zoom: 'leo',
    url: 'https://mostlymissiledefense.com/2012/04/12/parcs-cavalier-radar-april-12-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: true
  };
  sensorList.THL = {
    name: 'Thule AFB, Greenland',
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
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.CDN = {
    name: 'Cobra Dane, Alaska',
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
    linkWGS: true,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: true
  };
  sensorList.ALT = {
    name: 'ALTAIR, Kwajalein Atoll',
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
    linkAEHF: true,
    linkWGS: true,
    zoom: 'geo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte005.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.MIL = {
    name: 'Millstone, Massachusetts',
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
    obsminrange: 0,
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
    name: 'Maui, Hawaii',
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
    obsminrange: 0,
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
    name: 'Socorro, New Mexico',
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
    obsminrange: 0,
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
    name: 'Ascension Island, United Kingdom',
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
  sensorList.HOL = {
    name: 'C-Band (Holt) Radar, Australia',
    googleName: 'C-Band (Holt) Radar',
    shortName: 'HOL',
    type: 'Mechanical',
    lat: -21.816195,
    long: 114.165637,
    obshei: 0.0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 200,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 32,
    zoom: 'geo',
    url: '',
    country: 'Australia',
    sun: 'No Impact',
    volume: false
  };

  // //////////////
  // TPY-2 RADARS
  // //////////////

  sensorList.HAR = {
    name: 'Har Keren TPY-2, Israel',
    googleName: 'Har Keren',
    shortName: 'HAR',
    type: 'Phased Array Radar',
    lat: 30.995807,
    long: 34.496062,
    obshei: 0.173,
    obsminaz: 5,
    obsmaxaz: 125,
    obsminel: 5,
    obsmaxel: 95,
    obsminrange: 0,
    obsmaxrange: 2000,
    changeObjectInterval: 1000,
    staticNum: 51,
    zoom: 'leo',
    url: '',
    country: 'Israel',
    sun: 'No Impact',
    volume: false
  };
  sensorList.QTR = {
    name: 'Centcom TPY-2, Qatar',
    googleName: 'Centcom',
    shortName: 'QTR',
    type: 'Phased Array Radar',
    lat: 25.315980,
    long: 51.146515,
    obshei: 0.01,
    obsminaz: 335,
    obsmaxaz: 95,
    obsminel: 0,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 2000,
    changeObjectInterval: 1000,
    staticNum: 50,
    zoom: 'leo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };
  sensorList.KUR = {
    name: 'Kürecik Radar Station, Turkey',
    googleName: 'Kürecik Radar Station',
    shortName: 'KUR',
    type: 'Phased Array Radar',
    lat: 38.349444,
    long: 37.793611,
    obshei: 1.969,
    obsminaz: 40,
    obsmaxaz: 160,
    obsminel: 0,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 2000,
    changeObjectInterval: 1000,
    staticNum: 52,
    zoom: 'leo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  sensorList.SHA = {
    name: 'Shariki Communication Site, Japan',
    googleName: 'Shariki Communication Site',
    shortName: 'SHA',
    type: 'Phased Array Radar',
    lat: 40.888090,
    long: 140.337698,
    obshei: 0.010,
    obsminaz: 230,
    obsmaxaz: 350,
    obsminel: 0,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 2000,
    changeObjectInterval: 1000,
    staticNum: 53,
    zoom: 'leo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  sensorList.KCS = {
    name: 'Kyogamisaki Communication Site, Japan',
    googleName: 'Kyogamisaki Communication Site',
    shortName: 'KCS',
    type: 'Phased Array Radar',
    lat: 35.766667,
    long: 135.195278,
    obshei: 0.010,
    obsminaz: 210,
    obsmaxaz: 330,
    obsminel: 0,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 2000,
    changeObjectInterval: 1000,
    staticNum: 54,
    zoom: 'leo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  sensorList.SBX = {
    name: 'Sea-Based X-Band Radar, Pacific Ocean',
    googleName: 'Sea-Based X-Band Radar',
    shortName: 'SBX',
    type: 'Phased Array Radar',
    lat: 36.5012,
    long: 169.6941,
    obshei: 0.000,
    obsminaz: 275,
    obsmaxaz: 300,
    obsminel: 0,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 4025,
    changeObjectInterval: 1000,
    staticNum: 55,
    zoom: 'leo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  // //////////////////////
  // LEO LABS
  // //////////////////////

  sensorList.MSR = {
    name: 'Midland Space Radar, Texas',
    googleName: 'Midland Space Radar',
    shortName: 'MSR',
    type: 'Phased Array Radar',
    lat: 31.9643,
    long: -103.233245,
    obshei: 0.855,
    obsminaz: 70,
    obsmaxaz: 72,
    obsminel: 30,
    obsmaxel: 91, // 91 to ensure visual overlap
    obsminrange: 100,
    obsmaxrange: 1800,
    obsminaz2: 250,
    obsmaxaz2: 252,
    obsminel2: 30,
    obsmaxel2: 91, // 91 to ensure visual overlap
    obsminrange2: 100,
    obsmaxrange2: 1800,
    changeObjectInterval: 1000,
    staticNum: 38,
    zoom: 'leo',
    url: 'https://platform.leolabs.space/sites/msr',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  sensorList.PFISR = {
    name: 'Poker Flat Incoherent Scatter Radar, Alaska',
    googleName: 'Poker Flat Incoherent Scatter Radar',
    shortName: 'PFISR',
    type: 'Phased Array Radar',
    lat: 65.130029,
    long: -147.470992,
    obshei: 0.230,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 45,
    obsmaxel: 90, // 91 to ensure visual overlap
    obsminrange: 100,
    obsmaxrange: 1800,
    changeObjectInterval: 1000,
    staticNum: 39,
    zoom: 'leo',
    url: 'https://platform.leolabs.space/sites/pfisr',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  sensorList.KSR = {
    name: 'Kiwi Space Radar, New Zealand',
    googleName: 'Kiwi Space Radar',
    shortName: 'KSR',
    type: 'Phased Array Radar',
    lat: -45.038725,
    long: 170.095673,
    obshei: 0.0,
    obsminaz: 269,
    obsmaxaz: 271,
    obsminel: 20,
    obsmaxel: 91,
    obsminrange: 100,
    obsmaxrange: 1800,
    obsminaz2: 89,
    obsmaxaz2: 91,
    obsminel2: 20,
    obsmaxel2: 91,
    obsminrange2: 100,
    obsmaxrange2: 1800,
    changeObjectInterval: 1000,
    staticNum: 40,
    zoom: 'leo',
    url: 'https://platform.leolabs.space/sites/ksr',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  // //////////////////////
  // ESOC RADARS
  // //////////////////////
  sensorList.GRV = {
    name: 'Grand Réseau Adapté à la Veille Spatiale, France',
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
    name: 'Tracking and Imaging Radar, Germany',
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
    name: 'Croce del Nord, Italy',
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
    name: 'RAF Troodos, United Kingdom',
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
    obsminrange: 0,
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
    name: 'ESA Space Debris Telescope, Spain',
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
    obsminrange: 0,
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
    name: 'Armavir, Russia',
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
    name: 'Balkhash, Russia',
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
    name: 'Gantsevichi, Russia',
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
    name: 'Lekhtusi, Russia',
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
    name: 'Mishelevka-D, Russia',
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
    name: 'Olenegorsk, Russia',
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
    name: 'Pechora, Russia',
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
    name: 'Pionersky, Russia',
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
    name: 'Xuanhua, China',
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

  // Telescopes
  sensorList.MLS = {
    name: 'Mount Lemmon Survey, Arizona',
    googleName: 'Mount Lemmon Survey',
    shortName: 'MLS',
    type: 'Optical',
    lat: 32.442,
    long: -110.789,
    obshei: 2.791,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 10,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 30,
    zoom: 'geo',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  sensorList.PMO = {
    name: 'Purple Mountain Observatory, China',
    googleName: 'Purple Mountain Observatory',
    shortName: 'PMO',
    type: 'Optical',
    lat: 32.064946,
    long: 118.829677,
    obshei: 0.267,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 10,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 33,
    zoom: 'geo',
    country: 'China',
    sun: 'No Impact',
    volume: false
  };

  sensorList.PO = {
    name: 'Palomar Observatory, California',
    googleName: 'Palomar Observatory',
    shortName: 'PO',
    type: 'Optical',
    lat: 33.3564,
    long: -116.865,
    obshei: 1.712,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 10,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 34,
    zoom: 'geo',
    country: 'United States',
    sun: 'No Impact',
    volume: false
  };

  sensorList.LSO = {
    name: 'La Sagra Observatory, Spain',
    googleName: 'La Sagra Observatory',
    shortName: 'LSO',
    type: 'Optical',
    lat: 37.9839,
    long: -2.5644,
    obshei: 0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 10,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 35,
    zoom: 'geo',
    country: 'Spain',
    sun: 'No Impact',
    volume: false
  };

  // ISON Sensors
  sensorList.MAY = {
    name: 'Mayhill, New Mexico',
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
    obsminrange: 0,
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
      setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
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
      setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
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
      setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
    } else if (selectedSensor === 'LEO-LABS') {
      var leolabsSensors = [];
      leolabsSensors.push(sensorManager.sensorList.MSR);
      leolabsSensors.push(sensorManager.sensorList.PFISR);
      leolabsSensors.push(sensorManager.sensorList.KSR);
      satCruncher.postMessage({
        typ: 'offset',
        dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
        setlatlong: true,
        sensor: leolabsSensors,
        multiSensor: true
      });
      satellite.setobs(sensorManager.sensorList.MSR);
      satellite.getsensorinfo();
      selectSat(-1);
      setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
    } else if (selectedSensor === 'MD-ALL') {
      var mdSensors = [];
      mdSensors.push(sensorManager.sensorList.COD);
      mdSensors.push(sensorManager.sensorList.BLE);
      mdSensors.push(sensorManager.sensorList.CLR);
      mdSensors.push(sensorManager.sensorList.FYL);
      mdSensors.push(sensorManager.sensorList.THL);
      mdSensors.push(sensorManager.sensorList.HAR);
      mdSensors.push(sensorManager.sensorList.QTR);
      mdSensors.push(sensorManager.sensorList.KUR);
      mdSensors.push(sensorManager.sensorList.SHA);
      mdSensors.push(sensorManager.sensorList.KCS);
      mdSensors.push(sensorManager.sensorList.SBX);
      satCruncher.postMessage({
        typ: 'offset',
        dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
        setlatlong: true,
        sensor: mdSensors,
        multiSensor: true
      });
      satellite.setobs(sensorManager.sensorList.MSR);
      satellite.getsensorinfo();
      selectSat(-1);
      setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
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

    // uiController.legendMenuChange('default');
  };

  sensorManager.sensorList = sensorList;
  window.sensorManager = sensorManager;
})();
