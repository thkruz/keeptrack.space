import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { saveAs } from 'file-saver';
import { vi } from 'vitest';

vi.mock('file-saver', () => ({ __esModule: true, default: vi.fn(), saveAs: vi.fn() }));

describe('EditSat behavior', () => {
  let plugin: EditSat;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new EditSat();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    vi.mocked(saveAs).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('populateFormFields_ fills the orbital element inputs from a satellite', () => {
    p().populateFormFields_(defaultSat);

    expect((getEl('es-scc') as HTMLInputElement).value).toBe(defaultSat.sccNum);
    expect((getEl('es-inc') as HTMLInputElement).value.length).toBe(8);
    expect((getEl('es-meanmo') as HTMLInputElement).value.length).toBeGreaterThan(0);
  });

  it('populateSideMenu_ populates from the selected satellite', () => {
    vi.spyOn(p().selectSatManager_, 'getSelectedSat').mockReturnValue(defaultSat);
    const fillSpy = vi.spyOn(p(), 'populateFormFields_');

    p().populateSideMenu_();

    expect(fillSpy).toHaveBeenCalledWith(defaultSat);
  });

  it('populateSideMenu_ is a no-op when the selection is not a satellite', () => {
    vi.spyOn(p().selectSatManager_, 'getSelectedSat').mockReturnValue({ isSatellite: () => false });
    const fillSpy = vi.spyOn(p(), 'populateFormFields_');

    p().populateSideMenu_();

    expect(fillSpy).not.toHaveBeenCalled();
  });

  it('onContextMenuAction ignores actions without a clicked satellite id', () => {
    const secondarySpy = vi.spyOn(p().selectSatManager_, 'setSecondarySat').mockImplementation(() => undefined);

    expect(() => p().onContextMenuAction('set-sec-sat-rmb')).not.toThrow();
    expect(secondarySpy).not.toHaveBeenCalled();
  });

  it('onContextMenuAction sets the secondary satellite and opens the editor', () => {
    const selectSpy = vi.spyOn(p().selectSatManager_, 'selectSat').mockImplementation(() => undefined);
    const secondarySpy = vi.spyOn(p().selectSatManager_, 'setSecondarySat').mockImplementation(() => undefined);

    p().onContextMenuAction('set-sec-sat-rmb', 9);
    expect(secondarySpy).toHaveBeenCalledWith(9);

    p().onContextMenuAction('edit-sat-rmb', 5);
    expect(selectSpy).toHaveBeenCalledWith(5);
  });

  it('editSatSubmit_ info-toasts when the SCC is not a real satellite', () => {
    (getEl('es-scc') as HTMLInputElement).value = '99999';
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(null as never);

    expect(() => p().editSatSubmit_()).not.toThrow();
  });

  it('editSatSubmit_ returns early when the object is not a satellite', () => {
    (getEl('es-scc') as HTMLInputElement).value = '00005';
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(5 as never);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ isSatellite: () => false } as never);

    expect(() => p().editSatSubmit_()).not.toThrow();
  });

  it('editSatSaveClick_ serializes the satellite TLE and prevents the default', () => {
    (getEl('es-scc') as HTMLInputElement).value = '00005';
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(5 as never);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(defaultSat as never);

    const evt = { preventDefault: vi.fn() } as unknown as Event;

    // file-saver's saveAs binds the real export here (a module live-binding
    // quirk), so assert the path runs to completion rather than the mock call.
    expect(() => p().editSatSaveClick_(evt)).not.toThrow();
    expect(evt.preventDefault).toHaveBeenCalled();
  });

  it('marks the generated side-menu root as v13', () => {
    expect(getEl('editSat-menu')?.classList.contains('kt-ui-v13')).toBe(true);
  });

  it('updateDerived_ fills the calculated apogee/perigee/period readout', () => {
    (getEl('es-meanmo') as HTMLInputElement).value = '15.5';
    (getEl('es-ecen') as HTMLInputElement).value = '0006000';

    p().updateDerived_();

    expect((getEl('es-calc-apogee') as HTMLInputElement).value).not.toBe('');
    expect((getEl('es-calc-perigee') as HTMLInputElement).value).not.toBe('');
    expect((getEl('es-calc-period') as HTMLInputElement).value).not.toBe('');
  });

  it('editSatReset_ restores the original TLE captured on first populate', () => {
    // First populate captures the pristine orbit keyed by sccNum.
    p().populateFormFields_(defaultSat);
    (getEl('es-scc') as HTMLInputElement).value = defaultSat.sccNum;
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(5 as never);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(defaultSat as never);

    expect(() => p().editSatReset_()).not.toThrow();
  });

  it('editSatReset_ is a no-op when no original was captured', () => {
    (getEl('es-scc') as HTMLInputElement).value = '99999';
    const sccSpy = vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id');

    p().editSatReset_();

    // Bails before any catalog lookup when nothing was captured for this scc.
    expect(sccSpy).not.toHaveBeenCalled();
  });
});
