import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { missileManager } from '@app/plugins/missile/missile-manager';
import { MissileSimulatorPlugin } from '@app/plugins/missile/missile-simulator-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const setVal = (id: string, value: string) => {
  (getEl(id) as HTMLInputElement).value = value;
};

describe('MissileSimulatorPlugin behavior', () => {
  let plugin: MissileSimulatorPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new MissileSimulatorPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    vi.spyOn(missileManager, 'createMissile').mockImplementation(() => undefined as never);
    vi.spyOn(missileManager, 'createMirvAttack').mockImplementation(() => 0 as never);
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
    expect(getEl('ms-tgt-holder-lat')!.style.display).not.toBe('none');

    setVal('ms-target', '0');
    p().msTargetChange_();
    expect(getEl('ms-tgt-holder-lat')!.style.display).toBe('none');
  });

  it('msAttackerChange_ flags submarine launch sites and reveals launch fields', () => {
    setVal('ms-attacker', '100'); // Ohio Sub - submarine
    p().msAttackerChange_();
    expect(p().isSub_).toBe(true);
    expect(getEl('ms-lau-holder-lat')!.style.display).not.toBe('none');

    setVal('ms-attacker', '201'); // Dombarovskiy - silo, not a sub
    p().msAttackerChange_();
    expect(p().isSub_).toBe(false);
    expect(getEl('ms-lau-holder-lat')!.style.display).toBe('none');
  });

  it('a real change event on the attacker select updates isSub_ (handler is bound to the plugin)', () => {
    // This is the regression guard for the old unbound-`this` bug: the change
    // handler used to write isSub_ onto the <select> element, never the plugin.
    const attacker = getEl('ms-attacker') as HTMLSelectElement;

    attacker.value = '100'; // Ohio Sub
    attacker.dispatchEvent(new Event('change'));
    expect(p().isSub_).toBe(true);

    attacker.value = '201'; // silo
    attacker.dispatchEvent(new Event('change'));
    expect(p().isSub_).toBe(false);
  });

  it('searchForRvs_ runs the RV_ search', () => {
    const searchSpy = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().searchForRvs_();

    expect(searchSpy).toHaveBeenCalledWith('RV_');
  });

  it('clearMissiles_ clears the manager and refreshes the status', () => {
    const clearSpy = vi.spyOn(missileManager, 'clearMissiles').mockImplementation(() => undefined);

    p().clearMissiles_();

    expect(clearSpy).toHaveBeenCalled();
  });

  it('updateLoop_ refreshes the orbit buffer for every active missile', () => {
    const updateSpy = vi.spyOn(ServiceLocator.getOrbitManager(), 'updateOrbitBuffer').mockImplementation(() => undefined);

    missileManager.missileArray = [{ id: 11 }, { id: 22 }] as never;
    p().updateLoop_();

    expect(updateSpy).toHaveBeenCalledTimes(2);

    missileManager.missileArray = [] as never;
  });

  it('getCommandPaletteCommands exposes open, show-all, and clear commands', () => {
    const commands = plugin.getCommandPaletteCommands();

    expect(commands.map((c) => c.id)).toContain('MissileSimulatorPlugin.open');
    const showAll = commands.find((c) => c.id === 'MissileSimulatorPlugin.showAllMissiles');
    const clear = commands.find((c) => c.id === 'MissileSimulatorPlugin.clearMissiles');

    missileManager.missilesInUse = 0;
    expect(showAll?.isAvailable?.()).toBe(false);
    expect(clear?.isAvailable?.()).toBe(false);
    missileManager.missilesInUse = 5;
    expect(showAll?.isAvailable?.()).toBe(true);
    expect(clear?.isAvailable?.()).toBe(true);
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

  it('onFormSubmit with a single warhead launches one missile (not MIRV)', () => {
    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    setVal('ms-type', '0');
    setVal('ms-attacker', '101'); // Minot (USA silo)
    setVal('ms-target', '0'); // Washington DC (preset)
    setVal('ms-warheads', '1');
    plugin.onFormSubmit();
    vi.advanceTimersByTime(2000);

    expect(missileManager.createMissile).toHaveBeenCalled();
    expect(missileManager.createMirvAttack).not.toHaveBeenCalled();
  });

  it('onFormSubmit with multiple warheads launches a MIRV attack', () => {
    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    setVal('ms-type', '0');
    setVal('ms-attacker', '101'); // Minot (USA silo)
    setVal('ms-target', '0'); // Washington DC (preset)
    setVal('ms-warheads', '4');
    plugin.onFormSubmit();
    vi.advanceTimersByTime(2000);

    expect(missileManager.createMirvAttack).toHaveBeenCalled();
    expect(missileManager.createMissile).not.toHaveBeenCalled();
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

  it('onFormSubmit rejects an out-of-range warhead count', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    setVal('ms-type', '0');
    setVal('ms-attacker', '101'); // Minot (USA silo)
    setVal('ms-target', '0'); // Washington DC (preset)
    setVal('ms-warheads', '99'); // above the 12 cap
    plugin.onFormSubmit();
    vi.advanceTimersByTime(2000);

    expect(toastSpy).toHaveBeenCalled();
    expect(missileManager.createMissile).not.toHaveBeenCalled();
  });
});
