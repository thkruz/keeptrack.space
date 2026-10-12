import { operatorKey } from '../operator-resolver';
import { OPERATOR_RULES } from '../operator-rules';

/*
 * Expected slugs are read off the rule table by hand: for each name, the first rule (in
 * table order) whose prefix/contains matches the upper-cased name, after the sccNum pins
 * and the debris / rocket-body / OBJECT filter. The comment on each row says which rule.
 */
const CASES: ReadonlyArray<[name: string, sccNum: number | undefined, expected: string | null, why: string]> = [
  ['STARLINK-30000', undefined, 'starlink', 'prefix STARLINK'],
  ['starlink-1007', 44713, 'starlink', 'lower-case name upper-cased before prefix STARLINK'],
  ['FALCON 9 DEB', undefined, null, 'contains " DEB"'],
  ['STARLINK-1234 DEB', undefined, null, 'debris filter runs before name rules'],
  ['CZ-5B R/B', undefined, null, 'contains R/B'],
  ['SL-16 ROCKET BODY', undefined, null, 'contains ROCKET BODY'],
  ['FENGYUN 1C DEBRIS', undefined, null, 'contains DEBRIS'],
  ['OBJECT A', undefined, null, 'starts with "OBJECT "'],
  ['ISS (ZARYA)', 25544, 'nasa', 'sccNum pin 25544'],
  ['HST', 20580, 'nasa', 'sccNum pin 20580'],
  ['JWST', 50463, 'nasa', 'sccNum pin 50463'],
  ['CSS (TIANHE)', 48274, 'tiangong', 'sccNum pin 48274'],
  ['COSMOS 2432 [GLONASS-M]', 32276, 'glonass', 'contains GLONASS sits before prefix COSMOS'],
  ['GSAT0101 (GALILEO-PFM)', 37846, 'galileo', 'contains GALILEO sits before the GSAT- rule'],
  ['NAVSTAR 81 (USA 319)', undefined, 'navstar', 'prefix NAVSTAR'],
  ['BEIDOU-3 M1', undefined, 'beidou', 'prefix BEIDOU'],
  ['COSMOS 2560', undefined, 'cosmos', 'prefix COSMOS'],
  ['SES-17', undefined, 'ses', 'prefix SES'],
  ['O3B M001', undefined, 'ses', 'prefix O3B'],
  ['ONEWEB-0012', undefined, 'oneweb', 'prefix ONEWEB'],
  ['KUIPER-P1', undefined, 'kuiper', 'prefix KUIPER'],
  ['QIANFAN-1', undefined, 'qianfan', 'prefix QIANFAN'],
  ['HULIANWANG JISHU SHIYAN', undefined, 'guowang', 'prefix HULIANWANG'],
  ['YAOGAN-30 A', undefined, 'yaogan', 'prefix YAOGAN'],
  ['FLOCK 4P-1', undefined, 'planet', 'prefix FLOCK'],
  ['SKYSAT-C12', undefined, 'planet', 'prefix SKYSAT'],
  ['LEMUR-2-JOEL', undefined, 'spire', 'prefix LEMUR'],
  ['IRIDIUM 106', undefined, 'iridium', 'prefix IRIDIUM'],
  ['GEESAT-1', undefined, 'geespace', 'prefix GEESAT'],
  ['ICEYE-X2', undefined, 'iceye', 'prefix ICEYE'],
  ['JILIN-1 GAOFEN 03D', undefined, 'cgstl', 'prefix JILIN'],
  ['GLOBALSTAR M097', undefined, 'globalstar', 'prefix GLOBALSTAR'],
  ['EUTELSAT 10B', undefined, 'eutelsat', 'prefix EUTELSAT'],
  ['INTELSAT 40E', undefined, 'intelsat', 'prefix INTELSAT'],
  ['GONETS-M 21', undefined, 'gonets', 'prefix GONETS'],
  ['ORBCOMM FM110', undefined, 'orbcomm', 'prefix ORBCOMM'],
  ['GSAT-24', undefined, 'isro', 'prefix GSAT-'],
  ['ARIRANG-5 (KOMPSAT-5)', undefined, 'kompsat', 'prefix ARIRANG'],
  ['GEO-KOMPSAT-2A', undefined, 'kompsat', 'prefix GEO-KOMPSAT'],
  ['TERRA', undefined, null, 'no rule matches'],
  ['', undefined, null, 'empty name'],
  ['ISS (ZARYA)', undefined, null, 'without the pin no name rule matches'],
];

describe('operatorKey', () => {
  it.each(CASES)('%s (%s) -> %s [%s]', (name, sccNum, expected) => {
    expect(operatorKey(name, sccNum)).toBe(expected);
  });

  it('has at least 25 table rows', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(25);
  });
});

describe('OPERATOR_RULES', () => {
  it('has no duplicate slugs', () => {
    const slugs = OPERATOR_RULES.map((r) => r.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every rule a lower-case country key and at least one matcher', () => {
    for (const rule of OPERATOR_RULES) {
      expect(rule.country).toMatch(/^[a-z-]+$/u);
      expect((rule.prefix?.length ?? 0) + (rule.contains?.length ?? 0) + (rule.sccNums?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it.skip('every slug country has a flag atlas cell (enabled once the atlas exists, T2)', () => {
    // Filled in by T2.
  });
});
