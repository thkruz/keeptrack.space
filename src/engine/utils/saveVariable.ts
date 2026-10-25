/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * saveVariable.ts exports two functions saveVariable and saveCsv that save a variable
 * and an array of objects as a text file and a CSV file respectively. The file also imports
 * saveAs function from file-saver library and errorManagerInstance singleton from
 * errorManager.ts file.
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

import { t7e } from '@app/locales/keys';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { errorManagerInstance } from './errorManager';
import { isThisNode } from './isThisNode';

/**
 * Saves a variable as a text file.
 * @param variable The variable to be saved as a text file.
 * @param filename The name of the text file to be saved. Defaults to 'variable.txt'.
 */
export const saveVariable = <T>(variable: T, filename?: string): void => {
  try {
    filename = filename || 'variable.txt';
    const variableStr = JSON.stringify(variable, getCircularReplacer());
    const blob = new Blob([variableStr], { type: 'text/plain;charset=utf-8' });

    if (!saveAs) {
      throw new Error('saveAs is unavailable!');
    }
    saveAs(blob, filename);
  } catch (e) {
    errorManagerInstance.error(e, 'saveVariable', t7e('errorMsgs.SaveVariable.variable'));
  }
};

/**
 * Returns a replacer function that can be used with JSON.stringify to handle circular references.
 * @returns A replacer function that replaces circular references with null.
 */
export const getCircularReplacer = () => {
  const seen = new WeakSet();

  return (_key: string, value: object) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return null;
      }
      seen.add(value);
    }

    return value;
  };
};

/** UTF-8 byte order mark. Excel on Windows needs it to read a CSV as UTF-8 instead of the ANSI codepage. */
export const UTF8_BOM = String.fromCharCode(0xfeff);

/** MIME type used for every CSV download. */
export const CSV_MIME = 'text/csv;charset=utf-8';

/**
 * Builds the Blob for a CSV download: prepends a UTF-8 BOM (so Excel shows
 * symbols such as degree and plus-minus correctly) and tags it as UTF-8 CSV.
 * Text that already starts with a BOM is not given a second one. Every CSV
 * export in the app goes through this helper.
 * @param text The CSV text.
 */
export const createCsvBlob = (text: string): Blob => new Blob([text.startsWith(UTF8_BOM) ? text : `${UTF8_BOM}${text}`], { type: CSV_MIME });

/**
 * Removes a leading UTF-8 BOM, if present. Use it when parsing CSV text that
 * may have come from one of our own exports.
 * @param text The CSV text.
 */
export const stripUtf8Bom = (text: string): string => (text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text);

/**
 * Saves an array of objects as a CSV file.
 * @param items The array of objects to be saved as CSV.
 * @param name The name of the CSV file to be saved. Defaults to 'data'.
 */
export const saveCsv = <T extends Record<string, unknown>>(items: Array<T>, name?: string): void => {
  try {
    const blob = createCsvBlob(Papa.unparse(items));

    if (!saveAs) {
      throw new Error('saveAs is unavailable!');
    }
    name ??= 'data';
    saveAs(blob, `${name}.csv`);
  } catch (e) {
    if (!isThisNode()) {
      errorManagerInstance.error(e, 'saveVariable', t7e('errorMsgs.SaveVariable.csv'));
    }
  }
};

/**
 * Saves an array of objects as an XLSX file.
 * Uses dynamic import to avoid adding xlsx to the main bundle.
 * @param items The array of objects to be saved as XLSX.
 * @param name The name of the XLSX file to be saved. Defaults to 'data'.
 */
export const saveXlsx = async <T extends Record<string, unknown>>(items: Array<T>, name?: string): Promise<void> => {
  try {
    const XLSX = await import('@e965/xlsx');
    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    name ??= 'data';
    XLSX.writeFile(wb, `${name}.xlsx`);
  } catch (e) {
    if (!isThisNode()) {
      errorManagerInstance.error(e, 'saveVariable', t7e('errorMsgs.SaveVariable.xlsx'));
    }
  }
};

/** Tabular export formats offered to the user. */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * Saves an array of objects in the requested tabular format, dispatching to
 * {@link saveCsv} or {@link saveXlsx}. Lets a single download action offer both
 * formats without callers branching on the format themselves.
 * @param items The array of objects to save.
 * @param name The base file name (extension is added by the format helper).
 * @param format Either 'csv' or 'xlsx'. Defaults to 'csv'.
 */
export const saveTable = <T extends Record<string, unknown>>(items: Array<T>, name: string, format: ExportFormat = 'csv'): void => {
  if (format === 'xlsx') {
    saveXlsx(items, name).catch((e) => errorManagerInstance.error(e, 'saveTable', t7e('errorMsgs.SaveVariable.xlsx')));

    return;
  }
  saveCsv(items, name);
};

/**
 * Copies an array of objects as TSV (tab-separated values) to the clipboard.
 * @param items The array of objects to copy as TSV.
 */
export const copyTsvToClipboard = async <T extends Record<string, unknown>>(items: Array<T>): Promise<void> => {
  try {
    const tsv = Papa.unparse(items, { delimiter: '\t' });

    await navigator.clipboard.writeText(tsv);
  } catch (e) {
    if (!isThisNode()) {
      errorManagerInstance.error(e, 'saveVariable', t7e('errorMsgs.SaveVariable.clipboard'));
    }
  }
};
