import { CameraControlWidget } from '@app/app/ui/camera-control-widget';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

// A concrete 2d-context stub (a Proxy that mints vi.fns breaks vitest's RPC).
const mockCtx = () => {
  const gradient = { addColorStop: vi.fn() };

  return {
    canvas: { width: 100, height: 100 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    lineCap: '',
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    setLineDash: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    measureText: vi.fn(() => ({ width: 10 })),
  };
};

describe('CameraControlWidget', () => {
  let widget: CameraControlWidget;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => widget as any;

  beforeEach(() => {
    setupStandardEnvironment();
    document.body.insertAdjacentHTML('beforeend', '<div id="canvas-holder"></div>');
    widget = CameraControlWidget.getInstance();
    widget.init();
    p().ctx_ = mockCtx();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getInstance returns a singleton', () => {
    expect(CameraControlWidget.getInstance()).toBe(widget);
  });

  it('init creates the canvas element and centers it', () => {
    expect(p().canvas_.tagName).toBe('CANVAS');
    expect(p().center_.x).toBeGreaterThan(0);
  });

  describe('pure geometry/color helpers', () => {
    it('isInsideCircle_ tests point membership', () => {
      expect(p().isInsideCircle_(0, 0, 0, 0, 5)).toBe(true);
      expect(p().isInsideCircle_(10, 10, 0, 0, 5)).toBe(false);
    });

    it('computeDepthFactor_ maps depth to scale/opacity', () => {
      const near = p().computeDepthFactor_(1);
      const far = p().computeDepthFactor_(-1);

      expect(near.scale).toBeGreaterThan(far.scale);
      expect(near.opacity).toBeGreaterThan(far.opacity);
    });

    it('lightenColor_ and darkenColor_ adjust rgb channels', () => {
      expect(p().lightenColor_('rgb(100, 100, 100)', 50)).toBe('rgb(150, 150, 150)');
      expect(p().darkenColor_('rgb(100, 100, 100)', 50)).toBe('rgb(50, 50, 50)');
      // Non-rgb input is returned unchanged.
      expect(p().lightenColor_('not-a-color', 50)).toBe('not-a-color');
    });
  });

  describe('camera alignment', () => {
    it.each(['X', '-X', 'Y', '-Y', 'Z', '-Z'])('alignCameraToAxis_ sets targets for axis %s', (axis) => {
      expect(() => p().alignCameraToAxis_(axis)).not.toThrow();
      expect(ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget).toBe(true);
    });

    it('updateCameraRotation_ adjusts camera yaw/pitch', () => {
      const camera = ServiceLocator.getMainCamera();
      const yaw0 = camera.state.camYaw;

      p().updateCameraRotation_(10, 0);

      expect(camera.state.camYaw).not.toBe(yaw0);
    });

    it('getClickedAxis_ returns an axis name or null', () => {
      const result = p().getClickedAxis_(p().center_.x, p().center_.y);

      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('interaction handlers', () => {
    const mouseAt = (x: number, y: number) => new MouseEvent('mousedown', { clientX: x, clientY: y });

    it('onMouseDown_ starts dragging when inside the background circle', () => {
      p().onMouseDown_(mouseAt(p().center_.x, p().center_.y));

      expect(p().isDragging_).toBe(true);
    });

    it('a drag updates the camera and mouse-up ends it', () => {
      p().onMouseDown_(mouseAt(p().center_.x, p().center_.y));
      p().onMouseMove_(new MouseEvent('mousemove', { clientX: p().center_.x + 10, clientY: p().center_.y }));
      p().onMouseUp_();

      expect(p().isDragging_).toBe(false);
    });

    it('onCanvasMouseMove_ updates the hover state without throwing', () => {
      expect(() => p().onCanvasMouseMove_(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }))).not.toThrow();
    });

    it('onClick_ aligns the camera when an axis is clicked', () => {
      vi.spyOn(p(), 'getClickedAxis_').mockReturnValue('X');
      const align = vi.spyOn(p(), 'alignCameraToAxis_');

      p().onClick_(new MouseEvent('click', { clientX: 0, clientY: 0 }));

      expect(align).toHaveBeenCalledWith('X');
    });
  });

  it('the draw loop runs without throwing when wired through the EventBus', () => {
    expect(() => EventBus.getInstance().emit(EventBusEvent.updateLoop)).not.toThrow();
  });
});
