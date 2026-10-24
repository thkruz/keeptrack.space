/**
 * Az/Range Heatmap Web Worker
 *
 * Propagates a pre-filtered satellite catalog across a requested time window,
 * checks each position against a configurable ±marginDeg elevation band at the observer, and
 * accumulates an azimuth × range satellite-seconds matrix.
 *
 * Every ~5 % of time steps a PARTIAL snapshot is posted so the UI can render a
 * live running average while the job is still in progress. The final RESULT
 * message carries average satellites present (satellite-seconds ÷ window seconds).
 *
 * ECI → ECEF → RAE follows the same transform chain as fovPredictionWorker.
 */

import { EcefVec3, ecefRad2rae, eci2ecef, Kilometers, MILLISECONDS_TO_DAYS, MINUTES_PER_DAY, Radians, Sgp4, TemeVec3 } from '@ootk/src/main';
import { jday } from '../engine/utils/transforms';
import { AzRangeMsgType, AzRangeOutMsgType, type AzRangeWorkerInMsg } from './az-range-heatmap-messages';
import { handleSgp4WasmBackendMsg, isSgp4WasmBackendMsg } from './shared/sgp4-wasm-backend-handler';

const DEG2RAD = Math.PI / 180;

/** Returns true if azDeg (0–360) falls within the sensor FOV arc [minAz, maxAz].
 *  Handles wrap-around: when minAz > maxAz the arc crosses 0° (e.g. 347°→227°). */
function azInFov(azDeg: number, minAz: number, maxAz: number): boolean {
  if (minAz <= maxAz) {
    return azDeg >= minAz && azDeg <= maxAz;
  }

  return azDeg >= minAz || azDeg <= maxAz;
}

interface SatRecord {
  satrec: ReturnType<typeof Sgp4.createSatrec>;
  sccNum: string;
}

let generation = 0;

/**
 * Converts a millisecond timestamp into its Julian date and GMST angle.
 * @param timeMs Epoch time in milliseconds.
 * @returns The Julian date (`j`) and Greenwich Mean Sidereal Time (`gmst`).
 */
function timeToJdayGmst(timeMs: number): { j: number; gmst: number } {
  const d = new Date(timeMs);
  const j = jday(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()) + d.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;

  return { j, gmst: Sgp4.gstime(j) };
}

/** Average satellites present: integrate left-endpoint counts over [start, end).
 * The last interval is clipped to the requested end; partials divide by elapsed
 * sampled time. Bin edges are lower-inclusive, upper-exclusive (max range included).
 */
function snapshotOccupancy(bins: number[][], elapsedSec: number): number[][] {
  return bins.map((row) => row.map((value) => (elapsedSec > 0 ? value / elapsedSec : 0)));
}

// Route unhandled promise rejections (e.g. from the async onmessage handler) to
// the same ERROR protocol so the main thread sees them instead of a silent opaque onerror.
globalThis.onunhandledrejection = (event: PromiseRejectionEvent) => {
  postMessage({
    typ: AzRangeOutMsgType.ERROR,
    runId: -1,
    message: event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Unknown worker error'),
  });
};

self.onmessage = async function onmessage(event: MessageEvent<AzRangeWorkerInMsg>) {
  const msg = event.data;

  if (isSgp4WasmBackendMsg(msg)) {
    handleSgp4WasmBackendMsg(msg);

    return;
  }

  if (msg.typ === AzRangeMsgType.CANCEL) {
    generation++;

    return;
  }

  if (msg.typ !== AzRangeMsgType.START) {
    return;
  }

  const runGeneration = ++generation;

  try {
    const {
      runId,
      tleData,
      sensorLat,
      sensorLon,
      sensorAlt,
      sensorMaxRng,
      startTimeMs,
      durationSec,
      stepSec,
      elevationDeg,
      marginDeg,
      numAzBins,
      numRngBins,
      fovMinAz,
      fovMaxAz,
      fovMinAz2,
      fovMaxAz2,
    } = msg;
    // Pre-initialise SGP4 records once; reuse for all time steps.
    const satRecords: SatRecord[] = [];

    for (const entry of tleData) {
      try {
        satRecords.push({ satrec: Sgp4.createSatrec(entry.tle1, entry.tle2), sccNum: entry.sccNum });
      } catch {
        // Bad TLE — skip this satellite entirely.
      }
    }

    const obsLlaRad = {
      lat: (sensorLat * DEG2RAD) as Radians,
      lon: (sensorLon * DEG2RAD) as Radians,
      alt: sensorAlt as Kilometers,
    };

    if (!Number.isFinite(durationSec) || !Number.isFinite(stepSec) || durationSec <= 0 || stepSec <= 0) {
      throw new Error('Duration and step must be finite and positive');
    }
    const numSteps = Math.ceil(durationSec / stepSec);
    const stepMs = stepSec * 1000;

    // Cumulative satellite-seconds; never normalized in place.
    const bins: number[][] = Array.from({ length: numAzBins }, () => new Array(numRngBins).fill(0));
    // Per-bin sets of catalog numbers — populated on every hit, flushed to RESULT only.
    const binSatSets: Set<string>[][] = Array.from({ length: numAzBins }, () => Array.from({ length: numRngBins }, () => new Set<string>()));

    // Emit a PARTIAL every ~5 % of steps (minimum every 10 steps to avoid
    // flooding the main thread on very short jobs).
    const partialInterval = Math.max(10, Math.floor(numSteps / 20));

    for (let step = 0; step < numSteps; step++) {
      if (generation !== runGeneration) {
        return;
      }

      const intervalSec = Math.min(stepSec, durationSec - step * stepSec);
      const timeMs = startTimeMs + step * stepMs;
      const { j, gmst } = timeToJdayGmst(timeMs);

      for (const { satrec, sccNum } of satRecords) {
        const m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
        let pv: { position: TemeVec3 | false };

        try {
          pv = Sgp4.propagate(satrec, m) as { position: TemeVec3 | false };

          if (!pv.position || Number.isNaN((pv.position as TemeVec3).x)) {
            continue;
          }
        } catch {
          continue;
        }

        const ecef = eci2ecef(pv.position as TemeVec3, gmst) as EcefVec3<Kilometers>;
        const rae = ecefRad2rae(obsLlaRad, ecef);

        if (Math.abs(rae.el - elevationDeg) > marginDeg) {
          continue;
        }

        if (rae.rng > sensorMaxRng) {
          continue;
        }

        const inFov = azInFov(rae.az, fovMinAz, fovMaxAz) || (fovMinAz2 !== undefined && fovMaxAz2 !== undefined && azInFov(rae.az, fovMinAz2, fovMaxAz2));

        if (!inFov) {
          continue;
        }

        if (![rae.az, rae.el, rae.rng].every(Number.isFinite) || rae.rng < 0) {
          continue;
        }
        const az = ((rae.az % 360) + 360) % 360;
        const azBin = Math.min(numAzBins - 1, Math.floor((az / 360) * numAzBins));
        const rngBin = Math.min(numRngBins - 1, Math.floor((rae.rng / sensorMaxRng) * numRngBins));
        bins[azBin][rngBin] += intervalSec;
        binSatSets[azBin][rngBin].add(sccNum);
      }

      const stepsProcessed = step + 1;

      if (stepsProcessed % partialInterval === 0 || step === numSteps - 1) {
        postMessage({
          typ: AzRangeOutMsgType.PARTIAL,
          runId,
          bins: snapshotOccupancy(bins, Math.min(stepsProcessed * stepSec, durationSec)),
          numAzBins,
          numRngBins,
          maxRng: sensorMaxRng,
          stepsProcessed,
          stepsTotal: numSteps,
        });
        // Yield so CANCEL messages can be received between snapshots.
        // biome-ignore lint/performance/noAwaitInLoops: sequential await is the yield that lets queued CANCEL messages run between snapshots
        await new Promise<void>((r) => setTimeout(r, 0));
      }
    }

    if (generation !== runGeneration) {
      return;
    }

    // RESULT normalizes a fresh snapshot over the complete requested window.
    postMessage({
      typ: AzRangeOutMsgType.RESULT,
      runId,
      bins: snapshotOccupancy(bins, durationSec),
      numAzBins,
      numRngBins,
      maxRng: sensorMaxRng,
      binSatNums: binSatSets.map((row) => row.map((s) => [...s])),
    });
  } catch (err) {
    postMessage({
      typ: AzRangeOutMsgType.ERROR,
      runId: msg.runId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

// Signal ready — matches the convention of all other KeepTrack workers so the
// thread manager can set isReady_ and the main thread knows the script loaded.
postMessage('ready');
