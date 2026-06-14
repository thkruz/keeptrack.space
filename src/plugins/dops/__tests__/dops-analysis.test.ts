import { DopList } from '@app/engine/math/dop-math';
import { dopsToCsvRows, findBestWorstHdop, isValidLocation } from '@app/plugins/dops/dops-analysis';

const entry = (hdop: string, minutes: number): DopList[number] => ({
  time: new Date(Date.UTC(2026, 4, 31, 0, minutes)),
  dops: {
    hdop,
    vdop: '1.20',
    pdop: '2.00',
    gdop: '2.50',
    tdop: '0.80',
  },
  visibleSats: 8,
});

describe('isValidLocation', () => {
  it('accepts valid lat/lon/alt', () => {
    expect(isValidLocation(41, -71, 0)).toBe(true);
    expect(isValidLocation(-90, 180, 12.5)).toBe(true);
  });

  it('rejects out-of-range latitude and longitude', () => {
    expect(isValidLocation(91, 0, 0)).toBe(false);
    expect(isValidLocation(-91, 0, 0)).toBe(false);
    expect(isValidLocation(0, 181, 0)).toBe(false);
    expect(isValidLocation(0, -181, 0)).toBe(false);
  });

  it('rejects NaN / non-finite values', () => {
    expect(isValidLocation(NaN, 0, 0)).toBe(false);
    expect(isValidLocation(0, NaN, 0)).toBe(false);
    expect(isValidLocation(0, 0, NaN)).toBe(false);
    expect(isValidLocation(0, 0, Infinity)).toBe(false);
  });
});

describe('findBestWorstHdop', () => {
  it('finds the lowest and highest HDOP indices', () => {
    const list: DopList = [entry('3.00', 0), entry('1.00', 1), entry('5.00', 2), entry('2.00', 3)];

    expect(findBestWorstHdop(list)).toEqual({ bestIdx: 1, worstIdx: 2 });
  });

  it('skips entries whose HDOP does not parse', () => {
    const list: DopList = [entry('N/A', 0), entry('4.00', 1), entry('2.00', 2)];

    expect(findBestWorstHdop(list)).toEqual({ bestIdx: 2, worstIdx: 1 });
  });

  it('returns -1 indices when no HDOP is finite', () => {
    const list: DopList = [entry('N/A', 0), entry('N/A', 1)];

    expect(findBestWorstHdop(list)).toEqual({ bestIdx: -1, worstIdx: -1 });
  });

  it('handles an empty list', () => {
    expect(findBestWorstHdop([])).toEqual({ bestIdx: -1, worstIdx: -1 });
  });
});

describe('dopsToCsvRows', () => {
  it('flattens each entry into a serializable row', () => {
    const list: DopList = [entry('1.50', 0)];
    const rows = dopsToCsvRows(list);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      time: list[0].time.toISOString(),
      hdop: '1.50',
      vdop: '1.20',
      pdop: '2.00',
      gdop: '2.50',
      tdop: '0.80',
      visibleSats: 8,
    });
  });

  it('returns an empty array for an empty list', () => {
    expect(dopsToCsvRows([])).toEqual([]);
  });
});
