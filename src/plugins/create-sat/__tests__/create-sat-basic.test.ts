import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { CreateSat } from '@app/plugins/create-sat/create-sat';
import { dateToEpochFields } from '@app/plugins/create-sat/create-sat-orbits';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('CreateSat basic tab', () => {
  let plugin: CreateSat;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = CreateSat as any;
  const input = (id: string) => getEl(`createSat-${id}`) as HTMLInputElement;
  const errorItems = (id: string) => Array.from(getEl(id)?.querySelectorAll('.create-sat-error-item') ?? []).map((el) => el.textContent);
  const typeInto = (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
  };

  const setBasic = (inc: string, apogee: string, perigee: string, scc = '90000') => {
    input('basic-inc').value = inc;
    input('basic-apogee').value = apogee;
    input('basic-perigee').value = perigee;
    input('basic-scc').value = scc;
    input('basic-name').value = 'My Sat';
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

  it('calculateFromAltitudes returns eccentricity and mean motion for an orbit', () => {
    const { eccentricity, meanMotion } = CreateSat.calculateFromAltitudes(420, 400);

    expect(eccentricity).toBeGreaterThanOrEqual(0);
    expect(meanMotion).toBeGreaterThan(0);
  });

  it('uses its own state: no Advanced leftovers, epoch = simulation time at submit', () => {
    const submit = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);

    // Leave Molniya-like leftovers in the Advanced tab.
    input('argPe').value = '270.0000';
    input('ecen').value = '7000000';
    input('rasc').value = '123.0000';
    input('meana').value = '045.0000';
    input('intl').value = '98067A';
    const advancedBefore = ['argPe', 'ecen', 'rasc', 'meana', 'inc', 'meanmo', 'scc', 'name'].map((id) => input(id).value);

    // The clock moved on after the menu was built.
    const submitTime = new Date(Date.UTC(2026, 9, 24, 12, 0, 0));

    ServiceLocator.getTimeManager().simulationTimeObj = submitTime;
    setBasic('63.4', '2000', '500');
    p().createSatBasicSubmit_();

    expect(submit).toHaveBeenCalledOnce();
    const request = submit.mock.calls[0][0] as { params: Record<string, string>; intl: string };
    const expected = CreateSat.calculateFromAltitudes(2000, 500);
    const epoch = dateToEpochFields(submitTime);

    expect(request.params).toMatchObject({
      scc: '90000',
      name: 'My Sat',
      inc: '063.4000',
      rasc: '000.0000',
      argPe: '000.0000',
      meana: '000.0000',
      type: '1',
      country: 'TBD',
      epochyr: epoch.year,
      epochday: epoch.day,
    });
    expect(parseInt(request.params.ecen, 10) / 1e7).toBeCloseTo(expected.eccentricity, 7);
    expect(parseFloat(request.params.meanmo)).toBeCloseTo(expected.meanMotion, 5);
    expect(request.intl).toBe(`${epoch.year}69B`);
    // The Advanced tab is untouched.
    expect(['argPe', 'ecen', 'rasc', 'meana', 'inc', 'meanmo', 'scc', 'name'].map((id) => input(id).value)).toEqual(advancedBefore);
  });

  it('populateBasicTabDefaults_ fills the basic-tab inputs with defaults', () => {
    p().populateBasicTabDefaults_();

    expect(input('basic-scc').value).toBe('90000');
    expect(input('basic-perigee').value).toBe('400');
  });

  it('createSatBasicSubmit_ shows inline feedback on non-numeric input', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    const submitSpy = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);

    setBasic('abc', '400', '400');
    p().createSatBasicSubmit_();

    expect(getEl('createSat-basic-error')?.textContent).toBeTruthy();
    expect(input('basic-inc').getAttribute('aria-invalid')).toBe('true');
    expect(toastSpy).not.toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('createSatBasicSubmit_ rejects a perigee below 100 km', () => {
    const submitSpy = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);

    setBasic('51.6', '400', '50');
    p().createSatBasicSubmit_();

    expect(errorItems('createSat-basic-error')).toEqual(['Perigee too low - satellite would decay rapidly']);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('createSatBasicSubmit_ rejects an apogee below the perigee and marks both fields', () => {
    const submitSpy = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);

    setBasic('51.6', '300', '500');
    p().createSatBasicSubmit_();

    expect(submitSpy).not.toHaveBeenCalled();
    expect(input('basic-apogee').getAttribute('aria-invalid')).toBe('true');
    expect(input('basic-perigee').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows every invalid field at once and clears each one as it is fixed', () => {
    const submitSpy = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    setBasic('181', '400', '500', '25544');
    p().createSatBasicSubmit_();

    expect(submitSpy).not.toHaveBeenCalled();
    expect(toastSpy).not.toHaveBeenCalled();
    expect(errorItems('createSat-basic-error')).toEqual([
      'Invalid NORAD ID. Must be a 5-digit number between 90000 and 99999.',
      'Inclination must be between 0 and 180 degrees',
      'Apogee must be >= Perigee',
    ]);
    expect(input('basic-scc').getAttribute('aria-invalid')).toBe('true');
    expect(input('basic-inc').getAttribute('aria-invalid')).toBe('true');

    // Fixing the inclination clears only its message, without a submit.
    typeInto('basic-inc', '63.4');
    expect(errorItems('createSat-basic-error')).toEqual(['Invalid NORAD ID. Must be a 5-digit number between 90000 and 99999.', 'Apogee must be >= Perigee']);
    expect(input('basic-inc').getAttribute('aria-invalid')).toBe('false');

    // Lowering the perigee fixes the apogee/perigee order; the new "too low" problem waits for the next submit.
    typeInto('basic-perigee', '50');
    expect(errorItems('createSat-basic-error')).toEqual(['Invalid NORAD ID. Must be a 5-digit number between 90000 and 99999.']);
    expect(input('basic-perigee').getAttribute('aria-invalid')).toBe('false');

    typeInto('basic-scc', '90001');
    expect(errorItems('createSat-basic-error')).toEqual([]);
    expect(getEl('createSat-basic-error')?.hidden).toBe(true);
    expect(['basic-scc', 'basic-inc', 'basic-apogee', 'basic-perigee'].map((id) => input(id).getAttribute('aria-invalid'))).toEqual(['false', 'false', 'false', 'false']);
  });

  it('clears only Basic validation feedback after corrected creation and preserves unrelated notifications', () => {
    const submit = vi.spyOn(C, 'submitTle_').mockImplementation(() => undefined);
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    document.body.insertAdjacentHTML('beforeend', '<div id="unrelated-toast">Unrelated notification</div>');
    setBasic('181', '800', '400');
    p().createSatBasicSubmit_();
    const error = getEl('createSat-basic-error', true);

    expect(error?.textContent).toContain('Inclination');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(input('basic-inc').getAttribute('aria-invalid')).toBe('true');
    expect(submit).not.toHaveBeenCalled();
    setBasic('51.6', '800', '400');
    p().createSatBasicSubmit_();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(error?.textContent).toBe('');
    expect(error?.hidden).toBe(true);
    expect(input('basic-inc').getAttribute('aria-invalid')).toBe('false');
    expect(getEl('unrelated-toast')?.textContent).toBe('Unrelated notification');
    expect(toast).not.toHaveBeenCalled();
  });
});
