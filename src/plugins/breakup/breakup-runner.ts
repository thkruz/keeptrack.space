/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * breakup-runner.ts is the catalog-facing orchestration for the Breakup
 * simulator, extracted from the plugin so it can be triggered programmatically
 * (e.g. by the Satellite Interceptor at the moment of intercept) as well as from
 * the Breakup menu. It takes an explicit satellite, parsed parameters, and a
 * breakup epoch — nothing is read from the DOM or the current sim clock here —
 * fits every fragment with the pure {@link breakup-core} physics, and injects the
 * pieces into reserved analyst catalog slots. DOM, toasts, search, and undo
 * bookkeeping stay in the caller.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025-2026 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SatMath } from '@app/app/analysis/sat-math';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite, SpaceObjectType, Tle, TleLine1, TleLine2 } from '@ootk/src/main';
import {
  BreakupVariationParams,
  DeltaVComponentsKms,
  DeltaVSpreadMps,
  RicBasis,
  Vec3,
  buildFragmentTle,
  computeImpactBias,
  computeRicBasis,
  isAnalystRangeValid,
  makeRng,
  sampleDeltaV,
} from './breakup-core';

/**
 * A kinetic impact that biases the debris cloud along the impactor's momentum.
 * Passed by the interceptor so an ascending hit adds radial energy and a
 * descending hit drops perigee toward reentry; omitted by the standalone Breakup
 * tool, which stays isotropic.
 */
export interface KineticImpact {
  /** Impactor velocity at the moment of impact, TEME (km/s). */
  velocityTeme: Vec3;
  /** Notional (impactor mass / target mass) ratio; the fraction of relative velocity imparted. */
  transferFraction: number;
}

/** Default momentum-transfer fraction for a kinetic intercept (notional mass ratio). */
export const DEFAULT_IMPACT_TRANSFER_FRACTION = 0.05;

/** Why a breakup run could not proceed, or null on success. Values are locale discriminators. */
export type BreakupRunError = 'invalidSlotRange' | 'parentStateUnavailable' | 'noFragmentsCreated' | null;

/** Outcome of a {@link runBreakup} call. */
export interface BreakupRunResult {
  /** Analyst catalog ids that were activated as debris pieces. */
  createdIds: number[];
  /** Fragments skipped because they reentered / were sub-orbital. */
  reenteredCount: number;
  /** Hard-failure discriminator, or null when at least one piece was created. */
  error: BreakupRunError;
}

/**
 * Generate a debris cloud from `sat` at `epoch` and inject the fragments into
 * reserved analyst slots. Pure physics comes from {@link breakup-core}; this
 * function owns only the catalog/cruncher/orbit wiring.
 *
 * The breakup is evaluated at the parent's exact TEME state at `epoch` (any
 * orbital regime), and the fragment cloud is reproducible for a given
 * (startNum, count, spread) via a seeded RNG.
 *
 * @param sat - The (TLE-backed) parent satellite.
 * @param params - Parsed breakup parameters (count, per-axis Δv spread, start slot).
 * @param epoch - Breakup time; also the fragment TLE epoch.
 * @param impact - Optional kinetic impact that biases the cloud along the impactor's
 *   momentum; omit for an isotropic (explosion-style) breakup.
 * @returns The created ids, count of skipped reentering fragments, and any hard error.
 */
export function runBreakup(sat: Satellite, params: BreakupVariationParams, epoch: Date, impact?: KineticImpact): BreakupRunResult {
  const { breakupCount, radialDeltaV, inTrackDeltaV, crossTrackDeltaV, startNum } = params;

  // Guard the analyst-slot range so pieces never overwrite real catalog satellites
  // (below the block) or unallocated slots (above it).
  if (!isAnalystRangeValid(startNum, breakupCount, CatalogManager.ANALYST_START_ID, settingsManager.maxAnalystSats)) {
    return { createdIds: [], reenteredCount: 0, error: 'invalidSlotRange' };
  }

  const parentState = sat.eci(epoch);

  if (!parentState?.position || !parentState.velocity) {
    return { createdIds: [], reenteredCount: 0, error: 'parentStateUnavailable' };
  }

  const basis = computeRicBasis(parentState.position, parentState.velocity);
  const spread: DeltaVSpreadMps = { radial: radialDeltaV, inTrack: inTrackDeltaV, crossTrack: crossTrackDeltaV };
  // A kinetic impact biases the whole cloud along the impactor's velocity relative
  // to the target (projected into RIC); an isotropic breakup has no bias.
  const bias = impact
    ? computeImpactBias(
      {
        x: impact.velocityTeme.x - parentState.velocity.x,
        y: impact.velocityTeme.y - parentState.velocity.y,
        z: impact.velocityTeme.z - parentState.velocity.z,
      },
      basis,
      impact.transferFraction,
    )
    : undefined;
  // Seed from the parameters so a given configuration produces a reproducible cloud.
  const rng = makeRng((startNum ^ breakupCount ^ Math.round((inTrackDeltaV + radialDeltaV + crossTrackDeltaV) * 1000)) >>> 0);

  const createdIds: number[] = [];
  let reenteredCount = 0;

  for (let i = 0; i < breakupCount; i++) {
    const dv = sampleDeltaV(rng, spread, bias);
    const id = injectFragment_(startNum + i, i + 1, { position: parentState.position, velocity: parentState.velocity, basis, dv }, epoch);

    if (id === null) {
      reenteredCount++;
    } else {
      createdIds.push(id);
    }
  }

  return {
    createdIds,
    reenteredCount,
    error: createdIds.length === 0 ? 'noFragmentsCreated' : null,
  };
}

/** The parent state and sampled Δv needed to build one fragment. */
interface FragmentInput {
  position: Vec3;
  velocity: Vec3;
  basis: RicBasis;
  dv: DeltaVComponentsKms;
}

/**
 * Build one fragment's TLE, activate its reserved analyst slot, and seed its
 * render position. Returns the catalog id on success, or null when the fragment
 * is sub-orbital / unrepresentable (the caller counts it as reentered).
 *
 * @param sccNum6 - The 6-digit analyst catalog number for this fragment.
 * @param pieceIndex - 1-based fragment index (for the piece name).
 * @param input - Parent state, RIC basis, and sampled Δv.
 * @param epoch - Breakup time (fragment TLE epoch).
 */
function injectFragment_(sccNum6: number, pieceIndex: number, input: FragmentInput, epoch: Date): number | null {
  const catalogManagerInstance = ServiceLocator.getCatalogManager();
  const orbitManagerInstance = ServiceLocator.getOrbitManager();
  const a5Num = Tle.convert6DigitToA5(sccNum6.toString());
  const pieceSatId = catalogManagerInstance.sccNum2Id(a5Num);

  if (!pieceSatId) {
    return null;
  }

  let pieceTle1: TleLine1;
  let pieceTle2: TleLine2;

  try {
    ({ tle1: pieceTle1, tle2: pieceTle2 } = buildFragmentTle(epoch, input.position, input.velocity, input.basis, input.dv, a5Num));
  } catch {
    // Degenerate / sub-orbital fragment (hyperbolic Δv, or perigee below the
    // surface from a large Δv on a low orbit). Skip it, never abort the cloud.
    return null;
  }

  let newSat: Satellite;

  try {
    newSat = new Satellite({
      ...catalogManagerInstance.objectCache[pieceSatId],
      id: pieceSatId,
      name: `Breakup Piece ${pieceIndex}`,
      tle1: pieceTle1,
      tle2: pieceTle2,
      // The analyst-slot template is a PAYLOAD; pieces are debris and need the
      // type overridden so color schemes and search treat them correctly.
      type: SpaceObjectType.DEBRIS,
      active: true,
    });
  } catch {
    return null;
  }

  if (SatMath.altitudeCheck(newSat.satrec!, epoch) <= 1) {
    return null;
  }

  catalogManagerInstance.objectCache[pieceSatId] = newSat;
  catalogManagerInstance.satCruncherThread.sendSatEdit(pieceSatId, pieceTle1, pieceTle2, true);
  orbitManagerInstance.changeOrbitBufferData(pieceSatId, pieceTle1, pieceTle2);
  // Seed the render buffer synchronously (sendSatEdit is async) so a downstream
  // search does not read the placeholder 0,0,0 position and filter as "Decayed".
  catalogManagerInstance.seedDotPosition(pieceSatId);

  return pieceSatId;
}

/**
 * Return every generated piece to its reserved (inactive) analyst slot, reversing
 * {@link runBreakup}. The parent satellite is never modified by a breakup, so
 * nothing to restore there.
 *
 * @param pieceIds - Analyst catalog ids created by a prior {@link runBreakup}.
 */
export function clearBreakupPieces(pieceIds: number[]): void {
  const catalogManagerInstance = ServiceLocator.getCatalogManager();
  const orbitManagerInstance = ServiceLocator.getOrbitManager();

  for (const id of pieceIds) {
    const obj = catalogManagerInstance.objectCache[id];

    if (!(obj instanceof Satellite)) {
      continue;
    }

    // Deactivate the slot and revert it to the reserved analyst PAYLOAD type.
    const reset = new Satellite({ ...obj, id, active: false, type: SpaceObjectType.PAYLOAD });

    catalogManagerInstance.objectCache[id] = reset;
    catalogManagerInstance.satCruncherThread.sendSatEdit(id, obj.tle1, obj.tle2, false);
    orbitManagerInstance.changeOrbitBufferData(id, obj.tle1, obj.tle2);
  }
}
