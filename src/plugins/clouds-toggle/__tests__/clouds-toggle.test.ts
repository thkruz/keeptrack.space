import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { CloudsToggle } from '@app/plugins/clouds-toggle/clouds-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('CloudsToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(CloudsToggle, 'CloudsToggle');
});

describe('CloudsToggle methods', () => {
  let plugin: CloudsToggle;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new CloudsToggle();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes a UTILITY_ONLY bottom-icon config', () => {
    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('clouds-toggle-bottom-icon');
    expect(config.label).toBe('Clouds');
  });

  it('binds the "c" keyboard shortcut to the toggle', () => {
    const shortcuts = plugin.getKeyboardShortcuts();

    expect(shortcuts[0].key).toBe('c');
    expect(() => shortcuts[0].callback()).not.toThrow();
  });

  it('exposes a command-palette toggle command', () => {
    const commands = plugin.getCommandPaletteCommands();

    expect(commands[0].id).toBe('CloudsToggle.toggle');
    expect(() => commands[0].callback()).not.toThrow();
  });

  it('enables the clouds map when toggled on', () => {
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();

    expect(settingsManager.isDrawCloudsMap).toBe(true);
  });

  it('disables the clouds map when toggled off', () => {
    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();

    expect(settingsManager.isDrawCloudsMap).toBe(false);
  });

  it('bottomIconCallback bridges to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();

    expect(spy).toHaveBeenCalled();
  });

  it('syncs the icon to selected on uiManagerFinal when clouds are already drawn', () => {
    settingsManager.isDrawCloudsMap = true;
    const spy = vi.spyOn(plugin, 'setBottomIconToSelected');

    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    expect(spy).toHaveBeenCalled();
  });
});
