import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { GroupType } from '@app/app/data/object-group';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { SatConstellations } from '@app/plugins/sat-constellations/sat-constellations';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatConstellations behavior', () => {
  let plugin: SatConstellations;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gm: any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    // constellationMenuClick_ persists LAST_CONSTELLATION; clear it so the
    // uiManagerFinal restore doesn't re-invoke a stale group during websiteInit.
    PersistenceManager.getInstance().clear();
    plugin = new SatConstellations();
    websiteInit(plugin);
    p().isMenuButtonActive = true;

    gm = ServiceLocator.getGroupsManager();
    gm.groupList = {};
    vi.spyOn(gm, 'createGroup').mockImplementation((...args: unknown[]) => {
      const [type, value, name] = args as [GroupType, unknown, string];

      gm.groupList[name] = { ids: [0], type, value };

      return gm.groupList[name];
    });
    vi.spyOn(gm, 'selectGroup').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getCommandPaletteCommands exposes a command per built-in constellation', () => {
    const commands = plugin.getCommandPaletteCommands();

    expect(commands.length).toBeGreaterThan(5);
    expect(commands.every((c) => c.id.startsWith('SatConstellations.'))).toBe(true);
  });

  it('clicking a regex-based constellation creates and selects its group', () => {
    p().constellationMenuClick_('starlink');

    expect(gm.createGroup).toHaveBeenCalledWith(GroupType.NAME_REGEX, /STARLINK/u, 'starlink');
    expect(p().selectedGroupName_).toBe('starlink');
    expect(gm.selectGroup).toHaveBeenCalled();
  });

  it('covers the SCC-list and payload-regex constellation branches', () => {
    for (const name of ['SpaceStations', 'GlonassGroup', 'GalileoGroup', 'GPSGroup', 'iridium', 'orbcomm', 'globalstar', 'ses', 'AmateurRadio']) {
      gm.createGroup.mockClear();
      delete gm.groupList[name];

      expect(() => p().constellationMenuClick_(name)).not.toThrow();
      expect(gm.createGroup).toHaveBeenCalled();
      expect(p().selectedGroupName_).toBe(name);
    }
  });

  it('reuses an existing group instead of recreating it', () => {
    gm.groupList.starlink = { ids: [0] };
    p().constellationMenuClick_('starlink');

    expect(gm.createGroup).not.toHaveBeenCalled();
    expect(gm.selectGroup).toHaveBeenCalled();
  });

  it('addConstellation registers a custom constellation that can be selected', () => {
    plugin.addConstellation('My Birds', GroupType.NAME_REGEX, /MYBIRD/u);

    const slug = 'my-birds';

    expect(p().additionalConstellations_.some((c: { groupSlug: string }) => c.groupSlug === slug)).toBe(true);

    p().constellationMenuClick_(slug);
    expect(gm.createGroup).toHaveBeenCalledWith(GroupType.NAME_REGEX, /MYBIRD/u, slug);
  });

  it('an unknown group name throws', () => {
    expect(() => p().constellationMenuClick_('not-a-real-group')).toThrow(/unknown group/iu);
  });

  it('onDownload exports the selected group as CSV', () => {
    const csvSpy = vi.spyOn(CatalogExporter, 'exportTle2Csv').mockImplementation(() => undefined);

    gm.groupList.starlink = { ids: [0] };
    p().selectedGroupName_ = 'starlink';

    plugin.onDownload();

    expect(csvSpy).toHaveBeenCalled();
  });

  it('onDownload is a no-op with no selected group', () => {
    const csvSpy = vi.spyOn(CatalogExporter, 'exportTle2Csv').mockImplementation(() => undefined);

    p().selectedGroupName_ = null;
    plugin.onDownload();

    expect(csvSpy).not.toHaveBeenCalled();
  });
});

describe('SatConstellations catalog coverage', () => {
  /** Entries removed on 2026-10-29 because no catalogued satellite matches them. */
  const REMOVED = ['starlink-gen2', 'starlink-v2', 'starlink-snapshot', 'starshield', 'pwsa', 'telesat-lightspeed', 'boeing', 'astra', 'spinlaunch', 'hvnet', 'honghu3', 'hanwha'];

  /** One real catalog name per name-pattern entry (from the July 2026 catalog). */
  const REAL_NAMES: Record<string, string[]> = {
    GlonassGroup: ['COSMOS 2596 [GLONASS-K1]'],
    GalileoGroup: ['GALILEO 34 (139)'],
    GPSGroup: ['NAVSTAR 85 (USA 581)'],
    iridium: ['IRIDIUM 179'],
    orbcomm: ['ORBCOMM FM36'],
    ses: ['ASTRA 1P (SES-24)'],
    globalstar: ['GLOBALSTAR M087'],
    starlink: ['STARLINK-36990'],
    kuiper: ['KUIPER-00279'],
    'ast-spaceobile': ['BLUEWALKER 3', 'SPACEMOBILE-006'],
    oneweb: ['ONEWEB-0708'],
    lynk: ['LYNK TOWER 6'],
    guanwang: ['HULIANWANG DIGUI-154', 'HULIANWANG JISHU SHIYAN'],
    qianfan: ['QIANFAN-108'],
    yinhe: ['YINHE-1'],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regexDefs = (SatConstellations as any).REGEX_GROUP_DEFS_ as Record<string, { pattern: RegExp }>;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    PersistenceManager.getInstance().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists none of the removed constellations in the menu or the command palette', () => {
    const plugin = new SatConstellations();

    websiteInit(plugin);

    const menuGroups = [...document.querySelectorAll('#constellations-menu li')].map((li) => (li as HTMLElement).dataset.group);
    const commandIds = plugin.getCommandPaletteCommands().map((c) => c.id);

    for (const slug of REMOVED) {
      expect(menuGroups).not.toContain(slug);
      expect(commandIds).not.toContain(`SatConstellations.${slug}`);
      expect(regexDefs[slug]).toBeUndefined();
    }
  });

  it('has a real catalog name for every name-pattern entry, and each pattern matches it', () => {
    expect(Object.keys(regexDefs).sort((a, b) => a.localeCompare(b))).toEqual(Object.keys(REAL_NAMES).sort((a, b) => a.localeCompare(b)));

    for (const [slug, names] of Object.entries(REAL_NAMES)) {
      for (const name of names) {
        expect(regexDefs[slug].pattern.test(name), `${slug} should match "${name}"`).toBe(true);
      }
    }
  });

  it('clears a saved selection of a removed constellation on boot instead of failing', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.LAST_CONSTELLATION, 'starshield');
    const gm = ServiceLocator.getGroupsManager();

    gm.groupList = {};
    const plugin = new SatConstellations();

    expect(() => websiteInit(plugin)).not.toThrow();
    expect(PersistenceManager.getInstance().getItem(StorageKey.LAST_CONSTELLATION) || null).toBeNull();
  });
});
