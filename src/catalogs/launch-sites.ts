import { LaunchSite } from '@app/singletons/catalog-manager/LaunchFacility';
import { Degrees } from 'ootk';
import { AFETRList } from './launch-sites/afetr-list';
import { AFWTRList } from './launch-sites/afwtr-list';

export const launchSites = {
  ...AFETRList,
  ...AFWTRList,
  DLS: {
    name: 'Dombarovsky Launch Site',
    lat: 51.048889,
    lon: 59.853333,
    site: 'Dombarovsky Air Base',
    country: 'Russia',
    wikiUrl: 'https://en.wikipedia.org/wiki/Dombarovsky_(air_base)',
    // NOTES: Dnepr launch site. Unused since 2015. Multiple silos and launch pads.
  },
  'FRGUI-ELV': {
    name: 'Vega Launch Complex',
    lat: 5.236,
    lon: -52.775,
    site: 'Guiana Space Centre',
    country: 'French Guiana',
    wikiUrl: 'https://en.wikipedia.org/wiki/ELA-1',
  },
  'FRGUI-ELA4': {
    name: 'Ariane Launch Complex 4',
    lat: 5.265,
    lon: -52.792,
    site: 'Guiana Space Centre',
    country: 'French Guiana',
    wikiUrl: 'https://en.wikipedia.org/wiki/ELA-4',
  },
  HGSTR: {
    name: 'Hammaguira Space Track Range',
    lat: 31.09,
    lon: 357.17,
    site: 'Interarmy Special Vehicles Test Centre',
    country: 'Algeria',
    wikiUrl: 'https://en.wikipedia.org/wiki/Hammaguir',
  },
  JJSLA: {
    name: 'Jeju Island Sea Launch Area',
    lat: 33.201288,
    lon: 126.408439,
    site: 'Jeju Island',
    country: 'South Korea',
    wikiUrl: 'https://en.wikipedia.org/wiki/Jeju_Island',
  },
  'JSC-LA4': {
    name: 'Launch Area 4 (South Launch Site)',
    lat: 40.957893,
    lon: 100.290944,
    site: 'Jiuquan Satellite Launch Center',
    country: 'China',
    wikiUrl: 'https://en.wikipedia.org/wiki/Jiuquan_Launch_Area_4',
  },
  'JSC-LS-95': {
    name: 'Launch Site 95',
    lat: 40.9698,
    lon: 100.3439,
    site: 'Jiuquan Satellite Launch Center',
    country: 'China',
    wikiUrl: 'https://en.wikipedia.org/wiki/Jiuquan_Satellite_Launch_Center',
  },
  PSCA: { // KODAK
    name: 'Launch Pad 3C',
    lat: 57.435278,
    lon: -152.34,
    site: 'Pacific Spaceport Complex - Alaska', // Formerally Kodiak Launch Complex
    country: 'United States',
    wikiUrl: 'https://en.wikipedia.org/wiki/Pacific_Spaceport_Complex_%E2%80%93_Alaska',
  },
  KSCUT: {
    name: 'Epsilon Rocket Launch Site', // Mu Pad
    lat: 31.251,
    lon: 131.0813,
    site: 'Uchinoura Space Center',
    country: 'Japan',
    wikiUrl: 'https://en.wikipedia.org/wiki/Uchinoura_Space_Center',
  },
  KWAJ: {
    name: 'Bucholz Army Airfield',
    lat: 9.04,
    lon: 167.74,
    site: 'Kwajalein Atoll',
    country: 'Marshall Islands',
    wikiUrl: 'https://en.wikipedia.org/wiki/US_Army_Kwajalein_Atoll',
  },
  KYMTR: { // Larger facility looks largely unused
    name: 'Burya Launch Complex',
    lat: 48.47,
    lon: 46.32,
    site: 'Kapustin Yar',
    country: 'Russia',
    wikiUrl: 'https://en.wikipedia.org/wiki/Kapustin_Yar',
  },
  NSC: {
    name: 'Launch Complex 1/2', // Too close to be shown separately
    lat: 34.431803,
    lon: 127.536397,
    site: 'Naro Space Center',
    country: 'South Korea',
    wikiUrl: 'https://en.wikipedia.org/wiki/Naro_Space_Center',
  },
  'PKMTR-S35': { // PLMSC
    name: 'Site 35', // Angara
    lat: 62.927319,
    lon: 40.574897,
    site: 'Plesetsk Cosmodrome',
    country: 'Russia',
    wikiUrl: 'https://en.wikipedia.org/wiki/Plesetsk_Cosmodrome_Site_35',
  },
  'PKMTR-S43': { // PLMSC
    name: 'Site 43', // Soyuz
    lat: 62.92,
    lon: 40.466944,
    site: 'Plesetsk Cosmodrome',
    country: 'Russia',
    wikiUrl: 'https://en.wikipedia.org/wiki/Plesetsk_Cosmodrome_Site_43',
  },
  PMRF: {
    name: 'Barking Sands',
    lat: 22.022778,
    lon: -159.785,
    site: 'Pacific Missile Range Facility',
    country: 'United States',
    wikiUrl: 'https://en.wikipedia.org/wiki/Pacific_Missile_Range_Facility',
  },
  'RLLC-1': { // RLLB
    name: 'Pad A/B',
    lat: -39.26,
    lon: 177.86,
    site: 'Rocket Lab Launch Complex 1',
    country: 'New Zealand',
    wikiUrl: 'https://en.wikipedia.org/wiki/Rocket_Lab_Launch_Complex_1',
  },
  SCSLA: {
    name: 'Sea Launch Area',
    lat: 21.402551,
    lon: 111.806969,
    site: 'South China Sea',
    country: 'China',
    wikiUrl: 'https://en.wikipedia.org/wiki/South_China_Sea',
  },
  SEM: { // SEMLS
    name: 'Main Launch Pad',
    lat: 35.237222,
    lon: 53.95,
    site: 'Semnan Space Center',
    country: 'Iran',
    wikiUrl: 'https://en.wikipedia.org/wiki/Semnan_Space_Center',
  },
  SHASC: {
    name: 'Shahroud Launch Pad',
    lat: 36.2009,
    lon: 55.3339,
    site: 'Shahroud Space Center',
    country: 'Iran',
    wikiUrl: 'https://en.wikipedia.org/wiki/Shahroud_Space_Center',
  },
  SNMLP: { // San Marco - this is no longer used
    name: 'San Marco Launch Platform',
    lat: -2.9408,
    lon: 40.2134,
    site: 'Broglio Space Centre',
    country: 'Kenya',
    wikiUrl: 'https://en.wikipedia.org/wiki/Broglio_Space_Centre',
  },
  SPKII: { // Space Port Kii
    name: 'Launch Pad', // TODO: Not sure what the real name is?
    lat: 33.5443,
    lon: 135.8895,
    site: 'Spaceport Kii',
    country: 'Japan',
    wikiUrl: 'https://en.wikipedia.org/wiki/Space_Port_Kii',
  },
  SRI: { // Sriharikota Range
    name: 'First/Second Launch Pad',
    lat: 13.72,
    lon: 80.23,
    site: 'Satish Dhawan Space Centre',
    country: 'India',
    wikiUrl: 'https://en.wikipedia.org/wiki/Satish_Dhawan_Space_Centre',
  },
  // SVOBO closed in 2007
  TANSC: {
    name: 'Yoshinobu Launch Complex',
    lat: 30.4,
    lon: 130.97,
    site: 'Tanegashima Space Center',
    country: 'Japan',
    wikiUrl: 'https://en.wikipedia.org/wiki/Yoshinobu_Launch_Complex',
  },
  TSC: {
    name: 'Launch Site 9/9A and 16',
    lat: 38.849086,
    lon: 111.608497,
    site: 'Taiyuan Satellite Launch Center',
    country: 'China',
    wikiUrl: 'https://en.wikipedia.org/wiki/Taiyuan_Satellite_Launch_Center',
  },
  'TTMTR-1': { // TYMSC or Baikonur
    name: 'Gagarin\'s Start',
    lat: 45.920278,
    lon: 63.342222,
    site: 'Baikonur Cosmodrome',
    country: 'Kazakhstan',
    wikiUrl: 'https://en.wikipedia.org/wiki/Gagarin%27s_Start',
  },
  'TTMTR-45': { // TYMSC or Baikonur
    name: 'Site 45',
    lat: 46.070833,
    lon: 62.984722,
    site: 'Baikonur Cosmodrome',
    country: 'Kazakhstan',
    wikiUrl: 'https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_45',

  },
  'TTMTR-81': { // TYMSC or Baikonur
    name: 'Site 81',
    lat: 45.943,
    lon: 63.653,
    site: 'Baikonur Cosmodrome',
    country: 'Kazakhstan',
    wikiUrl: 'https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_81',
  },
  'TTMTR-109': { // TYMSC or Baikonur
    name: 'Site 109',
    lat: 45.951,
    lon: 63.497,
    site: 'Baikonur Cosmodrome',
    country: 'Kazakhstan',
    wikiUrl: 'https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_109',
  },
  SOHAE: { // YUN
    name: 'Yunsong Launch Site',
    lat: 39.66,
    lon: 124.705,
    site: 'Sohae Satellite Launching Station',
    country: 'North Korea',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sohae_Satellite_Launching_Station',
  },
  TNGH: {
    name: 'Launch Pad',
    lat: 40.85,
    lon: 129.66,
    site: 'Tonghae Satellite Launching Ground',
    country: 'North Korea',
    wikiUrl: 'https://en.wikipedia.org/wiki/Tonghae_Satellite_Launching_Ground',
  },
  VOSTO: {
    name: 'Site 1A/1S/2A/PU3',
    lat: 51.869444,
    lon: 128.357222,
    site: 'Vostochny Cosmodrome',
    country: 'Russia',
    wikiUrl: 'https://en.wikipedia.org/wiki/Vostochny_Cosmodrome',
  },
  MARS: { // Wallops Flight Facility | WLPIS
    name: 'Pad 0B/0C', // Minotaur and Electron
    lat: 37.85,
    lon: -75.466667,
    site: 'Mid-Atlantic Regional Spaceport',
    country: 'United States',
    wikiUrl: 'https://en.wikipedia.org/wiki/Mid-Atlantic_Regional_Spaceport_Launch_Pad_0#Launch_Complex-2_(Pad_0C)',
  },
  WOMRA: {
    name: 'HAD Launch Complex',
    lat: -30.9553,
    lon: 136.5322,
    site: 'Woomera Test Range',
    country: 'Australia',
    wikiUrl: 'https://en.wikipedia.org/wiki/Woomera_Test_Range',
  },
  WSC: {
    name: 'Launch Complex 101/201',
    lat: 19.614492,
    lon: 110.951133,
    site: 'Wenchang Space Launch Site',
    country: 'China',
    wikiUrl: 'https://en.wikipedia.org/wiki/Wenchang_Space_Launch_Site',
  },
  XSC: {
    name: 'Launch Complex 2/3',
    lat: 28.246017,
    lon: 102.026556,
    site: 'Xichang Satellite Launch Center',
    country: 'China',
    wikiUrl: 'https://en.wikipedia.org/wiki/Palmachim_Airbase',
  },
  YAVNE: {
    name: 'Launch Pad',
    lat: 31.884444,
    lon: 34.680278,
    site: 'Palmachim Air Force Base',
    country: 'Israel',
    wikiUrl: 'https://en.wikipedia.org/wiki/Palmachim_Air_Force_Base',
  },
  YSLA: {
    name: 'Yellow Sea Launch Area',
    lat: 38,
    lon: 123,
    site: 'The DongFang Spaceport', // Taiyuan Satellite Launch Center
    country: 'China',
    wikiUrl: 'https://en.wikipedia.org/wiki/Taiyuan_Satellite_Launch_Center#The_DongFang_Spaceport',
  },
  // Non-CSpOC
  STARBASE: {
    name: 'Orbital Launch Pad A/B',
    lat: 25.9875,
    lon: -97.186389,
    site: 'SpaceX Starbase',
    country: 'United States',
    wikiUrl: 'https://en.wikipedia.org/wiki/SpaceX_Starbase',
  },
  VIKRAM: {
    name: 'Thumba Equatorial Rocket Launching Station',
    lat: 8.5,
    lon: 76.9,
    site: 'Vikram Sarabhai Space Centre',
    country: 'India',
    wikiUrl: 'https://en.wikipedia.org/wiki/Thumba_Equatorial_Rocket_Launching_Station',
  },
  ELAREN: {
    name: 'Médano del Loro',
    lat: 37.096944,
    lon: -6.738611,
    site: 'El Arenosillo Test Centre',
    country: 'Spain',
    wikiUrl: 'https://en.wikipedia.org/wiki/El_Arenosillo',
  },
  // Planned or Inactive
  OSATC: {
    name: 'South African Test Centre (Inactive)',
    lat: -34.60265,
    lon: 20.30248,
    site: 'Denel Overberg Test Range',
    country: 'South Africa',
    wikiUrl: 'https://en.wikipedia.org/wiki/Denel_Overberg_Test_Range',
  },
  SPSWE: {
    name: 'Planned Launch Site',
    lat: 67.848889,
    lon: 20.302778,
    site: 'Spaceport Sweden',
    country: 'Sweden',
    wikiUrl: 'https://en.wikipedia.org/wiki/Spaceport_Sweden',
  },
  MARLS: {
    name: 'Planned Launch Site',
    lat: 45.30688,
    lon: -60.98767,
    site: 'Maritime Spaceport',
    country: 'Canada',
    wikiUrl: 'https://en.wikipedia.org/wiki/Maritime_Launch_Services',
  },
  MASC: {
    name: 'Planned Launch Site',
    lat: 44.4444,
    lon: -67.6,
    site: 'Maine Spaceport Complex',
    country: 'United States',
    wikiUrl: 'https://en.wikipedia.org/wiki/Maine_Spaceport_Complex',
  },
  ANDSP: {
    name: 'Planned Launch Site',
    lat: 69.294167,
    lon: 16.020833,
    site: 'Andøya Spaceport',
    country: 'Norway',
    wikiUrl: 'https://en.wikipedia.org/wiki/And%C3%B8ya_Space',
  },
  BOS: {
    name: 'Planned Launch Site',
    lat: -19.958148641067815,
    lon: 148.11360161948667,
    site: 'Bowen Orbital Spaceport',
    country: 'Australia',
    wikiUrl: 'https://en.wikipedia.org/wiki/Gilmour_Space_Technologies',
  },
  EHLC: {
    name: 'Planned Launch Site',
    lat: 27.932009,
    lon: -15.385444,
    site: 'El Hierro Launch Centre',
    country: 'Spain',
    wikiUrl: 'https://en.wikipedia.org/wiki/El_Hierro_Launch_Centre',
  },
  ALCSC: {
    name: 'Space Launch Vehicle Pad',
    lat: -2.339444,
    lon: -44.4175,
    site: 'Alcântara Space Center',
    country: 'Brazil',
    wikiUrl: 'https://en.wikipedia.org/wiki/Alc%C3%A2ntara_Space_Center',
  },
  PBNB: {
    name: 'Centro Espacial Manuel Belgrano (Planned)',
    lat: -38.9628,
    lon: -61.715,
    site: 'Port Belgrano Naval Base',
    country: 'Argentina',
    wikiUrl: 'https://en.wikipedia.org/wiki/Port_Belgrano_Naval_Base',
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
