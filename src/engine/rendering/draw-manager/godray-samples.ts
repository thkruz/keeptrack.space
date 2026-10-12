/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * godray-samples.ts holds the godray sample counts the renderer supports and
 * the parser that maps a URL value onto them. Pure: no DOM, no ServiceLocator.
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

/** Godray sample counts per quality level; OFF swaps the effect for the sun texture. */
export enum GodraySamples {
  OFF = -1,
  LOW = 24,
  MEDIUM = 36,
  HIGH = 52,
  ULTRA = 80,
}

/** Every member, lowest first. */
export const GODRAY_SAMPLES_ORDER: readonly GodraySamples[] = [GodraySamples.OFF, GodraySamples.LOW, GodraySamples.MEDIUM, GodraySamples.HIGH, GodraySamples.ULTRA];

/** The member closest to `samples` (ties go to the lower member). */
export const nearestGodraySamples = (samples: number): GodraySamples => {
  let best = GODRAY_SAMPLES_ORDER[0];

  for (const member of GODRAY_SAMPLES_ORDER) {
    if (Math.abs(member - samples) < Math.abs(best - samples)) {
      best = member;
    }
  }

  return best;
};

const NAMED_GODRAY_SAMPLES_: Readonly<Record<string, GodraySamples>> = {
  off: GodraySamples.OFF,
  low: GodraySamples.LOW,
  med: GodraySamples.MEDIUM,
  medium: GodraySamples.MEDIUM,
  hi: GodraySamples.HIGH,
  high: GodraySamples.HIGH,
  u: GodraySamples.ULTRA,
  ultra: GodraySamples.ULTRA,
};

/**
 * Map a URL value onto a {@link GodraySamples} member: a level name
 * (`low`, `medium`, ...) or a sample count. Counts snap to the nearest member,
 * so links from before the enum (16, 32, 64, 128) still load. Null when the
 * value is neither.
 */
export const parseGodraySamplesParam = (value: string): GodraySamples | null => {
  const trimmed = value.trim().toLowerCase();
  const named = NAMED_GODRAY_SAMPLES_[trimmed];

  if (typeof named === 'number') {
    return named;
  }
  if (!/^-?\d+$/u.test(trimmed)) {
    return null;
  }

  return nearestGodraySamples(parseInt(trimmed, 10));
};
