/**
 * webm-duration.ts adds the missing Segment Info Duration to a MediaRecorder WebM.
 *
 * Chrome's MediaRecorder streams WebM with an unknown-size Segment and no Duration
 * element, so players show no length and cannot seek. Only the file head needs to change:
 * this helper parses the EBML header, the Segment header and the Segment's first
 * children up to Info, then writes (or overwrites) an 8-byte float Duration inside Info.
 *
 * It refuses (returns null) whenever an edit could invalidate the rest of the file:
 * a SeekHead or Cues before Info (they hold byte offsets that an insertion would shift),
 * an unknown-size Info, or a head that does not contain the whole Info element.
 */

const ID_EBML = 0x1a45dfa3;
const ID_SEGMENT = 0x18538067;
const ID_SEEK_HEAD = 0x114d9b74;
const ID_CUES = 0x1c53bb6b;
const ID_CLUSTER = 0x1f43b675;
const ID_INFO = 0x1549a966;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;

/** Matroska default: TimecodeScale 1,000,000 ns, so Duration is in milliseconds. */
const DEFAULT_TIMECODE_SCALE_NS = 1_000_000;

interface Vint_ {
  value: number;
  length: number;
  /** All value bits set: the EBML "unknown size" marker. */
  isUnknown: boolean;
}

/** Read an element ID (marker bits kept), or null when the bytes run out or are invalid. */
function readId_(bytes: Uint8Array, pos: number): Vint_ | null {
  const first = bytes[pos];

  if (first === undefined || first === 0) {
    return null;
  }
  const length = Math.clz32(first) - 23;

  if (length > 4 || pos + length > bytes.length) {
    return null;
  }
  let value = 0;

  for (let i = 0; i < length; i++) {
    value = value * 256 + bytes[pos + i];
  }

  return { value, length, isUnknown: false };
}

/** Read an element data size (marker bit removed). */
function readSize_(bytes: Uint8Array, pos: number): Vint_ | null {
  const first = bytes[pos];

  if (first === undefined || first === 0) {
    return null;
  }
  const length = Math.clz32(first) - 23;

  if (pos + length > bytes.length) {
    return null;
  }
  let value = first & (0xff >> length);
  let isUnknown = value === 0xff >> length;

  for (let i = 1; i < length; i++) {
    const b = bytes[pos + i];

    value = value * 256 + b;
    isUnknown &&= b === 0xff;
  }

  return { value, length, isUnknown };
}

/** Encode a data size as an EBML vint of exactly `length` bytes, or null when it does not fit. */
function encodeSize_(value: number, length: number): Uint8Array | null {
  // 2^(7 * length) - 1 is reserved for "unknown"; stay below it.
  if (length < 1 || length > 8 || value >= 2 ** (7 * length) - 1) {
    return null;
  }
  const out = new Uint8Array(length);
  let rest = value;

  for (let i = length - 1; i >= 0; i--) {
    out[i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  out[0] |= 0x80 >> (length - 1);

  return out;
}

/** Encode a size in the original width when possible, else the narrowest width that fits. */
function encodeSizePreferWidth_(value: number, preferred: number): Uint8Array | null {
  const same = encodeSize_(value, preferred);

  if (same) {
    return same;
  }
  for (let length = 1; length <= 8; length++) {
    const encoded = encodeSize_(value, length);

    if (encoded) {
      return encoded;
    }
  }

  return null;
}

function readUint_(bytes: Uint8Array, pos: number, size: number): number {
  let value = 0;

  for (let i = 0; i < size; i++) {
    value = value * 256 + bytes[pos + i];
  }

  return value;
}

function concat_(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
}

/**
 * Return a copy of the WebM head with Info's Duration set to `durationMs`, or null when the
 * head cannot be patched safely (the caller then keeps the original bytes).
 *
 * `head` may be a prefix of the file: everything after Info is copied through untouched, so the
 * returned bytes replace exactly `head.length` bytes of the original.
 */
export function injectWebmDuration(head: Uint8Array, durationMs: number): Uint8Array | null {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  // EBML header
  const ebmlId = readId_(head, 0);

  if (ebmlId?.value !== ID_EBML) {
    return null;
  }
  const ebmlSize = readSize_(head, ebmlId.length);

  if (!ebmlSize || ebmlSize.isUnknown) {
    return null;
  }
  const segmentPos = ebmlId.length + ebmlSize.length + ebmlSize.value;

  // Segment header
  const segmentId = readId_(head, segmentPos);

  if (segmentId?.value !== ID_SEGMENT) {
    return null;
  }
  const segmentSizePos = segmentPos + segmentId.length;
  const segmentSize = readSize_(head, segmentSizePos);

  if (!segmentSize) {
    return null;
  }

  // Walk the Segment's children until Info.
  let pos = segmentSizePos + segmentSize.length;

  while (pos < head.length) {
    const id = readId_(head, pos);
    const size = id ? readSize_(head, pos + id.length) : null;

    if (!id || !size || size.isUnknown) {
      return null;
    }
    if (id.value === ID_SEEK_HEAD || id.value === ID_CUES || id.value === ID_CLUSTER) {
      return null;
    }
    const dataPos = pos + id.length + size.length;

    if (id.value === ID_INFO) {
      return patchInfo_(head, { segmentSizePos, segmentSize, infoPos: pos, infoId: id, infoSize: size, dataPos }, durationMs);
    }
    pos = dataPos + size.value;
  }

  return null;
}

interface InfoLocation_ {
  segmentSizePos: number;
  segmentSize: Vint_;
  infoPos: number;
  infoId: Vint_;
  infoSize: Vint_;
  dataPos: number;
}

function patchInfo_(head: Uint8Array, loc: InfoLocation_, durationMs: number): Uint8Array | null {
  const dataEnd = loc.dataPos + loc.infoSize.value;

  if (dataEnd > head.length) {
    return null;
  }

  let timecodeScale = DEFAULT_TIMECODE_SCALE_NS;
  let duration: { pos: number; size: number } | null = null;
  let pos = loc.dataPos;

  while (pos < dataEnd) {
    const id = readId_(head, pos);
    const size = id ? readSize_(head, pos + id.length) : null;

    if (!id || !size || size.isUnknown) {
      return null;
    }
    const childData = pos + id.length + size.length;

    if (childData + size.value > dataEnd) {
      return null;
    }
    if (id.value === ID_TIMECODE_SCALE && size.value >= 1 && size.value <= 6) {
      timecodeScale = readUint_(head, childData, size.value) || DEFAULT_TIMECODE_SCALE_NS;
    } else if (id.value === ID_DURATION) {
      duration = { pos: childData, size: size.value };
    }
    pos = childData + size.value;
  }

  const ticks = (durationMs * 1_000_000) / timecodeScale;

  // An existing Duration is overwritten in place (no size change at all).
  if (duration && (duration.size === 8 || duration.size === 4)) {
    const out = head.slice();
    const view = new DataView(out.buffer, out.byteOffset + duration.pos, duration.size);

    if (duration.size === 8) {
      view.setFloat64(0, ticks);
    } else {
      view.setFloat32(0, ticks);
    }

    return out;
  }
  if (duration) {
    return null;
  }

  // Insert Duration (ID 0x4489, size 8, float64) at the end of Info.
  const element = new Uint8Array(11);

  element.set([0x44, 0x89, 0x88]);
  new DataView(element.buffer).setFloat64(3, ticks);

  const infoSize = encodeSizePreferWidth_(loc.infoSize.value + element.length, loc.infoSize.length);

  if (!infoSize) {
    return null;
  }
  const growth = element.length + infoSize.length - loc.infoSize.length;
  const parts: Uint8Array[] = [];

  // A known-size Segment must grow by the same amount; Chrome writes "unknown", which stays as is.
  if (loc.segmentSize.isUnknown) {
    parts.push(head.subarray(0, loc.infoPos));
  } else {
    const segmentSize = encodeSize_(loc.segmentSize.value + growth, loc.segmentSize.length);

    if (!segmentSize) {
      return null;
    }
    parts.push(head.subarray(0, loc.segmentSizePos), segmentSize, head.subarray(loc.segmentSizePos + loc.segmentSize.length, loc.infoPos));
  }
  parts.push(head.subarray(loc.infoPos, loc.infoPos + loc.infoId.length), infoSize, head.subarray(loc.dataPos, dataEnd), element, head.subarray(dataEnd));

  return concat_(parts);
}

/** Read back Info's Duration in milliseconds (for tests and diagnostics), or null when absent. */
export function readWebmDurationMs(bytes: Uint8Array): number | null {
  const ebmlId = readId_(bytes, 0);
  const ebmlSize = ebmlId ? readSize_(bytes, ebmlId.length) : null;

  if (ebmlId?.value !== ID_EBML || !ebmlSize) {
    return null;
  }
  const segmentPos = ebmlId.length + ebmlSize.length + ebmlSize.value;
  const segmentId = readId_(bytes, segmentPos);
  const segmentSize = segmentId ? readSize_(bytes, segmentPos + segmentId.length) : null;

  if (segmentId?.value !== ID_SEGMENT || !segmentSize) {
    return null;
  }
  let pos = segmentPos + segmentId.length + segmentSize.length;

  while (pos < bytes.length) {
    const id = readId_(bytes, pos);
    const size = id ? readSize_(bytes, pos + id.length) : null;

    if (!id || !size || size.isUnknown) {
      return null;
    }
    const dataPos = pos + id.length + size.length;

    if (id.value === ID_INFO) {
      let timecodeScale = DEFAULT_TIMECODE_SCALE_NS;
      let ticks: number | null = null;
      let child = dataPos;

      while (child < dataPos + size.value) {
        const cid = readId_(bytes, child);
        const csize = cid ? readSize_(bytes, child + cid.length) : null;

        if (!cid || !csize) {
          return null;
        }
        const cdata = child + cid.length + csize.length;

        if (cid.value === ID_TIMECODE_SCALE) {
          timecodeScale = readUint_(bytes, cdata, csize.value);
        } else if (cid.value === ID_DURATION) {
          const view = new DataView(bytes.buffer, bytes.byteOffset + cdata, csize.value);

          ticks = csize.value === 8 ? view.getFloat64(0) : view.getFloat32(0);
        }
        child = cdata + csize.value;
      }

      return ticks === null ? null : (ticks * timecodeScale) / 1_000_000;
    }
    pos = dataPos + size.value;
  }

  return null;
}
