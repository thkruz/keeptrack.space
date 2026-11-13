import { TearrType } from '@app/app/sensors/sensor-math';

/** Minimal shape of a look-angle row the framing plan needs. */
export interface FramingLook {
  time: string;
  type?: TearrType;
  inProgress?: boolean;
}

export interface FramingResult {
  /** Seconds of the exposure window spent inside the sensor field of view. */
  inFrameSec: number;
  /** Exposure length that was asked for, in seconds. */
  lengthSec: number;
  /** When the satellite leaves the frame inside the window (ms epoch), or null when it stays in or never enters. */
  exitMs: number | null;
  /** When the satellite enters the frame inside the window (ms epoch), or null when it is already in or never enters. */
  entryMs: number | null;
}

/** Parse a look-angle time string (`YYYY-MM-DD HH:MM:SS[.sss][Z]`) as UTC milliseconds. */
export const lookTimeToMs = (time: string): number => Date.parse(/z$/iu.test(time) ? time.replace(' ', 'T') : `${time.replace(' ', 'T')}Z`);

/**
 * Parse the exposure start typed by the user. Accepts a full UTC date and time
 * (`2026-11-04 05:33:30`, `2026-11-04T05:33:30Z`) or a bare `HH:MM:SS` / `HH:MM`, which borrows the
 * UTC date of `referenceMs` (the simulation time). Returns NaN when it cannot be read.
 */
export const parseExposureStart = (text: string, referenceMs: number): number => {
  const trimmed = text.trim();

  if (trimmed === '') {
    return Number.NaN;
  }
  const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/u.exec(trimmed);

  if (timeOnly) {
    const [h, m, s] = [Number(timeOnly[1]), Number(timeOnly[2]), Number(timeOnly[3] ?? 0)];

    if (h > 23 || m > 59 || s > 59) {
      return Number.NaN;
    }
    const day = new Date(referenceMs);

    return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m, s);
  }
  if (!/^\d{4}-\d{2}-\d{2}/u.test(trimmed)) {
    return Number.NaN;
  }

  return lookTimeToMs(trimmed);
};

/**
 * In-view intervals (ms) from look-angle rows: an interval opens at a Rise row (or the in-progress
 * row) and closes at the next Set row. A pass still open at the last row is closed there.
 */
export const inViewIntervals = (looks: FramingLook[]): Array<[number, number]> => {
  const intervals: Array<[number, number]> = [];
  let openMs: number | null = null;
  let lastMs = Number.NaN;

  for (const look of looks) {
    const ms = lookTimeToMs(look.time);

    if (!Number.isFinite(ms)) {
      continue;
    }
    lastMs = ms;
    if (look.inProgress || look.type === TearrType.RISE || look.type === TearrType.RISE_AND_MAX_EL) {
      openMs ??= ms;
    } else if (look.type === TearrType.SET && openMs !== null) {
      intervals.push([openMs, ms]);
      openMs = null;
    }
  }
  if (openMs !== null && Number.isFinite(lastMs) && lastMs > openMs) {
    intervals.push([openMs, lastMs]);
  }

  return intervals;
};

/** Seconds of [startMs, startMs + lengthSec] spent in view, plus the entry and exit instants inside the window. */
export const computeFraming = (looks: FramingLook[], startMs: number, lengthSec: number): FramingResult => {
  const endMs = startMs + lengthSec * 1000;
  let inFrameMs = 0;
  let exitMs: number | null = null;
  let entryMs: number | null = null;

  for (const [from, to] of inViewIntervals(looks)) {
    const overlapFrom = Math.max(from, startMs);
    const overlapTo = Math.min(to, endMs);

    if (overlapTo <= overlapFrom) {
      continue;
    }
    inFrameMs += overlapTo - overlapFrom;
    if (from > startMs) {
      entryMs ??= from;
    }
    if (to < endMs) {
      exitMs = to;
    }
  }

  return { inFrameSec: Math.round(inFrameMs / 1000), lengthSec, exitMs, entryMs };
};

const hms = (ms: number): string => new Date(ms).toISOString().slice(11, 19);

/** One-line plain text for the menu: "27 s of 30 s in frame, leaves 05:33:57Z". */
export const describeFraming = (result: FramingResult, labels: { inFrame: string; enters: string; leaves: string; none: string }): string => {
  if (result.inFrameSec === 0) {
    return labels.none;
  }
  const parts = [`${result.inFrameSec} s / ${result.lengthSec} s ${labels.inFrame}`];

  if (result.entryMs !== null) {
    parts.push(`${labels.enters} ${hms(result.entryMs)}Z`);
  }
  if (result.exitMs !== null) {
    parts.push(`${labels.leaves} ${hms(result.exitMs)}Z`);
  }

  return parts.join(', ');
};
