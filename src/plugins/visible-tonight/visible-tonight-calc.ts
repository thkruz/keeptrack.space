/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * visible-tonight-calc.ts turns ordinary passes over the user's location into the
 * short list Visible Tonight shows: only the part of each pass where the object is
 * sunlit while the user's sky is dark, only bright objects, and only passes high
 * enough to notice.
 *
 * It holds no orbital math of its own. Pass edges, look angles, sunlight and the
 * solar phase angle come in through {@link VisibleTonightTarget} (the plugin wires
 * them to SatMath, best-pass-calculator and OOTK), and the brightness comes from
 * OOTK's apparentVmagFromStdMag. That keeps this file testable without a catalog.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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

import { refinePassEdgeMs } from '@app/app/sensors/pass-edge';
import { findPassPeakMs } from '@app/app/sensors/pass-peak';
import { apparentVmagFromStdMag } from '@ootk/src/main';

/**
 * Fixed defaults. Visible Tonight is deliberately not configurable (see #1468):
 * these are the whole "settings panel".
 */
export const VISIBLE_TONIGHT_DEFAULTS = {
  /** How far ahead to look from now. */
  windowDays: 3,
  /** A pass must climb at least this high (deg) to make the list. */
  minPeakElDeg: 10,
  /** Faintest apparent magnitude listed; about what a casual observer spots from a suburb. */
  nakedEyeMagLimit: 3.5,
  /** Longest list shown. */
  maxRows: 10,
  /** Sampling step (ms) used to find the visible part of a pass before its edges are refined. */
  visibilityStepMs: 10_000,
} as const;

export type VisibleTonightOptions = typeof VISIBLE_TONIGHT_DEFAULTS;

/** Plain-language brightness buckets shown instead of magnitudes. */
export type BrightnessLevel = 'veryBright' | 'bright' | 'visible';

/** Eight-point compass ids; the plugin translates them. */
export const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type CompassPoint = (typeof COMPASS_POINTS)[number];

export interface LookAngle {
  az: number;
  el: number;
  rng: number;
}

/** One object to search, with the app-state lookups the search needs injected. */
export interface VisibleTonightTarget {
  norad: string;
  name: string;
  /** Standard magnitude (1000 km, 90 deg phase), from the catalog or an estimate. */
  stdMag: number;
  /** Geometric passes above the minimum elevation between the two epochs, edges in ms. */
  passes: (fromMs: number, toMs: number) => { riseMs: number; setMs: number }[];
  /** Look angle from the observer, or null when the object cannot be propagated then. */
  lookAngle: (epochMs: number) => LookAngle | null;
  /**
   * True when a person could see it: the object is sunlit and the observer's sky is dark. The plugin
   * answers this with SensorMath.getLightingState, so "dark" is the app-wide rule (Sun at or below
   * SensorMath.SITE_DARK_SUN_EL_DEG, -12 deg, agreed on #1468) and not a second copy of it.
   */
  isVisible: (epochMs: number) => boolean;
  /** Solar phase angle (rad) at the object as seen by the observer, or null when unknown. */
  phaseAngle: (epochMs: number) => number | null;
}

/** One row of the list: the visible part of a pass, never the whole geometric pass. */
export interface VisiblePass {
  norad: string;
  name: string;
  startMs: number;
  peakMs: number;
  endMs: number;
  startAz: number;
  endAz: number;
  peakEl: number;
  /** Brightest apparent magnitude during the visible part (an estimate, about 1 mag). */
  mag: number;
  level: BrightnessLevel;
}

/** Plain-language bucket for an apparent magnitude: very bright (ISS-like), bright, or simply visible. */
export const brightnessLevel = (mag: number): BrightnessLevel => {
  if (mag <= -1) {
    return 'veryBright';
  }

  return mag <= 1.5 ? 'bright' : 'visible';
};

/** Nearest of the eight compass points for an azimuth in degrees (0 = north, clockwise). */
export const compassPoint = (azDeg: number): CompassPoint => {
  const normalized = ((azDeg % 360) + 360) % 360;

  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
};

/**
 * The longest stretch of [riseMs, setMs] where `isVisible` holds, with both edges
 * bisected to the second. Null when the object is never visible during the pass.
 */
export const findVisibleWindow = (
  riseMs: number,
  setMs: number,
  isVisible: (epochMs: number) => boolean,
  stepMs: number = VISIBLE_TONIGHT_DEFAULTS.visibilityStepMs
): { startMs: number; endMs: number } | null => {
  const samples: number[] = [];

  for (let sampleMs = riseMs; sampleMs < setMs; sampleMs += stepMs) {
    samples.push(sampleMs);
  }
  samples.push(setMs);

  // Longest run of visible samples, as sample indices. A run still open at the last sample is closed after the loop.
  const runs = { best: null as { from: number; to: number } | null, start: null as number | null };
  const closeRun = (lastIndex: number): void => {
    if (runs.start !== null && (runs.best === null || lastIndex - runs.start > runs.best.to - runs.best.from)) {
      runs.best = { from: runs.start, to: lastIndex };
    }
    runs.start = null;
  };

  samples.forEach((sampleMs, index) => {
    if (isVisible(sampleMs)) {
      runs.start ??= index;
    } else {
      closeRun(index - 1);
    }
  });
  closeRun(samples.length - 1);

  const { best } = runs;

  if (best === null) {
    return null;
  }

  // Refine only edges that fall inside the pass; an edge at rise or set is the pass edge itself.
  const startMs = best.from === 0 ? samples[0] : refinePassEdgeMs(isVisible, samples[best.from - 1], samples[best.from]);
  const endMs = best.to === samples.length - 1 ? samples[best.to] : refinePassEdgeMs(isVisible, samples[best.to + 1], samples[best.to]);

  return { startMs, endMs };
};

/** Brightest apparent magnitude over a window, sampled on the visibility step and at the peak. */
const brightestMag_ = (target: VisibleTonightTarget, startMs: number, endMs: number, peakMs: number, stepMs: number): number | null => {
  let best: number | null = null;
  const times = [peakMs];

  for (let sampleMs = startMs; sampleMs <= endMs; sampleMs += stepMs) {
    times.push(sampleMs);
  }

  for (const sampleMs of times) {
    const look = target.lookAngle(sampleMs);
    const phase = target.phaseAngle(sampleMs);

    if (look === null || phase === null) {
      continue;
    }
    const mag = apparentVmagFromStdMag(target.stdMag, look.rng, phase);

    if (mag !== null && (best === null || mag < best)) {
      best = mag;
    }
  }

  return best;
};

/** The visible part of one geometric pass, or null when it is not worth listing. */
export const toVisiblePass = (
  target: VisibleTonightTarget,
  pass: { riseMs: number; setMs: number },
  options: VisibleTonightOptions = VISIBLE_TONIGHT_DEFAULTS
): VisiblePass | null => {
  const window = findVisibleWindow(pass.riseMs, pass.setMs, target.isVisible, options.visibilityStepMs);

  if (window === null) {
    return null;
  }

  const peak = findPassPeakMs((epochMs) => target.lookAngle(epochMs)?.el ?? null, window.startMs, window.endMs);
  const start = target.lookAngle(window.startMs);
  const end = target.lookAngle(window.endMs);

  if (peak === null || start === null || end === null || peak.el < options.minPeakElDeg) {
    return null;
  }

  const mag = brightestMag_(target, window.startMs, window.endMs, peak.ms, options.visibilityStepMs);

  if (mag === null || mag > options.nakedEyeMagLimit) {
    return null;
  }

  return {
    norad: target.norad,
    name: target.name,
    startMs: window.startMs,
    peakMs: peak.ms,
    endMs: window.endMs,
    startAz: start.az,
    endAz: end.az,
    peakEl: peak.el,
    mag,
    level: brightnessLevel(mag),
  };
};

/** Every listed pass of every target in [fromMs, fromMs + windowDays), soonest first, capped at maxRows. */
export const findVisiblePasses = (targets: VisibleTonightTarget[], fromMs: number, options: VisibleTonightOptions = VISIBLE_TONIGHT_DEFAULTS): VisiblePass[] => {
  const toMs = fromMs + options.windowDays * 86_400_000;
  const rows: VisiblePass[] = [];

  for (const target of targets) {
    for (const pass of target.passes(fromMs, toMs)) {
      const row = toVisiblePass(target, pass, options);

      if (row !== null && row.endMs > fromMs) {
        rows.push(row);
      }
    }
  }

  return rows.sort((a, b) => a.startMs - b.startMs).slice(0, options.maxRows);
};
