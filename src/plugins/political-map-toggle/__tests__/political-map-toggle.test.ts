import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PoliticalMapToggle } from '@app/plugins/political-map-toggle/political-map-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('PoliticalMapToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(PoliticalMapToggle, 'PoliticalMapToggle');
});

describe('PoliticalMapToggle methods', () => {
  let plugin: PoliticalMapToggle;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new PoliticalMapToggle();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes its bottom-icon config and "l" shortcut and command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('political-map-toggle-bottom-icon');
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('l');
    expect(() => plugin.getKeyboardShortcuts()[0].callback()).not.toThrow();
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('PoliticalMapToggle.toggle');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('toggles the political map setting on and off', () => {
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(settingsManager.isDrawPoliticalMap).toBe(true);

    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();
    expect(settingsManager.isDrawPoliticalMap).toBe(false);
  });

  it('bridges bottomIconCallback and syncs on uiManagerFinal', () => {
    const clickSpy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(clickSpy).toHaveBeenCalled();

    settingsManager.isDrawPoliticalMap = true;
    const selectSpy = vi.spyOn(plugin, 'setBottomIconToSelected');

    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    expect(selectSpy).toHaveBeenCalled();
  });
});
