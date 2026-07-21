/* eslint-disable max-lines-per-function */

import { AsciiTleSat, CatalogLoader } from '@app/app/data/catalog-loader';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { Satellite } from '@app/engine/ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { readFileSync } from 'fs';
import { vi } from 'vitest';

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
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.getInstance().unregisterAllEvents();
  });

  it('Satellite.fromOmm normalizes sccNum to the display-canonical numeric form', () => {
    const rows = parseCsvFixture('./test/environment/extended-catalog.csv');

    expect(rows).toHaveLength(3);

    const vanguard = Satellite.fromOmm(rows[0]);
    const alpha5 = Satellite.fromOmm(rows[1]);
    const extended = Satellite.fromOmm(rows[2]);

    // sccNum is the natural-number form (no leading zeros, no alpha-5).
    // Vanguard "5" not "00005"; alpha-5 "T0001" → "270001"; extended preserved.
    // The alpha-5 string is preserved on sccNum5 for cross-referencing.
    expect(vanguard.sccNum).toBe('5');
    expect(alpha5.sccNum).toBe('270001');
    expect(alpha5.sccNum5).toBe('T0001');
    expect(extended.sccNum).toBe('799500766');

    // sccNum5/sccNum6 are null for extended (exceeds alpha-5 capacity).
    expect(vanguard.sccNum5).not.toBeNull();
    expect(extended.sccNum5).toBeNull();
    expect(extended.sccNum6).toBeNull();

    // TLE cols 3-7 carry the zero-padded 5-char satnum for the TLE format
    // contract (extended IDs are necessarily the trailing 5 digits).
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
    // 5-digit numeric: leading zeros are stripped, so Vanguard NORAD 5 is
    // indexed under "5" and sat.sccNum is also "5" (natural-number form).
    const vanguardId = catalogManager.sccIndex['5'];

    expect(vanguardId).toBeDefined();
    expect((catalogManager.objectCache[vanguardId] as Satellite).sccNum).toBe('5');

    // 9-digit extended: indexed by full ID (convertA5to6Digit identity for 7+ digits).
    const extendedId = catalogManager.sccIndex['799500766'];

    expect(extendedId).toBeDefined();
    expect((catalogManager.objectCache[extendedId] as Satellite).sccNum).toBe('799500766');

    // Alpha-5: both sccIndex and Satellite.sccNum use the display-canonical
    // 6-digit numeric form ("270001"); the alpha-5 string lives on sccNum5.
    // User-facing lookups via sccNum2Id still accept either form on input.
    const alpha5IdBy6Digit = catalogManager.sccIndex['270001'];

    expect(alpha5IdBy6Digit).toBeDefined();

    const alpha5Sat = catalogManager.objectCache[alpha5IdBy6Digit] as Satellite;

    expect(alpha5Sat.sccNum).toBe('270001');
    expect(alpha5Sat.sccNum5).toBe('T0001');
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

    await expect(
      CatalogLoader.parse({
        keepTrackTle: [],
        externalCatalog: Promise.resolve(externalCatalog),
      })
    ).resolves.not.toThrow();

    const catalogManager = ServiceLocator.getCatalogManager();

    // The good entries must still be present.
    expect(catalogManager.sccIndex['5']).toBeDefined();
    expect(catalogManager.sccIndex['799500766']).toBeDefined();
  });

  it('collapses a duplicate NORAD id in the primary payload, keeping the higher-priority source', async () => {
    // Regression: a stale cached /v4/sats/brief blob (predating the API's
    // source-dedup) delivered 25544 twice — once from the catalog (USSF) and
    // once from the tle_sources fallback (SatNOGS) — and the loader rendered
    // both as separate objects. The load must yield exactly one 25544, and it
    // must be the USSF copy regardless of the order the rows arrive in.
    const issSat = Satellite.fromOmm({
      OBJECT_NAME: 'ISS (ZARYA)',
      OBJECT_ID: '1998-067A',
      EPOCH: '2026-07-05T02:54:29.072000',
      MEAN_MOTION: 15.5,
      ECCENTRICITY: 0.0006703,
      INCLINATION: 51.64,
      RA_OF_ASC_NODE: 208.0,
      ARG_OF_PERICENTER: 130.0,
      MEAN_ANOMALY: 325.0,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: '25544',
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 10000,
      BSTAR: 0.0001027,
      MEAN_MOTION_DOT: 0.00016717,
      MEAN_MOTION_DDOT: 0,
    });

    const ussfRow = { tle1: issSat.tle1, tle2: issSat.tle2, name: 'ISS (ZARYA)', source: 'spacetrack' } as never;
    // Mirrors the tle_sources branch: NULL name → loader fills "Unknown 25544".
    const satnogsRow = { tle1: issSat.tle1, tle2: issSat.tle2, source: 'satnogs' } as never;

    for (const rows of [
      [ussfRow, satnogsRow],
      [satnogsRow, ussfRow],
    ]) {
      // parse() mutates rows in-place (adds sccNum, intlDes, active, ...), so
      // clone per iteration to guarantee each call starts from a clean payload.
      const clonedRows = rows.map((r) => ({ ...r })) as never;

      await expect(CatalogLoader.parse({ keepTrackTle: clonedRows })).resolves.not.toThrow();

      const catalogManager = ServiceLocator.getCatalogManager();
      const matches = catalogManager.objectCache.filter((o) => o.isSatellite() && (o as Satellite).sccNum === '25544') as Satellite[];

      expect(matches).toHaveLength(1);
      expect(matches[0].source).toBe('spacetrack');
    }
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

    await expect(
      CatalogLoader.parse({
        keepTrackTle: [],
        externalCatalog: Promise.resolve(externalCatalog),
      })
    ).resolves.not.toThrow();

    // Good entry still indexed.
    const catalogManager = ServiceLocator.getCatalogManager();

    expect(catalogManager.sccIndex['5']).toBeDefined();
  });

  it('sccNum2Id normalizes leading-zero numeric input and passes 9-digit through', async () => {
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

    // Short numeric string input matches the natural-number key.
    expect(catalogManager.sccNum2Id('5')).toBe(catalogManager.sccIndex['5']);

    // Leading-zero padded input is stripped to the natural form.
    expect(catalogManager.sccNum2Id('00005')).toBe(catalogManager.sccIndex['5']);

    // 9-digit numeric input — passes through unchanged.
    expect(catalogManager.sccNum2Id('799500766')).toBe(catalogManager.sccIndex['799500766']);

    // Numeric (legacy number-input path) input still works for 9-digit.
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

    // 5-digit input round-trips to its leading-zero-stripped natural form.
    // sccNum2Sat accepts either "00005" or "5" but always returns sat.sccNum="5".
    expect(catalogManager.sccNum2Sat('00005')?.sccNum).toBe('5');
    expect(catalogManager.sccNum2Sat('5')?.sccNum).toBe('5');
    expect(catalogManager.sccNum2Sat('799500766')?.sccNum).toBe('799500766');

    // Alpha-5: Satellite.sccNum is always normalized to the display-canonical
    // numeric form. Both lookup inputs — alpha-5 "T0001" and its 6-digit
    // equivalent "270001" — resolve to the same satellite, and the result
    // always reports the numeric form on .sccNum (alpha-5 lives on .sccNum5).
    const alpha5SatByInput = catalogManager.sccNum2Sat('T0001');
    const alpha5SatBy6Digit = catalogManager.sccNum2Sat('270001');

    expect(alpha5SatByInput?.sccNum).toBe('270001');
    expect(alpha5SatByInput?.sccNum5).toBe('T0001');
    expect(alpha5SatBy6Digit?.sccNum).toBe('270001');
    expect(alpha5SatByInput).toBe(alpha5SatBy6Digit);

    // Number-form input still works for 5-digit (legacy contract); result
    // is the natural-number string regardless of whether input was 5 or "00005".
    expect(catalogManager.sccNum2Sat(5)?.sccNum).toBe('5');

    // Number-form input works for 9-digit too — value fits in Number.MAX_SAFE_INTEGER.
    expect(catalogManager.sccNum2Sat(799500766)?.sccNum).toBe('799500766');

    // Unknown id resolves to null.
    expect(catalogManager.sccNum2Sat('99999')).toBeNull();
  });

  // The loader has two paths: processAsciiCatalogKnown_ (update existing) and
  // processAsciiCatalogUnknown_ (insert new). The "known" path checked
  // sccIndex by raw element.SCC — so for a catalog that was originally
  // loaded with alpha-5 input ("T0001"), an external update arriving with
  // the same alpha-5 SCC would miss the canonical 6-digit index entry and
  // be silently inserted as a duplicate. Both paths now canonicalize before
  // sccIndex lookup; this test pins that contract.
  it('updates (does not duplicate) an alpha-5 satellite when reloaded via the same alpha-5 SCC', async () => {
    const buildExternalRow = (epoch: string, sat: Satellite): AsciiTleSat => ({
      SCC: sat.sccNum,
      ON: 'TEST-ALPHA5',
      TLE1: sat.tle1,
      TLE2: sat.tle2,
    });

    const sat1 = Satellite.fromOmm({
      OBJECT_NAME: 'TEST-ALPHA5',
      OBJECT_ID: '2024-001A',
      EPOCH: '2024-01-01T00:00:00.000000',
      MEAN_MOTION: 15.5,
      ECCENTRICITY: 0.0001137,
      INCLINATION: 51.6415,
      RA_OF_ASC_NODE: 100,
      ARG_OF_PERICENTER: 0,
      MEAN_ANOMALY: 0,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 'T0001',
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    });

    // First load — fills the catalog with one alpha-5 satellite.
    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve([buildExternalRow('2024-01-01', sat1)]),
    });

    const catalogManager = ServiceLocator.getCatalogManager();
    const sccBefore = Object.keys(catalogManager.sccIndex).length;
    const cacheLenBefore = catalogManager.objectCache.length;

    expect(catalogManager.sccIndex['270001']).toBeDefined();
    expect(sccBefore).toBeGreaterThan(0);

    // Second load — same alpha-5 SCC, fresh epoch / TLE. Should UPDATE the
    // existing slot, not insert a duplicate.
    const sat2 = Satellite.fromOmm({
      OBJECT_NAME: 'TEST-ALPHA5-UPDATED',
      OBJECT_ID: '2024-001A',
      EPOCH: '2024-06-01T00:00:00.000000',
      MEAN_MOTION: 15.5,
      ECCENTRICITY: 0.0001137,
      INCLINATION: 51.6415,
      RA_OF_ASC_NODE: 100,
      ARG_OF_PERICENTER: 0,
      MEAN_ANOMALY: 0,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 'T0001',
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    });

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve([buildExternalRow('2024-06-01', sat2)]),
    });

    // sccIndex size should NOT have grown — same satellite, just updated.
    expect(Object.keys(catalogManager.sccIndex).length).toBe(sccBefore);
    expect(catalogManager.objectCache.length).toBe(cacheLenBefore);
    // The slot now reflects the fresh epoch.
    const updatedId = catalogManager.sccIndex['270001'];
    const updated = catalogManager.objectCache[updatedId] as Satellite;

    expect(updated.tle1).toContain('24153'); // 2024 day-of-year 153 ≈ Jun 1
    // sccNum is the display-canonical numeric form (alpha-5 'T0001' → '270001');
    // the original alpha-5 string is preserved on sccNum5.
    expect(updated.sccNum).toBe('270001');
    expect(updated.sccNum5).toBe('T0001');
  });
});

describe('CatalogLoader.canonicalSccKey', () => {
  it('strips leading zeros so padded numerics share a key with their canonical form', () => {
    expect(CatalogLoader.canonicalSccKey('00005')).toBe('5');
    expect(CatalogLoader.canonicalSccKey('025544')).toBe('25544');
    expect(CatalogLoader.canonicalSccKey(5)).toBe('5');
  });

  it('normalizes alpha-5 to its 6-digit numeric form', () => {
    expect(CatalogLoader.canonicalSccKey('T0001')).toBe('270001');
  });

  it('passes a 6-digit numeric in the alpha-5 range through unchanged', () => {
    expect(CatalogLoader.canonicalSccKey('270001')).toBe('270001');
  });

  it('passes a 7+ digit extended numeric through unchanged', () => {
    expect(CatalogLoader.canonicalSccKey('799500766')).toBe('799500766');
  });

  // Tle.convertA5to6Digit throws for a 6-digit value above the alpha-5 capacity
  // (340000-999999). Such IDs are still valid extended catalog numbers, so the
  // key must match Satellite.sccNum (the numeric form) rather than collapse to
  // null — otherwise sat.sccNum and canonicalSccKey would disagree, contrary to
  // the documented interchangeability.
  it('keeps a 6-digit extended numeric (> 339999) as its canonical numeric key', () => {
    expect(CatalogLoader.canonicalSccKey('400000')).toBe('400000');
    expect(CatalogLoader.canonicalSccKey('0400000')).toBe('400000');
  });

  it('returns null only for genuinely malformed (non-numeric) SCCs', () => {
    expect(CatalogLoader.canonicalSccKey('饃9500')).toBeNull(); // Satnogs-style corruption
    expect(CatalogLoader.canonicalSccKey('T00A1')).toBeNull(); // bad alpha-5 trailing
    expect(CatalogLoader.canonicalSccKey('99X99')).toBeNull(); // stray letter, not a leading-letter alpha-5
  });
});
