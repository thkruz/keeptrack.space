import { CameraType } from '@app/engine/camera/camera-type';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { MeshManager } from '@app/engine/rendering/mesh-manager';
import { Degrees, Kilometers } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * Small pure pieces of the GL managers: MeshManager's model/position state and
 * WebGLRenderer's viewport/screen-coordinate accessors. The renderer comes from
 * the standard environment so its mock GL context is wired up.
 */
describe('MeshManager state', () => {
  let mesh: MeshManager;

  beforeEach(() => {
    setupStandardEnvironment();
    mesh = new MeshManager();
  });

  it('setCurrentModel resets rotation when the model name changes', () => {
    mesh.currentMeshObject.rotation = { x: 30 as Degrees, y: 40 as Degrees, z: 50 as Degrees };
    mesh.setCurrentModel({ name: 'sat2' } as never);

    expect(mesh.currentMeshObject.model).toStrictEqual({ name: 'sat2' });
    expect(mesh.currentMeshObject.rotation).toStrictEqual({ x: 0, y: 0, z: 0 });
  });

  it('setCurrentModel keeps rotation when the model name is unchanged', () => {
    mesh.setCurrentModel({ name: 'sat' } as never);
    mesh.currentMeshObject.rotation = { x: 30 as Degrees, y: 0 as Degrees, z: 0 as Degrees };
    mesh.setCurrentModel({ name: 'sat' } as never);

    expect(mesh.currentMeshObject.rotation.x).toBe(30);
  });

  it('updatePosition writes the target position', () => {
    mesh.updatePosition({ x: 100 as Kilometers, y: 200 as Kilometers, z: 300 as Kilometers });

    expect(mesh.currentMeshObject.position).toStrictEqual({ x: 100, y: 200, z: 300 });
  });
});

describe('WebGLRenderer accessors', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => vi.restoreAllMocks());

  it('getCurrentViewport reports the drawing-buffer extents', () => {
    const renderer = ServiceLocator.getRenderer();
    const vp = renderer.getCurrentViewport();

    expect(vp).toHaveLength(4);
    expect(vp[0]).toBe(0);
    expect(vp[1]).toBe(0);
  });

  it('getDrawingBufferSize returns a 2-component size', () => {
    const renderer = ServiceLocator.getRenderer();

    expect(renderer.getDrawingBufferSize()).toHaveLength(2);
  });

  it('getPixelRatio returns the device pixel ratio', () => {
    const renderer = ServiceLocator.getRenderer();

    expect(renderer.getPixelRatio()).toBe(window.devicePixelRatio);
  });

  describe('getScreenCoords', () => {
    it('flags an error for an object with no position', () => {
      const renderer = ServiceLocator.getRenderer();
      const result = renderer.getScreenCoords({ id: 999 } as never);

      expect(result.error).toBe(true);
    });

    it('returns a screen-coordinate result for a positioned object', () => {
      const renderer = ServiceLocator.getRenderer();
      const result = renderer.getScreenCoords(defaultSat);

      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result.error).toBe('boolean');
    });

    it('never mutates the object position, even with a non-zero worldShift', () => {
      const renderer = ServiceLocator.getRenderer();
      const scene = Scene.getInstance();
      const savedShift = scene.worldShift;
      const obj = { id: 1, position: { x: 7000 as Kilometers, y: 100 as Kilometers, z: 200 as Kilometers } };

      scene.worldShift = [500, -300, 20];
      try {
        renderer.getScreenCoords(obj as never);
        renderer.getScreenCoords(obj as never);
      } finally {
        scene.worldShift = savedShift;
      }

      expect(obj.position).toStrictEqual({ x: 7000, y: 100, z: 200 });
    });

    describe('with a stubbed camera', () => {
      const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      const stubCamera = (cameraType: CameraType) => {
        vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue({
          projectionMatrix: identity,
          matrixWorldInverse: identity,
          cameraType,
          flatMapPanX: 0,
        } as never);
      };
      const at = (x: number, y: number, z: number) => ({ id: 2, position: { x, y, z } }) as never;

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('maps an in-range point to pixel coordinates without error in a perspective camera', () => {
        stubCamera(CameraType.DEFAULT);
        const result = ServiceLocator.getRenderer().getScreenCoords(at(0, 0, 0.5));

        expect(result.error).toBe(false);
        expect(result.x).toBeCloseTo(window.innerWidth / 2);
        expect(result.y).toBeCloseTo(window.innerHeight / 2);
      });

      it('flags a perspective point outside the depth range', () => {
        stubCamera(CameraType.DEFAULT);

        expect(ServiceLocator.getRenderer().getScreenCoords(at(0, 0, 2)).error).toBe(true);
      });

      it('flags a perspective point off the left of the screen', () => {
        stubCamera(CameraType.DEFAULT);

        expect(ServiceLocator.getRenderer().getScreenCoords(at(-2, 0, 0.5)).error).toBe(true);
      });

      it('rejects a flat-map object farther than 1e7 km', () => {
        stubCamera(CameraType.FLAT_MAP);

        expect(ServiceLocator.getRenderer().getScreenCoords(at(2e7, 0, 0)).error).toBe(true);
      });

      it('skips the depth test in flat-map mode', () => {
        stubCamera(CameraType.FLAT_MAP);
        const result = ServiceLocator.getRenderer().getScreenCoords(at(7000, 0, 0));

        expect(typeof result.error).toBe('boolean');
        expect(Number.isFinite(result.x)).toBe(true);
      });
    });
  });
});
