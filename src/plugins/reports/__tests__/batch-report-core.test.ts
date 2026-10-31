import { applyBatchCap, BATCH_MAX_COUNT, BATCH_WARN_COUNT, batchTableToCsv, mergeBatchTables, resolveBatchIds, runChunked } from '../batch-report-core';
import type { ReportData } from '../reports-core';

const data = (headers: string[], rows: string[][]): ReportData => ({ filename: 'x', header: '', table: { headers, rows } });

describe('resolveBatchIds', () => {
  const deps = { selectedId: 7, searchIds: [3, 4, 4, 5], watchlistIds: [9, -1, 9, 2] };

  it('uses the selected object', () => {
    expect(resolveBatchIds('selected', deps)).toEqual([7]);
    expect(resolveBatchIds('selected', { ...deps, selectedId: null })).toEqual([]);
  });

  it('de-duplicates search results', () => {
    expect(resolveBatchIds('search', deps)).toEqual([3, 4, 5]);
  });

  it('de-duplicates the watchlist and drops invalid ids', () => {
    expect(resolveBatchIds('watchlist', deps)).toEqual([9, 2]);
  });
});

describe('applyBatchCap', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('passes small sets through without confirmation', () => {
    const r = applyBatchCap(ids(BATCH_WARN_COUNT));

    expect(r.needsConfirm).toBe(false);
    expect(r.truncated).toBe(false);
    expect(r.ids).toHaveLength(BATCH_WARN_COUNT);
  });

  it('asks for confirmation above the warn count', () => {
    expect(applyBatchCap(ids(BATCH_WARN_COUNT + 1)).needsConfirm).toBe(true);
  });

  it('truncates above the hard cap and reports how many were dropped', () => {
    const r = applyBatchCap(ids(BATCH_MAX_COUNT + 10));

    expect(r.truncated).toBe(true);
    expect(r.ids).toHaveLength(BATCH_MAX_COUNT);
    expect(r.dropped).toBe(10);
  });
});

describe('mergeBatchTables', () => {
  it('prefixes NORAD and Name and keeps one row per event', () => {
    const merged = mergeBatchTables([
      {
        sccNum: '25544',
        name: 'ISS',
        data: data(
          ['AOS', 'LOS'],
          [
            ['a1', 'l1'],
            ['a2', 'l2'],
          ]
        ),
      },
      { sccNum: '43013', name: 'NOAA 20', data: data(['AOS', 'LOS'], [['b1', 'm1']]) },
    ]);

    expect(merged.table.headers).toEqual(['NORAD', 'Name', 'AOS', 'LOS']);
    expect(merged.table.rows).toEqual([
      ['25544', 'ISS', 'a1', 'l1'],
      ['25544', 'ISS', 'a2', 'l2'],
      ['43013', 'NOAA 20', 'b1', 'm1'],
    ]);
    expect(merged.objectsWithRows).toBe(2);
  });

  it('builds the header union and blanks missing cells', () => {
    const merged = mergeBatchTables([
      { sccNum: '1', name: 'A', data: data(['x', 'y'], [['1', '2']]) },
      { sccNum: '2', name: 'B', data: data(['y', 'z'], [['3', '4']]) },
    ]);

    expect(merged.table.headers).toEqual(['NORAD', 'Name', 'x', 'y', 'z']);
    expect(merged.table.rows).toEqual([
      ['1', 'A', '1', '2', ''],
      ['2', 'B', '', '3', '4'],
    ]);
  });

  it('counts empty and failed objects', () => {
    const merged = mergeBatchTables([
      { sccNum: '1', name: 'A', data: data(['x'], []) },
      { sccNum: '2', name: 'B', data: null },
      { sccNum: '3', name: 'C', data: data(['x'], [['v']]) },
    ]);

    expect(merged.objectsEmpty).toBe(1);
    expect(merged.objectsFailed).toBe(1);
    expect(merged.objectsWithRows).toBe(1);
  });

  it('cuts output at the row cap', () => {
    const merged = mergeBatchTables([{ sccNum: '1', name: 'A', data: data(['x'], [['1'], ['2'], ['3']]) }], 2);

    expect(merged.table.rows).toHaveLength(2);
    expect(merged.rowsTruncated).toBe(true);
  });

  it('reads legacy body reports', () => {
    const legacy: ReportData = { filename: 'x', header: '', body: 'h1,h2\n1,2' };
    const merged = mergeBatchTables([{ sccNum: '1', name: 'A', data: legacy }]);

    expect(merged.table.rows).toEqual([['1', 'A', '1', '2']]);
  });
});

describe('batchTableToCsv', () => {
  it('escapes commas, quotes and newlines', () => {
    const csv = batchTableToCsv({
      headers: ['NORAD', 'Name'],
      rows: [
        ['1', 'COSMOS 2251, DEB'],
        ['2', 'say "hi"'],
        ['3', 'a\nb'],
      ],
    });

    expect(csv).toBe('NORAD,Name\n1,"COSMOS 2251, DEB"\n2,"say ""hi"""\n3,"a\nb"');
  });
});

describe('runChunked', () => {
  it('yields when a slice exceeds the budget and reports progress', async () => {
    let t = 0;
    const yieldFn = vi.fn(async () => undefined);
    const progress: number[] = [];

    const out = await runChunked([1, 2, 3, 4], (n) => n * 2, {
      sliceMs: 10,
      now: () => {
        t += 6;

        return t;
      },
      yieldFn,
      onProgress: (done) => progress.push(done),
    });

    expect(out).toEqual([2, 4, 6, 8]);
    expect(progress).toEqual([1, 2, 3, 4]);
    expect(yieldFn).toHaveBeenCalled();
  });

  it('stops when cancelled', async () => {
    let calls = 0;
    const out = await runChunked([1, 2, 3], (n) => n, { yieldFn: async () => undefined, isCancelled: () => calls++ >= 1 });

    expect(out).toEqual([1]);
  });
});
