import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { type Degrees, type Kilometers, Sgp4, SpaceObjectType } from '@ootk/src/main';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbedData } from '../embed-data';
import { KeepTrackEmbedEngine } from '../embed-engine-impl';
import { EmbedPropagation, type PropagatorProbe } from '../embed-propagation';
import type { EmbedSensors } from '../embed-sensors';
import { EmbedError } from '../embed-types';
import { GOOD_TLE1, GOOD_TLE2 } from './fake-engine';

const t0 = Date.UTC(2024, 0, 1, 12, 30, 0);

function probe(configured: PropagatorProbe['configured'] extends () => infer R ? R : never, active: { v: boolean }, now: { v: number }): PropagatorProbe {
  return { configured: () => configured, isWasmActive: () => active.v, nowMs: () => now.v };
}

describe('EmbedPropagation gate', () => {
  it('reports sgp4-js and never blocks when the backend is plain sgp4', () => {
    const p = new EmbedPropagation(probe('sgp4', { v: false }, { v: 0 }));

    expect(p.isLoading()).toBe(false);
    expect(p.active()).toBe('sgp4-js');
    expect(() => p.assertReady()).not.toThrow();
  });

  it('blocks with NOT_READY while a configured wasm backend loads, then reports it', async () => {
    const active = { v: false };
    const now = { v: 0 };
    const p = new EmbedPropagation(probe('sgp4-xp-wasm', active, now), 1000);

    expect(() => p.assertReady()).toThrow(EmbedError);
    expect(p.active()).toBe('sgp4-js');
    active.v = true;
    expect(() => p.assertReady()).not.toThrow();
    expect(p.active()).toBe('sgp4-xp-wasm');
    await expect(p.whenReady()).resolves.toBe('sgp4-xp-wasm');
  });

  it('falls back to sgp4-js after the grace period when the wasm never activates', async () => {
    const now = { v: 0 };
    const p = new EmbedPropagation(probe('sgp4-wasm', { v: false }, now), 1000);

    expect(p.isLoading()).toBe(true);
    now.v = 1001;
    expect(p.isLoading()).toBe(false);
    expect(p.active()).toBe('sgp4-js');
    await expect(p.whenReady()).resolves.toBe('sgp4-js');
  });
});

describe('data out uses the display propagation entry (Sgp4.propagate)', () => {
  const satrec = Sgp4.createSatrec(GOOD_TLE1, GOOD_TLE2);
  const sensor = new DetailedSensor({
    lat: 40 as Degrees,
    lon: -75 as Degrees,
    alt: 0.1 as Kilometers,
    minAz: 0 as Degrees,
    maxAz: 360 as Degrees,
    minEl: 0 as Degrees,
    maxEl: 90 as Degrees,
    minRng: 0 as Kilometers,
    maxRng: 100000 as Kilometers,
    type: SpaceObjectType.OBSERVER,
    name: 'T',
    uiName: 'T',
    system: 'T',
    country: 'T',
    objName: 'T',
    operator: 'T',
  } as never);

  beforeEach(() => {
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({ getObject: () => ({ satrec }) } as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getPosition, getLookAngles and findAccessWindows all call Sgp4.propagate with the object satrec', () => {
    const engine = new KeepTrackEmbedEngine('scenario');
    const spy = vi.spyOn(Sgp4, 'propagate');

    engine.getPosition(1, t0);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.every(([sr]) => sr === satrec)).toBe(true);
    spy.mockClear();
    engine.getLookAngles(sensor as never, 1, t0);
    expect(spy).toHaveBeenCalledWith(satrec, expect.any(Number));
    spy.mockClear();
    engine.findAccessWindows(sensor as never, 1, t0, t0 + 3_600_000);
    expect(spy).toHaveBeenCalledWith(satrec, expect.any(Number));
  });

  it('a routed (wasm-style) Sgp4.propagate result is what data out returns', () => {
    const engine = new KeepTrackEmbedEngine('scenario');
    const real = Sgp4.propagate.bind(Sgp4);
    const spy = vi.spyOn(Sgp4, 'propagate').mockImplementation((sr, m) => {
      const r = real(sr, m);

      return { ...r, position: r.position && { x: r.position.x + 1, y: r.position.y, z: r.position.z } } as never;
    });
    const shifted = engine.getPosition(1, t0);

    spy.mockRestore();
    const plain = engine.getPosition(1, t0);

    expect((shifted?.eci.x ?? 0) - (plain?.eci.x ?? 0)).toBeCloseTo(1, 6);
  });

  it('matches a direct Sgp4.propagate call within 1 m for a normal SGP4 TLE', () => {
    const engine = new KeepTrackEmbedEngine('scenario');
    const pos = engine.getPosition(1, t0);
    const direct = Sgp4.propagate(satrec, (t0 / 86_400_000 + 2440587.5 - satrec.jdsatepoch - (satrec.jdsatepochF ?? 0)) * 1440).position;

    expect(pos).not.toBeNull();
    const dx = (pos?.eci.x ?? 0) - (direct?.x ?? 0);
    const dy = (pos?.eci.y ?? 0) - (direct?.y ?? 0);
    const dz = (pos?.eci.z ?? 0) - (direct?.z ?? 0);

    expect(Math.hypot(dx, dy, dz) * 1000).toBeLessThan(1);
  });

  it('EmbedData data-out methods throw NOT_READY while the wasm backend loads', () => {
    const gate = new EmbedPropagation(probe('sgp4-xp-wasm', { v: false }, { v: 0 }));
    const data = new EmbedData({} as never, {} as never, {} as EmbedSensors, gate);

    expect(() => data.getPosition({ hostId: 'a' })).toThrow(/still loading/u);
    expect(() => data.getLookAngles('s', { hostId: 'a' })).toThrow(/still loading/u);
    expect(() => data.getAccessWindows('s', { hostId: 'a' }, 0, 1)).toThrow(/still loading/u);
  });
});
