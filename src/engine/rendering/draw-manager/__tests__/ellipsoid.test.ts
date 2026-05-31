import { Ellipsoid } from '@app/engine/rendering/draw-manager/ellipsoid';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { mat4, vec3 } from 'gl-matrix';
import { vi } from 'vitest';

describe('Ellipsoid', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gl = () => global.mocks.glMock as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (e: Ellipsoid) => e as any;
  let savedFlag: boolean;

  const build = () => {
    const e = new Ellipsoid([1000, 500, 300] as vec3);

    e.init(gl());

    return e;
  };

  beforeEach(() => {
    setupStandardEnvironment();
    savedFlag = settingsManager.isDrawCovarianceEllipsoid;
    settingsManager.isDrawCovarianceEllipsoid = true;
    vi.clearAllMocks();
  });

  afterEach(() => {
    settingsManager.isDrawCovarianceEllipsoid = savedFlag;
    vi.restoreAllMocks();
  });

  it('init builds the program/buffers when covariance ellipsoids are enabled', () => {
    const e = build();

    expect(p(e).isLoaded_).toBe(true);
  });

  it('init bails out when the covariance-ellipsoid setting is off', () => {
    settingsManager.isDrawCovarianceEllipsoid = false;
    const e = new Ellipsoid([1, 1, 1] as vec3);

    e.init(gl());

    expect(p(e).isLoaded_).toBe(false);
  });

  it('forceLoaded marks the mesh loaded', () => {
    const e = new Ellipsoid([1, 1, 1] as vec3);

    e.forceLoaded();
    expect(p(e).isLoaded_).toBe(true);
  });

  describe('update', () => {
    it('builds a valid pose from an object position/velocity', () => {
      const e = build();

      e.update({ position: { x: 7000, y: 1, z: 2 }, velocity: { x: 0, y: 7.5, z: 0 } } as never);

      expect(e.hasValidPose).toBe(true);
      expect(e.drawPosition[0]).toBe(7000);
    });

    it('invalidates the pose when the object has no position', () => {
      const e = build();

      e.update({} as never);

      expect(e.hasValidPose).toBe(false);
      expect(e.drawPosition).toStrictEqual([0, 0, 0]);
    });
  });

  describe('draw', () => {
    it('draws the indexed ellipsoid once loaded with a valid pose', () => {
      const e = build();

      e.update({ position: { x: 7000, y: 0, z: 0 } } as never);
      const drawSpy = vi.spyOn(gl(), 'drawElements');

      e.draw(mat4.create(), mat4.create(), {} as WebGLFramebuffer);

      expect(drawSpy).toHaveBeenCalledWith(gl().TRIANGLES, p(e).buffers_.vertCount, gl().UNSIGNED_SHORT, 0);
    });

    it('is a no-op without a valid pose or when the position is the origin', () => {
      const e = build();
      const drawSpy = vi.spyOn(gl(), 'drawElements');

      e.draw(mat4.create(), mat4.create()); // no update → hasValidPose false
      expect(drawSpy).not.toHaveBeenCalled();

      e.forceLoaded();
      p(e).hasValidPose_ = true; // valid pose but origin position
      e.draw(mat4.create(), mat4.create());
      expect(drawSpy).not.toHaveBeenCalled();
    });
  });

  describe('setters', () => {
    it('setColor and setDrawPosition mutate state', () => {
      const e = build();

      e.setColor([1, 0, 0, 0.8]);
      e.setDrawPosition({ x: 5, y: 6, z: 7 } as never);

      expect(p(e).color_).toStrictEqual([1, 0, 0, 0.8]);
      expect(e.drawPosition).toStrictEqual([5, 6, 7]);
    });
  });
});
