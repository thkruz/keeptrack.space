import { Transforms } from 'ootk';

// Base Api
export const lla2ecf = Transforms.lla2ecf;
export const ecf2eci = Transforms.ecf2eci;
export const eci2ecf = Transforms.eci2ecf;
export const eci2lla = Transforms.eci2lla;
export const getDegLat = Transforms.getDegLat;
export const getDegLon = Transforms.getDegLon;
export const ecf2rae = Transforms.ecf2rae;
// Expanded Api
export { eci2ll } from './eci2ll';
export { eci2rae } from './eci2rae';
export { lookAngles2ecf } from './lookAngles2Ecf';
export { sat2ric } from './sat2ric';
