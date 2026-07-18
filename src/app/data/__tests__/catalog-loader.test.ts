import { AsciiTleSat, CatalogLoader } from '@app/app/data/catalog-loader';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { Satellite } from '@app/engine/ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { readFileSync } from 'fs';
import { vi } from 'vitest';

describe('Catalog Loader', () => {
  beforeAll(() => {
    setupStandardEnvironment();
  });

  beforeEach(() => {
    const tle = readFileSync('./test/environment/TLE2.json');
    const json = JSON.parse(tle.toString());

    // Mock fetch for this test
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve(json),
        text: () => Promise.resolve(''),
        ok: true,
        status: 200,
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.getInstance().unregisterAllEvents();
    settingsManager.isStarlinkOnly = false;
  });

  it('should load the catalog', async () => {
    settingsManager.isDisableAsciiCatalog = true;
    await CatalogLoader.load();
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('does not throw when a keepTrackTle entry is missing name (regression: #1349)', async () => {
    settingsManager.isStarlinkOnly = true;

    const nameless = [
      {
        tle1: '1 25544U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  0000',
        tle2: '2 25544  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000',
      },
    ];

    await expect(CatalogLoader.parse({ keepTrackTle: nameless as never })).resolves.not.toThrow();
  });

  it('preserves a 9-digit ID end-to-end via externalCatalog', async () => {
    // Mirror what parseAsciiCsv_ builds for a CelesTrak supplemental row.
    const sat = Satellite.fromOmm({
      OBJECT_NAME: 'STARLINK-37402',
      OBJECT_ID: '2026-114A',
      EPOCH: '2026-05-26T00:00:00.000000',
      MEAN_MOTION: 15.5,
      ECCENTRICITY: 0.0001137,
      INCLINATION: 53.16,
      RA_OF_ASC_NODE: 100,
      ARG_OF_PERICENTER: 0,
      MEAN_ANOMALY: 0,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: '799500766',
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    });
    const externalCatalog: AsciiTleSat[] = [
      {
        SCC: sat.sccNum,
        ON: 'STARLINK-37402',
        TLE1: sat.tle1,
        TLE2: sat.tle2,
      },
    ];

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    });

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const id = catalogManagerInstance.sccIndex['799500766'];

    expect(id).toBeDefined();
    const loaded = catalogManagerInstance.objectCache[id];

    expect((loaded as Satellite).sccNum).toBe('799500766');
    expect((loaded as Satellite).sccNum5).toBeNull();
    // TLE column 3-7 carries the last-5-digit tail.
    expect((loaded as Satellite).tle1.substring(2, 7)).toBe('00766');
  });

  it('awaits beforeFilterTLEDatabase listeners before filterTLEDatabase runs', async () => {
    const callOrder: string[] = [];

    EventBus.getInstance().on(EventBusEvent.beforeFilterTLEDatabase, async () => {
      // Two microtask hops — proves emitAsync awaits the listener fully
      // before filterTLEDatabase runs (would push 'filterTLEDatabase' first
      // if the event were not awaited).
      await Promise.resolve();
      await Promise.resolve();
      callOrder.push('listener');
    });

    const filterSpy = vi.spyOn(CatalogLoader, 'filterTLEDatabase').mockImplementation(() => {
      callOrder.push('filterTLEDatabase');
    });

    await CatalogLoader.parse({ keepTrackTle: [] });

    expect(filterSpy).toHaveBeenCalled();
    expect(callOrder).toEqual(['listener', 'filterTLEDatabase']);
  });

  // parseTceContent is the public entry for raw-TLE-only file imports (drag &
  // drop, paste, file picker). It needs to handle alpha-5 TLEs cleanly since
  // CelesTrak-formatted alpha-5 satnums appear directly in TLE cols 3-7.
  describe('parseTceContent across sccNum forms', () => {
    it('parses a 2-line numeric-only TLE pair (legacy 5-digit)', () => {
      const content = ['1 25544U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  0000', '2 25544  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000'].join('\n');

      const catalog = CatalogLoader.parseTceContent(content);

      expect(catalog).toHaveLength(1);
      expect(catalog[0].SCC).toBe('25544');
      expect(catalog[0].TLE1).toContain('25544');
    });

    it('parses an alpha-5 2-line TLE pair preserving the alpha-5 satnum in SCC', () => {
      // CelesTrak emits alpha-5 satnums directly in TLE cols 3-7.
      const content = ['1 T0001U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  0000', '2 T0001  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000'].join('\n');

      const catalog = CatalogLoader.parseTceContent(content);

      expect(catalog).toHaveLength(1);
      // SCC preserves the alpha-5 (5 chars, no padStart needed).
      expect(catalog[0].SCC).toBe('T0001');
      expect(catalog[0].TLE1.substring(2, 7)).toBe('T0001');
    });

    it('parses a 3-line file (name + TLE pair) with alpha-5 satnum', () => {
      const content = [
        'CUSTOM ALPHA-5 SAT',
        '1 T0001U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  0000',
        '2 T0001  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000',
      ].join('\n');

      const catalog = CatalogLoader.parseTceContent(content);

      expect(catalog).toHaveLength(1);
      expect(catalog[0].ON).toBe('CUSTOM ALPHA-5 SAT');
      expect(catalog[0].SCC).toBe('T0001');
    });

    it('parses multiple TLE pairs and preserves each SCC', () => {
      const content = [
        '1 25544U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  0000',
        '2 25544  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000',
        '1 T0001U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  0000',
        '2 T0001  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000',
      ].join('\n');

      const catalog = CatalogLoader.parseTceContent(content);

      expect(catalog).toHaveLength(2);
      // sortByScc_ lex-sorts the result; "25544" < "T0001" (digit < letter).
      const sccs = catalog.map((s) => s.SCC);

      expect(sccs).toContain('25544');
      expect(sccs).toContain('T0001');
    });

    // Short (≤4-char) satnums in cols 3-7 need padding to 5 chars to look
    // like a valid TLE on the downstream side. This is a regression guard
    // for the StringPad.pad0 call inside parseAsciiTLE_.
    it('zero-pads a short numeric satnum to 5 chars in SCC', () => {
      const content = ['1     5U 58067A   24001.00000000  .00000000  00000-0  00000-0 0  0000', '2     5  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000'].join('\n');

      const catalog = CatalogLoader.parseTceContent(content);

      expect(catalog[0].SCC).toBe('00005');
    });

    it('throws on a malformed first line that does not start with "1 "', () => {
      const content = 'random text\nnot a TLE';

      expect(() => CatalogLoader.parseTceContent(content)).toThrow(/Unrecognized TLE format/u);
    });

    it('returns an empty array for empty input', () => {
      expect(CatalogLoader.parseTceContent('')).toEqual([]);
      expect(CatalogLoader.parseTceContent('   ')).toEqual([]);
    });
  });
});
