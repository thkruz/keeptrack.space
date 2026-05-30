import { resetPosition, resetVelocity, setPosition } from '@app/webworker/positionCruncher/satCache';

describe('satCache', () => {
  describe('setPosition', () => {
    it('writes x/y/z into the i-th slot (stride 3)', () => {
      const buf = new Float32Array(9);

      setPosition(buf, 1, { x: 1, y: 2, z: 3 });

      expect(Array.from(buf)).toEqual([0, 0, 0, 1, 2, 3, 0, 0, 0]);
    });

    it('returns the same buffer', () => {
      const buf = new Float32Array(3);

      expect(setPosition(buf, 0, { x: 5, y: 6, z: 7 })).toBe(buf);
    });
  });

  describe('resetPosition', () => {
    it('zeroes the i-th position slot', () => {
      const buf = new Float32Array([1, 2, 3, 4, 5, 6]);

      resetPosition(buf, 0);

      expect(Array.from(buf)).toEqual([0, 0, 0, 4, 5, 6]);
    });
  });

  describe('resetVelocity', () => {
    it('zeroes the i-th velocity slot', () => {
      const buf = new Float32Array([1, 2, 3, 4, 5, 6]);

      resetVelocity(buf, 1);

      expect(Array.from(buf)).toEqual([1, 2, 3, 0, 0, 0]);
    });
  });
});
