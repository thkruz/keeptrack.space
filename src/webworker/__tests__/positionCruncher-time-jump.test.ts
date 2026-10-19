import { onmessageProcessing, PositionCruncherIncomingMsg } from '@app/webworker/positionCruncher';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { vi } from 'vitest';

// PosCruncherMsgType is a const enum (erased); use literal values.
const MSG = {
  OBJ_DATA: 0,
  OFFSET: 1,
} as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

const send = (data: Record<string, unknown>) => onmessageProcessing({ data } as unknown as PositionCruncherIncomingMsg);

/**
 * A time jump must be reflected in the very next propagation cycle. Previously the OFFSET handler set an
 * interrupt flag that the single-threaded worker could only read on the following cycle, which then discarded
 * its results, so nothing for the new time was posted until a second full interval (1-2 s) had passed.
 */
describe('positionCruncher time jump latency', () => {
  let posted: { satPos?: Float32Array }[] = [];
  const wallClock = Date.UTC(2008, 8, 20, 12, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers({ now: wallClock });
    posted = [];
    globalThis.postMessage = vi.fn((payload: { satPos?: Float32Array }) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('posts positions for the new time on the first cycle after an OFFSET, without waiting an interval', () => {
    send({
      typ: MSG.OBJ_DATA,
      dat: JSON.stringify([{ tle1: TLE1, tle2: TLE2, active: true }]),
      seqNum: 1,
      fieldOfViewSetLength: 0,
    });
    expect(posted.length).toBeGreaterThan(0);

    posted = [];
    const staticOffset = 6 * 3600 * 1000;

    // Paused (propRate 0) so the simulation time is exactly dynamicOffsetEpoch + staticOffset.
    send({ typ: MSG.OFFSET, staticOffset, dynamicOffsetEpoch: wallClock, propRate: 0 });

    // Nothing runs synchronously inside the message handler...
    expect(posted).toHaveLength(0);
    // ...but the next cycle runs as soon as the queue drains, well before the 1000 ms interval.
    vi.advanceTimersByTime(1);
    expect(posted).toHaveLength(1);

    const expected = new Satellite({ id: 0, tle1: TLE1 as TleLine1, tle2: TLE2 as TleLine2 }).eci(new Date(wallClock + staticOffset))!.position;
    const satPos = posted[0].satPos!;

    expect(satPos[0]).toBeCloseTo(expected.x, 1);
    expect(satPos[1]).toBeCloseTo(expected.y, 1);
    expect(satPos[2]).toBeCloseTo(expected.z, 1);
  });

  it('coalesces a burst of OFFSET messages into one cycle and keeps a single loop afterwards', () => {
    send({
      typ: MSG.OBJ_DATA,
      dat: JSON.stringify([{ tle1: TLE1, tle2: TLE2, active: true }]),
      seqNum: 2,
      fieldOfViewSetLength: 0,
    });
    posted = [];

    send({ typ: MSG.OFFSET, staticOffset: 1000, dynamicOffsetEpoch: wallClock, propRate: 0 });
    send({ typ: MSG.OFFSET, staticOffset: 2000, dynamicOffsetEpoch: wallClock, propRate: 0 });
    send({ typ: MSG.OFFSET, staticOffset: 3000, dynamicOffsetEpoch: wallClock, propRate: 0 });
    vi.advanceTimersByTime(1);
    expect(posted).toHaveLength(1);

    // One loop at the normal cadence, not one per OFFSET.
    vi.advanceTimersByTime(1000);
    expect(posted).toHaveLength(2);
  });
});
