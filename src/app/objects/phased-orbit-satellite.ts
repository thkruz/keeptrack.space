import { ServiceLocator } from '@app/engine/core/service-locator';
import { SegmentedLagrangeInterpolator } from '@app/engine/ootk/src/interpolator/SegmentedLagrangeInterpolator';
import { J2000 } from '@ootk/src/main';
import { OemSatellite, ParsedOem } from './oem-satellite';

export enum OrbitPhaseType {
  ASCENT = 'ascent',
  PARKING = 'parking',
  TRANSFER = 'transfer',
  ORBIT = 'orbit',
}

export interface OrbitPhase {
  name: string;
  type: OrbitPhaseType;
  startIndex: number;
  endIndex: number;
  startTime: Date;
  endTime: Date;
}

/**
 * A satellite with multiple orbital phases (ascent, parking, transfer, orbit).
 *
 * Extends OemSatellite to inherit interpolation, orbit visualization, and
 * reference frame support. Adds phase metadata and uses a
 * SegmentedLagrangeInterpolator to avoid cross-phase interpolation artifacts.
 *
 * Orbital elements are computed from instantaneous state vectors via
 * J2000.toClassicalElements() (inherited from OemSatellite).
 */
export class PhasedOrbitSatellite extends OemSatellite {
  private readonly phases_: OrbitPhase[];

  constructor(oem: ParsedOem, phases: OrbitPhase[], allStates: J2000[], boundaryIndices: number | number[]) {
    super(oem);
    this.phases_ = phases;

    // Normalize to array for uniform handling
    const indices = typeof boundaryIndices === 'number' ? [boundaryIndices] : boundaryIndices;

    // Override the standard LagrangeInterpolator with a segmented one
    // to avoid interpolation across phase physics boundaries.
    const validIndices = indices.filter((i) => i >= 0 && i < allStates.length - 1);

    if (validIndices.length > 0) {
      this.lagrangeInterpolator = SegmentedLagrangeInterpolator.fromMultipleBoundaries(allStates, validIndices);
    }
  }

  get phases(): OrbitPhase[] {
    return this.phases_;
  }

  /**
   * Get the active phase for the given simulation time.
   */
  getActivePhase(date?: Date): OrbitPhase | null {
    const time = (date ?? ServiceLocator.getTimeManager().simulationTimeObj).getTime();

    return this.phases_.find((p) => time >= p.startTime.getTime() && time <= p.endTime.getTime()) ?? null;
  }

  /**
   * Whether the satellite is currently in the ascent phase.
   */
  isInAscent(date?: Date): boolean {
    return this.getActivePhase(date)?.type === OrbitPhaseType.ASCENT;
  }
}
