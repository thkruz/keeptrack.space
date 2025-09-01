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
    errorManagerInstance.error(e, 'saveVariable', 'Error in saving variable!');
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

/**
 * Saves an array of objects as a CSV file.
 * @param items The array of objects to be saved as CSV.
 * @param name The name of the CSV file to be saved. Defaults to 'data'.
 */
export const saveCsv = <T extends Record<string, unknown>>(items: Array<T>, name?: string): void => {
  try {
    const csv = Papa.unparse(items);
    const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' });

    if (!saveAs) {
      throw new Error('saveAs is unavailable!');
    }
    name ??= 'data';
    saveAs(blob, `${name}.csv`);
  } catch (e) {
    if (!isThisNode()) {
      errorManagerInstance.error(e, 'saveVariable', 'Error in saving csv!');
    }
  }
};
