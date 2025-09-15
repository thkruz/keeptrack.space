/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * stringPad.ts contains the StringPad class, which provides utility methods for
 * padding strings with leading or trailing characters.
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

export class StringPad {
  /**
   * Pads a string with leading zeros to a specified length.
   *
   * @deprecated use built-in padStart instead
   *
   * @param val - The string to pad.
   * @param len - The desired length of the padded string. Defaults to 0.
   * @returns The padded string.
   */
  static pad(val: string, len = 0): string {
    return val.padStart(len, '0');
  }

  /**
   * Pads an empty string with spaces to a specified size.
   *
   * @deprecated use built-in padStart instead
   *
   * @param num - The empty string to pad.
   * @param size - The desired size of the padded string.
   * @returns The padded string.
   */
  static padEmpty(num: string, size: number): string {
    return num.padStart(size + num.length, ' ');
  }

  /**
   * Pads a string with zeros to a specified length.
   *
   * @deprecated use built-in padStart instead
   *
   * @param str The string to pad.
   * @param max The maximum length of the padded string.
   * @returns The padded string.
   */
  static pad0(str: string, max: number): string {
    return str.padStart(max, '0');
  }

  /**
   * Pads a string with trailing zeros up to a specified length.
   *
   * @deprecated use built-in padEnd instead
   *
   * @param str - The string to pad with trailing zeros.
   * @param max - The maximum length of the padded string.
   * @returns The padded string.
   */
  static trail0(str: string, max: number): string {
    return str.padEnd(max, '0');
  }
}
