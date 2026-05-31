import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ConeMesh } from '@app/engine/rendering/draw-manager/cone-mesh';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';

describe('ConeMesh', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gl = () => global.mocks.glMock as any;
  const settings = (over: Record<string, unknown> = {}) => ({ fieldOfView: 3, ...over });

  const build = (over: Record<string, unknown> = {}, id = 0) => {
    const mesh = new ConeMesh({ id } as never, settings(over) as never);

    mesh.init(gl());

    return mesh;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const camera = () => ServiceLocator.getMainCamera() as any;

  beforeEach(() => {
    setupStandardEnvironment();
    const pos = new Float32Array(30);

    pos.set([42000, 0, 0], 0); // source (GEO-ish so satDistance > offsetDistance)
    pos.set([42000, 300, 80], 3); // target
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getDotsManager() as any).positionData = pos;
    camera().cameraType = CameraType.DEFAULT;
    vi.clearAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  it('init builds an apex + base-circle vertex array and triangle fan indices', () => {
    const mesh = build();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mesh as any;

    expect(m.isLoaded_).toBe(true);
    expect(m.vertices_.length).toBe((1 + 100 + 1) * 3);
    expect(m.indices_.length).toBe(100 * 3);
  });

  describe('update', () => {
    it('earth-center mode computes a base circle and uploads vertices', () => {
      const mesh = build();
      const subSpy = vi.spyOn(gl(), 'bufferSubData');

      mesh.update();

      expect(subSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mesh as any).vertices_.some((v: number) => v !== 0)).toBe(true);
    });

    it('earth-center mode in flat-map projects onto a spherical cap', () => {
      camera().cameraType = CameraType.FLAT_MAP;
      const mesh = build();

      expect(() => mesh.update()).not.toThrow();
    });

    it('sat-to-sat mode points the cone at the target object', () => {
      const mesh = build({ targetObj: { id: 1 } });

      expect(() => mesh.update()).not.toThrow();
    });

    it('is a no-op before init and when the source is out of buffer range', () => {
      const fresh = new ConeMesh({ id: 0 } as never, settings() as never);
      const subSpy = vi.spyOn(gl(), 'bufferSubData');

      fresh.update();
      expect(subSpy).not.toHaveBeenCalled();

      const oob = build({}, 999);

      expect(() => oob.update()).not.toThrow();
    });
  });

  describe('draw', () => {
    it('draws the cone triangle fan through the GL pipeline', () => {
      const mesh = build();

      mesh.update();
      const drawSpy = vi.spyOn(gl(), 'drawElements');

      mesh.draw(mat4.create(), mat4.create());

      expect(drawSpy).toHaveBeenCalledWith(gl().TRIANGLES, 300, gl().UNSIGNED_SHORT, 0);
    });

    it('takes the flat-map uniform branch and binds a target framebuffer', () => {
      const mesh = build();

      mesh.update();
      camera().cameraType = CameraType.FLAT_MAP;
      camera().flatMapPanX = 0;
      const fbSpy = vi.spyOn(gl(), 'bindFramebuffer');

      mesh.draw(mat4.create(), mat4.create(), {} as WebGLFramebuffer);

      expect(fbSpy).toHaveBeenCalled();
    });

    it('is a no-op before init', () => {
      const fresh = new ConeMesh({ id: 0 } as never, settings() as never);
      const drawSpy = vi.spyOn(gl(), 'drawElements');

      fresh.draw(mat4.create(), mat4.create());

      expect(drawSpy).not.toHaveBeenCalled();
    });
  });

  describe('editSettings', () => {
    it('updates the cone field of view and color in place', () => {
      const mesh = build();

      mesh.editSettings(settings({ fieldOfView: 9, color: [1, 0, 0, 1] }) as never);

      expect(mesh.fieldOfView).toBe(9);
      expect(mesh.color).toStrictEqual([1, 0, 0, 1]);
    });
  });
});
