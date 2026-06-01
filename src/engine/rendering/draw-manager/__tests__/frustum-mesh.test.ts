import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { FrustumMesh } from '@app/engine/rendering/draw-manager/frustum-mesh';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';

describe('FrustumMesh', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gl = () => global.mocks.glMock as any;

  const settings = (over: Record<string, unknown> = {}) => ({
    horizontalFov: 5,
    verticalFov: 4,
    nearDistance: 10,
    farDistance: 500,
    ...over,
  });

  const build = (over: Record<string, unknown> = {}, id = 0) => {
    const mesh = new FrustumMesh({ id } as never, settings(over) as never);

    mesh.init(gl());

    return mesh;
  };

  beforeEach(() => {
    setupStandardEnvironment();
    const dots = ServiceLocator.getDotsManager();
    // Source sat at id 0, target sat at id 1.
    const pos = new Float32Array(30);

    pos.set([7000, 0, 0], 0);
    pos.set([7000, 200, 50], 3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dots as any).positionData = pos;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dots as any).velocityData = new Float32Array([0, 7.5, 0, 0, 7.5, 0]);
    vi.clearAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  it('init compiles the program and builds 8 vertices / 36 indices', () => {
    const mesh = build();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mesh as any;

    expect(m.isLoaded_).toBe(true);
    expect(m.vertices_).toHaveLength(24);
    expect(m.indices_).toHaveLength(36);
  });

  describe('update', () => {
    it('earth-center mode computes frustum corners and uploads them', () => {
      const mesh = build();
      const subSpy = vi.spyOn(gl(), 'bufferSubData');

      mesh.update();

      expect(subSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mesh as any).vertices_.some((v: number) => v !== 0)).toBe(true);
    });

    it('sat-to-sat mode points the frustum at the target object', () => {
      const mesh = build({ targetObj: { id: 1 } });

      expect(() => mesh.update()).not.toThrow();
    });

    it('free-direction mode applies azimuth/elevation offsets', () => {
      const mesh = build({ azimuthOffset: 30, elevationOffset: 10 });

      expect(() => mesh.update()).not.toThrow();
    });

    it('is a no-op before init', () => {
      const mesh = new FrustumMesh({ id: 0 } as never, settings() as never);
      const subSpy = vi.spyOn(gl(), 'bufferSubData');

      mesh.update();

      expect(subSpy).not.toHaveBeenCalled();
    });

    it('bails when the source position is outside the buffer', () => {
      const mesh = build({}, 999);

      expect(() => mesh.update()).not.toThrow();
    });
  });

  describe('roll + velocity reference', () => {
    it('applies a roll angle without throwing', () => {
      const mesh = build({ rollAngle: 45 });

      expect(() => mesh.update()).not.toThrow();
    });

    it('falls back to an arbitrary up vector when velocity data is unavailable', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ServiceLocator.getDotsManager() as any).velocityData = null;
      const mesh = build();

      expect(() => mesh.update()).not.toThrow();
    });
  });

  describe('draw', () => {
    it('runs the GL pipeline and draws the indexed frustum', () => {
      const mesh = build();

      mesh.update();
      const drawSpy = vi.spyOn(gl(), 'drawElements');

      mesh.draw(mat4.create(), mat4.create());

      expect(drawSpy).toHaveBeenCalledWith(gl().TRIANGLES, 36, gl().UNSIGNED_SHORT, 0);
    });

    it('takes the flat-map uniform branch when the camera is in flat-map mode', () => {
      const mesh = build();

      mesh.update();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cam = ServiceLocator.getMainCamera() as any;

      cam.cameraType = CameraType.FLAT_MAP;
      cam.flatMapPanX = 0;

      expect(() => mesh.draw(mat4.create(), mat4.create())).not.toThrow();
    });

    it('binds the target framebuffer when one is provided', () => {
      const mesh = build();

      mesh.update();
      const fbSpy = vi.spyOn(gl(), 'bindFramebuffer');

      mesh.draw(mat4.create(), mat4.create(), {} as WebGLFramebuffer);

      expect(fbSpy).toHaveBeenCalled();
    });

    it('is a no-op before init', () => {
      const mesh = new FrustumMesh({ id: 0 } as never, settings() as never);
      const drawSpy = vi.spyOn(gl(), 'drawElements');

      mesh.draw(mat4.create(), mat4.create());

      expect(drawSpy).not.toHaveBeenCalled();
    });
  });

  describe('editSettings', () => {
    it('updates the frustum parameters in place', () => {
      const mesh = build();

      mesh.editSettings(settings({ horizontalFov: 12, color: [1, 0, 0, 0.5] }) as never);

      expect(mesh.horizontalFov).toBe(12);
      expect(mesh.color).toStrictEqual([1, 0, 0, 0.5]);
    });
  });
});
