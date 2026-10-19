import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { getEl } from '@app/engine/utils/get-el';
import { SatelliteSwath } from '@app/plugins/satellite-swath/satellite-swath';
import {
  applyPreset,
  defaultSwathSettings,
  isSwathBeyondHorizon,
  maxSwathWidthKm,
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

  it('clamps a width beyond the horizon to the horizon FOV instead of returning NaN', () => {
    // From 500 km on the 6371.0088 km swath sphere the widest visible swath is
    // 2 R acos(R / (R + h)) = 4891.0 km and the horizon-to-horizon FOV is
    // 2 asin(R / (R + h)) = 136.014 deg. ootk v8 fovFromSwathWidth returns NaN past that.
    const s = { ...defaultSwathSettings(), mode: 'width' as const, swathKm: 5000 };

    expect(maxSwathWidthKm(500)).toBeCloseTo(4891.0, 1);
    expect(isSwathBeyondHorizon(s, 500)).toBe(true);
    expect(resolveFovDeg(s, 500)).toBeCloseTo(136.014, 2);
    expect(Number.isFinite(toSwathParams(s, 500).fovDeg)).toBe(true);
    // Just inside the horizon the FOV approaches the clamp from below.
    const inside = { ...s, swathKm: 4890 };

    expect(isSwathBeyondHorizon(inside, 500)).toBe(false);
    expect(resolveFovDeg(inside, 500)).toBeLessThan(resolveFovDeg(s, 500));
    expect(resolveFovDeg(inside, 500)).toBeGreaterThan(130);
    // FOV mode never trips the horizon check.
    expect(isSwathBeyondHorizon({ ...s, mode: 'fov' }, 500)).toBe(false);
    expect(maxSwathWidthKm(0)).toBeNaN();
  });

  it('reports the nadir width for a FOV entry', () => {
    // Inverse of the Landsat 9 check: 14.935 deg from 705 km images 185 km (Python check).
    const s = { ...defaultSwathSettings(), mode: 'fov' as const, fovDeg: 14.935 };

    expect(nadirWidthKm(s, 705)).toBeCloseTo(185, 0);
    // Width mode echoes the entered width.
    expect(nadirWidthKm(applyPreset(s, 'wide'), 705)).toBe(1500);
  });

  it('passes the toggles through to the mesh parameters', () => {
    const p = toSwathParams({ ...defaultSwathSettings(), isDaylightOnly: true }, 500);

    expect(p.isDaylightOnly).toBe(true);
    expect('isShowFieldOfRegard' in p).toBe(false);
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

  it('loads entries saved with the retired per-satellite field-of-regard key and drops it', () => {
    // Shape stored before the global flag replaced the per-satellite switch.
    const legacy = {
      presetId: 'hr-eo',
      mode: 'width',
      swathKm: 12,
      fovDeg: 1.4,
      maxOffNadirDeg: 30,
      minSunElevDeg: 10,
      isShowFieldOfRegard: false,
      isDaylightOnly: true,
    };

    expect(sanitizeSwathSettings(legacy)).toEqual({
      presetId: 'hr-eo',
      mode: 'width',
      swathKm: 12,
      fovDeg: 1.4,
      maxOffNadirDeg: 30,
      minSunElevDeg: 10,
      isDaylightOnly: true,
    });
    const store = SwathSettingsStore.parse(JSON.stringify([['25544', legacy]]));

    expect(store.size).toBe(1);
    expect(store.get('25544')).not.toHaveProperty('isShowFieldOfRegard');
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

  it('the generic side-menu API opens and closes the settings menu without touching the layer', () => {
    turnOn();
    plugin.closeSideMenu();

    expect(plugin.isSettingsMenuOpen).toBe(false);
    expect(settingsManager.isDrawSwath).toBe(true);

    plugin.openSideMenu();

    expect(plugin.isSettingsMenuOpen).toBe(true);
    expect(plugin.isMenuButtonActive).toBe(true);
    expect(settingsManager.isDrawSwath).toBe(true);
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

  it('rejects a swath width beyond the horizon with a message and keeps the previous width', () => {
    turnOn();
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
    const before = plugin.settings.swathKm;
    const meanAlt = (Number(defaultSat.apogee) + Number(defaultSat.perigee)) / 2;
    const input = getEl('swath-width-km') as HTMLInputElement;

    // 4999 km is inside SWATH_LIMITS but past the horizon from the ISS (about 4500 km wide).
    expect(maxSwathWidthKm(meanAlt)).toBeLessThan(4999);
    input.value = '4999';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(toast).toHaveBeenCalledWith(expect.stringContaining(maxSwathWidthKm(meanAlt).toFixed(0)), expect.anything());
    expect(plugin.settings.swathKm).toBe(before);
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
