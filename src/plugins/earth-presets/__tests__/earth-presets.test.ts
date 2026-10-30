import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { AtmosphereSettings } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { EarthPresetsPlugin } from '@app/plugins/earth-presets/earth-presets';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { PoliticalMapToggle } from '@app/plugins/political-map-toggle/political-map-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('EarthPresetsPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(EarthPresetsPlugin, 'EarthPresetsPlugin');
});

describe('EarthPresetsPlugin onContextMenuAction', () => {
  let plugin: EarthPresetsPlugin;
  let changeEarthTextureStyle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new EarthPresetsPlugin();
    // Mirrors Earth.changeEarthTextureStyle: it stores the style on settingsManager.
    changeEarthTextureStyle = vi.fn((style: string) => {
      (settingsManager as unknown as { earthTextureStyle: string }).earthTextureStyle = style;
    });
    (ServiceLocator.getScene() as unknown as { earth: unknown }).earth = { changeEarthTextureStyle };
    PersistenceManager.getInstance().removeItem(StorageKey.EARTH_PRESET);
    EarthPresetsPlugin.lastAppliedPresetId = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['earth-satellite-rmb', 'earth-nadir-rmb', 'earth-engineer-rmb', 'earth-opscenter-rmb', 'earth-90sGraphics-rmb', 'unknown-rmb'])(
    'applies the %s preset without throwing',
    (targetId) => {
      expect(() => plugin.onContextMenuAction(targetId)).not.toThrow();
    }
  );

  it('changes the earth texture style for a known preset', () => {
    plugin.onContextMenuAction('earth-satellite-rmb');

    expect(changeEarthTextureStyle).toHaveBeenCalled();
    expect(settingsManager.isDrawPoliticalMap).toBe(true);
    expect(EarthPresetsPlugin.lastAppliedPresetId).toBe('satellite');
  });

  it('Engineering Tool turns the political map off and dims its icon, and lights the Night icon', () => {
    const political = new PoliticalMapToggle();
    const night = new NightToggle();

    political.init();
    night.init();
    settingsManager.isDrawPoliticalMap = true;
    settingsManager.isDrawPoliticalLabels = false;
    political.syncIconState();
    expect(political.isMenuButtonActive).toBe(true);

    plugin.onContextMenuAction('earth-engineer-rmb');

    expect(settingsManager.isDrawPoliticalMap).toBe(false);
    expect(political.isMenuButtonActive).toBe(false);
    expect(settingsManager.isDrawNightAsDay).toBe(true);
    expect(night.isMenuButtonActive).toBe(true);
  });

  it('Satellite Images switches night off without closing the open side menu', () => {
    const night = new NightToggle();

    night.init();
    night.on();
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    plugin.onContextMenuAction('earth-satellite-rmb');

    expect(settingsManager.isDrawNightAsDay).toBe(false);
    expect(night.isMenuButtonActive).toBe(false);
    expect(emitSpy.mock.calls.some(([event]) => event === EventBusEvent.hideSideMenus)).toBe(false);
  });

  it('exposes one command palette entry per preset', () => {
    const commands = plugin.getCommandPaletteCommands();

    expect(commands).toHaveLength(EarthPresetsPlugin.PRESETS.length);
    commands[0].callback();
    expect(changeEarthTextureStyle).toHaveBeenCalled();
  });

  it('is only visible when right-clicking the earth', () => {
    const config = plugin.getContextMenuConfig();

    expect(config.isVisible!({ surface: 'earth', targetId: -1, target: null, hasPrimarySelection: false })).toBe(true);
    expect(config.isVisible!({ surface: 'space', targetId: -1, target: null, hasPrimarySelection: false })).toBe(false);
  });

  it('saves the applied preset id', () => {
    plugin.onContextMenuAction('earth-opscenter-rmb');

    expect(PersistenceManager.getInstance().getItem(StorageKey.EARTH_PRESET)).toBe('opscenter');
  });

  it('re-applies the saved preset at boot, not just its texture', () => {
    new NightToggle().init();
    PersistenceManager.getInstance().saveItem(StorageKey.EARTH_PRESET, 'opscenter');
    settingsManager.isLoadLastMap = true;
    settingsManager.isDrawLess = false;
    settingsManager.isEarthGrayScale = false;
    settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;

    EarthPresetsPlugin.restoreSavedPreset();

    expect(settingsManager.isEarthGrayScale).toBe(true);
    expect(settingsManager.isDrawAtmosphere).toBe(AtmosphereSettings.OFF);
    expect(settingsManager.isDrawNightAsDay).toBe(true);
    expect(EarthPresetsPlugin.lastAppliedPresetId).toBe('opscenter');
  });

  it('restores on onKeepTrackReady once the plugin is initialised', () => {
    new NightToggle().init();
    plugin.init();
    PersistenceManager.getInstance().saveItem(StorageKey.EARTH_PRESET, 'engineer');
    settingsManager.isLoadLastMap = true;
    settingsManager.isDrawLess = false;

    EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);

    expect(EarthPresetsPlugin.lastAppliedPresetId).toBe('engineer');
  });

  it('does not restore when the last map is not loaded', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.EARTH_PRESET, 'opscenter');
    settingsManager.isLoadLastMap = false;

    EarthPresetsPlugin.restoreSavedPreset();

    expect(changeEarthTextureStyle).not.toHaveBeenCalled();
    settingsManager.isLoadLastMap = true;
  });

  it('reads "Custom" and forgets the saved id after a hand-made change to a preset setting', () => {
    plugin.onContextMenuAction('earth-opscenter-rmb');
    expect(EarthPresetsPlugin.lastAppliedPresetId).toBe('opscenter');

    settingsManager.isDrawCloudsMap = true;

    expect(EarthPresetsPlugin.lastAppliedPresetId).toBeNull();
    EarthPresetsPlugin.forgetPresetIfChanged();
    expect(PersistenceManager.getInstance().getItem(StorageKey.EARTH_PRESET)).toBeNull();
  });

  it('keeps the saved id while the look is unchanged', () => {
    plugin.onContextMenuAction('earth-satellite-rmb');

    EarthPresetsPlugin.forgetPresetIfChanged();

    expect(PersistenceManager.getInstance().getItem(StorageKey.EARTH_PRESET)).toBe('satellite');
  });

  it('forgets the saved id on saveSettings after a change', () => {
    plugin.init();
    plugin.onContextMenuAction('earth-90sGraphics-rmb');
    settingsManager.isEarthGrayScale = true;

    EventBus.getInstance().emit(EventBusEvent.saveSettings);

    expect(PersistenceManager.getInstance().getItem(StorageKey.EARTH_PRESET)).toBeNull();
  });
});
