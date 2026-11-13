import { describe, expect, it } from 'vitest';
import { parseWalkerInputs, planWalker, WALKER_MAX_SATS, type WalkerInputValues, walkerMemberName } from '../create-sat-walker';

const base: WalkerInputValues = { altitude: '550', inclination: '53', total: '24', planes: '3', phasing: '1', prefix: 'STAR' };
const sccs = (n: number): string[] => Array.from({ length: n }, (_, i) => String(90_000 + i));
const epoch = new Date(Date.UTC(2026, 10, 12, 12, 0, 0));

describe('parseWalkerInputs', () => {
  it('accepts a valid 24/3/1 pattern', () => {
    expect(parseWalkerInputs(base)).toEqual({ altitude: 550, inclination: 53, total: 24, planes: 3, phasing: 1 });
  });

  it.each([
    [{ altitude: '100' }, 'altitude'],
    [{ altitude: 'abc' }, 'altitude'],
    [{ inclination: '181' }, 'inclination'],
    [{ total: '0' }, 'total'],
    [{ total: '2.5' }, 'total'],
    [{ total: String(WALKER_MAX_SATS + 1) }, 'tooMany'],
    [{ planes: '0' }, 'planes'],
    [{ planes: '25' }, 'planes'],
    [{ planes: '5' }, 'divisible'],
    [{ phasing: '3' }, 'phasing'],
    [{ phasing: '-1' }, 'phasing'],
  ])('rejects %j as %s', (patch, code) => {
    const result = parseWalkerInputs({ ...base, ...patch });

    expect('code' in result && result.code).toBe(code);
  });
});

describe('walkerMemberName', () => {
  it('builds prefix-P#-S# and fits 24 characters', () => {
    expect(walkerMemberName('STAR', 2, 5)).toBe('STAR-P2-S5');
    expect(walkerMemberName('A'.repeat(40), 12, 12).length).toBeLessThanOrEqual(24);
    expect(walkerMemberName('  ', 1, 1)).toBe('WALKER-P1-S1');
  });
});

describe('planWalker', () => {
  it('creates T members in free slots with spaced RAAN and distinct names', () => {
    const plan = planWalker(base, epoch, sccs(30));

    expect(Array.isArray(plan)).toBe(true);
    const members = plan as Exclude<typeof plan, { code: string }>;

    expect(members).toHaveLength(24);
    expect(members.map((m) => m.params.scc)).toEqual(sccs(24));
    expect(new Set(members.map((m) => m.params.name)).size).toBe(24);
    expect(members[0].params.name).toBe('STAR-P1-S1');
    expect(members[23].params.name).toBe('STAR-P3-S8');
    // 3 planes: RAAN 0, 120, 240
    expect(parseFloat(members[0].params.rasc)).toBeCloseTo(0, 1);
    expect(parseFloat(members[8].params.rasc)).toBeCloseTo(120, 1);
    expect(parseFloat(members[16].params.rasc)).toBeCloseTo(240, 1);
    expect(parseFloat(members[0].params.inc)).toBeCloseTo(53, 1);
    expect(members[0].params.source).toBe('Walker 24/3/1');
  });

  it('applies the phasing offset between planes', () => {
    const f0 = planWalker({ ...base, phasing: '0' }, epoch, sccs(24)) as { params: { meana: string } }[];
    const f1 = planWalker({ ...base, phasing: '1' }, epoch, sccs(24)) as { params: { meana: string } }[];

    // plane 2 first satellite is offset by F * 360 / T = 15 degrees
    const delta = (parseFloat(f1[8].params.meana) - parseFloat(f0[8].params.meana) + 360) % 360;

    expect(delta).toBeCloseTo(15, 0);
  });

  it('reports too few free slots', () => {
    const plan = planWalker(base, epoch, sccs(10));

    expect(plan).toEqual({ code: 'noSlots', detail: { free: 10, needed: 24 } });
  });

  it('passes validation errors through', () => {
    expect(planWalker({ ...base, planes: '5' }, epoch, sccs(24))).toEqual({ code: 'divisible' });
  });
});
