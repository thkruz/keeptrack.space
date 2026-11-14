/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * most-tracked-data.ts parses and validates the Most Tracked endpoint response.
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

/** Most rows a list shows; the endpoint is expected to send at most this many. */
export const MOST_TRACKED_MAX_ROWS = 25;

/** One ranked object in a Most Tracked list. */
export interface MostTrackedEntry {
  /**
   * 1-based display rank. Objects with the same count share a rank
   * (1, 2, 2, 4), because tied counts are common while traffic is low.
   */
  rank: number;
  /** NORAD catalog number as sent by the server (kept as a string, never parsed). */
  norad: string;
  /** Approximate number of distinct users who selected the object in the window (0 or more). */
  count: number;
}

/**
 * Validated endpoint payload. The server sends snake_case
 * (`generated_at`, `window_hours`, `norad_cat_id`) like the rest of API v4.
 */
export interface MostTrackedData {
  /** When the server built the lists, or null when it did not say. */
  generatedAt: Date | null;
  /** Length of the counting window in hours, or null when it did not say. */
  windowHours: number | null;
  /** Top objects over the window. */
  top: MostTrackedEntry[];
  /** Most popular objects that were not in the previous window's top list. */
  trending: MostTrackedEntry[];
}

const isRecord_ = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Accepts a NORAD sent as a number or a non-blank string; rejects everything else. */
const toNorad_ = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  return null;
};

/**
 * Validates one list. Bad rows are dropped rather than failing the whole
 * payload, duplicates keep their best rank, and the result is sorted by the
 * server's rank and capped at {@link MOST_TRACKED_MAX_ROWS}. Display ranks are
 * then recomputed as competition ranks: dropped rows leave no gaps, and equal
 * counts share a rank.
 */
export const parseMostTrackedList = (value: unknown): MostTrackedEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const byNorad = new Map<string, MostTrackedEntry>();

  value.forEach((row, index) => {
    if (!isRecord_(row)) {
      return;
    }

    const norad = toNorad_(row.norad_cat_id);
    const count = typeof row.count === 'number' && Number.isFinite(row.count) && row.count >= 0 ? row.count : null;
    const rank = typeof row.rank === 'number' && Number.isFinite(row.rank) ? row.rank : index + 1;

    if (norad === null || count === null) {
      return;
    }

    const existing = byNorad.get(norad);

    if (!existing || rank < existing.rank) {
      byNorad.set(norad, { rank, norad, count });
    }
  });

  const sorted = [...byNorad.values()].sort((a, b) => a.rank - b.rank).slice(0, MOST_TRACKED_MAX_ROWS);

  return sorted.map((entry, i) => {
    const firstWithCount = sorted.findIndex((other) => other.count === entry.count);

    return { ...entry, rank: firstWithCount === -1 ? i + 1 : firstWithCount + 1 };
  });
};

/**
 * Validates the endpoint response. Returns null when the payload is not an
 * object or carries neither list, so the caller can show its error state.
 */
export const parseMostTrackedResponse = (json: unknown): MostTrackedData | null => {
  if (!isRecord_(json) || (!Array.isArray(json.top) && !Array.isArray(json.trending))) {
    return null;
  }

  let generatedAt: Date | null = null;

  if (typeof json.generated_at === 'string') {
    const date = new Date(json.generated_at);

    generatedAt = Number.isNaN(date.getTime()) ? null : date;
  }

  const windowHours = typeof json.window_hours === 'number' && Number.isFinite(json.window_hours) && json.window_hours > 0 ? json.window_hours : null;

  return {
    generatedAt,
    windowHours,
    top: parseMostTrackedList(json.top),
    trending: parseMostTrackedList(json.trending),
  };
};

/** Bar width (0-100, whole percent) of `count` relative to the largest count in its list. */
export const relativePopularity = (count: number, maxCount: number): number => {
  if (!(maxCount > 0) || !(count > 0)) {
    return 0;
  }

  return Math.max(1, Math.min(100, Math.round((count / maxCount) * 100)));
};
