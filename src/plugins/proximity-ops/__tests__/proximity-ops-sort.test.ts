import { ProximityOpsEvent } from '@app/plugins/proximity-ops/proximity-ops-core';
import { DEFAULT_SORT_ASC, DEFAULT_SORT_KEY, sortEvents } from '@app/plugins/proximity-ops/proximity-ops-sort';

const event = (over: Partial<ProximityOpsEvent> = {}): ProximityOpsEvent => ({
  sat1Id: 0,
  sat1SccNum: '25544',
  sat1Name: 'ISS',
  sat2Id: 1,
  sat2SccNum: '48274',
  sat2Name: 'STARLINK',
  ric: { position: { x: 1, y: 2, z: 3 }, velocity: { x: 0.1, y: 0.2, z: 0.3 } },
  dist: 10,
  vel: 0.05,
  pc: null,
  date: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

describe('proximity-ops-sort', () => {
  it('defaults to ascending date', () => {
    expect(DEFAULT_SORT_KEY).toBe('date');
    expect(DEFAULT_SORT_ASC).toBe(true);
  });

  it('sorts by date chronologically and does not mutate the input', () => {
    const input = [event({ date: new Date('2026-03-01T00:00:00Z') }), event({ date: new Date('2026-01-01T00:00:00Z') }), event({ date: new Date('2026-02-01T00:00:00Z') })];
    const sorted = sortEvents(input, 'date', true);

    expect(sorted.map((e) => e.date.toISOString())).toEqual(['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z']);
    // Original order preserved (non-mutating).
    expect(input[0].date.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('sorts numeric columns numerically and respects direction', () => {
    const input = [event({ dist: 30 }), event({ dist: 5 }), event({ dist: 12 })];

    expect(sortEvents(input, 'dist', true).map((e) => e.dist)).toEqual([5, 12, 30]);
    expect(sortEvents(input, 'dist', false).map((e) => e.dist)).toEqual([30, 12, 5]);
  });

  it('orders sccNum identity columns numerically (not lexically)', () => {
    const input = [event({ sat1SccNum: '900' }), event({ sat1SccNum: '1000' }), event({ sat1SccNum: '90' })];

    expect(sortEvents(input, 'target', true).map((e) => e.sat1SccNum)).toEqual(['90', '900', '1000']);
  });

  it('always sorts null Pc values last regardless of direction', () => {
    const input = [event({ pc: null }), event({ pc: 1e-5 }), event({ pc: 1e-9 })];

    expect(sortEvents(input, 'pc', true).map((e) => e.pc)).toEqual([1e-9, 1e-5, null]);
    expect(sortEvents(input, 'pc', false).map((e) => e.pc)).toEqual([1e-5, 1e-9, null]);
  });
});
