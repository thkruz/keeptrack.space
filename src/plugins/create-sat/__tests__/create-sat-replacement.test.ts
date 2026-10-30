import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ModalConfirm } from '@app/engine/ui/modal-confirm';
import { getEl } from '@app/engine/utils/get-el';
import { CreateSat } from '@app/plugins/create-sat/create-sat';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Kilometers, Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

vi.mock('draggabilly');

describe('Create Satellite replacement confirmation', () => {
  let existing: Satellite;
  let plugin: CreateSat;
  const input = (id: string) => getEl(`createSat-${id}`) as HTMLInputElement;
  const submit = () => {
    plugin['createSatBasicSubmit_']();
    expect(getEl('createSat-basic-error')!.hidden).toBe(true);
  };
  const confirm = () => getEl('confirm-action-btn')!.click();

  beforeEach(() => {
    (ModalConfirm as unknown as { instance_: ModalConfirm | null }).instance_ = null;
    setupStandardEnvironment([SelectSatManager]);
    plugin = new CreateSat();
    websiteInit(plugin);
    existing = new Satellite({ ...defaultSat, id: 0, name: 'Existing satellite', country: 'USA' });
    const catalog = ServiceLocator.getCatalogManager();

    catalog.objectCache = [existing];
    vi.spyOn(catalog, 'sccNum2Id').mockReturnValue(0);
    vi.spyOn(catalog, 'getObject').mockImplementation(() => catalog.objectCache[0]);
    vi.spyOn(SatMath, 'altitudeCheck').mockReturnValue(400 as Kilometers);
    vi.spyOn(catalog, 'seedDotPosition').mockImplementation(() => undefined);
    input('country').value = 'TBD';
    input('basic-scc').value = '90000';
    input('basic-name').value = 'Replacement';
    input('basic-inc').value = '51.6';
    input('basic-apogee').value = '400';
    input('basic-perigee').value = '400';
  });

  afterEach(() => {
    ModalConfirm.getInstance().close();
    vi.restoreAllMocks();
  });

  it.each(['button', 'Escape'])('preserves exact object/TLE on %s cancellation', (method) => {
    const originalTle = [existing.tle1, existing.tle2];

    submit();
    expect(ServiceLocator.getCatalogManager().objectCache[0]).toBe(existing);
    expect(document.querySelector('.confirm-modal__message')!.textContent).toContain(existing.name);
    if (method === 'button') {
      getEl('cancel-action-btn')!.click();
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }
    expect(ServiceLocator.getCatalogManager().objectCache[0]).toBe(existing);
    expect([existing.tle1, existing.tle2]).toEqual(originalTle);
    expect(ServiceLocator.getCatalogManager().satCruncherThread.sendSatEdit).not.toHaveBeenCalled();
  });

  it('replaces exactly once after confirmation with the Basic orbit', () => {
    submit();
    confirm();
    confirm();
    const created = ServiceLocator.getCatalogManager().objectCache[0] as Satellite;
    const expected = CreateSat.calculateFromAltitudes(400, 400);

    expect(created).not.toBe(existing);
    expect(created.name).toBe('Replacement');
    expect(ServiceLocator.getCatalogManager().satCruncherThread.sendSatEdit).toHaveBeenCalledOnce();
    expect(created.inclination).toBeCloseTo(51.6, 4);
    expect(created.meanMotion).toBeCloseTo(expected.meanMotion, 5);
    expect(created.eccentricity).toBeCloseTo(expected.eccentricity, 7);
    expect(created.argOfPerigee).toBe(0);
  });

  it.each(['object', 'TLE', 'form'])('rejects confirmation when %s changes while open', (kind) => {
    submit();
    const catalog = ServiceLocator.getCatalogManager();

    if (kind === 'object') {
      catalog.objectCache[0] = new Satellite({ ...defaultSat, id: 0, name: 'New occupant' });
    } else if (kind === 'TLE') {
      existing.tle1 = existing.tle1.replace('25544', '25545') as Satellite['tle1'];
    } else {
      input('basic-name').value = 'Changed draft';
    }
    const before = catalog.objectCache[0];

    confirm();
    expect(catalog.objectCache[0]).toBe(before);
    expect(catalog.satCruncherThread.sendSatEdit).not.toHaveBeenCalled();
  });

  it('requires confirmation for an active analyst object even when its country is ANALSAT', () => {
    existing.country = 'ANALSAT';
    submit();
    expect(getEl('confirm-action-btn', true)).not.toBeNull();
    expect(ServiceLocator.getCatalogManager().objectCache[0]).toBe(existing);
  });

  it('creates in a free analyst slot without confirmation', () => {
    existing.country = 'ANALSAT';
    existing.active = false;
    const prompt = vi.spyOn(ModalConfirm.getInstance(), 'open');

    submit();
    expect(prompt).not.toHaveBeenCalled();
    expect(ServiceLocator.getCatalogManager().objectCache[0]).not.toBe(existing);
  });
});
