import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { CreateSat } from '@app/plugins/create-sat/create-sat';
import { dateToEpochFields } from '@app/plugins/create-sat/create-sat-orbits';
import { fieldErrorFromException } from '@app/plugins/create-sat/create-sat-validation';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Kilometers, ParseError, Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const MU = 398600.4418;
const RE = 6378.137;

describe('CreateSat advanced tab', () => {
  let plugin: CreateSat;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = CreateSat as any;
  const input = (id: string) => getEl(`createSat-${id}`) as HTMLInputElement;
  const errorItems = () => Array.from(getEl('createSat-error')?.querySelectorAll('.create-sat-error-item') ?? []).map((el) => el.textContent);
  const typeInto = (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
  };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new CreateSat();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports every invalid field inline at once (no toast) and clears each as it is fixed', () => {
    const submit = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    input('inc').value = '181';
    input('meanmo').value = '25';
    input('name').value = '';
    C.createSatSubmit_();

    expect(submit).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(errorItems()).toEqual([
      'Invalid name. Must not be empty.',
      'Inclination must be between 0 and 180 degrees.',
      'Mean Motion must be greater than 0 and at most 18 revolutions per day.',
    ]);
    expect(getEl('createSat-error')?.hidden).toBe(false);
    expect(['name', 'inc', 'meanmo', 'rasc'].map((id) => input(id).getAttribute('aria-invalid'))).toEqual(['true', 'true', 'true', 'false']);

    typeInto('inc', '51.6');
    expect(errorItems()).toEqual(['Invalid name. Must not be empty.', 'Mean Motion must be greater than 0 and at most 18 revolutions per day.']);
    expect(input('inc').getAttribute('aria-invalid')).toBe('false');

    typeInto('name', 'Fixed');
    typeInto('meanmo', '15.5');
    expect(errorItems()).toEqual([]);
    expect(getEl('createSat-error')?.hidden).toBe(true);

    C.createSatSubmit_();
    expect(submit).toHaveBeenCalledOnce();
  });

  it('shows a friendly field-and-range error instead of a raw ParseError', () => {
    const catalog = ServiceLocator.getCatalogManager();
    const slot = new Satellite({ ...defaultSat, id: 0, name: 'Analyst', country: 'ANALSAT', active: false });
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    catalog.objectCache = [slot];
    vi.spyOn(catalog, 'sccNum2Id').mockReturnValue(0);
    vi.spyOn(catalog, 'getObject').mockImplementation(() => catalog.objectCache[0]);
    vi.spyOn(SatMath, 'altitudeCheck').mockReturnValue(400 as Kilometers);
    // Simulate an element the composer accepts but the TLE parser rejects.
    vi.spyOn(C, 'validateInputs_').mockReturnValue([]);
    input('inc').value = '181';
    C.createSatSubmit_();

    expect(errorItems()).toEqual(['Inclination must be between 0 and 180 degrees.']);
    expect(input('inc').getAttribute('aria-invalid')).toBe('true');
    expect(toast).not.toHaveBeenCalled();
    expect(catalog.objectCache[0]).toBe(slot);
  });

  it('maps ootk parse errors to the field and its valid range', () => {
    expect(fieldErrorFromException(new ParseError('Invalid inclination: 181', 'TLE'))).toEqual({
      id: 'inc',
      fields: ['inc'],
      message: 'Inclination must be between 0 and 180 degrees.',
    });
    expect(fieldErrorFromException(new ParseError('Invalid mean motion: 25', 'TLE'))?.fields).toEqual(['meanmo']);
    expect(fieldErrorFromException(new Error('something else'))).toBeNull();
  });

  it('keeps an untouched epoch at the simulation time of submit', () => {
    const submit = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);
    const later = new Date(Date.UTC(2026, 9, 24, 18, 30, 0));

    ServiceLocator.getTimeManager().simulationTimeObj = later;
    C.createSatSubmit_();

    const params = (submit.mock.calls[0][0] as { params: Record<string, string> }).params;
    const expected = dateToEpochFields(later);

    expect([params.epochyr, params.epochday]).toEqual([expected.year, expected.day]);
  });

  it('keeps an epoch the user typed', () => {
    const submit = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);

    typeInto('year', '25');
    typeInto('day', '100.50000000');
    ServiceLocator.getTimeManager().simulationTimeObj = new Date(Date.UTC(2026, 9, 24, 18, 30, 0));
    C.createSatSubmit_();

    const params = (submit.mock.calls[0][0] as { params: Record<string, string> }).params;

    expect([params.epochyr, params.epochday]).toEqual(['25', '100.50000000']);
  });

  it('calculateDerivedParams gives the vis-viva speed at epoch, not the circular speed', () => {
    const rp = RE + 500;
    const ra = RE + 2000;
    const a = (ra + rp) / 2;
    const e = (ra - rp) / (ra + rp);
    const { meanMotion } = CreateSat.calculateFromAltitudes(2000, 500);

    // Mean anomaly 0 is perigee, 180 is apogee.
    expect(CreateSat.calculateDerivedParams(meanMotion, e, 0).velocity).toBeCloseTo(Math.sqrt(MU * (2 / rp - 1 / a)), 6);
    expect(CreateSat.calculateDerivedParams(meanMotion, e, 180).velocity).toBeCloseTo(Math.sqrt(MU * (2 / ra - 1 / a)), 6);
    // A circular orbit keeps the circular speed everywhere.
    expect(CreateSat.calculateDerivedParams(meanMotion, 0, 90).velocity).toBeCloseTo(Math.sqrt(MU / a), 6);
  });

  it('updates the velocity readout when the mean anomaly changes', () => {
    input('ecen').value = '0980000';
    typeInto('meanmo', '12.00000');
    const atPerigee = parseFloat(input('calc-velocity').value);

    typeInto('meana', '180');
    const atApogee = parseFloat(input('calc-velocity').value);

    expect(atPerigee).toBeGreaterThan(atApogee);
  });
});
