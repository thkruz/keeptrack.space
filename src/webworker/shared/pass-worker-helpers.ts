/**
 * Shared worker-side look-angle and field-of-regard helpers for pass-finding
 * workers (best-pass, tip-and-cue). These faithfully mirror SatMath.getRae and
 * SatMath.checkIsInView but run with no DOM/ServiceLocator dependencies so they
 * can execute inside a Web Worker.
 */

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { PassRae } from '@app/plugins/best-pass/best-pass-calculator';
import {
  Degrees,
  eci2ecef,
  ecefRad2rae,
  Kilometers,
  MILLISECONDS_TO_DAYS,
  MINUTES_PER_DAY,
  RaeVec3,
  SatelliteRecord,
  Sgp4,
  TemeVec3,
} from '@ootk/src/main';
import { jday } from '../../engine/utils/transforms';

/**
 * Look angle of a satellite from a sensor. Mirrors SatMath.getRae:
 * propagate -> ECI -> ECEF -> RAE relative to the sensor's geodetic position.
 */
export function workerGetRae(now: Date, satrec: SatelliteRecord, sensor: DetailedSensor): PassRae {
  const j =
    jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()) +
    now.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;
  const gmst = Sgp4.gstime(j);
  const m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;

  let positionEci: TemeVec3 | undefined;

  try {
    positionEci = Sgp4.propagate(satrec, m).position as TemeVec3;
  } catch {
    return { az: null, el: null, rng: null };
  }

  if (!positionEci) {
    return { az: null, el: null, rng: null };
  }

  const positionEcf = eci2ecef(positionEci, gmst);
  const rae = ecefRad2rae(sensor.llaRad(), positionEcf) as RaeVec3<Kilometers, Degrees>;

  return { az: rae.az, el: rae.el, rng: rae.rng };
}

/** Field-of-regard test. Mirrors SatMath.checkIsInView, including the wrap-around azimuth case. */
export function workerCheckIsInView(sensor: DetailedSensor, rae: PassRae): boolean {
  const { az, el, rng } = rae;

  if (az === null || el === null || rng === null) {
    return false;
  }

  const inPrimary =
    az >= sensor.minAz && az <= sensor.maxAz && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng;
  const inSecondary =
    az >= (sensor.minAz2 as number) && az <= (sensor.maxAz2 as number) && el >= (sensor.minEl2 as number) &&
    el <= (sensor.maxEl2 as number) && rng <= (sensor.maxRng2 as number) && rng >= (sensor.minRng2 as number);

  if (sensor.minAz > sensor.maxAz) {
    const inPrimaryWrap =
      (az >= sensor.minAz || az <= sensor.maxAz) && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng;
    const inSecondaryWrap =
      (az >= (sensor.minAz2 as number) || az <= (sensor.maxAz2 as number)) && el >= (sensor.minEl2 as number) &&
      el <= (sensor.maxEl2 as number) && rng <= (sensor.maxRng2 as number) && rng >= (sensor.minRng2 as number);

    return inPrimaryWrap || inSecondaryWrap;
  }

  return inPrimary || inSecondary;
}
