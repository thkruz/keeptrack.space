import { onMessage } from '@app/webworker/orbitCruncher';
import { OrbitDrawTypes } from '@app/webworker/orbit-cruncher-messages';
import { vi } from 'vitest';

// OrbitCruncherMsgType is a const enum (erased); use literal values.
const MSG = {
  INIT: 0,
  SATELLITE_UPDATE: 1,
  MISSILE_UPDATE: 2,
  CHANGE_ORBIT_TYPE: 3,
  SETTINGS_UPDATE: 4,
  RESPONSE_DATA: 5,
} as const;

// Canonical Vallado SGP4 test TLE for the ISS.
const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

const NUM_SEGS = 4;

let posted: { payload: unknown; opts?: unknown }[] = [];

const initSat = (seqNum: number) => {
  onMessage({
    data: {
      typ: MSG.INIT,
      numSegs: NUM_SEGS,
      objData: JSON.stringify([{ tle1: TLE1, tle2: TLE2 }]),
      orbitFadeFactor: 1,
      numberOfOrbitsToDraw: 1,
      seqNum,
    },
  } as unknown as Parameters<typeof onMessage>[0]);
};

describe('orbitCruncher worker', () => {
  beforeEach(() => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: unknown, opts?: unknown) => {
      posted.push({ payload, opts });
    }) as unknown as typeof globalThis.postMessage;
  });

  it('responds "ready" to an INIT message', () => {
    initSat(1);

    expect(posted.at(-1)?.payload).toBe('ready');
  });

  it('propagates a satellite orbit and posts RESPONSE_DATA with a points buffer', () => {
    initSat(1);
    posted = [];

    onMessage({
      data: { typ: MSG.SATELLITE_UPDATE, id: 0, simulationTime: Date.UTC(2022, 0, 1), seqNum: 1 },
    } as unknown as Parameters<typeof onMessage>[0]);

    const last = posted.at(-1)!.payload as { typ: number; pointsOut: Float32Array; satId: number };

    expect(last.typ).toBe(MSG.RESPONSE_DATA);
    expect(last.satId).toBe(0);
    expect(last.pointsOut).toBeInstanceOf(Float32Array);
    expect(last.pointsOut.length).toBe((NUM_SEGS + 1) * 4);
    // A real LEO orbit should produce non-zero coordinates somewhere.
    expect(last.pointsOut.some((v) => v !== 0)).toBe(true);
  });

  it('discards stale SATELLITE_UPDATE messages (seqNum below current)', () => {
    initSat(5);
    posted = [];

    onMessage({
      data: { typ: MSG.SATELLITE_UPDATE, id: 0, simulationTime: Date.UTC(2022, 0, 1), seqNum: 2 },
    } as unknown as Parameters<typeof onMessage>[0]);

    expect(posted).toHaveLength(0);
  });

  it('posts a zero buffer for an out-of-range satellite id', () => {
    initSat(1);
    posted = [];

    onMessage({
      data: { typ: MSG.SATELLITE_UPDATE, id: 999, simulationTime: Date.UTC(2022, 0, 1), seqNum: 1 },
    } as unknown as Parameters<typeof onMessage>[0]);

    const last = posted.at(-1)!.payload as { typ: number; pointsOut: Float32Array; satId: number };

    expect(last.typ).toBe(MSG.RESPONSE_DATA);
    expect(last.satId).toBe(999);
    expect(last.pointsOut.every((v) => v === 0)).toBe(true);
  });

  it('handles SETTINGS_UPDATE and CHANGE_ORBIT_TYPE without throwing', () => {
    initSat(1);

    expect(() => onMessage({
      data: { typ: MSG.SETTINGS_UPDATE, numberOfOrbitsToDraw: 3 },
    } as unknown as Parameters<typeof onMessage>[0])).not.toThrow();

    expect(() => onMessage({
      data: { typ: MSG.CHANGE_ORBIT_TYPE, orbitType: OrbitDrawTypes.TRAIL },
    } as unknown as Parameters<typeof onMessage>[0])).not.toThrow();
  });

  it('draws a missile trajectory on MISSILE_UPDATE', () => {
    onMessage({
      data: {
        typ: MSG.INIT,
        numSegs: NUM_SEGS,
        objData: JSON.stringify([
{
          missile: true,
          latList: [0, 1, 2, 3],
          lonList: [0, 1, 2, 3],
          altList: [100, 200, 300, 400],
        },
]),
        seqNum: 10,
      },
    } as unknown as Parameters<typeof onMessage>[0]);
    posted = [];

    onMessage({
      data: {
        typ: MSG.MISSILE_UPDATE,
        id: 0,
        simulationTime: Date.UTC(2022, 0, 1),
        seqNum: 10,
        latList: [0, 1, 2, 3],
        lonList: [0, 1, 2, 3],
        altList: [100, 200, 300, 400],
      },
    } as unknown as Parameters<typeof onMessage>[0]);

    const last = posted.at(-1)!.payload as { typ: number; pointsOut: Float32Array };

    expect(last.typ).toBe(MSG.RESPONSE_DATA);
    expect(last.pointsOut.some((v) => v !== 0)).toBe(true);
  });

  it('rotates each missile sample by the GMST at its own time when a launch epoch is given', () => {
    // A 2-hour trajectory whose ground-referenced position never changes. With a
    // per-sample GMST each sample is rotated by the Earth's spin at its own time, so
    // the drawn line sweeps a ~30° arc; with a single GMST (no launch epoch) every
    // sample collapses onto the same ECI point. This is the GEO-interceptor fix:
    // a multi-hour arc must not be drawn with one GMST or it drifts off its dots.
    const durationSec = 7200;
    const lat = new Array(durationSec + 1).fill(0);
    const lon = new Array(durationSec + 1).fill(0);
    const alt = new Array(durationSec + 1).fill(35786);

    onMessage({
      data: {
        typ: MSG.INIT,
        numSegs: NUM_SEGS,
        objData: JSON.stringify([{ missile: true, latList: lat, lonList: lon, altList: alt }]),
        seqNum: 20,
      },
    } as unknown as Parameters<typeof onMessage>[0]);

    const spreadOfXCoords = (startTime?: number): number => {
      posted = [];
      onMessage({
        data: {
          typ: MSG.MISSILE_UPDATE, id: 0, simulationTime: Date.UTC(2022, 0, 1), seqNum: 20,
          latList: lat, lonList: lon, altList: alt, startTime,
        },
      } as unknown as Parameters<typeof onMessage>[0]);
      const { pointsOut } = posted.at(-1)!.payload as { pointsOut: Float32Array };
      const xs: number[] = [];

      for (let p = 0; p < NUM_SEGS + 1; p++) {
        xs.push(pointsOut[p * 4]);
      }

      return Math.max(...xs) - Math.min(...xs);
    };

    // Single GMST: identical ground point → identical ECI point (no spread).
    expect(spreadOfXCoords(undefined)).toBeLessThan(1);
    // Per-sample GMST: 2 hours of Earth rotation spreads the samples by thousands of km.
    expect(spreadOfXCoords(Date.UTC(2022, 0, 1))).toBeGreaterThan(1000);
  });
});
