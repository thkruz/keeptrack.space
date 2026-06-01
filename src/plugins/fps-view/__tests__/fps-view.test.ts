import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { FpsView } from '@app/plugins/fps-view/fps-view';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('FpsView', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(FpsView, 'FpsView');
});

describe('FpsView methods', () => {
  let plugin: FpsView;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new FpsView();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes config, "8" shortcut and command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('fps-view-bottom-icon');
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('8');
    expect(() => plugin.getKeyboardShortcuts()[0].callback()).not.toThrow();
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('FpsView.activate');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('switches the camera to FPS on bottomIconCallback', () => {
    vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);
    plugin.bottomIconCallback();

    expect(ServiceLocator.getMainCamera().cameraType).toBe(CameraType.FPS);
  });

  it('syncs the icon to selected/unselected via the updateLoop handler', () => {
    const select = vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);

    ServiceLocator.getMainCamera().cameraType = CameraType.FPS;
    plugin.isMenuButtonActive = false;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(select).toHaveBeenCalled();

    const unselect = vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);

    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    plugin.isMenuButtonActive = true;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(unselect).toHaveBeenCalled();
  });
});
