import { DopList } from '@app/engine/math/dop-math';

/**
 * Pure, DOM-free helpers shared by the OSS and Pro DOP plugins. Keeping these
 * out of the plugin classes lets them be unit tested without a UI and removes
 * the duplicated best/worst scan that previously lived in both the results
 * table and the summary computation.
 */

/** Validates an observer location for a DOP query. */
export function isValidLocation(lat: number, lon: number, alt: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180 && Number.isFinite(alt);
}

export interface BestWorstHdop {
  /** Index of the entry with the lowest (best) HDOP, or -1 if none are finite. */
  bestIdx: number;
  /** Index of the entry with the highest (worst) HDOP, or -1 if none are finite. */
  worstIdx: number;
}

/**
 * Finds the indices of the best (lowest) and worst (highest) HDOP entries in a
 * DOP list. Entries whose HDOP does not parse to a finite number are skipped.
 * Returns -1 for an index when no finite HDOP exists.
 */
export function findBestWorstHdop(dopsList: DopList): BestWorstHdop {
  let bestIdx = -1;
  let worstIdx = -1;
  let bestVal = Infinity;
  let worstVal = -Infinity;

  for (let i = 0; i < dopsList.length; i++) {
    const val = parseFloat(dopsList[i].dops.hdop);

    if (!Number.isFinite(val)) {
      continue;
    }

    if (val < bestVal) {
      bestVal = val;
      bestIdx = i;
    }
    if (val > worstVal) {
      worstVal = val;
      worstIdx = i;
    }
  }

  return { bestIdx, worstIdx };
}

export interface DopCsvRow {
  [key: string]: string | number;
  time: string;
  hdop: string;
  vdop: string;
  pdop: string;
  gdop: string;
  tdop: string;
  visibleSats: number;
}

/** Maps a DOP list into flat rows suitable for CSV export. */
export function dopsToCsvRows(dopsList: DopList): DopCsvRow[] {
  return dopsList.map((entry) => ({
    time: entry.time.toISOString(),
    hdop: entry.dops.hdop,
    vdop: entry.dops.vdop,
    pdop: entry.dops.pdop,
    gdop: entry.dops.gdop,
    tdop: entry.dops.tdop,
    visibleSats: entry.visibleSats,
  }));
}
