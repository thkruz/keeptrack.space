/*
  global

  $
  ga
  lookangles
  changeZoom
  camSnap
  latToPitch
  longToYaw
  propOffset
  propRate

 */

staticSet = [
  {
    static: true,
    name: 'Beale AFB, CA',
    type: 'Phased Array Radar',
    lat: 39.136064,
    lon: -121.351236
  },
  {
    static: true,
    name: 'Cape Cod AFS, MA',
    type: 'Phased Array Radar',
    lat: 41.754785,
    lon: -70.539151
  },
  {
    static: true,
    name: 'Clear AFS, AK',
    type: 'Phased Array Radar',
    lat: 64.290556,
    lon: -149.186944
  },
  {
    static: true,
    name: 'Eglin AFB, FL',
    type: 'Phased Array Radar',
    lat: 30.572411,
    lon: -86.214836
  },
  {
    static: true,
    name: 'RAF Fylingdales, UK',
    type: 'Phased Array Radar',
    lat: 54.361758,
    lon: -0.670051
  },
  {
    static: true,
    name: 'Cavalier AFS, ND',
    type: 'Phased Array Radar',
    lat: 48.724567,
    lon: -97.899755
  },
  {
    static: true,
    name: 'Thule AFB, GL',
    type: 'Phased Array Radar',
    lat: 76.570322,
    lon: -68.299211
  },
  {
    static: true,
    name: 'Cobra Dane, AK',
    type: 'Phased Array Radar',
    lat: 52.737,
    lon: 174.092
  },
  {
    static: true,
    name: 'ALTAIR, Kwaj',
    type: 'Mechanical Tracking Radar',
    lat: 8.716667,
    lon: 167.733333
  },
  {
    static: true,
    name: 'Millstone, MA',
    type: 'Mechanical Tracking Radar',
    lat: 42.6233,
    lon: -71.4882
  },
  {
    static: true,
    name: 'Diego Garcia',
    type: 'Optical Sensor',
    lat: -7.296480,
    lon: 72.390153
  },
  {
    static: true,
    name: 'Maui, HI',
    type: 'Optical Sensor',
    lat: 20.708350,
    lon: -156.257595
  },
  {
    static: true,
    name: 'Socorro, NM',
    type: 'Optical Sensor',
    lat: 33.817233,
    lon: -106.659961
  },
  {
    static: true,
    name: 'Armavir, RUS',
    type: 'Phased Array Radar',
    lat: 44.925106,
    lon: 40.983894
  },
  {
    static: true,
    name: 'Gantsevichi, RUS',
    type: 'Phased Array Radar',
    lat: 52.850000,
    lon: 26.480000
  },
  {
    static: true,
    name: 'Lekhtusi, RUS',
    type: 'Phased Array Radar',
    lat: 60.275458,
    lon: 30.546017
  },
  {
    static: true,
    name: 'Mishelevka-D, RUS',
    type: 'Phased Array Radar',
    lat: 52.855500,
    lon: 103.231700
  },
  {
    static: true,
    name: 'Olenegorsk, RUS',
    type: 'Phased Array Radar',
    lat: 68.114100,
    lon: 33.910200
  },
  {
    static: true,
    name: 'Pechora, RUS',
    type: 'Phased Array Radar',
    lat: 65.210000,
    lon: 57.295000
  },
  {
    static: true,
    name: 'Pionersky, RUS',
    type: 'Phased Array Radar',
    lat: 54.857294,
    lon: 20.182350
  },
  {
    static: true,
    name: 'Xuanhua, PRC',
    type: 'Phased Array Radar',
    lat: 40.446944,
    lon: 115.116389
  }
];

function extractCountry (C) {
  var country;
  if (C === 'U') {
    country = 'Unknown';
  // Table Nested in ELSE to Make Hiding it Easier
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
    if (C === 'ESA') {
      country = 'European Space Research Org';
    }
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
}

function extractLiftVehicle (LV) {
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
}

function extractLaunchSite (LS) {
  var site;
  var sitec;
  if (LS === 'U') {
    site = 'Unknown';
    sitec = 'Unknown';
  // Table Nested in ELSE to Make Hiding it Easier
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
      site = 'Yunsong';
      sitec = 'North Korea';
    }
    if (LS === 'NSC') {
      site = 'Naro Space Center';
      sitec = 'South Korea';
    }
  }
  return {
    site,
    sitec
  };
}

sensorManager = (function () {
  var curSensorPositon = [0, 0, 0];
  var setSensor = function (sensor) {
    switch (sensor) {
      case 'Beale AFB, CA':
        ga('send', 'event', 'Sensor', 'Beale', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 39.136064,
          long: -121.351237,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 126,
          obsmaxaz: 6,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 5555
        });

        lookangles.setobs({
          lat: 39.136064,
          long: -121.351237,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 126,
          obsmaxaz: 6,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 5555
        });

        whichRadar = 'BLE';
        $('#sensor-info-title').html('Beale AFB');
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(39.136064), longToYaw(-121.351237));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Cape Cod AFS, MA':
        ga('send', 'event', 'Sensor', 'Cape Cod', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 41.754785,
          long: -70.539151,
          hei: 0.060966,
          obsminaz: 347,
          obsmaxaz: 227,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 5555
        });

        lookangles.setobs({
          lat: 41.754785,
          long: -70.539151,
          hei: 0.060966,
          obsminaz: 347,
          obsmaxaz: 227,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 5555
        });

        $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>Cape Cod AFS</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        whichRadar = 'COD';
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(41.754785), longToYaw(-70.539151));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Clear AFS, AK':
        ga('send', 'event', 'Sensor', 'Clear', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 64.290556,
          long: -149.186944,
          hei: 0.060966,
          obsminaz: 184,
          obsmaxaz: 64,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 4910
        });

        lookangles.setobs({
          lat: 64.290556,
          long: -149.186944,
          hei: 0.060966,
          obsminaz: 184,
          obsmaxaz: 64,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 4910
        });

        whichRadar = 'CLR';
        $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>Clear AFS</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(64.290556), longToYaw(-149.186944));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Eglin AFB, FL':
        ga('send', 'event', 'Sensor', 'Eglin', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 30.572411,
          long: -86.214836,
          hei: 0.060966, // TODO: Confirm Altitude
          obsminaz: 120,
          obsmaxaz: 240,
          obsminel: 3,
          obsmaxel: 105,
          obsminrange: 200,
          obsmaxrange: 50000
        });

        lookangles.setobs({
          lat: 30.572411,
          long: -86.214836,
          hei: 0.060966, // TODO: Confirm Altitude
          obsminaz: 120,
          obsmaxaz: 240,
          obsminel: 3,
          obsmaxel: 105,
          obsminrange: 200,
          obsmaxrange: 50000
        });

        whichRadar = 'EGL';
        $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte002.en.html'>Eglin AFB</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(30.572411), longToYaw(-86.214836));
        changeZoom('geo');
        lookangles.getsensorinfo();
        break;
      case 'RAF Fylingdales, UK':
        ga('send', 'event', 'Sensor', 'Fylingdales', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 54.361758,
          long: -0.670051,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 4820
        });

        lookangles.setobs({
          lat: 54.361758,
          long: -0.670051,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 4820
        });

        whichRadar = 'FYL';
        $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>RAF Fylingdales</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United Kingdom');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(54.361758), longToYaw(-0.670051));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Cavalier AFS, ND':
        ga('send', 'event', 'Sensor', 'Cavalier', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 48.724567,
          long: -97.899755,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 298,
          obsmaxaz: 78,
          obsminel: 1.9,
          obsmaxel: 95,
          obsminrange: 200,
          obsmaxrange: 3300 // TODO: Double check this
        });

        lookangles.setobs({
          lat: 48.724567,
          long: -97.899755,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 298,
          obsmaxaz: 78,
          obsminel: 1.9,
          obsmaxel: 95,
          obsminrange: 200,
          obsmaxrange: 3300 // TODO: Double check this
        });

        whichRadar = 'PAR';
        $('#sensor-info-title').html("<a class='iframe' href='https://mostlymissiledefense.com/2012/04/12/parcs-cavalier-radar-april-12-2012/'>Cavalier AFS</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(48.724567), longToYaw(-97.899755));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Thule AFB, GL':
        ga('send', 'event', 'Sensor', 'Thule', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 76.570322,
          long: -68.299211,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 297,
          obsmaxaz: 177,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 5555
        });

        lookangles.setobs({
          lat: 76.570322,
          long: -68.299211,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 297,
          obsmaxaz: 177,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 200,
          obsmaxrange: 5555
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>Thule AFB</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        // No Weather
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(76.570322), longToYaw(-68.299211));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Cobra Dane, AK':
        ga('send', 'event', 'Sensor', 'Thule', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 52.737,
          long: 174.092,
          hei: 0.010966, // TODO: Find correct height
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
          obsmaxrange2: 4200
        });

        lookangles.setobs({
          lat: 52.737,
          long: 174.092,
          hei: 0.010966, // TODO: Find correct height
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
          obsmaxrange2: 4200
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Cobra Dane');
        // $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        // No Weather
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(52.737), longToYaw(174.092));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'ALTAIR, Kwaj':
        ga('send', 'event', 'Sensor', 'Altair', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 8.716667,
          long: 167.733333,
          hei: 0,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 1,
          obsmaxel: 90,
          obsminrange: 200,
          obsmaxrange: 50000
        });

        lookangles.setobs({
          lat: 8.716667,
          long: 167.733333,
          hei: 0,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 1,
          obsmaxel: 90,
          obsminrange: 200,
          obsmaxrange: 50000
        });

        whichRadar = '';
        $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte005.en.html'>ALTAIR</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Mechanical');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(8.716667), longToYaw(167.733333));
        changeZoom('geo');
        lookangles.getsensorinfo();
        break;
      case 'Millstone, MA':
        ga('send', 'event', 'Sensor', 'Millstone', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 42.6233,
          long: -71.4882,
          hei: 0.131,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 1,
          obsmaxel: 90,
          obsminrange: 200,
          obsmaxrange: 50000
        });

        lookangles.setobs({
          lat: 42.6233,
          long: -71.4882,
          hei: 0.131,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 1,
          obsmaxel: 90,
          obsminrange: 200,
          obsmaxrange: 50000
        });

        whichRadar = 'MIL';
        $('#sensor-info-title').html("<a class='iframe' href='https://mostlymissiledefense.com/2012/05/05/space-surveillance-sensors-millstone-hill-radar/'>Millstone Hill Steerable Antenna</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Mechanical');
        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(42.6233), longToYaw(-71.4882));
        changeZoom('geo');
        lookangles.getsensorinfo();
        break;
      case 'Diego Garcia':
        ga('send', 'event', 'Sensor', 'Diego Garcia', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: -7.296480,
          long: 72.390153,
          hei: 0.0,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        lookangles.setobs({
          lat: -7.296480,
          long: 72.390153,
          hei: 0.0,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        whichRadar = 'DGC';
        $('#sensor-info-title').html("<a class='iframe' href='https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/'>Diego Garcia GEODSS</a>");
        $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');

        $('#menu-weather img').removeClass('bmenu-item-disabled');
        camSnap(latToPitch(-7.296480), longToYaw(72.390153));
        changeZoom('geo');
        lookangles.getsensorinfo();
        break;
      case 'Maui, HI':
        ga('send', 'event', 'Sensor', 'Maui', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 20.708350,
          long: -156.257595,
          hei: 3.0,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        lookangles.setobs({
          lat: 20.708350,
          long: -156.257595,
          hei: 3.0,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Maui GEODSS');
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Optical');
        // No Weather
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(20.708350), longToYaw(-156.257595));
        changeZoom('geo');
        lookangles.getsensorinfo();
        break;
      case 'Socorro, NM':
        ga('send', 'event', 'Sensor', 'Socorro', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 33.817233,
          long: -106.659961,
          hei: 1.24,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        lookangles.setobs({
          lat: 33.817233,
          long: -106.659961,
          hei: 1.24,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Socorro GEODSS');
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Optical');
        // No Weather
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(33.817233), longToYaw(-106.659961));
        changeZoom('geo');
        lookangles.getsensorinfo();
        break;
      /* CLOSED
      case 'Moron AFB, SP':
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 37.166962, // ENHANCEMENT: Verify this information.
          long: -5.600839, // ENHANCEMENT: Verify this information.
          hei: 0.5, // ENHANCEMENT: Verify this information.
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        lookangles.setobs({
          lat: 37.166962, // ENHANCEMENT: Verify this information.
          long: -5.600839, // ENHANCEMENT: Verify this information.
          hei: 0.5, // ENHANCEMENT: Verify this information.
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 20,
          obsmaxel: 90,
          obsminrange: 20000,
          obsmaxrange: 500000
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Moron Air Base');
        $('#sensor-country').html('United States');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Optical');
        // No Weather
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(37.166962), longToYaw(-5.600839));
        changeZoom('geo');
        lookangles.getsensorinfo();
        break;
      */
      case 'Armavir, RUS':
        ga('send', 'event', 'Sensor', 'Armavir', 'Selected');
        satCruncher.postMessage({ // Send SatCruncher File information on this radar
          typ: 'offset', // Tell satcruncher to update something
          dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
          setlatlong: true, // Tell satcruncher we are changing observer location
          lat: 44.925106,
          long: 40.983894,
          hei: 0.0,
          obsminaz: 55, // All Information via russianforces.org
          obsmaxaz: 295,
          obsminel: 2,
          obsmaxel: 60,
          obsminrange: 100,
          obsmaxrange: 4200
        });

        lookangles.setobs({
          lat: 44.925106,
          long: 40.983894,
          hei: 0.0,
          obsminaz: 55, // All Information via russianforces.org
          obsmaxaz: 295,
          obsminel: 2,
          obsmaxel: 60,
          obsminrange: 100,
          obsmaxrange: 4200
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Armavir Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(44.925106), longToYaw(40.983894));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Balkhash, RUS':
        ga('send', 'event', 'Sensor', 'Balkhash', 'Selected');
        satCruncher.postMessage({ // Send SatCruncher File information on this radar
          typ: 'offset', // Tell satcruncher to update something
          dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
          setlatlong: true, // Tell satcruncher we are changing observer location
          lat: 46.603076,
          long: 74.530985,
          hei: 0.0,
          obsminaz: 91, // All Information via russianforces.org
          obsmaxaz: 151,
          obsminel: 5.5,
          obsmaxel: 34.5,
          obsminrange: 385,
          obsmaxrange: 4600
        });

        lookangles.setobs({
          lat: 46.603076,
          long: 74.530985,
          hei: 0.0,
          obsminaz: 91, // All Information via russianforces.org
          obsmaxaz: 151,
          obsminel: 5.5,
          obsmaxel: 34.5,
          obsminrange: 385,
          obsmaxrange: 4600
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Balkhash Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(46.603076), longToYaw(74.530985));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Gantsevichi, RUS':
        ga('send', 'event', 'Sensor', 'Gantsevichi', 'Selected');
        satCruncher.postMessage({ // Send SatCruncher File information on this radar
          typ: 'offset', // Tell satcruncher to update something
          dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
          setlatlong: true, // Tell satcruncher we are changing observer location
          lat: 52.850000,
          long: 26.480000,
          hei: 0.0,
          obsminaz: 190, // All Information via russianforces.org
          obsmaxaz: 310,
          obsminel: 3,
          obsmaxel: 80,
          obsminrange: 300,
          obsmaxrange: 6500
        });

        lookangles.setobs({
          lat: 52.850000,
          long: 26.480000,
          hei: 0.0,
          obsminaz: 190, // All Information via russianforces.org
          obsmaxaz: 310,
          obsminel: 3,
          obsmaxel: 80,
          obsminrange: 300,
          obsmaxrange: 6500
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Gantsevichi Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(52.850000), longToYaw(26.480000));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Lekhtusi, RUS':
        ga('send', 'event', 'Sensor', 'Lekhtusi', 'Selected');
        satCruncher.postMessage({ // Send SatCruncher File information on this radar
          typ: 'offset', // Tell satcruncher to update something
          dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
          setlatlong: true, // Tell satcruncher we are changing observer location
          lat: 60.275458,
          long: 30.546017,
          hei: 0.0,
          obsminaz: 245, // All Information via russianforces.org
          obsmaxaz: 355,
          obsminel: 2,
          obsmaxel: 70,
          obsminrange: 100,
          obsmaxrange: 4200
        });

        lookangles.setobs({
          lat: 60.275458,
          long: 30.546017,
          hei: 0.0,
          obsminaz: 245,
          obsmaxaz: 355,
          obsminel: 2,
          obsmaxel: 70,
          obsminrange: 100,
          obsmaxrange: 4200
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Lehktusi Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(60.275458), longToYaw(30.546017));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Mishelevka-D':
        ga('send', 'event', 'Sensor', 'Mishelevka', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 52.855500,
          long: 103.231700,
          hei: 0.0,
          obsminaz: 41, // All Information via russianforces.org
          obsmaxaz: 219,
          obsminel: 5.5,
          obsmaxel: 34.5,
          obsminrange: 250,
          obsmaxrange: 4600
        });

        lookangles.setobs({
          lat: 52.855500,
          long: 103.231700,
          hei: 0.0,
          obsminaz: 41, // All Information via russianforces.org
          obsmaxaz: 219,
          obsminel: 5.5,
          obsmaxel: 34.5,
          obsminrange: 250,
          obsmaxrange: 4600
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Mishelevka Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(52.855500), longToYaw(103.231700));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Olenegorsk':
        ga('send', 'event', 'Sensor', 'Olenegorsk', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 68.114100,
          long: 33.910200,
          hei: 0.0,
          obsminaz: 280, // All Information via russianforces.org
          obsmaxaz: 340,
          obsminel: 5.5,
          obsmaxel: 34.5,
          obsminrange: 250,
          obsmaxrange: 4600
        });

        lookangles.setobs({
          lat: 68.114100,
          long: 33.910200,
          hei: 0.0,
          obsminaz: 280, // All Information via russianforces.org
          obsmaxaz: 340,
          obsminel: 5.5,
          obsmaxel: 34.5,
          obsminrange: 250,
          obsmaxrange: 4600
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Olenegorsk Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(68.114100), longToYaw(33.910200));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Pechora':
        ga('send', 'event', 'Sensor', 'Pechora', 'Selected');
        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: 65.210000,
          long: 57.295000,
          hei: 0.0,
          obsminaz: 305, // All Information via russianforces.org
          obsmaxaz: 55,
          obsminel: 2,
          obsmaxel: 55,
          obsminrange: 300,
          obsmaxrange: 7200
        });

        lookangles.setobs({
          lat: 65.210000,
          long: 57.295000,
          hei: 0.0,
          obsminaz: 305, // All Information via russianforces.org
          obsmaxaz: 55,
          obsminel: 2,
          obsmaxel: 55,
          obsminrange: 300,
          obsmaxrange: 7200
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Pechora Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(65.210000), longToYaw(57.295000));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Pionersky':
        ga('send', 'event', 'Sensor', 'Pionersky', 'Selected');
        satCruncher.postMessage({ // Send SatCruncher File information on this radar
          typ: 'offset', // Tell satcruncher to update something
          dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
          setlatlong: true, // Tell satcruncher we are changing observer location
          lat: 54.857294,
          long: 20.182350,
          hei: 0.0,
          obsminaz: 187.5, // All Information via russianforces.org
          obsmaxaz: 292.5,
          obsminel: 2,
          obsmaxel: 60,
          obsminrange: 100,
          obsmaxrange: 4200
        });

        lookangles.setobs({
          lat: 54.857294,
          long: 20.182350,
          hei: 0.0,
          obsminaz: 187.5, // All Information via russianforces.org
          obsmaxaz: 292.5,
          obsminel: 2,
          obsmaxel: 60,
          obsminrange: 100,
          obsmaxrange: 4200
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('Armavir Radar Station');
        $('#sensor-country').html('Russia');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(54.857294), longToYaw(20.182350));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
      case 'Xuanhua, PRC':
        ga('send', 'event', 'Sensor', 'Xuanhua', 'Selected');
        satCruncher.postMessage({ // Send SatCruncher File information on this radar
          typ: 'offset', // Tell satcruncher to update something
          dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
          setlatlong: true, // Tell satcruncher we are changing observer location
          lat: 40.446944,
          long: 115.116389,
          hei: 1.6,
          obsminaz: 300,    // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
          obsmaxaz: 60,     // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
          obsminel: 2,      // Information via globalsecurity.org
          obsmaxel: 80,     // Information via globalsecurity.org
          obsminrange: 300, // TODO: Verify
          obsmaxrange: 3000 // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
        });

        lookangles.setobs({
          lat: 40.446944,
          long: 115.116389,
          hei: 1.6,
          obsminaz: 300,    // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
          obsmaxaz: 60,     // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
          obsminel: 2,      // Information via globalsecurity.org
          obsmaxel: 80,     // Information via globalsecurity.org
          obsminrange: 300, // TODO: Verify
          obsmaxrange: 3000 // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
        });

        whichRadar = ''; // Disables Weather Menu from Opening
        $('#sensor-info-title').html('7010 Large Phased Array Radar (LPAR)');
        $('#sensor-country').html('China');
        $('#sensor-sun').html('No Impact');
        $('#sensor-type').html('Phased Array');
        $('#menu-weather img').addClass('bmenu-item-disabled');
        camSnap(latToPitch(40.446944), longToYaw(115.116389));
        changeZoom('leo');
        lookangles.getsensorinfo();
        break;
    }
  };

  return {
    setSensor: setSensor,
    curSensorPositon: curSensorPositon
  };
})();
