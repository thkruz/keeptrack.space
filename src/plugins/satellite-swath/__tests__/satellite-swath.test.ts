import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { getEl } from '@app/engine/utils/get-el';
import { SatelliteSwath } from '@app/plugins/satellite-swath/satellite-swath';
import {
  applyPreset,
  defaultSwathSettings,
  nadirWidthKm,
  resolveFovDeg,
  SwathSettingsStore,
  sanitizeSwathSettings,
  toSwathParams,
} from '@app/plugins/satellite-swath/satellite-swath-core';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager } from '@app/settings/settings';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatelliteSwath', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => vi.restoreAllMocks());

  standardPluginSuite(SatelliteSwath, 'SatelliteSwath');
  standardPluginMenuButtonTests(SatelliteSwath, 'SatelliteSwath');
});

describe('SatelliteSwath core', () => {
  it('converts the hr-eo width to a FOV at 500 km', () => {
    // 12 km from 500 km: 2 atan2(sin(12/12742.0176), 6871.0088/6371.0088 - cos(...)) = 1.3750 deg
    const s = applyPreset(defaultSwathSettings(), 'hr-eo');

    expect(Math.abs(resolveFovDeg(s, 500) - 1.375)).toBeLessThan(0.01);
  });

  it('reports the nadir width for a FOV entry', () => {
    // Inverse of the Landsat 9 check: 14.935 deg from 705 km images 185 km (Python check).
    const s = { ...defaultSwathSettings(), mode: 'fov' as const, fovDeg: 14.935 };

    expect(nadirWidthKm(s, 705)).toBeCloseTo(185, 0);
    // Width mode echoes the entered width.
    expect(nadirWidthKm(applyPreset(s, 'wide'), 705)).toBe(1500);
  });

  it('passes the toggles through to the mesh parameters', () => {
    const p = toSwathParams({ ...defaultSwathSettings(), isDaylightOnly: true, isShowFieldOfRegard: false }, 500);

    expect(p.isDaylightOnly).toBe(true);
    expect(p.isShowFieldOfRegard).toBe(false);
    // mr-eo preset: 20 deg tilt, 10 deg Sun.
    expect(p.maxOffNadirDeg).toBe(20);
    expect(p.minSunElevDeg).toBe(10);
  });

  it('rejects out-of-range or malformed entries', () => {
    expect(sanitizeSwathSettings({ ...defaultSwathSettings(), fovDeg: 500 })).toBeNull();
    expect(sanitizeSwathSettings({ ...defaultSwathSettings(), presetId: 'nope' })).toBeNull();
    expect(sanitizeSwathSettings('x')).toBeNull();
    expect(sanitizeSwathSettings(defaultSwathSettings())).toEqual(defaultSwathSettings());
  });

  it('caps the store at 200 satellites, dropping the oldest', () => {
    const store = new SwathSettingsStore();

    for (let i = 0; i < 201; i++) {
      store.set(String(i), defaultSwathSettings());
    }

    expect(store.size).toBe(200);
    expect(store.get('0')).toBeNull();
    expect(store.get('1')).not.toBeNull();
    // Re-saving refreshes recency: "1" survives the next insert, "2" goes.
    store.set('1', defaultSwathSettings());
    store.set('201', defaultSwathSettings());
    expect(store.get('1')).not.toBeNull();
    expect(store.get('2')).toBeNull();
  });

  it('round-trips through its JSON form and survives corrupt input', () => {
    const store = new SwathSettingsStore();

    store.set('25544', applyPreset(defaultSwathSettings(), 'wide'));
    const back = SwathSettingsStore.parse(store.serialize());

    expect(back.get('25544')?.presetId).toBe('wide');
    expect(SwathSettingsStore.parse('{not json').size).toBe(0);
  });
});

describe('SatelliteSwath behaviour', () => {
  let plugin: SatelliteSwath;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    PersistenceManager.getInstance().removeItem(StorageKey.SATELLITE_SWATH_SETTINGS);
    plugin = new SatelliteSwath();
    websiteInit(plugin);
    PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat = () => defaultSat as never;
    settingsManager.isDrawSwath = false;
  });

  afterEach(() => {
    settingsManager.isDrawSwath = false;
    vi.restoreAllMocks();
  });

  const turnOn = (): void => {
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
  };

  it('is off by default', () => {
    expect(settingsManager.isDrawSwath).toBe(false);
    expect(ServiceLocator.getScene().swathFactory.targetId).toBe(-1);
  });

  it('turning on targets the selected satellite and opens the settings menu', () => {
    const setTarget = vi.spyOn(ServiceLocator.getScene().swathFactory, 'setTarget');

    turnOn();

    expect(settingsManager.isDrawSwath).toBe(true);
    expect(setTarget).toHaveBeenCalledWith(defaultSat.id, expect.objectContaining({ maxOffNadirDeg: 20 }));
    expect(plugin.isSettingsMenuOpen).toBe(true);
  });

  it('turning off clears the layer and closes the menu', () => {
    turnOn();
    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();

    expect(settingsManager.isDrawSwath).toBe(false);
    expect(ServiceLocator.getScene().swathFactory.targetId).toBe(-1);
    expect(plugin.isSettingsMenuOpen).toBe(false);
  });

  it('changing the preset persists it and triggers exactly one rebuild', () => {
    turnOn();
    const setParams = vi.spyOn(ServiceLocator.getScene().swathFactory, 'setParams');
    const select = getEl('swath-preset') as HTMLSelectElement;

    select.value = 'wide';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(setParams).toHaveBeenCalledTimes(1);
    // wide preset: FOV derived from 1500 km, no field of regard tilt.
    expect(setParams.mock.calls[0][0].maxOffNadirDeg).toBe(0);
    const stored = SwathSettingsStore.parse(PersistenceManager.getInstance().getItem(StorageKey.SATELLITE_SWATH_SETTINGS));

    expect(stored.get(defaultSat.sccNum)?.presetId).toBe('wide');
  });

  it('a manual geometry edit turns the preset into Custom', () => {
    turnOn();
    const input = getEl('swath-max-off-nadir') as HTMLInputElement;

    input.value = '33';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(plugin.settings.presetId).toBe('custom');
    expect(plugin.settings.maxOffNadirDeg).toBe(33);
  });

  it('contributes a graphics section whose field-of-regard fill is Medium and above', () => {
    const section = plugin.getSettingsContribution();
    const fill = section.controls.find((c) => c.id === 'fieldOfRegardFill');

    expect(section.target).toBe('graphics');
    expect(fill?.quality).toEqual({ minLevel: 'medium' });
    const preserve = vi.spyOn(SettingsManager, 'preserveSettings');
    const refresh = vi.spyOn(ServiceLocator.getScene().swathFactory, 'refresh');

    if (fill?.type === 'toggle') {
      fill.set(false);
      expect(settingsManager.isDrawSwathFieldOfRegard).toBe(false);
      fill.set(true);
    }
    expect(preserve).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('uses the free lowercase h shortcut', () => {
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('h');
  });
});
