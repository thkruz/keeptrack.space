// Object Manager (objectManager)
// This loads all of the various modules that provide objects for the screen

(function () {
  var objectManager = {};
  objectManager.missileSet = [];
  objectManager.analSatSet = [];
  objectManager.staticSet = [];
  objectManager.fieldOfViewSet = [];

  objectManager.init = function () {
    var i;
    var maxMissiles = settingsManager.maxMissiles;
    for (i = 0; i < maxMissiles; i++) {
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
      objectManager.missileSet.push(missileInfo);
    }
    var maxAnalystSats = settingsManager.maxAnalystSats;
    for (i = 0; i < maxAnalystSats; i++) {
      var analSatInfo = {
        static: false,
        missile: false,
        active: false,
        ON: 'Analyst Sat ' + i,
        C: 'ANALSAT',
        LV: 'Analyst Satellite',
        LS: 'ANALSAT',
        SCC_NUM: (80000 + i).toString(),
        TLE1: '1 ' + (80000 + i).toString() + 'U 58002B   17115.48668720 +.00000144 +00000-0 +16234-3 0  9994',
        TLE2: '2 ' + (80000 + i).toString() + ' 034.2502 167.2636 0042608 222.6554 121.5501 24.84703551080477',
        intlDes: (80000 + i).toString(),
        type: 'sat',
        id: i
      };
      objectManager.analSatSet.push(analSatInfo);
    }

    // Try Loading Sensor Module
    try {
      var sensorList = window.sensorManager.sensorList;
      for (var sensor in sensorList) {
        var sensorInfo = {
          static: true,
          staticNum: sensorList[sensor].staticNum,
          name: sensorList[sensor].name,
          type: sensorList[sensor].type,
          lat: sensorList[sensor].lat,
          lon: sensorList[sensor].long,
          alt: sensorList[sensor].obshei,
          changeObjectInterval: sensorList[sensor].changeObjectInterval
        };
        objectManager.staticSet.push(sensorInfo);
      }
    } catch (e) {
      console.log('You do not have the Sensor Module');
    }

    // Try Loading Star Module
    try {
      for (var star = 0; star < (starManager.stars.length); star++) {
      var starInfo = {
        static: true,
        shortName: 'STAR',
        type: 'Star',
        dec: starManager.stars[star].dec, //dec
        ra: starManager.stars[star].ra, //ra
        dist: starManager.stars[star].dist,
        vmag: starManager.stars[star].vmag,
      };
      if (starManager.stars[star].pname != "") {
        starInfo.name = starManager.stars[star].pname;
      } else if (starManager.stars[star].bf != "") {
        starInfo.name = starManager.stars[star].bf;
      } else {
        starInfo.name = "HD " + starManager.stars[star].name;
      }

      objectManager.staticSet.push(starInfo);
    }
    } catch (e) {
      console.log('You do not have the Star Module');
    }

    // Try Loading the Launch Site Module
    try {
      var launchSiteList = window.launchSiteManager.launchSiteList;
      for (var launchSite in launchSiteList) {
        var launchSiteInfo = {
          static: true,
          name: launchSiteList[launchSite].name,
          type: 'Launch Facility',
          lat: launchSiteList[launchSite].lat,
          lon: launchSiteList[launchSite].lon,
          alt: sensorList[sensor].obshei
        };
        objectManager.staticSet.push(launchSiteInfo);
      }
    } catch (e) {
      console.log('You do not have the Launch Site Module');
    }

    // Try Loading the Control Site Module
    try {
      var controlSiteList = window.controlSiteManager.controlSiteList;
      for (var controlSite in controlSiteList) {
        var controlSiteInfo = {
          static: true,
          name: controlSiteList[controlSite].name,
          type: controlSiteList[controlSite].type,
          typeExt: controlSiteList[controlSite].typeExt,
          lat: controlSiteList[controlSite].lat,
          lon: controlSiteList[controlSite].lon,
          alt: controlSiteList[controlSite].alt,
          linkAEHF: controlSiteList[controlSite].linkAEHF,
          linkWGS: controlSiteList[controlSite].linkWGSF,
          linkGPS: controlSiteList[controlSite].linkGPS,
          linkGalileo: controlSiteList[controlSite].linkGalileo,
          linkBeidou: controlSiteList[controlSite].linkBeidou,
          linkGlonass: controlSiteList[controlSite].linkGlonass,
        };
        objectManager.staticSet.push(controlSiteInfo);
      }
    } catch (e) {
      console.log('You do not have the Control Site Module');
    }

    for (i = 0; i < settingsManager.maxFieldOfViewMarkers; i++) {
      var fieldOfViewMarker = {
        static: true,
        marker: true,
        id: i
      };
      objectManager.fieldOfViewSet.push(fieldOfViewMarker);
    }
  };
  objectManager.init();
  objectManager.extractCountry = function (C) {
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
  objectManager.extractLiftVehicle = function (LV) {
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
  objectManager.extractLaunchSite = function (LS) {
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

      // Use Extended Sites from Launch Site Manager
      if (typeof site == 'undefined') {
        try {
            site = launchSiteManager.extractLaunchSite(LS);
            sitec = site[1];
            site = site[0];
        } catch (e) {
            console.log('Launch Site Module not Loaded');
        }
      }

    }
    return {
      site: site,
      sitec: sitec
    };
  };

  window.objectManager = objectManager;
})();
