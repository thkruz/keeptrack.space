import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { EarthPresetsPlugin } from '@app/plugins/earth-presets/earth-presets';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('EarthPresetsPlugin pluginActionUsed', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    (ServiceLocator.getScene() as unknown as { earth: unknown }).earth = { changeEarthTextureStyle: vi.fn() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits pluginActionUsed when a preset is chosen from the context menu', () => {
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    new EarthPresetsPlugin().onContextMenuAction('earth-satellite-rmb');

    expect(emit).toHaveBeenCalledWith(EventBusEvent.pluginActionUsed, 'EarthPresetsPlugin');
  });

  it('does not emit when the saved preset is restored at boot', () => {
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    EarthPresetsPlugin.applyPreset('satellite');

    expect(emit).not.toHaveBeenCalledWith(EventBusEvent.pluginActionUsed, expect.anything());
  });
});
