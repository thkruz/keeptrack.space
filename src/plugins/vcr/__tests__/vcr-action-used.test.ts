import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { VcrPlugin } from '@app/plugins/vcr/vcr';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('VcrPlugin pluginActionUsed', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="nav-wrapper"><ul id="nav-top-right"></ul></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits pluginActionUsed when play/pause is pressed', () => {
    const plugin = new VcrPlugin();

    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    ServiceLocator.getTimeManager().propRate = 1;
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    plugin.handlePlayPause();

    expect(emit).toHaveBeenCalledWith(EventBusEvent.pluginActionUsed, 'VcrPlugin');
  });
});
