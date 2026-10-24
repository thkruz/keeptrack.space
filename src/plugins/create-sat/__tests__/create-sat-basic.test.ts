import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { CreateSat } from '@app/plugins/create-sat/create-sat';
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

  const setBasic = (inc: string, apogee: string, perigee: string) => {
    (getEl('createSat-basic-inc') as HTMLInputElement).value = inc;
    (getEl('createSat-basic-apogee') as HTMLInputElement).value = apogee;
    (getEl('createSat-basic-perigee') as HTMLInputElement).value = perigee;
    (getEl('createSat-basic-scc') as HTMLInputElement).value = '90000';
    (getEl('createSat-basic-name') as HTMLInputElement).value = 'My Sat';
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

  it('refreshes Advanced derived values for repeated Basic orbits and preserves them on invalid recovery', () => {
    vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);
    for (const [apogee, perigee] of [
      [400, 400],
      [800, 800],
      [1200, 400],
    ]) {
      setBasic('51.6', String(apogee), String(perigee));
      p().createSatBasicSubmit_();
      expect(parseFloat((getEl('createSat-calc-apogee') as HTMLInputElement).value)).toBeCloseTo(apogee, 0);
      expect(parseFloat((getEl('createSat-calc-perigee') as HTMLInputElement).value)).toBeCloseTo(perigee, 0);
      const meanMotion = parseFloat((getEl('createSat-meanmo') as HTMLInputElement).value);
      const ecc = parseFloat((getEl('createSat-ecen') as HTMLInputElement).value) / 1e7;
      const derived = CreateSat.calculateDerivedParams(meanMotion, ecc);

      expect(parseFloat((getEl('createSat-calc-sma') as HTMLInputElement).value)).toBeCloseTo(derived.semimajorAxis, 0);
    }
    const before = (getEl('createSat-calc-apogee') as HTMLInputElement).value;

    setBasic('200', '800', '800');
    p().createSatBasicSubmit_();
    expect((getEl('createSat-calc-apogee') as HTMLInputElement).value).toBe(before);
  });

  it('populateBasicTabDefaults_ fills the basic-tab inputs with defaults', () => {
    p().populateBasicTabDefaults_();

    expect((getEl('createSat-basic-scc') as HTMLInputElement).value).toBe('90000');
    expect((getEl('createSat-basic-perigee') as HTMLInputElement).value).toBe('400');
  });

  it('createSatBasicSubmit_ shows inline feedback on non-numeric input', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    const submitSpy = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);

    setBasic('abc', '400', '400');
    p().createSatBasicSubmit_();

    expect(getEl('createSat-basic-error')?.textContent).toBeTruthy();
    expect(toastSpy).not.toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('createSatBasicSubmit_ rejects a perigee below 100 km', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    const submitSpy = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);

    setBasic('51.6', '400', '50');
    p().createSatBasicSubmit_();

    expect(getEl('createSat-basic-error')?.textContent).toBeTruthy();
    expect(toastSpy).not.toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('createSatBasicSubmit_ rejects an apogee below the perigee', () => {
    const submitSpy = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);

    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    setBasic('51.6', '300', '500');
    p().createSatBasicSubmit_();

    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('createSatBasicSubmit_ rejects an out-of-range inclination', () => {
    const submitSpy = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);

    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    setBasic('200', '400', '400');
    p().createSatBasicSubmit_();

    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('createSatBasicSubmit_ populates the advanced tab and submits for a valid orbit', () => {
    const submitSpy = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);

    setBasic('51.6', '420', '400');
    p().createSatBasicSubmit_();

    expect((getEl('createSat-scc') as HTMLInputElement).value).toBe('90000');
    expect((getEl('createSat-inc') as HTMLInputElement).value).toContain('51.6');
    expect(submitSpy).toHaveBeenCalled();
  });
  it('clears only Basic validation feedback after corrected creation and preserves unrelated notifications', () => {
    const submit = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    document.body.insertAdjacentHTML('beforeend', '<div id="unrelated-toast">Unrelated notification</div>');
    setBasic('181', '800', '400');
    p().createSatBasicSubmit_();
    const error = getEl('createSat-basic-error', true);
    expect(error?.textContent).toContain('Inclination');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(getEl('createSat-basic-inc')?.getAttribute('aria-invalid')).toBe('true');
    expect(submit).not.toHaveBeenCalled();
    setBasic('51.6', '800', '400');
    p().createSatBasicSubmit_();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(error?.textContent).toBe('');
    expect(error?.hidden).toBe(true);
    expect(getEl('createSat-basic-inc')?.getAttribute('aria-invalid')).toBe('false');
    expect(getEl('unrelated-toast')?.textContent).toBe('Unrelated notification');
    expect(toast).not.toHaveBeenCalled();
  });
});
