import {
  isCanSkipMarkers,
  onmessageProcessing,
  PositionCruncherIncomingMsg,
  sendDataToSatSet,
} from '@app/webworker/positionCruncher';
import { vi } from 'vitest';

// PosCruncherMsgType is a const enum (erased); use literal values.
const MSG = {
  OBJ_DATA: 0,
  OFFSET: 1,
  SAT_EDIT: 2,
  NEW_MISSILE: 3,
  SENSOR: 4,
  UPDATE_MARKERS: 5,
  SUNLIGHT_VIEW: 6,
  SATELLITE_SELECTED: 7,
  CAMERA_DATA: 8,
} as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

const send = (data: Record<string, unknown>) =>
  onmessageProcessing({ data } as unknown as PositionCruncherIncomingMsg);

let posted: unknown[] = [];

describe('positionCruncher worker', () => {
  beforeEach(() => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: unknown) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  it('processes OBJ_DATA: parses TLEs, runs a propagation cycle, and posts positions', () => {
    send({
      typ: MSG.OBJ_DATA,
      dat: JSON.stringify([{ tle1: TLE1, tle2: TLE2, active: true }]),
      seqNum: 1,
      fieldOfViewSetLength: 0,
    });

    // propagationLoop -> sendDataToSatSet posts at least once
    expect(posted.length).toBeGreaterThan(0);
    const first = posted[0] as { satPos?: Float32Array };

    expect(first.satPos).toBeInstanceOf(Float32Array);
  });

  it('processes OFFSET without throwing and returns undefined', () => {
    const result = send({
      typ: MSG.OFFSET,
      staticOffset: 1000,
      dynamicOffsetEpoch: Date.now(),
      propRate: 2,
    });

    expect(result).toBeUndefined();
  });

  it('handles SUNLIGHT_VIEW, SATELLITE_SELECTED, UPDATE_MARKERS, CAMERA_DATA without throwing', () => {
    expect(() => send({ typ: MSG.SUNLIGHT_VIEW, isSunlightView: true })).not.toThrow();
    expect(() => send({ typ: MSG.SATELLITE_SELECTED, satelliteSelected: [0] })).not.toThrow();
    expect(() => send({ typ: MSG.UPDATE_MARKERS, markerMode: 0 })).not.toThrow();
    expect(() => send({
      typ: MSG.CAMERA_DATA,
      vpMatrix: new Float32Array(16),
      camPosEci: new Float32Array(3),
      isFrustumCullingEnabled: true,
    })).not.toThrow();
  });

  it('exposes isCanSkipMarkers returning a boolean', () => {
    expect(typeof isCanSkipMarkers()).toBe('boolean');
  });

  it('sendDataToSatSet posts an outgoing message', () => {
    posted = [];
    sendDataToSatSet();

    expect(posted.length).toBeGreaterThan(0);
  });
});
