import { vi } from 'vitest';
import { CatalogSearch } from '@app/app/data/catalog-search';
import { SatMath } from '@app/app/analysis/sat-math';
import { CatalogSource, Satellite, SpaceObjectType } from '@ootk/src/main';

/*
 * Branch coverage for CatalogSearch paths the existing suite never reaches:
 * the RAAN-wraparound logic in findObjsByOrbit, findReentry, and the
 * special-event debris carve-outs in yearOrLess. normalizeRaan is mocked so
 * the wraparound geometry is deterministic instead of propagation-dependent.
 */
describe('CatalogSearch.findObjsByOrbit', () => {
  // Lightweight stubs — findObjsByOrbit only reads isStatic/inclination/period/id.
  const stub = (id: number, raan: number, over: Partial<Satellite> = {}) => ({
    id,
    inclination: 51,
    period: 90,
    isStatic: () => false,
    testRaan: raan,
    ...over,
  }) as unknown as Satellite;

  beforeEach(() => {
    // Return the per-stub RAAN we tagged on each object.
    vi.spyOn(SatMath, 'normalizeRaan').mockImplementation((s: Satellite) => (s as unknown as { testRaan: number }).testRaan);
  });

  afterEach(() => vi.restoreAllMocks());

  it('matches within tolerance in the normal (non-wrapping) case', () => {
    const target = stub(0, 168);
    const data = [target, stub(1, 170), stub(2, 100), stub(3, 170, { period: 200 })];

    // 170 within [163,173]; 100 outside; id 3 outside period band.
    expect(CatalogSearch.findObjsByOrbit(data, target)).toStrictEqual([0, 1]);
  });

  it('wraps RAAN past 360 when the target sits near north', () => {
    const target = stub(0, 358); // maxRaan = 358+5-360 = 3, minRaan = 353
    const data = [target, stub(1, 1), stub(2, 180)];

    // 1 is inside (<3); 180 is outside; 358 itself is inside (>353).
    expect(CatalogSearch.findObjsByOrbit(data, target)).toStrictEqual([0, 1]);
  });

  it('wraps RAAN below 0 when the target sits just past north', () => {
    const target = stub(0, 2); // minRaan = -3+360 = 357, maxRaan = 7
    const data = [target, stub(1, 359), stub(2, 180)];

    // 359 inside (>357); 180 outside; 2 inside (<7).
    expect(CatalogSearch.findObjsByOrbit(data, target)).toStrictEqual([0, 1]);
  });
});

describe('CatalogSearch.findReentry', () => {
  const sat = (sccNum: string, perigee: number, type = SpaceObjectType.PAYLOAD) => ({
    sccNum, perigee, type,
  }) as unknown as Satellite;

  it('returns the lowest-perigee objects sorted ascending', () => {
    const data = [sat('300', 500), sat('100', 100), sat('200', 250)];

    expect(CatalogSearch.findReentry(data)).toStrictEqual(['100', '200', '300']);
  });

  it('excludes objects with non-positive perigee and non-tracked types', () => {
    const data = [
      sat('100', 0), // perigee 0 -> excluded
      sat('200', 150),
      sat('300', 120, SpaceObjectType.STAR), // wrong type -> excluded
    ];

    expect(CatalogSearch.findReentry(data)).toStrictEqual(['200']);
  });

  it('caps the result at numReturns', () => {
    const data = [sat('1', 100), sat('2', 200), sat('3', 300)];

    expect(CatalogSearch.findReentry(data, 2)).toStrictEqual(['1', '2']);
  });
});

describe('CatalogSearch.yearOrLess special-event debris', () => {
  const debris = (intlDes: string) => ({
    intlDes,
    source: CatalogSource.CELESTRAK,
    launchDate: '',
    tle1: '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991',
  }) as unknown as Satellite;

  it('includes Fengyun-1C (1999-025) debris within the event year window', () => {
    expect(CatalogSearch.yearOrLess([debris('1999-025DA')], 10)).toHaveLength(1);
    // Outside the [7,57) window -> excluded.
    expect(CatalogSearch.yearOrLess([debris('1999-025DA')], 5)).toHaveLength(0);
  });

  it('includes Cosmos/Iridium (1993-036 & 1997-051) collision debris', () => {
    expect(CatalogSearch.yearOrLess([debris('1993-036XYZ')], 12)).toHaveLength(1);
    expect(CatalogSearch.yearOrLess([debris('1997-051ABC')], 12)).toHaveLength(1);
  });

  it('includes Cosmos-1408 (1982-092) ASAT debris but not the parent bodies', () => {
    expect(CatalogSearch.yearOrLess([debris('1982-092ZZ')], 25)).toHaveLength(1);
    // The parent bodies (A/B) fall through to normal launch-year handling.
    expect(CatalogSearch.yearOrLess([debris('1982-092A')], 25)).toHaveLength(1);
  });

  it('filters by 2-digit launch year for the 1957-1999 window', () => {
    const y70 = { intlDes: '1970-001A', source: CatalogSource.CELESTRAK, launchDate: '', tle1: '1 25544U 70001A   21203.40407588' } as unknown as Satellite;
    const y98 = { intlDes: '1998-067A', source: CatalogSource.CELESTRAK, launchDate: '', tle1: '1 25544U 98067A   21203.40407588' } as unknown as Satellite;

    const result = CatalogSearch.yearOrLess([y70, y98], 80);

    // 70 <= 80 (kept); 98 > 80 (dropped).
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(y70);
  });

  it('drops VIMPEL-sourced objects entirely', () => {
    const vimpel = { intlDes: '1999-025DA', source: CatalogSource.VIMPEL } as unknown as Satellite;

    expect(CatalogSearch.yearOrLess([vimpel], 10)).toHaveLength(0);
  });
});
