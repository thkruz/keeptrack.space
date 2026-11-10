import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbed } from '../embed-api';
import { SELECT_TIMEOUT_MS } from '../embed-selection';
import { EMBED_READY_EVENT, type EmbedConfig, type EmbedObject } from '../embed-types';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const obj = (hostId: string, extra: Partial<EmbedObject> = {}): EmbedObject => ({ hostId, name: `Obj ${hostId}`, tle1: GOOD_TLE1, tle2: GOOD_TLE2, ...extra });

function make(config: EmbedConfig = {}, engine = new FakeEngine(config.catalog?.mode ?? 'scenario')) {
  const target = new EventTarget();
  const api = new KeepTrackEmbed(engine, { config, readyTarget: target });

  api.start();

  return { api, engine, target };
}

beforeEach(() => {
  vi.stubGlobal('__IS_PRO__', false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('readiness', () => {
  it('is ready immediately when the engine is, loads boot objects, and dispatches the ready event', async () => {
    const engine = new FakeEngine('scenario');
    const target = new EventTarget();
    const onReady = vi.fn();

    target.addEventListener(EMBED_READY_EVENT, onReady);
    const api = new KeepTrackEmbed(engine, { config: { catalog: { mode: 'scenario', objects: [obj('a')] }, time: { start: 5000, rate: 0 } }, readyTarget: target });
    const readyListener = vi.fn();

    api.on('ready', readyListener);
    api.start();
    await api.whenReady();

    expect(api.isReady).toBe(true);
    expect(api.listHostObjects()).toHaveLength(1);
    expect(engine.timeMs).toBe(5000);
    expect(engine.rate).toBe(0);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(readyListener).toHaveBeenCalledWith({ version: api.version, license: { state: 'missing', edition: 'open' } });
  });

  it('waits for the engine and rejects calls before ready with NOT_READY', async () => {
    vi.useFakeTimers();
    const engine = new FakeEngine();

    engine.ready = false;
    const api = new KeepTrackEmbed(engine, { readyTarget: null });

    api.start();
    expect(() => api.getTime()).toThrow(expect.objectContaining({ code: 'NOT_READY' }));
    engine.ready = true;
    await vi.advanceTimersByTimeAsync(150);
    expect(api.isReady).toBe(true);
    expect(api.getTime().rate).toBe(1);
  });

  it('reports VERSION_MISMATCH once ready but still boots', async () => {
    vi.useFakeTimers();
    const { api } = make({ apiVersion: '9' });
    const errors: unknown[] = [];

    await api.whenReady();
    api.on('error', (e) => errors.push(e));
    await vi.advanceTimersByTimeAsync(5);
    expect(api.isReady).toBe(true);
    expect(errors).toEqual([expect.objectContaining({ code: 'VERSION_MISMATCH' })]);
  });
});

describe('execute', () => {
  it('dispatches commands and echoes the id', async () => {
    const { api } = make();

    expect(await api.execute({ id: '1', cmd: 'getTime' })).toEqual({ id: '1', ok: true, result: expect.objectContaining({ rate: 1, paused: false }) });
    expect(await api.execute({ cmd: 'pause' })).toEqual({ id: undefined, ok: true, result: null });
  });

  it('maps unknown commands, EmbedErrors and stray exceptions without throwing', async () => {
    const { api } = make();

    expect(await api.execute({ cmd: 'nope' as never })).toMatchObject({ ok: false, error: { code: 'UNKNOWN_COMMAND' } });
    expect(await api.execute({ cmd: 'on' as never })).toMatchObject({ ok: false, error: { code: 'UNKNOWN_COMMAND' } });
    expect(await api.execute({ cmd: 'setTime', args: ['garbage'] })).toMatchObject({ ok: false, error: { code: 'INVALID_ARGUMENT' } });
    expect(await api.execute({ cmd: 'upsertSensors', args: ['bad'] })).toMatchObject({ ok: false, error: { code: 'INVALID_ARGUMENT' } });
    expect(await api.execute({ cmd: 'screenshot' })).toMatchObject({ ok: true });
    expect(await api.execute(undefined as never)).toMatchObject({ ok: false, error: { code: 'UNKNOWN_COMMAND' } });
  });

  it('returns NOT_READY before ready except for getLicense', async () => {
    const engine = new FakeEngine();

    engine.ready = false;
    const api = new KeepTrackEmbed(engine, { readyTarget: null });

    expect(await api.execute({ cmd: 'getTime' })).toMatchObject({ ok: false, error: { code: 'NOT_READY' } });
    expect(await api.execute({ cmd: 'getLicense' })).toMatchObject({ ok: true });
  });

  it('upserts through execute', async () => {
    const { api } = make();
    const res = await api.execute({ cmd: 'upsertObjects', args: [[obj('a')]] });

    expect(res).toMatchObject({ ok: true, result: [{ hostId: 'a', ok: true, action: 'added' }] });
  });
});

describe('ownership', () => {
  it('rejects host setters on keeptrack-owned domains', async () => {
    const { api } = make({ ownership: { time: 'keeptrack', selection: 'keeptrack', catalog: 'keeptrack', camera: 'keeptrack' } });

    expect(() => api.setTime(1)).toThrow(expect.objectContaining({ code: 'DOMAIN_NOT_OWNED' }));
    expect(() => api.setRate(2)).toThrow(expect.objectContaining({ code: 'DOMAIN_NOT_OWNED' }));
    expect(() => api.upsertObjects([])).toThrow(expect.objectContaining({ code: 'DOMAIN_NOT_OWNED' }));
    expect(() => api.setCamera({ mode: 'earth' })).toThrow(expect.objectContaining({ code: 'DOMAIN_NOT_OWNED' }));
    await expect(api.select(null)).rejects.toMatchObject({ code: 'DOMAIN_NOT_OWNED' });
    expect(await api.execute({ cmd: 'pause' })).toMatchObject({ ok: false, error: { code: 'DOMAIN_NOT_OWNED' } });
    // getters still work
    expect(api.getTime().rate).toBe(1);
  });

  it('emits changeRequested when the user acts on host-owned selection and time', () => {
    const { api, engine } = make({ ownership: { selection: 'host', time: 'host' } });
    const requests: unknown[] = [];

    api.on('changeRequested', (r) => requests.push(r));
    api.upsertObjects([obj('a')]);
    const id = engine.objects.keys().next().value as number;

    engine.guards.selection?.(id);
    engine.guards.selection?.(-1);
    engine.guards.time?.({ rate: 10 });

    expect(requests).toEqual([
      { domain: 'selection', value: expect.objectContaining({ hostId: 'a' }) },
      { domain: 'selection', value: null },
      { domain: 'time', value: { rate: 10 } },
    ]);
  });

  it('installs no guards for shared domains', () => {
    const { engine } = make({ ownership: { selection: 'shared' } });

    expect(engine.guards.selection).toBeUndefined();
    expect(engine.guards.time).toBeUndefined();
  });
});

describe('selection', () => {
  it('selects a host object and tags the event source as host; user selection as user', async () => {
    const { api, engine } = make();
    const events: { object: { hostId?: string } | null; source: string }[] = [];

    api.on('selectionChanged', (e) => events.push(e as never));
    api.upsertObjects([obj('a')]);
    expect(await api.select({ hostId: 'a' })).toBe(true);
    expect(api.getSelected()?.hostId).toBe('a');
    // user clicks away (selection callback fired outside a host call)
    engine.selectionCb(-1);
    expect(events.map((e) => [e.object?.hostId ?? null, e.source])).toEqual([
      ['a', 'host'],
      [null, 'user'],
    ]);
  });

  it('does not repeat selectionChanged for the same object', async () => {
    const { api, engine } = make();
    const fn = vi.fn();

    api.on('selectionChanged', fn);
    api.upsertObjects([obj('a')]);
    await api.select({ hostId: 'a' });
    engine.selectionCb(engine.selectedId);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until the cruncher has seeded the dot', async () => {
    vi.useFakeTimers();
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    engine.selectFailuresLeft = 3;
    const p = api.select({ hostId: 'a' });

    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toBe(true);
    expect(engine.selectCalls.length).toBe(4);
  });

  it('resolves false after the timeout and rejects unknown objects', async () => {
    vi.useFakeTimers();
    const { api, engine } = make();

    api.upsertObjects([obj('a')]);
    engine.selectFailuresLeft = Number.MAX_SAFE_INTEGER;
    const p = api.select({ hostId: 'a' });

    await vi.advanceTimersByTimeAsync(SELECT_TIMEOUT_MS + 1000);
    await expect(p).resolves.toBe(false);
    await expect(api.select({ hostId: 'missing' })).rejects.toMatchObject({ code: 'OBJECT_NOT_FOUND' });
  });

  it('a newer select supersedes a pending one', async () => {
    vi.useFakeTimers();
    const { api, engine } = make();

    api.upsertObjects([obj('a'), obj('b')]);
    engine.selectFailuresLeft = 1;
    const first = api.select({ hostId: 'a' });
    const second = api.select({ hostId: 'b' });

    await vi.advanceTimersByTimeAsync(1000);
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
  });

  it('validates camera options and forwards them', () => {
    const { api, engine } = make();

    api.setCamera({ mode: 'orbit', distanceKm: 500 });
    expect(engine.cameraCalls).toEqual([['orbit', 500]]);
    expect(() => api.setCamera({ mode: 'bogus' as never })).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.setCamera({ distanceKm: -1 })).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });
});

describe('time', () => {
  it('sets time, rate, pause and play, resuming at the previous rate', () => {
    const { api, engine } = make();

    api.setTime('2026-01-01T00:00:00Z');
    expect(engine.timeMs).toBe(Date.parse('2026-01-01T00:00:00Z'));
    api.setRate(60);
    api.pause();
    expect(api.getTime()).toMatchObject({ rate: 0, paused: true });
    api.setTime(1234);
    expect(api.getTime()).toMatchObject({ timeMs: 1234, paused: true });
    api.play();
    expect(api.getTime()).toMatchObject({ rate: 60, paused: false });
  });

  it('rejects bad input', () => {
    const { api } = make();

    expect(() => api.setTime('nope')).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    expect(() => api.setRate(Number.NaN)).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });

  it('emits timeChanged with the right source', () => {
    const { api, engine } = make();
    const events: { source: string; rate: number }[] = [];

    api.on('timeChanged', (e) => events.push(e));
    api.setRate(5);
    engine.rate = 9;
    engine.timeCb(); // user changed it
    expect(events.map((e) => [e.source, e.rate])).toEqual([
      ['host', 5],
      ['user', 9],
    ]);
  });

  it('unsubscribes', () => {
    const { api } = make();
    const fn = vi.fn();
    const off = api.on('timeChanged', fn);

    off();
    api.setRate(3);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('render parking', () => {
  it('suspend and resume drive the engine loop and require readiness', async () => {
    const { api, engine } = make();

    await api.whenReady();
    api.suspend();
    expect(engine.renderSuspended).toBe(true);
    api.resume();
    expect(engine.renderSuspended).toBe(false);
  });

  it('keeps host time control working across a suspend', async () => {
    const { api, engine } = make({ ownership: { time: 'host' } });

    await api.whenReady();
    api.suspend();
    api.setTime(9000);
    api.resume();
    expect(engine.timeMs).toBe(9000);
    expect(api.getTime().timeMs).toBe(9000);
  });
});
