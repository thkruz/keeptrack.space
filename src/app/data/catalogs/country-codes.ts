/**
 * Country code tables, free of imports so build scripts (scripts/flag-atlas/) can load
 * them under plain Node. `countries.ts` re-exports both; import from there in app code.
 */
export const countryCodeList = {
  Afghanistan: 'AF',
  Algeria: 'ALG',
  Argentina: 'AR|ARGN',
  Australia: 'AU|AUS',
  Austria: 'AT|ASRA',
  Azerbaijan: 'AZ|AZER',
  Bahrain: 'BH|BHR',
  Belarus: 'BY|BELA',
  Belgium: 'B|BEL',
  Bolivia: 'BOL',
  Botswana: 'BW|BOTS|BWA',
  Brazil: 'BR|BRAZ',
  Canada: 'CA',
  Chile: 'CHLE',
  China: 'CN|PRC',
  Colombia: 'CO|COL',
  Czechoslovakia: 'CZ|CZCH',
  Denmark: 'DK|DEN',
  Egypt: 'EG|EGYP',
  Estonia: 'EE|EST',
  'European Space Agency': 'ESA|I-ESA',
  'ESA and JAXA': 'ESA/JAXA',
  Finland: 'FI|FIN',
  France: 'F|FR|France',
  Germany: 'D|GER',
  Globalstar: 'GLOB|ORB',
  Greece: 'GR|GREC',
  'Hong Kong': 'HK',
  Hungary: 'HU|HUN',
  India: 'IN|IND',
  Indonesia: 'ID|INDO',
  Inmarsat: 'IM',
  International: 'ISS',
  Intelsat: 'ITSO',
  Iran: 'IR|IRAN',
  Iraq: 'IQ|IRAQ',
  Ireland: 'IE',
  Israel: 'IL|ISRA',
  Italy: 'I|IT',
  Japan: 'J|Japan|JP|JPN|JAXA',
  Jordan: 'JOR',
  Kazakhstan: 'KZ|KAZ',
  Kuwait: 'KWT',
  Laos: 'LAOS',
  Lithuania: 'LTU',
  Luxembourg: 'LUXE',
  Malaysia: 'MALA',
  Mauritius: 'MUS',
  Mexico: 'MX|MEX',
  Montenegro: 'ME',
  Moldova: 'MDA',
  Mongolia: 'MNG',
  Morocco: 'MA',
  NATO: 'NATO',
  Netherlands: 'NL|NETH',
  'New Zealand': 'NZ|NZL|New Zealand',
  Nigeria: 'NG|NIG',
  'North Korea': 'KP|NKOR',
  Norway: 'N|NO|NOR',
  O3B: 'O3B',
  Peru: 'PE|PERU',
  Philippines: 'PH|RP',
  Poland: 'PL|POL',
  Portugal: 'PT|POR',
  Russia: 'RU|SU|CIS|Russia',
  'Saudi Arabia': 'SA|SAUD',
  Singapore: 'SG|SING',
  'Solomon Islands': 'SB|SLB',
  'South Africa': 'ZA',
  'South Korea': 'KR|SKOR',
  Spain: 'E|Spain|ES|SPN',
  Sweden: 'S|SWED',
  Switzerland: 'CH|SWTZ',
  Uganda: 'UG',
  Thailand: 'T|THAI',
  Turkey: 'TR|TURK',
  Ukraine: 'UKR',
  'United Arab Emirates': 'AE|UAE',
  'United Kingdom': 'UK',
  'United States': 'US|USA|United States',
  Uruguay: 'UY|URY',
  Venezuela: 'VE|VENZ',
  Vietnam: 'VN|VTNM',
};

export const countryFlagIconMap = {
  AAT: 'AAT', // No matching code, kept original
  ADG: 'RU', // Adygea is part of Russia
  AF: 'AF',
  AG: 'AG',
  AGUK: 'AG',
  AM: 'AM',
  ANTN: 'ANTN', // No matching code, kept original
  AO: 'AO',
  AQ: 'AQ', // Added new code for Antarctica
  AR: 'AR',
  ARV: 'AR', // Argentine Antarctic is part of Argentina
  AT: 'AT',
  AU: 'AU',
  AZ: 'AZ',
  B: 'BE', // Belgium
  BASH: 'RU', // Bashkiria is part of Russia
  BAT: 'BAT', // No matching code, kept original
  BB: 'BB',
  BBUK: 'BB',
  BD: 'BD',
  BG: 'BG',
  BGN: 'BG', // PR Bulgaria is now Bulgaria
  BH: 'BH',
  BM: 'BM',
  BO: 'BO',
  BOTS: 'BW', // Botswana
  BR: 'BR',
  BS: 'BS',
  BT: 'BT',
  BW: 'BW',
  BY: 'BY',
  CA: 'CA',
  CD: 'CD',
  CH: 'CH',
  CI: 'CI',
  CK: 'CK',
  CL: 'CL',
  CM: 'CM',
  CN: 'CN',
  CO: 'CO',
  COLP: 'CG', // Congo
  CR: 'CR',
  CSFR: 'CZ', // Czechoslovakia → same flag as Czechia
  CSSR: 'CZ', // Czechoslovakia → same flag as Czechia
  CU: 'CU',
  CYM: 'KY', // Cayman Islands
  CYMRU: 'GB-WLS', // Wales
  CZ: 'CZ',
  D: 'DE', // Germany
  DAG: 'RU', // Dagestan is part of Russia
  DD: 'DD', // No matching code, kept original (historical East Germany)
  DJ: 'DJ',
  DK: 'DK',
  DML: 'DML', // No matching code, kept original
  DR: 'DR', // No matching code, kept original (historical Germany)
  DX: 'DX', // No matching code, kept original (historical occupied Germany)
  DZ: 'DZ',
  E: 'ES', // Spain
  ES: 'ES',
  Spain: 'ES',
  EC: 'EC',
  EE: 'EE',
  EG: 'EG',
  ENG: 'GB-ENG', // England
  ESCN: 'ES', // Canary Islands are part of Spain
  ESIB: 'ES', // Balearic Islands are part of Spain
  ET: 'ET',
  F: 'FR', // France
  FI: 'FI',
  GE: 'GE',
  GH: 'GH',
  GI: 'GI',
  GL: 'GL',
  GR: 'GR',
  '': 'GD', // Grenada (fixed empty key)
  GT: 'GT',
  GU: 'GU',
  GUF: 'GF', // French Guiana
  HK: 'HK',
  HKUK: 'HK',
  HR: 'HR',
  HU: 'HU',
  I: 'IT', // Italy
  'I-ARAB': 'I-ARAB', // No matching code, kept original
  'I-CSC1': 'I-CSC1', // No matching code, kept original
  'I-ELDO': 'I-ELDO', // No matching code, kept original
  'I-ESRO': 'I-ESRO', // No matching code, kept original
  'I-EUM': 'I-EUM', // No matching code, kept original
  'I-EU': 'I-EU', // No matching code, kept original
  'I-EUT': 'I-EUT', // No matching code, kept original
  'I-INM': 'I-INM', // No matching code, kept original
  'I-INT': 'I-INT', // No matching code, kept original
  'I-ISS': 'I-ISS', // No matching code, kept original
  'I-NATO': 'I-NATO', // No matching code, kept original
  'I-RASC': 'I-RASC', // No matching code, kept original
  ID: 'ID',
  IE: 'IE',
  IL: 'IL',
  IN: 'IN',
  IQ: 'IQ',
  IR: 'IR',
  IS: 'IS',
  J: 'JP', // Japan
  Japan: 'JP', // Japan - TODO: Fixx this in the database
  JO: 'JO',
  JOR: 'JO', // Space-Track alpha-3 for Jordan
  KE: 'KE',
  KI: 'KI',
  KG: 'KG',
  KGSR: 'KG', // Kyrgyz SSR is now Kyrgyzstan
  KH: 'KH',
  KORS: 'KORS', // No matching code, kept original
  KORSA: 'KORSA', // No matching code, kept original
  KP: 'KP',
  KR: 'KR',
  KW: 'KW',
  KZ: 'KZ',
  L: 'LU', // Luxembourg
  LA: 'LA',
  LB: 'LB',
  LK: 'LK',
  LT: 'LT',
  LV: 'LV',
  LY: 'LY',
  MA: 'MA',
  MC: 'MC',
  MD: 'MD',
  ME: 'ME',
  MH: 'MH',
  MN: 'MN',
  MR: 'MR',
  MU: 'MU',
  MV: 'MV',
  MX: 'MX',
  MY: 'MY',
  MYM: 'MM', // Myanmar
  MDA: 'MD', // Moldova
  MNG: 'MN', // Mongolia
  MUS: 'MU', // Mauritius
  N: 'NO', // Norway
  NO: 'NO', // Norway
  NG: 'NG',
  NL: 'NL',
  NP: 'NP',
  NZ: 'NZ',
  NZL: 'NZ', // New Zealand
  NZRD: 'NZRD', // No matching code, kept original
  OM: 'OM',
  P: 'PT', // Portugal
  PAR: 'PA', // Panama
  PCZ: 'PCZ', // No matching code, kept original
  PE: 'PE',
  PG: 'PG',
  PK: 'PK',
  PH: 'PH',
  PL: 'PL',
  PLRL: 'PL',
  PR: 'PR',
  PT: 'PT',
  PY: 'PY',
  QA: 'QA',
  RO: 'RO',
  RU: 'RU',
  RW: 'RW',
  S: 'SE', // Sweden
  SA: 'SA',
  SB: 'SB',
  SCOT: 'GB-SCT', // Scotland
  SD: 'SD',
  SG: 'SG',
  SH: 'SH',
  SN: 'SN',
  SI: 'SI',
  SK: 'SK',
  SR: 'SR',
  SU: 'SU', // No matching code, kept original (historical USSR)
  SY: 'SY',
  T: 'TH', // Thailand
  TC: 'TC',
  TF: 'TF',
  TJ: 'TJ',
  TM: 'TM',
  TN: 'TN',
  TO: 'TO',
  TR: 'TR',
  TTPI: 'TTPI', // No matching code, kept original
  TUVA: 'RU', // Tuva is part of Russia
  TW: 'TW',
  UA: 'UA',
  UG: 'UG',
  UAE: 'AE', // United Arab Emirates
  UK: 'GB', // United Kingdom
  UM: 'UM',
  US: 'US',
  UY: 'UY',
  UZ: 'UZ',
  VE: 'VE',
  VN: 'VN',
  YE: 'YE',
  ZA: 'ZA',
  ZR: 'CD', // Zaire is now Democratic Republic of the Congo
  ZW: 'ZW',
  ANALSAT: 'ANALSAT', // No matching code, kept original
  SAUD: 'SA', // Saudi Arabia
  AB: 'SA', // Saudi Arabia
  AC: 'AC', // No matching code, kept original
  ALG: 'DZ', // Algeria
  ALL: 'ALL', // No matching code, kept original
  ARGN: 'AR', // Argentina
  ASRA: 'AT', // Austria
  AUS: 'AU',
  AZER: 'AZ',
  BEL: 'BE',
  BELA: 'BY',
  ABS: 'ABS', // Asia Broadcast Satellite - no matching flag, kept original
  BERM: 'BM',
  BHR: 'BH', // Space-Track alpha-3 for Bahrain
  BOL: 'BO',
  BWA: 'BW', // Space-Track alpha-3 for Botswana
  SLB: 'SB', // Space-Track alpha-3 for Solomon Islands
  BRAZ: 'BR',
  CHBZ: 'CHBZ', // No matching code, kept original
  CHLE: 'CL', // Chile
  CIS: 'CIS', // No matching code, kept original
  COL: 'CO',
  CZCH: 'CZ', // Czech Republic (formerly Czechoslovakia)
  DEN: 'DK',
  ECU: 'EC',
  EGYP: 'EG',
  ESA: 'ESA', // No matching code, kept original
  'ESA/JAXA': 'ESA/JAXA', // No matching code, kept original
  'I-ESA': 'I-ESA', // No matching code, kept original
  EST: 'EE',
  EUME: 'EUME', // No matching code, kept original
  EUTE: 'EUTE', // No matching code, kept original
  FIN: 'FI',
  FGER: 'FGER', // No matching code, kept original
  FR: 'FR',
  FRIT: 'FRIT', // No matching code, kept original
  GER: 'DE',
  GLOB: 'US',
  GREC: 'GR',
  HUN: 'HU',
  IM: 'IM',
  IND: 'IN',
  INDO: 'ID',
  IRAN: 'IR',
  IRAQ: 'IQ',
  ISRA: 'IL',
  ISS: 'ISS', // No matching code, kept original
  IT: 'IT',
  ITSO: 'ITSO', // Intelsat (custom flag)
  JAXA: 'JP', // Japan's space agency (joint-mission strings split on /)
  JPN: 'JP',
  KAZ: 'KZ',
  KWT: 'KW', // Kuwait
  LAOS: 'LA',
  LTU: 'LT',
  LUXE: 'LU',
  MALA: 'MY',
  MEX: 'MX',
  NATO: 'NATO', // No matching code, kept original
  NETH: 'NL',
  NICO: 'US',
  NIG: 'NG',
  NKOR: 'KP',
  NOR: 'NO',
  O3B: 'LU',
  ORB: 'US',
  PAKI: 'PK',
  PERU: 'PE',
  POL: 'PL',
  POR: 'PT',
  PRC: 'CN',
  RASC: 'RASC', // RASCOM (custom flag)
  ROC: 'TW',
  Taiwan: 'TW',
  ROM: 'RO',
  SAFR: 'ZA',
  SEAL: 'RU',
  RP: 'PH',
  SES: 'LU',
  SING: 'SG',
  SKOR: 'KR',
  SPN: 'ES',
  STCT: 'STCT', // No matching code, kept original
  SWED: 'SE',
  SWTZ: 'CH',
  THAI: 'TH',
  TMMC: 'TMMC', // No matching code, kept original
  TURK: 'TR',
  UKR: 'UA',
  URY: 'UY',
  USA: 'US',
  USBZ: 'USBZ', // No matching code, kept original
  VENZ: 'VE',
  VTNM: 'VN',
  TBD: 'TBD', // No matching code, kept original
};
