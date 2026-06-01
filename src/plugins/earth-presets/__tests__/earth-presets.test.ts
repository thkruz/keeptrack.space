import { vi } from 'vitest';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EarthPresetsPlugin } from '@app/plugins/earth-presets/earth-presets';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('EarthPresetsPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(EarthPresetsPlugin, 'EarthPresetsPlugin');
});

describe('EarthPresetsPlugin rmbCallback', () => {
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

  it.each([
    'earth-satellite-rmb',
    'earth-nadir-rmb',
    'earth-engineer-rmb',
    'earth-opscenter-rmb',
    'earth-90sGraphics-rmb',
    'unknown-rmb',
  ])('applies the %s preset without throwing', (targetId) => {
    expect(() => plugin.rmbCallback(targetId)).not.toThrow();
  });

  it('changes the earth texture style for a known preset', () => {
    plugin.rmbCallback('earth-satellite-rmb');

    expect(changeEarthTextureStyle).toHaveBeenCalled();
    expect(settingsManager.isDrawPoliticalMap).toBe(true);
  });
});
