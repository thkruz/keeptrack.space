import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { MissilePlugin } from '@app/plugins/missile/missile-plugin';
import { missileManager } from '@app/plugins/missile/missile-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const setVal = (id: string, value: string) => {
  (getEl(id) as HTMLInputElement).value = value;
};

describe('MissilePlugin behavior', () => {
  let plugin: MissilePlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new MissilePlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    vi.spyOn(missileManager, 'createMissile').mockImplementation(() => undefined as never);
    vi.spyOn(missileManager, 'massRaidPre').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('missileChange_ shows custom options only for the custom attack type', () => {
    setVal('ms-type', '0');
    p().missileChange_();
    expect(getEl('ms-custom-opt')!.style.display).toBe('block');

    setVal('ms-type', '1');
    p().missileChange_();
    expect(getEl('ms-custom-opt')!.style.display).toBe('none');
  });

  it('msTargetChange_ toggles the custom target lat/lon fields', () => {
    setVal('ms-target', '-1');
    p().msTargetChange_();
    expect(getEl('ms-tgt-holder-lat')!.style.display).toBe('block');

    setVal('ms-target', '0');
    p().msTargetChange_();
    expect(getEl('ms-tgt-holder-lat')!.style.display).toBe('none');
  });

  it('msAttackerChange_ flags submarine launch sites and reveals launch fields', () => {
    setVal('ms-attacker', '100'); // Ohio Sub - in the sub list
    p().msAttackerChange_();
    expect(p().isSub_).toBe(true);
    expect(getEl('ms-lau-holder-lat')!.style.display).toBe('block');

    setVal('ms-attacker', '201'); // Dombarovskiy - silo, not a sub
    p().msAttackerChange_();
    expect(p().isSub_).toBe(false);
    expect(getEl('ms-lau-holder-lat')!.style.display).toBe('none');
  });

  it('msErrorClick_ hides the error panel', () => {
    getEl('ms-error')!.style.display = 'block';
    p().msErrorClick_();
    expect(getEl('ms-error')!.style.display).toBe('none');
  });

  it('searchForRvs_ runs the RV_ search', () => {
    const searchSpy = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().searchForRvs_();

    expect(searchSpy).toHaveBeenCalledWith('RV_');
  });

  it('updateLoop_ refreshes the orbit buffer for every active missile', () => {
    const updateSpy = vi.spyOn(ServiceLocator.getOrbitManager(), 'updateOrbitBuffer').mockImplementation(() => undefined);

    missileManager.missileArray = [{ id: 11 }, { id: 22 }] as never;
    p().updateLoop_();

    expect(updateSpy).toHaveBeenCalledTimes(2);

    missileManager.missileArray = [] as never;
  });

  it('getCommandPaletteCommands exposes open and show-all commands', () => {
    const commands = plugin.getCommandPaletteCommands();

    expect(commands.map((c) => c.id)).toContain('MissilePlugin.open');
    const showAll = commands.find((c) => c.id === 'MissilePlugin.showAllMissiles');

    missileManager.missilesInUse = 0;
    expect(showAll?.isAvailable?.()).toBe(false);
    missileManager.missilesInUse = 5;
    expect(showAll?.isAvailable?.()).toBe(true);
    missileManager.missilesInUse = 0;
  });

  it('onFormSubmit with a preset attack type loads the scenario and toasts', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    setVal('ms-type', '1'); // Russia to USA
    plugin.onFormSubmit();
    vi.advanceTimersByTime(2000); // showLoading defers the work

    expect(missileManager.massRaidPre).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalled();
  });

  it('onFormSubmit with the custom type and a preset target launches a missile', () => {
    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    setVal('ms-type', '0');
    setVal('ms-attacker', '101'); // Minot (USA silo)
    setVal('ms-target', '0'); // Washington DC (preset)
    plugin.onFormSubmit();
    vi.advanceTimersByTime(2000);

    expect(missileManager.createMissile).toHaveBeenCalled();
  });

  it('onFormSubmit with the custom type and an invalid custom target toasts critical', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    setVal('ms-type', '0');
    setVal('ms-target', '-1'); // Custom Impact
    setVal('ms-lat', 'not-a-number');
    plugin.onFormSubmit();
    vi.advanceTimersByTime(2000);

    expect(toastSpy).toHaveBeenCalled();
    expect(missileManager.createMissile).not.toHaveBeenCalled();
  });
});
