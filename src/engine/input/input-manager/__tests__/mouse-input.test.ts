/* eslint-disable dot-notation */
import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { MouseInput } from '@app/engine/input/input-manager/mouse-input';
import { InputManager } from '@app/engine/input/input-manager';
import { UrlManager } from '@app/engine/input/url-manager';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('MouseInput handlers', () => {
  let mouse: MouseInput;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = () => mouse as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let camera: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inputManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let timeManager: any;
  let selectSat: ReturnType<typeof vi.fn>;
  let setSecondarySat: ReturnType<typeof vi.fn>;
  let keyboard: { getKey: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);

    keyboard = { getKey: vi.fn(() => false) };
    mouse = new MouseInput(keyboard as never);

    camera = {
      state: { mouseX: 0, mouseY: 0, isDragging: false, screenDragPoint: [0, 0], camAngleSnappedOnSat: true, reset: vi.fn() },
      cameraType: CameraType.DEFAULT,
      zoomWheel: vi.fn(),
      autoRotate: vi.fn(),
      resetRotation: vi.fn(),
    };
    vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue(camera as never);

    inputManager = {
      hidePopUps: vi.fn(),
      openRmbMenu: vi.fn(),
      clearRMBSubMenu: vi.fn(),
      rmbMenuItems: [],
    };
    vi.spyOn(ServiceLocator, 'getInputManager').mockReturnValue(inputManager as never);

    timeManager = {
      gmst: 0,
      calculateSimulationTime: vi.fn(),
      changePropRate: vi.fn(),
      toggleTime: vi.fn(),
      lastPropRate: 0,
      propRate: 1,
    };
    vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue(timeManager as never);
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({ getObject: vi.fn(() => ({ isStatic: () => false })) } as never);
    vi.spyOn(ServiceLocator, 'getUiManager').mockReturnValue({
      doSearch: vi.fn(), searchManager: { closeSearch: vi.fn() }, hideSideMenus: vi.fn(),
    } as never);
    vi.spyOn(ServiceLocator, 'getColorSchemeManager').mockReturnValue({ isUseGroupColorScheme: true } as never);
    vi.spyOn(ServiceLocator, 'getSoundManager').mockReturnValue({ play: vi.fn() } as never);

    selectSat = vi.fn();
    setSecondarySat = vi.fn();
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation((cls) => {
      if (cls === SelectSatManager) {
        return { selectSat, setSecondarySat, selectedSat: 0 } as never;
      }

      return null as never;
    });

    settingsManager.disableNormalEvents = false;
    settingsManager.disableUI = false;
    settingsManager.isFreezePropRateOnDrag = false;

    // closeColorbox() (called by canvasClick_) does a strict getEl('colorbox-div').
    if (!document.getElementById('colorbox-div')) {
      document.body.insertAdjacentHTML('beforeend', '<div id="colorbox-div"></div>');
    }
  });

  afterEach(() => vi.restoreAllMocks());

  describe('canvasWheel_', () => {
    it('forwards a pixel-mode wheel delta to the camera zoom', () => {
      m().canvasWheel_({ deltaY: 120, deltaMode: 0, preventDefault: vi.fn() } as never);

      expect(camera.zoomWheel).toHaveBeenCalledWith(120);
    });

    it('scales a line-mode wheel delta before zooming', () => {
      m().canvasWheel_({ deltaY: 3, deltaMode: 1, preventDefault: vi.fn() } as never);

      expect(camera.zoomWheel).toHaveBeenCalledWith(expect.closeTo(100, 0));
    });
  });

  describe('canvasClick_', () => {
    it('hides popups on a canvas click', () => {
      m().canvasClick_({ preventDefault: vi.fn() } as never);

      expect(inputManager.hidePopUps).toHaveBeenCalled();
    });
  });

  describe('canvasMouseDown_', () => {
    it('computes a lat/lon for a right-button press on the earth', () => {
      vi.spyOn(InputManager, 'getEarthScreenPoint').mockReturnValue([1, 2, 3] as never);
      const emit = vi.spyOn(EventBus.getInstance(), 'emit');

      m().canvasMouseDown_({ button: 2, preventDefault: vi.fn() } as never);

      expect(mouse.isStartedOnCanvas).toBe(true);
      expect(mouse.latLon).toBeDefined();
      expect(emit).toHaveBeenCalled();
    });

    it('freezes the prop rate on a left-button drag start when enabled', () => {
      settingsManager.isFreezePropRateOnDrag = true;

      m().canvasMouseDown_({ button: 0, preventDefault: vi.fn() } as never);

      expect(timeManager.changePropRate).toHaveBeenCalledWith(0);
    });
  });

  describe('canvasMouseUp_', () => {
    it('returns early when the gesture did not start on the canvas', () => {
      mouse.isStartedOnCanvas = false;

      m().canvasMouseUp_({ button: 0, preventDefault: vi.fn() } as never);

      expect(selectSat).not.toHaveBeenCalled();
    });

    it('selects the clicked satellite on a stationary left click', () => {
      mouse.isStartedOnCanvas = true;
      m().dragHasMoved = false;
      mouse.mouseSat = 42;
      const urlSpy = vi.spyOn(UrlManager, 'updateURL').mockImplementation(() => undefined);

      m().canvasMouseUp_({ button: 0, preventDefault: vi.fn() } as never);

      expect(selectSat).toHaveBeenCalledWith(42);
      expect(urlSpy).toHaveBeenCalled();
      expect(camera.state.isDragging).toBe(false);
    });

    it('opens the right-click menu on a stationary right click', () => {
      mouse.isStartedOnCanvas = true;
      m().dragHasMoved = false;
      mouse.mouseSat = 7;
      vi.spyOn(UrlManager, 'updateURL').mockImplementation(() => undefined);

      m().canvasMouseUp_({ button: 2, preventDefault: vi.fn() } as never);

      expect(inputManager.openRmbMenu).toHaveBeenCalledWith(7);
    });
  });

  describe('canvasMouseMoveFire_', () => {
    it('updates the camera mouse position and flags drag movement', () => {
      camera.state.isDragging = true;
      camera.state.screenDragPoint = [0, 0];

      m().canvasMouseMoveFire_({ clientX: 50, clientY: 60 } as never);

      expect(camera.state.mouseX).toBe(50);
      expect(camera.state.mouseY).toBe(60);
      expect(m().dragHasMoved).toBe(true);
      expect(camera.state.camAngleSnappedOnSat).toBe(false);
    });
  });

  describe('rmbMenuActions_', () => {
    const fire = (id: string) => m().rmbMenuActions_({ target: { id, tagName: 'DIV' } } as never);

    it('does nothing when the UI is disabled', () => {
      settingsManager.disableUI = true;

      fire('clear-lines-rmb');

      expect(ServiceLocator.getSoundManager()!.play).not.toHaveBeenCalled();
    });

    it('clears lines via the line manager', () => {
      const clearSpy = vi.spyOn(lineManagerInstance, 'clear').mockImplementation(() => undefined);

      fire('clear-lines-rmb');

      expect(clearSpy).toHaveBeenCalled();
    });

    it('toggles time', () => {
      fire('toggle-time-rmb');

      expect(timeManager.toggleTime).toHaveBeenCalled();
    });

    it('sets the secondary satellite', () => {
      m().clickedSat = 9;

      fire('set-sec-sat-rmb');

      expect(setSecondarySat).toHaveBeenCalledWith(9);
    });

    it('clears the screen and deselects', () => {
      const ui = ServiceLocator.getUiManager();

      fire('clear-screen-rmb');

      expect(ui.doSearch).toHaveBeenCalledWith('');
      expect(selectSat).toHaveBeenCalledWith(-1);
    });

    it('emits a bus event for unknown menu items', () => {
      const emit = vi.spyOn(EventBus.getInstance(), 'emit');

      fire('some-plugin-rmb');

      expect(emit).toHaveBeenCalledWith(expect.anything(), 'some-plugin-rmb', expect.anything());
    });
  });
});
