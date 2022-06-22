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
export { sat2ric } from './sat2ric';
