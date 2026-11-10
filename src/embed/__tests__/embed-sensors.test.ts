import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { HOST_SENSOR_OBJNAME_PREFIX } from '../embed-sensors';
import type { EmbedConfig, EmbedSensor } from '../embed-types';
import { FakeEngine } from './fake-engine';

const sensor = (hostId: string, extra: Partial<EmbedSensor> = {}): EmbedSensor => ({
  hostId,
  name: `Sensor ${hostId}`,
  lat: 40,
  lon: -100,
  altKm: 0.1,
  minAz: 0,
  maxAz: 360,
  minEl: 5,
  maxEl: 90,
  minRngKm: 0,
  maxRngKm: 3000,
  ...extra,
});

function make(config: EmbedConfig = {}) {
  const engine = new FakeEngine('scenario');
  const api = new KeepTrackEmbed(engine, { config, readyTarget: new EventTarget() });

  api.start();

  return { api, engine };
}

beforeEach(() => {
  vi.stubGlobal('__IS_PRO__', false);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sensors', () => {
  it('builds engine sensors with a distinct, prefixed objName', () => {
    const { api, engine } = make();

    api.upsertSensors([sensor('a'), sensor('b')]);

    expect(engine.createdSensors.map((c) => c.objName)).toEqual([`${HOST_SENSOR_OBJNAME_PREFIX}-a`, `${HOST_SENSOR_OBJNAME_PREFIX}-b`]);
  });

  it('activates several sensors (first is primary) and clears with an empty list', () => {
    const { api, engine } = make();

    api.upsertSensors([sensor('a'), sensor('b')]);
    api.setActiveSensors(['a', 'b', 'a']);
    expect(engine.activeSensors.map((s) => s.objName)).toEqual([`${HOST_SENSOR_OBJNAME_PREFIX}-a`, `${HOST_SENSOR_OBJNAME_PREFIX}-b`]);
    api.setActiveSensors([]);
    expect(engine.activeSensors).toEqual([]);
  });

  it('rejects unknown ids with SENSOR_NOT_FOUND and leaves the active set alone', () => {
    const { api, engine } = make();

    api.upsertSensors([sensor('a')]);
    api.setActiveSensors(['a']);
    expect(() => api.setActiveSensors(['a', 'zzz'])).toThrowError(expect.objectContaining({ code: 'SENSOR_NOT_FOUND' }));
    expect(engine.activeSensors).toHaveLength(1);
  });

  it('validates every sensor before touching the engine', () => {
    const { api, engine } = make();

    expect(() => api.upsertSensors([sensor('ok'), sensor('bad', { lat: 120 })])).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.upsertSensors([sensor('bad2', { minRngKm: 10, maxRngKm: 5 })])).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.upsertSensors([{ ...sensor('x'), name: '' }])).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(engine.createdSensors).toHaveLength(0);
  });

  it('removes sensors, drops them from the active set and from overlays', () => {
    const { api, engine } = make();

    api.upsertSensors([sensor('a'), sensor('b')]);
    api.setActiveSensors(['a', 'b']);
    api.removeSensors(['a']);
    expect(engine.activeSensors.map((s) => s.objName)).toEqual([`${HOST_SENSOR_OBJNAME_PREFIX}-b`]);
    expect(() => api.setActiveSensors(['a'])).toThrowError(expect.objectContaining({ code: 'SENSOR_NOT_FOUND' }));
  });

  it('re-applies the active set when an active sensor is edited', () => {
    const { api, engine } = make();

    api.upsertSensors([sensor('a')]);
    api.setActiveSensors(['a']);
    const first = engine.activeSensors[0];

    api.upsertSensors([sensor('a', { maxRngKm: 5000 })]);
    expect(engine.activeSensors).toHaveLength(1);
    expect(engine.activeSensors[0]).not.toBe(first);
  });

  it('rejects setters with DOMAIN_NOT_OWNED when keeptrack owns sensors', () => {
    const { api } = make({ ownership: { sensors: 'keeptrack' } });

    expect(() => api.upsertSensors([sensor('a')])).toThrowError(expect.objectContaining({ code: 'DOMAIN_NOT_OWNED' }));
    expect(() => api.removeSensors(['a'])).toThrowError(expect.objectContaining({ code: 'DOMAIN_NOT_OWNED' }));
    expect(() => api.setActiveSensors([])).toThrowError(expect.objectContaining({ code: 'DOMAIN_NOT_OWNED' }));
  });
});
