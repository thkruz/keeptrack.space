import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { hasBottomIcon, hasHelp, hasSecondaryMenu, hasSideMenu } from '@app/engine/plugins/core/plugin-capabilities';
import { getEl } from '@app/engine/utils/get-el';
import { CloseObjectsPlugin } from '@app/plugins/close-objects/close-objects';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('CloseObjectsPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSuite(CloseObjectsPlugin, 'CloseObjectsPlugin');
  standardPluginMenuButtonTests(CloseObjectsPlugin, 'CloseObjectsPlugin');
});

describe('CloseObjectsPlugin_capabilities', () => {
  let plugin: CloseObjectsPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new CloseObjectsPlugin();
  });

  it('should have bottom icon capability', () => {
    expect(hasBottomIcon(plugin)).toBe(true);
    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('conjunction-nearby-icon');
  });

  it('should have side menu capability', () => {
    expect(hasSideMenu(plugin)).toBe(true);
    const config = plugin.getSideMenuConfig();

    expect(config.elementName).toBe('close-objects-menu');
  });

  it('should not have secondary menu capability (OSS version)', () => {
    expect(hasSecondaryMenu(plugin)).toBe(false);
  });

  it('should have help capability', () => {
    expect(hasHelp(plugin)).toBe(true);
  });

  it('should include title in side menu HTML when no secondary menu', () => {
    const config = plugin.getSideMenuConfig();

    expect(config.html).toContain('close-objects-menu');
    expect(config.html).toContain('side-menu-parent');
    expect(config.html).toContain('co-find-btn');
  });

  it('should not include description paragraph in side menu', () => {
    const config = plugin.getSideMenuConfig();

    expect(config.html).not.toContain('two-phase spatial algorithm');
    expect(config.html).not.toContain('50km');
  });
});

describe('CloseObjectsPlugin search algorithm', () => {
  let plugin: CloseObjectsPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statics = CloseObjectsPlugin as any;

  // Two satellites within 50km on X plus a far one; getEci is stubbed to echo each sat's position.
  const sat = (x: number, scc: string) => ({ position: { x, y: 0, z: 0 }, sccNum: scc });

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new CloseObjectsPlugin();
    vi.spyOn(SatMath, 'getEci').mockImplementation(((s: { position: unknown }) => ({ position: s.position })) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getValidSats_ filters out missing, NaN and origin satellites and back-fills positions', () => {
    const sats = [
      null,
      { sccNum: 'noPos' }, // undefined position -> getEci back-fill (stubbed to {0,0,0}) -> origin filtered
      { position: { x: NaN, y: 0, z: 0 }, sccNum: 'nan' },
      { position: { x: 0, y: 0, z: 0 }, sccNum: 'origin' },
      sat(100, 'good1'),
    ];
    const catalog = ServiceLocator.getCatalogManager();

    catalog.orbitalSats = sats.length as never;
    catalog.getSat = ((i: number) => sats[i]) as never;

    const result = statics.getValidSats_();

    expect(result.map((s: { sccNum: string }) => s.sccNum)).toEqual(['good1']);
  });

  it('getActualCSOs_ leaves the first satellite un-repropagated when it returns to the origin', () => {
    // getEci returning the origin short-circuits the re-propagation update (the pair keeps its
    // original positions, which are still close, so it is reported).
    vi.spyOn(SatMath, 'getEci').mockReturnValue({ position: { x: 0, y: 0, z: 0 } } as never);

    expect(() => statics.getActualCSOs_([{ sat1: sat(100, '1'), sat2: sat(120, '2') }], 50)).not.toThrow();
  });

  it('getActualCSOs_ leaves the second satellite un-repropagated when it returns to the origin', () => {
    vi.spyOn(SatMath, 'getEci').mockImplementation(((s: { sccNum: string; position: unknown }) =>
      s.sccNum === '2' ? { position: { x: 0, y: 0, z: 0 } } : { position: s.position }) as never);

    expect(() => statics.getActualCSOs_([{ sat1: sat(100, '1'), sat2: sat(120, '2') }], 50)).not.toThrow();
  });

  it('getActualCSOs_ skips pairs with undefined positions after re-propagation', () => {
    vi.spyOn(SatMath, 'getEci').mockImplementation(((s: { sccNum: string }) => (s.sccNum === '2' ? { position: undefined } : { position: { x: 100, y: 0, z: 0 } })) as never);

    // sat1 has a position, sat2's is undefined -> the pos2 guard skips the pair.
    expect(statics.getActualCSOs_([{ sat1: sat(100, '1'), sat2: sat(120, '2') }], 50)).toHaveLength(0);

    // Both undefined -> the pos1 guard skips the pair.
    vi.spyOn(SatMath, 'getEci').mockReturnValue({ position: undefined } as never);
    expect(statics.getActualCSOs_([{ sat1: sat(100, '1'), sat2: sat(120, '2') }], 50)).toHaveLength(0);
  });

  it('getPossibleCSOs_ pairs satellites within the search radius', () => {
    const list = [sat(100, '1'), sat(120, '2'), sat(5000, '3')];

    const csos = statics.getPossibleCSOs_(list, 50);

    expect(csos.length).toBeGreaterThan(0);
  });

  it('getActualCSOs_ verifies pairs after re-propagation', () => {
    const pair = [{ sat1: sat(100, '1'), sat2: sat(120, '2') }];

    const result = statics.getActualCSOs_(pair, 50);

    expect(result).toContain('1');
    expect(result).toContain('2');
  });

  it('findCloseObjects_ runs the full pipeline and caches the result', () => {
    const sats = [sat(100, '1'), sat(120, '2'), sat(8000, '3')];
    const catalog = ServiceLocator.getCatalogManager();

    catalog.orbitalSats = sats.length as never;
    catalog.getSat = ((i: number) => sats[i]) as never;

    const first = p().findCloseObjects_();

    expect(first).toContain('1');
    // Second call returns the cached string.
    expect(p().findCloseObjects_()).toBe(first);
  });

  it('findCsoBtnClick_ searches for the close objects', () => {
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().doSearch = doSearch;
    p().closeObjectSearchStrCache_ = '1,2';

    p().findCsoBtnClick_();

    expect(doSearch).toHaveBeenCalledWith('1,2');
  });

  it('uiManagerFinal_ wires the find button and bottomIconCallback delegates', () => {
    websiteInit(plugin);
    vi.spyOn(p(), 'findCsoBtnClick_').mockImplementation(() => undefined);

    expect(() => getEl('co-find-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    vi.advanceTimersByTime(2000);

    const iconSpy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(iconSpy).toHaveBeenCalled();
  });
});
