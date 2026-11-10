import { isPropagationScheduled, onmessageProcessing, PositionCruncherIncomingMsg } from '@app/webworker/positionCruncher';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { vi } from 'vitest';

// PosCruncherMsgType is a const enum (erased); use literal values.
const MSG = {
  OBJ_DATA: 0,
  OFFSET: 1,
  PAUSE: 10,
} as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

const send = (data: Record<string, unknown>) => onmessageProcessing({ data } as unknown as PositionCruncherIncomingMsg);

/** A parked embed pauses the position worker so it burns no CPU, then resumes it at the current time. */
describe('positionCruncher PAUSE', () => {
  let posted: { satPos?: Float32Array }[] = [];
  const wallClock = Date.UTC(2008, 8, 20, 12, 0, 0);

  beforeAll(() => {
    vi.useFakeTimers({ now: wallClock });
    globalThis.postMessage = vi.fn((payload: { satPos?: Float32Array }) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
    send({
      typ: MSG.OBJ_DATA,
      dat: JSON.stringify([{ tle1: TLE1, tle2: TLE2, active: true }]),
      seqNum: 1,
      fieldOfViewSetLength: 0,
    });
  });

  beforeEach(() => {
    posted = [];
  });

  afterAll(() => {
    send({ typ: MSG.PAUSE, isPaused: false });
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('stops scheduling cycles while paused, even when time messages arrive', () => {
    expect(isPropagationScheduled()).toBe(true);

    send({ typ: MSG.PAUSE, isPaused: true });
    expect(isPropagationScheduled()).toBe(false);

    send({ typ: MSG.OFFSET, staticOffset: 1000, dynamicOffsetEpoch: wallClock, propRate: 2 });
    vi.advanceTimersByTime(10_000);

    expect(posted).toHaveLength(0);
    expect(isPropagationScheduled()).toBe(false);
  });

  it('resumes with one immediate cycle at the latest time, then the normal cadence', () => {
    const staticOffset = 6 * 3600 * 1000;

    // Time set while paused: frozen rate so the expected position is exact.
    send({ typ: MSG.OFFSET, staticOffset, dynamicOffsetEpoch: Date.now(), propRate: 0 });
    send({ typ: MSG.PAUSE, isPaused: false });

    expect(posted).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(posted).toHaveLength(1);

    const expected = new Satellite({ id: 0, tle1: TLE1 as TleLine1, tle2: TLE2 as TleLine2 }).eci(new Date(Date.now() + staticOffset))!.position;
    const satPos = posted[0].satPos!;

    expect(satPos[0]).toBeCloseTo(expected.x, 0);
    expect(satPos[1]).toBeCloseTo(expected.y, 0);
    expect(satPos[2]).toBeCloseTo(expected.z, 0);

    vi.advanceTimersByTime(1000);
    expect(posted).toHaveLength(2);
  });

  it('ignores a repeated PAUSE state', () => {
    send({ typ: MSG.PAUSE, isPaused: false });
    vi.advanceTimersByTime(1);
    expect(posted).toHaveLength(0);
    expect(isPropagationScheduled()).toBe(true);
  });
});
