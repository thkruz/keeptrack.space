/**
 * IANA time zone of each built-in catalog sensor, keyed by `objName`. Zones are looked up by
 * site, never derived from longitude. Sensors absent here (e.g. the mobile sea-based radar)
 * fall back to the browser zone.
 *
 * @license AGPL-3.0-or-later
 */

const NY = 'America/New_York';
const ANC = 'America/Anchorage';
const MOSCOW = 'Europe/Moscow';
const SHANGHAI = 'Asia/Shanghai';
const PERTH = 'Australia/Perth';

export const CATALOG_SITE_TIME_ZONES: Readonly<Record<string, string>> = {
  CODSFS: NY,
  BLEAFB: 'America/Los_Angeles',
  CLRSFS: ANC,
  EGLAFB: 'America/Chicago',
  RAFFYL: 'Europe/London',
  CAVSFS: 'America/Chicago',
  PITSB: 'America/Thule',
  COBRADANE: ANC,
  KWAJALT: 'Pacific/Kwajalein',
  KWAJGBRP: 'Pacific/Kwajalein',
  KWAJMMW: 'Pacific/Kwajalein',
  KWAJALC: 'Pacific/Kwajalein',
  KWAJTDX: 'Pacific/Kwajalein',
  KWAJSPF: 'Pacific/Kwajalein',
  MITMIL: NY,
  GEODDSDGC: 'Indian/Chagos',
  GEODDSMAU: 'Pacific/Honolulu',
  GEODDSSOC: 'America/Denver',
  RAFASC: 'Atlantic/St_Helena',
  GLBII: 'Europe/Oslo',
  HOLCBAND: PERTH,
  HOLSST: PERTH,
  HOLDARC: PERTH,
  LRDR: ANC,
  HARTPY: 'Asia/Jerusalem',
  QTRTPY: 'Asia/Qatar',
  KURTPY: 'Europe/Istanbul',
  SHATPY: 'Asia/Tokyo',
  KCSTPY: 'Asia/Tokyo',
  LEOMSR: 'America/Chicago',
  LEOPFISR: ANC,
  LEOKSR: 'Pacific/Auckland',
  LEOCRSR: 'America/Costa_Rica',
  LEOAZORES: 'Atlantic/Azores',
  LEOWASR: PERTH,
  GRV: 'Europe/Paris',
  TIR: 'Europe/Berlin',
  GES: 'Europe/Berlin',
  NRC: 'Europe/Rome',
  PDM: 'Europe/Rome',
  TRO: 'Asia/Nicosia',
  SDT: 'Atlantic/Canary',
  ZimLAT: 'Europe/Zurich',
  ZimSMART: 'Europe/Zurich',
  Tromso: 'Europe/Oslo',
  Kiruna: 'Europe/Stockholm',
  Sodankyla: 'Europe/Helsinki',
  Svalbard: 'Arctic/Longyearbyen',
  OLED: MOSCOW,
  OLEV: MOSCOW,
  PEC: MOSCOW,
  MISD: 'Asia/Irkutsk',
  MISV: 'Asia/Irkutsk',
  LEKV: MOSCOW,
  ARMV: MOSCOW,
  GAN: 'Europe/Minsk',
  KALV: 'Europe/Kaliningrad',
  BARV: 'Asia/Barnaul',
  YENV: 'Asia/Krasnoyarsk',
  ORSV: 'Asia/Yekaterinburg',
  BAL: 'Asia/Almaty',
  STO: MOSCOW,
  NAK: 'Asia/Vladivostok',
  XIN: SHANGHAI,
  HEI: SHANGHAI,
  ZHE: SHANGHAI,
  SHD: SHANGHAI,
  PMO: SHANGHAI,
  MLS: 'America/Phoenix',
  PO: 'America/Los_Angeles',
  LSO: 'Europe/Madrid',
  MAY: 'America/Denver',
  ROC: 'Asia/Taipei',
  OWLKorea: 'Asia/Seoul',
  OWLMongolia: 'Asia/Ulaanbaatar',
  OWLMorocco: 'Africa/Casablanca',
  OWLIsrael: 'Asia/Jerusalem',
  OWLUSA: 'America/Phoenix',
};

/** Zone of a built-in catalog sensor, or undefined for unknown or custom sensors. */
export const catalogSiteTimeZone = (objName: string | undefined): string | undefined =>
  objName && Object.hasOwn(CATALOG_SITE_TIME_ZONES, objName) ? CATALOG_SITE_TIME_ZONES[objName] : undefined;
