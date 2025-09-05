/**
 * /////////////////////////////////////////////////////////////////////////////
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

/**
 * Currently unused, but this is a utility to open a new tab with the variable details.
 * It will create a new tab with the variable details in a text/plain format.
 * It will also create a download link for the variable details as a .txt file.
 * This is useful for debugging and sharing variable details with others.
 */
export class NewTabUtils {
  static varToNewTab(variable: object, name = 'Variable Details') {
    const win = window.open('text/plain', 'variable-details');

    if (win) {
      const formattedSettings = Object.entries(variable)
        .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
        .join('\n');

      // Create a download button at the top so you can download the settings as a .txt file
      const downloadLink = `<a href="data:text/plain;charset=utf-8,${encodeURIComponent(formattedSettings)}" ` +
        `download="${name.toLowerCase().replace(/\s+/gu, '-')}.txt">Download ${name}</a><br><br>`;

      win.document.write(downloadLink);

      win.document.write(`<plaintext>${formattedSettings}`);
      win.document.title = name;
      win.history.replaceState(null, name, `/${name.toLowerCase().replace(/\s+/gu, '-')}.txt`);
    }
  }
}
