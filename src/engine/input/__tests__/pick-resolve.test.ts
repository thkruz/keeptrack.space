import { resolvePickCandidate } from '../pick-resolve';

describe('resolvePickCandidate', () => {
  const cursor = { x: 100, y: 100 };

  it('returns -1 for no candidates', () => {
    expect(resolvePickCandidate([], cursor, () => null)).toBe(-1);
  });

  it('returns the only candidate without projecting', () => {
    const getCentre = vi.fn();

    expect(resolvePickCandidate([{ id: 7, pixelDistance2: 4 }], cursor, getCentre)).toBe(7);
    expect(getCentre).not.toHaveBeenCalled();
  });

  it('prefers the dot centre nearest the cursor over the square under the cursor pixel', () => {
    const centres: Record<number, { x: number; y: number }> = { 1: { x: 108, y: 104 }, 2: { x: 101, y: 100 } };

    // id 1 owns the cursor pixel (distance 0) but its centre is 8 px away
    expect(
      resolvePickCandidate(
        [
          { id: 1, pixelDistance2: 0 },
          { id: 2, pixelDistance2: 9 },
        ],
        cursor,
        (id) => centres[id]
      )
    ).toBe(2);
  });

  it('falls back to nearest pixel when no centres are known', () => {
    expect(
      resolvePickCandidate(
        [
          { id: 1, pixelDistance2: 9 },
          { id: 2, pixelDistance2: 1 },
        ],
        cursor,
        () => null
      )
    ).toBe(2);
  });

  it('breaks centre ties by nearest pixel and ignores ids with unknown centre', () => {
    const centres: Record<number, { x: number; y: number } | null> = { 1: { x: 102, y: 100 }, 2: { x: 98, y: 100 }, 3: null };

    expect(
      resolvePickCandidate(
        [
          { id: 1, pixelDistance2: 5 },
          { id: 2, pixelDistance2: 2 },
          { id: 3, pixelDistance2: 0 },
        ],
        cursor,
        (id) => centres[id]
      )
    ).toBe(2);
  });
});
