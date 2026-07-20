/* eslint-disable dot-notation */

import { DotsManager } from '@app/engine/rendering/dots-manager';
import { BaseObject, KilometersPerSecond, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * Pure accessor / bookkeeping logic in DotsManager: position lookups, the
 * spatial nearest-sat search, in-sun/in-view/velocity getters, the picking
 * color packing, and the pos/vel writer (including missile velocity smoothing).
 * GL is only touched by setupPickingBuffer, which uses the mock renderer.
 */
describe('DotsManager logic', () => {
  let dots: DotsManager;

  beforeEach(() => {
    setupStandardEnvironment();
    dots = new DotsManager();
  });

  afterEach(() => vi.restoreAllMocks());

  describe('position accessors', () => {
    beforeEach(() => {
      dots.positionData = new Float32Array([10, 20, 30, 40, 50, 60]);
    });

    it('getCurrentPosition reads the xyz triple for an index', () => {
      expect(dots.getCurrentPosition(1)).toStrictEqual({ x: 40, y: 50, z: 60 });
    });

    it('getPositionArray returns the triple as an array', () => {
      expect(dots.getPositionArray(0)).toStrictEqual([10, 20, 30]);
    });

    it('getPositionArray returns the origin when the index is out of range', () => {
      expect(dots.getPositionArray(99)).toStrictEqual([0, 0, 0]);
    });
  });

  describe('getIdFromEci (nearest-sat search)', () => {
    beforeEach(() => {
      dots.positionData = new Float32Array([1000, 0, 0, 2000, 0, 0, 3000, 0, 0]);
    });

    it('returns the id of a satellite within 1 km', () => {
      expect(dots.getIdFromEci({ x: 1000, y: 0, z: 0 })).toBe(0);
    });

    it('returns the closest candidate within the 100 km box', () => {
      expect(dots.getIdFromEci({ x: 2050, y: 0, z: 0 })).toBe(1);
    });

    it('returns null when nothing is nearby', () => {
      expect(dots.getIdFromEci({ x: 50000, y: 0, z: 0 })).toBeNull();
    });

    it('returns null when there is no position data', () => {
      dots.positionData = null as never;
      expect(dots.getIdFromEci({ x: 0, y: 0, z: 0 })).toBeNull();
    });
  });

  describe('typed-array getters', () => {
    it('return the backing array when set, else an empty array', () => {
      const inSun = new Int8Array([2, 1, 0]);

      dots.inSunData = inSun;
      expect(dots.getSatInSun()).toBe(inSun);

      dots.inViewData = null as never;
      expect(dots.getSatInView()).toHaveLength(0);
    });
  });

  describe('setupPickingBuffer', () => {
    it('packs each id into normalized RGB color components', () => {
      dots['pickingColorData'] = [];
      dots.setupPickingBuffer(2);

      // id 1 -> R=1/255; id 2 -> R=2/255; both G=B=0 (ids below 256).
      expect(dots['pickingColorData'][0]).toBeCloseTo(1 / 255, 6);
      expect(dots['pickingColorData'][1]).toBe(0);
      expect(dots['pickingColorData'][3]).toBeCloseTo(2 / 255, 6);
    });
  });

  describe('updatePosVel', () => {
    beforeEach(() => {
      dots.positionData = new Float32Array([7000, 0, 0]);
      dots.velocityData = new Float32Array([3, 4, 0]);
    });

    it('writes velocity and position onto a satellite-like object', () => {
      const obj = {
        id: 0,
        isStatic: () => false,
        velocity: { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>,
        position: { x: 0, y: 0, z: 0 } as TemeVec3,
        type: SpaceObjectType.PAYLOAD,
      } as unknown as BaseObject;

      dots.updatePosVel(obj, 0);

      const o = obj as unknown as { velocity: TemeVec3; position: TemeVec3 };

      expect(o.velocity.x).toBe(3);
      expect(o.velocity.y).toBe(4);
      expect(o.position.x).toBe(7000);
    });

    it('smooths a missile total velocity from the initial zero', () => {
      const missile = {
        id: 0,
        isStatic: () => false,
        velocity: { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>,
        position: { x: 0, y: 0, z: 0 } as TemeVec3,
        type: SpaceObjectType.BALLISTIC_MISSILE,
        totalVelocity: 0,
      } as unknown as BaseObject;

      dots.updatePosVel(missile, 0);

      // |(3,4,0)| = 5; first sample seeds totalVelocity directly.
      expect((missile as unknown as { totalVelocity: number }).totalVelocity).toBe(5);
    });

    it('skips velocity work for static objects but still writes position', () => {
      const stat = {
        id: 0,
        isStatic: () => true,
        position: { x: 0, y: 0, z: 0 } as TemeVec3,
      } as unknown as BaseObject;

      expect(() => dots.updatePosVel(stat, 0)).not.toThrow();
      expect((stat as unknown as { position: TemeVec3 }).position.x).toBe(7000);
    });
  });
});
