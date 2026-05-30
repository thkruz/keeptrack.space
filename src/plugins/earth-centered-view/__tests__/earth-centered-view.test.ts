import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { EarthCenteredView } from '@app/plugins/earth-centered-view/earth-centered-view';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('EarthCenteredView', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(EarthCenteredView, 'EarthCenteredView');
});

describe('EarthCenteredView methods', () => {
  let plugin: EarthCenteredView;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new EarthCenteredView();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes config, "1" shortcut and command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('earth-centered-bottom-icon');
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('1');
    expect(() => plugin.getKeyboardShortcuts()[0].callback()).not.toThrow();
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('EarthCenteredView.activate');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('switches the camera to FIXED_TO_EARTH on bottomIconCallback', () => {
    vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);
    plugin.bottomIconCallback();

    expect(ServiceLocator.getMainCamera().cameraType).toBe(CameraType.FIXED_TO_EARTH);
  });

  it('syncs the icon to selected/unselected via the updateLoop handler', () => {
    const select = vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);

    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    plugin.isMenuButtonActive = false;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(select).toHaveBeenCalled();

    const unselect = vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);

    ServiceLocator.getMainCamera().cameraType = CameraType.FPS;
    plugin.isMenuButtonActive = true;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(unselect).toHaveBeenCalled();
  });
});
