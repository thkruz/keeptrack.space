/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
http://keeptrack.space

All code is Copyright © 2016-2020 by Theodore Kruczek. All rights reserved.
No part of this web site may be reproduced, published, distributed, displayed,
performed, copied or stored for public or private use, without written
permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

// Sensor Manager (sensorManager)
;(function () {
  var sensorManager = {}
  sensorManager.tempSensor = {}
  sensorManager.checkSensorSelected = () => {
    if (sensorManager.currentSensor.lat != null) {
      return true
    } else {
      return false
    }
  }

  sensorManager.defaultSensor = {}
  sensorManager.currentSensor = {}
  sensorManager.defaultSensor.observerGd = {
    lat: null,
    longitude: 0,
    latitude: 0,
    height: 0,
  }
  sensorManager.currentSensor = sensorManager.defaultSensor

  var sensorList = {}

  sensorList.COD = {
    name: 'Cape Cod AFS, Massachusetts',
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
    obsmaxrange: 5556,
    changeObjectInterval: 1000,
    staticNum: 1,
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.BLE = {
    name: 'Beale AFB, California',
    shortName: 'BLE',
    type: 'Phased Array Radar',
    lat: 39.136064,
    long: -121.351237,
    obshei: 0.112, // Open Street Maps
    obsminaz: 126,
    obsmaxaz: 6,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 5556,
    changeObjectInterval: 1000,
    staticNum: 0,
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.CLR = {
    name: 'Clear AFS, Alaska',
    shortName: 'CLR',
    type: 'Phased Array Radar',
    lat: 64.290556,
    long: -149.186944,
    obshei: 0.175, // Open Street Maps
    obsminaz: 184,
    obsmaxaz: 64,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 5556,
    changeObjectInterval: 1000,
    staticNum: 2,
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.EGL = {
    name: 'Eglin AFB, Florida',
    shortName: 'EGL',
    type: 'Phased Array Radar',
    lat: 30.572411,
    long: -86.214836,
    obshei: 0.039, // Open Street Maps
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
    volume: false,
  }
  sensorList.FYL = {
    name: 'RAF Fylingdales, United Kingdom',
    shortName: 'FYL',
    type: 'Phased Array Radar',
    lat: 54.361758,
    long: -0.670051,
    obshei: 0.26, // Open Street Maps
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 5556,
    changeObjectInterval: 1000,
    staticNum: 4,
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    country: 'United Kingdom',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.CAV = {
    name: 'Cavalier AFS, North Dakota',
    shortName: 'CAV',
    type: 'Phased Array Radar',
    lat: 48.724567,
    long: -97.899755,
    obshei: 0.352, // Open Street Maps
    obsminaz: 298,
    obsmaxaz: 78,
    obsminel: 1.9,
    obsmaxel: 95,
    obsminrange: 200,
    obsmaxrange: 3300, // 1,780 Nm http://www.fortwiki.com/Cavalier_Air_Force_Station
    changeObjectInterval: 1000,
    staticNum: 5,
    linkAEHF: true,
    zoom: 'leo',
    url:
      'https://mostlymissiledefense.com/2012/04/12/parcs-cavalier-radar-april-12-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: true,
  }
  sensorList.THL = {
    name: 'Thule AFB, Greenland',
    shortName: 'THL',
    type: 'Phased Array Radar',
    lat: 76.570322,
    long: -68.299211,
    obshei: 0.392, // Open Street Maps
    obsminaz: 297,
    obsmaxaz: 177,
    obsminel: 3,
    obsmaxel: 85,
    obsminrange: 200,
    obsmaxrange: 5556,
    changeObjectInterval: 1000,
    staticNum: 6,
    linkAEHF: true,
    linkWGS: true,
    zoom: 'leo',
    url: 'http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.CDN = {
    name: 'Cobra Dane, Alaska',
    shortName: 'CDN',
    type: 'Phased Array Radar',
    lat: 52.737,
    long: 174.092,
    obshei: 0.066, // Open Street Maps
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
    volume: true,
  }
  sensorList.ALT = {
    name: 'ALTAIR, Kwajalein Atoll',
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
    volume: false,
  }
  sensorList.MMW = {
    name: 'Millimeter Wave Radar, Kwajalein Atoll',
    shortName: 'MMW',
    type: 'Mechanical',
    lat: 8.756668,
    long: 167.773334,
    obshei: 0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 2500,
    changeObjectInterval: 20000,
    staticNum: 61,
    linkAEHF: false,
    linkWGS: false,
    zoom: 'leo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.ALC = {
    name: 'ALCOR Radar, Kwajalein Atoll',
    shortName: 'ALC',
    type: 'Mechanical',
    lat: 8.716668,
    long: 167.773334,
    obshei: 0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 2300,
    changeObjectInterval: 20000,
    staticNum: 62,
    linkAEHF: false,
    linkWGS: false,
    zoom: 'leo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.TDX = {
    name: 'TRADEX Radar, Kwajalein Atoll',
    shortName: 'TDX',
    type: 'Mechanical',
    lat: 8.756668,
    long: 167.733334,
    obshei: 0,
    obsminaz: 0,
    obsmaxaz: 360,
    obsminel: 1,
    obsmaxel: 90,
    obsminrange: 0,
    obsmaxrange: 200000,
    changeObjectInterval: 20000,
    staticNum: 63,
    linkAEHF: false,
    linkWGS: false,
    zoom: 'geo',
    url: '',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.MIL = {
    name: 'Millstone, Massachusetts',
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
    url:
      'https://mostlymissiledefense.com/2012/05/05/space-surveillance-sensors-millstone-hill-radar/',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.DGC = {
    name: 'Diego Garcia',
    shortName: 'DGC',
    type: 'Optical',
    lat: -7.29648,
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
    url:
      'https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.MAU = {
    name: 'Maui, Hawaii',
    shortName: 'MAU',
    type: 'Optical',
    lat: 20.70835,
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
    url:
      'https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.SOC = {
    name: 'Socorro, New Mexico',
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
    url:
      'https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/',
    country: 'United States',
    sun: 'No Impact',
    volume: false,
  }
  sensorList.ASC = {
    name: 'Ascension Island, United Kingdom',
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
    volume: false,
  }
  sensorList.GLB = {
    name: 'Globus II, NOR',
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
    volume: false,
  }
  sensorList.HOL = {
    name: 'C-Band (Holt) Radar, Australia',
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
    volume: false,
  }

  // //////////////
  // TPY-2 RADARS
  // //////////////

  sensorList.HAR = {
    name: 'Har Keren TPY-2, Israel',
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
    volume: false,
  }
  sensorList.QTR = {
    name: 'Centcom TPY-2, Qatar',
    shortName: 'QTR',
    type: 'Phased Array Radar',
    lat: 25.31598,
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
    volume: false,
  }
  sensorList.KUR = {
    name: 'Kürecik Radar Station, Turkey',
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
    volume: false,
  }

  sensorList.SHA = {
    name: 'Shariki Communication Site, Japan',
    shortName: 'SHA',
    type: 'Phased Array Radar',
    lat: 40.88809,
    long: 140.337698,
    obshei: 0.01,
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
    volume: false,
  }

  sensorList.KCS = {
    name: 'Kyogamisaki Communication Site, Japan',
    shortName: 'KCS',
    type: 'Phased Array Radar',
    lat: 35.766667,
    long: 135.195278,
    obshei: 0.01,
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
    volume: false,
  }

  sensorList.SBX = {
    name: 'Sea-Based X-Band Radar, Pacific Ocean',
    shortName: 'SBX',
    type: 'Phased Array Radar',
    lat: 36.5012,
    long: 169.6941,
    obshei: 0.0,
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
    volume: false,
  }

  // //////////////////////
  // LEO LABS
  // //////////////////////

  sensorList.MSR = {
    name: 'Midland Space Radar, Texas',
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
    volume: false,
  }

  sensorList.PFISR = {
    name: 'Poker Flat Incoherent Scatter Radar, Alaska',
    shortName: 'PFISR',
    type: 'Phased Array Radar',
    lat: 65.130029,
    long: -147.470992,
    obshei: 0.23,
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
    volume: false,
  }

  sensorList.KSR = {
    name: 'Kiwi Space Radar, New Zealand',
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
    volume: false,
  }

  // //////////////////////
  // ESOC RADARS
  // //////////////////////
  sensorList.GRV = {
    name: 'Grand Réseau Adapté à la Veille Spatiale, France',
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
    volume: true,
  }
  sensorList.TIR = {
    name: 'Tracking and Imaging Radar, Germany',
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
    volume: false,
  }
  sensorList.NRC = {
    name: 'Croce del Nord, Italy',
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
    volume: false,
  }
  sensorList.TRO = {
    name: 'RAF Troodos, United Kingdom',
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
    volume: false,
  }
  sensorList.SDT = {
    name: 'ESA Space Debris Telescope, Spain',
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
    volume: false,
  }

  // //////////////////////
  // RUSSIAN RADARS
  // //////////////////////
  sensorList.ARM = {
    name: 'Armavir, Russia',
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
    volume: false,
  }
  sensorList.BAL = {
    name: 'Balkhash, Russia',
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
    volume: false,
  }
  sensorList.GAN = {
    name: 'Gantsevichi, Russia',
    shortName: 'GAN',
    type: 'Phased Array Radar',
    lat: 52.85,
    long: 26.48,
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
    volume: false,
  }
  sensorList.LEK = {
    name: 'Lekhtusi, Russia',
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
    volume: false,
  }
  sensorList.MIS = {
    name: 'Mishelevka-D, Russia',
    shortName: 'MIS',
    type: 'Phased Array Radar',
    lat: 52.8555,
    long: 103.2317,
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
    volume: false,
  }
  sensorList.OLE = {
    name: 'Olenegorsk, Russia',
    shortName: 'OLE',
    type: 'Phased Array Radar',
    lat: 68.1141,
    long: 33.9102,
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
    volume: false,
  }
  sensorList.PEC = {
    name: 'Pechora, Russia',
    shortName: 'PEC',
    type: 'Phased Array Radar',
    lat: 65.21,
    long: 57.295,
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
    volume: false,
  }
  sensorList.PIO = {
    name: 'Pionersky, Russia',
    shortName: 'PIO',
    type: 'Phased Array Radar',
    lat: 54.857294,
    long: 20.18235,
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
    volume: false,
  }
  sensorList.XUA = {
    name: 'Xuanhua, China',
    shortName: 'XUA',
    type: 'Phased Array Radar',
    lat: 40.446944,
    long: 115.116389,
    obshei: 1.6,
    obsminaz: 300, // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    obsmaxaz: 60, // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    obsminel: 2, // Information via globalsecurity.org
    obsmaxel: 80, // Information via globalsecurity.org
    obsminrange: 300,
    obsmaxrange: 3000, // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    changeObjectInterval: 1000,
    staticNum: 21,
    zoom: 'leo',
    country: 'China',
    sun: 'No Impact',
    volume: false,
  }

  // Telescopes
  sensorList.MLS = {
    name: 'Mount Lemmon Survey, Arizona',
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
    volume: false,
  }

  sensorList.PMO = {
    name: 'Purple Mountain Observatory, China',
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
    volume: false,
  }

  sensorList.PO = {
    name: 'Palomar Observatory, California',
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
    volume: false,
  }

  sensorList.LSO = {
    name: 'La Sagra Observatory, Spain',
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
    volume: false,
  }

  // ISON Sensors
  sensorList.MAY = {
    name: 'Mayhill, New Mexico',
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
    volume: false,
  }

  sensorManager.sensorListLength = function () {
    var sensorListCount = 0
    for (var sensor in sensorList) {
      if (sensorList.hasOwnProperty(sensor)) {
        sensorListCount++
      }
    }
    return sensorListCount
  }
  sensorManager.curSensorPositon = [0, 0, 0]
  sensorManager.selectedSensor = {}
  sensorManager.whichRadar = ''
  sensorManager.setSensor = function (selectedSensor, staticNum) {
    try {
      localStorage.setItem(
        'currentSensor',
        JSON.stringify([selectedSensor, staticNum]),
      )
    } catch (e) {
      console.log(`Couldn't clear the current sensor info!`)
    }
    if (selectedSensor == null && staticNum == null) return
    var sensor
    if (selectedSensor === 'SSN') {
      var allSSNSensors = []
      for (sensor in sensorList) {
        if (
          sensorList[sensor].country === 'United States' ||
          sensorList[sensor].country === 'United Kingdom' ||
          sensorList[sensor].country === 'Norway'
        ) {
          allSSNSensors.push(sensorList[sensor])
        }
      }
      satCruncher.postMessage({
        typ: 'offset',
        dat:
          timeManager.propOffset.toString() +
          ' ' +
          timeManager.propRate.toString(),
        setlatlong: true,
        sensor: allSSNSensors,
        multiSensor: true,
      })
      satellite.setobs(sensorManager.sensorList.COD)
      uiManager.getsensorinfo()
      selectSat(-1)
      satSet.setColorScheme(settingsManager.currentColorScheme, true)
      // setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
    } else if (selectedSensor === 'NATO-MW') {
      var natoMWSensors = []
      natoMWSensors.push(sensorManager.sensorList.BLE)
      natoMWSensors.push(sensorManager.sensorList.CAV)
      natoMWSensors.push(sensorManager.sensorList.COD)
      natoMWSensors.push(sensorManager.sensorList.CLR)
      natoMWSensors.push(sensorManager.sensorList.FYL)
      natoMWSensors.push(sensorManager.sensorList.THL)
      satCruncher.postMessage({
        typ: 'offset',
        dat:
          timeManager.propOffset.toString() +
          ' ' +
          timeManager.propRate.toString(),
        setlatlong: true,
        sensor: natoMWSensors,
        multiSensor: true,
      })
      satellite.setobs(sensorManager.sensorList.COD)
      uiManager.getsensorinfo()
      selectSat(-1)
      satSet.setColorScheme(settingsManager.currentColorScheme, true)
      // setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
    } else if (selectedSensor === 'RUS-ALL') {
      var rusSensors = []
      rusSensors.push(sensorManager.sensorList.ARM)
      rusSensors.push(sensorManager.sensorList.BAL)
      rusSensors.push(sensorManager.sensorList.GAN)
      rusSensors.push(sensorManager.sensorList.LEK)
      rusSensors.push(sensorManager.sensorList.MIS)
      rusSensors.push(sensorManager.sensorList.OLE)
      rusSensors.push(sensorManager.sensorList.PEC)
      rusSensors.push(sensorManager.sensorList.PIO)
      satCruncher.postMessage({
        typ: 'offset',
        dat:
          timeManager.propOffset.toString() +
          ' ' +
          timeManager.propRate.toString(),
        setlatlong: true,
        sensor: rusSensors,
        multiSensor: true,
      })
      satellite.setobs(sensorManager.sensorList.ARM)
      uiManager.getsensorinfo()
      selectSat(-1)
      satSet.setColorScheme(settingsManager.currentColorScheme, true)
      // setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
    } else if (selectedSensor === 'LEO-LABS') {
      var leolabsSensors = []
      leolabsSensors.push(sensorManager.sensorList.MSR)
      leolabsSensors.push(sensorManager.sensorList.PFISR)
      leolabsSensors.push(sensorManager.sensorList.KSR)
      satCruncher.postMessage({
        typ: 'offset',
        dat:
          timeManager.propOffset.toString() +
          ' ' +
          timeManager.propRate.toString(),
        setlatlong: true,
        sensor: leolabsSensors,
        multiSensor: true,
      })
      satellite.setobs(sensorManager.sensorList.MSR)
      uiManager.getsensorinfo()
      selectSat(-1)
      satSet.setColorScheme(settingsManager.currentColorScheme, true)
      // setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
    } else if (selectedSensor === 'MD-ALL') {
      var mdSensors = []
      mdSensors.push(sensorManager.sensorList.COD)
      mdSensors.push(sensorManager.sensorList.BLE)
      mdSensors.push(sensorManager.sensorList.CLR)
      mdSensors.push(sensorManager.sensorList.FYL)
      mdSensors.push(sensorManager.sensorList.THL)
      mdSensors.push(sensorManager.sensorList.HAR)
      mdSensors.push(sensorManager.sensorList.QTR)
      mdSensors.push(sensorManager.sensorList.KUR)
      mdSensors.push(sensorManager.sensorList.SHA)
      mdSensors.push(sensorManager.sensorList.KCS)
      mdSensors.push(sensorManager.sensorList.SBX)
      satCruncher.postMessage({
        typ: 'offset',
        dat:
          timeManager.propOffset.toString() +
          ' ' +
          timeManager.propRate.toString(),
        setlatlong: true,
        sensor: mdSensors,
        multiSensor: true,
      })
      satellite.setobs(sensorManager.sensorList.MSR)
      uiManager.getsensorinfo()
      selectSat(-1)
      satSet.setColorScheme(settingsManager.currentColorScheme, true)
      // setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
    } else {
      for (sensor in sensorList) {
        // console.log(sensorList[sensor] == selectedSensor);
        if (
          sensorList[sensor] == selectedSensor ||
          (sensorList[sensor].staticNum === staticNum &&
            typeof staticNum != 'undefined')
        ) {
          sensorManager.selectedSensor = sensorList[sensor]
          if (settingsManager.isOfficialWebsite)
            ga(
              'send',
              'event',
              'Sensor',
              sensorList[sensor].shortName,
              'Selected',
            )
          // Do For All Sensors
          sensorManager.whichRadar = sensorManager.selectedSensor.shortName
          satCruncher.postMessage({
            typ: 'offset',
            dat:
              timeManager.propOffset.toString() +
              ' ' +
              timeManager.propRate.toString(),
            setlatlong: true,
            sensor: sensorManager.selectedSensor,
          })
          satellite.setobs(sensorManager.selectedSensor)

          $('#sensor-info-title').html(
            "<a class='iframe' href='" +
              sensorManager.selectedSensor.url +
              "'>" +
              sensorManager.selectedSensor.name +
              '</a>',
          )
          $('a.iframe').colorbox({
            iframe: true,
            width: '80%',
            height: '80%',
            fastIframe: false,
            closeButton: false,
          })
          $('#sensor-type').html(sensorManager.selectedSensor.type)
          $('#sensor-country').html(sensorManager.selectedSensor.country)
          selectSat(-1)
          satSet.setColorScheme(settingsManager.currentColorScheme, true)
          // setTimeout(satSet.setColorScheme, 1500, settingsManager.currentColorScheme, true);
          changeZoom(sensorManager.selectedSensor.zoom)
          camSnap(
            latToPitch(sensorManager.selectedSensor.lat),
            longToYaw(sensorManager.selectedSensor.long),
          )
          uiManager.getsensorinfo()
        }
      }
    }

    // uiManager.legendMenuChange('default');
    sensorManager.sensorListUS = [
      sensorManager.sensorList.COD,
      sensorManager.sensorList.BLE,
      sensorManager.sensorList.CAV,
      sensorManager.sensorList.CLR,
      sensorManager.sensorList.EGL,
      sensorManager.sensorList.FYL,
      sensorManager.sensorList.THL,
      sensorManager.sensorList.MIL,
      sensorManager.sensorList.ALT,
      sensorManager.sensorList.ASC,
      sensorManager.sensorList.CDN,
    ]
  }

  sensorManager.sensorList = sensorList
  window.sensorManager = sensorManager
})()
