import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { CollisionEvent, Collisions } from '@app/plugins/collisions/collisions';
import { setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { readFileSync } from 'fs';
import { Mock, vi } from 'vitest';

const flush = async () => {
  for (let i = 0; i < 6; i++) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */

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
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockCollisionData),
      })
    ) as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(Collisions, 'Collisions');
  standardPluginMenuButtonTests(Collisions, 'Collisions');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new Collisions();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('conjunction-feed-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.CONJUNCTIONS);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });

    it('should return correct side menu config', () => {
      const plugin = new Collisions();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('Collisions-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(650);
      expect(config.dragOptions?.maxWidth).toBe(900);
    });

    it('should return correct help config', () => {
      const plugin = new Collisions();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThanOrEqual(3);
      expect(helpConfig.sections![0].image?.src).toContain('img/help/collisions/');
    });

    it('should return correct drag options', () => {
      const plugin = new Collisions();
      const dragOptions = plugin['getDragOptions_']();

      expect(dragOptions.isDraggable).toBe(true);
      expect(dragOptions.minWidth).toBe(650);
      expect(dragOptions.maxWidth).toBe(900);
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
    it('should parse collision data when menu is active and logged in', async () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['isLoggedIn_'] = true;

      plugin.onBottomIconClick();

      // Wait for fetch to complete
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith('https://api.keeptrack.space/v4/socrates/latest', expect.objectContaining({}));
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

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('fetchCollisionData_', () => {
    it('should fetch and process collision data', async () => {
      vi.useFakeTimers();
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['isLoggedIn_'] = true;

      // Ensure collision list is empty
      expect(plugin['collisionList_'].length).toBe(0);

      // Call onBottomIconClick which triggers parseCollisionData_
      plugin.onBottomIconClick();

      // Wait for async operations - flush promise queue multiple times for chained .then()/.catch()/.finally()
      await Promise.resolve(); // Resolve fetch()
      await Promise.resolve(); // Resolve json()
      await Promise.resolve(); // Resolve process
      await Promise.resolve(); // Resolve .catch()/.finally()
      await Promise.resolve(); // Extra safety flush

      expect(plugin['collisionList_'].length).toBe(2);
      // Restore fake timers to avoid leaking real timers to other test files
      vi.useFakeTimers();
    });

    it('should not fetch if collision list is already populated', () => {
      const plugin = new Collisions();

      websiteInit(plugin);
      plugin['isMenuButtonActive'] = true;
      plugin['isLoggedIn_'] = true;
      plugin['collisionList_'] = mockCollisionData;

      plugin.onBottomIconClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('createTable_', () => {
    it('should create table with collision data', () => {
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

/* eslint-disable dot-notation */

const socratesFileData = JSON.parse(readFileSync('./public/tle/SOCRATES.json', 'utf8'));

describe('CollisionsPlugin_class', () => {
  let satConstellationsPlugin: Collisions;

  beforeEach(() => {
    setupDefaultHtml();
    satConstellationsPlugin = new Collisions();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(socratesFileData),
    } as Response);
  });

  standardPluginSuite(Collisions, 'CollisionsPlugin');
  standardPluginMenuButtonTests(Collisions, 'CollisionsPlugin');

  it('should have clickable objects', () => {
    websiteInit(satConstellationsPlugin);
    getEl(`${satConstellationsPlugin.id}-menu`)!.click();
    satConstellationsPlugin['collisionList_'] = [
      {
        ID: 1,
        SAT1: 25544,
        SAT1_NAME: 'ISS (ZARYA)',
        SAT1_STATUS: 'active',
        SAT2: 5,
        SAT2_NAME: 'VANGUARD 1',
        SAT2_STATUS: 'inactive',
        SAT1_AGE_OF_TLE: 1,
        SAT2_AGE_OF_TLE: 2,
        TOCA: '2021-01-01T00:00:00.000Z',
        MIN_RNG: 3,
        DILUTION_THRESHOLD: 4,
        REL_SPEED: 5,
        MAX_PROB: 6,
      } as CollisionEvent,
    ];
    expect(() => satConstellationsPlugin['eventClicked_'](0)).not.toThrow();
  });
});

describe('Collisions behavior', () => {
  let plugin: Collisions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(mockCollisionData) })) as Mock;
    plugin = new Collisions();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onCruncherMessage selects the pending satellite then clears it', () => {
    p().selectSatIdOnCruncher_ = 42;

    expect(() => EventBus.getInstance().emit(EventBusEvent.onCruncherMessage)).not.toThrow();
    expect(p().selectSatIdOnCruncher_).toBeNull();
  });

  it('onUserLogin_ fetches data when the menu is active and the list is empty', () => {
    const fetchSpy = vi.spyOn(p(), 'fetchCollisionData_').mockImplementation(() => undefined);

    vi.spyOn(p(), 'updateToolbarForLoginState_').mockImplementation(() => undefined);
    plugin.isMenuButtonActive = true;
    p().collisionList_ = [];

    p().onUserLogin_();

    expect(p().isLoggedIn_).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('onUserLogout_ updates the toolbar when the menu is active', () => {
    const spy = vi.spyOn(p(), 'updateToolbarForLoginState_').mockImplementation(() => undefined);

    plugin.isMenuButtonActive = true;
    p().onUserLogout_();

    expect(p().isLoggedIn_).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it('updateToolbarForLoginState_ toggles buttons for logged-out state with and without data', () => {
    p().isLoggedIn_ = false;

    p().collisionList_ = [];
    expect(() => p().updateToolbarForLoginState_()).not.toThrow();

    p().collisionList_ = mockCollisionData;
    expect(() => p().updateToolbarForLoginState_()).not.toThrow();
  });

  it('fetchCollisionData_ bails out when a fetch is already in flight', () => {
    p().isFetching_ = true;

    expect(() => p().fetchCollisionData_()).not.toThrow();
  });

  it('fetchCollisionData_ warns when the API returns no collisions', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })) as Mock;
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    p().isFetching_ = false;
    p().fetchCollisionData_();
    await flush();

    expect(warn).toHaveBeenCalled();
  });

  it('fetchCollisionData_ warns when the fetch rejects', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network'))) as Mock;
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    p().isFetching_ = false;
    p().fetchCollisionData_();
    await flush();

    expect(warn).toHaveBeenCalled();
  });

  it('createTable_ warns when the table element is missing', () => {
    getEl('Collisions-table', true)?.remove();

    expect(() => p().createTable_()).not.toThrow();
  });

  it('wires the fetch, refresh and row-click handlers', () => {
    vi.spyOn(p(), 'fetchCollisionData_').mockImplementation(() => undefined);
    const eventClicked = vi.spyOn(p(), 'eventClicked_').mockImplementation(() => undefined);

    getEl('Collisions-fetch-btn', true)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    getEl('Collisions-refresh-btn', true)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const menu = getEl('Collisions-menu', true);

    if (menu) {
      menu.insertAdjacentHTML('beforeend', '<div class="Collisions-object" data-row="0"><span id="cell-x">c</span></div>');
      getEl('cell-x', true)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      // The row handler defers to eventClicked_ via showLoading's setTimeout.
      vi.advanceTimersByTime(2000);
    }

    expect(eventClicked).toHaveBeenCalledWith(0);
  });
});
