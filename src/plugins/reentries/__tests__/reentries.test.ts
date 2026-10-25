/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { isRealNorad, normalizeTipLon, parseTipUtc, Reentries, TipMsg } from '@app/plugins/reentries/reentries';
import { settingsManager } from '@app/settings/settings';
import { CatalogSource, Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';
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
      expect(config.dragOptions?.minWidth).toBe(480);
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
      expect(dragOptions.minWidth).toBe(480);
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
      // Selected on the next cruncher update (no propagated position right after the time jump).
      expect(plugin['selectSatIdOnCruncher_']).toBe(5);
    });

    it('keeps the object selected in fly-to mode, without recentring the camera on it', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['tipList_'] = [{ ...mockTipData[0], NORAD_CAT_ID: '25544', LAT: '45.5', LON: '120.5' }];
      plugin['isFlyToCorridor_'] = true;
      settingsManager.isFocusOnSatelliteWhenSelected = true;

      vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue({ id: 5, sccNum: '25544', sccNum5: '25544' } as any);
      vi.spyOn(ServiceLocator.getMainCamera(), 'lookAtLatLon').mockImplementation(() => undefined);
      vi.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 0);
      const focusAtSelect: boolean[] = [];
      const selectSat = vi.fn(() => focusAtSelect.push(settingsManager.isFocusOnSatelliteWhenSelected));

      vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat } as any);

      plugin['tipEventClicked_'](0);
      expect(selectSat).not.toHaveBeenCalled();
      EventBus.getInstance().emit(EventBusEvent.onCruncherMessage);

      // Selected (not deselected with -1), with camera focus off only for that call.
      expect(selectSat).toHaveBeenCalledWith(5);
      expect(focusAtSelect).toEqual([false]);
      expect(settingsManager.isFocusOnSatelliteWhenSelected).toBe(true);
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

  describe('TIP row click selection (UX validation scenario 4)', () => {
    it('selects the object on the next cruncher update and leaves the menu open', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['tipList_'] = [{ ...mockTipData[0] }];
      plugin['isFlyToCorridor_'] = false;

      vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue({ id: 5, sccNum: '25544', sccNum5: '25544' } as any);
      const selectSat = vi.fn();

      vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat } as any);

      plugin['tipEventClicked_'](0);
      EventBus.getInstance().emit(EventBusEvent.onCruncherMessage);

      expect(selectSat).toHaveBeenCalledWith(5);
      expect(plugin['selectSatIdOnCruncher_']).toBeNull();
      expect(plugin.isMenuButtonActive).toBe(true);
    });
  });

  describe('TIP window label', () => {
    it('shows the TIP window as a plus/minus value', () => {
      expect(Reentries['formatTipWindow_']('840')).toBe('±840');
      expect(Reentries['formatTipWindow_']('')).toBe('');
    });

    it('labels the header column as plus/minus minutes', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      plugin['tipList_'] = [{ ...mockTipData[0], WINDOW: '120' }];
      plugin['createTipTable_']();

      const table = document.getElementById('reentries-tip-table') as HTMLTableElement;

      // NORAD, Decay, Lat, Lon, Window...
      expect(table.rows[0].cells[4].textContent).toBe('Window (± min)');
      expect(table.rows[1].cells[4].textContent).toBe('±120');
    });
  });

  describe('help text matches the UI', () => {
    it('documents the Shift+R chord the plugin actually registers', () => {
      const plugin = new Reentries();
      const [shortcut] = plugin.getKeyboardShortcuts();

      expect(shortcut.key).toBe('R');
      expect(shortcut.shift).toBe(true);
      expect(shortcut.ctrl).toBe(false);
      expect(shortcut.description).toBeTruthy();
      expect(plugin.getHelpConfig().shortcuts![0].keys).toStrictEqual(['Shift', 'R']);
      expect(plugin.getHelpConfig().sections!.find((s) => s.content.includes('Shift+R'))).toBeDefined();
    });

    it('describes red rows as reentered objects, matching createReentryRow_', () => {
      const tabs = new Reentries().getHelpConfig().sections![1].content;

      expect(tabs).toContain('red means the object has reentered');
      expect(tabs).not.toContain('red means perigee below 120 km');
    });

    it('names the Fetch Data control in How to use, not a download icon', () => {
      const plugin = new Reentries();
      const howTo = plugin.getHelpConfig().sections!.find((s) => s.content.includes('Shift+R'))!.content;

      expect(howTo).toContain('<strong>Fetch Data</strong>');
      expect(howTo).toContain('<strong>Refresh</strong>');
      expect(howTo).not.toContain('download icon');
    });

    it('says Fly to corridor still selects the object, matching flyToCorridor_', () => {
      const tabs = new Reentries().getHelpConfig().sections![1].content;

      expect(tabs).toContain('the object is still selected');
      expect(tabs).not.toContain('the object is not selected');
    });

    it('explains why the corridor matters when it is not an impact point', () => {
      const section = new Reentries().getHelpConfig().sections!.find((s) => s.heading === 'Reading a Reentry Corridor');

      expect(section).toBeDefined();
      expect(section!.content).toContain('not an impact point');
      expect(section!.content).toContain('only ground the object can overfly during the window');
    });

    it('shows the not-an-impact-point line beside the corridor controls', () => {
      const plugin = new Reentries();

      websiteInit(plugin);

      const note = document.getElementById('reentries-corridor-note');

      expect(note?.textContent).toContain('not an impact point');
      // Same Data Actions card as the Fly to corridor switch (and the Pro layer toggle).
      expect(note?.closest('.kt-section')?.querySelector('#reentries-flyto-corridor')).not.toBeNull();
    });

    it('the shortcut callback toggles the menu', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

      plugin.getKeyboardShortcuts()[0].callback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('TIP dry mass and volume', () => {
    it('fills the Dry Mass and Volume cells once detail data arrives', async () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      const sat = { id: 5, sccNum: '58435', eccentricity: 0.001, ageOfElset: () => 5.6, toClassicalElements: () => ({ trueAnomaly: 0 }), rcs: '10' } as any;

      vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(sat);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ DRY_MASS: '6500', LENGTH: '6.3', DIAMETER: '2.7', SPAN: '6.3' }),
        })
      ) as vi.Mock;

      plugin['tipList_'] = [{ ...mockTipData[0], NORAD_CAT_ID: '58435' }];
      plugin['createTipTable_']();

      const table = document.getElementById('reentries-tip-table') as HTMLTableElement;
      const row = table.rows[1];

      expect(row.cells[9].textContent).toBe('Unknown');

      plugin['fetchMissingTipDetails_']();
      await vi.waitFor(() => expect(row.cells[9].textContent).toBe('6500'));

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('58435'), undefined);
      expect(row.cells[10].textContent).toBe(((Math.PI / 6) * 6.3 * 6.3 * 2.7).toFixed(2));
    });

    it('does not request detail twice for the same object', () => {
      const plugin = new Reentries();

      websiteInit(plugin);
      vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue({ sccNum: '58435' } as any);
      const fetchSpy = vi.spyOn(Reentries as any, 'fetchTipDetail_').mockResolvedValue(false);

      plugin['tipList_'] = [{ ...mockTipData[0], NORAD_CAT_ID: '58435' }];
      plugin['fetchMissingTipDetails_']();
      plugin['fetchMissingTipDetails_']();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
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

describe('Reentry Analysis source identity', () => {
  beforeEach(() => setupStandardEnvironment());

  it('labels a catalog-less JSC Vimpel row the same way the sat info box does', () => {
    const table = document.createElement('table');
    const vimpelObj = {
      id: 80,
      sccNum: '',
      source: CatalogSource.VIMPEL,
      name: 'JSC Vimpel 9600',
      type: SpaceObjectType.DEBRIS,
      perigee: 150,
      apogee: 300,
      inclination: 51,
      rcs: 1,
    };

    Reentries['createReentryRow_'](table, vimpelObj as unknown as Satellite);

    expect(table.rows[0].cells[0].textContent).toBe('N/A (JSC Vimpel)');
  });

  it('routes blank-NORAD rows to their original internal object without blank search', () => {
    const plugin = new Reentries();
    const table = document.createElement('table');
    const sourceObjects = [71, 72].map((id) => ({
      id,
      sccNum: '',
      name: `Source ${id}`,
      type: SpaceObjectType.DEBRIS,
      perigee: 90,
      apogee: 200,
      inclination: 45,
      rcs: 1,
    }));
    const catalog = ServiceLocator.getCatalogManager();
    const getSat = vi.spyOn(catalog, 'getSat').mockImplementation((id) => sourceObjects.find((sat) => sat.id === id) as any);
    const reverseLookup = vi.spyOn(catalog, 'sccNum2Sat');
    const search = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockClear();

    for (const source of sourceObjects) {
      Reentries['createReentryRow_'](table, source as any);
    }
    expect([...table.rows].map((row) => row.dataset.objectId)).toEqual(['71', '72']);
    expect(table.rows[0].cells[0].textContent).toBe('Unknown');
    for (const row of table.rows) {
      plugin['reentryEventClicked_'](Number(row.dataset.objectId));
      expect(plugin['selectSatIdOnCruncher_']).toBe(Number(row.dataset.objectId));
    }
    expect(getSat).toHaveBeenLastCalledWith(72);
    expect(reverseLookup).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });
});

describe('Reentries TIP identity helpers', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('parseTipUtc reads Space-Track timestamps as UTC, not local time', () => {
    expect(parseTipUtc('2026-10-26 21:25:00')?.toISOString()).toBe('2026-10-26T21:25:00.000Z');
    expect(parseTipUtc('2024-12-15T12:00:00Z')?.toISOString()).toBe('2024-12-15T12:00:00.000Z');
    expect(parseTipUtc('')).toBeNull();
    expect(parseTipUtc('not a date')).toBeNull();
  });

  it('isRealNorad rejects the blank and zero placeholders synthetic objects carry', () => {
    expect(isRealNorad('25544')).toBe(true);
    expect(isRealNorad('A0001')).toBe(true);
    expect(isRealNorad('')).toBe(false);
    expect(isRealNorad('00000')).toBe(false);
    expect(isRealNorad(null)).toBe(false);
  });

  it('normalizeTipLon maps 0-360 east to signed degrees', () => {
    expect(normalizeTipLon('193.5')).toBeCloseTo(-166.5, 6);
    expect(normalizeTipLon('45')).toBe(45);
  });

  it('setTipList_ keeps blank-NORAD rows apart instead of merging them into one', () => {
    const plugin = new Reentries();
    const blankA = { ...mockTipData[0], NORAD_CAT_ID: '', OBJECT_NUMBER: '', ID: '901' };
    const blankB = { ...mockTipData[1], NORAD_CAT_ID: '', OBJECT_NUMBER: '', ID: '902' };

    plugin['setTipList_']([blankA, blankB, ...mockTipData]);

    expect(plugin['tipList_']).toHaveLength(4);
    expect(plugin['tipList_'].map((tip: TipMsg) => tip.ID).sort()).toEqual(['1', '2', '901', '902']);
  });

  it('the TIP table GP Age column is measured at the simulation time', () => {
    const plugin = new Reentries();
    const sat = new Satellite({
      id: 12,
      active: true,
      sccNum: '25544',
      intlDes: '1998-067A',
      name: 'ISS (ZARYA)',
      type: SpaceObjectType.PAYLOAD,
      tle1: '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991' as TleLine1,
      tle2: '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053' as TleLine2,
      rcs: 99.0524,
      source: CatalogSource.CELESTRAK,
    });
    const simTime = new Date('2026-10-26T21:25:00.000Z');

    ServiceLocator.getTimeManager().simulationTimeObj = simTime;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(sat);
    document.body.insertAdjacentHTML('beforeend', '<table id="reentries-tip-table"></table>');
    plugin['tipList_'] = [{ ...mockTipData[0], DECAY_EPOCH: '2026-10-26 21:25:00' }];

    plugin['createTipTable_']();

    const row = (document.getElementById('reentries-tip-table') as HTMLTableElement).rows[1];

    // Columns: NORAD, Decay Date, Lat, Lon, Window, Next Report, Reentry Angle, RCS, GP Age, ...
    expect(row.cells[8].textContent).toBe(sat.ageOfElset(simTime, 'hours').toFixed(2));
    document.getElementById('reentries-tip-table')?.remove();
    vi.restoreAllMocks();
  });
});
