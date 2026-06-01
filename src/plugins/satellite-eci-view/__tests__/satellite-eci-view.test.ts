import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SatelliteEciView } from '@app/plugins/satellite-eci-view/satellite-eci-view';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatelliteEciView', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatelliteEciView, 'SatelliteEciView');
});

describe('SatelliteEciView methods', () => {
  let plugin: SatelliteEciView;
  let ssm: SelectSatManager;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new SatelliteEciView();
    plugin.init();
    ssm = PluginRegistry.getPlugin(SelectSatManager) as SelectSatManager;
    vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);
    vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes config, "3" shortcut and command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBeTruthy();
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('3');
    expect(() => plugin.getKeyboardShortcuts()[0].callback()).not.toThrow();
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('toasts and shakes when no satellite is selected', () => {
    ssm.selectedSat = -1;
    const shake = vi.spyOn(plugin, 'shakeBottomIcon').mockImplementation(() => undefined);
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    plugin.bottomIconCallback();
    expect(toast).toHaveBeenCalled();
    expect(shake).toHaveBeenCalled();
  });

  it('ignores the click when already in ECI view', () => {
    ssm.selectedSat = 0;
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_SAT_ECI;
    const selectSpy = vi.spyOn(ssm, 'selectSat');

    plugin.bottomIconCallback();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('switches to FIXED_TO_SAT_ECI when a satellite is selected', () => {
    ssm.selectedSat = 0;
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    vi.spyOn(ssm, 'selectSat').mockImplementation(() => undefined);

    plugin.bottomIconCallback();
    expect(ServiceLocator.getMainCamera().cameraType).toBe(CameraType.FIXED_TO_SAT_ECI);
  });

  it('runs the updateLoop sync handler (both branches)', () => {
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_SAT_ECI;
    plugin.isIconDisabled = false;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(plugin.setBottomIconToSelected).toHaveBeenCalled();

    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    plugin.isMenuButtonActive = true;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(plugin.setBottomIconToUnselected).toHaveBeenCalled();
  });
});
