/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * report-formatter.ts turns a {@link ReportData} table into the text the report
 * window shows and the file the user downloads. It is pure (no DOM): the plugin
 * owns the popup/Blob/clipboard side-effects, this module only produces strings.
 *
 * Three output formats are supported: a fixed-width aligned text table (the
 * on-screen preview and .txt download), comma-separated values, and JSON.
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

import { ReportData, ReportTable } from './reports-core';

export type ReportFormat = 'text' | 'csv' | 'json';

export interface DownloadPayload {
  content: string;
  /** File extension without the dot. */
  ext: string;
  /** MIME type for the Blob. */
  mime: string;
}

/** Gap rendered between columns in the fixed-width layout. */
const COLUMN_GAP = '   ';

/**
 * Resolves the table to render. Built-in reports supply a structured
 * {@link ReportData.table}; externally registered reports built on the legacy
 * string `body` are parsed into one so both paths share the same formatters.
 */
export const resolveReportTable = (data: ReportData): ReportTable => {
  if (data.table) {
    return data.table;
  }

  const cells = (data.body ?? '').split('\n').map((line) => line.split(',').map((cell) => cell.trim()));

  // Legacy reports defaulted isHeaders to true; a false flag means no header row.
  if (data.isHeaders === false) {
    return { headers: [], rows: cells };
  }

  const [headers, ...rows] = cells;

  return { headers: headers ?? [], rows };
};

/**
 * Renders a fixed-width, column-aligned text table. Column widths are the max cell
 * length across the header AND every data row, so wide values (negative
 * coordinates, large ECI vectors) never break the alignment.
 */
export const formatFixedWidth = (table: ReportTable, emptyMessage?: string): string => {
  const colCount = Math.max(table.headers.length, ...table.rows.map((r) => r.length), 0);
  const widths = new Array<number>(colCount).fill(0);

  for (const row of [table.headers, ...table.rows]) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i], (cell ?? '').length);
    });
  }

  const renderRow = (row: string[]): string =>
    row
      .map((cell, i) => (cell ?? '').padEnd(widths[i]))
      .join(COLUMN_GAP)
      .trimEnd();

  const lines: string[] = [];

  if (table.headers.length > 0) {
    const headerLine = renderRow(table.headers);

    lines.push(headerLine, '-'.repeat(headerLine.length));
  }

  if (table.rows.length === 0 && emptyMessage) {
    lines.push(emptyMessage);
  } else {
    for (const row of table.rows) {
      lines.push(renderRow(row));
    }
  }

  return lines.join('\n');
};

/** Escapes a single CSV cell per RFC 4180 (quote if it holds a comma, quote, or newline). */
const csvCell = (cell: string): string => (/[",\n]/u.test(cell) ? `"${cell.replace(/"/gu, '""')}"` : cell);

/** Serializes the table as comma-separated values (data only, no metadata header). */
export const tableToCsv = (table: ReportTable): string => [table.headers, ...table.rows].map((row) => row.map(csvCell).join(',')).join('\n');

/** Serializes the data rows as an array of header-keyed JSON objects. */
export const tableToJson = (table: ReportTable): string => {
  const records = table.rows.map((row) => {
    const record: Record<string, string> = {};

    table.headers.forEach((header, i) => {
      record[header] = row[i] ?? '';
    });

    return record;
  });

  return JSON.stringify(records, null, 2);
};

/** The human-readable preview shown in the report window: metadata block + aligned table. */
export const buildPreviewText = (data: ReportData): string => `${data.header}${formatFixedWidth(resolveReportTable(data), data.emptyMessage)}`;

/** Builds the download payload for the chosen format. Text keeps the metadata header; CSV/JSON are pure data. */
export const buildDownloadPayload = (data: ReportData, format: ReportFormat): DownloadPayload => {
  const table = resolveReportTable(data);

  switch (format) {
    case 'csv':
      return { content: tableToCsv(table), ext: 'csv', mime: 'text/csv;charset=utf-8' };
    case 'json':
      return { content: tableToJson(table), ext: 'json', mime: 'application/json;charset=utf-8' };
    default:
      return { content: buildPreviewText(data), ext: 'txt', mime: 'text/plain;charset=utf-8' };
  }
};
