/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Reentries, TipMsg } from '@app/plugins/reentries/reentries';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

// Mock TIP data
const mockTipData: TipMsg[] = [
  {
    NORAD_CAT_ID: '25544',
    MSG_EPOCH: '2024-12-01T10:00:00Z',
    INSERT_EPOCH: '2024-12-01T09:00:00Z',
    DECAY_EPOCH: '2024-12-15T12:00:00Z',
    WINDOW: '120',
    REV: '100',
    DIRECTION: 'N',
    LAT: '45.5',
    LON: '120.5',
    INCL: '51.6',
    NEXT_REPORT: '24',
    ID: '1',
    HIGH_INTEREST: 'Y',
    OBJECT_NUMBER: '1',
  },
  {
    NORAD_CAT_ID: '12345',
    MSG_EPOCH: '2024-12-02T10:00:00Z',
    INSERT_EPOCH: '2024-12-02T09:00:00Z',
    DECAY_EPOCH: '2024-12-20T14:30:00Z',
    WINDOW: '60',
    REV: '50',
    DIRECTION: 'S',
    LAT: '-30.0',
    LON: '200.5',
    INCL: '98.0',
    NEXT_REPORT: '12',
    ID: '2',
    HIGH_INTEREST: 'N',
    OBJECT_NUMBER: '2',
  },
];

describe('Reentries_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    // Mock fetch for TIP data
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTipData),
      })
    ) as vi.Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(Reentries, 'Reentries');
  standardPluginMenuButtonTests(Reentries, 'Reentries');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new Reentries();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('reentries-bottom-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.EVENTS);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });

    it('should return correct side menu config', () => {
      const plugin = new Reentries();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('reentries-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(1200);
      expect(config.dragOptions?.maxWidth).toBe(1500);
    });

    it('should return correct help config', () => {
      const plugin = new Reentries();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThanOrEqual(3);
      expect(helpConfig.sections![0].image?.src).toContain('img/help/reentries/');
    });

    it('should return correct drag options', () => {
      const plugin = new Reentries();
      const dragOptions = plugin['getDragOptions_']();

      expect(dragOptions.isDraggable).toBe(true);
      expect(dragOptions.minWidth).toBe(1200);
      expect(dragOptions.maxWidth).toBe(1500);
    });

    it('should build side menu HTML', () => {
      const plugin = new Reentries();
      const html = plugin['buildSideMenuHtml_']();

      expect(html).toContain('reentries-menu');
      expect(html).toContain('reentries-content');
      expect(html).toContain('reentries-tip-table');
    });
  });

  describe('onBottomIconClick', () => {
    it('should parse TIP data when menu is active and logged in', async () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['isLoggedIn_'] = true;

      plugin.onBottomIconClick();

      // Wait for fetch to complete
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith('https://r2.keeptrack.space/spacetrack-tip.json');
    });

    it('should not parse TIP data when menu is inactive', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call bottomIconCallback bridge', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('fetchTipData_', () => {
    it('should fetch and process TIP data', async () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['isLoggedIn_'] = true;

      // Ensure TIP list is empty
      expect(plugin['tipList_'].length).toBe(0);

      // Call onBottomIconClick which triggers parseTipData_
      plugin.onBottomIconClick();

      // Wait for async operations - flush promise queue multiple times for chained .then() calls
      // fetch() -> .then(json) -> .then(setTipList) requires at least 3 microtask flushes
      await Promise.resolve(); // Resolve fetch()
      await Promise.resolve(); // Resolve json()
      await Promise.resolve(); // Resolve setTipList_
      await Promise.resolve(); // Extra safety flush

      expect(plugin['tipList_'].length).toBe(2);
    });

    it('should not fetch if TIP list is already populated', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['isLoggedIn_'] = true;
      plugin['tipList_'] = mockTipData;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('setTipList_', () => {
    it('should sort and deduplicate TIP data', () => {
      const plugin = new Reentries();

      // Add duplicate entry with different MSG_EPOCH
      const dataWithDuplicate: TipMsg[] = [
        ...mockTipData,
        {
          NORAD_CAT_ID: '25544', // Same as first entry
          MSG_EPOCH: '2024-12-01T08:00:00Z', // Older message
          INSERT_EPOCH: '2024-12-01T07:00:00Z',
          DECAY_EPOCH: '2024-12-15T12:00:00Z',
          WINDOW: '180',
          REV: '99',
          DIRECTION: 'N',
          LAT: '45.5',
          LON: '120.5',
          INCL: '51.6',
          NEXT_REPORT: '48',
          ID: '3',
          HIGH_INTEREST: 'Y',
          OBJECT_NUMBER: '3',
        },
      ];

      plugin['setTipList_'](dataWithDuplicate);

      // Should only keep 2 entries (one per NORAD_CAT_ID)
      expect(plugin['tipList_'].length).toBe(2);
    });
  });

  describe('createTipTable_', () => {
    it('should create table with TIP data', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['tipList_'] = mockTipData;

      plugin['createTipTable_']();

      const table = document.getElementById('reentries-tip-table') as HTMLTableElement;

      expect(table).toBeDefined();
      expect(table.rows.length).toBeGreaterThan(0);
    });

    it('should handle empty TIP list', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['tipList_'] = [];

      expect(() => plugin['createTipTable_']()).not.toThrow();
    });
  });

  describe('createTipRow_', () => {
    it('should create a row with correct data', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['tipList_'] = mockTipData;

      const table = document.getElementById('reentries-tip-table') as HTMLTableElement;
      const row = plugin['createTipRow_'](table, 0);

      expect(row.classList.contains('tip-object')).toBe(true);
      expect(row.classList.contains('link')).toBe(true);
      expect(row.dataset.row).toBe('0');
    });
  });

  describe('createTipHeaders_', () => {
    it('should create header row with correct columns', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const table = document.getElementById('reentries-tip-table') as HTMLTableElement;

      Reentries['createTipHeaders_'](table);

      const headerRow = table.rows[0];

      expect(headerRow.cells.length).toBe(11);
    });
  });

  describe('createReentryHeaders_', () => {
    it('should create header row with correct columns', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const table = document.getElementById('reentries-analysis-table') as HTMLTableElement;

      Reentries['createReentryHeaders_'](table);

      const headerRow = table.rows[0];

      expect(headerRow.cells.length).toBe(8);
    });
  });

  describe('createReentryRow_', () => {
    it('should show Reentered for satellites with perigee < 120 km', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const table = document.getElementById('reentries-analysis-table') as HTMLTableElement;
      const mockSat = {
        sccNum: '99999',
        name: 'TEST SAT',
        type: SpaceObjectType.DEBRIS,
        perigee: 50,
        apogee: 200,
        inclination: 51.6,
        rcs: 1.5,
      } as any;

      Reentries['createReentryRow_'](table, mockSat);

      const row = table.rows[0];

      // Mean Alt column is index 5 (NORAD, Name, Type, Perigee, Apogee, MeanAlt, Incl, RCS)
      expect(row.cells[5].textContent).toBe('Reentered');
    });

    it('should show calculated mean altitude for satellites with perigee >= 120 km', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const table = document.getElementById('reentries-analysis-table') as HTMLTableElement;
      const mockSat = {
        sccNum: '99998',
        name: 'TEST SAT 2',
        type: SpaceObjectType.PAYLOAD,
        perigee: 150,
        apogee: 300,
        inclination: 45.0,
        rcs: 2.0,
        toClassicalElements: () => ({ trueAnomaly: 0 }),
      } as any;

      Reentries['createReentryRow_'](table, mockSat);

      const row = table.rows[0];

      expect(row.cells[5].textContent).toBe('225.0');
    });

    it('should show Reentered when propagation fails for perigee >= 120 km', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const table = document.getElementById('reentries-analysis-table') as HTMLTableElement;
      const mockSat = {
        sccNum: '99996',
        name: 'STALE TLE SAT',
        type: SpaceObjectType.PAYLOAD,
        perigee: 150,
        apogee: 300,
        inclination: 45.0,
        rcs: 2.0,
        toClassicalElements: () => {
          throw new Error('Propagation failed');
        },
      } as any;

      Reentries['createReentryRow_'](table, mockSat);

      const row = table.rows[0];

      expect(row.cells[5].textContent).toBe('Reentered');
      expect(row.classList.contains('reentry-critical')).toBe(true);
    });

    it('should mark critical rows with reentry-critical class', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const table = document.getElementById('reentries-analysis-table') as HTMLTableElement;
      const mockSat = {
        sccNum: '99997',
        name: 'CRITICAL SAT',
        type: SpaceObjectType.ROCKET_BODY,
        perigee: 100,
        apogee: 250,
        inclination: 28.5,
        rcs: null,
      } as any;

      Reentries['createReentryRow_'](table, mockSat);

      const row = table.rows[0];

      expect(row.classList.contains('reentry-critical')).toBe(true);
      expect(row.cells[5].textContent).toBe('Reentered');
    });
  });

  describe('tipEventClicked_', () => {
    it('parses longitude to [-180, 180] degrees', () => {
      const plugin = new Reentries();

      expect(Reentries['parseLon_']('120.5')).toBe(120.5);
      expect(Reentries['parseLon_']('200.5')).toBeCloseTo(-159.5);
      expect(Reentries['parseLat_']('-30.0')).toBe(-30);
      expect(plugin).toBeDefined();
    });

    it('flies to the corridor lat/lon when the toggle is enabled', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['tipList_'] = [{ ...mockTipData[0], NORAD_CAT_ID: '25544', LAT: '45.5', LON: '120.5' }];
      plugin['isFlyToCorridor_'] = true;

      const catalog = ServiceLocator.getCatalogManager();

      vi.spyOn(catalog, 'sccNum2Sat').mockReturnValue({ id: 5, sccNum: '25544', sccNum5: '25544' } as any);
      const lookAtSpy = vi.spyOn(ServiceLocator.getMainCamera(), 'lookAtLatLon').mockImplementation(() => undefined);
      const rafSpy = vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        cb(0);

        return 0;
      });

      plugin['tipEventClicked_'](0);

      expect(rafSpy).toHaveBeenCalled();
      // TIP[0] is LON 120.5 -> +120.5, LAT 45.5
      expect(lookAtSpy).toHaveBeenCalledWith(45.5, 120.5, 0, expect.any(Date));
      expect(plugin['selectSatIdOnCruncher_']).toBeNull();
    });

    it('follows the object when the toggle is disabled', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['tipList_'] = [{ ...mockTipData[0], NORAD_CAT_ID: '25544', LAT: '45.5', LON: '120.5' }];
      plugin['isFlyToCorridor_'] = false;

      const catalog = ServiceLocator.getCatalogManager();

      vi.spyOn(catalog, 'sccNum2Sat').mockReturnValue({ id: 5, sccNum: '25544', sccNum5: '25544' } as any);
      const rafSpy = vi.spyOn(global, 'requestAnimationFrame');

      plugin['tipEventClicked_'](0);

      expect(rafSpy).not.toHaveBeenCalled();
      expect(plugin['selectSatIdOnCruncher_']).toBe(5);
    });
  });

  describe('coordinate conversion', () => {
    it('should convert latitude to degrees with N/S direction', () => {
      const plugin = new Reentries();

      expect(plugin['lat2degrees_']('45.5')).toBe('45.50° N');
      expect(plugin['lat2degrees_']('-30.0')).toBe('30.00° S');
    });

    it('should convert longitude to degrees with E/W direction', () => {
      const plugin = new Reentries();

      expect(plugin['lon2degrees_']('120.5')).toBe('120.50° E');
      expect(plugin['lon2degrees_']('200.5')).toBe('159.50° W');
      expect(plugin['lon2degrees_']('350.0')).toBe('10.00° W');
    });
  });
});
