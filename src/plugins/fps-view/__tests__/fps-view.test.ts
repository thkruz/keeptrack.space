import { Camera } from '@app/engine/camera/camera';
import { CameraType } from '@app/engine/camera/camera-type';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
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
    // A real camera: the FPS toggle relies on setCameraType / restoreCameraType behavior
    Container.getInstance().registerSingleton(Singletons.MainCamera, new Camera());
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

describe('FpsView toggle and first-use hint', () => {
  let plugin: FpsView;

  beforeEach(() => {
    setupStandardEnvironment();
    Container.getInstance().registerSingleton(Singletons.MainCamera, new Camera());
    PersistenceManager.getInstance().removeItem(StorageKey.FPS_VIEW_HINT_SEEN);
    plugin = new FpsView();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a second press returns to the camera it was entered from', () => {
    const camera = ServiceLocator.getMainCamera();

    camera.cameraType = CameraType.FIXED_TO_EARTH;
    plugin.bottomIconCallback();
    expect(camera.cameraType).toBe(CameraType.FPS);

    plugin.bottomIconCallback();
    expect(camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
  });

  it('entering starts from the default FPS pose', () => {
    const camera = ServiceLocator.getMainCamera();

    camera.cameraType = CameraType.FIXED_TO_EARTH;
    camera.state.fpsPos = [0, 0, 0];
    plugin.bottomIconCallback();

    expect(Array.from(camera.state.fpsPos)).toEqual([0, 25000, 0]);
  });

  it('shows the fly-keys hint once per device on the first FPS entry', () => {
    const camera = ServiceLocator.getMainCamera();
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    toastSpy.mockClear();

    camera.cameraType = CameraType.FIXED_TO_EARTH;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    camera.cameraType = CameraType.FPS;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(PersistenceManager.getInstance().getItem(StorageKey.FPS_VIEW_HINT_SEEN)).toBe('true');

    camera.cameraType = CameraType.FIXED_TO_EARTH;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    camera.cameraType = CameraType.FPS;
    EventBus.getInstance().emit(EventBusEvent.updateLoop);
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });
});
