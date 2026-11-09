import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ViewInfoRmbPlugin } from '@app/plugins/view-info-rmb/view-info-rmb';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('ViewInfoRmbPlugin pluginActionUsed', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits pluginActionUsed when the lat/lon item is chosen', () => {
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    ServiceLocator.getUiManager().toast = vi.fn();
    ServiceLocator.getInputManager().mouse = { latLon: { lat: 10, lon: 20 }, dragPosition: [1, 2, 3] } as never;

    new ViewInfoRmbPlugin().onContextMenuAction('view-info-rmb');

    expect(emit).toHaveBeenCalledWith(EventBusEvent.pluginActionUsed, 'ViewInfoRmbPlugin');
  });
});
