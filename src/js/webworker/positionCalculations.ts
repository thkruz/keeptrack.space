import * as satellite from 'satellite.js';
import { SensorObjectCruncher } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { DEG2RAD, PI, RAD2DEG } from '../lib/constants';
import { A } from '../lib/external/meuusjs';
import { defaultGd } from './positionCruncher';

// TODO: create a way to determine if observerGd is using old satellite.js naming or lon,lat,alt
// so that we can import satMath.ts instead

export const lookAnglesToEcf = (azDeg: number, elDeg: number, rng: number, obsLat: number, obsLong: number, obsAlt: number) => {
  // site ecef in meters
  const geodeticCoords = {
    latitude: obsLat,
    longitude: obsLong,
    height: obsAlt,
  };

  const ecf = satellite.geodeticToEcf(geodeticCoords);

  // some needed calculations
  const slat = Math.sin(obsLat);
  const slon = Math.sin(obsLong);
  const clat = Math.cos(obsLat);
  const clon = Math.cos(obsLong);

  const azRad = DEG2RAD * azDeg;
  const elRad = DEG2RAD * elDeg;

  // az,el,range to sez convertion
  const south = -rng * Math.cos(elRad) * Math.cos(azRad);
  const east = rng * Math.cos(elRad) * Math.sin(azRad);
  const zenith = rng * Math.sin(elRad);

  const x = slat * clon * south + -slon * east + clat * clon * zenith + ecf.x;
  const y = slat * slon * south + clon * east + clat * slon * zenith + ecf.y;
  const z = -clat * south + slat * zenith + ecf.z;

  return { x, y, z };
};

/* Returns Current Propagation Time */
export const propTime = (dynamicOffsetEpoch: number, staticOffset: number, propRate: number) => {
  const now = new Date();
  const dynamicPropOffset = now.getTime() - dynamicOffsetEpoch;
  now.setTime(dynamicOffsetEpoch + staticOffset + dynamicPropOffset * propRate);
  return now;
};

export const checkSunExclusion = (sensor: SensorObjectCruncher, j: number, gmst: number, now: Date): [isSunExclusion: boolean, sunECI: { x: number; y: number; z: number }] => {
  var jdo = new A.JulianDay(j); // now
  var coord = A.EclCoordfromWgs84(0, 0, 0);
  var coord2 = A.EclCoordfromWgs84(sensor.observerGd.latitude * RAD2DEG, sensor.observerGd.longitude * RAD2DEG, sensor.observerGd.height);

  // AZ / EL Calculation
  var tp = <{ hz: { az: number; alt: number } }>(<unknown>A.Solar.topocentricPosition(jdo, coord, false));
  var tpRel = A.Solar.topocentricPosition(jdo, coord2, false);
  const sunAz = tp.hz.az * RAD2DEG + (180 % 360);
  const sunEl = (tp.hz.alt * RAD2DEG) % 360;
  const sunElRel = (tpRel.hz.alt * RAD2DEG) % 360;

  // Range Calculation
  var T = new A.JulianDay(A.JulianDay.dateToJD(now)).jdJ2000Century();
  let sunG = (A.Solar.meanAnomaly(T) * 180) / PI;
  sunG = sunG % 360.0;
  const sunR = 1.00014 - 0.01671 * Math.cos(sunG) - 0.00014 * Math.cos(2 * sunG);
  const sunRange = (sunR * 149597870700) / 1000; // au to km conversion

  // RAE to ECI
  const sunECI = satellite.ecfToEci(lookAnglesToEcf(sunAz, sunEl, sunRange, 0, 0, 0), gmst);
  return sensor.observerGd !== defaultGd && (sensor.type === SpaceObjectType.OPTICAL || sensor.type === SpaceObjectType.OBSERVER) && sunElRel > -6
    ? [true, sunECI]
    : [false, sunECI];
};
