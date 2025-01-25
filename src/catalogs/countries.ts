import 'flag-icons/css/flag-icons.min.css';
import '../../public/css/flag-icons.css';

export const countryCodeList = {
  'Afghanistan': 'AF',
  'Algeria': 'ALG',
  'Argentina': 'AR|ARGN',
  'Australia': 'AU|AUS',
  'Austria': 'AT|ASRA',
  'Azerbaijan': 'AZ|AZER',
  'Belarus': 'BY|BELA',
  'Belgium': 'B|BEL',
  'Bolivia': 'BOL',
  'Brazil': 'BR|BRAZ',
  'Canada': 'CA',
  'Chile': 'CHLE',
  'China': 'CN|PRC',
  'Colombia': 'CO|COL',
  'Czechoslovakia': 'CZ|CZCH',
  'Denmark': 'DK|DEN',
  'Egypt': 'EG|EGYP',
  'Estonia': 'EE|EST',
  'European Space Agency': 'ESA|I-ESA',
  'Finland': 'FI|FIN',
  'France': 'F|FR',
  'Germany': 'D|GER',
  'Globalstar': 'GLOB|ORB',
  'Greece': 'GR|GREC',
  'Hong Kong': 'HK',
  'Hungary': 'HU|HUN',
  'India': 'IN|IND',
  'Indonesia': 'ID|INDO',
  'Inmarsat': 'IM',
  'International': 'ISS',
  'Intelsat': 'ITSO',
  'Iran': 'IR|IRAN',
  'Iraq': 'IQ|IRAQ',
  'Ireland': 'IE',
  'Israel': 'IL|ISRA',
  'Italy': 'I|IT',
  'Japan': 'J|JPN',
  'Jordan': 'JOR',
  'Kazakhstan': 'KZ|KAZ',
  'Kuwait': 'KWT',
  'Laos': 'LAOS',
  'Lithuania': 'LTU',
  'Luxembourg': 'LUXE',
  'Malaysia': 'MALA',
  'Mauritius': 'MUS',
  'Mexico': 'MX|MEX',
  'Moldova': 'MDA',
  'Mongolia': 'MNG',
  'Morocco': 'MA',
  'NATO': 'NATO',
  'Netherlands': 'NL|NETH',
  'New Zealand': 'NZ',
  'Nigeria': 'NG|NIG',
  'North Korea': 'KP|NKOR',
  'Norway': 'N|NOR',
  'O3B': 'O3B',
  'Peru': 'PE|PERU',
  'Philippines': 'PH|RP',
  'Poland': 'PL|POL',
  'Portugal': 'PT|POR',
  'Russia': 'RU|SU|CIS',
  'Saudi Arabia': 'SA|SAUD',
  'Singapore': 'SG|SING',
  'South Africa': 'ZA',
  'South Korea': 'KR|SKOR',
  'Spain': 'E|SPN',
  'Sweden': 'S|SWED',
  'Switzerland': 'CH|SWTZ',
  'Thailand': 'T|THAI',
  'Turkey': 'TR|TURK',
  'Ukraine': 'UKR',
  'United Arab Emirates': 'AE|UAE',
  'United Kingdom': 'UK',
  'United States': 'US|USA',
  'Uruguay': 'UY|URY',
  'Venezuela': 'VE|VENZ',
  'Vietnam': 'VN|VTNM',
};

export const countryFlagIconMap = {
  'AAT': 'AAT', // No matching code, kept original
  'ADG': 'RU', // Adygea is part of Russia
  'AF': 'AF',
  'AG': 'AG',
  'AGUK': 'AG',
  'AM': 'AM',
  'ANTN': 'ANTN', // No matching code, kept original
  'AO': 'AO',
  'AQ': 'AQ', // Added new code for Antarctica
  'AR': 'AR',
  'ARV': 'AR', // Argentine Antarctic is part of Argentina
  'AT': 'AT',
  'AU': 'AU',
  'AZ': 'AZ',
  'B': 'BE', // Belgium
  'BASH': 'RU', // Bashkiria is part of Russia
  'BAT': 'BAT', // No matching code, kept original
  'BB': 'BB',
  'BBUK': 'BB',
  'BD': 'BD',
  'BG': 'BG',
  'BGN': 'BG', // PR Bulgaria is now Bulgaria
  'BM': 'BM',
  'BO': 'BO',
  'BR': 'BR',
  'BS': 'BS',
  'BT': 'BT',
  'BY': 'BY',
  'CA': 'CA',
  'CD': 'CD',
  'CH': 'CH',
  'CI': 'CI',
  'CK': 'CK',
  'CL': 'CL',
  'CM': 'CM',
  'CN': 'CN',
  'CO': 'CO',
  'COLP': 'CG', // Congo
  'CR': 'CR',
  'CSFR': 'CSFR', // No matching code, kept original (historical Czechoslovakia)
  'CSSR': 'CSSR', // No matching code, kept original (historical Czechoslovakia)
  'CU': 'CU',
  'CYM': 'KY', // Cayman Islands
  'CYMRU': 'GB-WLS', // Wales
  'CZ': 'CZ',
  'D': 'DE', // Germany
  'DAG': 'RU', // Dagestan is part of Russia
  'DD': 'DD', // No matching code, kept original (historical East Germany)
  'DK': 'DK',
  'DML': 'DML', // No matching code, kept original
  'DR': 'DR', // No matching code, kept original (historical Germany)
  'DX': 'DX', // No matching code, kept original (historical occupied Germany)
  'DZ': 'DZ',
  'E': 'ES', // Spain
  'EC': 'EC',
  'EE': 'EE',
  'EG': 'EG',
  'ENG': 'GB-ENG', // England
  'ESCN': 'ES', // Canary Islands are part of Spain
  'ET': 'ET',
  'F': 'FR', // France
  'FI': 'FI',
  'GE': 'GE',
  'GH': 'GH',
  'GI': 'GI',
  'GL': 'GL',
  'GR': 'GR',
  '': 'GD', // Grenada (fixed empty key)
  'GT': 'GT',
  'GU': 'GU',
  'GUF': 'GF', // French Guiana
  'HK': 'HK',
  'HKUK': 'HK',
  'HU': 'HU',
  'I': 'IT', // Italy
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
  'ID': 'ID',
  'IE': 'IE',
  'IL': 'IL',
  'IN': 'IN',
  'IQ': 'IQ',
  'IR': 'IR',
  'IS': 'IS',
  'J': 'JP', // Japan
  'JO': 'JO',
  'KE': 'KE',
  'KI': 'KI',
  'KG': 'KG',
  'KGSR': 'KG', // Kyrgyz SSR is now Kyrgyzstan
  'KH': 'KH',
  'KORS': 'KORS', // No matching code, kept original
  'KORSA': 'KORSA', // No matching code, kept original
  'KP': 'KP',
  'KR': 'KR',
  'KW': 'KW',
  'KZ': 'KZ',
  'L': 'LU', // Luxembourg
  'LA': 'LA',
  'LB': 'LB',
  'LK': 'LK',
  'LT': 'LT',
  'LV': 'LV',
  'LY': 'LY',
  'MA': 'MA',
  'MC': 'MC',
  'MD': 'MD',
  'MH': 'MH',
  'MN': 'MN',
  'MR': 'MR',
  'MU': 'MU',
  'MV': 'MV',
  'MX': 'MX',
  'MY': 'MY',
  'MYM': 'MM', // Myanmar
  'N': 'NO', // Norway
  'NG': 'NG',
  'NL': 'NL',
  'NP': 'NP',
  'NZ': 'NZ',
  'NZRD': 'NZRD', // No matching code, kept original
  'P': 'PT', // Portugal
  'PAR': 'PA', // Panama
  'PCZ': 'PCZ', // No matching code, kept original
  'PE': 'PE',
  'PG': 'PG',
  'PK': 'PK',
  'PH': 'PH',
  'PL': 'PL',
  'PLRL': 'PL',
  'PR': 'PR',
  'PT': 'PT',
  'PY': 'PY',
  'QA': 'QA',
  'RO': 'RO',
  'RU': 'RU',
  'RW': 'RW',
  'S': 'SE', // Sweden
  'SA': 'SA',
  'SCOT': 'GB-SCT', // Scotland
  'SD': 'SD',
  'SG': 'SG',
  'SH': 'SH',
  'SI': 'SI',
  'SK': 'SK',
  'SR': 'SR',
  'SU': 'SU', // No matching code, kept original (historical USSR)
  'SY': 'SY',
  'T': 'TH', // Thailand
  'TC': 'TC',
  'TF': 'TF',
  'TJ': 'TJ',
  'TM': 'TM',
  'TN': 'TN',
  'TO': 'TO',
  'TR': 'TR',
  'TTPI': 'TTPI', // No matching code, kept original
  'TUVA': 'RU', // Tuva is part of Russia
  'TW': 'TW',
  'UA': 'UA',
  'UAE': 'AE', // United Arab Emirates
  'UK': 'GB', // United Kingdom
  'UM': 'UM',
  'US': 'US',
  'UY': 'UY',
  'UZ': 'UZ',
  'VE': 'VE',
  'VN': 'VN',
  'YE': 'YE',
  'ZA': 'ZA',
  'ZR': 'CD', // Zaire is now Democratic Republic of the Congo
  'ANALSAT': 'ANALSAT', // No matching code, kept original
  'SAUD': 'SA', // Saudi Arabia
  'AB': 'SA', // Saudi Arabia
  'AC': 'AC', // No matching code, kept original
  'ALG': 'DZ', // Algeria
  'ALL': 'ALL', // No matching code, kept original
  'ARGN': 'AR', // Argentina
  'ASRA': 'AT', // Austria
  'AUS': 'AU',
  'AZER': 'AZ',
  'BEL': 'BE',
  'BELA': 'BY',
  'BERM': 'BM',
  'BOL': 'BO',
  'BRAZ': 'BR',
  'CHBZ': 'CHBZ', // No matching code, kept original
  'CHLE': 'CL', // Chile
  'CIS': 'CIS', // No matching code, kept original
  'COL': 'CO',
  'CZCH': 'CZ', // Czech Republic (formerly Czechoslovakia)
  'DEN': 'DK',
  'ECU': 'EC',
  'EGYP': 'EG',
  'ESA': 'ESA', // No matching code, kept original
  'I-ESA': 'I-ESA', // No matching code, kept original
  'EST': 'EE',
  'EUME': 'EUME', // No matching code, kept original
  'EUTE': 'EUTE', // No matching code, kept original
  'FIN': 'FI',
  'FGER': 'FGER', // No matching code, kept original
  'FR': 'FR',
  'FRIT': 'FRIT', // No matching code, kept original
  'GER': 'DE',
  'GLOB': 'US',
  'GREC': 'GR',
  'HUN': 'HU',
  'IM': 'IM',
  'IND': 'IN',
  'INDO': 'ID',
  'IRAN': 'IR',
  'IRAQ': 'IQ',
  'ISRA': 'IL',
  'ISS': 'ISS', // No matching code, kept original
  'IT': 'IT',
  'ITSO': 'LU', // Luxembourg
  'JPN': 'JP',
  'KAZ': 'KZ',
  'LAOS': 'LA',
  'LTU': 'LT',
  'LUXE': 'LU',
  'MALA': 'MY',
  'MEX': 'MX',
  'NATO': 'NATO', // No matching code, kept original
  'NETH': 'NL',
  'NICO': 'US',
  'NIG': 'NG',
  'NKOR': 'KP',
  'NOR': 'NO',
  'O3B': 'LU',
  'ORB': 'US',
  'PAKI': 'PK',
  'PERU': 'PE',
  'POL': 'PL',
  'POR': 'PT',
  'PRC': 'CN',
  'RASC': 'MU', // Mauritius
  'ROC': 'TW',
  'Taiwan': 'TW',
  'ROM': 'RO',
  'SAFR': 'ZA',
  'SEAL': 'RU',
  'RP': 'PH',
  'SES': 'LU',
  'SING': 'SG',
  'SKOR': 'KR',
  'SPN': 'ES',
  'STCT': 'STCT', // No matching code, kept original
  'SWED': 'SE',
  'SWTZ': 'CH',
  'THAI': 'TH',
  'TMMC': 'TMMC', // No matching code, kept original
  'TURK': 'TR',
  'UKR': 'UA',
  'URY': 'UY',
  'USA': 'US',
  'USBZ': 'USBZ', // No matching code, kept original
  'VENZ': 'VE',
  'VTNM': 'VN',
  'TBD': 'TBD', // No matching code, kept original
};

export const country2flagIcon = (country: string): string => {
  // Get the country code from the list
  const countryCode = countryCodeList[country] ?? countryCodeList[countryMapList[country]] ?? country;

  // Flag codes look like this: fi-us (for United States) or fi-uk (for United Kingdom)

  // If there is more than one then we will use both
  if (countryCode) {
    const codes = countryCode.split('|').map((code: string) => countryFlagIconMap[code] ?? code.toLowerCase());

    return codes.map((code) => `fi-${code.toLowerCase()}`).join(' ');
  }

  console.warn(`Country code not found for ${country}`);

  return 'fi-unknown';
};

/**
 * An array of country names with satellites.
 */
export const countryNameList = Object.keys(countryCodeList);

export const countryMapList = {
  'AAT': 'AAT',
  'ADG': 'Adygea',
  'AF': 'Afganistan',
  'AG': 'Antigua',
  'AGUK': 'Antigua',
  'AM': 'Armenia',
  'ANTN': 'Neth. Antilles',
  'AO': 'Angola',
  'AQ': 'Antarctica',
  'AR': 'Argentina',
  'ARV': 'Arg. Antarctic',
  'AT': 'Austria',
  'AU': 'Australia',
  'AZ': 'Azerbaijan',
  'B': 'Belgium',
  'BASH': 'Bashkiria',
  'BAT': 'BAT',
  'BB': 'Barbados',
  'BBUK': 'Barbados',
  'BD': 'Bangladesh',
  'BG': 'Bulgaria',
  'BGN': 'PR Bulgaria',
  'BM': 'Bermuda',
  'BO': 'Bolivia',
  'BR': 'Brazil',
  'BS': 'Bahamas',
  'BT': 'Bhutan',
  'BY': 'Belarus',
  'CA': 'Canada',
  'CD': 'DR Congo',
  'CH': 'Switzerland',
  'CI': 'Ivory Coast',
  'CK': 'Cook Islands',
  'CL': 'Chile',
  'CM': 'Cameroon',
  'CN': 'China',
  'CO': 'Colombia',
  'COLP': 'Congo',
  'CR': 'Costa Rica',
  'CSFR': 'Czechoslovakia',
  'CSSR': 'Czechoslovakia',
  'CU': 'Cuba',
  'CYM': 'Cayman Is.',
  'CYMRU': 'Wales',
  'CZ': 'Czech Republic',
  'D': 'Germany',
  'DAG': 'Dagestan',
  'DD': 'East Germany',
  'DK': 'Denmark',
  'DML': 'Queen Maud Land',
  'DR': 'Germany (Reich)',
  'DX': 'Germany (occ.)',
  'DZ': 'Algeria',
  'E': 'Spain',
  'EC': 'Ecuador',
  'EE': 'Estonia',
  'EG': 'Egypt',
  'ENG': 'England',
  'ESCN': 'Canary Is',
  'ET': 'Ethiopia',
  'F': 'France',
  'FI': 'Finland',
  'GE': 'Georgia',
  'GH': 'Ghana',
  'GI': 'Gibraltar',
  'GL': 'Greenland',
  'GR': 'Greece',
  'GRD': 'Grenada',
  'GT': 'Guatemala',
  'GU': 'Guam',
  'GUF': 'French Guiana',
  'HK': 'China(Hong Kong)',
  'HKUK': 'Hong Kong',
  'HU': 'Hungary',
  'I': 'Italy',
  'I-ARAB': 'Arabsat',
  'I-CSC1': 'COSPAS-SARSAT',
  'I-ELDO': 'European Launcher Development Organization',
  'I-ESRO': 'European Space Research Organization',
  'I-EUM': 'EUMETSAT',
  'I-EU': 'EU',
  'I-EUT': 'EUTELSAT',
  'I-INM': 'INMARSAT',
  'I-INT': 'INTELSAT',
  'I-ISS': 'ISS',
  'I-NATO': 'North Atlantic Treaty Organization',
  'I-RASC': 'RASCOM',
  'ID': 'Indonesia',
  'IE': 'Ireland',
  'IL': 'Israel',
  'IN': 'India',
  'IQ': 'Iraq',
  'IR': 'Iran',
  'IS': 'Iceland',
  'J': 'Japan',
  'JO': 'Jordan',
  'KE': 'Kenya',
  'KI': 'Kiribati',
  'KG': 'Kyrgyzstan',
  'KGSR': 'Kyrgyz SSR',
  'KH': 'Cambodia',
  'KORS': 'Neth. Antilles',
  'KORSA': 'Neth. Antilles',
  'KP': 'North Korea',
  'KR': 'South Korea',
  'KW': 'Kuwait',
  'KZ': 'Kazakhstan',
  'L': 'Luxembourg',
  'LA': 'Laos',
  'LB': 'Lebanon',
  'LK': 'Sri Lanka',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'LY': 'Libya',
  'MA': 'Morocco',
  'MC': 'Monaco',
  'MD': 'Moldova',
  'MH': 'Marshall Is.',
  'MN': 'Mongolia',
  'MR': 'Mauritania',
  'MU': 'Mauritius',
  'MV': 'Maldives',
  'MX': 'Mexico',
  'MY': 'Malaysia',
  'MYM': 'Myanmar',
  'N': 'Norway',
  'NG': 'Nigeria',
  'NL': 'Netherlands',
  'NP': 'Nepal',
  'NZ': 'New Zealand',
  'NZRD': 'Ross Dep.',
  'P': 'Portugal',
  'PAR': 'Panama',
  'PCZ': 'Canal Zone',
  'PE': 'Peru',
  'PG': 'Papua New Guinea',
  'PK': 'Pakistan',
  'PH': 'Phillipines',
  'PL': 'Poland',
  'PLRL': 'Poland',
  'PR': 'Puerto Rico',
  'PT': 'Portugal',
  'PY': 'Paraguay',
  'QA': 'Qatar',
  'RO': 'Romania',
  'RU': 'Russia',
  'RW': 'Rwanda',
  'S': 'Sweden',
  'SA': 'Saudi Arabia',
  'SCOT': 'Scotland',
  'SD': 'Sudan',
  'SG': 'Singapore',
  'SH': 'St Helena',
  'SI': 'Slovenia',
  'SK': 'Slovakia',
  'SR': 'Suriname',
  'SU': 'USSR',
  'SY': 'Syria',
  'T': 'Thailand',
  'TC': 'Turks and Caicos',
  'TF': 'French SAL',
  'TJ': 'Tajikistan',
  'TM': 'Turkmenistan',
  'TN': 'Tunisia',
  'TO': 'Tonga',
  'TR': 'Turkey',
  'TTPI': 'TTPI',
  'TUVA': 'Tuva',
  'TW': 'Taiwan',
  'UA': 'Ukraine',
  'UAE': 'United Arab Emirates',
  'UK': 'United Kingdom',
  'UM': 'Wake I.',
  'US': 'United States',
  'UY': 'Uruguay',
  'UZ': 'Uzbekistan',
  'VE': 'Venezuela',
  'VN': 'Vietnam',
  'YE': 'Yemen',
  'ZA': 'South Africa',
  'ZR': 'Zaire',
  'ANALSAT': 'Analyst Satellite',
  'SAUD': 'Saudi Arabia',
  'AB': 'Saudi Arabia',
  'AC': 'AsiaSat Corp',
  'ALG': 'Algeria',
  'ALL': 'All',
  'ARGN': 'Argentina',
  'ASRA': 'Austria',
  'AUS': 'Australia',
  'AZER': 'Azerbaijan',
  'BEL': 'Belgium',
  'BELA': 'Belarus',
  'BERM': 'Bermuda',
  'BOL': 'Bolivia',
  'BRAZ': 'Brazil',
  'CHBZ': 'China/Brazil',
  'CHLE': 'Chile',
  'CIS': 'USSR/Russia',
  'COL': 'Colombia',
  'CZCH': 'Czechoslovakia',
  'DEN': 'Denmark',
  'ECU': 'Ecuador',
  'EGYP': 'Egypt',
  'ESA': 'European Space Agency',
  'I-ESA': 'European Space Agency',
  'EST': 'Estonia',
  'EUME': 'EUMETSAT',
  'EUTE': 'EUTELSAT',
  'FIN': 'Finland',
  'FGER': 'France/Germany',
  'FR': 'France',
  'FRIT': 'France/Italy',
  'GER': 'Germany',
  'GLOB': 'United States',
  'GREC': 'Greece',
  'HUN': 'Hungary',
  'IM': 'United Kingdom',
  'IND': 'India',
  'INDO': 'Indonesia',
  'IRAN': 'Iran',
  'IRAQ': 'Iraq',
  'ISRA': 'Israel',
  'ISS': 'International',
  'IT': 'Italy',
  'ITSO': 'Luxembourg',
  'JPN': 'Japan',
  'KAZ': 'Kazakhstan',
  'LAOS': 'Laos',
  'LTU': 'Lithuania',
  'LUXE': 'Luxembourg',
  'MALA': 'Malaysia',
  'MEX': 'Mexico',
  'NATO': 'North Atlantic Treaty Org',
  'NETH': 'Netherlands',
  'NICO': 'United States',
  'NIG': 'Nigeria',
  'NKOR': 'North Korea',
  'NOR': 'Norway',
  'O3B': 'Luxembourg',
  'ORB': 'United States',
  'PAKI': 'Pakistan',
  'PERU': 'Peru',
  'POL': 'Poland',
  'POR': 'Portugal',
  'PRC': 'China',
  'RASC': 'Mauritius',
  'ROC': 'Taiwan',
  'Taiwan': 'Taiwan',
  'ROM': 'Romania',
  'SAFR': 'South Africa',
  'SEAL': 'Russia',
  'RP': 'Philippines',
  'SES': 'Luxembourg',
  'SING': 'Singapore',
  'SKOR': 'South Korea',
  'SPN': 'Spain',
  'STCT': 'Singapore/Taiwan',
  'SWED': 'Sweden',
  'SWTZ': 'Switzerland',
  'THAI': 'Thailand',
  'TMMC': 'Turkmenistan/Monaco',
  'TURK': 'Turkey',
  'UKR': 'Ukraine',
  'URY': 'Uruguay',
  'USA': 'United States',
  'USBZ': 'United States/Brazil',
  'VENZ': 'Venezuela',
  'VTNM': 'Vietnam',
  'TBD': 'Unknown',
};

export const launchSiteMap = {
  ANALSAT: {
    site: 'Analyst Satellite',
    sitec: 'Analyst Satellite',
  },
  AFETR: {
    site: 'Cape Canaveral SFS',
    sitec: 'United States',
  },
  AFWTR: {
    site: 'Vandenberg SFB',
    sitec: 'United States',
  },
  CAS: {
    site: 'Canaries Airspace',
    sitec: 'United States',
  },
  FRGUI: {
    site: 'Kourou',
    sitec: 'French Guiana',
  },
  HGSTR: {
    site: 'Hammaguira STR',
    sitec: 'Algeria',
  },
  KSCUT: {
    site: 'Uchinoura SC',
    sitec: 'Japan',
  },
  KYMTR: {
    site: 'Kapustin Yar MSC',
    sitec: 'Russia',
  },
  PKMTR: {
    site: 'Plesetsk MSC',
    sitec: 'Russia',
  },
  WSC: {
    site: 'Wenchang SC',
    sitec: 'China',
  },
  SNMLP: {
    site: 'San Marco LP',
    sitec: 'Kenya',
  },
  SRI: {
    site: 'Satish Dhawan SC',
    sitec: 'India',
  },
  TNSTA: {
    site: 'Tanegashima SC',
    sitec: 'Japan',
  },
  TTMTR: {
    site: 'Baikonur Cosmodrome',
    sitec: 'Kazakhstan',
  },
  WLPIS: {
    site: 'Wallops Island',
    sitec: 'United States',
  },
  WOMRA: {
    site: 'Woomera',
    sitec: 'Australia',
  },
  VOSTO: {
    site: 'Vostochny Cosmodrome',
    sitec: 'Russia',
  },
  PMRF: {
    site: 'PMRF Barking Sands',
    sitec: 'United States',
  },
  SEAL: {
    site: 'Sea Launch Platform',
    sitec: 'Russia',
  },
  KWAJ: {
    site: 'Kwajalein Atoll',
    sitec: 'United States',
  },
  ERAS: {
    site: 'Eastern Range Airspace',
    sitec: 'United States',
  },
  JSC: {
    site: 'Jiuquan SC',
    sitec: 'China',
  },
  SVOB: {
    site: 'Svobodny LC',
    sitec: 'Russia',
  },
  TSC: {
    site: 'Taiyaun SC',
    sitec: 'China',
  },
  WRAS: {
    site: 'Western Range Airspace',
    sitec: 'United States',
  },
  XSC: {
    site: 'Xichang SC',
    sitec: 'China',
  },
  XICLF: {
    site: 'Xichang Launch Facility',
    sitec: 'China',
  },
  YAVNE: {
    site: 'Yavne Launch Facility',
    sitec: 'Israel',
  },
  OREN: {
    site: 'Orenburg',
    sitec: 'Russia',
  },
  SADOL: {
    site: 'Submarine Launch',
    sitec: 'Russia',
  },
  KODAK: {
    site: 'Kodiak LC',
    sitec: 'United States',
  },
  SEM: {
    site: 'Semnan',
    sitec: 'Iran',
  },
  YUN: {
    site: 'Yunsong LS',
    sitec: 'North Korea',
  },
  TNGH: {
    site: 'Tonghae SLG',
    sitec: 'North Korea',
  },
  NSC: {
    site: 'Naro SC',
    sitec: 'South Korea',
  },
  RLLC: {
    site: 'Rocket Labs LC',
    sitec: 'New Zealand',
  },
  AMH: {
    site: 'A\' Mhòine',
    sitec: 'Scotland',
  },
  ALC: {
    site: 'Alcântara LC',
    sitec: 'Brazil',
  },
  TYMSC: {
    site: 'Tyuratam MSC',
    sitec: 'Kazakhstan',
  },
  PLMSC: {
    site: 'Plesetsk MSC',
    sitec: 'Russia',
  },
  DLS: {
    site: 'Dombarovsky LS',
    sitec: 'Russia',
  },
  RLLB: {
    site: 'Rocket Lab Launch Base',
    sitec: 'New Zealand',
  },
  YSLA: {
    site: 'Yellow Sea Launch Area',
    sitec: 'China',
  },
  SMTS: {
    site: 'Shahrud Missile Test Site',
    sitec: 'Iran',
  },
  JJSLA: {
    site: 'Jeju Island Sea Launch Area',
    sitec: 'South Korea',
  },
  SCSLA: {
    site: 'South China Sea Launch Area',
    sitec: 'China',
  },
  SEMLS: {
    site: 'Semnan SLS',
    sitec: 'Iran',
  },
  SUBL: {
    site: 'Submarine LP',
    sitec: 'Russia',
  },
  KYMSC: {
    site: 'Kapustin Yar MSC',
    sitec: 'Russia',
  },
  SRILR: {
    site: 'Satish Dhawan SC',
    sitec: 'India',
  },
  SVOBO: {
    site: 'Svobodnyy LC',
    sitec: 'Russia',
  },
  TAISC: {
    site: 'Taiyuan SLC',
    sitec: 'China',
  },
  TANSC: {
    site: 'Tanegashima SC',
    sitec: 'Japan',
  },
};
