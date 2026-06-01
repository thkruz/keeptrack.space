import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('NewLaunch (base) behavior', () => {
  let plugin: NewLaunch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new NewLaunch();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildFacilityOptionsHtml groups launch facilities into optgroups', () => {
    const html = NewLaunch.buildFacilityOptionsHtml();

    expect(html).toContain('<optgroup');
    expect(html).toContain('<option');
  });

  it('preValidate_ disables the submit button when inclination is below the launch latitude', () => {
    (getEl('nl-facility') as HTMLInputElement).value = 'DLS'; // Dombarovsky, lat ~51

    p().preValidate_({ inclination: 10 } as Satellite);

    const submit = getEl('newLaunch-menu-submit') as HTMLButtonElement;

    expect(submit.disabled).toBe(true);
    expect(submit.textContent).toMatch(/too low/iu);
  });

  it('preValidate_ enables the submit button for a reachable inclination', () => {
    (getEl('nl-facility') as HTMLInputElement).value = 'DLS';

    p().preValidate_({ inclination: 80 } as Satellite);

    expect((getEl('newLaunch-menu-submit') as HTMLButtonElement).disabled).toBe(false);
  });

  it('selectLaunchSite sets the facility dropdown to the matching site key', () => {
    plugin.selectLaunchSite({ name: 'Dombarovsky Launch Site', site: 'Dombarovsky Air Base' } as never);

    expect((getEl('nl-facility') as HTMLSelectElement).value).toBe('DLS');
  });

  it('selectLaunchSite warns when the site is not in the catalog', () => {
    expect(() => plugin.selectLaunchSite({ name: 'Nowhere', site: 'Imaginary Pad' } as never)).not.toThrow();
  });

  it('submitCallback resolves the SCC and runs the launch', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(defaultSat);
    const launchSpy = vi.spyOn(p(), 'executeLaunch_').mockImplementation(() => undefined);

    (getEl('nl-scc') as HTMLInputElement).value = '00005';
    plugin.submitCallback();

    expect(launchSpy).toHaveBeenCalledWith(defaultSat);
  });

  it('executeLaunch_ toasts when no nominal satellite slot is available', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(null as never);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().executeLaunch_(defaultSat);

    expect(toastSpy).toHaveBeenCalled();
    expect(p().isDoingCalculations_).toBe(false);
  });
});
