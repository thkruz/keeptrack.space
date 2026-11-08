import { sampleAccessWindows } from '@app/embed/embed-access-windows';

const MIN = 60_000;
/** In view on [from, to) minutes after t0, elevation = minutes since t0. */
const visibleBetween = (from: number, to: number) => (t: number) => {
  const m = t / MIN;

  return { inView: m >= from && m < to, elDeg: m };
};

describe('sampleAccessWindows', () => {
  it('reports a contact that spans the whole query window', () => {
    expect(sampleAccessWindows(0, 60 * MIN, 30_000, () => ({ inView: true, elDeg: 10 }))).toEqual([{ startMs: 0, endMs: 60 * MIN, maxElDeg: 10 }]);
  });

  it('clips contacts that cross the start or end boundary', () => {
    const windows = sampleAccessWindows(10 * MIN, 50 * MIN, MIN, (t) => (t < 20 * MIN || t >= 40 * MIN ? { inView: true, elDeg: t / MIN } : { inView: false, elDeg: 0 }));

    expect(windows).toEqual([
      { startMs: 10 * MIN, endMs: 19 * MIN, maxElDeg: 19 },
      { startMs: 40 * MIN, endMs: 50 * MIN, maxElDeg: 50 },
    ]);
  });

  it('finds a contact wholly inside the window and samples the end boundary off-step', () => {
    expect(sampleAccessWindows(0, 10.5 * MIN, MIN, visibleBetween(3, 6))).toEqual([{ startMs: 3 * MIN, endMs: 5 * MIN, maxElDeg: 5 }]);
  });

  it('treats an unpropagatable sample as out of view', () => {
    expect(sampleAccessWindows(0, 4 * MIN, MIN, (t) => (t === 2 * MIN ? null : { inView: true, elDeg: 1 }))).toEqual([
      { startMs: 0, endMs: MIN, maxElDeg: 1 },
      { startMs: 3 * MIN, endMs: 4 * MIN, maxElDeg: 1 },
    ]);
  });
});
