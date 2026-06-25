import { ISettingSelectControl, ISettingToggleControl } from '@app/engine/plugins/core/plugin-capabilities';
import { KeepTrack } from '@app/keeptrack';
import {
  SETTINGS_OWN_FAST_CPU_SECTION,
  SETTINGS_OWN_GENERAL_SECTION,
  getOwnSettingsSections,
  resetOwnSettings,
} from '@app/plugins/settings-menu/settings-menu-controls';
import { SettingsManager } from '@app/settings/settings';
import { SatLabelMode } from '@app/settings/ui-settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const findControl = (sectionId: string, controlId: string) => {
  const section = getOwnSettingsSections().find((s) => s.sectionId === sectionId);

  return section?.controls.find((c) => c.id === controlId);
};

describe('settings-menu-controls', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes a General and a Fast-CPU section', () => {
    const sections = getOwnSettingsSections();

    expect(sections.map((s) => s.sectionId)).toEqual([SETTINGS_OWN_GENERAL_SECTION, SETTINGS_OWN_FAST_CPU_SECTION]);
    expect(findControl(SETTINGS_OWN_FAST_CPU_SECTION, 'showNextPassOnHover')).toBeDefined();
  });

  it('the Show Next Pass toggle reads and writes isShowNextPass (not the phantom isShowNextPassOnHover)', () => {
    const control = findControl(SETTINGS_OWN_FAST_CPU_SECTION, 'showNextPassOnHover') as ISettingToggleControl;

    settingsManager.isShowNextPass = true;
    expect(control.get()).toBe(true);

    control.set(false);
    expect(settingsManager.isShowNextPass).toBe(false);
  });

  it('a simple toggle applies and persists immediately', () => {
    const preserve = vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);

    const control = findControl(SETTINGS_OWN_GENERAL_SECTION, 'displayEciOnHover') as ISettingToggleControl;

    control.set(true);

    expect(settingsManager.isEciOnHover).toBe(true);
    expect(preserve).toHaveBeenCalled();
  });

  it('gates the confidence toggle behind isShowConfidenceLevels', () => {
    const control = findControl(SETTINGS_OWN_GENERAL_SECTION, 'showConfidenceLevels') as ISettingToggleControl;

    settingsManager.isShowConfidenceLevels = false;
    expect(control.isAvailable?.()).toBe(false);

    settingsManager.isShowConfidenceLevels = true;
    expect(control.isAvailable?.()).toBe(true);
  });

  it('the ECF-orbits select parses its string value into the numeric setting', () => {
    const control = findControl(SETTINGS_OWN_GENERAL_SECTION, 'numberOfEcfOrbits') as ISettingSelectControl;

    control.set('3');
    expect(settingsManager.numberOfEcfOrbitsToDraw).toBe(3);

    // A non-numeric value is ignored rather than producing NaN.
    control.set('not-a-number');
    expect(settingsManager.numberOfEcfOrbitsToDraw).toBe(3);
  });

  it('resetOwnSettings restores factory defaults and contributed-section settings', () => {
    settingsManager.isDrawTrailingOrbits = true;
    settingsManager.isShowNextPass = true;
    settingsManager.numberOfEcfOrbitsToDraw = 10;
    settingsManager.satLabelMode = SatLabelMode.ALL;
    settingsManager.isDisableTimeMachineToasts = true;

    resetOwnSettings();

    expect(settingsManager.isDrawTrailingOrbits).toBe(false);
    expect(settingsManager.isShowNextPass).toBe(false);
    expect(settingsManager.numberOfEcfOrbitsToDraw).toBe(1);
    expect(settingsManager.satLabelMode).toBe(SatLabelMode.FOV_ONLY);
    expect(settingsManager.isDisableTimeMachineToasts).toBe(false);
  });
});
