import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { MAX_STREAM_HZ } from '../embed-stream';
import type { EmbedConfig, EmbedEventMap, EmbedObject } from '../embed-types';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const obj = (hostId: string): EmbedObject => ({ hostId, name: `Obj ${hostId}`, tle1: GOOD_TLE1, tle2: GOOD_TLE2 });

function make(config: EmbedConfig = {}) {
  const engine = new FakeEngine('scenario');
  const api = new KeepTrackEmbed(engine, { config, readyTarget: new EventTarget() });

  api.start();

  return { api, engine };
}

function idOf(api: KeepTrackEmbed, hostId: string): number {
  const catalog = (api as unknown as { catalog_: { resolveRef: (r: unknown) => number | null } }).catalog_;
  const id = catalog.resolveRef({ hostId });

  if (id === null) {
    throw new Error(`no id for ${hostId}`);
  }

  return id;
}

beforeEach(() => {
  vi.stubGlobal('__IS_PRO__', false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('setObjectStyle', () => {
  it('applies color, highlight and label, and resets on null', () => {
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    const id = idOf(api, 'a');

    api.setObjectStyle({ hostId: 'a' }, { color: [1, 0, 0, 1], highlight: true, label: 'Alpha' });
    expect(engine.objectColors.get(id)).toEqual([1, 0, 0, 1]);
    expect(engine.highlighted.has(id)).toBe(true);
    const labels = engine.labelSets.at(-1) as { text: string; bold: boolean }[];

    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({ text: 'Alpha', bold: true });

    api.setObjectStyle({ hostId: 'a' }, null);
    expect(engine.objectColors.has(id)).toBe(false);
    expect(engine.highlighted.has(id)).toBe(false);
    expect(engine.labelSets.at(-1)).toEqual([]);
  });

  it('uses the object name when label is true and drops color when a later style omits it', () => {
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    const id = idOf(api, 'a');

    api.setObjectStyle({ hostId: 'a' }, { color: [0, 1, 0, 1], label: true });
    expect((engine.labelSets.at(-1) as { text: string }[])[0].text).toBe('Obj a');
    api.setObjectStyle({ hostId: 'a' }, { highlight: true });
    expect(engine.objectColors.has(id)).toBe(false);
  });

  it('validates input and reports unknown objects', () => {
    const { api } = make();

    api.upsertObjects([obj('a')]);
    expect(() => api.setObjectStyle({ hostId: 'a' }, { color: [2, 0, 0, 1] })).toThrow(/channel/u);
    expect(() => api.setObjectStyle({ hostId: 'a' }, { color: [1, 0, 0] as never })).toThrow();
    expect(() => api.setObjectStyle({ hostId: 'a' }, { highlight: 'yes' as never })).toThrow(/boolean/u);
    expect(() => api.setObjectStyle({ hostId: 'a' }, { label: 5 as never })).toThrow(/label/u);
    expect(() => api.setObjectStyle({ hostId: 'zzz' }, { highlight: true })).toThrow(/No object/u);
  });

  it('forgets styles when the object is removed', () => {
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    const id = idOf(api, 'a');

    api.setObjectStyle({ hostId: 'a' }, { color: [1, 0, 0, 1], highlight: true, label: true });
    api.removeObjects(['a']);
    expect(engine.objectColors.has(id)).toBe(false);
    expect(engine.highlighted.has(id)).toBe(false);
    expect(engine.labelSets.at(-1)).toEqual([]);
  });

  it('is reachable through execute()', async () => {
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    const res = await api.execute({ id: 1, cmd: 'setObjectStyle', args: [{ hostId: 'a' }, { highlight: true }] });

    expect(res.ok).toBe(true);
    expect(engine.highlighted.size).toBe(1);
  });
});

describe('setLayers', () => {
  it('forwards each layer to the engine', () => {
    const { api, engine } = make();

    api.upsertObjects([obj('a'), obj('b')]);
    api.setLayers({ dayNight: false, graticule: true });
    expect(engine.layerCalls.at(-1)).toEqual({ dayNight: false, graticule: true });
    api.setLayers({ orbits: true, labels: 'all' });
    const last = engine.layerCalls.at(-1) as { orbitIds: number[]; allLabels: boolean };

    expect(last.orbitIds).toHaveLength(2);
    expect(last.allLabels).toBe(true);
  });

  it('keeps the orbit set in step with the host catalog', () => {
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    api.setLayers({ orbits: true });
    api.upsertObjects([obj('b')]);
    expect((engine.layerCalls.at(-1) as { orbitIds: number[] }).orbitIds).toHaveLength(2);
    api.removeObjects(['a']);
    expect((engine.layerCalls.at(-1) as { orbitIds: number[] }).orbitIds).toHaveLength(1);
    api.setLayers({ orbits: false });
    expect((engine.layerCalls.at(-1) as { orbitIds: number[] }).orbitIds).toEqual([]);
  });

  it('hides labels when labels is none', () => {
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    api.setObjectStyle({ hostId: 'a' }, { label: true });
    api.setLayers({ labels: 'none' });
    expect(engine.labelSets.at(-1)).toEqual([]);
    api.setLayers({ labels: 'host' });
    expect(engine.labelSets.at(-1)).toHaveLength(1);
  });

  it('rejects bad values', () => {
    const { api } = make();

    expect(() => api.setLayers({ dayNight: 1 as never })).toThrow(/boolean/u);
    expect(() => api.setLayers({ labels: 'some' as never })).toThrow(/labels/u);
    expect(() => api.setLayers(null as never)).toThrow();
  });

  it('applies config.layers at boot', () => {
    const { engine } = make({ layers: { dayNight: false, graticule: true } });

    expect(engine.layerCalls[0]).toEqual({ dayNight: false, graticule: true });
  });
});

describe('camera center and zoom', () => {
  it('passes the view to the engine when nothing is selected', () => {
    const { api, engine } = make();

    api.setCamera({ mode: 'flat-map', center: { lat: 10, lon: 20 }, zoom: 2 });
    expect(engine.cameraCalls.at(-1)).toEqual(['flat-map', undefined, { center: { lat: 10, lon: 20 }, zoom: 2 }]);
  });

  it('ignores center and zoom while an object is selected', () => {
    const { api, engine } = make();

    engine.selectedId = 5;
    api.setCamera({ mode: 'earth', center: { lat: 1, lon: 2 } });
    expect(engine.cameraCalls.at(-1)).toEqual(['earth', undefined]);
  });

  it('validates center and zoom', () => {
    const { api } = make();

    expect(() => api.setCamera({ center: { lat: 95, lon: 0 } })).toThrow(/center/u);
    expect(() => api.setCamera({ center: { lat: 0 } as never })).toThrow(/center/u);
    expect(() => api.setCamera({ zoom: 0.5 })).toThrow(/zoom/u);
  });
});

describe('sensor style', () => {
  it('pushes color and label to the engine and the label list', () => {
    const { api, engine } = make();

    api.upsertSensors([
      {
        hostId: 's1',
        name: 'Radar',
        lat: 10,
        lon: 20,
        altKm: 0.1,
        minAz: 0,
        maxAz: 360,
        minEl: 0,
        maxEl: 90,
        minRngKm: 0,
        maxRngKm: 1000,
        color: [0, 0, 1, 1],
        label: true,
      } as never,
    ]);
    expect(engine.sensorStyles.at(-1)?.style).toEqual({ color: [0, 0, 1, 1], label: 'Radar' });
    expect(engine.labelSets.at(-1)).toHaveLength(1);
    api.removeSensors(['s1']);
    expect(engine.labelSets.at(-1)).toEqual([]);
  });

  it('rejects an invalid sensor color', () => {
    const { api } = make();

    expect(() =>
      api.upsertSensors([
        { hostId: 's1', name: 'R', lat: 0, lon: 0, altKm: 0, minAz: 0, maxAz: 360, minEl: 0, maxEl: 90, minRngKm: 0, maxRngKm: 1000, color: [9, 0, 0, 1] } as never,
      ])
    ).toThrow(/color/u);
  });
});

describe('position stream', () => {
  it('emits immediately, then on sim time change at the requested rate, and stops on null', () => {
    vi.useFakeTimers();
    const { api, engine } = make();
    const seen: EmbedEventMap['positions'][] = [];

    api.upsertObjects([obj('a')]);
    api.on('positions', (p) => seen.push(p));
    api.setPositionStream({ refs: 'host', hz: 5 });
    expect(seen).toHaveLength(1);
    expect(seen[0].objects[0]).toMatchObject({ hostId: 'a' });

    // time paused: nothing new
    vi.advanceTimersByTime(1000);
    expect(seen).toHaveLength(1);

    // time moving: one emit per 200 ms tick
    for (let i = 0; i < 5; i++) {
      engine.timeMs += 1000;
      vi.advanceTimersByTime(200);
    }
    expect(seen).toHaveLength(6);

    api.setPositionStream(null);
    engine.timeMs += 1000;
    vi.advanceTimersByTime(1000);
    expect(seen).toHaveLength(6);
  });

  it('clamps hz to the maximum', () => {
    vi.useFakeTimers();
    const { api, engine } = make();
    const seen: unknown[] = [];

    api.upsertObjects([obj('a')]);
    api.on('positions', (p) => seen.push(p));
    api.setPositionStream({ refs: [{ hostId: 'a' }], hz: 1000 });
    for (let i = 0; i < 100; i++) {
      engine.timeMs += 1;
      vi.advanceTimersByTime(10);
    }
    // 1 s of wall time at the cap, plus the immediate emit
    expect(seen.length).toBeLessThanOrEqual(MAX_STREAM_HZ + 2);
    expect(seen.length).toBeGreaterThanOrEqual(MAX_STREAM_HZ);
    api.setPositionStream(null);
  });

  it('picks up objects added after the stream started', () => {
    vi.useFakeTimers();
    const { api, engine } = make();
    const seen: EmbedEventMap['positions'][] = [];

    api.on('positions', (p) => seen.push(p));
    api.setPositionStream({ refs: 'host', hz: 10 });
    api.upsertObjects([obj('a')]);
    engine.timeMs += 1000;
    vi.advanceTimersByTime(100);
    expect(seen.at(-1)?.objects).toHaveLength(1);
    api.setPositionStream(null);
  });

  it('validates the stream', () => {
    const { api } = make();

    expect(() => api.setPositionStream({ refs: 'all' as never, hz: 1 })).toThrow(/setPositionStream/u);
    expect(() => api.setPositionStream({ refs: 'host', hz: 0 })).toThrow(/hz/u);
  });
});

describe('ready gating on the propagator', () => {
  it('stays not ready until the propagator settles', () => {
    vi.useFakeTimers();
    const engine = new FakeEngine('scenario');
    const api = new KeepTrackEmbed(engine, { config: {}, readyTarget: new EventTarget() });
    const gate = (api as unknown as { data_: { propagator: { isLoading: () => boolean } } }).data_.propagator;
    let loading = true;

    vi.spyOn(gate, 'isLoading').mockImplementation(() => loading);
    api.start();
    expect(api.isReady).toBe(false);
    vi.advanceTimersByTime(500);
    expect(api.isReady).toBe(false);
    loading = false;
    vi.advanceTimersByTime(200);
    expect(api.isReady).toBe(true);
  });
});
