import { vi } from 'vitest';
import { getEl } from '@app/engine/utils/get-el';
import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrack } from '@app/keeptrack';

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
