import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { GroupType } from '@app/app/data/object-group';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PersistenceManager } from '@app/engine/utils/persistence-manager';
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
