/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { Collisions, CollisionEvent } from '@app/plugins/collisions/collisions';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

// Mock fetch for collision data
const mockCollisionData: CollisionEvent[] = [
  {
    ID: 1,
    SAT1: 25544,
    SAT1_NAME: 'ISS',
    SAT1_STATUS: 'Active',
    SAT2: 48274,
    SAT2_NAME: 'STARLINK-1234',
    SAT2_STATUS: 'Active',
    SAT1_AGE_OF_TLE: 0.5,
    SAT2_AGE_OF_TLE: 0.3,
    TOCA: '2024-12-01T12:00:00Z',
    MIN_RNG: 0.5,
    DILUTION_THRESHOLD: 1.0,
    REL_SPEED: 10.5,
    MAX_PROB: 0.001,
  },
  {
    ID: 2,
    SAT1: 12345,
    SAT1_NAME: 'TEST-SAT-1',
    SAT1_STATUS: 'Active',
    SAT2: 67890,
    SAT2_NAME: 'TEST-SAT-2',
    SAT2_STATUS: 'Active',
    SAT1_AGE_OF_TLE: 1.0,
    SAT2_AGE_OF_TLE: 0.8,
    TOCA: '2024-12-02T14:30:00Z',
    MIN_RNG: 1.2,
    DILUTION_THRESHOLD: 1.5,
    REL_SPEED: 8.3,
    MAX_PROB: 0.0005,
  },
];

describe('Collisions_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    // Mock fetch for collision data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockCollisionData),
      }),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  standardPluginSuite(Collisions, 'Collisions');
  standardPluginMenuButtonTests(Collisions, 'Collisions');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new Collisions();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('menu-satellite-collision');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(1); // MenuMode.BASIC
    });

    it('should return correct side menu config', () => {
      const plugin = new Collisions();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('Collisions-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(575);
      expect(config.dragOptions?.maxWidth).toBe(700);
    });

    it('should return correct help config', () => {
      const plugin = new Collisions();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return correct drag options', () => {
      const plugin = new Collisions();
      const dragOptions = plugin['getDragOptions_']();

      expect(dragOptions.isDraggable).toBe(true);
      expect(dragOptions.minWidth).toBe(575);
      expect(dragOptions.maxWidth).toBe(700);
    });

    it('should build side menu HTML', () => {
      const plugin = new Collisions();
      const html = plugin['buildSideMenuHtml_']();

      expect(html).toContain('Collisions-menu');
      expect(html).toContain('Collisions-content');
      expect(html).toContain('Collisions-table');
      expect(html).toContain('SOCRATES');
    });
  });

  describe('onBottomIconClick', () => {
    it('should parse collision data when menu is active', async () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;

      plugin.onBottomIconClick();

      // Wait for fetch to complete
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith('https://api.keeptrack.space/v2/socrates/latest');
    });

    it('should not parse collision data when menu is inactive', () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = false;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call bottomIconCallback bridge', () => {
      const plugin = new Collisions();

      websiteInit(plugin);

      const spy = jest.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('parseCollisionData_', () => {
    it('should fetch and process collision data', async () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;

      // Ensure collision list is empty
      expect(plugin['collisionList_'].length).toBe(0);

      // Call onBottomIconClick which triggers parseCollisionData_
      plugin.onBottomIconClick();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(plugin['collisionList_'].length).toBe(2);
    });

    it('should not fetch if collision list is already populated', async () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['collisionList_'] = mockCollisionData;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('createTable_', () => {
    it('should create table with collision data', async () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['collisionList_'] = mockCollisionData;

      plugin['createTable_']();

      const table = document.getElementById('Collisions-table') as HTMLTableElement;

      expect(table).toBeDefined();
      expect(table.rows.length).toBeGreaterThan(0);
    });

    it('should handle empty collision list', () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['collisionList_'] = [];

      expect(() => plugin['createTable_']()).not.toThrow();
    });
  });

  describe('createRow_', () => {
    it('should create a row with correct data', () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['collisionList_'] = mockCollisionData;

      const table = document.getElementById('Collisions-table') as HTMLTableElement;
      const row = plugin['createRow_'](table, 0);

      expect(row.classList.contains('Collisions-object')).toBe(true);
      expect(row.classList.contains('link')).toBe(true);
      expect(row.dataset.row).toBe('0');
    });
  });

  describe('createHeaders_', () => {
    it('should create header row with correct columns', () => {
      const plugin = new Collisions();

      websiteInit(plugin);

      const table = document.getElementById('Collisions-table') as HTMLTableElement;

      Collisions['createHeaders_'](table);

      const headerRow = table.rows[0];

      expect(headerRow.cells.length).toBe(6);
    });
  });
});
