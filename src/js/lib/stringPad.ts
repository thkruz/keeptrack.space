/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * stringPad.ts contains the StringPad class, which provides utility methods for
 * padding strings with leading or trailing characters.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
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

export class StringPad {
  static pad(val: string, len = 0): string {
    return val.padStart(len, '0');
  }

  static padEmpty(num: string, size: number): string {
    return num.padStart(size + num.length, ' ');
  }

  static pad0(str: string, max: number): string {
    return str.padStart(max, '0');
  }

  static trail0(str: string, max: number): string {
    return str.padEnd(max, '0');
  }
}
