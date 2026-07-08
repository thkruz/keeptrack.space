/**
 * FOV Prediction Web Worker
 *
 * Computes "minutes to next FOV entry" for every satellite in the catalog
 * by propagating each forward in time and checking against sensor FOV bounds.
 *
 * Results are cached: only satellites whose cached exit time has expired
 * are recomputed on subsequent UPDATE_TIME messages.
 */

/* eslint-disable complexity */
/* eslint-disable no-unmodified-loop-condition, no-await-in-loop, no-promise-executor-return */

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import {
  Degrees,
  EcefVec3,
  Kilometers,
  MILLISECONDS_TO_DAYS,
  RaeVec3,
  Sgp4,
  TemeVec3,
  ecefRad2rae,
  eci2ecef,
} from '@ootk/src/main';
import { jday } from '../engine/utils/transforms';
import {
  FovPredMsgType,
  FovPredOutMsgType,
  type FovPredInMsg,
} from './fov-prediction-messages';
import { handleSgp4WasmBackendMsg, isSgp4WasmBackendMsg } from './shared/sgp4-wasm-backend-handler';

// ─── Worker State ────────────────────────────────────────────────────────────

interface SatRecord {
  satrec: ReturnType<typeof Sgp4.createSatrec>;
  active: boolean;
}

let satRecords: SatRecord[] = [];
let sensors: DetailedSensor[] = [];
let numObjects = 0;

/** Minutes until next FOV entry per satellite. Infinity = not in window. */
let minutesToEntry: Float32Array | null = null;
/** Absolute sim time (ms) when each satellite exits FOV. 0 = not cached / no pass. */
let exitTimesMs: Float64Array | null = null;

let maxLookaheadMin = 120;
let sweepStepMin = 1;
let cancelled = false;

/** Satellite indices to process first (e.g., watchlist). */
let priorityIndices: number[] = [];
let prioritySet: Set<number> = new Set();

/** 15-second steps for priority satellites to avoid missing short passes. */
const PRIORITY_STEP_MIN = 0.25;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a Date-like ms timestamp to julian day and GMST. */
function timeToJdayGmst(timeMs: number): { j: number; gmst: number } {
  const d = new Date(timeMs);
  const j =
    jday(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
    ) +
    d.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;

  const gmst = Sgp4.gstime(j);

  return { j, gmst };
}

/** Check if a satellite position (ECI) is in any sensor's FOV. */
function isInAnyFov(position: TemeVec3, gmst: number): boolean {
  let positionEcf: EcefVec3;
  let rae: RaeVec3<Kilometers, Degrees>;

  for (const sensor of sensors) {
    try {
      positionEcf = eci2ecef(position, gmst);
      rae = ecefRad2rae(sensor.llaRad(), positionEcf);
    } catch {
      continue;
    }

    // Skip optical sensors' dark-satellite check for simplicity in prediction
    // (we just want geometric FOV, not observability)
    if (sensor.isRaeInFov(rae.az, rae.el, rae.rng)) {
      return true;
    }
  }

  return false;
}

/**
 * Sweep a single satellite forward in time to find the next FOV entry and exit.
 * Returns [minutesToEntry, exitTimeMs].
 * If no entry found within the lookahead window, returns [Infinity, 0].
 */
function sweepSatellite(satIndex: number, simTimeMs: number, step?: number): [number, number] {
  const rec = satRecords[satIndex];

  if (!rec || !rec.active || !rec.satrec) {
    return [Infinity, 0];
  }

  const satrec = rec.satrec;
  const effectiveStep = step ?? sweepStepMin;
  let entryMin = Infinity;
  let exitMs = 0;
  let wasInFov = false;

  for (let stepMin = 0; stepMin <= maxLookaheadMin; stepMin += effectiveStep) {
    const targetMs = simTimeMs + stepMin * 60000;
    const { j, gmst } = timeToJdayGmst(targetMs);
    const m = (j - satrec.jdsatepoch) * 1440.0;

    let pv: { position: TemeVec3 };

    try {
      pv = Sgp4.propagate(satrec, m) as { position: TemeVec3 };
      if (Number.isNaN(pv.position.x) || Number.isNaN(pv.position.y) || Number.isNaN(pv.position.z)) {
        continue;
      }
    } catch {
      continue;
    }

    const inFov = isInAnyFov(pv.position, gmst);

    if (inFov && entryMin === Infinity) {
      // Found FOV entry
      entryMin = stepMin;
      wasInFov = true;
    } else if (!inFov && wasInFov) {
      // Found FOV exit — record exit time and stop
      exitMs = targetMs;
      break;
    } else if (inFov) {
      wasInFov = true;
    }
  }

  // If satellite entered FOV but never exited within the window
  if (wasInFov && exitMs === 0) {
    exitMs = simTimeMs + maxLookaheadMin * 60000;
  }

  return [entryMin, exitMs];
}

// ─── Priority Sweep ──────────────────────────────────────────────────────────

/** Process only priority (watchlist) satellites first with fine step, then emit partial results. */
function prioritySweep(simTimeMs: number): void {
  if (!minutesToEntry || !exitTimesMs || priorityIndices.length === 0) {
    return;
  }

  for (const idx of priorityIndices) {
    if (cancelled) {
      return;
    }
    if (idx < 0 || idx >= numObjects) {
      continue;
    }

    const [entry, exit] = sweepSatellite(idx, simTimeMs, PRIORITY_STEP_MIN);

    minutesToEntry[idx] = entry;
    exitTimesMs[idx] = exit;
  }

  if (cancelled) {
    return;
  }

  // Emit partial results immediately so watchlist satellites appear right away
  const result = new Float32Array(minutesToEntry);

  postMessage(
    {
      typ: FovPredOutMsgType.PRIORITY_SWEEP_COMPLETE,
      minutesToEntry: result,
    },
    { transfer: [result.buffer] },
  );
}

// ─── Full Sweep (batched with yields) ────────────────────────────────────────

const BATCH_SIZE = 200;
/**
 * Emit a partial sweep snapshot every N batches so the overlay fades in
 * progressively instead of staying blank until the whole catalog is swept.
 */
const PARTIAL_EMIT_BATCHES = 16;

/** Run a full sweep of all satellites, batched with yields for responsiveness. */
async function fullSweep(simTimeMs: number): Promise<void> {
  if (!minutesToEntry || !exitTimesMs) {
    return;
  }

  // Capture local references to avoid require-atomic-updates false positives
  const localMinutesToEntry = minutesToEntry;
  const localExitTimesMs = exitTimesMs;

  // Phase 1: Process priority satellites first with fine step
  prioritySweep(simTimeMs);

  // Phase 2: Process remaining satellites with coarser step
  const coarseStep = Math.max(sweepStepMin * 2, 2);
  let processed = 0;
  let batchesSinceEmit = 0;

  for (let start = 0; start < numObjects && !cancelled; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, numObjects);

    for (let i = start; i < end; i++) {
      // Skip priority satellites (already processed with fine step)
      if (prioritySet.has(i)) {
        continue;
      }

      // Skip inactive objects inline to avoid function call overhead
      const rec = satRecords[i];

      if (!rec || !rec.active || !rec.satrec) {
        continue;
      }

      const [entry, exit] = sweepSatellite(i, simTimeMs, coarseStep);

      localMinutesToEntry[i] = entry;
      localExitTimesMs[i] = exit;
    }

    processed = end;

    // Report progress
    postMessage({
      typ: FovPredOutMsgType.PROGRESS,
      progress: processed / numObjects,
    });

    // Periodically publish a partial snapshot so the overlay fills in as the
    // sweep runs. Skip the final batch — FULL_SWEEP_COMPLETE below covers it.
    batchesSinceEmit++;
    if (batchesSinceEmit >= PARTIAL_EMIT_BATCHES && end < numObjects) {
      batchesSinceEmit = 0;
      const partial = new Float32Array(localMinutesToEntry);

      postMessage(
        {
          typ: FovPredOutMsgType.INCREMENTAL_UPDATE,
          minutesToEntry: partial,
        },
        { transfer: [partial.buffer] },
      );
    }

    // Yield to allow message processing
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  if (cancelled) {
    return;
  }

  // Send final results (copy so we keep our working arrays)
  const result = new Float32Array(minutesToEntry);

  postMessage(
    {
      typ: FovPredOutMsgType.FULL_SWEEP_COMPLETE,
      minutesToEntry: result,
    },
    { transfer: [result.buffer] },
  );
}

// ─── Incremental Update ──────────────────────────────────────────────────────

/** Recompute only satellites whose cached exit time has expired. */
function incrementalUpdate(simTimeMs: number): void {
  if (!minutesToEntry || !exitTimesMs) {
    return;
  }

  let hasChanges = false;

  for (let i = 0; i < numObjects; i++) {
    // Recompute if the cached exit time has passed
    if (exitTimesMs[i] > 0 && simTimeMs >= exitTimesMs[i]) {
      const [entry, exit] = sweepSatellite(i, simTimeMs);

      minutesToEntry[i] = entry;
      exitTimesMs[i] = exit;
      hasChanges = true;
    } else if (exitTimesMs[i] === 0 && minutesToEntry[i] !== Infinity) {
      // Edge case: had an entry but no exit tracked — recompute
      const [entry, exit] = sweepSatellite(i, simTimeMs);

      minutesToEntry[i] = entry;
      exitTimesMs[i] = exit;
      hasChanges = true;
    } else if (minutesToEntry[i] !== Infinity) {
      // Recalculate minutesToEntry based on advancing time
      // The entry time was at simTimeMs + minutesToEntry * 60000 originally
      // But we need to keep it relative to current sim time
      // If we stored the absolute entry time, we'd subtract. Instead, we stored
      // the relative offset at sweep time. For accuracy, recompute stale entries.
      // Non-stale entries: just update the relative offset from cached absolute entry.
    }
  }

  if (hasChanges) {
    const result = new Float32Array(minutesToEntry);

    postMessage(
      {
        typ: FovPredOutMsgType.INCREMENTAL_UPDATE,
        minutesToEntry: result,
      },
      { transfer: [result.buffer as ArrayBuffer] },
    );
  }
}

// ─── Message Handler ─────────────────────────────────────────────────────────

/** Handle incoming messages from the main thread. */
onmessage = function onmessage(event: MessageEvent<FovPredInMsg>) {
  const msg = event.data;

  if (isSgp4WasmBackendMsg(msg)) {
    handleSgp4WasmBackendMsg(msg);

    return;
  }

  switch (msg.typ) {
    case FovPredMsgType.INIT: {
      cancelled = false;
      maxLookaheadMin = msg.maxLookaheadMin || 120;
      sweepStepMin = msg.sweepStepMin || 1;

      // Parse catalog and create satrecs
      const satData = JSON.parse(msg.catalogJson) as Array<{
        tle1?: string;
        tle2?: string;
        active?: boolean;
      }>;

      numObjects = satData.length;
      satRecords = [];

      for (let i = 0; i < numObjects; i++) {
        const tle1 = satData[i]?.tle1;
        const tle2 = satData[i]?.tle2;

        if (tle1 && tle2) {
          satRecords.push({
            satrec: Sgp4.createSatrec(tle1, tle2),
            active: satData[i].active ?? true,
          });
        } else {
          // Non-satellite objects (sensors, markers, stars, etc.)
          satRecords.push({ satrec: null as unknown as ReturnType<typeof Sgp4.createSatrec>, active: false });
        }
      }

      // Create sensor instances
      sensors = msg.sensors
        .filter((s) => s)
        .map((s) => new DetailedSensor(s as ConstructorParameters<typeof DetailedSensor>[0]));

      // Store priority indices
      priorityIndices = msg.priorityIndices ?? [];
      prioritySet = new Set(priorityIndices);

      // Allocate output arrays
      minutesToEntry = new Float32Array(numObjects).fill(Infinity);
      exitTimesMs = new Float64Array(numObjects);

      // Start full sweep (priority satellites first, then the rest)
      fullSweep(msg.simTimeMs);
      break;
    }

    case FovPredMsgType.UPDATE_TIME:
      if (sensors.length > 0 && minutesToEntry) {
        incrementalUpdate(msg.simTimeMs);
      }
      break;

    case FovPredMsgType.CANCEL:
      cancelled = true;
      break;
    default:
      // Unknown message type
      break;
  }
};

// Signal ready
postMessage('ready');
