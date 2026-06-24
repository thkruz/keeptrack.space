/**
 * Live "ghost orbit" preview shared by the Create Satellite and Edit Satellite
 * plugins. It draws two things for a candidate TLE:
 *
 *   1. The orbit path, as an orange line sampled over one period.
 *   2. A live preview dot, by parking the candidate TLE on a reserved (inactive)
 *      analyst-satellite slot and activating it. The position cruncher then
 *      propagates that slot every frame, so the dot is a real catalog dot that
 *      moves with simulation time -- showing exactly where the edited satellite
 *      would be right now.
 *
 * Self-contained: it only ever touches the one analyst slot it reserves plus its
 * own orbit line, and `clear()` returns the slot to its inactive reserved state,
 * so nothing is left behind.
 */
import { SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { t7e } from '@app/locales/keys';
import { Satellite, Sgp4, SpaceObjectType, TemeVec3, Tle, TleLine1, TleLine2 } from '@ootk/src/main';

/** Number of samples around the orbit; 128 is smooth without being costly. */
const ORBIT_SAMPLES = 128;

/** Minimal shape of the LineManager line object we hold (for removal). */
interface RemovableLine {
  isGarbage: boolean;
}

export class OrbitPreview {
  /** Orbit-path line(s) the preview owns, cleared together. */
  private lines_: RemovableLine[] = [];

  /** Catalog id of the analyst slot reserved for the preview dot (if any). */
  private analystId_: number | null = null;

  /** Canonical sccNum of the reserved analyst slot. */
  private analystSccNum_: string | null = null;

  /** True once the reserved slot has been activated (dot is visible). */
  private analystActive_ = false;

  /**
   * Redraw the preview orbit and live dot for the given TLE. Any propagation
   * failure clears the preview rather than throwing, so a half-typed element set
   * just hides the ghost orbit instead of erroring.
   */
  update(tle1: TleLine1, tle2: TleLine2): void {
    let points: [number, number, number][];

    try {
      points = OrbitPreview.buildOrbitPoints_(tle1, tle2);
    } catch {
      this.clear();

      return;
    }

    if (points.length < 2) {
      this.clear();

      return;
    }

    this.clearLines_();

    try {
      const orbit = ServiceLocator.getLineManager().createOrbitPath(points, LineColors.ORANGE, SolarBody.Earth) as RemovableLine | null;

      if (orbit) {
        this.lines_.push(orbit);
      }
    } catch {
      // Line manager unavailable (e.g. in tests) -- the dot below still works.
    }

    this.updateDot_(tle1, tle2);
  }

  /** Remove the orbit line and return the preview dot's slot to its reserved state. */
  clear(): void {
    this.clearLines_();
    this.deactivateDot_();
  }

  /** Remove only the orbit line(s); leaves the analyst dot untouched. */
  private clearLines_(): void {
    for (const line of this.lines_) {
      line.isGarbage = true;
    }
    this.lines_ = [];
  }

  /**
   * Park the candidate TLE on a reserved analyst slot and (re)activate it so the
   * position cruncher renders it as a live, time-propagating dot. Best-effort: if
   * no slot is free or the catalog is unavailable, the orbit line still shows.
   */
  private updateDot_(tle1: TleLine1, tle2: TleLine2): void {
    try {
      const catalogManager = ServiceLocator.getCatalogManager();

      if (this.analystId_ === null) {
        const slot = catalogManager.getNextAvailableAnalystSat();

        if (!slot) {
          return;
        }
        this.analystId_ = slot.id;
        this.analystSccNum_ = slot.sccNum;
      }

      // Stamp the reserved slot's catalog number into cols 3-7 of both lines so
      // the analyst slot keeps its identity regardless of the form's scc.
      const scc5 = (this.analystSccNum_ ?? '').padStart(5, '0');
      const t1 = (tle1.substring(0, 2) + scc5 + tle1.substring(7)) as TleLine1;
      const t2 = (tle2.substring(0, 2) + scc5 + tle2.substring(7)) as TleLine2;

      if (!this.analystActive_) {
        // First activation: addAnalystSat builds + crunches + seeds the dot; a
        // color-scheme nudge is needed so the freshly activated dot isn't drawn
        // transparent (stale color-worker alpha).
        const sat = catalogManager.addAnalystSat(t1, t2, this.analystId_, this.analystSccNum_ ?? undefined);

        if (sat) {
          // Name it clearly so hover/sat-info-box read "Orbit Preview", not the
          // default "Analyst Sat <id>". Set on every (re)activation since
          // addAnalystSat builds a fresh Satellite with the default name.
          sat.name = t7e('Common.orbitPreview');
          this.analystActive_ = true;
          ServiceLocator.getColorSchemeManager().notifyObjectsChanged();
        }
      } else {
        // Already visible: just move it. The cruncher re-propagates from the new
        // elements, so the dot tracks the edit without a full recolor.
        catalogManager.satCruncherThread.sendSatEdit(this.analystId_, t1, t2, true);
        ServiceLocator.getOrbitManager().changeOrbitBufferData(this.analystId_, t1, t2);

        const sat = catalogManager.objectCache[this.analystId_];

        if (sat instanceof Satellite) {
          sat.editTle(t1, t2);
        }
        catalogManager.seedDotPosition(this.analystId_);
      }
    } catch {
      // The dot is best-effort; never let it break the orbit-line preview.
    }
  }

  /** Return the reserved analyst slot to its inactive (hidden) state. */
  private deactivateDot_(): void {
    if (this.analystId_ === null) {
      return;
    }

    try {
      const catalogManager = ServiceLocator.getCatalogManager();
      const obj = catalogManager.objectCache[this.analystId_];

      if (obj instanceof Satellite) {
        const reset = new Satellite({ ...obj, id: this.analystId_, active: false, type: SpaceObjectType.PAYLOAD });

        catalogManager.objectCache[this.analystId_] = reset;
        catalogManager.satCruncherThread.sendSatEdit(this.analystId_, obj.tle1, obj.tle2, false);
        ServiceLocator.getOrbitManager().changeOrbitBufferData(this.analystId_, obj.tle1, obj.tle2);
      }
      ServiceLocator.getColorSchemeManager().notifyObjectsChanged();
    } catch {
      // Best-effort cleanup.
    }

    this.analystId_ = null;
    this.analystSccNum_ = null;
    this.analystActive_ = false;
  }

  /**
   * Sample one orbital period of TEME ECI positions (km) from a TLE. The first
   * point is at the current simulation time, the rest sweep forward one period.
   */
  private static buildOrbitPoints_(tle1: TleLine1, tle2: TleLine2): [number, number, number][] {
    const satrec = Sgp4.createSatrec(tle1, tle2);
    const meanMotion = Tle.meanMotion(tle2); // rev/day

    if (!(meanMotion > 0)) {
      return [];
    }

    const periodMin = 1440 / meanMotion;

    /*
     * Anchor the sampled arc to the current simulation time, not the TLE epoch.
     * SGP4 applies J2 secular nodal/apsidal precession between epoch and now (for
     * LEO the node regresses several deg/day), so an arc drawn from epoch sits
     * rotated away from the satellite's displayed orbit once a few days have
     * passed. Starting the sweep at "minutes past epoch == now" makes the ghost
     * orbit coincide with the live orbit.
     */
    const simTimeMs = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
    const jdNow = simTimeMs / 86_400_000 + 2_440_587.5;
    const startMinutesAfterEpoch = (jdNow - satrec.jdsatepoch) * 1440;

    const points: [number, number, number][] = [];

    for (let i = 0; i <= ORBIT_SAMPLES; i++) {
      const minutesAfterEpoch = startMinutesAfterEpoch + (periodMin * i) / ORBIT_SAMPLES;
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
