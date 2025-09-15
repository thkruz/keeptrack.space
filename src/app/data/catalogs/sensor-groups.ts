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
}

export const fetchSensorGroups = async (): Promise<SensorGroup[]> => {
  let sensorGroupsApi = await fetch('https://api.keeptrack.space/v1/sensor-groups').then((response) => response.json());

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
