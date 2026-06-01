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

  it('populateBasicTabDefaults_ fills the basic-tab inputs with defaults', () => {
    p().populateBasicTabDefaults_();

    expect((getEl('createSat-basic-scc') as HTMLInputElement).value).toBe('90000');
    expect((getEl('createSat-basic-perigee') as HTMLInputElement).value).toBe('400');
  });

  it('createSatBasicSubmit_ toasts on non-numeric input', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    const submitSpy = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);

    setBasic('abc', '400', '400');
    p().createSatBasicSubmit_();

    expect(toastSpy).toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('createSatBasicSubmit_ rejects a perigee below 100 km', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    const submitSpy = vi.spyOn(C, 'createSatSubmit_').mockImplementation(() => undefined);

    setBasic('51.6', '400', '50');
    p().createSatBasicSubmit_();

    expect(toastSpy).toHaveBeenCalled();
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
});
