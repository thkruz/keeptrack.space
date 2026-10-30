/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * screening-diff.ts compares two conjunction screening runs (typically the
 * parent satellite before a maneuver and the analyst satellite after it) and
 * classifies every event as introduced, removed, unchanged, moved, appeared
 * or dropped. Pure: no DOM, no ServiceLocator.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2026 Kruczek Labs LLC
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

import type { ScreeningDiff, ScreeningDiffEntry, ScreeningDiffStatus, ScreeningEventSummary, ScreeningRiskLevel } from '@app/engine/conjunction/analysis-state';

/**
 * One screening event as the diff needs it. Structurally compatible with the
 * Debris Screening `DsResultRow` (extra fields are ignored).
 */
export interface ScreeningEventInput {
  secondaryId: string;
  tcaMs: number;
  missDistance: number;
  probabilityOfCollision: number | null;
}

/**
 * A completed screening run. This is the shape the Reports plugin expects from
 * `DebrisScreening.getRecentScreeningRuns()` (see the README for the accessor).
 */
export interface ScreeningRunInput {
  /** Screening key of the primary (its NORAD number). */
  primaryId: string;
  /** Screened window start, ms since the Unix epoch (null when unknown). */
  startTimeMs: number | null;
  /** Screened window end, ms since the Unix epoch (null when unknown). */
  endTimeMs: number | null;
  /** RIC search box half-widths (km), when the screen recorded them. */
  boxKm?: ScreeningBoxKm | null;
  rows: readonly ScreeningEventInput[];
}

/** RIC search box half-widths of a screening run (km). */
export interface ScreeningBoxKm {
  radial: number;
  intrack: number;
  crosstrack: number;
}

export interface ScreeningDiffOptions {
  /** Lowest risk band that counts as "of concern". Default `medium`. */
  concernThreshold?: ScreeningRiskLevel;
  /** Max TCA difference for two rows of the same secondary to be the same event. Default 15 min. */
  tcaMatchToleranceMs?: number;
  /**
   * Max TCA difference for two rows of the same secondary, left unpaired by the match tolerance,
   * to be reported as one `moved` encounter. Default 6 h. 0 turns moved pairing off.
   */
  movedToleranceMs?: number;
  /** Secondaries to leave out (the parent, the analyst objects). */
  excludeSecondaryIds?: readonly string[];
  /** Resolves a secondary id to a display name. */
  nameOf?: (secondaryId: string) => string;
  source?: ScreeningDiff['source'];
}

const DEFAULT_TCA_TOLERANCE_MS = 15 * 60 * 1000;
/**
 * Default reach of the moved pairing: about four LEO revolutions. One value serves every regime on purpose. A small
 * burn shifts a LEO encounter by minutes to an hour or two (half a period would already miss real shifts), and in
 * GEO repeat encounters with the same secondary come about 24 h apart, so 6 h cannot merge two distinct ones there.
 * Pairing is one-to-one and closest-TCA-first, which keeps LEO repeats from cross-pairing.
 */
const DEFAULT_MOVED_TOLERANCE_MS = 6 * 60 * 60 * 1000;
/** Windows that differ by less than this are treated as the same window. */
const WINDOW_MATCH_TOLERANCE_MS = 5 * 60 * 1000;

/** Rank used to compare risk bands; unknown sorts below low. */
const RISK_RANK: Record<ScreeningRiskLevel, number> = { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Risk band for a Pc, with the same thresholds the Debris Screening table uses
 * (critical > 1e-4, high > 1e-6, medium > 1e-8, else low).
 */
export const riskLevelFromPc = (pc: number | null | undefined): ScreeningRiskLevel => {
  if (typeof pc !== 'number' || !Number.isFinite(pc)) {
    return 'unknown';
  }
  if (pc > 1e-4) {
    return 'critical';
  }
  if (pc > 1e-6) {
    return 'high';
  }
  if (pc > 1e-8) {
    return 'medium';
  }

  return 'low';
};

/** Formats a Pc the way the Debris Screening table does. */
export const formatPc = (pc: number | null): string => {
  if (typeof pc !== 'number') {
    return 'N/A';
  }
  if (pc < 1e-12) {
    return '<1e-12';
  }

  return pc.toExponential(2);
};

const toSummary = (row: ScreeningEventInput, nameOf: (id: string) => string): ScreeningEventSummary => ({
  secondaryId: row.secondaryId,
  secondaryName: nameOf(row.secondaryId),
  tcaIso: new Date(row.tcaMs).toISOString(),
  tcaMs: row.tcaMs,
  missDistanceKm: row.missDistance,
  pc: row.probabilityOfCollision,
  riskLevel: riskLevelFromPc(row.probabilityOfCollision),
});

/**
 * Pairs pre and post rows of the same secondary whose TCAs are within the
 * tolerance, closest TCA first (each row is used at most once). A secondary can
 * have several approaches in a multi-day window, so pairing is per event, not
 * per secondary.
 */
const pairEvents = (
  pre: readonly ScreeningEventInput[],
  post: readonly ScreeningEventInput[],
  toleranceMs: number
): { pairs: [ScreeningEventInput, ScreeningEventInput][]; preOnly: ScreeningEventInput[]; postOnly: ScreeningEventInput[] } => {
  const candidates: { i: number; j: number; dt: number }[] = [];

  pre.forEach((a, i) => {
    post.forEach((b, j) => {
      const dt = Math.abs(a.tcaMs - b.tcaMs);

      if (a.secondaryId === b.secondaryId && dt <= toleranceMs) {
        candidates.push({ i, j, dt });
      }
    });
  });
  candidates.sort((x, y) => x.dt - y.dt);

  const usedPre = new Set<number>();
  const usedPost = new Set<number>();
  const pairs: [ScreeningEventInput, ScreeningEventInput][] = [];

  for (const { i, j } of candidates) {
    if (!usedPre.has(i) && !usedPost.has(j)) {
      usedPre.add(i);
      usedPost.add(j);
      pairs.push([pre[i], post[j]]);
    }
  }

  return {
    pairs,
    preOnly: pre.filter((_, i) => !usedPre.has(i)),
    postOnly: post.filter((_, j) => !usedPost.has(j)),
  };
};

/** Direction of a risk-band move. */
const riskChangeOf = (rankDelta: number): ScreeningDiffEntry['riskChange'] => {
  if (rankDelta > 0) {
    return 'up';
  }

  return rankDelta < 0 ? 'down' : 'same';
};

const STATUS_ORDER: Record<ScreeningDiffStatus, number> = { introduced: 0, removed: 1, moved: 2, unchanged: 3, appeared: 4, dropped: 5 };

const entryTca = (e: ScreeningDiffEntry): number => (e.post ?? e.pre)?.tcaMs ?? 0;

/** Boxes match when either is unknown or every half-width agrees to 1 m. */
const boxesMatch = (a: ScreeningBoxKm | null | undefined, b: ScreeningBoxKm | null | undefined): boolean => {
  if (!a || !b) {
    return true;
  }

  return Math.abs(a.radial - b.radial) < 1e-3 && Math.abs(a.intrack - b.intrack) < 1e-3 && Math.abs(a.crosstrack - b.crosstrack) < 1e-3;
};

/**
 * True when two runs screened the same window: same start, same length and
 * same RIC box (unknown values match anything).
 */
export const isSameScreeningWindow = (a: ScreeningRunInput, b: ScreeningRunInput): boolean => {
  if (a.startTimeMs !== null && b.startTimeMs !== null && Math.abs(a.startTimeMs - b.startTimeMs) > WINDOW_MATCH_TOLERANCE_MS) {
    return false;
  }
  if (a.startTimeMs !== null && b.startTimeMs !== null && a.endTimeMs !== null && b.endTimeMs !== null) {
    const lengthDelta = Math.abs(a.endTimeMs - a.startTimeMs - (b.endTimeMs - b.startTimeMs));

    if (lengthDelta > WINDOW_MATCH_TOLERANCE_MS) {
      return false;
    }
  }

  return boxesMatch(a.boxKm, b.boxKm);
};

/**
 * Picks the pre (parent) and post (analyst) runs for a maneuver diff from the
 * retained runs (newest first). Runs are matched by object and window (start,
 * length, box), never by storage order, so the parent and analyst may have
 * been screened in either order and other runs may sit between them. When
 * several pairs share a window, the most recent pair wins. When no pair shares
 * a window, the newest run of each object is returned (the diff then flags the
 * window mismatch). Null when either object has no run.
 */
export const pickScreeningRunPair = <T extends ScreeningRunInput>(runs: readonly T[], preId: string, postId: string): { pre: T; post: T } | null => {
  const preRuns = runs.map((run, index) => ({ run, index })).filter(({ run }) => run.primaryId === preId);
  const postRuns = runs.map((run, index) => ({ run, index })).filter(({ run }) => run.primaryId === postId);

  if (preRuns.length === 0 || postRuns.length === 0) {
    return null;
  }

  let best: { pre: T; post: T; age: number } | null = null;

  for (const a of preRuns) {
    for (const b of postRuns) {
      const age = Math.max(a.index, b.index);

      if (a.index !== b.index && isSameScreeningWindow(a.run, b.run) && (!best || age < best.age)) {
        best = { pre: a.run, post: b.run, age };
      }
    }
  }

  return best ? { pre: best.pre, post: best.post } : { pre: preRuns[0].run, post: postRuns[0].run };
};

/**
 * Compares a pre-maneuver screening run with a post-maneuver one.
 *
 * An event is "of concern" when its risk band is at or above the concern
 * threshold. Introduced and removed are about concern, not presence: a
 * secondary that was a Low 18 km event before and is a Medium 2 km event
 * after is introduced. Below-threshold presence changes are reported as
 * appeared / dropped so they do not drown the events that matter.
 *
 * Pairing rule (two passes, both one-to-one and closest TCA first):
 * 1. Same event: same secondary id and TCAs within `tcaMatchToleranceMs`
 *    (default 15 min). The pair is introduced, removed or unchanged by concern.
 * 2. Moved: rows still unpaired after pass 1 with the same secondary id and
 *    TCAs within `movedToleranceMs` (default 6 h) are one encounter that the
 *    maneuver shifted (a phasing burn can move the closest approach to an
 *    earlier or later pass of the same object). They become ONE `moved` row
 *    with the old and new TCA, miss and Pc; `riskChange` says whether the risk
 *    band went up or down. Without this pass the analyst saw "Removed" plus
 *    "Appeared (below threshold)" for one object and could read "Removed" as
 *    "gone". Rows of different secondaries never pair.
 */
export const diffScreeningRuns = (preRun: ScreeningRunInput, postRun: ScreeningRunInput, options: ScreeningDiffOptions = {}): ScreeningDiff => {
  const concernThreshold = options.concernThreshold ?? 'medium';
  const tcaMatchToleranceMs = options.tcaMatchToleranceMs ?? DEFAULT_TCA_TOLERANCE_MS;
  const excluded = new Set(options.excludeSecondaryIds ?? []);
  const nameOf = options.nameOf ?? (() => '');
  const isConcern = (row: ScreeningEventInput): boolean => RISK_RANK[riskLevelFromPc(row.probabilityOfCollision)] >= RISK_RANK[concernThreshold];
  const keep = (row: ScreeningEventInput): boolean => !excluded.has(row.secondaryId);

  const pre = preRun.rows.filter(keep);
  const post = postRun.rows.filter(keep);
  const movedToleranceMs = Math.max(options.movedToleranceMs ?? DEFAULT_MOVED_TOLERANCE_MS, tcaMatchToleranceMs);
  const { pairs, preOnly: preLeft, postOnly: postLeft } = pairEvents(pre, post, tcaMatchToleranceMs);
  const {
    pairs: movedPairs,
    preOnly,
    postOnly,
  } = movedToleranceMs > tcaMatchToleranceMs ? pairEvents(preLeft, postLeft, movedToleranceMs) : { pairs: [], preOnly: preLeft, postOnly: postLeft };
  const entries: ScreeningDiffEntry[] = [];
  const pairedEntry = (a: ScreeningEventInput, b: ScreeningEventInput, status: ScreeningDiffStatus): ScreeningDiffEntry => {
    const preSummary = toSummary(a, nameOf);
    const postSummary = toSummary(b, nameOf);

    return {
      status,
      secondaryId: a.secondaryId,
      secondaryName: preSummary.secondaryName,
      pre: preSummary,
      post: postSummary,
      missDeltaKm: b.missDistance - a.missDistance,
      riskChange: riskChangeOf(RISK_RANK[postSummary.riskLevel] - RISK_RANK[preSummary.riskLevel]),
    };
  };

  for (const [a, b] of pairs) {
    const preConcern = isConcern(a);
    const postConcern = isConcern(b);
    let status: ScreeningDiffStatus = 'unchanged';

    if (preConcern && !postConcern) {
      status = 'removed';
    } else if (!preConcern && postConcern) {
      status = 'introduced';
    }

    entries.push(pairedEntry(a, b, status));
  }

  for (const [a, b] of movedPairs) {
    entries.push(pairedEntry(a, b, 'moved'));
  }

  for (const a of preOnly) {
    const summary = toSummary(a, nameOf);

    entries.push({
      status: isConcern(a) ? 'removed' : 'dropped',
      secondaryId: a.secondaryId,
      secondaryName: summary.secondaryName,
      pre: summary,
      post: null,
      missDeltaKm: null,
      riskChange: null,
    });
  }

  for (const b of postOnly) {
    const summary = toSummary(b, nameOf);

    entries.push({
      status: isConcern(b) ? 'introduced' : 'appeared',
      secondaryId: b.secondaryId,
      secondaryName: summary.secondaryName,
      pre: null,
      post: summary,
      missDeltaKm: null,
      riskChange: null,
    });
  }

  entries.sort((x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status] || entryTca(x) - entryTca(y));

  const counts: Record<ScreeningDiffStatus, number> = { introduced: 0, removed: 0, unchanged: 0, moved: 0, appeared: 0, dropped: 0 };

  for (const e of entries) {
    counts[e.status]++;
  }

  const runInfo = (run: ScreeningRunInput, eventCount: number): ScreeningDiff['preRun'] => ({
    primaryId: run.primaryId,
    startIso: run.startTimeMs === null ? null : new Date(run.startTimeMs).toISOString(),
    endIso: run.endTimeMs === null ? null : new Date(run.endTimeMs).toISOString(),
    eventCount,
  });

  return {
    source: options.source ?? 'provided',
    preRun: runInfo(preRun, pre.length),
    postRun: runInfo(postRun, post.length),
    concernThreshold,
    tcaMatchToleranceMs,
    movedToleranceMs,
    excludedSecondaryIds: [...excluded],
    isWindowMismatch: !isSameScreeningWindow(preRun, postRun),
    counts,
    entries,
  };
};

/** Splits one CSV line, honouring double-quoted cells. */
const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);

  return cells.map((c) => c.trim());
};

/**
 * Parses a Debris Screening CSV export into screening rows. Accepts both the
 * older export (no name column) and the current one. A Pc of `<1e-12` is read
 * as 1e-12 (an upper bound; it bands as Low either way).
 */
export const parseScreeningCsv = (csv: string): ScreeningEventInput[] => {
  const lines = csv.split(/\r?\n/u).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  const col = (name: string): number => headers.indexOf(name);
  const idCol = col('Secondary');
  const tcaCol = col('TCA (UTC)');
  const missCol = col('Miss Distance (km)');
  const pcCol = col('Pc');

  if (idCol < 0 || tcaCol < 0 || missCol < 0) {
    throw new Error('Not a Debris Screening CSV: missing Secondary, TCA (UTC) or Miss Distance (km) column');
  }

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const pcText = pcCol >= 0 ? (cells[pcCol] ?? '') : '';
    let pc: number | null = null;

    if (pcText.startsWith('<')) {
      pc = parseFloat(pcText.slice(1));
    } else if (pcText.length > 0 && pcText !== 'N/A') {
      pc = parseFloat(pcText);
    }

    return {
      secondaryId: cells[idCol] ?? '',
      tcaMs: Date.parse(`${(cells[tcaCol] ?? '').replace(' ', 'T')}Z`),
      missDistance: parseFloat(cells[missCol] ?? ''),
      probabilityOfCollision: pc !== null && Number.isFinite(pc) ? pc : null,
    };
  });
};
