import { describe, expect, it } from 'vitest';
import { buildResolveFragment, findFloatColorExtension, isSamePlan, planSceneryAttachments, SCENERY_BLOOM_LEVELS } from '../scenery-target';

describe('planSceneryAttachments', () => {
  it('returns null for a zero or negative size', () => {
    expect(planSceneryAttachments(0, 100)).toBeNull();
    expect(planSceneryAttachments(100, 0)).toBeNull();
    expect(planSceneryAttachments(-4, 10)).toBeNull();
    expect(planSceneryAttachments(Number.NaN, 10)).toBeNull();
  });

  it('starts the bloom chain at half resolution with five levels', () => {
    const plan = planSceneryAttachments(1280, 720);

    expect(plan?.bloom).toHaveLength(SCENERY_BLOOM_LEVELS);
    expect(plan?.bloom[0]).toEqual({ width: 640, height: 360 });
    expect(plan?.bloom[4]).toEqual({ width: 40, height: 22 });
  });

  it('never produces a zero-size level for tiny buffers', () => {
    const plan = planSceneryAttachments(3, 1);

    expect(plan?.bloom.every((l) => l.width >= 1 && l.height >= 1)).toBe(true);
  });

  it('compares plans by drawing-buffer size', () => {
    expect(isSamePlan(planSceneryAttachments(10, 10), planSceneryAttachments(10, 10))).toBe(true);
    expect(isSamePlan(planSceneryAttachments(10, 10), planSceneryAttachments(11, 10))).toBe(false);
    expect(isSamePlan(null, planSceneryAttachments(10, 10))).toBe(false);
  });
});

describe('findFloatColorExtension', () => {
  it('prefers EXT_color_buffer_float', () => {
    expect(findFloatColorExtension({ getExtension: () => ({}) } as never)).toBe('EXT_color_buffer_float');
  });

  it('falls back to the half-float extension', () => {
    const gl = { getExtension: (n: string) => (n === 'EXT_color_buffer_half_float' ? {} : null) };

    expect(findFloatColorExtension(gl as never)).toBe('EXT_color_buffer_half_float');
  });

  it('returns null when neither exists, so the feature turns itself off', () => {
    expect(findFloatColorExtension({ getExtension: () => null } as never)).toBeNull();
  });
});

describe('buildResolveFragment', () => {
  it('copies depth through gl_FragDepth and calls the hook function', () => {
    const src = buildResolveFragment('vec3 sceneryResolve(vec3 a, vec3 b, vec2 c) { return a; }');

    expect(src).toContain('gl_FragDepth');
    expect(src).toContain('sceneryResolve(');
    expect(src).toContain('#version 300 es');
  });
});
