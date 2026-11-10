import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SatelliteFov } from '@app/plugins/satellite-fov/satellite-fov';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatelliteFov pluginActionUsed', () => {
  let plugin: SatelliteFov;
  let emit: ReturnType<typeof vi.spyOn>;
  let cone: { editSettings: ReturnType<typeof vi.fn> } | null;
  const generateMesh = vi.fn();
  const used = () => emit.mock.calls.some((c) => c[0] === EventBusEvent.pluginActionUsed && c[1] === 'SatelliteFov');

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new SatelliteFov();
    websiteInit(plugin);
    PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat = () => defaultSat as never;
    cone = null;
    generateMesh.mockClear();
    vi.spyOn(ServiceLocator, 'getScene').mockReturnValue({
      coneFactory: { checkCacheForMesh_: () => cone, generateMesh, removeBySourceAndTarget: vi.fn() },
    } as never);
    emit = vi.spyOn(EventBus.getInstance(), 'emit');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits when a field-of-view cone is shown for the selected satellite', () => {
    (plugin as unknown as { toggleFovCone_: () => void }).toggleFovCone_();
    expect(generateMesh).toHaveBeenCalled();
    expect(used()).toBe(true);
  });

  it('does not emit when the cone is removed or when only its settings change', () => {
    cone = { editSettings: vi.fn() };
    (plugin as unknown as { toggleFovCone_: () => void }).toggleFovCone_();
    (plugin as unknown as { handleFormChange_: () => void }).handleFormChange_();
    expect(cone.editSettings).toHaveBeenCalled();
    expect(used()).toBe(false);
  });
});
