import { settingsManager } from '@app/settings/settings';
import { SkipInterpolationToggle } from '@app/plugins/skip-interpolation-toggle/skip-interpolation-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SkipInterpolationToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SkipInterpolationToggle, 'SkipInterpolationToggle');
});

describe('SkipInterpolationToggle methods', () => {
  let plugin: SkipInterpolationToggle;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new SkipInterpolationToggle();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes its bottom-icon config and command-palette command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('skip-interpolation-toggle-bottom-icon');
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('SkipInterpolationToggle.toggle');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('toggles the skip-TLE-interpolation setting on and off (singleton)', () => {
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(settingsManager.isSkipTleInterpolation).toBe(true);

    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();
    expect(settingsManager.isSkipTleInterpolation).toBe(false);
  });

  it('bridges bottomIconCallback to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(spy).toHaveBeenCalled();
  });
});
