import * as satellite from 'satellite.js'; // NOSONAR
import { SensorObjectCruncher } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import { DEG2RAD, MILLISECONDS_PER_DAY, PI, RAD2DEG } from '../../lib/constants';
import { A } from '../../lib/external/meuusjs';
import { jday } from '../../timeManager/transforms';
import { defaultGd, oneOrZero, RangeAzEl } from '../constants';

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
  const jdo = new A.JulianDay(j); // now
  const coord = A.EclCoordfromWgs84(0, 0, 0);
  const coord2 = A.EclCoordfromWgs84(sensor.observerGd.latitude * RAD2DEG, sensor.observerGd.longitude * RAD2DEG, sensor.observerGd.height);

  // AZ / EL Calculation
  const tp = <{ hz: { az: number; alt: number } }>(<unknown>A.Solar.topocentricPosition(jdo, coord, false));
  const tpRel = A.Solar.topocentricPosition(jdo, coord2, false);
  const sunAz = tp.hz.az * RAD2DEG + (180 % 360);
  const sunEl = (tp.hz.alt * RAD2DEG) % 360;
  const sunElRel = (tpRel.hz.alt * RAD2DEG) % 360;

  // Range Calculation
  const T = new A.JulianDay(A.JulianDay.dateToJD(now)).jdJ2000Century();
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

export const isInFov = (lookangles: RangeAzEl, sensor: SensorObjectCruncher): oneOrZero => {
  const azimuth = lookangles.azimuth * RAD2DEG;
  const elevation = lookangles.elevation * RAD2DEG;
  const rangeSat = lookangles.rangeSat;
  if (sensor.obsminaz > sensor.obsmaxaz) {
    if (
      ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) &&
        elevation >= sensor.obsminel &&
        elevation <= sensor.obsmaxel &&
        rangeSat <= sensor.obsmaxrange &&
        rangeSat >= sensor.obsminrange) ||
      ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) &&
        elevation >= sensor.obsminel2 &&
        elevation <= sensor.obsmaxel2 &&
        rangeSat <= sensor.obsmaxrange2 &&
        rangeSat >= sensor.obsminrange2)
    ) {
      return 1;
    }
  } else {
    if (
      (azimuth >= sensor.obsminaz &&
        azimuth <= sensor.obsmaxaz &&
        elevation >= sensor.obsminel &&
        elevation <= sensor.obsmaxel &&
        rangeSat <= sensor.obsmaxrange &&
        rangeSat >= sensor.obsminrange) ||
      (azimuth >= sensor.obsminaz2 &&
        azimuth <= sensor.obsmaxaz2 &&
        elevation >= sensor.obsminel2 &&
        elevation <= sensor.obsmaxel2 &&
        rangeSat <= sensor.obsmaxrange2 &&
        rangeSat >= sensor.obsminrange2)
    ) {
      return 1;
    }
  }
  return 0;
};

export const setupTimeVariables = (dynamicOffsetEpoch, staticOffset, propRate, isSunlightView, isMultiSensor, sensor: SensorObjectCruncher) => {
  const now = propTime(dynamicOffsetEpoch, staticOffset, propRate);

  const j =
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ) +
    now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

  const gmst = satellite.gstime(j);

  let isSunExclusion = false;
  let sunEci = { x: 0, y: 0, z: 0 };
  if (isSunlightView && !isMultiSensor) {
    [isSunExclusion, sunEci] = checkSunExclusion(sensor, j, gmst, now);
  }

  const j2 =
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds() + 1
    ) +
    now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

  const gmstNext = satellite.gstime(j2);

  return {
    now,
    j,
    gmst,
    gmstNext,
    isSunExclusion,
    sunEci,
  };
};

export const createLatLonHei = (lat: number, lon: number, hei: number) => ({
  longitude: lon,
  latitude: lat,
  height: hei,
});

export const isInValidElevation = (lookangles: RangeAzEl, selectedSatFOV: number) => lookangles.elevation * RAD2DEG > 0 && 90 - lookangles.elevation * RAD2DEG < selectedSatFOV;

export const isSensorDeepSpace = (mSensor: SensorObjectCruncher[], sensor: SensorObjectCruncher): boolean => {
  // TODO: This should use the sensors max range instead of sensor type
  if (mSensor.length > 1 && sensor.type === SpaceObjectType.OPTICAL) return true;
  if (mSensor.length > 1 && sensor.type === SpaceObjectType.OBSERVER) return true;
  if (mSensor.length > 1 && sensor.type === SpaceObjectType.MECHANICAL) return true;
  return false;
};
