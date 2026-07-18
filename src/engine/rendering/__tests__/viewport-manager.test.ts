import { Camera } from '@app/engine/camera/camera';
import { CameraType } from '@app/engine/camera/camera-type';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ViewportLayout, ViewportManager } from '@app/engine/rendering/viewport-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const GL_WIDTH = 1920;
const GL_HEIGHT = 1080;

const fakeGl = () =>
  ({
    drawingBufferWidth: GL_WIDTH,
    drawingBufferHeight: GL_HEIGHT,
    viewport: vi.fn(),
    scissor: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    SCISSOR_TEST: 0x0c11,
  }) as unknown as WebGL2RenderingContext;

describe('ViewportManager', () => {
  let manager: ViewportManager;
  let mainCamera: Camera;
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    setupStandardEnvironment();
    manager = ViewportManager.getInstance();
    manager.reset();
    mainCamera = new Camera();
    Container.getInstance().registerSingleton(Singletons.MainCamera, mainCamera);
    gl = fakeGl();
    // Give the mock renderer the fake gl for rect computations
    (ServiceLocator.getRenderer() as unknown as { gl: WebGL2RenderingContext }).gl = gl;
  });

  afterEach(() => {
    manager.reset();
    ServiceLocator.setActiveRenderCamera(null);
    vi.restoreAllMocks();
  });

  describe('layout transitions', () => {
    it('starts in single layout with no secondary viewport', () => {
      manager.ensureMainViewport(mainCamera);

      expect(manager.layout).toBe(ViewportLayout.SINGLE);
      expect(manager.isMultiViewActive()).toBe(false);
      expect(manager.getSecondaryViewport()).toBeNull();
    });

    it('split layout creates a secondary camera with its own state', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL, { secondaryCameraType: CameraType.FIXED_TO_EARTH });

      const secondary = manager.getSecondaryViewport();

      expect(secondary).not.toBeNull();
      expect(secondary!.camera).not.toBe(mainCamera);
      expect(manager.isMultiViewActive()).toBe(true);
    });

    it('PIP layout configures a satellite-snapped LVLH camera', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);

      const secondary = manager.getSecondaryViewport()!;

      expect(secondary.camera.cameraType).toBe(CameraType.FIXED_TO_SAT_LVLH);
      expect(secondary.camera.state.camZoomSnappedOnSat).toBe(true);
    });

    it('returning to single layout destroys the secondary viewport', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL);
      manager.setLayout(ViewportLayout.SINGLE);

      expect(manager.getSecondaryViewport()).toBeNull();
      expect(manager.isMultiViewActive()).toBe(false);
    });

    it('clamps the split fraction to the allowed range', () => {
      manager.splitFraction = 0.01;
      expect(manager.splitFraction).toBe(ViewportManager.SPLIT_FRACTION_MIN);

      manager.splitFraction = 0.99;
      expect(manager.splitFraction).toBe(ViewportManager.SPLIT_FRACTION_MAX);

      manager.splitFraction = 0.4;
      expect(manager.splitFraction).toBe(0.4);
    });
  });

  describe('rect computation', () => {
    it('split rects partition the canvas at the split fraction', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL);
      manager.splitFraction = 0.5;
      manager.update(16 as never);

      const main = manager.getMainViewport()!;
      const secondary = manager.getSecondaryViewport()!;

      expect(main.rect.x).toBe(0);
      expect(main.rect.width).toBeGreaterThan(GL_WIDTH * 0.4);
      expect(main.rect.width).toBeLessThan(GL_WIDTH * 0.6);
      expect(secondary.rect.x).toBeGreaterThan(main.rect.width);
      expect(secondary.rect.x + secondary.rect.width).toBe(GL_WIDTH);
      expect(main.rect.height).toBe(GL_HEIGHT);
      expect(secondary.rect.height).toBe(GL_HEIGHT);
    });

    it('split rects respect layout insets (drawer rail, sat-info-box)', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL);
      manager.insets = { left: 60, right: 0, bottom: 200, top: 0 };
      manager.update(16 as never);

      const main = manager.getMainViewport()!;

      expect(main.rect.x).toBe(60);
      expect(main.rect.y).toBe(200);
      expect(main.rect.height).toBe(GL_HEIGHT - 200);
    });

    it('PIP keeps the main pane full-canvas and anchors the inset bottom-right', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);
      manager.update(16 as never);

      const main = manager.getMainViewport()!;
      const pip = manager.getSecondaryViewport()!;

      expect(main.rect).toEqual({ x: 0, y: 0, width: GL_WIDTH, height: GL_HEIGHT });
      // Main camera keeps the exact single-view projection in PIP mode
      expect(main.camera.viewport).toBeNull();
      expect(pip.rect.x + pip.rect.width).toBeLessThan(GL_WIDTH);
      expect(pip.rect.y).toBeGreaterThan(0);
      expect(pip.rect.width).toBeGreaterThanOrEqual(240);
    });

    it('PIP inset lifts above a bottom inset (sat-info-box open)', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);
      manager.insets = { left: 0, right: 0, bottom: 300, top: 0 };
      manager.update(16 as never);

      const pip = manager.getSecondaryViewport()!;

      expect(pip.rect.y).toBeGreaterThanOrEqual(300);
    });
  });

  describe('viewportAt hit-testing', () => {
    it('returns the main viewport in single layout', () => {
      manager.ensureMainViewport(mainCamera);

      expect(manager.viewportAt(10, 10, gl)?.id).toBe('main');
    });

    it('resolves the pane under the cursor in split layout', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL);
      manager.splitFraction = 0.5;
      manager.update(16 as never);

      expect(manager.viewportAt(100, 540, gl)?.id).toBe('main');
      expect(manager.viewportAt(GL_WIDTH - 100, 540, gl)?.id).toBe('secondary');
    });

    it('the PIP inset wins over the main pane underneath it', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);
      manager.update(16 as never);

      const pip = manager.getSecondaryViewport()!;

      pip.isVisible = true;
      const insideX = pip.rect.x + pip.rect.width / 2;
      const insideYFromTop = GL_HEIGHT - (pip.rect.y + pip.rect.height / 2);

      expect(manager.viewportAt(insideX, insideYFromTop, gl)?.id).toBe('secondary');
      expect(manager.viewportAt(50, 50, gl)?.id).toBe('main');
    });

    it('ignores hidden viewports', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);
      manager.update(16 as never);

      const pip = manager.getSecondaryViewport()!;

      pip.isVisible = false;
      const insideX = pip.rect.x + pip.rect.width / 2;
      const insideYFromTop = GL_HEIGHT - (pip.rect.y + pip.rect.height / 2);

      expect(manager.viewportAt(insideX, insideYFromTop, gl)?.id).toBe('main');
    });
  });

  describe('input routing', () => {
    beforeEach(() => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL);
      manager.splitFraction = 0.5;
      manager.update(16 as never);
    });

    it('routes pointer input to the pane under the cursor', () => {
      const left = manager.cameraForInput(100, 540);
      const right = manager.cameraForInput(GL_WIDTH - 100, 540);

      expect(left).toBe(manager.getMainViewport()!.camera);
      expect(right).toBe(manager.getSecondaryViewport()!.camera);
    });

    it('keeps routing to the capturing pane while dragging across the divider', () => {
      manager.beginInputCapture(GL_WIDTH - 100, 540); // mousedown in right pane

      // Cursor crosses into the left pane mid-drag
      const routed = manager.cameraForInput(100, 540);

      expect(routed).toBe(manager.getSecondaryViewport()!.camera);

      manager.endInputCapture();
      expect(manager.cameraForInput(100, 540)).toBe(manager.getMainViewport()!.camera);
    });

    it('mousedown focuses the captured pane', () => {
      manager.beginInputCapture(GL_WIDTH - 100, 540);

      expect(manager.focusedViewportId).toBe('secondary');

      manager.endInputCapture();
      manager.beginInputCapture(100, 540);
      expect(manager.focusedViewportId).toBe('main');
    });

    it('getInputCamera falls back to the main camera with no hover or capture', () => {
      manager.reset();
      manager.ensureMainViewport(mainCamera);

      expect(manager.getInputCamera()).toBe(mainCamera);
    });
  });

  describe('setSecondaryCameraType', () => {
    it('returns false with no secondary viewport', () => {
      manager.ensureMainViewport(mainCamera);

      expect(manager.setSecondaryCameraType(CameraType.FLAT_MAP)).toBe(false);
    });

    it('applies satellite-snap configuration for satellite-focused modes', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL);

      expect(manager.setSecondaryCameraType(CameraType.FIXED_TO_SAT_LVLH)).toBe(true);

      const camera = manager.getSecondaryViewport()!.camera;

      expect(camera.cameraType).toBe(CameraType.FIXED_TO_SAT_LVLH);
      expect(camera.state.camZoomSnappedOnSat).toBe(true);
    });

    it('switches to a plain mode without snap flags', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);
      manager.setSecondaryCameraType(CameraType.FIXED_TO_EARTH);

      expect(manager.getSecondaryViewport()!.camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
    });
  });

  describe('PIP visibility', () => {
    it('hides a satellite-focused PIP when nothing is selected', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);
      manager.update(16 as never);

      // No SelectSatManager registered in this env = no selection
      expect(manager.getSecondaryViewport()!.isVisible).toBe(false);
    });

    it('keeps a non-satellite PIP camera visible without a selection', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.PIP);
      manager.setSecondaryCameraType(CameraType.FIXED_TO_EARTH);
      manager.update(16 as never);

      expect(manager.getSecondaryViewport()!.isVisible).toBe(true);
    });
  });

  describe('pass scissor helpers', () => {
    it('applyPassScissor disables the scissor when no pass is active', () => {
      manager.ensureMainViewport(mainCamera);
      manager.applyPassScissor(gl);

      expect(gl.disable).toHaveBeenCalledWith((gl as unknown as { SCISSOR_TEST: number }).SCISSOR_TEST);
    });
  });

  describe('isCameraTypeActive', () => {
    it('reflects the main camera in single layout', () => {
      manager.ensureMainViewport(mainCamera);
      mainCamera.cameraType = CameraType.FLAT_MAP;

      expect(manager.isCameraTypeActive(CameraType.FLAT_MAP)).toBe(true);
      expect(manager.isCameraTypeActive(CameraType.POLAR_VIEW)).toBe(false);
    });

    it('sees a secondary pane camera mode in split layout', () => {
      manager.ensureMainViewport(mainCamera);
      manager.setLayout(ViewportLayout.SPLIT_HORIZONTAL, { secondaryCameraType: CameraType.FLAT_MAP });
      mainCamera.cameraType = CameraType.FIXED_TO_EARTH;

      expect(manager.isCameraTypeActive(CameraType.FLAT_MAP)).toBe(true);
    });
  });
});
