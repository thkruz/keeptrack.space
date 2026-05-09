import { errorManagerInstance } from '@app/engine/utils/errorManager';
import {
  _resetVelocityInvariantReportingForTests,
  ensureVelocityVec3,
  freshZeroVec3,
} from '@app/engine/utils/space-object-invariants';
import { KilometersPerSecond, TemeVec3 } from '@ootk/src/main';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MutableTarget = {
  id?: number;
  name?: string;
  type?: number;
  velocity: TemeVec3<KilometersPerSecond>;
};

describe('ensureVelocityVec3', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetVelocityInvariantReportingForTests();
    warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => { /* silence */ });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves a valid Vec3 and does not warn', () => {
    const target: MutableTarget = {
      id: 1,
      velocity: { x: 1, y: 2, z: 3 } as TemeVec3<KilometersPerSecond>,
    };

    const out = ensureVelocityVec3(target, 'test');

    expect(out).toBe(target.velocity);
    expect(target.velocity).toEqual({ x: 1, y: 2, z: 3 });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('replaces a scalar 0 with a fresh zero Vec3 and warns once', () => {
    const target = { id: 42, name: 'BadSat', type: 1, velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };

    const out = ensureVelocityVec3(target as MutableTarget, 'test');

    expect(out).toEqual({ x: 0, y: 0, z: 0 });
    expect(target.velocity).toBe(out);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0] as string;

    expect(msg).toContain('callsite=test');
    expect(msg).toContain('id=42');
    expect(msg).toContain('name=BadSat');
    expect(msg).toContain('priorType=number');
  });

  it('replaces null velocity and reports priorType=object', () => {
    const target = { id: 7, velocity: null as unknown as TemeVec3<KilometersPerSecond> };

    ensureVelocityVec3(target as MutableTarget, 'test');

    expect(target.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('priorValue=null');
  });

  it('replaces undefined velocity and warns', () => {
    const target = { id: 8, velocity: undefined as unknown as TemeVec3<KilometersPerSecond> };

    ensureVelocityVec3(target as MutableTarget, 'test');

    expect(target.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('dedups repeated bad calls for the same (callsite, id)', () => {
    const target = { id: 99, velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };

    ensureVelocityVec3(target as MutableTarget, 'test');
    target.velocity = 0 as unknown as TemeVec3<KilometersPerSecond>;
    ensureVelocityVec3(target as MutableTarget, 'test');
    target.velocity = 0 as unknown as TemeVec3<KilometersPerSecond>;
    ensureVelocityVec3(target as MutableTarget, 'test');

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('reports separately for the same id from a different callsite', () => {
    const a = { id: 5, velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };
    const b = { id: 5, velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };

    ensureVelocityVec3(a as MutableTarget, 'callsite-a');
    ensureVelocityVec3(b as MutableTarget, 'callsite-b');

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('reports separately for different ids from the same callsite', () => {
    const a = { id: 1, velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };
    const b = { id: 2, velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };

    ensureVelocityVec3(a as MutableTarget, 'test');
    ensureVelocityVec3(b as MutableTarget, 'test');

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('uses "unknown" as the dedup id when target has no id', () => {
    const a = { velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };
    const b = { velocity: 0 as unknown as TemeVec3<KilometersPerSecond> };

    ensureVelocityVec3(a as MutableTarget, 'test');
    ensureVelocityVec3(b as MutableTarget, 'test');

    // Both dedup under callsite=test, id=unknown — only one warn.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('id=unknown');
  });
});

describe('freshZeroVec3', () => {
  it('returns a brand-new zero Vec3 each call', () => {
    const a = freshZeroVec3();
    const b = freshZeroVec3();

    expect(a).toEqual({ x: 0, y: 0, z: 0 });
    expect(b).toEqual({ x: 0, y: 0, z: 0 });
    expect(a).not.toBe(b);
  });
});
