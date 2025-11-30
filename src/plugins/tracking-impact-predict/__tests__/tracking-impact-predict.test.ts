/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { TipMsg, TrackingImpactPredict } from '@app/plugins/tracking-impact-predict/tracking-impact-predict';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

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

describe('TrackingImpactPredict_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    // Mock fetch for TIP data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockTipData),
      }),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  standardPluginSuite(TrackingImpactPredict, 'TrackingImpactPredict');
  standardPluginMenuButtonTests(TrackingImpactPredict, 'TrackingImpactPredict');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new TrackingImpactPredict();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('tip-bottom-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(1); // MenuMode.BASIC
    });

    it('should return correct side menu config', () => {
      const plugin = new TrackingImpactPredict();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('tip-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(1200);
      expect(config.dragOptions?.maxWidth).toBe(1500);
    });

    it('should return correct help config', () => {
      const plugin = new TrackingImpactPredict();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return correct drag options', () => {
      const plugin = new TrackingImpactPredict();
      const dragOptions = plugin['getDragOptions_']();

      expect(dragOptions.isDraggable).toBe(true);
      expect(dragOptions.minWidth).toBe(1200);
      expect(dragOptions.maxWidth).toBe(1500);
    });

    it('should build side menu HTML', () => {
      const plugin = new TrackingImpactPredict();
      const html = plugin['buildSideMenuHtml_']();

      expect(html).toContain('tip-menu');
      expect(html).toContain('tip-content');
      expect(html).toContain('tip-table');
    });
  });

  describe('onBottomIconClick', () => {
    it('should parse TIP data when menu is active', async () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;

      plugin.onBottomIconClick();

      // Wait for fetch to complete
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith('https://r2.keeptrack.space/spacetrack-tip.json');
    });

    it('should not parse TIP data when menu is inactive', () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call bottomIconCallback bridge', () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);

      const spy = jest.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('parseTipData_', () => {
    it('should fetch and process TIP data', async () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;

      // Ensure TIP list is empty
      expect(plugin['tipList_'].length).toBe(0);

      // Call onBottomIconClick which triggers parseTipData_
      plugin.onBottomIconClick();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(plugin['tipList_'].length).toBe(2);
    });

    it('should not fetch if TIP list is already populated', async () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['tipList_'] = mockTipData;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('setTipList_', () => {
    it('should sort and deduplicate TIP data', () => {
      const plugin = new TrackingImpactPredict();

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

  describe('createTable_', () => {
    it('should create table with TIP data', async () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);
      plugin['tipList_'] = mockTipData;

      plugin['createTable_']();

      const table = document.getElementById('tip-table') as HTMLTableElement;

      expect(table).toBeDefined();
      expect(table.rows.length).toBeGreaterThan(0);
    });

    it('should handle empty TIP list', () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);
      plugin['tipList_'] = [];

      expect(() => plugin['createTable_']()).not.toThrow();
    });
  });

  describe('createRow_', () => {
    it('should create a row with correct data', () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);
      plugin['tipList_'] = mockTipData;

      const table = document.getElementById('tip-table') as HTMLTableElement;
      const row = plugin['createRow_'](table, 0);

      expect(row.classList.contains('tip-object')).toBe(true);
      expect(row.classList.contains('link')).toBe(true);
      expect(row.dataset.row).toBe('0');
    });
  });

  describe('createHeaders_', () => {
    it('should create header row with correct columns', () => {
      const plugin = new TrackingImpactPredict();

      websiteInit(plugin);

      const table = document.getElementById('tip-table') as HTMLTableElement;

      TrackingImpactPredict['createHeaders_'](table);

      const headerRow = table.rows[0];

      expect(headerRow.cells.length).toBe(11);
    });
  });

  describe('coordinate conversion', () => {
    it('should convert latitude to degrees with N/S direction', () => {
      const plugin = new TrackingImpactPredict();

      expect(plugin['lat2degrees_']('45.5')).toBe('45.50° N');
      expect(plugin['lat2degrees_']('-30.0')).toBe('30.00° S');
    });

    it('should convert longitude to degrees with E/W direction', () => {
      const plugin = new TrackingImpactPredict();

      expect(plugin['lon2degrees_']('120.5')).toBe('120.50° E');
      expect(plugin['lon2degrees_']('200.5')).toBe('159.50° W');
      expect(plugin['lon2degrees_']('350.0')).toBe('10.00° W');
    });
  });
});
