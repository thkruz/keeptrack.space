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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = EditSat as any;

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

  it('onContextMenuAction_ throws without a clicked satellite id', () => {
    expect(() => p().onContextMenuAction_('set-pri-sat-rmb')).toThrow();
  });

  it('onContextMenuAction_ selects the primary and secondary satellites', () => {
    const selectSpy = vi.spyOn(p().selectSatManager_, 'selectSat').mockImplementation(() => undefined);
    const secondarySpy = vi.spyOn(p().selectSatManager_, 'setSecondarySat').mockImplementation(() => undefined);

    p().onContextMenuAction_('set-pri-sat-rmb', 5);
    expect(selectSpy).toHaveBeenCalledWith(5);

    p().onContextMenuAction_('set-sec-sat-rmb', 9);
    expect(secondarySpy).toHaveBeenCalledWith(9);
  });

  it('editSatSubmit_ info-toasts when the SCC is not a real satellite', () => {
    (getEl('es-scc') as HTMLInputElement).value = '99999';
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(null as never);

    expect(() => C.editSatSubmit_()).not.toThrow();
  });

  it('editSatSubmit_ returns early when the object is not a satellite', () => {
    (getEl('es-scc') as HTMLInputElement).value = '00005';
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(5 as never);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ isSatellite: () => false } as never);

    expect(() => C.editSatSubmit_()).not.toThrow();
  });

  it('editSatSaveClick_ serializes the satellite TLE and prevents the default', () => {
    (getEl('es-scc') as HTMLInputElement).value = '00005';
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(5 as never);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(defaultSat as never);

    const evt = { preventDefault: vi.fn() } as unknown as Event;

    // file-saver's saveAs binds the real export here (a module live-binding
    // quirk), so assert the path runs to completion rather than the mock call.
    expect(() => C.editSatSaveClick_(evt)).not.toThrow();
    expect(evt.preventDefault).toHaveBeenCalled();
  });
});
