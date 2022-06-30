import { DEG2RAD } from '@app/js/lib/constants';
import { Transforms } from 'ootk';

export const lookAngles2ecf = (az: number, el: number, rng: number, lat: number, lon: number, alt: number): { x: number; y: number; z: number } => {
  // site ecef in meters
  const geodeticCoords: any = {
    lat: lat,
    lon: lon,
    alt: alt,
  };

  const site = Transforms.lla2ecf(geodeticCoords);
  const sitex = site.x;
  const sitey = site.y;
  const sitez = site.z;

  // some needed calculations
  const slat = Math.sin(lat);
  const slon = Math.sin(lon);
  const clat = Math.cos(lat);
  const clon = Math.cos(lon);

  az *= DEG2RAD;
  el *= DEG2RAD;

  // az,el,rng to sez convertion
  const south = -rng * Math.cos(el) * Math.cos(az);
  const east = rng * Math.cos(el) * Math.sin(az);
  const zenith = rng * Math.sin(el);

  const x = slat * clon * south + -slon * east + clat * clon * zenith + sitex;
  const y = slat * slon * south + clon * east + clat * slon * zenith + sitey;
  const z = -clat * south + slat * zenith + sitez;

  return { x: x, y: y, z: z };
};
