/**
 * Batch reports: run one single-object report over many objects (search results, the
 * watchlist) and merge the output into ONE combined CSV table with NORAD and name columns.
 * Everything here is pure (no DOM, no app singletons) so it can be unit tested directly.
 */
import { csvCell, resolveReportTable } from './report-formatter';
import type { ReportData, ReportTable } from './reports-core';

/** Where a batch takes its objects from. `selected` is the ordinary single-object report. */
export type BatchSource = 'selected' | 'search' | 'watchlist';

/** Above this many objects the user is asked to confirm before the batch starts. */
export const BATCH_WARN_COUNT = 500;
/** Objects beyond this are dropped from a batch (the user is told). */
export const BATCH_MAX_COUNT = 5000;
/** Rows beyond this are dropped (Excel holds 1,048,576 rows per sheet). */
export const BATCH_MAX_ROWS = 1_000_000;

/** Identifier columns prepended to every merged row. */
export const BATCH_ID_HEADERS = ['NORAD', 'Name'] as const;

/** The app state a source is resolved from; injected so tests need no singletons. */
export interface BatchSourceDeps {
  selectedId: number | null;
  searchIds: readonly number[];
  watchlistIds: readonly number[];
}

/** Resolves a source to a de-duplicated list of catalog ids, in source order. Invalid ids (negative, NaN) are dropped. */
export const resolveBatchIds = (source: BatchSource, deps: BatchSourceDeps): number[] => {
  let raw: readonly number[];

  switch (source) {
    case 'selected':
      raw = deps.selectedId === null ? [] : [deps.selectedId];
      break;
    case 'search':
      raw = deps.searchIds;
      break;
    case 'watchlist':
      raw = deps.watchlistIds;
      break;
    default:
      raw = [];
  }

  return [...new Set(raw)].filter((id) => Number.isInteger(id) && id >= 0);
};

/** Outcome of applying the size caps to a list of ids. */
export interface BatchCapResult {
  ids: number[];
  /** True when the list was cut to {@link BATCH_MAX_COUNT}. */
  truncated: boolean;
  /** Number of ids dropped by the hard cap. */
  dropped: number;
  /** True when the (possibly truncated) list is large enough to warrant a confirmation. */
  needsConfirm: boolean;
}

/** Applies the warn and hard caps. */
export const applyBatchCap = (ids: readonly number[], warnCount = BATCH_WARN_COUNT, maxCount = BATCH_MAX_COUNT): BatchCapResult => {
  const truncated = ids.length > maxCount;
  const kept = truncated ? ids.slice(0, maxCount) : [...ids];

  return { ids: kept, truncated, dropped: ids.length - kept.length, needsConfirm: kept.length > warnCount };
};

/** One object's result handed to {@link mergeBatchTables}. */
export interface BatchObjectResult {
  sccNum: string;
  name: string;
  /** The generated report, or null when the object was skipped or failed. */
  data: ReportData | null;
}

/** The merged table plus bookkeeping for the completion message. */
export interface BatchMergeResult {
  table: ReportTable;
  /** Objects that contributed at least one row. */
  objectsWithRows: number;
  /** Objects whose report was empty (e.g. no passes in the window). */
  objectsEmpty: number;
  /** Objects with no report (unsupported or generation failed). */
  objectsFailed: number;
  /** True when {@link BATCH_MAX_ROWS} cut the output short. */
  rowsTruncated: boolean;
}

/**
 * Merges per-object report tables into one. Headers are the union of every object's headers in
 * first-seen order (after NORAD and Name); a cell an object's table lacks is left blank.
 */
export const mergeBatchTables = (results: readonly BatchObjectResult[], maxRows = BATCH_MAX_ROWS): BatchMergeResult => {
  const tables: { result: BatchObjectResult; table: ReportTable }[] = [];
  const headerIndex = new Map<string, number>();
  const headers: string[] = [];
  let objectsFailed = 0;

  for (const result of results) {
    if (!result.data) {
      objectsFailed++;
      continue;
    }
    const table = resolveReportTable(result.data);

    for (const header of table.headers) {
      if (!headerIndex.has(header)) {
        headerIndex.set(header, headers.length);
        headers.push(header);
      }
    }
    tables.push({ result, table });
  }

  const rows: string[][] = [];
  let objectsWithRows = 0;
  let objectsEmpty = 0;
  let rowsTruncated = false;

  for (const { result, table } of tables) {
    if (table.rows.length === 0) {
      objectsEmpty++;
      continue;
    }
    objectsWithRows++;
    const mapping = table.headers.map((header) => headerIndex.get(header) as number);

    for (const row of table.rows) {
      if (rows.length >= maxRows) {
        rowsTruncated = true;
        break;
      }
      const merged: string[] = new Array<string>(headers.length).fill('');

      mapping.forEach((target, i) => {
        merged[target] = row[i] ?? '';
      });
      rows.push([result.sccNum, result.name, ...merged]);
    }
  }

  return {
    table: { headers: [...BATCH_ID_HEADERS, ...headers], rows },
    objectsWithRows,
    objectsEmpty,
    objectsFailed,
    rowsTruncated,
  };
};

/** Serializes a merged table as CSV (RFC 4180 quoting; no BOM, the download helper adds it). */
export const batchTableToCsv = (table: ReportTable): string => [table.headers, ...table.rows].map((row) => row.map(csvCell).join(',')).join('\n');

/** Options for {@link runChunked}. */
export interface RunChunkedOptions<T> {
  /** Longest uninterrupted work slice before yielding to the event loop (ms). */
  sliceMs?: number;
  onProgress?: (done: number, total: number) => void;
  /** Checked between items; true stops the run early. */
  isCancelled?: () => boolean;
  /** Yield implementation (tests inject a no-op). */
  yieldFn?: () => Promise<void>;
  /** Clock (tests inject a fake). */
  now?: () => number;
  /** Called per item with its result. */
  onResult?: (item: T, index: number) => void;
}

const defaultYield = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Runs `work` over `items`, yielding to the event loop whenever a slice exceeds `sliceMs` so the
 * UI keeps painting and the progress text updates. Returns the results of the items processed
 * (fewer than `items` when cancelled).
 */
export const runChunked = async <T, R>(items: readonly T[], work: (item: T, index: number) => R, options: RunChunkedOptions<T> = {}): Promise<R[]> => {
  const sliceMs = options.sliceMs ?? 12;
  const now = options.now ?? (() => performance.now());
  const yieldFn = options.yieldFn ?? defaultYield;
  const out: R[] = [];
  let sliceStart = now();

  for (let i = 0; i < items.length; i++) {
    if (options.isCancelled?.()) {
      break;
    }
    out.push(work(items[i], i));
    options.onResult?.(items[i], i);
    options.onProgress?.(i + 1, items.length);

    if (now() - sliceStart >= sliceMs) {
      // biome-ignore lint/performance/noAwaitInLoops: the loop is sequential on purpose; each yield lets the UI repaint between slices
      await yieldFn();
      sliceStart = now();
    }
  }

  return out;
};
