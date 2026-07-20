import { DetailedSensor } from '@app/app/sensors/DetailedSensor';

export interface SensorList {
  [key: string]: DetailedSensor;
}

export enum Operators {
  USSF = 'USSF',
  USA = 'US ARMY',
  NASA = 'NASA',
  RAF = 'RAF',
  UKSA = 'UKSA',
  RAAF = 'RAAF',
  ESA = 'ESA',
  EUSPA = 'EUSPA',
  ROC = 'ROC',
  EISCAT = 'EISCAT',
  RUSSF = 'RUS SF', // Russian Space Forces
  MIT = 'MIT',
  NOR = 'NOR',
  PLA = 'PLA',
  CAS = 'CAS',
  LEOLABS = 'LEOLABS',
  CALTECH = 'CALTECH',
  COMMERCIAL = 'COMMERCIAL',
  ITAF = 'ITAF', // Italian Air Force
  OWLNET = 'OWL-Net',
}
