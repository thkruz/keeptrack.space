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

const BLOCK_SIZE = 512;
const NAME_OFFSET = 0;
const NAME_LENGTH = 100;
const SIZE_OFFSET = 124;
const SIZE_LENGTH = 12;

/**
 * Read a NUL-terminated ASCII field from a tar header block. The name field is
 * NUL-padded and may legitimately contain spaces, so only NUL terminates here;
 * numeric fields are space-padded and rely on the caller trimming the result.
 */
function readString_(block: Uint8Array, offset: number, length: number): string {
  let end = offset;
  const limit = offset + length;

  while (end < limit && block[end] !== 0) {
    end++;
  }

  return new TextDecoder().decode(block.subarray(offset, end));
}

/**
 * Parse the octal file size from a tar header block. Returns 0 for an empty field.
 */
function readOctalSize_(block: Uint8Array, offset: number, length: number): number {
  const raw = readString_(block, offset, length).trim();

  if (raw === '') {
    return 0;
  }

  const parsed = parseInt(raw, 8);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Returns true if every byte in the block is zero (a tar end-of-archive marker).
 */
function isZeroBlock_(block: Uint8Array): boolean {
  return block.every((byte) => byte === 0);
}

/**
 * Extract the contents of the first entry in an (uncompressed) USTAR archive
 * whose name satisfies the supplied predicate.
 *
 * This is a deliberately minimal reader: it understands the classic 512-byte
 * header/data block layout and octal size field, which is all that is needed to
 * pull a single known file out of an archive. It does not support GNU long-name
 * extensions or sparse files.
 *
 * @param tar - The raw, uncompressed tar bytes.
 * @param matches - Predicate evaluated against each entry's path within the archive.
 * @returns The matching entry's bytes, or null if no entry matched.
 */
export function extractTarEntry(tar: Uint8Array, matches: (name: string) => boolean): Uint8Array | null {
  let offset = 0;

  while (offset + BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);

    // Two consecutive zero blocks mark the end of the archive; a single one is
    // enough to treat the rest as padding for our purposes.
    if (isZeroBlock_(header)) {
      break;
    }

    const name = readString_(header, NAME_OFFSET, NAME_LENGTH);
    const size = readOctalSize_(header, SIZE_OFFSET, SIZE_LENGTH);
    const dataStart = offset + BLOCK_SIZE;

    if (matches(name)) {
      return tar.subarray(dataStart, dataStart + size);
    }

    // Advance past this entry's data, rounded up to the next 512-byte boundary.
    const paddedSize = Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;

    offset = dataStart + paddedSize;
  }

  return null;
}
