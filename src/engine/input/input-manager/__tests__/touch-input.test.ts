/* eslint-disable dot-notation */
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { KeepTrack } from '@app/keeptrack';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { TouchInput } from '@app/engine/input/input-manager/touch-input';
import { vi } from 'vitest';

const makeCamera = () => ({
  state: {
    mouseX: 0,
    mouseY: 0,
    isDragging: true,
    camPitchSpeed: 1,
    camYawSpeed: 1,
    isAutoPitchYawToTarget: true,
    zoomTarget: 0.5,
    isZoomIn: false,
    camAngleSnappedOnSat: true,
  },
  autoRotate: vi.fn(),
});

const touchEvt = (touches: { clientX?: number; clientY?: number; pageX?: number; pageY?: number }[]) => ({
  touches: touches.map((t) => ({ clientX: t.clientX ?? 0, clientY: t.clientY ?? 0, pageX: t.pageX ?? 0, pageY: t.pageY ?? 0 })),
}) as unknown as TouchEvent;

describe('TouchInput', () => {
  let touch: TouchInput;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = () => touch as any;
  let camera: ReturnType<typeof makeCamera>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inputManager: any;
  let selectSat: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    touch = new TouchInput();

    camera = makeCamera();
    vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue(camera as never);

    inputManager = {
      hidePopUps: vi.fn(),
      openRmbMenu: vi.fn(),
      getSatIdFromCoord: vi.fn(() => 5),
      getSatIdFromCoordNeighborhood: vi.fn(() => ({ id: 5, offsetX: 0, offsetY: 0, hitCount: 1, patchData: 'x' })),
    };
    vi.spyOn(ServiceLocator, 'getInputManager').mockReturnValue(inputManager as never);

    selectSat = vi.fn();
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat } as never);

    settingsManager.debugMobilePicking = false;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('canvasTouchStart', () => {
    it('starts a pinch with two fingers and halts camera rotation', () => {
      touch.canvasTouchStart(touchEvt([{ pageX: 0, pageY: 0 }, { pageX: 30, pageY: 40 }]));

      expect(touch.isPinching).toBe(true);
      expect(touch.isPanning).toBe(false);
      expect(touch.startPinchDistance).toBeCloseTo(50); // hypot(30,40)
      expect(camera.state.isDragging).toBe(false);
    });

    it('starts a single-finger touch and seeds the start position', () => {
      const emit = vi.spyOn(EventBus.getInstance(), 'emit');

      touch.canvasTouchStart(touchEvt([{ clientX: 100, clientY: 200 }]));

      expect(touch.touchStartX).toBe(100);
      expect(touch.touchStartY).toBe(200);
      expect(camera.state.mouseX).toBe(100);
      expect(inputManager.hidePopUps).toHaveBeenCalled();
      expect(emit).toHaveBeenCalled();
    });
  });

  describe('canvasTouchEnd', () => {
    it('fires a tap for a short stationary touch', () => {
      touch.touchStartTime = Date.now();
      touch.isPanning = false;
      touch.isPinching = false;
      touch.touchStartX = 10;
      touch.touchStartY = 20;

      touch.canvasTouchEnd(touchEvt([]), camera as never);

      expect(inputManager.getSatIdFromCoord).toHaveBeenCalledWith(10, 20);
      expect(selectSat).toHaveBeenCalledWith(5);
    });

    it('fires a press (RMB menu) for a long touch', () => {
      touch.touchStartTime = Date.now() - 500; // exceeds pressMinTime
      touch.isPanning = false;
      touch.isPinching = false;

      touch.canvasTouchEnd(touchEvt([]), camera as never);

      expect(inputManager.openRmbMenu).toHaveBeenCalled();
    });

    it('resets rotation state when going from two fingers to one', () => {
      touch.touchStartTime = Date.now();
      touch.isPinching = true;

      touch.canvasTouchEnd(touchEvt([{ clientX: 7, clientY: 8 }]), camera as never);

      expect(touch.isPinching).toBe(false);
      expect(camera.state.camPitchSpeed).toBe(0);
      expect(touch.touchStartX).toBe(7);
    });

    it('clears drag state when the last finger lifts', () => {
      touch.touchStartTime = Date.now();
      touch.isPanning = true;
      touch.dragHasMoved = true;

      touch.canvasTouchEnd(touchEvt([]), camera as never);

      expect(touch.dragHasMoved).toBe(false);
      expect(camera.state.isDragging).toBe(false);
    });
  });

  describe('canvasTouchMove / processTouchMove_', () => {
    it('ignores a move with no touches', () => {
      expect(() => touch.canvasTouchMove(touchEvt([]))).not.toThrow();
    });

    it('caches touch data and schedules a processing frame', () => {
      touch.canvasTouchMove(touchEvt([{ clientX: 50, clientY: 60 }]));

      expect(touch.touchX).toBe(50);
      expect(touch.touchY).toBe(60);
      expect(t().touchMoveRafId_).not.toBe(-1);
    });

    it('pans on a single-finger move beyond the threshold', () => {
      touch.isPinching = false;
      touch.touchStartX = 0;
      touch.touchStartY = 0;
      touch.touchX = 100;
      touch.touchY = 100;
      t().cachedTouches_ = [{ clientX: 100, clientY: 100, pageX: 100, pageY: 100 }];

      t().processTouchMove_();

      expect(touch.isPanning).toBe(true);
      expect(camera.state.mouseX).toBe(100);
    });

    it('zooms on a two-finger pinch move', () => {
      touch.isPinching = true;
      touch.startPinchDistance = 50;
      t().cachedTouches_ = [
        { clientX: 0, clientY: 0, pageX: 0, pageY: 0 },
        { clientX: 0, clientY: 0, pageX: 60, pageY: 80 }, // hypot = 100
      ];

      t().processTouchMove_();

      expect(camera.state.isZoomIn).toBe(true);
    });
  });

  describe('tap', () => {
    it('selects the satellite under the tap and stops auto-movement', () => {
      touch.tap({ x: 42, y: 84 });

      expect(camera.state.isAutoPitchYawToTarget).toBe(false);
      expect(camera.autoRotate).toHaveBeenCalledWith(false);
      expect(selectSat).toHaveBeenCalledWith(5);
    });

    it('routes through the debug picking path when enabled', () => {
      settingsManager.debugMobilePicking = true;
      touch.canvasDOM = document.createElement('canvas');
      vi.spyOn(KeepTrack, 'getInstance').mockReturnValue({ containerRoot: document.createElement('div') } as never);

      touch.tap({ x: 42, y: 84 });

      expect(inputManager.getSatIdFromCoordNeighborhood).toHaveBeenCalled();
      expect(document.getElementById('touch-debug-overlay')).not.toBeNull();
      expect(selectSat).toHaveBeenCalled();
    });
  });

  describe('pan', () => {
    it('updates the camera mouse position and unsnaps from the satellite', () => {
      touch.pan({ x: 12, y: 34 });

      expect(camera.state.mouseX).toBe(12);
      expect(camera.state.mouseY).toBe(34);
      expect(camera.state.camAngleSnappedOnSat).toBe(false);
    });
  });

  describe('press', () => {
    it('opens the right-click menu and stops auto-movement', () => {
      touch.press(touchEvt([]));

      expect(camera.autoRotate).toHaveBeenCalledWith(false);
      expect(inputManager.openRmbMenu).toHaveBeenCalled();
    });
  });

  describe('pinch', () => {
    it('records the starting distance on pinchStart', () => {
      touch.pinchStart({ pinchDistance: 123 });

      expect(touch.startPinchDistance).toBe(123);
    });

    it('zooms in when the fingers spread apart', () => {
      touch.startPinchDistance = 100;
      camera.state.zoomTarget = 0.5;

      touch.pinchMove({ pinchDistance: 200 });

      expect(camera.state.isZoomIn).toBe(true);
      expect(camera.state.zoomTarget).toBeLessThan(0.5);
      // startPinchDistance resets to the latest distance for the next frame.
      expect(touch.startPinchDistance).toBe(200);
    });
  });

  describe('init', () => {
    it('wires touch listeners and disables native gestures in mobile mode', () => {
      settingsManager.isMobileModeEnabled = true;
      const canvas = document.createElement('canvas');
      const addSpy = vi.spyOn(canvas, 'addEventListener');

      touch.init(canvas);

      expect(canvas.style.touchAction).toBe('none');
      const events = addSpy.mock.calls.map((c) => c[0]);

      expect(events).toEqual(expect.arrayContaining(['touchstart', 'touchend', 'touchmove']));
    });

    it('does not wire touch listeners outside mobile mode', () => {
      settingsManager.isMobileModeEnabled = false;
      const canvas = document.createElement('canvas');
      const addSpy = vi.spyOn(canvas, 'addEventListener');

      touch.init(canvas);

      expect(addSpy).not.toHaveBeenCalled();
    });
  });
});
