import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SoundToggle } from '@app/plugins/sound-toggle/sound-toggle';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('SoundToggle pluginActionUsed', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    new TopMenu().init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits pluginActionUsed when mute is toggled', () => {
    const plugin = new SoundToggle();

    plugin.init();
    vi.spyOn(ServiceLocator.getSoundManager()!, 'toggleMute').mockImplementation(() => undefined);
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    plugin.toggleMute();

    expect(emit).toHaveBeenCalledWith(EventBusEvent.pluginActionUsed, 'SoundToggle');
  });
});
