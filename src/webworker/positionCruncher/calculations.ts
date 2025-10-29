import {
  Degrees, GreenwichMeanSiderealTime, Kilometers, LlaVec3, MILLISECONDS_TO_DAYS, PI, RAD2DEG, Radians, RaeVec3, Sensor, Sgp4, SpaceObjectType, rae2eci,
} from '@ootk/src/main';
import { SensorObjectCruncher } from '../../engine/core/interfaces';
import { A } from '../../engine/utils/external/meuusjs';
import { jday } from '../../engine/utils/transforms';
import { oneOrZero } from '../constants';

/* Returns Current Propagation Time */
export const propTime = (dynamicOffsetEpoch: number, staticOffset: number, propRate: number) => {
  const now = new Date();
  const dynamicPropOffset = now.getTime() - dynamicOffsetEpoch;

  now.setTime(dynamicOffsetEpoch + staticOffset + dynamicPropOffset * propRate);

  return now;
};

export const checkSunExclusion = (
  sensor: Sensor,
  j: number,
  gmst: GreenwichMeanSiderealTime,
  now: Date,
): [isSunExclusion: boolean, sunECI: { x: number; y: number; z: number }] => {
  const jdo = new A.JulianDay(j); // now
  // eslint-disable-next-line new-cap
  const coord = A.EclCoordfromWgs84(0, 0, 0);
  // eslint-disable-next-line new-cap
  const coord2 = A.EclCoordfromWgs84(sensor.lat, sensor.lon, sensor.alt);

  // AZ / EL Calculation
  const tp = <{ hz: { az: number; alt: number } }>(<unknown>A.Solar.topocentricPosition(jdo, coord, false));
  const tpRel = A.Solar.topocentricPosition(jdo, coord2, false);
  const sunAz = <Degrees>(tp.hz.az * RAD2DEG + (180 % 360));
  const sunEl = <Degrees>((tp.hz.alt * RAD2DEG) % 360);
  const sunElRel = (tpRel.hz.alt * RAD2DEG) % 360;

  // Range Calculation
  const T = new A.JulianDay(A.JulianDay.dateToJD(now)).jdJ2000Century();
  let sunG = (A.Solar.meanAnomaly(T) * 180) / PI;

  sunG %= 360.0;
  const sunR = 1.00014 - 0.01671 * Math.cos(sunG) - 0.00014 * Math.cos(2 * sunG);
  const sunRange = <Kilometers>((sunR * 149597870700) / 1000); // au to km conversion

  // RAE to ECI
  const sunECI = rae2eci({ az: sunAz, el: sunEl, rng: sunRange }, { lat: <Degrees>0, lon: <Degrees>0, alt: <Kilometers>0 }, gmst);


  return sensor && (sensor.type === SpaceObjectType.OPTICAL || sensor.type === SpaceObjectType.OBSERVER) && sunElRel > -6 ? [true, sunECI] : [false, sunECI];
};

export const isInFov = (sensor: SensorObjectCruncher, lookangles?: RaeVec3): oneOrZero => {
  if (!lookangles) {
    return 0;
  }

  const { az, el, rng } = lookangles;

  sensor.minAz2 ??= Infinity as Degrees;
  sensor.maxAz2 ??= -Infinity as Degrees;
  sensor.minEl2 ??= Infinity as Degrees;
  sensor.maxEl2 ??= -Infinity as Degrees;
  sensor.minRng2 ??= Infinity as Kilometers;
  sensor.maxRng2 ??= -Infinity as Kilometers;

  if (sensor.minAz > sensor.maxAz) {
    if (
      ((az >= sensor.minAz || az <= sensor.maxAz) && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng) ||
      ((az >= (sensor.minAz2) || az <= sensor.maxAz2) && el >= sensor.minEl2 && el <= sensor.maxEl2 && rng <= sensor.maxRng2 && rng >= sensor.minRng2)
    ) {
      return 1;
    }
  } else if (
    (az >= sensor.minAz && az <= sensor.maxAz && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng) ||
    (az >= sensor.minAz2 && az <= sensor.maxAz2 && el >= sensor.minEl2 && el <= sensor.maxEl2 && rng <= sensor.maxRng2 && rng >= sensor.minRng2)
  ) {
    return 1;
  }

  return 0;
};

export const setupTimeVariables = (dynamicOffsetEpoch: number, staticOffset: number, propRate: number, isSunlightView: boolean, sensors: Sensor[] | null) => {
  const now = propTime(dynamicOffsetEpoch, staticOffset, propRate);

  const j =
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
    ) +
    now.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;

  const gmst = Sgp4.gstime(j);

  let isSunExclusion = false;
  let sunEci = { x: 0, y: 0, z: 0 };

  if (isSunlightView && sensors?.length === 1) {
    // TODO: Sun exclusion should be calculated for each sensor
    [isSunExclusion, sunEci] = checkSunExclusion(sensors[0], j, gmst, now);
  }

  const j2 =
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds() + 1,
    ) +
    now.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;

  const gmstNext = Sgp4.gstime(j2);

  return {
    now,
    j,
    gmst,
    gmstNext,
    isSunExclusion,
    sunEci,
  };
};

export const createLatLonAltRad = (lat: Radians, lon: Radians, alt: Kilometers) => ({
  lon,
  lat,
  alt,
});

export const createLatLonAlt = (lat: Radians, lon: Radians, alt: Kilometers): LlaVec3<Degrees, Kilometers> => ({
  lon: (lon * RAD2DEG) as Degrees,
  lat: (lat * RAD2DEG) as Degrees,
  alt,
});

export const isInValidElevation = (rae: RaeVec3<Kilometers, Degrees>, selectedSatFOV: number) => rae.el > 90 - selectedSatFOV;
