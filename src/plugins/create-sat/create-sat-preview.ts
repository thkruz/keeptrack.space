/**
 * Live "ghost orbit" preview for the Create Satellite plugin. Builds a closed
 * orbit line from a TLE by sampling SGP4 over one period and drawing it through
 * the LineManager (the same path OEM satellites use for their orbit overlay).
 * Self-contained: nothing touches the catalog or the position crunchers, so the
 * preview adds and removes a single line and never leaves state behind.
 */
import { SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { Sgp4, TemeVec3, Tle, TleLine1, TleLine2 } from '@ootk/src/main';

/** Number of samples around the orbit; 128 is smooth without being costly. */
const ORBIT_SAMPLES = 128;

/** Minimal shape of the LineManager line object we hold (for removal). */
interface RemovableLine {
  isGarbage: boolean;
}

export class CreateSatOrbitPreview {
  private line_: RemovableLine | null = null;

  /**
   * Redraw the preview orbit for the given TLE. Any propagation failure clears
   * the preview rather than throwing, so a half-typed element set just hides the
   * ghost orbit instead of erroring.
   */
  update(tle1: TleLine1, tle2: TleLine2): void {
    let points: [number, number, number][];

    try {
      points = CreateSatOrbitPreview.buildOrbitPoints_(tle1, tle2);
    } catch {
      this.clear();

      return;
    }

    if (points.length < 2) {
      this.clear();

      return;
    }

    this.clear();
    this.line_ = ServiceLocator.getLineManager().createOrbitPath(points, LineColors.ORANGE, SolarBody.Earth) as RemovableLine | null;
  }

  /** Remove the preview orbit line, if any. */
  clear(): void {
    if (this.line_) {
      this.line_.isGarbage = true;
      this.line_ = null;
    }
  }

  /** Sample one orbital period of TEME ECI positions (km) from a TLE. */
  private static buildOrbitPoints_(tle1: TleLine1, tle2: TleLine2): [number, number, number][] {
    const satrec = Sgp4.createSatrec(tle1, tle2);
    const meanMotion = Tle.meanMotion(tle2); // rev/day

    if (!(meanMotion > 0)) {
      return [];
    }

    const periodMin = 1440 / meanMotion;
    const points: [number, number, number][] = [];

    for (let i = 0; i <= ORBIT_SAMPLES; i++) {
      const minutesAfterEpoch = (periodMin * i) / ORBIT_SAMPLES;
      const sv = Sgp4.propagate(satrec, minutesAfterEpoch);
      const pos = sv.position as TemeVec3 | boolean;

      if (!pos || typeof pos === 'boolean') {
        continue;
      }

      points.push([pos.x, pos.y, pos.z]);
    }

    return points;
  }
}
