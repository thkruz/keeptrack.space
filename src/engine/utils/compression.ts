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

/** Compress a string to gzipped Uint8Array using native CompressionStream. */
export async function compressToGzip(jsonString: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(jsonString));
      controller.close();
    },
  });

  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const reader = compressedStream.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();

    if (done) {
      break;
    }
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Decompress a gzipped Uint8Array to raw bytes using native DecompressionStream.
 * Use this for binary payloads (e.g. a tar archive); use {@link decompressFromGzip}
 * when the decompressed content is text.
 */
export async function decompressGzipToBytes(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });

  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const reader = decompressedStream.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();

    if (done) {
      break;
    }
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/** Decompress a gzipped Uint8Array to string using native DecompressionStream. */
export async function decompressFromGzip(data: Uint8Array): Promise<string> {
  const bytes = await decompressGzipToBytes(data);

  return new TextDecoder().decode(bytes);
}
