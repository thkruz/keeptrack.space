/**
 * Best Pass Web Worker
 *
 * Runs the pure best-pass calculator (src/plugins/best-pass/best-pass-calculator.ts)
 * off the main thread. The calculator takes all application state through injected
 * dependencies, so here we supply worker-side implementations of getRae,
 * checkIsInView, and the sun position - faithfully mirroring SatMath - and stream
 * one satellite's passes back at a time.
 */

/* eslint-disable no-await-in-loop, no-promise-executor-return */

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import {
  BestPassDeps,
  findPassesForSat,
  PassRae,
} from '@app/plugins/best-pass/best-pass-calculator';
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
import { jday } from '../engine/utils/transforms';
import {
  BpWorkerMsgType,
  BpWorkerOutMsgType,
  type BpWorkerInMsg,
} from './best-pass-messages';

let cancelledRunId = -1;

/**
 * Look angle of a satellite from a sensor. Mirrors SatMath.getRae:
 * propagate -> ECI -> ECEF -> RAE relative to the sensor's geodetic position.
 */
function workerGetRae(now: Date, satrec: SatelliteRecord, sensor: DetailedSensor): PassRae {
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
function workerCheckIsInView(sensor: DetailedSensor, rae: PassRae): boolean {
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

/** Handle incoming messages from the main thread. */
onmessage = async function onmessage(event: MessageEvent<BpWorkerInMsg>) {
  const msg = event.data;

  if (msg.typ === BpWorkerMsgType.CANCEL) {
    cancelledRunId = msg.runId;

    return;
  }

  if (msg.typ !== BpWorkerMsgType.START) {
    return;
  }

  const { runId } = msg;

  try {
    const sensors = msg.sensors
      .filter((s) => s)
      .map((s) => new DetailedSensor(s as ConstructorParameters<typeof DetailedSensor>[0]));

    const deps: BestPassDeps = {
      baseTimeMs: msg.baseTimeMs,
      getRae: workerGetRae,
      checkIsInView: workerCheckIsInView,
      sunEciKm: () => ({
        x: msg.sunEci.x as Kilometers,
        y: msg.sunEci.y as Kilometers,
        z: msg.sunEci.z as Kilometers,
      }),
    };
    const options = { lengthDays: msg.lengthDays, intervalSec: msg.intervalSec, maxResults: msg.maxResults };

    let truncated = false;
    const total = msg.sats.length;

    for (let i = 0; i < total; i++) {
      if (cancelledRunId === runId) {
        return;
      }

      const sat = msg.sats[i];
      const satPasses = [];

      try {
        const satrec = Sgp4.createSatrec(sat.tle1, sat.tle2);

        for (let s = 0; s < sensors.length; s++) {
          const result = findPassesForSat(sat.sccNum, satrec, sensors[s], options, deps, msg.sensorNames[s] ?? null);

          satPasses.push(...result.passes);
          truncated = truncated || result.truncated;
        }
      } catch {
        // Skip satellites that fail to propagate (bad TLE, decayed); keep going.
      }

      postMessage({ typ: BpWorkerOutMsgType.CHUNK, runId, passes: satPasses });
      postMessage({ typ: BpWorkerOutMsgType.PROGRESS, runId, processed: i + 1, total });

      // Yield so a CANCEL message can be received between satellites.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    if (cancelledRunId === runId) {
      return;
    }

    postMessage({ typ: BpWorkerOutMsgType.COMPLETE, runId, truncated });
  } catch (e) {
    postMessage({ typ: BpWorkerOutMsgType.ERROR, runId, message: e instanceof Error ? e.message : String(e) });
  }
};

// Signal ready
postMessage('ready');
