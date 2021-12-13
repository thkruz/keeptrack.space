declare module 'satellite.js' {
  /** Take ECF coordinate and a current GMST and converts it to ECI */
  export function ecfToEci({ x, y, z }: { x: number; y: number; z: number }, gmst: number): { x: number; y: number; z: number };
}

declare module 'ootk' {
  import { Eci, EciPos } from '@app/js/api/keepTrackTypes';
  import { SatRec } from 'satellite.js';
  interface Sgp4I {
    propagate: (satrec: SatRec, m: number) => Eci;
    gstime: (j: number) => any;
    createSatrec: (TLE1: string, TLE2: string) => any;
  }
  interface TransformsI {
    lla2ecf: (geodeticCoords: any) => any;
    ecf2eci: (ecf: { x: number; y: number; z: number }, gmst: number) => { x: number; y: number; z: number };
    eci2ecf: (position: any, gmst: any) => any;
    eci2lla: (position: EciPos, gmst: number) => { lat: number; lon: number; alt: number };
    getDegLat: (lat: number) => number;
    getDegLon: (lon: number) => number;
    ecf2rae: (observerGd: { lat: number; lon: number; alt: number }, positionEcf: any) => any;
  }
  export const Sgp4: Sgp4I;
  export const Transforms: TransformsI;
}
