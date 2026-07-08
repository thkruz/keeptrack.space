/* eslint-disable max-params */
/**
 * Web worker for debris screening conjunction assessment.
 *
 * Receives TLE data and screening parameters from the main thread,
 * runs coarse filtering and detailed conjunction assessment in batches,
 * and sends results back progressively as chunks.
 */

import {
  cappedScreeningCovarianceFromTle,
  ConjunctionAssessment,
  EpochUTC,
  ScreeningFilter,
  StateCovariance,
  Tle,
  type Kilometers,
  type Seconds,
} from '@ootk/src/main';
import {
  DsWorkerMsgType,
  DsWorkerOutMsgType,
  type DsMsgStartScreening,
  type DsResultRow,
  type DsSatelliteData,
  type DsWorkerInMsg,
} from './debris-screening-messages';
import { handleSgp4WasmBackendMsg, isSgp4WasmBackendMsg } from './shared/sgp4-wasm-backend-handler';

// ─── Module-level state ─────────────────────────────────────────────────────

let cancelledRunId = -1;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Assess a single candidate pair and return a serializable result row,
 * or null if the pair does not produce a conjunction event within the RIC box.
 */
function assessCandidate_(
  primaryTle: Tle,
  primaryName: string,
  primaryRadius: number,
  primaryCovariance: StateCovariance,
  secondary: DsSatelliteData,
  confidenceLevel: number,
  startTime: EpochUTC,
  endTime: EpochUTC,
  searchStepSize: number,
  uVal: number,
  vVal: number,
  wVal: number,
): DsResultRow | null {
  const secondaryTle = new Tle(secondary.tle1, secondary.tle2);

  // Quick propagation test — if the TLE can't propagate to the start time,
  // it's decayed/invalid and we skip it before doing expensive covariance + assessment work
  secondaryTle.propagate(startTime);

  const secondaryCovariance = cappedScreeningCovarianceFromTle(secondary.tle1, secondary.tle2, confidenceLevel);

  const assessment = new ConjunctionAssessment(
    {
      tle: primaryTle,
      name: primaryName,
      radius: primaryRadius as Kilometers,
      covariance: primaryCovariance,
    },
    {
      tle: secondaryTle,
      name: secondary.name,
      radius: secondary.radius as Kilometers,
      covariance: secondaryCovariance,
    },
  );

  const event = assessment.assess({
    startTime,
    endTime,
    searchStepSize: searchStepSize as Seconds,
  });

  if (!event) {
    return null;
  }

  // RIC box filter
  if (
    isNaN(event.radialDistance) ||
    isNaN(event.intrackDistance) ||
    isNaN(event.crosstrackDistance) ||
    Math.abs(event.radialDistance) > uVal ||
    Math.abs(event.intrackDistance) > vVal ||
    Math.abs(event.crosstrackDistance) > wVal
  ) {
    return null;
  }

  const riskScore = ScreeningFilter.computeRiskScore(event);

  return {
    secondaryId: secondary.name,
    tcaMs: event.tca.toDateTime().getTime(),
    missDistance: event.missDistance,
    radialDistance: event.radialDistance,
    intrackDistance: event.intrackDistance,
    crosstrackDistance: event.crosstrackDistance,
    relativeVelocity: event.relativeVelocity,
    probabilityOfCollision: event.probabilityOfCollision ?? null,
    riskScore,
  };
}

// ─── Message handler ────────────────────────────────────────────────────────

/**
 * Main handler for START_SCREENING message. Performs the two-phase screening process:
 * @param msg The message containing screening parameters and TLE data for the primary and secondary objects. The worker will perform a two-phase screening process:
 * @returns Posts progress updates, result chunks, and completion/error messages back to the main thread.
 */
function handleStartScreening_(msg: DsMsgStartScreening): void {
  const { runId, primary, secondaries, startTimeMs, endTimeMs, searchStepSize, uVal, vVal, wVal, batchSize, covarianceConfidenceLevel } = msg;

  try {
    // Reconstruct primary objects
    const primaryTle = new Tle(primary.tle1, primary.tle2);
    const primaryCovariance = cappedScreeningCovarianceFromTle(primary.tle1, primary.tle2, covarianceConfidenceLevel);

    // Reconstruct secondary TLEs for coarse filter
    const secondaryTles: Tle[] = [];

    for (let i = 0; i < secondaries.length; i++) {
      try {
        secondaryTles.push(new Tle(secondaries[i].tle1, secondaries[i].tle2));
      } catch {
        // Use a placeholder that will fail the shell overlap check
        secondaryTles.push(primaryTle); // Will be filtered by coarse filter or skip
      }
    }

    // Phase 1: Coarse filter
    const candidateIndices = ScreeningFilter.filterCandidates(primaryTle, secondaryTles);

    postMessage({
      typ: DsWorkerOutMsgType.PROGRESS,
      runId,
      phase: 'coarse_filter',
      candidateCount: candidateIndices.length,
    });

    // Check cancellation after coarse filter
    if (cancelledRunId >= runId) {
      return;
    }

    // Phase 2: Assess candidates in batches
    const startTime = EpochUTC.fromDateTime(new Date(startTimeMs));
    const endTime = EpochUTC.fromDateTime(new Date(endTimeMs));
    let processedCount = 0;
    let totalResults = 0;

    for (let batchStart = 0; batchStart < candidateIndices.length; batchStart += batchSize) {
      // Check cancellation before each batch
      if (cancelledRunId >= runId) {
        return;
      }

      const batchEnd = Math.min(batchStart + batchSize, candidateIndices.length);
      const batchResults: DsResultRow[] = [];

      for (let i = batchStart; i < batchEnd; i++) {
        const idx = candidateIndices[i];
        const secondary = secondaries[idx];

        try {
          const result = assessCandidate_(
            primaryTle,
            primary.name,
            primary.radius,
            primaryCovariance,
            secondary,
            covarianceConfidenceLevel,
            startTime,
            endTime,
            searchStepSize,
            uVal,
            vVal,
            wVal,
          );

          if (result) {
            batchResults.push(result);
          }
        } catch {
          // Skip pairs that fail assessment (propagation errors, etc.)
        }

        processedCount++;
      }

      totalResults += batchResults.length;

      // Send chunk even if empty (to update progress)
      postMessage({
        typ: DsWorkerOutMsgType.CHUNK,
        runId,
        results: batchResults,
        processedCount,
        totalCandidates: candidateIndices.length,
      });
    }

    // All done
    postMessage({
      typ: DsWorkerOutMsgType.COMPLETE,
      runId,
      totalResults,
      totalCandidates: candidateIndices.length,
    });
  } catch (error) {
    postMessage({
      typ: DsWorkerOutMsgType.ERROR,
      runId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main message handler for the worker. Routes messages to appropriate handlers based on type.
 * @param m The incoming message event containing a DsWorkerInMsg.
 */
function onmessageProcessing_(m: MessageEvent<DsWorkerInMsg>): void {
  const msg = m.data;

  if (isSgp4WasmBackendMsg(msg)) {
    handleSgp4WasmBackendMsg(msg);

    return;
  }

  switch (msg.typ) {
    case DsWorkerMsgType.START_SCREENING:
      handleStartScreening_(msg);
      break;
    case DsWorkerMsgType.CANCEL:
      cancelledRunId = msg.runId;
      break;
    default:
      break;
  }
}

// ─── Worker initialization ──────────────────────────────────────────────────

try {
  onmessage = onmessageProcessing_;
} catch {
  // Node.js environment (testing) — onmessage not available
}

postMessage('ready');
