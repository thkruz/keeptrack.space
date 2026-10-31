import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { OVERLAY_RECONCILE_MS } from '../embed-overlays';
import type { EmbedObject, EmbedSensor } from '../embed-types';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const obj = (hostId: string): EmbedObject => ({ hostId, name: `Obj ${hostId}`, tle1: GOOD_TLE1, tle2: GOOD_TLE2 });
const sensor = (hostId: string): EmbedSensor => ({
  hostId,
  name: hostId,
  lat: 0,
  lon: 0,
  altKm: 0,
  minAz: 0,
  maxAz: 360,
  minEl: 0,
  maxEl: 90,
  minRngKm: 0,
  maxRngKm: 3000,
});

function make() {
  const engine = new FakeEngine('scenario');
  const api = new KeepTrackEmbed(engine, { config: {}, readyTarget: new EventTarget() });

  api.start();
  api.upsertObjects([obj('a'), obj('b')]);
  api.upsertSensors([sensor('s1')]);

  return { api, engine };
}

beforeEach(() => {
  vi.stubGlobal('__IS_PRO__', false);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('overlays', () => {
  it('creates object-object and sensor-object lines with stable ids and the default color', () => {
    const { api, engine } = make();
    const id1 = api.addOverlay({ type: 'line', from: { object: { hostId: 'a' } }, to: { object: { hostId: 'b' } } });
    const id2 = api.addOverlay({ type: 'line', from: { sensor: 's1' }, to: { object: { hostId: 'a' } } });
    const id3 = api.addOverlay({ type: 'line', from: { object: { hostId: 'b' } }, to: { sensor: 's1' }, fovOnly: true });

    expect(new Set([id1, id2, id3]).size).toBe(3);
    expect(engine.lines.map((l) => l.spec.kind)).toEqual(['objToObj', 'sensorToObj', 'sensorToObj']);
    expect(engine.lines.every((l) => l.spec.color === undefined)).toBe(true);
    expect(engine.lines.map((l) => (l.spec.kind === 'sensorToObj' ? l.spec.fovOnly : null))).toEqual([null, false, true]);
  });

  it('validates endpoints and color', () => {
    const { api } = make();

    expect(() => api.addOverlay({ type: 'line', from: { sensor: 'nope' }, to: { object: { hostId: 'a' } } })).toThrowError(expect.objectContaining({ code: 'SENSOR_NOT_FOUND' }));
    expect(() => api.addOverlay({ type: 'line', from: { object: { hostId: 'zz' } }, to: { object: { hostId: 'a' } } })).toThrowError(
      expect.objectContaining({ code: 'OBJECT_NOT_FOUND' })
    );
    expect(() => api.addOverlay({ type: 'line', from: { sensor: 's1' }, to: { sensor: 's1' } })).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.addOverlay({ type: 'line', from: { object: { hostId: 'a' } }, to: { object: { hostId: 'b' } }, color: [2, 0, 0, 1] })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ARGUMENT' })
    );
  });

  it('removes one overlay, and clearOverlays removes only embed-created lines', () => {
    const { api, engine } = make();
    const foreign = {};

    engine.lines.push({ spec: { kind: 'objToObj', fromId: 1, toId: 2 }, handle: foreign });
    const id1 = api.addOverlay({ type: 'line', from: { object: { hostId: 'a' } }, to: { object: { hostId: 'b' } } });

    api.addOverlay({ type: 'line', from: { sensor: 's1' }, to: { object: { hostId: 'a' } } });
    api.removeOverlay(id1);
    expect(engine.lines).toHaveLength(2);
    api.clearOverlays();
    expect(engine.lines.map((l) => l.handle)).toEqual([foreign]);
  });

  it('drops overlays when their object or sensor is removed', () => {
    const { api, engine } = make();

    api.addOverlay({ type: 'line', from: { object: { hostId: 'a' } }, to: { object: { hostId: 'b' } } });
    api.addOverlay({ type: 'line', from: { sensor: 's1' }, to: { object: { hostId: 'b' } } });
    api.removeSensors(['s1']);
    expect(engine.lines).toHaveLength(1);
    api.removeObjects(['a']);
    expect(engine.lines).toHaveLength(0);
  });

  it('re-creates an active-sensor line the engine garbage-collected, but not for an inactive sensor', () => {
    const { api, engine } = make();

    api.setActiveSensors(['s1']);
    api.addOverlay({ type: 'line', from: { sensor: 's1' }, to: { object: { hostId: 'a' } }, fovOnly: true });
    engine.gcLine(engine.lines[0].handle);
    expect(engine.lines).toHaveLength(0);
    vi.advanceTimersByTime(OVERLAY_RECONCILE_MS + 10);
    expect(engine.lines).toHaveLength(1);

    api.setActiveSensors([]);
    engine.gcLine(engine.lines[0].handle);
    vi.advanceTimersByTime(OVERLAY_RECONCILE_MS * 2);
    expect(engine.lines).toHaveLength(0);
    api.setActiveSensors(['s1']);
    expect(engine.lines).toHaveLength(1);
  });

  it('throws INVALID_ARGUMENT when the engine cannot draw the line', () => {
    const { api, engine } = make();

    engine.rejectLines = true;
    expect(() => api.addOverlay({ type: 'line', from: { object: { hostId: 'a' } }, to: { object: { hostId: 'b' } } })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ARGUMENT' })
    );
  });
});
