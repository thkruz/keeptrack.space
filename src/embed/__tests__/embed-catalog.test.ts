import { beforeEach, describe, expect, it } from 'vitest';
import { EmbedCatalog, isValidTlePair } from '../embed-catalog';
import { FakeEngine, GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const o = (hostId: string, extra = {}) => ({ hostId, name: `N ${hostId}`, tle1: GOOD_TLE1, tle2: GOOD_TLE2, ...extra });

describe('isValidTlePair', () => {
  it('accepts a well-formed pair and rejects bad length, prefix and checksum', () => {
    expect(isValidTlePair(GOOD_TLE1, GOOD_TLE2)).toBe(true);
    expect(isValidTlePair(GOOD_TLE1.slice(0, 68), GOOD_TLE2)).toBe(false);
    expect(isValidTlePair(GOOD_TLE2, GOOD_TLE1)).toBe(false);
    const badSum = GOOD_TLE1.slice(0, 68) + String((Number(GOOD_TLE1[68]) + 1) % 10);

    expect(isValidTlePair(badSum, GOOD_TLE2)).toBe(false);
    expect(isValidTlePair(undefined, GOOD_TLE2)).toBe(false);
  });
});

describe('scenario catalog', () => {
  let engine: FakeEngine;
  let cat: EmbedCatalog;

  beforeEach(() => {
    engine = new FakeEngine('scenario');
    cat = new EmbedCatalog(engine);
  });

  it('adds objects to slots and maps hostId to engine id', () => {
    const res = cat.upsert([o('a'), o('b')]);

    expect(res).toEqual([
      { hostId: 'a', ok: true, action: 'added' },
      { hostId: 'b', ok: true, action: 'added' },
    ]);
    const idA = cat.resolveRef({ hostId: 'a' });
    const idB = cat.resolveRef({ hostId: 'b' });

    expect(idA).not.toBeNull();
    expect(idA).not.toBe(idB);
    expect(cat.getObject({ hostId: 'a' })).toMatchObject({ hostId: 'a', name: 'N a' });
    expect(cat.listHostObjects().map((x) => x.hostId)).toEqual(['a', 'b']);
  });

  it('updates in place on a second upsert', () => {
    cat.upsert([o('a')]);
    const id = cat.resolveRef({ hostId: 'a' });
    const res = cat.upsert([o('a', { name: 'Renamed' })]);

    expect(res[0]).toEqual({ hostId: 'a', ok: true, action: 'updated' });
    expect(cat.resolveRef({ hostId: 'a' })).toBe(id);
    expect(engine.activateCalls).toHaveLength(1);
    expect(cat.getObject({ hostId: 'a' })?.name).toBe('Renamed');
  });

  it('reports INVALID_TLE, INVALID_ARGUMENT, NO_FREE_SLOT and engine rejection per object', () => {
    engine.slotsFree = 1;
    const res = cat.upsert([o('bad', { tle1: 'x' }), { hostId: '', name: 'n', tle1: GOOD_TLE1, tle2: GOOD_TLE2 }, o('a'), o('b')]);

    expect(res.map((r) => r.error ?? 'ok')).toEqual(['INVALID_TLE', 'INVALID_ARGUMENT', 'ok', 'NO_FREE_SLOT']);
    engine.slotsFree = 5;
    engine.rejectActivate = true;
    expect(cat.upsert([o('c')])[0]).toEqual({ hostId: 'c', ok: false, error: 'INVALID_TLE' });
  });

  it('removes objects, releasing slots, and ignores unknown ids', () => {
    cat.upsert([o('a')]);
    const id = cat.resolveRef({ hostId: 'a' });

    expect(cat.remove(['a', 'zzz'])).toEqual([id]);
    expect(engine.releaseCalls).toEqual([id]);
    expect(cat.getObject({ hostId: 'a' })).toBeNull();
  });

  it('finds a host object by its NORAD number', () => {
    cat.upsert([o('a', { norad: '25544' })]);
    expect(cat.getObject({ norad: '25544' })?.hostId).toBe('a');
    expect(cat.getObject({ norad: '1' })).toBeNull();
  });

  it('fits ~200 objects with a large slot budget', () => {
    engine.slotsFree = 1024;
    const res = cat.upsert(Array.from({ length: 200 }, (_, i) => o(`h${i}`)));

    expect(res.every((r) => r.ok)).toBe(true);
  });
});

describe('full catalog overrides', () => {
  const catalogTle1 = '1 25544U 98067A   20001.50000000  .00000000  00000-0  00000-0 0  9990';
  const catalogTle2 = '2 25544  51.6000 100.0000 0001000   0.0000   0.0000 15.50000000    10';
  let engine: FakeEngine;
  let cat: EmbedCatalog;

  beforeEach(() => {
    engine = new FakeEngine('full');
    engine.objects.set(7, { id: 7, name: 'ISS', norad: '25544', tle1: catalogTle1, tle2: catalogTle2 });
    cat = new EmbedCatalog(engine);
  });

  it('overrides the catalog object with a matching NORAD and reverts on remove', () => {
    const res = cat.upsert([o('iss', { norad: '25544' })]);

    expect(res[0]).toEqual({ hostId: 'iss', ok: true, action: 'overrode-catalog' });
    expect(cat.resolveRef({ hostId: 'iss' })).toBe(7);
    expect(engine.activateCalls).toHaveLength(0);
    expect(engine.objects.get(7)?.tle1).toBe(GOOD_TLE1);

    cat.remove(['iss']);
    expect(engine.objects.get(7)).toMatchObject({ name: 'ISS', tle1: catalogTle1, tle2: catalogTle2 });
    expect(engine.releaseCalls).toHaveLength(0);
  });

  it('keeps the original elements across repeated updates', () => {
    cat.upsert([o('iss', { norad: '25544' })]);
    expect(cat.upsert([o('iss', { norad: '25544', name: 'v2' })])[0].action).toBe('updated');
    cat.remove(['iss']);
    expect(engine.objects.get(7)?.tle1).toBe(catalogTle1);
  });

  it('uses a slot when the NORAD is not in the catalog and refuses double claims', () => {
    expect(cat.upsert([o('x', { norad: '99999' })])[0].action).toBe('added');
    cat.upsert([o('a', { norad: '25544' })]);
    expect(cat.upsert([o('b', { norad: '25544' })])[0]).toEqual({ hostId: 'b', ok: false, error: 'INVALID_ARGUMENT' });
  });

  it('adds fictional objects without NORAD as slots', () => {
    expect(cat.upsert([o('f')])[0].action).toBe('added');
  });
});
