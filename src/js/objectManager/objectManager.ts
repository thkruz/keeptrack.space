// Object Manager (objectManager)
// This loads all of the various modules that provide objects for the screen

import { keepTrackApi } from '../api/keepTrackApi';
import { ObjectManager, SatObject } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { getEl } from '../lib/helpers';
import { stars } from '../starManager/stars';
import { controlSiteManager, ControlSiteObject } from './controlSiteManager';
import { launchSiteManager } from './launchSiteManager';
import { satLinkManager } from './satLinkManager';

const TEMPLATE_TLE1_ENDING = 'U 58002B   17115.48668720 +.00000144 +00000-0 +16234-3 0  9994';
const TEMPLATE_TLE2_ENDING = ' 034.2502 167.2636 0042608 222.6554 121.5501 24.84703551080477';
const TEMPLATE_TLE1_BEGINNING = '1 ';
const TEMPLATE_TLE2_BEGINNING = '2 ';
const TEMPLATE_INTLDES = '58001A';

// Use this to adjust which type of objects are loaded
// TODO: This should be in settings.js
const controlSiteTypeFilter = (controlSite: ControlSiteObject): boolean => {
  switch (controlSite.type) {
    case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
    case SpaceObjectType.LAUNCH_AGENCY:
    case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
    case SpaceObjectType.PAYLOAD_OWNER:
    case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
    case SpaceObjectType.LAUNCH_SITE:
    case SpaceObjectType.LAUNCH_POSITION:
      return true;
    // case 'Payload Manufacturer':
    // case 'Country':
    // case 'Astronomical Polity':
    // case 'Engine Manufacturer':
    // case 'Launch Vehicle Manufacturer':
    // case 'Parent Organization of Another Entry':
    // case 'Launch Cruise':
    // case 'Launch Zone':
    // case 'Suborbital Target Area':
    // case 'Organization Type Unknown':
    default:
      return false;
  }
};

const lastSelectedSat = (id?: number): number => {
  objectManager._lastSelectedSat = id ? id : objectManager._lastSelectedSat;
  return objectManager._lastSelectedSat;
};

const extractLiftVehicle = (LV: string): string => {
  if (LV == 'U') {
    return 'Unknown';
  } else {
    const rocketUrl = objectManager.rocketUrls.filter((url) => url.rocket === LV);
    if (rocketUrl.length > 0) {
      return `<a class="iframe" href="${rocketUrl[0].url}">${LV}</a>`;
    } else {
      return 'Unknown';
    }
  }
};

const extractCountry = (C: string): string => {
  switch (C) { // NOSONAR
    case 'ANALSAT':
      return 'Analyst Satellite';
    case 'AB':
      // Headquartered in Riyadh, Saudi Arabia
      return 'Saudi Arabia';
    case 'AC':
      return 'AsiaSat Corp';
    case 'ALG':
      return 'Algeria';
    case 'ALL':
      return 'All';
    case 'ARGN':
      return 'Argentina';
    case 'ASRA':
      return 'Austria';
    case 'AUS':
      return 'Australia';
    case 'AZER':
      return 'Azerbaijan';
    case 'BEL':
      return 'Belgium';
    case 'BELA':
      return 'Belarus';
    case 'BERM':
      return 'Bermuda';
    case 'BOL':
      return 'Bolivia';
    case 'BRAZ':
      return 'Brazil';
    case 'CA':
      return 'Canada';
    case 'CHBZ':
      return 'China/Brazil';
    case 'CHLE':
      return 'Chile';
    case 'CIS':
      return 'Commonwealth of Ind States';
    case 'COL':
      return 'Colombia';
    case 'CZCH':
      return 'Czechoslovakia';
    case 'DEN':
      return 'Denmark';
    case 'ECU':
      return 'Ecuador';
    case 'EGYP':
      return 'Egypt';
    case 'ESA':
      return 'European Space Agency';
    // case 'ESA':
    //   return'European Space Research Org';
    // }
    case 'EST':
      return 'Estonia';
    case 'EUME':
      return 'EUMETSAT';
    case 'EUTE':
      return 'EUTELSAT';
    case 'FGER':
      return 'France/Germany';
    case 'FR':
      return 'France';
    case 'FRIT':
      return 'France/Italy';
    case 'GER':
      return 'Germany';
    case 'GLOB':
      // Headquartered in Louisiana, USA
      return 'United States';
    case 'GREC':
      return 'Greece';
    case 'HUN':
      return 'Hungary';
    case 'IM':
      // Headquartered in London, UK
      return 'United Kingdom';
    case 'IND':
      return 'India';
    case 'INDO':
      return 'Indonesia';
    case 'IRAN':
      return 'Iran';
    case 'IRAQ':
      return 'Iraq';
    case 'ISRA':
      return 'Israel';
    case 'ISS':
      return 'International';
    case 'IT':
      return 'Italy';
    case 'ITSO':
      // Headquartered in Luxembourg District, Luxembourg
      return 'Luxembourg';
    case 'JPN':
      return 'Japan';
    case 'KAZ':
      return 'Kazakhstan';
    case 'LAOS':
      return 'Laos';
    case 'LTU':
      return 'Lithuania';
    case 'LUXE':
      return 'Luxembourg';
    case 'MALA':
      return 'Malaysia';
    case 'MEX':
      return 'Mexico';
    case 'NATO':
      return 'North Atlantic Treaty Org';
    case 'NETH':
      return 'Netherlands';
    case 'NICO':
      // Headquartered in Washington, USA
      return 'United States';
    case 'NIG':
      return 'Nigeria';
    case 'NKOR':
      return 'North Korea';
    case 'NOR':
      return 'Norway';
    case 'O3B':
      // Majority Shareholder Based in Luxembourg
      return 'Luxembourg';
    case 'ORB':
      // Headquartered in Louisiana, USA
      return 'United States';
    case 'PAKI':
      return 'Pakistan';
    case 'PERU':
      return 'Peru';
    case 'POL':
      return 'Poland';
    case 'POR':
      return 'Portugal';
    case 'PRC':
      return 'China';
    case 'RASC':
      // Headquartered in Mauritius
      return 'Mauritius';
    case 'ROC':
      return 'Taiwan';
    case 'ROM':
      return 'Romania';
    case 'SAFR':
      return 'South Africa';
    case 'SAUD':
      return 'Saudi Arabia';
    case 'SEAL':
      // Primary Shareholder Russian
      return 'Russia';
    case 'RP':
      return 'Philippines';
    case 'SES':
      return 'Luxembourg';
    case 'SING':
      return 'Singapore';
    case 'SKOR':
      return 'South Korea';
    case 'SPN':
      return 'Spain';
    case 'STCT':
      return 'Singapore/Taiwan';
    case 'SWED':
      return 'Sweden';
    case 'SWTZ':
      return 'Switzerland';
    case 'THAI':
      return 'Thailand';
    case 'TMMC':
      return 'Turkmenistan/Monaco';
    case 'TURK':
      return 'Turkey';
    case 'UAE':
      return 'United Arab Emirates';
    case 'UK':
      return 'United Kingdom';
    case 'UKR':
      return 'Ukraine';
    case 'URY':
      return 'Uruguay';
    case 'US':
      return 'United States';
    case 'USBZ':
      return 'United States/Brazil';
    case 'VENZ':
      return 'Venezuela';
    case 'VTNM':
      return 'Vietnam';
    default:
      return 'Unknown';
  }
};

const extractLaunchSite = (LS: string): { site: string; sitec: string } => {
  switch (LS) { // NOSONAR
    case 'ANALSAT':
      return {
        site: 'Analyst Satellite',
        sitec: 'Analyst Satellite',
      };
    case 'AFETR':
      return {
        site: 'Cape Canaveral SFS',
        sitec: 'United States',
      };
    case 'AFWTR':
      return {
        site: 'Vandenberg AFB',
        sitec: 'United States',
      };
    case 'CAS':
      return {
        site: 'Canary Islands',
        sitec: 'United States',
      };
    case 'FRGUI':
      return {
        site: 'French Guiana',
        sitec: 'French Guiana',
      };
    case 'HGSTR':
      return {
        site: 'Hammaguira STR',
        sitec: 'Algeria',
      };
    case 'KSCUT':
      return {
        site: 'Uchinoura Space Center',
        sitec: 'Japan',
      };
    case 'KYMTR':
      return {
        site: 'Kapustin Yar MSC',
        sitec: 'Russia',
      };
    case 'PKMTR':
      return {
        site: 'Plesetsk MSC',
        sitec: 'Russia',
      };
    case 'WSC':
      return {
        site: 'Wenchang SLC',
        sitec: 'China',
      };
    case 'SNMLP':
      return {
        site: 'San Marco LP',
        sitec: 'Kenya',
      };
    case 'SRI':
      return {
        site: 'Satish Dhawan SC',
        sitec: 'India',
      };
    case 'TNSTA':
      return {
        site: 'Tanegashima SC',
        sitec: 'Japan',
      };
    case 'TTMTR':
      return {
        site: 'Baikonur Cosmodrome',
        sitec: 'Kazakhstan',
      };
    case 'WLPIS':
      return {
        site: 'Wallops Island',
        sitec: 'United States',
      };
    case 'WOMRA':
      return {
        site: 'Woomera',
        sitec: 'Australia',
      };
    case 'VOSTO':
      return {
        site: 'Vostochny Cosmodrome',
        sitec: 'Russia',
      };
    case 'PMRF':
      return {
        site: 'PMRF Barking Sands',
        sitec: 'United States',
      };
    case 'SEAL':
      return {
        site: 'Sea Launch Odyssey',
        sitec: 'Russia',
      };
    case 'KWAJ':
      return {
        site: 'Kwajalein',
        sitec: 'United States',
      };
    case 'ERAS':
      return {
        site: 'Pegasus East',
        sitec: 'United States',
      };
    case 'JSC':
      return {
        site: 'Jiuquan SLC',
        sitec: 'China',
      };
    case 'SVOB':
      return {
        site: 'Svobodny',
        sitec: 'Russia',
      };
    case 'TSC':
      return {
        site: 'Taiyaun SC',
        sitec: 'China',
      };
    case 'WRAS':
      return {
        site: 'Pegasus West',
        sitec: 'United States',
      };
    case 'XSC':
      return {
        site: 'Xichang SC',
        sitec: 'China',
      };
    case 'YAVNE':
      return {
        site: 'Yavne',
        sitec: 'Israel',
      };
    case 'OREN':
      return {
        site: 'Orenburg',
        sitec: 'Russia',
      };
    case 'SADOL':
      return {
        site: 'Submarine Launch',
        sitec: 'Russia',
      };
    case 'KODAK':
      return {
        site: 'Kodiak Island',
        sitec: 'United States',
      };
    case 'SEM':
      return {
        site: 'Semnan',
        sitec: 'Iran',
      };
    case 'YUN':
      return {
        site: 'Sohae SLS',
        sitec: 'North Korea',
      };
    case 'TNGH':
      return {
        site: 'Tonghae SLG',
        sitec: 'North Korea',
      };
    case 'NSC':
      return {
        site: 'Naro Space Center',
        sitec: 'South Korea',
      };
    case 'RLLC':
      return {
        site: 'Rocket Labs LC',
        sitec: 'New Zealand',
      };
    default:
      return launchSiteManager.extractLaunchSite(LS);
  }
};

const setHoveringSat = (id: number): void => {
  objectManager.hoveringSat = id;
};
const setLasthoveringSat = (id: number): void => {
  objectManager.lasthoveringSat = id;
};
const setSelectedSat = (id: number): void => {
  objectManager.selectedSat = id;
};
const setSecondarySat = (id: number): void => {
  const {satSet} = keepTrackApi.programs;
  objectManager.secondarySat = id;
  objectManager.secondarySatObj = satSet.getSat(id);
  if (objectManager.selectedSat !== -1) {
    getEl('menu-plot-analysis3').classList.remove('bmenu-item-disabled');
  }
};

const switchPrimarySecondary = (): void => {
  const {orbitManager} = keepTrackApi.programs;
  const _primary = objectManager.selectedSat;
  const _secondary = objectManager.secondarySat;
  setSecondarySat(_primary);  
  if (_primary !== -1) {
    orbitManager.setSelectOrbit(_primary, true);
  } else {
    orbitManager.clearSelectOrbit(true);
  }
  setSelectedSat(_secondary);
}


  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
const init = () => { // NOSONAR
  const sensorManager = keepTrackApi.programs.sensorManager;
  // Create a buffer of missile objects
  for (let i = 0; i < settingsManager.maxMissiles; i++) {
    objectManager.missileSet.push({
      static: false,
      missile: true,
      active: false,
      type: SpaceObjectType.UNKNOWN,
      name: i,
      latList: [],
      lonList: [],
      altList: [],
      timeList: [],
    });
  }

  // Create a buffer of radar data objects
  for (let i = 0; i < settingsManager.maxRadarData; i++) {
    var radarDataInfo = {
      static: true,
      missile: false,
      active: false,
      isRadarData: true,
      type: SpaceObjectType.UNKNOWN,
      name: `Radar Data ${i}`,
    };
    objectManager.radarDataSet.push(radarDataInfo);
  }

  // Create a buffer of analyst satellite objects
  for (let i = 0; i < settingsManager.maxAnalystSats; i++) {
    const sccNum = (80000 + i).toString();
    objectManager.analSatSet.push(<SatObject>{
      static: false,
      missile: false,
      active: false,
      name: 'Analyst Sat ' + i,
      country: 'ANALSAT',
      launchVehicle: 'Analyst Satellite',
      launchSite: 'ANALSAT',
      sccNum: sccNum,
      TLE1: `${TEMPLATE_TLE1_BEGINNING}${sccNum}${TEMPLATE_TLE1_ENDING}`,
      TLE2: `${TEMPLATE_TLE2_BEGINNING}${sccNum}${TEMPLATE_TLE2_ENDING}`,
      intlDes: TEMPLATE_INTLDES,
      type: SpaceObjectType.PAYLOAD,
      id: i,
    });
  }

  // Create Stars
  if (!settingsManager.lowPerf && !settingsManager.noStars) {
    objectManager.starIndex1 = objectManager.staticSet.length;
    stars.forEach((star) => {
      objectManager.staticSet.push({
        name: star.name,
        static: true,
        shortName: 'STAR',
        type: SpaceObjectType.STAR,
        dec: star.dec,
        ra: star.ra,
        vmag: star.vmag,
      });
    });
    objectManager.isStarManagerLoaded = true;
  } else {
    objectManager.isStarManagerLoaded = false;
  }

  // Create Sensors
  if (!settingsManager.isDisableSensors) {
    const sensorList = sensorManager.sensorList;
    for (const sensor in sensorList) {
      objectManager.staticSet.push({ ...{ static: true }, ...sensorList[sensor] });
    }
    objectManager.isSensorManagerLoaded = true;
  }

  // Create Launch Sites
  if (!settingsManager.isDisableLaunchSites) {
    for (const launchSiteName in launchSiteManager.launchSiteList) {
      const launchSite = launchSiteManager.launchSiteList[launchSiteName];
      objectManager.staticSet.push({
        static: true,
        type: SpaceObjectType.LAUNCH_FACILITY,
        name: launchSite.name,
        lat: launchSite.lat,
        lon: launchSite.lon,
        alt: launchSite.alt,
      });
    }
    objectManager.launchSiteManager = launchSiteManager;
    objectManager.isLaunchSiteManagerLoaded = true;
  } else {
    objectManager.isLaunchSiteManagerLoaded = false;
  }

  // Try Loading the Control Site Module
  if (!settingsManager.isDisableControlSites) {
    const { controlSiteList } = controlSiteManager;
    controlSiteList
      // Remove any control sites that are closed
      .filter((controlSite) => controlSite.TStop === '')
      // TODO: Control sites all should have an SpaceObjectType Enum
      // Until all the control sites have enums ignore the legacy ones
      .filter((controlSite) => typeof controlSite.type !== 'string')
      // Until all the control sites enums are implemented ignore the odd ones
      .filter((controlSite) => controlSite.type <= 25)
      .filter(controlSiteTypeFilter)
      // Add the static properties to the control site objects
      .map((controlSite) => ({ ...{ static: true }, ...controlSite }))
      // Add the control site objects to the static set
      .forEach((controlSite) => {
        objectManager.staticSet.push(controlSite);
      });
  }

  objectManager.starIndex2 = objectManager.staticSet.length - 1;

  if (typeof settingsManager.maxFieldOfViewMarkers !== 'undefined') {
    for (let i = 0; i < settingsManager.maxFieldOfViewMarkers; i++) {
      const fieldOfViewMarker = {
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

export const objectManager: ObjectManager = {
  analSatSet: [],
  extractLaunchSite: extractLaunchSite,
  fieldOfViewSet: [],
  hoveringSat: -1,
  isLaunchSiteManagerLoaded: false,
  isSensorManagerLoaded: false,
  isStarManagerLoaded: false,
  lasthoveringSat: -1,
  launchSiteManager: null,
  missileSet: [],
  radarDataSet: [],
  rocketUrls: [],
  satLinkManager: null,
  selectedSat: -1,
  secondarySat: -1,
  secondarySatObj: null,
  selectedSatData: null,
  starIndex1: 0,
  starIndex2: 0,
  staticSet: [],
  _lastSelectedSat: -1,
  init: init,
  setSelectedSat,
  setSecondarySat,
  setHoveringSat,
  setLasthoveringSat,
  extractCountry,
  extractLiftVehicle,
  lastSelectedSat,
  switchPrimarySecondary
};
