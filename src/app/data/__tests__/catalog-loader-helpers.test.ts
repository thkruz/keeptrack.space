import { CatalogLoader } from '@app/app/data/catalog-loader';
import { BaseObject } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';

/*
 * Pure / lightly-mocked helpers inside CatalogLoader. These carry real
 * branching logic (orbital-regime classification, TLE parsing, intl-des year
 * inference, CSV header detection) but were previously only reached, if at
 * all, through the heavyweight load()/parse() orchestrators. They are private
 * statics, accessed here via a typed cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Loader = CatalogLoader as any;

/**
 * Build a 69-char TLE line 2 with a specific eccentricity (7 implied-decimal
 * digits, cols 27-33) and mean motion (cols 53-63). getRegimeFromTle_ reads
 * substring(26,33) and substring(52,63) respectively.
 */
const buildTle2 = (eccDigits: string, meanMotion: string): string => {
  const line = new Array(69).fill(' ') as string[];

  line[0] = '2';
  const ecc = eccDigits.padEnd(7, '0');

  for (let k = 0; k < 7; k++) {
    line[26 + k] = ecc[k];
  }
  const mm = meanMotion.padStart(11, ' ');

  for (let k = 0; k < 11; k++) {
    line[52 + k] = mm[k];
  }

  return line.join('');
};

describe('CatalogLoader.getRegimeFromTle_', () => {
  it.each([
    ['vleo (very low)', '0000000', '16.50000000', 'vleo'],
    ['leo (ISS-like)', '0001475', '15.48839820', 'leo'],
    ['meo (GPS-like)', '0000000', '2.00560000', 'meo'],
    ['geo (synchronous)', '0000000', '1.00270000', 'geo'],
    ['heo (eccentric)', '7000000', '2.00000000', 'heo'],
    ['xgeo (beyond geo)', '7400000', '2.00000000', 'xgeo'],
  ])('classifies %s', (_label, ecc, mm, expected) => {
    expect(Loader.getRegimeFromTle_(buildTle2(ecc, mm))).toBe(expected);
  });

  it('returns "unknown" for a non-positive mean motion', () => {
    expect(Loader.getRegimeFromTle_(buildTle2('0000000', '0.00000000'))).toBe('unknown');
  });

  it('returns "unknown" when the fields are not parseable', () => {
    expect(Loader.getRegimeFromTle_('2 25544')).toBe('unknown');
  });
});

describe('CatalogLoader.shouldSkipRegime_', () => {
  let original: string[];

  beforeEach(() => {
    original = settingsManager.core.regimeFilter;
  });

  afterEach(() => {
    settingsManager.core.regimeFilter = original;
  });

  it('never skips when the regime filter is empty', () => {
    settingsManager.core.regimeFilter = [];
    expect(Loader.shouldSkipRegime_(buildTle2('0000000', '1.00270000'))).toBe(false);
  });

  it('skips a satellite whose regime is not in the filter', () => {
    settingsManager.core.regimeFilter = ['leo'];
    // 1.0027 rev/day is geo, which is not in the leo-only filter.
    expect(Loader.shouldSkipRegime_(buildTle2('0000000', '1.00270000'))).toBe(true);
  });

  it('keeps a satellite whose regime is in the filter', () => {
    settingsManager.core.regimeFilter = ['geo'];
    expect(Loader.shouldSkipRegime_(buildTle2('0000000', '1.00270000'))).toBe(false);
  });
});

describe('CatalogLoader.parseIntlDes_', () => {
  it('infers the 1900s century for a 2-digit year > 50', () => {
    expect(Loader.parseIntlDes_('1 25544U 98067A   21203.40407588')).toBe('1998-067A');
  });

  it('infers the 2000s century for a 2-digit year <= 50', () => {
    expect(Loader.parseIntlDes_('1 25544U 20001A   21203.40407588')).toBe('2020-001A');
  });

  it('returns "None" when the international designator is blank', () => {
    expect(Loader.parseIntlDes_('1 25544U          21203.40407588')).toBe('None');
  });
});

describe('CatalogLoader.isCsvGpHeader_', () => {
  it.each([
    [undefined, false],
    ['no-commas-here', false],
    ['a,b,c', false],
    ['OBJECT_NAME,EPOCH,NORAD_CAT_ID', true],
    ['object_name,epoch,mean_motion', true],
  ])('isCsvGpHeader_(%s) === %s', (input, expected) => {
    expect(Loader.isCsvGpHeader_(input)).toBe(expected);
  });
});

describe('CatalogLoader.parseAsciiTLE_ / parseAscii3LE_', () => {
  const tle1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991';
  const tle2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053';

  it('parses 2-line pairs, extracting and zero-padding the SCC', () => {
    const out: { SCC: string; ON?: string }[] = [];

    Loader.parseAsciiTLE_([tle1, tle2], out);
    expect(out).toHaveLength(1);
    expect(out[0].SCC).toBe('25544');
    expect(out[0].ON).toBeUndefined();
  });

  it('parses 3-line groups, capturing the object name', () => {
    const out: { SCC: string; ON?: string }[] = [];

    Loader.parseAscii3LE_(['ISS (ZARYA)', tle1, tle2], out);
    expect(out).toHaveLength(1);
    expect(out[0].SCC).toBe('25544');
    expect(out[0].ON).toBe('ISS (ZARYA)');
  });
});

describe('CatalogLoader.sortByScc_', () => {
  it('sorts catalog entries lexicographically by SCC', () => {
    const catalog = [{ SCC: '25544' }, { SCC: '00005' }, { SCC: 'T0001' }];

    Loader.sortByScc_(catalog);
    expect(catalog.map((c) => c.SCC)).toStrictEqual(['00005', '25544', 'T0001']);
  });
});

describe('CatalogLoader.addSccNum_', () => {
  it('zero-pads a short SCC and rewrites both TLE lines', () => {
    const resp = [
      {
        tle1: '1   544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991',
        tle2: '2   544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053',
      },
    ];

    Loader.addSccNum_(resp, 0);
    expect(resp[0].sccNum).toBe('00544');
    expect(resp[0].tle1.substring(2, 7)).toBe('00544');
    expect(resp[0].tle2.substring(2, 7)).toBe('00544');
  });
});

describe('CatalogLoader.cleanAsciiCatalogFile_', () => {
  it('drops a trailing empty line and strips carriage returns', () => {
    const lines = ['line-a\r', 'line-b', ''];

    Loader.cleanAsciiCatalogFile_(lines);
    expect(lines).toStrictEqual(['line-a', 'line-b']);
  });
});

describe('CatalogLoader.getSatDataString_', () => {
  it('serializes a satellite to its TLE pair + active flag', () => {
    const json = JSON.parse(Loader.getSatDataString_([defaultSat])) as { tle1: string; active: boolean }[];

    expect(json[0].tle1).toBe(defaultSat.tle1);
    expect(json[0].active).toBe(defaultSat.active);
  });

  // The branches below dispatch on isSatellite() FIRST, then isMissile(),
  // isStar(), etc. Cover each with an explicit predicate stub so the test is
  // isolated from concrete object types and their inheritance.
  const predicateStub = (overrides: Record<string, unknown>): BaseObject =>
    ({
      isSatellite: () => false,
      isMissile: () => false,
      isStar: () => false,
      isMarker: () => false,
      isStatic: () => false,
      ...overrides,
    }) as unknown as BaseObject;

  it('serializes a missile to its lat/lon/alt lists', () => {
    const missile = predicateStub({ isMissile: () => true, latList: [1, 2], lonList: [3, 4], altList: [5, 6] });
    const json = JSON.parse(Loader.getSatDataString_([missile])) as { latList: number[] }[];

    expect(json[0].latList).toStrictEqual([1, 2]);
  });

  it('serializes a star to its right-ascension/declination', () => {
    const star = predicateStub({ isStar: () => true, ra: 1.23, dec: -0.45 });
    const json = JSON.parse(Loader.getSatDataString_([star])) as { ra: number; dec: number }[];

    expect(json[0]).toMatchObject({ ra: 1.23, dec: -0.45 });
  });

  it('serializes a static ground object to its lat/lon/alt', () => {
    const ground = predicateStub({ isStatic: () => true, lat: 41.7, lon: -70.5, alt: 0.06 });
    const json = JSON.parse(Loader.getSatDataString_([ground])) as { lat: number }[];

    expect(json[0].lat).toBe(41.7);
  });

  it('throws on an unrecognized object type', () => {
    const mystery = {
      isSatellite: () => false,
      isMissile: () => false,
      isStar: () => false,
      isMarker: () => false,
      isStatic: () => false,
    } as unknown as BaseObject;

    expect(() => Loader.getSatDataString_([mystery])).toThrow('Unknown object type');
  });
});
