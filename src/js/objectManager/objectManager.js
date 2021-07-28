// Object Manager (objectManager)
// This loads all of the various modules that provide objects for the screen

'use strict';

import { controlSiteManager } from '@app/js/objectManager/controlSiteManager.js';
import { keepTrackApi } from '@app/js/api/externalApi.ts';
import { launchSiteManager } from '@app/js/objectManager/launchSiteManager.js';
import { satLinkManager } from '@app/js/objectManager/satLinkManager.js';
import { stars } from '@app/js/starManager/stars.js';

var objectManager = {};
objectManager.selectedSat = -1;
objectManager.setSelectedSat = (id) => {
  objectManager.selectedSat = id;
  window.selectedSat = id;
};
objectManager.hoveringSat = -1;
objectManager.setHoveringSat = (id) => {
  objectManager.hoveringSat = id;
};
objectManager.lasthoveringSat = -1;
objectManager.setLasthoveringSat = (id) => {
  objectManager.lasthoveringSat = id;
};
var sensorList;
objectManager.missileSet = [];
objectManager.radarDataSet = [];
objectManager.analSatSet = [];
objectManager.staticSet = [];
objectManager.fieldOfViewSet = [];

objectManager.init = async () => {
  const sensorManager = keepTrackApi.programs.sensorManager;
  // settingsManager should be a globally accessible object
  if (typeof settingsManager == 'undefined') {
    // console.warn(`settingsManager missing!`);
    return;
  }

  if (typeof settingsManager.maxMissiles !== 'undefined') {
    for (let i = 0; i < settingsManager.maxMissiles; i++) {
      var missileInfo = {
        static: false,
        missile: true,
        active: false,
        type: '',
        name: i,
        latList: [],
        lonList: [],
        altList: [],
        timeList: [],
      };
      objectManager.missileSet.push(missileInfo);
    }
  } else {
    console.debug(`settingsManager.maxMissiles missing or broken!`);
  }

  if (typeof settingsManager.maxRadarData !== 'undefined') {
    for (let i = 0; i < settingsManager.maxRadarData; i++) {
      var radarDataInfo = {
        static: true,
        missile: false,
        active: false,
        isRadarData: true,
        type: '',
        name: `Radar Data ${i}`,
      };
      objectManager.radarDataSet.push(radarDataInfo);
    }
  } else {
    console.debug(`settingsManager.maxRadarData missing or broken!`);
  }

  if (typeof settingsManager.maxAnalystSats !== 'undefined') {
    var maxAnalystSats = settingsManager.maxAnalystSats;
    for (let i = 0; i < maxAnalystSats; i++) {
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
        id: i,
      };
      objectManager.analSatSet.push(analSatInfo);
    }
  } else {
    console.debug(`settingsManager.maxRadarData missing or broken!`);
  }

  // Try Loading Star Module
  try {
    if (settingsManager.lowPerf) throw 'Low Performance Override';
    if (settingsManager.noStars) throw 'No Stars Override';
    objectManager.starIndex1 = objectManager.staticSet.length + 1;
    for (var star = 0; star < stars.length; star++) {
      var starInfo = {
        static: true,
        shortName: 'STAR',
        type: 'Star',
        dec: stars[star].dec, //dec
        ra: stars[star].ra, //ra
        dist: stars[star].dist,
        vmag: stars[star].vmag,
      };
      if (stars[star].pname != '') {
        starInfo.name = stars[star].pname;
      } else if (stars[star].bf != '') {
        starInfo.name = stars[star].bf;
      } else {
        /* istanbul ignore next */
        starInfo.name = 'HD ' + stars[star].name;
      }

      objectManager.staticSet.push(starInfo);
    }
    objectManager.isStarManagerLoaded = true;
  } catch (e) {
    objectManager.isStarManagerLoaded = false;
    console.log('You do not have the Star Module');
  }
  // Try Loading Sensor Module
  var sensor;
  try {
    // if (typeof sensorManager == 'undefined') throw 'You do not have the Sensor Module';
    sensorList = sensorManager.sensorList;
    for (sensor in sensorList) {
      var sensorInfo = {
        static: true,
        staticNum: sensorList[sensor].staticNum,
        name: sensorList[sensor].name,
        type: sensorList[sensor].type,
        lat: sensorList[sensor].lat,
        lon: sensorList[sensor].lon,
        alt: sensorList[sensor].alt,
        changeObjectInterval: sensorList[sensor].changeObjectInterval,
      };
      objectManager.staticSet.push(sensorInfo);
    }
    objectManager.isSensorManagerLoaded = true;
  } catch (e) {
    objectManager.isSensorManagerLoaded = false;
    settingsManager.maxFieldOfViewMarkers = 1;
    console.log('You do not have the Sensor Module');
  }

  // Try Loading the Launch Site Module
  try {
    var launchSiteList = launchSiteManager.launchSiteList;
    for (var launchSite in launchSiteList) {
      var launchSiteInfo = {
        static: true,
        name: launchSiteList[launchSite].name,
        type: 'Launch Facility',
        lat: launchSiteList[launchSite].lat,
        lon: launchSiteList[launchSite].lon,
        alt: sensorList[sensor].alt,
      };
      objectManager.staticSet.push(launchSiteInfo);
    }
    objectManager.launchSiteManager = launchSiteManager;
    objectManager.isLaunchSiteManagerLoaded = true;
  } catch (e) {
    objectManager.isLaunchSiteManagerLoaded = false;
    console.log('You do not have the Launch Site Module');
  }

  // Try Loading the Control Site Module
  try {
    var controlSiteList = controlSiteManager.controlSiteList;
    for (var controlSite in controlSiteList) {
      var controlSiteInfo = {
        static: true,
        name: controlSiteList[controlSite].name,
        type: controlSiteList[controlSite].type,
        typeExt: controlSiteList[controlSite].typeExt,
        lat: controlSiteList[controlSite].lat,
        lon: controlSiteList[controlSite].lon,
        alt: controlSiteList[controlSite].alt,
        linkAehf: controlSiteList[controlSite].linkAehf,
        linkWgs: controlSiteList[controlSite].linkWgsF,
        linkGPS: controlSiteList[controlSite].linkGPS,
        linkGalileo: controlSiteList[controlSite].linkGalileo,
        linkBeidou: controlSiteList[controlSite].linkBeidou,
        linkGlonass: controlSiteList[controlSite].linkGlonass,
      };
      objectManager.staticSet.push(controlSiteInfo);
    }
    objectManager.isControlSiteManagerLoaded = true;
  } catch (e) {
    /* istanbul ignore next */
    objectManager.isControlSiteManagerLoaded = false;
    /* istanbul ignore next */
    console.log('You do not have the Control Site Module');
  }

  objectManager.starIndex2 = objectManager.staticSet.length - 1;

  if (typeof settingsManager.maxFieldOfViewMarkers !== 'undefined') {
    for (let i = 0; i < settingsManager.maxFieldOfViewMarkers; i++) {
      var fieldOfViewMarker = {
        static: true,
        marker: true,
        id: i,
      };
      objectManager.fieldOfViewSet.push(fieldOfViewMarker);
    }
  } else {
    console.debug(`settingsManager.maxFieldOfViewMarkers missing or broken!`);
  }

  // Initialize the satLinkMananger and then attach it to the object manager
  try {
    satLinkManager.init(sensorManager, controlSiteManager);
  } catch (e) {
    console.log('satLinkManager Failed to Initialize!');
  }
  objectManager.satLinkManager = satLinkManager;
};
objectManager.extractCountry = function (C) {
  var country;
  country = C; // Assume it is right and overwrite if it is a code below.
  if (C === 'U') {
    country = 'Unknown';
    // Table Nested in ELSE to Make Hiding it Easier
  } else if (C === 'ANALSAT') {
    country = 'Analyst Satellite';
  } else {
    if (C === 'AB') {
      // Headquartered in Riyadh, Saudi Arabia
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
    if (C === 'GLOB') {
      // Headquartered in Louisiana, USA
      country = 'United States';
    }
    if (C === 'GREC') {
      country = 'Greece';
    }
    if (C === 'HUN') {
      country = 'Hungary';
    }
    if (C === 'IM') {
      // Headquartered in London, UK
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
    if (C === 'ITSO') {
      // Headquartered in Luxembourg District, Luxembourg
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
    if (C === 'NICO') {
      // Headquartered in Washington, USA
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
    if (C === 'O3B') {
      // Majority Shareholder Based in Luxembourg
      country = 'Luxembourg';
    }
    if (C === 'ORB') {
      // Headquartered in Louisiana, USA
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
    if (C === 'RASC') {
      // Headquartered in Mauritius
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
    if (C === 'SEAL') {
      // Primary Shareholder Russian
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
  if (LV == 'U') {
    return 'Unknown';
  } else {
    for (var i = 0; i < objectManager.rocketUrls.length; i++) {
      if (objectManager.rocketUrls[i].rocket == LV) {
        return `<a class="iframe" href="${objectManager.rocketUrls[i].url}">${LV}</a>`;
      }
    }
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
      site = 'Cape Canaveral SFS';
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
      sitec = 'French Guiana';
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
        /* istanbul ignore next */
        console.log('Launch Site Module not Loaded');
      }
    }
  }
  return {
    site: site,
    sitec: sitec,
  };
};
objectManager.rocketUrls = [
  {
    rocket: 'Angara A5',
    url: 'https://en.wikipedia.org/wiki/Angara_(rocket_family)',
  },
  {
    rocket: 'Antares 230',
    url: 'https://en.wikipedia.org/wiki/Antares_(rocket)',
  },
  {
    rocket: 'Ariane 1',
    url: 'https://en.wikipedia.org/wiki/Ariane_1',
  },
  {
    rocket: 'Ariane 2',
    url: 'https://en.wikipedia.org/wiki/Ariane_2',
  },
  {
    rocket: 'Ariane 3',
    url: 'https://en.wikipedia.org/wiki/Ariane_3',
  },
  {
    rocket: 'Ariane 40',
    url: 'https://en.wikipedia.org/wiki/Ariane_4',
  },
  {
    rocket: 'Ariane 42L',
    url: 'https://en.wikipedia.org/wiki/Ariane_4',
  },
  {
    rocket: 'Ariane 42P',
    url: 'https://en.wikipedia.org/wiki/Ariane_4',
  },
  {
    rocket: 'Ariane 44L',
    url: 'https://en.wikipedia.org/wiki/Ariane_4',
  },
  {
    rocket: 'Ariane 44LP',
    url: 'https://en.wikipedia.org/wiki/Ariane_4',
  },
  {
    rocket: 'Ariane 44P',
    url: 'https://en.wikipedia.org/wiki/Ariane_4',
  },
  {
    rocket: 'Ariane 5ECA',
    url: 'https://en.wikipedia.org/wiki/Ariane_5',
  },
  {
    rocket: 'Ariane 5ES',
    url: 'https://en.wikipedia.org/wiki/Ariane_5',
  },
  {
    rocket: 'Ariane 5G',
    url: 'https://en.wikipedia.org/wiki/Ariane_5',
  },
  {
    rocket: 'Ariane 5G+',
    url: 'https://en.wikipedia.org/wiki/Ariane_5',
  },
  {
    rocket: 'Ariane 5GS',
    url: 'https://en.wikipedia.org/wiki/Ariane_5',
  },
  {
    rocket: 'ARPA Taurus',
    url: 'https://en.wikipedia.org/wiki/Minotaur-C',
  },
  {
    rocket: 'Athena-1',
    url: 'https://en.wikipedia.org/wiki/Athena_(rocket_family)',
  },
  {
    rocket: 'Athena-2',
    url: 'https://en.wikipedia.org/wiki/Athena_(rocket_family)',
  },
  {
    rocket: 'Atlas 3A',
    url: 'https://en.wikipedia.org/wiki/Atlas_III',
  },
  {
    rocket: 'Atlas 3B',
    url: 'https://en.wikipedia.org/wiki/Atlas_III',
  },
  {
    rocket: 'Atlas Agena B',
    url: 'https://en.wikipedia.org/wiki/Atlas-Agena',
  },
  {
    rocket: 'Atlas Agena D',
    url: 'https://en.wikipedia.org/wiki/Atlas-Agena',
  },
  {
    rocket: 'Atlas Burner 2',
    url: 'https://en.wikipedia.org/wiki/Atlas_(rocket_family)',
  },
  {
    rocket: 'Atlas Centaur',
    url: 'https://en.wikipedia.org/wiki/Atlas-Centaur',
  },
  {
    rocket: 'Atlas D',
    url: 'https://en.wikipedia.org/wiki/SM-65D_Atlas',
  },
  {
    rocket: 'Atlas E',
    url: 'https://en.wikipedia.org/wiki/Atlas_E/F',
  },
  {
    rocket: 'Atlas E/OIS',
    url: 'https://en.wikipedia.org/wiki/Atlas_E/F',
  },
  {
    rocket: 'Atlas E/SGS-2',
    url: 'https://en.wikipedia.org/wiki/Atlas_E/F',
  },
  {
    rocket: 'Atlas F',
    url: 'https://en.wikipedia.org/wiki/Atlas_E/F',
  },
  {
    rocket: 'Atlas F/Agena D',
    url: 'https://en.wikipedia.org/wiki/Atlas_E/F',
  },
  {
    rocket: 'Atlas F/PTS',
    url: 'https://en.wikipedia.org/wiki/Atlas_E/F',
  },
  {
    rocket: 'Atlas F/SVS',
    url: 'https://en.wikipedia.org/wiki/Atlas_E/F',
  },
  {
    rocket: 'Atlas G Centaur',
    url: 'https://en.wikipedia.org/wiki/Atlas_G',
  },
  {
    rocket: 'Atlas I',
    url: 'https://en.wikipedia.org/wiki/Atlas_I',
  },
  {
    rocket: 'Atlas II',
    url: 'https://en.wikipedia.org/wiki/Atlas_II',
  },
  {
    rocket: 'Atlas IIA',
    url: 'https://en.wikipedia.org/wiki/Atlas_II',
  },
  {
    rocket: 'Atlas IIAS',
    url: 'https://en.wikipedia.org/wiki/Atlas_II',
  },
  {
    rocket: 'Atlas SLV-3 Agena D',
    url: 'https://en.wikipedia.org/wiki/Atlas_SLV-3',
  },
  {
    rocket: 'Atlas SLV-3A Agena D',
    url: 'https://en.wikipedia.org/wiki/Atlas_SLV-3',
  },
  {
    rocket: 'Atlas SLV-3C Centaur',
    url: 'https://en.wikipedia.org/wiki/Atlas_SLV-3',
  },
  {
    rocket: 'Atlas SLV-3D Centaur',
    url: 'https://en.wikipedia.org/wiki/Atlas_SLV-3',
  },
  {
    rocket: 'Atlas V 401',
    url: 'https://en.wikipedia.org/wiki/Atlas_V',
  },
  {
    rocket: 'Atlas V 411',
    url: 'https://en.wikipedia.org/wiki/Atlas_V',
  },
  {
    rocket: 'Atlas V 421',
    url: 'https://en.wikipedia.org/wiki/Atlas_V',
  },
  {
    rocket: 'Atlas V 431',
    url: 'https://en.wikipedia.org/wiki/Atlas_V',
  },
  {
    rocket: 'Atlas V 521',
    url: 'https://en.wikipedia.org/wiki/Atlas_V',
  },
  {
    rocket: 'Atlas V 541',
    url: 'https://en.wikipedia.org/wiki/Atlas_V',
  },
  {
    rocket: 'Atlas V 551',
    url: 'https://en.wikipedia.org/wiki/Atlas_V',
  },
  {
    rocket: 'Black Arrow',
    url: 'https://en.wikipedia.org/wiki/Black_Arrow',
  },
  {
    rocket: 'Chang Zheng 1',
    url: 'https://en.wikipedia.org/wiki/Long_March_1',
  },
  {
    rocket: 'Chang Zheng 11',
    url: 'https://en.wikipedia.org/wiki/Long_March_11',
  },
  {
    rocket: 'Chang Zheng 2C',
    url: 'https://en.wikipedia.org/wiki/Long_March_2C',
  },
  {
    rocket: 'Chang Zheng 2C-III/SD',
    url: 'https://en.wikipedia.org/wiki/Long_March_2C',
  },
  {
    rocket: 'Chang Zheng 2D',
    url: 'https://en.wikipedia.org/wiki/Long_March_2D',
  },
  {
    rocket: 'Chang Zheng 2E',
    url: 'https://en.wikipedia.org/wiki/Long_March_2E',
  },
  {
    rocket: 'Chang Zheng 2F',
    url: 'https://en.wikipedia.org/wiki/Long_March_2F',
  },
  {
    rocket: 'Chang Zheng 3',
    url: 'https://en.wikipedia.org/wiki/Long_March_3',
  },
  {
    rocket: 'Chang Zheng 3A',
    url: 'https://en.wikipedia.org/wiki/Long_March_3A',
  },
  {
    rocket: 'Chang Zheng 3B',
    url: 'https://en.wikipedia.org/wiki/Long_March_3B',
  },
  {
    rocket: 'Chang Zheng 3B/YZ-1',
    url: 'https://en.wikipedia.org/wiki/Long_March_3B',
  },
  {
    rocket: 'Chang Zheng 3C',
    url: 'https://en.wikipedia.org/wiki/Long_March_3C',
  },
  {
    rocket: 'Chang Zheng 3C/YZ-1',
    url: 'https://en.wikipedia.org/wiki/Long_March_3C',
  },
  {
    rocket: 'Chang Zheng 4',
    url: 'https://en.wikipedia.org/wiki/Long_March_4A',
  },
  {
    rocket: 'Chang Zheng 4B',
    url: 'https://en.wikipedia.org/wiki/Long_March_4B',
  },
  {
    rocket: 'Chang Zheng 4C',
    url: 'https://en.wikipedia.org/wiki/Long_March_4C',
  },
  {
    rocket: 'Chang Zheng 5/YZ-2',
    url: 'https://en.wikipedia.org/wiki/Long_March_5',
  },
  {
    rocket: 'Chang Zheng 6',
    url: 'https://en.wikipedia.org/wiki/Long_March_6',
  },
  {
    rocket: 'Commercial Titan 3',
    url: 'https://en.wikipedia.org/wiki/Commercial_Titan_III',
  },
  {
    rocket: 'Delta 0300',
    url: 'https://en.wikipedia.org/wiki/Delta_0100',
  },
  {
    rocket: 'Delta 0900',
    url: 'https://en.wikipedia.org/wiki/Delta_0100',
  },
  {
    rocket: 'Delta 1410',
    url: 'https://en.wikipedia.org/wiki/Delta_1000',
  },
  {
    rocket: 'Delta 1914',
    url: 'https://en.wikipedia.org/wiki/Delta_1000',
  },
  {
    rocket: 'Delta 2310',
    url: 'https://en.wikipedia.org/wiki/Delta_2000',
  },
  {
    rocket: 'Delta 2313',
    url: 'https://en.wikipedia.org/wiki/Delta_2000',
  },
  {
    rocket: 'Delta 2910',
    url: 'https://en.wikipedia.org/wiki/Delta_2000',
  },
  {
    rocket: 'Delta 2913',
    url: 'https://en.wikipedia.org/wiki/Delta_2000',
  },
  {
    rocket: 'Delta 2914',
    url: 'https://en.wikipedia.org/wiki/Delta_2000',
  },
  {
    rocket: 'Delta 3910',
    url: 'https://en.wikipedia.org/wiki/Delta_3000',
  },
  {
    rocket: 'Delta 3910/PAM',
    url: 'https://en.wikipedia.org/wiki/Delta_3000',
  },
  {
    rocket: 'Delta 3913',
    url: 'https://en.wikipedia.org/wiki/Delta_3000',
  },
  {
    rocket: 'Delta 3914',
    url: 'https://en.wikipedia.org/wiki/Delta_3000',
  },
  {
    rocket: 'Delta 3920',
    url: 'https://en.wikipedia.org/wiki/Delta_3000',
  },
  {
    rocket: 'Delta 3920/PAM',
    url: 'https://en.wikipedia.org/wiki/Delta_3000',
  },
  {
    rocket: 'Delta 3924',
    url: 'https://en.wikipedia.org/wiki/Delta_3000',
  },
  {
    rocket: 'Delta 4925-8',
    url: 'https://en.wikipedia.org/wiki/Delta_(rocket_family)',
  },
  {
    rocket: 'Delta 4M',
    url: 'https://en.wikipedia.org/wiki/Delta_IV',
  },
  {
    rocket: 'Delta 4M+(4,2)',
    url: 'https://en.wikipedia.org/wiki/Delta_IV',
  },
  {
    rocket: 'Delta 5920-8',
    url: 'https://en.wikipedia.org/wiki/Delta_(rocket_family)',
  },
  {
    rocket: 'Delta 6925',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 6925-8',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7290-10C',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7320-10',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7320-10C',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7326-9.5',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7420-10C',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7426-9.5',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7920-10',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7920-10C',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7920-10L',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7920H',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7925',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7925-10',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7925-10C',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7925-10L',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7925-8',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 7925-9.5',
    url: 'https://en.wikipedia.org/wiki/Delta_II',
  },
  {
    rocket: 'Delta 8930',
    url: 'https://en.wikipedia.org/wiki/Delta_III',
  },
  {
    rocket: 'Diamant A',
    url: 'https://en.wikipedia.org/wiki/Diamant',
  },
  {
    rocket: 'Diamant BP.4',
    url: 'https://en.wikipedia.org/wiki/Diamant',
  },
  {
    rocket: 'Dnepr',
    url: 'https://en.wikipedia.org/wiki/Dnepr_(rocket)',
  },
  {
    rocket: 'Electron',
    url: 'https://en.wikipedia.org/wiki/Electron_(rocket)',
  },
  {
    rocket: 'Epsilon',
    url: 'https://en.wikipedia.org/wiki/Epsilon_(rocket)',
  },
  {
    rocket: 'Falcon 1',
    url: 'https://en.wikipedia.org/wiki/Falcon_1',
  },
  {
    rocket: 'Falcon 9',
    url: 'https://en.wikipedia.org/wiki/Falcon_9',
  },
  {
    rocket: 'Falcon Heavy',
    url: 'https://en.wikipedia.org/wiki/Falcon_Heavy',
  },
  {
    rocket: 'GSLV Mk I',
    url: 'https://en.wikipedia.org/wiki/Geosynchronous_Satellite_Launch_Vehicle#GSLV_Mk_I',
  },
  {
    rocket: 'GSLV Mk II',
    url: 'https://en.wikipedia.org/wiki/Geosynchronous_Satellite_Launch_Vehicle#GSLV_Mk_II',
  },
  {
    rocket: 'GSLV Mk III',
    url: 'https://en.wikipedia.org/wiki/GSLV_Mark_III',
  },
  {
    rocket: 'H-1',
    url: 'https://en.wikipedia.org/wiki/H-I',
  },
  {
    rocket: 'H-II',
    url: 'https://en.wikipedia.org/wiki/H-II',
  },
  {
    rocket: 'H-IIA 202',
    url: 'https://en.wikipedia.org/wiki/H-IIA',
  },
  {
    rocket: 'H-IIA 2022',
    url: 'https://en.wikipedia.org/wiki/H-IIA',
  },
  {
    rocket: 'H-IIA 2024',
    url: 'https://en.wikipedia.org/wiki/H-IIA',
  },
  {
    rocket: 'H-IIA 204',
    url: 'https://en.wikipedia.org/wiki/H-IIA',
  },
  {
    rocket: 'Kosmos 11K65M',
    url: 'https://en.wikipedia.org/wiki/Kosmos-3M',
  },
  {
    rocket: 'Kosmos 65S3',
    url: 'https://en.wikipedia.org/wiki/Kosmos-3',
  },
  {
    rocket: 'KT-2',
    url: 'https://en.wikipedia.org/wiki/Kaituozhe_(rocket_family)#Kaituozhe-2',
  },
  {
    rocket: 'Kuaizhou-1A',
    url: 'https://en.wikipedia.org/wiki/Kuaizhou',
  },
  {
    rocket: 'Kwangmyongsong',
    url: 'https://en.wikipedia.org/wiki/Kwangmy%C5%8Fngs%C5%8Fng_program',
  },
  {
    rocket: 'Minotaur 1',
    url: 'https://en.wikipedia.org/wiki/Minotaur_I',
  },
  {
    rocket: 'Minotaur IV',
    url: 'https://en.wikipedia.org/wiki/Minotaur_IV',
  },
  {
    rocket: 'Minotaur IV+',
    url: 'https://en.wikipedia.org/wiki/Minotaur_IV',
  },
  {
    rocket: 'Minotaur-C 3210',
    url: 'https://en.wikipedia.org/wiki/Minotaur-C',
  },
  {
    rocket: 'Molniya 8K78M',
    url: 'https://en.wikipedia.org/wiki/Molniya_(rocket)',
  },
  {
    rocket: 'Molniya 8K78M-PVB',
    url: 'https://en.wikipedia.org/wiki/Molniya_(rocket)',
  },
  {
    rocket: 'Mu-3H',
    url: 'https://en.wikipedia.org/wiki/Mu_(rocket_family)',
  },
  {
    rocket: 'Mu-3S-II',
    url: 'https://en.wikipedia.org/wiki/Mu_(rocket_family)',
  },
  {
    rocket: 'Mu-4S',
    url: 'https://en.wikipedia.org/wiki/Mu_(rocket_family)',
  },
  {
    rocket: 'M-V',
    url: 'https://en.wikipedia.org/wiki/M-V',
  },
  {
    rocket: 'N-1',
    url: 'https://en.wikipedia.org/wiki/N-I_(rocket)',
  },
  {
    rocket: 'N-2',
    url: 'https://en.wikipedia.org/wiki/N-II_(rocket)',
  },
  {
    rocket: 'Naro-1',
    url: 'https://en.wikipedia.org/wiki/Naro-1',
  },
  {
    rocket: 'Pegasus',
    url: 'https://en.wikipedia.org/wiki/Northrop_Grumman_Pegasus',
  },
  {
    rocket: 'Pegasus H',
    url: 'https://en.wikipedia.org/wiki/Northrop_Grumman_Pegasus',
  },
  {
    rocket: 'Pegasus XL',
    url: 'https://en.wikipedia.org/wiki/Northrop_Grumman_Pegasus',
  },
  {
    rocket: 'Pegasus XL/HAPS',
    url: 'https://en.wikipedia.org/wiki/Northrop_Grumman_Pegasus',
  },
  {
    rocket: 'Pegasus/HAPS',
    url: 'https://en.wikipedia.org/wiki/Northrop_Grumman_Pegasus',
  },
  {
    rocket: 'Proton-K',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-K/17S40',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-K/Briz-M',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-K/D',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-K/D-1',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-K/DM',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-K/DM-2',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-K/DM-2M',
    url: 'https://en.wikipedia.org/wiki/Proton-K',
  },
  {
    rocket: 'Proton-M/Briz-M',
    url: 'https://en.wikipedia.org/wiki/Proton-M',
  },
  {
    rocket: 'Proton-M/DM-2',
    url: 'https://en.wikipedia.org/wiki/Proton-M',
  },
  {
    rocket: 'Proton-M/DM-3',
    url: 'https://en.wikipedia.org/wiki/Proton-M',
  },
  {
    rocket: 'PSLV',
    url: 'https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle',
  },
  {
    rocket: 'PSLV-XL',
    url: 'https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle#Variants',
  },
  {
    rocket: 'Rokot',
    url: 'https://en.wikipedia.org/wiki/Rokot',
  },
  {
    rocket: 'Scout A',
    url: 'https://en.wikipedia.org/wiki/Scout_(rocket_family)',
  },
  {
    rocket: 'Scout A-1',
    url: 'https://en.wikipedia.org/wiki/Scout_(rocket_family)',
  },
  {
    rocket: 'Scout B',
    url: 'https://en.wikipedia.org/wiki/Scout_(rocket_family)',
  },
  {
    rocket: 'Scout B-1',
    url: 'https://en.wikipedia.org/wiki/Scout_(rocket_family)',
  },
  {
    rocket: 'Scout D-1',
    url: 'https://en.wikipedia.org/wiki/Scout_(rocket_family)',
  },
  {
    rocket: 'Scout G-1',
    url: 'https://en.wikipedia.org/wiki/Scout_(rocket_family)',
  },
  {
    rocket: 'Scout X-4',
    url: 'https://en.wikipedia.org/wiki/Scout_(rocket_family)',
  },
  {
    rocket: 'Soyuz 11A511L',
    url: 'https://en.wikipedia.org/wiki/Soyuz_(rocket_family)',
  },
  {
    rocket: 'Soyuz-2-1A',
    url: 'https://en.wikipedia.org/wiki/Soyuz-2',
  },
  {
    rocket: 'Soyuz-2-1B',
    url: 'https://en.wikipedia.org/wiki/Soyuz-2',
  },
  {
    rocket: 'Soyuz-2-1V',
    url: 'https://en.wikipedia.org/wiki/Soyuz-2',
  },
  {
    rocket: 'Soyuz-FG',
    url: 'https://en.wikipedia.org/wiki/Soyuz-FG',
  },
  {
    rocket: 'Soyuz-ST-A',
    url: 'https://en.wikipedia.org/wiki/Soyuz-2',
  },
  {
    rocket: 'Soyuz-ST-B',
    url: 'https://en.wikipedia.org/wiki/Soyuz-2',
  },
  {
    rocket: 'Soyuz-U',
    url: 'https://en.wikipedia.org/wiki/Soyuz-U',
  },
  {
    rocket: 'Soyuz-U-PVB',
    url: 'https://en.wikipedia.org/wiki/Soyuz-U',
  },
  {
    rocket: 'Space Shuttle',
    url: 'https://en.wikipedia.org/wiki/Space_Shuttle',
  },
  {
    rocket: 'Start-1',
    url: 'https://en.wikipedia.org/wiki/Start-1',
  },
  {
    rocket: 'Strela',
    url: 'https://en.wikipedia.org/wiki/Strela_(rocket)',
  },
  {
    rocket: 'Taurus 1110',
    url: 'https://en.wikipedia.org/wiki/Minotaur-C',
  },
  {
    rocket: 'Taurus 2110',
    url: 'https://en.wikipedia.org/wiki/Minotaur-C',
  },
  {
    rocket: 'Taurus 2210',
    url: 'https://en.wikipedia.org/wiki/Minotaur-C',
  },
  {
    rocket: 'Taurus 3210',
    url: 'https://en.wikipedia.org/wiki/Minotaur-C',
  },
  {
    rocket: 'Thor Ablestar',
    url: 'https://en.wikipedia.org/wiki/Thor-Ablestar',
  },
  {
    rocket: 'Thor Burner 1',
    url: 'https://en.wikipedia.org/wiki/Thor-Burner',
  },
  {
    rocket: 'Thor Burner 2',
    url: 'https://en.wikipedia.org/wiki/Thor-Burner',
  },
  {
    rocket: 'Thor Burner 2A',
    url: 'https://en.wikipedia.org/wiki/Thor-Burner',
  },
  {
    rocket: 'Thor Delta B',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta C',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta D',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta E',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta E1',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta J',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta M',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta N',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor Delta N6',
    url: 'https://en.wikipedia.org/wiki/Thor-Delta',
  },
  {
    rocket: 'Thor DSV-2U',
    url: 'https://en.wikipedia.org/wiki/Thor_DSV-2U',
  },
  {
    rocket: 'Thor SLV-2 Agena B',
    url: 'https://en.wikipedia.org/wiki/Thor_(rocket_family)',
  },
  {
    rocket: 'Thor SLV-2 Agena D',
    url: 'https://en.wikipedia.org/wiki/Thor_(rocket_family)',
  },
  {
    rocket: 'Thor SLV-2A Agena B',
    url: 'https://en.wikipedia.org/wiki/Thor_(rocket_family)',
  },
  {
    rocket: 'Thor SLV-2A Agena D',
    url: 'https://en.wikipedia.org/wiki/Thor_(rocket_family)',
  },
  {
    rocket: 'Thorad SLV-2G Agena D',
    url: 'https://en.wikipedia.org/wiki/Thorad-Agena',
  },
  {
    rocket: 'Titan 34D/IUS',
    url: 'https://en.wikipedia.org/wiki/Titan_34D',
  },
  {
    rocket: 'Titan 402A/IUS',
    url: 'https://en.wikipedia.org/wiki/Titan_IV',
  },
  {
    rocket: 'Titan 403B',
    url: 'https://en.wikipedia.org/wiki/Titan_IV',
  },
  {
    rocket: 'Titan II SLV',
    url: 'https://en.wikipedia.org/wiki/LGM-25C_Titan_II',
  },
  {
    rocket: 'Titan IIIA',
    url: 'https://en.wikipedia.org/wiki/Titan_IIIA',
  },
  {
    rocket: 'Titan IIIC',
    url: 'https://en.wikipedia.org/wiki/Titan_IIIC',
  },
  {
    rocket: 'Titan IIID',
    url: 'https://en.wikipedia.org/wiki/Titan_IIID',
  },
  {
    rocket: 'Tsiklon-2',
    url: 'https://en.wikipedia.org/wiki/Tsyklon-2',
  },
  {
    rocket: 'Tsiklon-2A',
    url: 'https://en.wikipedia.org/wiki/Tsyklon-2',
  },
  {
    rocket: 'Tsiklon-3',
    url: 'https://en.wikipedia.org/wiki/Tsyklon-3',
  },
  {
    rocket: 'U',
    url: '',
  },
  {
    rocket: 'Unha-3',
    url: 'https://en.wikipedia.org/wiki/Unha',
  },
  {
    rocket: 'Vega',
    url: 'https://en.wikipedia.org/wiki/Vega_(rocket)',
  },
  {
    rocket: 'Vostok 8A92M',
    url: 'https://en.wikipedia.org/wiki/Vostok_(rocket_family)',
  },
  {
    rocket: 'Vostok 8K72K',
    url: 'https://en.wikipedia.org/wiki/Vostok_(rocket_family)',
  },
  {
    rocket: 'Zenit-2',
    url: 'https://en.wikipedia.org/wiki/Zenit-2',
  },
  {
    rocket: 'Zenit-2M',
    url: 'https://en.wikipedia.org/wiki/Zenit-2',
  },
  {
    rocket: 'Zenit-3SL',
    url: 'https://en.wikipedia.org/wiki/Zenit_(rocket_family)',
  },
  {
    rocket: 'Zenit-3SLB',
    url: 'https://en.wikipedia.org/wiki/Zenit_(rocket_family)',
  },
  {
    rocket: 'Zenit-3SLBF',
    url: 'https://en.wikipedia.org/wiki/Zenit_(rocket_family)',
  },
];
objectManager.isMissileManagerLoaded = false;
objectManager.setMissileManagerLoaded = (val) => {
  objectManager.isMissileManagerLoaded = val;
};
var lastSelectedSat = -1;
objectManager.lastSelectedSat = (id) => {
  if (typeof id == 'undefined') return lastSelectedSat;
  lastSelectedSat = id;
};

export { objectManager };
