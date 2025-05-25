import { LaunchSite } from '@app/singletons/catalog-manager/LaunchFacility';
import { Degrees } from 'ootk';
import { AFETRList } from './launch-sites/afetr-list';
import { AFWTRList } from './launch-sites/afwtr-list';

export const launchSites = {
  ...AFETRList,
  ...AFWTRList,
  ANDSP: {
    name: 'Andøya Spaceport',
    lat: 69.108709,
    lon: 15.588761,
  },
  BOS: {
    name: 'Bowen Orbital Spaceport',
    lat: -19.958148641067815,
    lon: 148.11360161948667,
  },
  CAS: {
    name: 'Gran Canaria Airport Runway 03/21',
    lat: 27.932009,
    lon: -15.385444,
  },
  FRGUI: {
    name: 'FRGUI',
    lat: 5.23,
    lon: 307.24,
  },
  HGSTR: {
    name: 'HGSTR',
    lat: 31.09,
    lon: 357.17,
  },
  JSC: {
    name: 'JSC',
    lat: 41.11,
    lon: 100.46,
  },
  KODAK: {
    name: 'KODAK',
    lat: 57.43,
    lon: 207.67,
  },
  KSCUT: {
    name: 'KSCUT',
    lat: 31.25,
    lon: 131.07,
  },
  KWAJ: {
    name: 'KWAJ',
    lat: 9.04,
    lon: 167.74,
  },
  KYMTR: {
    name: 'KYMTR',
    lat: 48.57,
    lon: 46.25,
  },
  NSC: {
    name: 'NSC',
    lat: 34.42,
    lon: 127.52,
  },
  OREN: { // Also called Dombrovsky Launch Site
    name: 'OREN',
    lat: 51.2,
    lon: 59.85,
  },
  PKMTR: {
    name: 'PKMTR',
    lat: 62.92,
    lon: 40.57,
  },
  PMRF: {
    name: 'PMRF',
    lat: 22.02,
    lon: 200.22,
  },
  RLLC: {
    name: 'RLLC',
    lat: -39.26,
    lon: 177.86,
  },
  SADOL: {
    name: 'SADOL',
    lat: 75,
    lon: 40,
  },
  SEAL: {
    name: 'SEAL',
    lat: 0,
    lon: 210,
  },
  SEM: {
    name: 'SEM',
    lat: 35.23,
    lon: 53.92,
  },
  SNMLP: {
    name: 'SNMLP',
    lat: 2.94,
    lon: 40.21,
  },
  SRI: {
    name: 'SRI',
    lat: 13.73,
    lon: 80.23,
  },
  TNSTA: {
    name: 'TNSTA',
    lat: 30.39,
    lon: 130.96,
  },
  TSC: {
    name: 'TSC',
    lat: 39.14,
    lon: 111.96,
  },
  TTMTR: {
    name: 'TTMTR',
    lat: 45.95,
    lon: 63.35,
  },
  TNGH: {
    name: 'TNGH',
    lat: 40.85,
    lon: 129.66,
  },
  VOSTO: {
    name: 'VOSTO',
    lat: 51.88,
    lon: 128.33,
  },
  WLPIS: {
    name: 'WLPIS',
    lat: 37.84,
    lon: 284.53,
  },
  WOMRA: {
    name: 'WOMRA',
    lat: -30.95,
    lon: 136.5,
  },
  WSC: {
    name: 'WSC',
    lat: 19.61,
    lon: 110.95,
  },
  XSC: {
    name: 'XSC',
    lat: 28.24,
    lon: 102.02,
  },
  YAVNE: {
    name: 'YAVNE',
    lat: 31.88,
    lon: 34.68,
  },
  YUN: {
    name: 'YUN',
    lat: 39.66,
    lon: 124.7,
  },

  // Non-CSpOC
  AMH: {
    name: 'AMH',
    lat: 58.5107,
    lon: -4.5121,
  },

  ALC: {
    name: 'ALC',
    lat: -2.373056,
    lon: -44.396389,
  },
} as unknown as {
  [key: string]: {
    name: string;
    lat: Degrees;
    lon: Degrees
    site: string;
    country: string;
    wikiUrl: null;
  }
};


export const launchSiteObjects = Object.entries(launchSites).map(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ([_key, value]) => new LaunchSite({
    name: value.name,
    lat: value.lat,
    lon: value.lon,
    alt: 0, // Altitude is not provided in the original data
    country: value.country ?? 'Unknown Country', // Default to 'Unknown Country' if country is not provided
    site: value.site ?? 'Unknown Site', // Default to 'Unknown Site' if site is not provided
    wikiUrl: value.wikiUrl ?? null, // Default to null if wikiUrl is not provided
  }),
);
