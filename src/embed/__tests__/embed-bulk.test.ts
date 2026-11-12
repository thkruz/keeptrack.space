import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { catalogModeOf, mapEmbedConfigToSettings } from '../embed-boot';
import { EMBED_API_VERSION, EMBED_MAX_TRACK_SAMPLES, type EmbedConfig, type EmbedObject } from '../embed-types';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const obj = (hostId: string, extra: Partial<EmbedObject> = {}): EmbedObject => ({ hostId, name: `Obj ${hostId}`, tle1: GOOD_TLE1, tle2: GOOD_TLE2, ...extra });
const many = (n: number, extra: Partial<EmbedObject> = {}): EmbedObject[] => Array.from({ length: n }, (_, i) => obj(`o${i}`, extra));

function make(config: EmbedConfig = {}) {
  const engine = new FakeEngine('scenario');
  engine.slotsFree = 100_000;
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

const calls = (engine: FakeEngine, fn: string) => engine.bulkCalls.filter((c) => c.fn === fn);

beforeEach(() => {
  vi.stubGlobal('__IS_PRO__', false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('API 1.5 version', () => {
  it('reports 1.5.0', () => {
    expect(EMBED_API_VERSION).toBe('1.5.0');
  });
});

describe('bulk upsertObjects', () => {
  it('claims every slot in one engine call and keeps result order', () => {
    const { api, engine } = make();
    const objects = [...many(50), obj('bad', { tle1: 'nope' }), { hostId: '', name: 'x', tle1: GOOD_TLE1, tle2: GOOD_TLE2 } as EmbedObject];
    const results = api.upsertObjects(objects);

    expect(results).toHaveLength(52);
    expect(results.slice(0, 50).every((r) => r.ok && r.action === 'added')).toBe(true);
    expect(results[50]).toMatchObject({ hostId: 'bad', ok: false, error: 'INVALID_TLE' });
    expect(results[51]).toMatchObject({ ok: false, error: 'INVALID_ARGUMENT' });
    expect(calls(engine, 'allocateSlots')).toHaveLength(1);
    expect(calls(engine, 'activateSlots')).toEqual([{ fn: 'activateSlots', n: 50 }]);
  });

  it('batches updates and treats a repeated hostId as added then updated', () => {
    const { api, engine } = make();

    api.upsertObjects(many(5));
    engine.bulkCalls.length = 0;
    const results = api.upsertObjects([...many(5), obj('dup'), obj('dup', { name: 'Second' })]);

    expect(results.map((r) => (r.ok ? r.action : r.error))).toEqual(['updated', 'updated', 'updated', 'updated', 'updated', 'added', 'updated']);
    expect(calls(engine, 'editObjects')).toEqual([{ fn: 'editObjects', n: 5 }]);
    expect(calls(engine, 'activateSlots')).toEqual([{ fn: 'activateSlots', n: 1 }]);
    expect(engine.getObjectData(idOf(api, 'dup'))?.name).toBe('Second');
  });

  it('reports NO_FREE_SLOT only for objects beyond the free slots', () => {
    const { api, engine } = make();

    engine.slotsFree = 3;
    const results = api.upsertObjects(many(5));

    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, false]);
    expect(results[4]).toMatchObject({ error: 'NO_FREE_SLOT' });
  });

  it('removes many objects with one releaseSlots call', () => {
    const { api, engine } = make();

    api.upsertObjects(many(20));
    engine.bulkCalls.length = 0;
    api.removeObjects(many(20).map((o) => o.hostId));
    expect(calls(engine, 'releaseSlots')).toEqual([{ fn: 'releaseSlots', n: 20 }]);
    expect(api.listHostObjects()).toHaveLength(0);
  });

  it('resolves a NORAD ref through the index after removal of a duplicate', () => {
    const { api } = make();

    api.upsertObjects([obj('a', { norad: '11111' }), obj('b', { norad: '11111' })]);
    api.removeObjects(['a']);
    expect(api.getObject({ norad: '11111' })?.hostId).toBe('b');
  });
});

describe('groups', () => {
  it('colors members at once, including objects upserted with a group and not yet defined', () => {
    const { api, engine } = make();

    api.upsertObjects(many(10, { group: 'sl' }));
    api.defineGroups([{ id: 'sl', color: [0, 1, 0, 1] }]);
    expect(calls(engine, 'setObjectColors').at(-1)?.n).toBe(10);
    expect(engine.objectColors.get(idOf(api, 'o3'))).toEqual([0, 1, 0, 1]);
    expect(api.getGroups()).toEqual([{ id: 'sl', color: [0, 1, 0, 1], visible: true, highlight: false, count: 10 }]);
  });

  it('toggles visibility as alpha 0 and restores it', () => {
    const { api, engine } = make();

    api.defineGroups([{ id: 'geo', color: [1, 0.5, 0, 1] }]);
    api.upsertObjects(many(3, { group: 'geo' }));
    api.setGroupStyle('geo', { visible: false });
    expect(engine.objectColors.get(idOf(api, 'o0'))).toEqual([1, 0.5, 0, 0]);
    api.setGroupStyle('geo', { visible: true });
    expect(engine.objectColors.get(idOf(api, 'o0'))).toEqual([1, 0.5, 0, 1]);
  });

  it('lets an object style win over the group and falls back on reset', () => {
    const { api, engine } = make();

    api.defineGroups([{ id: 'g', color: [0, 0, 1, 1] }]);
    api.upsertObjects(many(2, { group: 'g' }));
    api.setObjectStyle({ hostId: 'o0' }, { color: [1, 0, 0, 1], highlight: true });
    expect(engine.objectColors.get(idOf(api, 'o0'))).toEqual([1, 0, 0, 1]);
    expect(engine.objectColors.get(idOf(api, 'o1'))).toEqual([0, 0, 1, 1]);
    api.setObjectStyle({ hostId: 'o0' }, null);
    expect(engine.objectColors.get(idOf(api, 'o0'))).toEqual([0, 0, 1, 1]);
    expect(engine.highlighted.has(idOf(api, 'o0'))).toBe(false);
  });

  it('assignToGroup moves objects, null clears, unknown refs are skipped', () => {
    const { api, engine } = make();

    api.defineGroups([{ id: 'g', color: [0, 0, 1, 1] }]);
    api.upsertObjects(many(3));
    api.assignToGroup('g', [{ hostId: 'o0' }, { hostId: 'o1' }, { hostId: 'missing' }]);
    expect(api.getGroups()[0].count).toBe(2);
    api.assignToGroup(null, [{ hostId: 'o0' }]);
    expect(engine.objectColors.has(idOf(api, 'o0'))).toBe(false);
    expect(api.getGroups()[0].count).toBe(1);
  });

  it('removeGroup deletes members unless keepObjects', () => {
    const { api } = make();

    api.defineGroups([{ id: 'g', color: [0, 0, 1, 1] }, { id: 'h' }]);
    api.upsertObjects([...many(3, { group: 'g' }), obj('keep', { group: 'h' })]);
    api.removeGroup('g');
    expect(api.listHostObjects().map((o) => o.hostId)).toEqual(['keep']);
    api.removeGroup('h', { keepObjects: true });
    expect(api.listHostObjects()).toHaveLength(1);
    expect(api.getGroups()).toEqual([]);
  });

  it('rejects bad definitions and unknown groups', () => {
    const { api } = make();

    expect(() => api.defineGroups([{ id: '' }])).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.defineGroups([{ id: 'x', color: [2, 0, 0, 1] }])).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.setGroupStyle('nope', { visible: false })).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });

  it('drops membership when an object is removed', () => {
    const { api } = make();

    api.upsertObjects(many(2, { group: 'g' }));
    api.removeObjects(['o0']);
    expect(api.getGroups()[0].count).toBe(1);
  });
});

describe('bulk styles', () => {
  it('setStyleForObjects applies one style with a single colour call and skips unknown refs', () => {
    const { api, engine } = make();

    api.upsertObjects(many(30));
    engine.bulkCalls.length = 0;
    api.setStyleForObjects([...many(30).map((o) => ({ hostId: o.hostId })), { hostId: 'ghost' }], { color: [1, 1, 0, 1] });
    expect(calls(engine, 'setObjectColors')).toEqual([{ fn: 'setObjectColors', n: 30 }]);
    api.setStyleForObjects([{ hostId: 'o0' }], null);
    expect(engine.objectColors.has(idOf(api, 'o0'))).toBe(false);
  });

  it('setObjectStyles validates before applying anything', () => {
    const { api, engine } = make();

    api.upsertObjects(many(2));
    expect(() =>
      api.setObjectStyles([
        { ref: { hostId: 'o0' }, style: { color: [1, 0, 0, 1] } },
        { ref: { hostId: 'o1' }, style: { color: [9, 0, 0, 1] } },
      ])
    ).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(engine.objectColors.size).toBe(0);
  });

  it('clearObjectStyles keeps group styles', () => {
    const { api, engine } = make();

    api.defineGroups([{ id: 'g', color: [0, 0, 1, 1] }]);
    api.upsertObjects(many(2, { group: 'g' }));
    api.setObjectStyles([{ ref: { hostId: 'o0' }, style: { color: [1, 0, 0, 1] } }]);
    api.clearObjectStyles();
    expect(engine.objectColors.get(idOf(api, 'o0'))).toEqual([0, 0, 1, 1]);
  });

  it('is reachable through execute()', async () => {
    const { api } = make();

    await api.execute({ cmd: 'upsertObjects', args: [many(2)] });
    const res = await api.execute({ cmd: 'defineGroups', args: [[{ id: 'g' }]] });

    expect(res).toMatchObject({ ok: true });
    expect(await api.execute({ cmd: 'getGroups' })).toMatchObject({ ok: true, result: [{ id: 'g', count: 0 }] });
  });
});

describe('label budget', () => {
  it('draws at most N host labels, selected first then highlighted', async () => {
    const { api, engine } = make();

    api.upsertObjects(many(10));
    api.setStyleForObjects(
      many(10).map((o) => ({ hostId: o.hostId })),
      { label: true }
    );
    api.setObjectStyle({ hostId: 'o7' }, { label: true, highlight: true });
    api.setLayers({ labelBudget: 3 });
    let labels = engine.labelSets.at(-1) as { id: number }[];

    expect(labels).toHaveLength(3);
    expect(labels[0].id).toBe(idOf(api, 'o7'));

    await api.select({ hostId: 'o9' });
    engine.selectionCb(idOf(api, 'o9'));
    labels = engine.labelSets.at(-1) as { id: number }[];
    expect(labels[0].id).toBe(idOf(api, 'o9'));
    expect(labels[1].id).toBe(idOf(api, 'o7'));
    expect(labels).toHaveLength(3);
  });

  it('defaults to 300 and rejects a bad budget', () => {
    const { api, engine } = make();

    api.upsertObjects(many(400));
    api.setStyleForObjects(
      many(400).map((o) => ({ hostId: o.hostId })),
      { label: true }
    );
    expect(engine.labelSets.at(-1)).toHaveLength(300);
    expect(() => api.setLayers({ labelBudget: -1 })).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.setLayers({ labelBudget: 1.5 })).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });
});

describe('ground-track sample cap', () => {
  const opts = { pastMin: 10, futureMin: 10, stepSec: 30 }; // 40 samples per object

  it('throws for an explicit list over the cap', () => {
    const { api } = make();
    const n = Math.floor(EMBED_MAX_TRACK_SAMPLES / 40) + 1;

    api.upsertObjects(many(n));
    expect(() =>
      api.setGroundTracks(
        many(n).map((o) => ({ hostId: o.hostId })),
        opts
      )
    ).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });

  it('accepts an explicit list at the cap and clamps host mode', () => {
    const { api } = make();
    const fit = Math.floor(EMBED_MAX_TRACK_SAMPLES / 40);

    api.upsertObjects(many(fit + 50));
    expect(() =>
      api.setGroundTracks(
        many(10).map((o) => ({ hostId: o.hostId })),
        opts
      )
    ).not.toThrow();
    api.setGroundTracks('host', opts);
    const tracked = (api as unknown as { tracks_: { trackedIds: () => number[] } }).tracks_.trackedIds();

    expect(tracked.length).toBeLessThanOrEqual(fit);
    expect(tracked.length).toBeGreaterThan(0);
  });
});

describe('boot capacity', () => {
  it('sizes the analyst block from catalog.capacity', () => {
    const config: EmbedConfig = { catalog: { mode: 'scenario', capacity: 15000 } };

    expect(catalogModeOf(config)).toBe('scenario');
    expect(mapEmbedConfigToSettings(config, {}).maxAnalystSats).toBe(15000);
  });

  it('keeps the old floor and clamps to the maximum', () => {
    expect(mapEmbedConfigToSettings({ catalog: { mode: 'scenario' } }, {}).maxAnalystSats).toBe(1024);
    expect(mapEmbedConfigToSettings({ catalog: { mode: 'scenario', capacity: 5_000_000 } }, {}).maxAnalystSats).toBe(100_000);
  });
});
