import { injectWebmDuration, readWebmDurationMs } from '../webm-duration';

const ascii = (text: string): number[] => Array.from(text, (c) => c.charCodeAt(0));

/** One EBML element with a 1-byte size (enough for these small fixtures). */
const el = (id: number[], data: number[]): number[] => [...id, 0x80 | data.length, ...data];

const EBML_HEADER = el([0x1a, 0x45, 0xdf, 0xa3], [...el([0x42, 0x82], ascii('webm'))]);
const UNKNOWN_SIZE = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
const INFO_CHILDREN = [
  ...el([0x2a, 0xd7, 0xb1], [0x0f, 0x42, 0x40]), // TimecodeScale 1,000,000
  ...el([0x4d, 0x80], ascii('Chrome')), // MuxingApp
  ...el([0x57, 0x41], ascii('Chrome')), // WritingApp
];
const TRACKS = el([0x16, 0x54, 0xae, 0x6b], [0xae, 0x83, 0xd7, 0x81, 0x01]);
const CLUSTER = [0x1f, 0x43, 0xb6, 0x75, ...UNKNOWN_SIZE, 0xe7, 0x81, 0x00, 0xa3, 0x84, 0x81, 0x00, 0x00, 0x80];

/** The layout Chrome's MediaRecorder writes: unknown-size Segment, Info without Duration, no SeekHead or Cues. */
const chromeLikeWebm = (): Uint8Array =>
  new Uint8Array([...EBML_HEADER, 0x18, 0x53, 0x80, 0x67, ...UNKNOWN_SIZE, ...el([0x15, 0x49, 0xa9, 0x66], INFO_CHILDREN), ...TRACKS, ...CLUSTER]);

describe('injectWebmDuration', () => {
  it('adds a Duration that reads back as the recorded length', () => {
    const original = chromeLikeWebm();

    expect(readWebmDurationMs(original)).toBeNull();
    const patched = injectWebmDuration(original, 14545)!;

    expect(patched).not.toBeNull();
    expect(readWebmDurationMs(patched)).toBeCloseTo(14545, 6);
    // Exactly one 11-byte element was added, and everything after Info is untouched.
    expect(patched.length).toBe(original.length + 11);
    const tail = [...TRACKS, ...CLUSTER];

    expect(Array.from(patched.subarray(patched.length - tail.length))).toEqual(tail);
  });

  it('honours a non-default TimecodeScale', () => {
    const original = chromeLikeWebm();
    // Swap the 1,000,000 ns scale for 1,000 ns (microsecond ticks).
    const scaled = Uint8Array.from(original);
    const at = scaled.findIndex((_, i) => scaled[i] === 0x2a && scaled[i + 1] === 0xd7 && scaled[i + 2] === 0xb1);

    scaled.set([0x00, 0x03, 0xe8], at + 4);
    const patched = injectWebmDuration(scaled, 2500)!;

    expect(readWebmDurationMs(patched)).toBeCloseTo(2500, 6);
  });

  it('overwrites an existing Duration in place', () => {
    const once = injectWebmDuration(chromeLikeWebm(), 1000)!;
    const twice = injectWebmDuration(once, 7479)!;

    expect(twice.length).toBe(once.length);
    expect(readWebmDurationMs(twice)).toBeCloseTo(7479, 6);
  });

  it('grows a known-size Segment by the inserted bytes', () => {
    const body = [...el([0x15, 0x49, 0xa9, 0x66], INFO_CHILDREN), ...TRACKS];
    const segmentSize = [0x40 | (body.length >> 8), body.length & 0xff];
    const known = new Uint8Array([...EBML_HEADER, 0x18, 0x53, 0x80, 0x67, ...segmentSize, ...body]);
    const patched = injectWebmDuration(known, 500)!;
    const sizeAt = EBML_HEADER.length + 4;
    const newSize = ((patched[sizeAt] & 0x3f) << 8) | patched[sizeAt + 1];

    expect(newSize).toBe(body.length + 11);
    expect(readWebmDurationMs(patched)).toBeCloseTo(500, 6);
  });

  it('refuses inputs it cannot patch safely', () => {
    const webm = chromeLikeWebm();
    const withSeekHead = new Uint8Array([
      ...EBML_HEADER,
      0x18,
      0x53,
      0x80,
      0x67,
      ...UNKNOWN_SIZE,
      ...el([0x11, 0x4d, 0x9b, 0x74], [0xec, 0x80]),
      ...el([0x15, 0x49, 0xa9, 0x66], INFO_CHILDREN),
    ]);

    expect(injectWebmDuration(new TextEncoder().encode('not a webm'), 1000)).toBeNull();
    expect(injectWebmDuration(withSeekHead, 1000)).toBeNull();
    expect(injectWebmDuration(webm.subarray(0, EBML_HEADER.length + 20), 1000)).toBeNull();
    expect(injectWebmDuration(webm, 0)).toBeNull();
    expect(injectWebmDuration(webm, Number.NaN)).toBeNull();
  });
});
