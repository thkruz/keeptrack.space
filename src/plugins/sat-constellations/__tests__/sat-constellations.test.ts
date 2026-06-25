import { CatalogManager } from '@app/app/data/catalog-manager';
import { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType } from '@app/app/data/object-group';
import { UiManager } from '@app/app/ui/ui-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite } from '@app/engine/ootk/src/objects';
import { SatConstellations } from '@app/plugins/sat-constellations/sat-constellations';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatConstellations_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(SatConstellations);
  standardPluginMenuButtonTests(SatConstellations);
});

describe('SatConstellations_composition', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
  });

  test('getBottomIconConfig returns correct config', () => {
    const plugin = new SatConstellations();

    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('menu-constellations');
    expect(config.image).toBeDefined();
  });

  test('getSideMenuConfig returns correct config', () => {
    const plugin = new SatConstellations();

    const config = plugin.getSideMenuConfig();

    expect(config.elementName).toBe('constellations-menu');
    expect(config.html).toContain('sc-constellation-list');
    expect(config.html).toContain('sc-stats');
    expect(config.html).toContain('sc-results-table');
    expect(config.width).toBe(650);
  });

  test('getSecondaryMenuConfig returns filter form', () => {
    const plugin = new SatConstellations();

    const config = plugin.getSecondaryMenuConfig();

    expect(config.html).toContain('sc-filter-inc-min');
    expect(config.html).toContain('sc-filter-apply');
    expect(config.html).toContain('sc-filter-reset');
    expect(config.width).toBe(280);
  });

  test('getHelpConfig returns help content', () => {
    const plugin = new SatConstellations();

    const config = plugin.getHelpConfig();

    expect(config.title).toBeDefined();
    expect(config.sections!.length).toBeGreaterThan(0);
  });

  test('getCommandPaletteCommands returns commands for built-in constellations', () => {
    const plugin = new SatConstellations();

    const commands = plugin.getCommandPaletteCommands();

    expect(commands.length).toBeGreaterThanOrEqual(13);
    expect(commands.some((c) => c.id === 'SatConstellations.GPSGroup')).toBe(true);
    expect(commands.some((c) => c.id === 'SatConstellations.starlink')).toBe(true);
  });

  test('addConstellation adds to command palette', () => {
    const plugin = new SatConstellations();

    plugin.addConstellation('Test Group', GroupType.NAME_REGEX, /TEST/u);

    const commands = plugin.getCommandPaletteCommands();

    expect(commands.some((c) => c.id === 'SatConstellations.test-group')).toBe(true);
  });

  test('calculateStats_ computes orbital stats', () => {
    const mockSats = [
      { apogee: 20200, perigee: 20100, inclination: 55.0, rightAscension: 60 },
      { apogee: 20250, perigee: 20150, inclination: 55.2, rightAscension: 120 },
      { apogee: 20180, perigee: 20080, inclination: 54.8, rightAscension: 180 },
    ] as Satellite[];

    const stats = SatConstellations.calculateStats_(mockSats);

    expect(stats.count).toBe(3);
    expect(stats.avgAltitudeKm).toBeCloseTo(20160, -1);
    expect(stats.incMinDeg).toBeCloseTo(54.8, 1);
    expect(stats.incMaxDeg).toBeCloseTo(55.2, 1);
  });
});

describe('SatConstellations_constellation_click', () => {
  const constellationSlugs = [
    'SpaceStations', 'AmateurRadio', 'GPSGroup', 'GalileoGroup', 'GlonassGroup',
    'iridium', 'orbcomm', 'globalstar', 'ses', 'aehf', 'wgs', 'starlink', 'sbirs',
  ];

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);

    const groupList: Record<string, unknown> = {};

    vi.spyOn(ServiceLocator, 'getGroupsManager').mockReturnValue(
      ({
        createGroup: (_type: GroupType, _listOfSats: number[] | RegExp, name: string) => {
          groupList[name] = {
            objects: [0],
            ids: [0],
          };
        },
        selectGroup: () => {
          // Do nothing
        },
        groupList,
      }) as unknown as GroupsManager,
    );

    vi.spyOn(ServiceLocator, 'getUiManager').mockReturnValue({
      searchManager: {
        doSearch: vi.fn(),
        closeSearch: vi.fn(),
      },
      hideSideMenus: vi.fn(),
    } as unknown as UiManager);

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      getSat: () => ({ sccNum: '25544', id: 0, apogee: 400, perigee: 400, inclination: 51.6, rightAscension: 0, name: 'ISS', isSatellite: () => true, tle1: 'line1' }),
      getObject: () => null,
      id2satnum: (ids: number[]) => ids,
      satLinkManager: {
        aehf: [1, 2],
        wgs: [3, 4],
        dscs: [5, 6],
        sbirs: [7, 8],
        dsp: [9, 10],
      },
    } as unknown as CatalogManager);
  });

  constellationSlugs.forEach((slug) => {
    test(`clicking ${slug} does not throw`, () => {
      const plugin = new SatConstellations();

      // Access private method via bracket notation for testing
      // eslint-disable-next-line dot-notation
      expect(() => plugin['constellationMenuClick_'](slug)).not.toThrow();
    });
  });
});
