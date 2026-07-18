import { ServiceLocator } from '@app/engine/core/service-locator';
import { EarthPresetsPlugin } from '@app/plugins/earth-presets/earth-presets';
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
    changeEarthTextureStyle = vi.fn();
    (ServiceLocator.getScene() as unknown as { earth: unknown }).earth = { changeEarthTextureStyle };
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
});
