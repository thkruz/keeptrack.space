/**
 * DOM-free logic for the Transponder & Channel Data plugin.
 *
 * Everything here is pure (no DOM, no ServiceLocator, no event bus) so it can be
 * unit-tested in isolation. The plugin class wires this into the UI. Follows the
 * same `*-core.ts` split used by calculator-core and color-scheme-editor-core.
 */

/** A single broadcast channel entry as returned by the KeepTrack channels API. */
export interface ChannelInfo {
  satellite: string;
  tvchannel: string;
  beam: string;
  freq: string;
  system: string;
  SRFEC: string;
  video: string;
  lang: string;
  encryption: string;
}

export type ChannelColumnKey = keyof ChannelInfo;

export interface ChannelColumn {
  /** Property on {@link ChannelInfo}. */
  key: ChannelColumnKey;
  /** Suffix under `plugins.TransponderChannelData.table.` for the header label. */
  localeKey: string;
}

/**
 * Single source of truth for the channel table columns, used for the header
 * row, the body cells, and the export rows. Keeping one ordered list keeps the
 * header and body in lock-step (the old code built headers from
 * `Object.keys(data[0])` but bodies from `Object.values(row)`, so a row with a
 * different key order or a missing field silently shifted every column).
 */
export const CHANNEL_COLUMNS: ChannelColumn[] = [
  { key: 'satellite', localeKey: 'satellite' },
  { key: 'tvchannel', localeKey: 'tvchannel' },
  { key: 'beam', localeKey: 'beam' },
  { key: 'freq', localeKey: 'freq' },
  { key: 'system', localeKey: 'system' },
  { key: 'SRFEC', localeKey: 'SRFEC' },
  { key: 'video', localeKey: 'video' },
  { key: 'lang', localeKey: 'lang' },
  { key: 'encryption', localeKey: 'encryption' },
];

export type SortDirection = 'asc' | 'desc';

/**
 * Removes duplicate channel rows. Two rows are considered the same when their
 * channel name, frequency, and beam all match (the visible identity of a
 * broadcast on a given transponder).
 */
export const dedupeChannels = (data: ChannelInfo[]): ChannelInfo[] => {
  const uniqueData: ChannelInfo[] = [];
  const seen = new Set<string>();

  data.forEach((entry) => {
    const identifier = `${entry.tvchannel}-${entry.freq}-${entry.beam}`;

    if (!seen.has(identifier)) {
      seen.add(identifier);
      uniqueData.push(entry);
    }
  });

  return uniqueData;
};

/**
 * Returns a new array sorted by the given column. Uses a numeric-aware,
 * case-insensitive compare so "10773 H" and "9750 V" sort the way a human
 * expects. Does not mutate the input.
 */
export const sortChannels = (data: ChannelInfo[], key: ChannelColumnKey, dir: SortDirection): ChannelInfo[] => {
  const sorted = [...data].sort((a, b) => {
    const av = (a[key] ?? '').toString();
    const bv = (b[key] ?? '').toString();

    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
  });

  return dir === 'desc' ? sorted.reverse() : sorted;
};

/**
 * Filters rows to those where any column contains the query (case-insensitive
 * substring match). An empty/whitespace query returns the input unchanged.
 */
export const filterChannels = (data: ChannelInfo[], query: string): ChannelInfo[] => {
  const q = query.trim().toLowerCase();

  if (q === '') {
    return data;
  }

  return data.filter((entry) =>
    CHANNEL_COLUMNS.some((col) => (entry[col.key] ?? '').toString().toLowerCase().includes(q)),
  );
};

/** Builds plain export rows (shallow copies) for CSV/XLSX serialization. */
export const buildExportRows = (data: ChannelInfo[]): Array<Record<string, string>> =>
  data.map((info) => {
    const row: Record<string, string> = {};

    CHANNEL_COLUMNS.forEach((col) => {
      row[col.key] = (info[col.key] ?? '').toString();
    });

    return row;
  });
