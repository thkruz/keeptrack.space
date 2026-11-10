import { toCacheIndex } from '@app/webworker/cache-index';

describe('toCacheIndex', () => {
  it('accepts integers inside the cache', () => {
    expect(toCacheIndex(0, 3)).toBe(0);
    expect(toCacheIndex(2, 3)).toBe(2);
  });

  it('rejects ids outside the cache', () => {
    expect(toCacheIndex(-1, 3)).toBeNull();
    expect(toCacheIndex(3, 3)).toBeNull();
    expect(toCacheIndex(0, 0)).toBeNull();
  });

  it('rejects non-integer and non-number ids, including prototype keys', () => {
    for (const id of [1.5, NaN, Infinity, '1', '__proto__', 'constructor', undefined, null, {}]) {
      expect(toCacheIndex(id, 10)).toBeNull();
    }
  });
});
