import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { KeepTrack } from '@app/keeptrack';
import { MenuMode } from '@app/engine/core/interfaces';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { defaultSat } from '@test/environment/apiMocks';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment, standardSelectSat } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

import {
  hasBottomIcon,
  hasHelp,
  hasSideMenu,
} from '@app/engine/plugins/core/plugin-capabilities';

describe('EditSat_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(EditSat, 'EditSat');
  standardPluginMenuButtonTests(EditSat, 'EditSat');
});

describe('EditSat_capabilities', () => {
  let plugin: EditSat;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new EditSat();
  });

  it('should have bottom icon capability', () => {
    expect(hasBottomIcon(plugin)).toBe(true);
    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('edit-satellite-bottom-icon');
    expect(config.menuMode).toContain(MenuMode.CREATE);
    expect(config.menuMode).toContain(MenuMode.ALL);
    expect(config.isDisabledOnLoad).toBe(true);
  });

  it('should have side menu capability', () => {
    expect(hasSideMenu(plugin)).toBe(true);
    const config = plugin.getSideMenuConfig();

    expect(config.elementName).toBe('editSat-menu');
    expect(config.dragOptions?.isDraggable).toBe(true);
    expect(config.dragOptions?.minWidth).toBe(320);
    expect(config.dragOptions?.maxWidth).toBe(500);
  });

  it('should have help capability', () => {
    expect(hasHelp(plugin)).toBe(true);
    const helpConfig = plugin.getHelpConfig();

    expect(helpConfig.title).toBeDefined();
    expect(helpConfig.sections!.length).toBeGreaterThanOrEqual(3);
    expect(helpConfig.sections![0].image?.src).toContain('img/help/edit-sat/');
  });

  it('should contain form fields in side menu HTML', () => {
    const config = plugin.getSideMenuConfig();

    expect(config.html).toContain('es-scc');
    expect(config.html).toContain('es-country');
    expect(config.html).toContain('es-inc');
    expect(config.html).toContain('es-rasc');
    expect(config.html).toContain('es-ecen');
    expect(config.html).toContain('es-argPe');
    expect(config.html).toContain('es-meana');
    expect(config.html).toContain('es-meanmo');
    expect(config.html).toContain('es-per');
    expect(config.html).toContain('editSat-menu-form');
  });

  it('should require satellite selected', () => {
    expect(plugin.isRequireSatelliteSelected).toBe(true);
    expect(plugin.isIconDisabled).toBe(true);
    expect(plugin.isIconDisabledOnLoad).toBe(true);
  });

  it('should have context menu properties', () => {
    expect(plugin.isRmbOnSat).toBe(true);
    expect(plugin.rmbMenuOrder).toBe(2);
    expect(plugin.rmbL1ElementName).toBe('edit-rmb');
    expect(plugin.rmbL2ElementName).toBe('edit-rmb-menu');
  });
});

describe('EditSat_bridge', () => {
  it('should call onBottomIconClick via bottomIconCallback bridge', () => {
    setupStandardEnvironment([SelectSatManager]);
    const plugin = new EditSat();

    websiteInit(plugin);

    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();

    expect(spy).toHaveBeenCalled();
  });
});

describe('EditSatPlugin_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(EditSat);
  standardPluginMenuButtonTests(EditSat);

  it('should submit the form', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const button = <HTMLButtonElement>KeepTrack.getInstance().containerRoot.querySelector('button[type="submit"]');

    button.click();
  });

  it('should create new TLE at Epoch', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const toggleButton = getEl(editSatPlugin.bottomIconElementName);

    toggleButton!.click();
    ServiceLocator.getCatalogManager().sccNum2Id = () => 0;
    ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    const button = getEl('editSat-newTLE');

    button!.click();
    vi.advanceTimersByTime(1000);
  });

  it('should save TLE', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const toggleButton = getEl(editSatPlugin.bottomIconElementName);

    toggleButton!.click();
    ServiceLocator.getCatalogManager().sccNum2Id = () => 0;
    ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    const button = getEl('editSat-save');

    button!.click();
    vi.advanceTimersByTime(1000);
  });

  // The pre-fix code did `sccNum2Id(parseInt(scc))` on the form-input value,
  // which collapses any alpha-5 ("T0001") to NaN. The fix passes the string
  // through so the catalog manager can resolve it. These tests pin that
  // contract at each of the three entry points (newTLE, save, submit).
  describe('alpha-5 and extended sccNum form input passes through to sccNum2Id', () => {
    let sccNumSpy: ReturnType<typeof vi.fn>;
    let editSatPlugin: EditSat;

    beforeEach(() => {
      editSatPlugin = new EditSat();
      websiteInit(editSatPlugin);
      standardSelectSat();
      sccNumSpy = vi.fn().mockReturnValue(0);
      ServiceLocator.getCatalogManager().sccNum2Id = sccNumSpy;
      ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    });

    // Form input id uses the plugin's elementPrefix ('es'), not 'editSat-'.
    const clickNewTleWithScc = (scc: string): void => {
      getEl(editSatPlugin.bottomIconElementName)!.click();
      (getEl('es-scc') as HTMLInputElement).value = scc;
      getEl('editSat-newTLE')!.click();
      vi.advanceTimersByTime(1000);
    };

    it('passes alpha-5 input through unchanged (not collapsed to NaN by parseInt)', () => {
      clickNewTleWithScc('T0001');
      expect(sccNumSpy).toHaveBeenCalledWith('T0001');
    });

    it('passes 9-digit extended input through unchanged', () => {
      clickNewTleWithScc('799500766');
      expect(sccNumSpy).toHaveBeenCalledWith('799500766');
    });

    it('trims user-typed whitespace before lookup', () => {
      clickNewTleWithScc('  T0001  ');
      expect(sccNumSpy).toHaveBeenCalledWith('T0001');
    });

    // The save TLE button has its own static handler reading the same scc
    // field; verify it also dropped parseInt and now passes strings through.
    it('save TLE button also passes alpha-5 input through unchanged', () => {
      getEl(editSatPlugin.bottomIconElementName)!.click();
      (getEl('es-scc') as HTMLInputElement).value = 'T0001';
      getEl('editSat-save')!.click();
      vi.advanceTimersByTime(1000);

      expect(sccNumSpy).toHaveBeenCalledWith('T0001');
    });

    it('save TLE button passes 9-digit extended input through unchanged', () => {
      getEl(editSatPlugin.bottomIconElementName)!.click();
      (getEl('es-scc') as HTMLInputElement).value = '799500766';
      getEl('editSat-save')!.click();
      vi.advanceTimersByTime(1000);

      expect(sccNumSpy).toHaveBeenCalledWith('799500766');
    });
  });
});
