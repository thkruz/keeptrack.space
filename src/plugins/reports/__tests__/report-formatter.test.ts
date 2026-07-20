import { buildDownloadPayload, buildPreviewText, formatFixedWidth, resolveReportTable, tableToCsv, tableToJson } from '@app/plugins/reports/report-formatter';
import { ReportData, ReportTable } from '@app/plugins/reports/reports-core';

describe('report-formatter', () => {
  const table: ReportTable = {
    headers: ['Time', 'Value'],
    rows: [
      ['t1', '1'],
      ['t2', '-123456.789'],
    ],
  };

  describe('formatFixedWidth', () => {
    it('sizes each column to the widest cell across the header AND every row', () => {
      const out = formatFixedWidth(table);
      // lines: [0] header, [1] underline, [2] row t1, [3] row t2.
      const lines = out.split('\n');

      // The "Value" column must be wide enough for the long row value, not just the header.
      expect(lines[3]).toContain('-123456.789');
      // Header underline matches the rendered header line length.
      expect(lines[1]).toBe('-'.repeat(lines[0].length));
      // Every data row pads the Time column to the same width.
      const timeColWidth = Math.max('Time'.length, 't1'.length, 't2'.length);

      expect(lines[2].startsWith('t1'.padEnd(timeColWidth))).toBe(true);
    });

    it('renders the empty message when there are no rows', () => {
      const out = formatFixedWidth({ headers: ['A', 'B'], rows: [] }, 'Nothing here');

      expect(out).toContain('Nothing here');
    });
  });

  describe('tableToCsv', () => {
    it('joins headers and rows with commas', () => {
      expect(tableToCsv(table)).toBe('Time,Value\nt1,1\nt2,-123456.789');
    });

    it('quotes and escapes cells containing commas or quotes', () => {
      const csv = tableToCsv({ headers: ['a'], rows: [['x,y'], ['z"q']] });

      expect(csv).toBe('a\n"x,y"\n"z""q"');
    });
  });

  describe('tableToJson', () => {
    it('emits an array of header-keyed objects', () => {
      const parsed = JSON.parse(tableToJson(table)) as Record<string, string>[];

      expect(parsed).toEqual([
        { Time: 't1', Value: '1' },
        { Time: 't2', Value: '-123456.789' },
      ]);
    });
  });

  describe('resolveReportTable', () => {
    it('returns the structured table directly when present', () => {
      const data: ReportData = { filename: 'f', header: 'h', table };

      expect(resolveReportTable(data)).toBe(table);
    });

    it('parses a legacy CSV body into a table (header row by default)', () => {
      const data: ReportData = { filename: 'f', header: 'h', body: 'A,B\n1,2\n3,4' };
      const resolved = resolveReportTable(data);

      expect(resolved.headers).toEqual(['A', 'B']);
      expect(resolved.rows).toEqual([
        ['1', '2'],
        ['3', '4'],
      ]);
    });

    it('treats every legacy line as data when isHeaders is false', () => {
      const data: ReportData = { filename: 'f', header: 'h', body: 'a,1\nb,2', isHeaders: false };
      const resolved = resolveReportTable(data);

      expect(resolved.headers).toEqual([]);
      expect(resolved.rows).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });
  });

  describe('buildPreviewText / buildDownloadPayload', () => {
    const data: ReportData = { filename: 'f', header: 'META\n', table };

    it('prefixes the preview with the metadata header', () => {
      expect(buildPreviewText(data).startsWith('META\n')).toBe(true);
    });

    it('text payload keeps the metadata header and uses a .txt extension', () => {
      const payload = buildDownloadPayload(data, 'text');

      expect(payload.ext).toBe('txt');
      expect(payload.content).toContain('META');
    });

    it('csv payload is pure data with a .csv extension', () => {
      const payload = buildDownloadPayload(data, 'csv');

      expect(payload.ext).toBe('csv');
      expect(payload.content).not.toContain('META');
      expect(payload.content.startsWith('Time,Value')).toBe(true);
    });

    it('json payload parses and uses a .json extension', () => {
      const payload = buildDownloadPayload(data, 'json');

      expect(payload.ext).toBe('json');
      expect(() => JSON.parse(payload.content)).not.toThrow();
    });
  });
});
