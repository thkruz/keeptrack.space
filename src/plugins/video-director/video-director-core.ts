/**
 * /////////////////////////////////////////////////////////////////////////////
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

/**
 * DOM-free logic for the Video Director plugin.
 *
 * Everything here is pure so it can be unit-tested without a browser: speed
 * parsing/clamping, the direction-toggle table (replacing the old repeated
 * if-blocks + switch), and opposite-direction resolution.
 */

/** A camera direction toggle, its backing settings flag, and its mutually-exclusive opposite. */
export interface DirectionToggle {
  /** Full DOM id of the checkbox. */
  id: string;
  /** Boolean `settingsManager` flag this toggle writes. */
  flag: 'isAutoRotateL' | 'isAutoRotateR' | 'isAutoRotateU' | 'isAutoRotateD'
  | 'isAutoPanL' | 'isAutoPanR' | 'isAutoPanU' | 'isAutoPanD'
  | 'isAutoZoomIn' | 'isAutoZoomOut';
  /** DOM id of the opposite-direction toggle that must turn off when this one turns on. */
  opposite: string;
  /** Whether enabling this toggle should play the toggle-on/off sound. */
  isAxisToggle: boolean;
}

/** A speed field, its backing numeric settings key, and validation bounds. */
export interface SpeedConfig {
  /** Full DOM id of the text input. */
  id: string;
  /** Numeric `settingsManager` key this field writes. */
  flag: 'autoRotateSpeed' | 'autoPanSpeed' | 'autoZoomSpeed';
  /** Fallback used when the field is blank or non-numeric (prevents NaN propagation). */
  def: number;
  /** Lower clamp bound. */
  min: number;
  /** Upper clamp bound. */
  max: number;
}

/**
 * Every rotate/pan/zoom direction toggle in display order. Drives both the form
 * markup and the settings read/write, so the two can never drift apart.
 */
export const DIRECTION_TOGGLES: DirectionToggle[] = [
  { id: 'video-director-rotateL', flag: 'isAutoRotateL', opposite: 'video-director-rotateR', isAxisToggle: true },
  { id: 'video-director-rotateR', flag: 'isAutoRotateR', opposite: 'video-director-rotateL', isAxisToggle: true },
  { id: 'video-director-rotateU', flag: 'isAutoRotateU', opposite: 'video-director-rotateD', isAxisToggle: true },
  { id: 'video-director-rotateD', flag: 'isAutoRotateD', opposite: 'video-director-rotateU', isAxisToggle: true },
  { id: 'video-director-panL', flag: 'isAutoPanL', opposite: 'video-director-panR', isAxisToggle: true },
  { id: 'video-director-panR', flag: 'isAutoPanR', opposite: 'video-director-panL', isAxisToggle: true },
  { id: 'video-director-panU', flag: 'isAutoPanU', opposite: 'video-director-panD', isAxisToggle: true },
  { id: 'video-director-panD', flag: 'isAutoPanD', opposite: 'video-director-panU', isAxisToggle: true },
  { id: 'video-director-zoomIn', flag: 'isAutoZoomIn', opposite: 'video-director-zoomOut', isAxisToggle: true },
  { id: 'video-director-zoomOut', flag: 'isAutoZoomOut', opposite: 'video-director-zoomIn', isAxisToggle: true },
];

/** Subset of {@link DIRECTION_TOGGLES} that control auto-rotate (used to seed a default before starting). */
export const ROTATE_TOGGLE_IDS = ['video-director-rotateL', 'video-director-rotateR', 'video-director-rotateU', 'video-director-rotateD'];

/** Every speed field in display order, with NaN-safe defaults and clamp bounds. */
export const SPEED_CONFIGS: SpeedConfig[] = [
  { id: 'video-director-rotateSpeed', flag: 'autoRotateSpeed', def: 0.000075, min: 0, max: 1 },
  { id: 'video-director-panSpeed', flag: 'autoPanSpeed', def: 0.05, min: 0, max: 100 },
  { id: 'video-director-zoomSpeed', flag: 'autoZoomSpeed', def: 0.0005, min: 0, max: 1 },
];

/**
 * Parse a speed field value into a finite, clamped number. Blank or non-numeric
 * input falls back to the configured default so NaN never reaches the camera math.
 */
export function parseSpeed(raw: string | null | undefined, config: Pick<SpeedConfig, 'def' | 'min' | 'max'>): number {
  const value = parseFloat(raw ?? '');

  if (!Number.isFinite(value)) {
    return config.def;
  }

  return Math.min(Math.max(value, config.min), config.max);
}

/**
 * Given the toggle that just changed and whether it is now checked, return the
 * id of the opposite-direction toggle that must be turned off, or `null` when
 * nothing needs to change (the toggle was turned off, or it is not a direction
 * toggle).
 */
export function getOppositeToDisable(changedId: string, isChecked: boolean): string | null {
  if (!isChecked) {
    return null;
  }

  const toggle = DIRECTION_TOGGLES.find((t) => t.id === changedId);

  return toggle ? toggle.opposite : null;
}
