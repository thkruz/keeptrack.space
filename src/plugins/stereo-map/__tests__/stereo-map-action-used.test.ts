import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { StereoMap } from '@app/plugins/stereo-map/stereo-map';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

describe('StereoMap pluginActionUsed', () => {
  let map: { mapMenuClick_: (e: unknown) => void; updateMap: () => void };
  let emit: ReturnType<typeof vi.spyOn>;
  const used = () => emit.mock.calls.some((c) => c[0] === EventBusEvent.pluginActionUsed && c[1] === 'StereoMap');

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    const plugin = new StereoMap();

    websiteInit(plugin);
    map = plugin as never;
    map.updateMap = vi.fn();
    vi.spyOn(ServiceLocator.getTimeManager(), 'changeSimulationTime').mockImplementation(() => undefined);
    emit = vi.spyOn(EventBus.getInstance(), 'emit');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits when the user jumps to a ground-track time', () => {
    map.mapMenuClick_({ target: { dataset: { time: '2026-01-01 00:00:00' } } });
    expect(ServiceLocator.getTimeManager().changeSimulationTime).toHaveBeenCalled();
    expect(used()).toBe(true);
  });

  it('does not emit on a click with no time', () => {
    map.mapMenuClick_({ target: { dataset: {} } });
    expect(used()).toBe(false);
  });
});
