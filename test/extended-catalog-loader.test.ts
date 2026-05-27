import { vi } from 'vitest';
import { readFileSync } from 'fs';
import { CatalogLoader, AsciiTleSat } from '@app/app/data/catalog-loader';
import { EventBus } from '@app/engine/events/event-bus';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite } from '@app/engine/ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';

interface ExtendedRow {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  NORAD_CAT_ID: string;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
}

const csvRowToOmm = (row: Record<string, string>): ExtendedRow => ({
  OBJECT_NAME: row.OBJECT_NAME,
  OBJECT_ID: row.OBJECT_ID,
  EPOCH: row.EPOCH,
  MEAN_MOTION: Number(row.MEAN_MOTION),
  ECCENTRICITY: Number(row.ECCENTRICITY),
  INCLINATION: Number(row.INCLINATION),
  RA_OF_ASC_NODE: Number(row.RA_OF_ASC_NODE),
  ARG_OF_PERICENTER: Number(row.ARG_OF_PERICENTER),
  MEAN_ANOMALY: Number(row.MEAN_ANOMALY),
  EPHEMERIS_TYPE: Number(row.EPHEMERIS_TYPE),
  CLASSIFICATION_TYPE: row.CLASSIFICATION_TYPE,
  NORAD_CAT_ID: row.NORAD_CAT_ID,
  ELEMENT_SET_NO: Number(row.ELEMENT_SET_NO),
  REV_AT_EPOCH: Number(row.REV_AT_EPOCH),
  BSTAR: Number(row.BSTAR),
  MEAN_MOTION_DOT: Number(row.MEAN_MOTION_DOT),
  MEAN_MOTION_DDOT: Number(row.MEAN_MOTION_DDOT),
});

const parseCsvFixture = (path: string): ExtendedRow[] => {
  const raw = readFileSync(path, 'utf8').trim();
  const lines = raw.split(/\r?\n/u);
  const headers = lines[0].split(',');

  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const obj: Record<string, string> = {};

    headers.forEach((h, i) => {
      obj[h] = cells[i];
    });

    return csvRowToOmm(obj);
  });
};

describe('Extended catalog loader (mixed-width NORAD IDs)', () => {
  beforeAll(() => {
    setupStandardEnvironment();
  });

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
        text: () => Promise.resolve(''),
        ok: true,
        status: 200,
      } as Response),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.getInstance().unregisterAllEvents();
  });

  it('Satellite.fromOmm preserves all three ID kinds on sccNum', () => {
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');

    expect(rows).toHaveLength(3);

    const vanguard = Satellite.fromOmm(rows[0]);
    const alpha5 = Satellite.fromOmm(rows[1]);
    const extended = Satellite.fromOmm(rows[2]);

    // sccNum is the canonical form, preserved exactly from input.
    expect(vanguard.sccNum).toBe('00005');
    expect(alpha5.sccNum).toBe('T0001');
    expect(extended.sccNum).toBe('799500766');

    // sccNum5/sccNum6 are null for extended (exceeds alpha-5 capacity).
    expect(vanguard.sccNum5).not.toBeNull();
    expect(alpha5.sccNum5).not.toBeNull();
    expect(extended.sccNum5).toBeNull();
    expect(extended.sccNum6).toBeNull();

    // TLE cols 3-7 carry the last-5-digit tail for extended IDs.
    expect(extended.tle1.substring(2, 7)).toBe('00766');
  });

  it('CatalogLoader.parse indexes 5-digit and 9-digit IDs by their canonical sccNum', async () => {
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');
    const externalCatalog: AsciiTleSat[] = rows.map((row) => {
      const sat = Satellite.fromOmm(row);

      return {
        SCC: sat.sccNum,
        ON: row.OBJECT_NAME,
        TLE1: sat.tle1,
        TLE2: sat.tle2,
      };
    });

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    });

    const catalogManager = ServiceLocator.getCatalogManager();

    // 5-digit numeric: indexed as-is (convertA5to6Digit is identity).
    const vanguardId = catalogManager.sccIndex['00005'];

    expect(vanguardId).toBeDefined();
    expect((catalogManager.objectCache[vanguardId] as Satellite).sccNum).toBe('00005');

    // 9-digit extended: indexed by full ID (convertA5to6Digit identity for 7+ digits).
    const extendedId = catalogManager.sccIndex['799500766'];

    expect(extendedId).toBeDefined();
    expect((catalogManager.objectCache[extendedId] as Satellite).sccNum).toBe('799500766');

    // Alpha-5: catalog-loader normalizes "T0001" to its 6-digit numeric form
    // "270001" via Tle.convertA5to6Digit BEFORE indexing.
    // This is a known long-standing behavior — alpha-5 lookups must use the
    // 6-digit numeric form (or be routed through the smart sccNum2Id below).
    const alpha5IdByA5 = catalogManager.sccIndex.T0001;
    const alpha5IdBy6Digit = catalogManager.sccIndex['270001'];

    expect(alpha5IdByA5).toBeUndefined();
    expect(alpha5IdBy6Digit).toBeDefined();
  });

  it('skips entries with malformed SCC without aborting the rest of the load (Satnogs regression)', async () => {
    // Real-world failure: Satnogs returned an SCC containing a non-ASCII char
    // ("饃9500"). Tle.convertA5to6Digit throws ValidationError on that input,
    // and the unguarded call at processAsciiCatalogUnknown_ killed the whole load.
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');
    const goodSats = rows.map((row) => {
      const sat = Satellite.fromOmm(row);

      return {
        SCC: sat.sccNum,
        ON: row.OBJECT_NAME,
        TLE1: sat.tle1,
        TLE2: sat.tle2,
      };
    });

    // Synthesize a bad entry resembling Satnogs corruption.
    const corruptedScc = '饃9500';
    const badEntry: AsciiTleSat = {
      SCC: corruptedScc,
      ON: 'CORRUPTED-SAT',
      TLE1: `1 ${corruptedScc}U 24001A   24001.00000000  .00000000  00000-0  00000-0 0  0000` as never,
      TLE2: `2 ${corruptedScc}  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000` as never,
    };

    const externalCatalog: AsciiTleSat[] = [...goodSats, badEntry];

    await expect(CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    })).resolves.not.toThrow();

    const catalogManager = ServiceLocator.getCatalogManager();

    // The good entries must still be present.
    expect(catalogManager.sccIndex['00005']).toBeDefined();
    expect(catalogManager.sccIndex['799500766']).toBeDefined();
  });

  it('does not crash when an externalCatalog entry has a malformed (non-ASCII) SCC', async () => {
    // Real-world: corrupt upstream TLE with a Cyrillic / fullwidth lookalike
    // in cols 3-7. `Tle.convertA5to6Digit` throws ValidationError for these.
    // The loader must catch and skip rather than aborting the whole load.
    const goodSat = Satellite.fromOmm({
      OBJECT_NAME: 'VANGUARD-1',
      OBJECT_ID: '1958-002B',
      EPOCH: '2026-01-01T00:00:00.000000',
      MEAN_MOTION: 10.8,
      ECCENTRICITY: 0.184,
      INCLINATION: 34.25,
      RA_OF_ASC_NODE: 99.4,
      ARG_OF_PERICENTER: 156.5,
      MEAN_ANOMALY: 210.27,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: '5',
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    });

    // 'Ｂ' is U+FF22 FULLWIDTH LATIN CAPITAL LETTER B — not in alpha5_ map.
    const externalCatalog: AsciiTleSat[] = [
      {
        SCC: 'Ｂ9500',
        ON: 'CORRUPT-SAT',
        TLE1: 'X X X X X X X X X X X X X X X X X X X' as never,
        TLE2: 'X X X X X X X X X X X X X X X X X X X' as never,
      },
      {
        SCC: goodSat.sccNum,
        ON: 'VANGUARD-1',
        TLE1: goodSat.tle1,
        TLE2: goodSat.tle2,
      },
    ];

    await expect(CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    })).resolves.not.toThrow();

    // Good entry still indexed.
    const catalogManager = ServiceLocator.getCatalogManager();

    expect(catalogManager.sccIndex['00005']).toBeDefined();
  });

  it('sccNum2Id smart-pads pure-numeric short input and passes 9-digit through', async () => {
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');
    const externalCatalog: AsciiTleSat[] = rows.map((row) => {
      const sat = Satellite.fromOmm(row);

      return {
        SCC: sat.sccNum,
        ON: row.OBJECT_NAME,
        TLE1: sat.tle1,
        TLE2: sat.tle2,
      };
    });

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    });

    const catalogManager = ServiceLocator.getCatalogManager();

    // Short numeric string input gets padded — "5" finds Vanguard "00005".
    expect(catalogManager.sccNum2Id('5')).toBe(catalogManager.sccIndex['00005']);

    // Already-padded short numeric — padStart(5) is no-op.
    expect(catalogManager.sccNum2Id('00005')).toBe(catalogManager.sccIndex['00005']);

    // 9-digit numeric input — passes through unchanged (does not match \d{1,5}).
    expect(catalogManager.sccNum2Id('799500766')).toBe(catalogManager.sccIndex['799500766']);

    // Numeric (legacy parseInt path) input still works for 9-digit.
    expect(catalogManager.sccNum2Id(799500766)).toBe(catalogManager.sccIndex['799500766']);
  });

  // Alpha-5 ("T0001") is the trickiest case: catalog-loader indexes the
  // satellite under its 6-digit numeric equivalent ("270001"), but
  // Satellite.sccNum still preserves the alpha-5 string. Plugins that
  // accept user input in alpha-5 form must therefore resolve via either
  // (a) the direct 6-digit index hit, or (b) the extensive sccIndex-miss
  // fallback that compares against sat.sccNum.
  it('sccNum2Id resolves alpha-5 inputs in both index forms', async () => {
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');
    const externalCatalog: AsciiTleSat[] = rows.map((row) => {
      const sat = Satellite.fromOmm(row);

      return {
        SCC: sat.sccNum,
        ON: row.OBJECT_NAME,
        TLE1: sat.tle1,
        TLE2: sat.tle2,
      };
    });

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    });

    const catalogManager = ServiceLocator.getCatalogManager();
    const expectedId = catalogManager.sccIndex['270001'];

    expect(expectedId).toBeDefined();

    // Direct 6-digit lookup — fast path, hits sccIndex.
    expect(catalogManager.sccNum2Id('270001')).toBe(expectedId);

    // Alpha-5 lookup — sccIndex misses, but the extensive-search fallback
    // matches sat.sccNum === "T0001" and returns the same id.
    expect(catalogManager.sccNum2Id('T0001')).toBe(expectedId);
  });

  it('sccNum2Id returns null for unknown inputs across all forms', async () => {
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');
    const externalCatalog: AsciiTleSat[] = rows.map((row) => {
      const sat = Satellite.fromOmm(row);

      return {
        SCC: sat.sccNum,
        ON: row.OBJECT_NAME,
        TLE1: sat.tle1,
        TLE2: sat.tle2,
      };
    });

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    });

    const catalogManager = ServiceLocator.getCatalogManager();

    // Not in catalog: numeric5, alpha-5, numeric6, extended — all should null.
    expect(catalogManager.sccNum2Id('00099')).toBeNull();
    expect(catalogManager.sccNum2Id('Z9999')).toBeNull();
    expect(catalogManager.sccNum2Id('300000')).toBeNull();
    expect(catalogManager.sccNum2Id('999999999')).toBeNull();
  });

  it('sccNum2Sat returns the Satellite for numeric, alpha-5, and extended inputs', async () => {
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');
    const externalCatalog: AsciiTleSat[] = rows.map((row) => {
      const sat = Satellite.fromOmm(row);

      return {
        SCC: sat.sccNum,
        ON: row.OBJECT_NAME,
        TLE1: sat.tle1,
        TLE2: sat.tle2,
      };
    });

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    });

    const catalogManager = ServiceLocator.getCatalogManager();

    // 5-digit and 9-digit round-trip cleanly — canonical sccNum is the input.
    expect(catalogManager.sccNum2Sat('00005')?.sccNum).toBe('00005');
    expect(catalogManager.sccNum2Sat('799500766')?.sccNum).toBe('799500766');

    // Alpha-5 quirk: processAsciiCatalogUnknown_ converts the input through
    // Tle.convertA5to6Digit BEFORE constructing the Satellite, so the canonical
    // sccNum on the loaded sat is the 6-digit form ("270001"), with the
    // alpha-5 form available on sccNum5. Both lookup inputs ("T0001" and
    // "270001") must therefore resolve to the same satellite — and the user
    // can recover their original alpha-5 via sccNum5.
    const alpha5SatByInput = catalogManager.sccNum2Sat('T0001');

    expect(alpha5SatByInput?.sccNum).toBe('270001');
    expect(alpha5SatByInput?.sccNum5).toBe('T0001');
    expect(catalogManager.sccNum2Sat('270001')?.sccNum).toBe('270001');

    // Number-form input still works for 5-digit (legacy contract).
    expect(catalogManager.sccNum2Sat(5)?.sccNum).toBe('00005');

    // Number-form input works for 9-digit too — value fits in Number.MAX_SAFE_INTEGER.
    expect(catalogManager.sccNum2Sat(799500766)?.sccNum).toBe('799500766');

    // Unknown id resolves to null.
    expect(catalogManager.sccNum2Sat('99999')).toBeNull();
  });
});
