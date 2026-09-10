/**
 * TLE line checksum (mod-10) helpers for the Create Satellite plugin.
 *
 * Column 69 of each TLE line is a modulo-10 checksum of the first 68 columns
 * (digits count as their value, '-' counts as 1, everything else as 0). A
 * mismatch usually means a typo or a corrupted copy/paste, but many real-world
 * element sets circulate with stale checksums, so this is a caution rather
 * than an error: callers warn the user and continue.
 *
 * The mod-10 computation is reused from ootk (FormatTle.tleChecksum); this
 * module only compares it against the trailing digit and raises the toast.
 */
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { t7e } from '@app/locales/keys';
import { FormatTle } from '@ootk/src/main';

type T7eKey = Parameters<typeof t7e>[0];

/** Standard TLE line length; the checksum lives in the final column. */
const TLE_LINE_LENGTH = 69;

/** One TLE line whose trailing checksum digit does not match the computed value. */
export interface TleChecksumMismatch {
  /** 1-based TLE line number (1 or 2). */
  lineNumber: 1 | 2;
  /** The mod-10 checksum computed from the first 68 columns. */
  expected: number;
  /** The character actually found in column 69. */
  actual: string;
}

/**
 * Compare one TLE line's trailing checksum digit against the computed mod-10
 * value. Lines that are not full 69-column TLE lines return null: with no
 * checksum column to judge, the format validators own that failure mode.
 */
function checkLine(line: string, lineNumber: 1 | 2): TleChecksumMismatch | null {
  if (line.length < TLE_LINE_LENGTH) {
    return null;
  }

  const expected = FormatTle.tleChecksum(line);
  const actual = line.charAt(TLE_LINE_LENGTH - 1);

  return actual === expected.toString() ? null : { lineNumber, expected, actual };
}

/**
 * Collect the checksum mismatches of a TLE pair. An empty array means both
 * trailing digits match (or the lines are too short to carry a checksum).
 */
export function getTleChecksumMismatches(tle1: string, tle2: string): TleChecksumMismatch[] {
  const mismatches: TleChecksumMismatch[] = [];
  const line1 = checkLine(tle1, 1);
  const line2 = checkLine(tle2, 2);

  if (line1) {
    mismatches.push(line1);
  }
  if (line2) {
    mismatches.push(line2);
  }

  return mismatches;
}

/**
 * Show a caution toast for every TLE line whose checksum digit does not match
 * the computed mod-10 value. Never blocks: the caller should proceed with the
 * lines regardless of the return value.
 * @returns true if at least one caution was raised.
 */
export function warnOnTleChecksumMismatch(tle1: string, tle2: string): boolean {
  const mismatches = getTleChecksumMismatches(tle1, tle2);

  if (mismatches.length === 0) {
    return false;
  }

  const uiManager = ServiceLocator.getUiManager();

  for (const mismatch of mismatches) {
    uiManager.toast(
      t7e('plugins.CreateSat.errorMsgs.tleChecksumMismatch' as T7eKey)
        .replace('{line}', mismatch.lineNumber.toString())
        .replace('{expected}', mismatch.expected.toString())
        .replace('{actual}', mismatch.actual),
      ToastMsgType.caution,
      true
    );
  }

  return true;
}
