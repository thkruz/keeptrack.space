import { apiFetch } from '@app/app/data/api-fetch';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';

export interface SensorGroup {
  name: string;
  header: string;
  topLink: {
    name: string;
    badge: string;
  }
  list: string[];
  /**
   * Distinguishes surveillance sensors (radars/telescopes that detect
   * non-cooperative objects) from TT&C tracking networks (dishes that only
   * track cooperative spacecraft). Undefined is treated as 'surveillance'
   * for backwards compatibility with the sensor-groups API.
   */
  category?: 'surveillance' | 'ttc';
}

export const fetchSensorGroups = async (): Promise<SensorGroup[]> => {
  let sensorGroupsApi = await apiFetch('https://api.keeptrack.space/v1/sensor-groups').then((response) => response.json());

  if (sensorGroupsApi.length === 0) {
    errorManagerInstance.warn(t7e('errorMsgs.sensorGroupsApiEmpty'));
    sensorGroupsApi = sensorGroups;
  }

  return sensorGroupsApi;
};

/**
 * @deprecated Migrate to fetchSensorGroups
 */
export const sensorGroups: SensorGroup[] = [
  {
    name: 'ssn',
    header: 'Space Surveillance Network Sensors',
    topLink: {
      name: 'All Space Surveillance Network Sensors',
      badge: 'COALITION',
    },
    list: [
      'EGLAFB', 'KWAJSPF', 'GEODDSDGC', 'GEODDSMAU', 'GEODDSSOC',
      'KWAJALT', 'KWAJMMW', 'KWAJALC', 'KWAJTDX', 'MITMIL', 'RAFASC',
      'GLBII', 'HOLCBAND', 'HOLSST', 'HOLDARC',
    ],
  },
  {
    name: 'mw',
    header: 'US Missile Warning Sensors',
    topLink: {
      name: 'All Missile Warning Sensors',
      badge: 'NORAD',
    },
    list: ['BLEAFB', 'CODSFS', 'CAVSFS', 'CLRSFS', 'RAFFYL', 'PITSB'],
  },
  {
    name: 'md',
    header: 'US Missile Defense Agency Sensors',
    topLink: {
      name: 'All Missile Defense Sensors',
      badge: 'MDA',
    },
    list: ['LRDR', 'COBRADANE', 'HARTPY', 'QTRTPY', 'KURTPY', 'SHATPY', 'KCSTPY', 'SBXRDR'],
  },
  {
    name: 'OWL-Net',
    header: 'OWL-Net Sensors',
    topLink: {
      name: 'All OWL-Net Sensors',
      badge: 'OWL-Net',
    },
    list: ['OWLKorea', 'OWLMongolia', 'OWLMorocco', 'OWLIsrael', 'OWLUSA'],
  },
  {
    name: 'leolabs',
    header: 'LeoLabs Sensors',
    topLink: {
      name: 'All LeoLabs Sensors',
      badge: 'LEOLABS',
    },
    list: ['LEOCRSR', 'LEOAZORES', 'LEOKSR', 'LEOPFISR', 'LEOMSR'],
  },
  {
    name: 'esoc',
    header: 'European Space Operations Centre Sensors',
    topLink: {
      name: 'All ESOC Sensors',
      badge: 'ESA',
    },
    list: [
      'GRV', 'TIR', 'GES', 'NRC', 'PDM', 'TRO', 'SDT', 'ZimLAT',
      'ZimSMART', 'Tromso', 'Kiruna', 'Sodankyla', 'Svalbard',
    ],
  },
  {
    name: 'rus',
    header: 'Russian Sensors',
    topLink: {
      name: 'All Russian Sensors',
      badge: 'RUSSIA',
    },
    list: [
      'OLED', 'OLEV', 'PEC', 'MISD', 'MISV', 'LEKV', 'ARMV', 'KALV',
      'BARV', 'YENV', 'ORSV', 'STO', 'NAK',
    ],
  },
  {
    name: 'prc',
    header: 'Chinese Sensors',
    topLink: {
      name: 'All Chinese Sensors',
      badge: 'CHINA',
    },
    list: ['SHD', 'HEI', 'ZHE', 'XIN', 'PMO'],
  },
  {
    name: 'other',
    header: 'Other Sensors',
    topLink: {
      name: 'Other Sensors',
      badge: 'OTHER',
    },
    list: ['ROC', 'MLS', 'PO', 'LSO', 'MAY'],
  },
  {
    name: 'dsn',
    header: 'NASA Deep Space Network',
    topLink: {
      name: 'All Deep Space Network Complexes',
      badge: 'NASA',
    },
    list: ['DSNGDSCC', 'DSNMDSCC', 'DSNCDSCC'],
    category: 'ttc',
  },
  {
    name: 'scn',
    header: 'Satellite Control Network (AFSCN)',
    topLink: {
      name: 'All Remote Tracking Stations',
      badge: 'USSF',
    },
    list: ['SCNNBS', 'SCNVTS', 'SCNHTS', 'SCNGTS', 'SCNDGS', 'SCNTTS', 'SCNOTS', 'SCNCTS'],
    category: 'ttc',
  },
  {
    name: 'estrack',
    header: 'ESA Tracking Network (ESTRACK)',
    topLink: {
      name: 'All ESTRACK Stations',
      badge: 'ESA',
    },
    list: ['ESTKIR', 'ESTRED', 'ESTSMA', 'ESTKRU', 'ESTNNO', 'ESTCEB', 'ESTMLG'],
    category: 'ttc',
  },
  {
    name: 'galileo',
    header: 'Galileo Ground Segment',
    topLink: {
      name: 'All Galileo Ground Stations',
      badge: 'EUSPA',
    },
    list: ['GALKIR', 'GALKRU', 'GALNOU', 'GALPAP', 'GALREU', 'GALRED'],
    category: 'ttc',
  },
  /*
   * {
   *   name: 'us',
   *   title: 'United States',
   *   list: [
   *     'CODSFS', 'BLEAFB', 'CAVSFS', 'CLRSFS', 'EGLAFB', 'RAFFYL',
   *     'PITSB', 'MITMIL', 'KWAJALT', 'RAFASC', 'COBRADANE',
   *   ],
   * },
   */
];
