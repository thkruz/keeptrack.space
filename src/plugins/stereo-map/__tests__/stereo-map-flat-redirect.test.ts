import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { StereoMap } from '@app/plugins/stereo-map/stereo-map';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

describe('StereoMap redirects to the Pro flat map (#220)', () => {
  let plugin: StereoMap;
  const flatMap = { id: 'FlatMapView', bottomIconCallback: vi.fn() };

  beforeEach(() => {
    flatMap.bottomIconCallback.mockClear();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new StereoMap();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('M and the palette command open the flat map and not the free map when Pro has it', () => {
    vi.spyOn(PluginRegistry, 'getPluginByName').mockReturnValue(flatMap as never);
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    plugin.getKeyboardShortcuts()[0].callback();
    plugin
      .getCommandPaletteCommands()
      .find((c) => c.id === 'StereoMap.toggle')
      ?.callback();

    expect(flatMap.bottomIconCallback).toHaveBeenCalledTimes(2);
    expect(emit.mock.calls.some((c) => c[0] === EventBusEvent.bottomMenuClick)).toBe(false);
  });

  it('pressing M again calls the flat map toggle, which returns to 3D', () => {
    vi.spyOn(PluginRegistry, 'getPluginByName').mockReturnValue(flatMap as never);

    plugin.bottomMenuClicked();
    plugin.bottomMenuClicked();

    expect(flatMap.bottomIconCallback).toHaveBeenCalledTimes(2);
  });

  it('opens the free map as before when there is no flat map', () => {
    vi.spyOn(PluginRegistry, 'getPluginByName').mockReturnValue(null);
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    plugin.getKeyboardShortcuts()[0].callback();

    expect(flatMap.bottomIconCallback).not.toHaveBeenCalled();
    expect(emit.mock.calls.some((c) => c[0] === EventBusEvent.bottomMenuClick)).toBe(true);
  });
});
