import { assessRelationship, planeAngleDeg } from '@app/plugins/plot-analysis/ric-plots-assessment';

describe('planeAngleDeg', () => {
  it('is zero for identical planes', () => {
    expect(planeAngleDeg(53, 120, 53, 120)).toBeCloseTo(0);
  });

  it('equals the inclination difference when RAAN matches', () => {
    expect(planeAngleDeg(50, 0, 53, 0)).toBeCloseTo(3);
  });

  it('grows with a RAAN split', () => {
    expect(planeAngleDeg(53, 0, 53, 30)).toBeGreaterThan(0);
  });
});

describe('assessRelationship', () => {
  const sameOrbit = { inc1: 53, raan1: 120, period1: 95, inc2: 53, raan2: 120, period2: 95 };

  it('flags closely-spaced when the pair stays near each other', () => {
    const a = assessRelationship({ ...sameOrbit, maxRangeKm: 40 });

    expect(a.relationship).toBe('closely-spaced');
  });

  it('flags co-orbital for the same plane and period but spread apart', () => {
    const a = assessRelationship({ ...sameOrbit, maxRangeKm: 8000 });

    expect(a.relationship).toBe('co-orbital');
    expect(a.planeAngleDeg).toBeCloseTo(0);
    expect(a.periodDiffPct).toBeCloseTo(0);
  });

  it('flags co-planar for the same plane but a different period', () => {
    const a = assessRelationship({ inc1: 53, raan1: 120, period1: 95, inc2: 53, raan2: 120, period2: 110, maxRangeKm: 5000 });

    expect(a.relationship).toBe('co-planar');
    expect(a.periodDiffPct).toBeGreaterThan(2);
  });

  it('flags unrelated when the planes differ', () => {
    const a = assessRelationship({ inc1: 53, raan1: 0, period1: 95, inc2: 98, raan2: 200, period2: 100, maxRangeKm: 12000 });

    expect(a.relationship).toBe('unrelated');
    expect(a.planeAngleDeg).toBeGreaterThan(2);
  });

  it('returns unknown when an element is not finite', () => {
    const a = assessRelationship({ ...sameOrbit, inc2: NaN, maxRangeKm: 40 });

    expect(a.relationship).toBe('unknown');
  });

  it('prioritizes closely-spaced even across different planes (bounded proximity)', () => {
    const a = assessRelationship({ inc1: 53, raan1: 0, period1: 95, inc2: 80, raan2: 90, period2: 95, maxRangeKm: 25 });

    expect(a.relationship).toBe('closely-spaced');
  });
});
